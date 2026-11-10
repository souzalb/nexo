import { PrismaClient } from '@prisma/client';
import { connect } from 'mqtt';
import { Resend } from 'resend';
import { ingestTelemetry, evaluateBookings } from './service';
import { serializable } from './transaction';
import { isIotCollectionWindow } from './schedule';

export async function runWorker() {
  if (process.argv.includes('--check')) {
    const db = new PrismaClient();
    try {
      console.log(
        'Banco IoT disponível. Salas configuradas:',
        await db.roomIotConfig.count(),
      );
    } finally {
      await db.$disconnect();
    }
    return;
  }
  let shutdown = false;
  const onShutdown = () => {
    shutdown = true;
  };
  process.once('SIGINT', onShutdown);
  process.once('SIGTERM', onShutdown);
  console.log(
    'Coletor agendado: 07:25–08:00, 12:55–13:30, 18:25–19:00 (America/Sao_Paulo). Sem consultas ao banco fora das janelas.',
  );
  try {
    while (!shutdown) {
      if (isIotCollectionWindow()) {
        try {
          await runActiveWorker(() => !shutdown);
        } catch {
          console.error(
            'Falha ao iniciar coleta; nova tentativa em 30 segundos durante a janela.',
          );
          for (let retry = 0; retry < 30 && !shutdown; retry++)
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
      if (!shutdown) await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  } finally {
    process.removeListener('SIGINT', onShutdown);
    process.removeListener('SIGTERM', onShutdown);
  }
}

async function runActiveWorker(shouldRun: () => boolean) {
  const db = new PrismaClient();
  let finished!: () => void;
  const completion = new Promise<void>((resolve) => {
    finished = resolve;
  });
  try {
    const owner = crypto.randomUUID();
    const now = new Date();
    await db.iotRuntime.upsert({
      where: { id: 'collector' },
      create: { id: 'collector', owner: '', leaseUntil: now, lastTickAt: now },
      update: {},
    });
    const claim = await db.iotRuntime.updateMany({
      where: { id: 'collector', leaseUntil: { lte: now } },
      data: {
        owner,
        leaseUntil: new Date(Date.now() + 60000),
        connected: false,
        lastTickAt: now,
        error: null,
      },
    });
    if (!claim.count) {
      await db.$disconnect();
      throw new Error('Já existe um coletor ativo.');
    }
    await db.roomIotConfig.updateMany({
      data: { healthySince: null, ready: false },
    });
    const client = connect(
      process.env.MQTT_URL || 'mqtt://broker.hivemq.com:1883',
      {
        clientId: `nexo_collector_${owner}`,
        username: process.env.MQTT_USERNAME || undefined,
        password: process.env.MQTT_PASSWORD || undefined,
        clean: true,
        resubscribe: false,
        reconnectPeriod: 5000,
        connectTimeout: 10000,
      },
    );
    let stopping = false;
    let connectionGeneration = 0;
    let subscribed = new Set<string>();
    let queue = Promise.resolve();
    function enqueue(work: () => Promise<void>) {
      queue = queue
        .then(async () => {
          if (stopping) return;
          if (!shouldRun() || !isIotCollectionWindow()) {
            await stop();
            return;
          }
          await work();
        })
        .catch(async () => {
          if (stopping || !isIotCollectionWindow()) {
            await stop();
            return;
          }
          console.error(
            'Falha no processamento IoT; a liberação será suspensa até recuperar cobertura.',
          );
          try {
            await db.roomIotConfig.updateMany({ data: { healthySince: null } });
            await db.iotRuntime.updateMany({
              where: { id: 'collector', owner },
              data: {
                connected: false,
                error: 'Falha de processamento. Verifique os logs do coletor.',
              },
            });
          } catch {
            /* Next tick retries database access. */
          }
        });
    }
    client.on('connect', () => {
      connectionGeneration++;
      subscribed = new Set();
      enqueue(tick);
    });
    client.on('close', () => {
      connectionGeneration++;
      subscribed = new Set();
      enqueue(async () => {
        await db.roomIotConfig.updateMany({
          data: { healthySince: null, ready: false },
        });
        await db.iotRuntime.updateMany({
          where: { id: 'collector', owner },
          data: { connected: false, error: 'Conexão MQTT interrompida.' },
        });
      });
    });
    client.on('error', () => {
      /* Transport reconnects; close invalidates coverage. */
    });
    client.on('message', (topic, payload, packet) => {
      if (stopping || !isIotCollectionWindow()) return;
      const receivedAt = new Date();
      const generation = connectionGeneration;
      enqueue(async () => {
        if (generation !== connectionGeneration || !client.connected) return;
        const runtime = await db.iotRuntime.findUnique({
          where: { id: 'collector' },
        });
        if (
          !runtime ||
          runtime.owner !== owner ||
          runtime.leaseUntil < new Date()
        )
          return;
        // LWT topic belongs to the same device-specific ACL as its telemetry topic.
        if (topic.endsWith('/status') && payload.toString() === 'offline') {
          await db.roomIotConfig.updateMany({
            where: { topic: topic.slice(0, -7) },
            data: { healthySince: null, ready: false },
          });
        } else
          await ingestTelemetry(
            db,
            topic,
            payload,
            packet.retain,
            receivedAt,
            owner,
          );
      });
    });
    async function tick() {
      const time = new Date();
      const renewed = await db.iotRuntime.updateMany({
        where: { id: 'collector', owner, leaseUntil: { gt: time } },
        data: {
          leaseUntil: new Date(time.getTime() + 60000),
          lastTickAt: time,
        },
      });
      if (!renewed.count) {
        await stop();
        return;
      }
      const configs = await db.roomIotConfig.findMany({
        where: { mode: { not: 'OFF' } },
      });
      const wanted = new Set(
        configs.flatMap((c) => [c.topic, `${c.topic}/status`]),
      );
      const generation = connectionGeneration;
      if (client.connected) {
        const removed = [...subscribed].filter((topic) => !wanted.has(topic));
        if (removed.length) {
          await client.unsubscribeAsync(removed);
          removed.forEach((topic) => subscribed.delete(topic));
        }
        const added = [...wanted].filter((topic) => !subscribed.has(topic));
        if (added.length) {
          const granted = await client.subscribeAsync(added, { qos: 1 });
          if (granted.some((item) => item.qos === 128))
            throw new Error('Assinatura rejeitada');
          if (generation === connectionGeneration)
            added.forEach((topic) => subscribed.add(topic));
        }
      }
      const connected =
        client.connected &&
        generation === connectionGeneration &&
        [...wanted].every((topic) => subscribed.has(topic));
      await db.iotRuntime.updateMany({
        where: { id: 'collector', owner },
        data: {
          connected,
          error: connected ? null : 'Aguardando conexão e assinaturas MQTT.',
        },
      });
      await evaluateBookings(db, owner);
      await deliverEmails();
    }
    async function deliverEmails() {
      if (!process.env.RESEND_API_KEY || !process.env.IOT_EMAIL_FROM) return;
      const resend = new Resend(process.env.RESEND_API_KEY);
      const emails = await db.iotEmail.findMany({
        where: {
          sentAt: null,
          expiresAt: { gt: new Date() },
          nextAttemptAt: { lte: new Date() },
        },
        take: 10,
        orderBy: { createdAt: 'asc' },
      });
      for (const email of emails) {
        // Claim persists across worker restarts; provider idempotency also deduplicates retries.
        const claimed = await db.iotEmail.updateMany({
          where: {
            id: email.id,
            sentAt: null,
            expiresAt: { gt: new Date() },
            nextAttemptAt: { lte: new Date() },
          },
          data: {
            nextAttemptAt: new Date(Date.now() + 60000),
            attempts: { increment: 1 },
          },
        });
        if (!claimed.count) continue;
        try {
          const result = await resend.emails.send(
            {
              from: process.env.IOT_EMAIL_FROM,
              to: email.to,
              subject: email.subject,
              text: email.text,
            },
            { idempotencyKey: email.dedupeKey },
          );
          if (result.error) throw new Error('Envio recusado');
          await db.iotEmail.update({
            where: { id: email.id },
            data: { sentAt: new Date(), error: null },
          });
        } catch {
          await db.iotEmail.update({
            where: { id: email.id },
            data: {
              error:
                'Falha no envio; nova tentativa em 1 minuto enquanto o aviso estiver válido.',
            },
          });
        }
      }
    }
    const timer = setInterval(() => enqueue(tick), 10000);
    async function stop() {
      if (stopping) return;
      stopping = true;
      clearInterval(timer);
      client.end(true);
      try {
        await serializable(db, async (tx) => {
          const released = await tx.iotRuntime.updateMany({
            where: { id: 'collector', owner },
            data: { leaseUntil: new Date(), connected: false },
          });
          if (released.count)
            await tx.roomIotConfig.updateMany({
              data: { healthySince: null, ready: false },
            });
        });
      } finally {
        await db.$disconnect();
        process.removeListener('SIGINT', onStop);
        process.removeListener('SIGTERM', onStop);
        finished();
      }
    }
    const onStop = () => {
      void stop().catch(() => console.error('Falha ao encerrar coletor.'));
    };
    process.once('SIGINT', onStop);
    process.once('SIGTERM', onStop);
    enqueue(tick);
    console.log(
      'Janela IoT ativa. Ao terminar, as conexões MQTT e de banco serão encerradas.',
    );
    await completion;
  } finally {
    await db.$disconnect();
  }
}
