import type { Prisma, PrismaClient } from '@prisma/client';
import {
  automaticReleaseAllowed,
  decideAttendance,
  telemetrySchema,
  VALIDATION_WINDOW_MINUTES,
} from './rules';
import { serializable } from './transaction';

export async function ingestTelemetry(
  db: PrismaClient,
  topic: string,
  payload: Buffer,
  retained: boolean,
  now = new Date(),
  owner?: string,
) {
  // Retained snapshots and legacy strings are diagnostic data, not fresh evidence.
  if (retained || payload.length > 2048) return;
  let json: unknown;
  try {
    json = JSON.parse(payload.toString('utf8'));
  } catch {
    return;
  }
  const parsed = telemetrySchema.safeParse(json);
  if (!parsed.success) return;
  const sample = parsed.data;
  await serializable(db, async (tx) => {
    if (owner) {
      const runtime = await tx.iotRuntime.findUnique({
        where: { id: 'collector' },
      });
      if (
        !runtime ||
        runtime.owner !== owner ||
        runtime.leaseUntil <= new Date()
      )
        return;
    }
    const config = await tx.roomIotConfig.findUnique({ where: { topic } });
    if (!config || config.mode === 'OFF' || sample.deviceId !== config.deviceId)
      return;
    const duplicate = await tx.iotTelemetry.findUnique({
      where: {
        configId_bootId_sequence: {
          configId: config.id,
          bootId: sample.bootId,
          sequence: sample.sequence,
        },
      },
    });
    if (
      duplicate ||
      (config.bootId === sample.bootId &&
        sample.sequence <= config.lastSequence)
    )
      return;
    if (
      config.bootId &&
      config.bootId !== sample.bootId &&
      (await tx.iotTelemetry.findFirst({
        where: { configId: config.id, bootId: sample.bootId },
      }))
    )
      return;
    const continuous =
      sample.ready &&
      config.ready &&
      config.bootId === sample.bootId &&
      config.lastSeenAt &&
      now.getTime() - config.lastSeenAt.getTime() <=
        config.heartbeatSeconds * 1000;
    const motionAt =
      sample.ready && (sample.motion || sample.motionAgeMs !== null)
        ? new Date(now.getTime() - (sample.motion ? 0 : sample.motionAgeMs!))
        : null;
    await tx.iotTelemetry.create({
      data: {
        configId: config.id,
        bootId: sample.bootId,
        sequence: sample.sequence,
        motion: sample.motion,
        ready: sample.ready,
        receivedAt: now,
      },
    });
    await tx.roomIotConfig.update({
      where: { id: config.id },
      data: {
        lastSeenAt: now,
        ready: sample.ready,
        bootId: sample.bootId,
        lastSequence: sample.sequence,
        healthySince: sample.ready
          ? continuous
            ? (config.healthySince ?? now)
            : now
          : null,
        ...(motionAt && (!config.lastMotionAt || motionAt > config.lastMotionAt)
          ? { lastMotionAt: motionAt }
          : {}),
      },
    });
  });
}

async function recordEvent(
  tx: Prisma.TransactionClient,
  bookingId: string,
  kind: string,
  detail: string,
  actorId?: string,
) {
  await tx.attendanceEvent.create({
    data: { bookingId, kind, detail, actorId },
  });
}

export async function evaluateBookings(
  db: PrismaClient,
  owner: string,
  now = new Date(),
) {
  const candidates = await db.booking.findMany({
    where: {
      status: 'CONFIRMED',
      startTime: { lte: now },
      endTime: { gt: now },
      attendance: { not: 'VERIFIED' },
      room: { iotConfig: { is: { mode: { not: 'OFF' } } } },
    },
    select: { id: true },
  });
  for (const { id } of candidates) {
    await serializable(db, async (tx) => {
      const runtime = await tx.iotRuntime.findUnique({
        where: { id: 'collector' },
      });
      if (!runtime || runtime.owner !== owner || runtime.leaseUntil <= now)
        return;
      const booking = await tx.booking.findUnique({
        where: { id },
        include: { room: { include: { iotConfig: true } }, user: true },
      });
      const config = booking?.room.iotConfig;
      if (!booking || !config) return;
      const decision = decideAttendance({
        now,
        start: booking.startTime,
        end: booking.endTime,
        status: booking.status,
        attendance: booking.attendance,
        mode: config.mode,
        warningMinutes: config.warningMinutes,
        releaseMinutes: config.releaseMinutes,
        warnedAt: booking.warnedAt,
        deadline: booking.confirmationDeadline,
        lastSeen: config.lastSeenAt,
        healthySince: config.healthySince,
        lastMotion: config.lastMotionAt,
        heartbeatSeconds: config.heartbeatSeconds,
        ready: config.ready,
        connected: runtime.connected,
        trusted: automaticReleaseAllowed(),
      });
      if (decision === 'NONE') return;
      if (decision === 'VERIFY') {
        await tx.booking.update({
          where: { id },
          data: {
            attendance: 'VERIFIED',
            verifiedAt: now,
            verificationSource: 'PIR',
          },
        });
        await tx.iotEmail.updateMany({
          where: { dedupeKey: `attendance-warning/${id}`, sentAt: null },
          data: { expiresAt: now },
        });
        await recordEvent(
          tx,
          id,
          'VERIFIED',
          'Uso evidenciado pelo PIR; não identifica quem está na sala.',
        );
      } else if (decision === 'WARN') {
        // A delayed job must still give the owner the full confirmation interval.
        const deadline = new Date(
          Math.max(
            booking.startTime.getTime() + config.releaseMinutes * 60000,
            now.getTime() +
              (config.releaseMinutes - config.warningMinutes) * 60000,
          ),
        );
        if (
          deadline >= booking.endTime ||
          deadline.getTime() >
            booking.startTime.getTime() + VALIDATION_WINDOW_MINUTES * 60000
        ) {
          if (booking.attendance !== 'INCONCLUSIVE') {
            await tx.booking.update({
              where: { id },
              data: { attendance: 'INCONCLUSIVE' },
            });
            await recordEvent(
              tx,
              id,
              'INCONCLUSIVE',
              'Não há tempo suficiente para avisar e aguardar confirmação dentro dos primeiros 30 minutos da reserva.',
            );
          }
          return;
        }
        const time = deadline.toLocaleTimeString('pt-BR', {
          timeZone: 'America/Sao_Paulo',
          hour: '2-digit',
          minute: '2-digit',
        });
        const message = `Não identificamos uso da sala ${booking.room.name}. Confirme sua presença até ${time} em Minhas Reservas.${config.mode === 'AUTOMATIC' && automaticReleaseAllowed() ? ' Sem confirmação ou atividade, esta ocorrência poderá ser liberada.' : ' Modo de observação: sua reserva será mantida.'}`;
        await tx.booking.update({
          where: { id },
          data: {
            warnedAt: now,
            confirmationDeadline: deadline,
            attendance: 'WAITING',
          },
        });
        await tx.notification.create({
          data: { userId: booking.userId, message, link: '/my-bookings' },
        });
        await tx.iotEmail.create({
          data: {
            dedupeKey: `attendance-warning/${id}`,
            to: booking.user.email,
            subject: 'Nexo: confirme o uso da sala',
            text: `${message}\n${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/my-bookings`,
            expiresAt: deadline,
          },
        });
        await recordEvent(
          tx,
          id,
          'WARNING',
          `Aviso registrado. Prazo: ${deadline.toISOString()}.`,
        );
      } else if (decision === 'RELEASE') {
        await tx.booking.update({
          where: { id },
          data: {
            status: 'NO_SHOW',
            attendance: 'SUSPECTED_NO_SHOW',
            releasedAt: now,
            releaseReason:
              'Prazo encerrado sem confirmação ou movimento, com cobertura contínua do sensor.',
          },
        });
        await tx.notification.create({
          data: {
            userId: booking.userId,
            message: `Sua reserva de ${booking.room.name} foi classificada como no-show. Apenas esta ocorrência foi liberada.`,
            link: '/my-bookings',
          },
        });
        await recordEvent(
          tx,
          id,
          'NO_SHOW',
          'Liberação automática da ocorrência; demais reservas da série preservadas.',
        );
      } else {
        const attendance =
          decision === 'SUSPECT' ? 'SUSPECTED_NO_SHOW' : 'INCONCLUSIVE';
        if (booking.attendance === attendance) return;
        await tx.booking.update({ where: { id }, data: { attendance } });
        await recordEvent(
          tx,
          id,
          attendance,
          decision === 'SUSPECT'
            ? 'Possível no-show: reserva mantida para revisão administrativa.'
            : 'Cobertura insuficiente ou falha de comunicação: reserva mantida.',
        );
      }
    });
  }
}

export async function confirmAttendance(
  db: PrismaClient,
  id: string,
  userId: string,
  isAdmin: boolean,
  now = new Date(),
) {
  return serializable(db, async (tx) => {
    const booking = await tx.booking.findUnique({ where: { id } });
    if (!booking) return { status: 404, message: 'Reserva não encontrada.' };
    if (booking.userId !== userId && !isAdmin)
      return {
        status: 403,
        message: 'Somente o responsável ou um administrador pode confirmar.',
      };
    if (
      booking.status !== 'CONFIRMED' ||
      now < booking.startTime ||
      now >= booking.endTime
    )
      return {
        status: 409,
        message: 'A confirmação exige uma reserva ativa e dentro do horário.',
      };
    if (booking.attendance !== 'VERIFIED') {
      await tx.booking.update({
        where: { id },
        data: {
          attendance: 'VERIFIED',
          verifiedAt: now,
          verificationSource: isAdmin ? 'ADMIN' : 'OWNER',
        },
      });
      await tx.iotEmail.updateMany({
        where: { dedupeKey: `attendance-warning/${id}`, sentAt: null },
        data: { expiresAt: now },
      });
      await recordEvent(
        tx,
        id,
        'VERIFIED',
        'Presença confirmada explicitamente no sistema.',
        userId,
      );
    }
    return {
      status: 200,
      message:
        'Presença confirmada. Esta ocorrência não será liberada por no-show.',
    };
  });
}

export async function releaseManually(
  db: PrismaClient,
  id: string,
  actorId: string,
  now = new Date(),
) {
  return serializable(db, async (tx) => {
    const booking = await tx.booking.findUnique({ where: { id } });
    if (!booking) return { status: 404, message: 'Reserva não encontrada.' };
    if (
      booking.status !== 'CONFIRMED' ||
      booking.attendance !== 'SUSPECTED_NO_SHOW' ||
      booking.verifiedAt ||
      !booking.confirmationDeadline ||
      now < booking.confirmationDeadline ||
      now >= booking.endTime
    )
      return {
        status: 409,
        message:
          'A ocorrência não está mais elegível para liberação. Atualize o painel.',
      };
    const config = await tx.roomIotConfig.findUnique({
      where: { roomId: booking.roomId },
    });
    if (
      config?.lastMotionAt &&
      config.lastMotionAt.getTime() >= booking.startTime.getTime() - 120000
    )
      return {
        status: 409,
        message:
          'Foi recebida atividade recente. Revise a ocupação antes de liberar.',
      };
    await tx.booking.update({
      where: { id },
      data: {
        status: 'NO_SHOW',
        releasedAt: now,
        releaseReason:
          'Possível no-show revisado e liberado pelo administrador.',
      },
    });
    await recordEvent(
      tx,
      id,
      'NO_SHOW',
      'Liberação manual da ocorrência após revisão administrativa.',
      actorId,
    );
    await tx.notification.create({
      data: {
        userId: booking.userId,
        message:
          'Um administrador confirmou o no-show e liberou esta ocorrência da sua reserva.',
        link: '/my-bookings',
      },
    });
    return {
      status: 200,
      message: 'Ocorrência liberada; histórico preservado.',
    };
  });
}
