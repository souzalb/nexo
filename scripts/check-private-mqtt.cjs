// Read-only TLS/authentication/subscription check. Never publishes or touches DB.
require('@next/env').loadEnvConfig(process.cwd());
const { connect } = require('mqtt');
const device = process.argv.includes('--device');
let url = process.env.MQTT_URL;
let username = process.env.MQTT_USERNAME;
let password = process.env.MQTT_PASSWORD;
let ca;
if (device) {
  const config = require('fs').readFileSync(
    'firmware/esp32-pir/config.h',
    'utf8',
  );
  const field = (name) =>
    config.match(
      new RegExp('^#define\\s+' + name + '\\s+"([^"\\r\\n]*)"', 'm'),
    )?.[1];
  url = `mqtts://${field('MQTT_HOST')}:8883`;
  username = field('MQTT_USER');
  password = field('MQTT_PASSWORD');
  ca = config.match(
    /-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/,
  )?.[0];
  if (!ca) {
    console.error('CA do dispositivo ausente.');
    process.exit(1);
  }
}
if (
  !url ||
  !['mqtts:', 'wss:'].includes(new URL(url).protocol) ||
  !username ||
  !password
) {
  console.error('Configure MQTT_URL com TLS, MQTT_USERNAME e MQTT_PASSWORD.');
  process.exit(1);
}
const topic = process.env.MQTT_PIR_TOPIC || 'salas/b10/movimento';
const client = connect(url, {
  username,
  password,
  ...(ca ? { ca } : {}),
  clientId: `nexo_check_${require('crypto').randomUUID()}`,
  clean: true,
  rejectUnauthorized: true,
  reconnectPeriod: 0,
  connectTimeout: 15000,
});
let finished = false;
const timer = setTimeout(
  () => finish(false, 'Timeout: conexão/assinatura não confirmada.'),
  20000,
);
function finish(ok, message) {
  if (finished) return;
  finished = true;
  clearTimeout(timer);
  console.log(message);
  client.end(true);
  process.exitCode = ok ? 0 : 1;
}
client.on('error', (error) =>
  finish(false, `Falha MQTT/TLS. Código: ${error.code || 'indisponível'}.`),
);
client.on('connect', () => {
  console.log('TLS com certificado validado e autenticação aceitos.');
  if (device) {
    finish(
      true,
      'Credencial do dispositivo aceita. Publicação e hardware ainda não testados.',
    );
    return;
  }
  client.subscribe([topic, `${topic}/status`], { qos: 1 }, (error, granted) => {
    const expected = [topic, `${topic}/status`];
    const ok =
      !error &&
      expected.every((name) =>
        granted?.some((entry) => entry.topic === name && entry.qos !== 128),
      );
    finish(
      ok,
      ok
        ? 'Assinaturas dos tópicos de movimento e status aceitas. ACLs de negação ainda precisam de auditoria.'
        : 'Assinatura recusada. Verifique as permissões do coletor.',
    );
  });
});
