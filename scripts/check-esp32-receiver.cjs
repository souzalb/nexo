// Read-only check: subscribes to the original ESP32 topic, never publishes.
require('@next/env').loadEnvConfig(process.cwd());
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'node' } });
const { getMqttMonitor } = require('../src/app/_lib/mqtt-monitor.ts');
const monitor = getMqttMonitor();
let connected = false;
let reportedId = 0;
const poll = setInterval(() => {
  const snapshot = monitor.snapshot();
  if (snapshot.subscribed && !connected) {
    connected = true;
    console.log('Conexao e assinatura confirmadas. Aguardando mudancas do PIR por ate 30 segundos.');
  }
  for (const message of [...snapshot.messages].reverse()) {
    if (message.id > reportedId && message.state) console.log(JSON.stringify({ state: message.state, receivedAt: message.receivedAt, retained: message.retained }));
    reportedId = Math.max(reportedId, message.id);
  }
}, 250);
setTimeout(() => {
  clearInterval(poll);
  const snapshot = monitor.snapshot();
  console.log(JSON.stringify({ connected: snapshot.status === 'connected', subscribed: snapshot.subscribed, messages: snapshot.messageCount, lastState: snapshot.lastReading?.state ?? null }));
  monitor.stop();
  process.exitCode = snapshot.subscribed ? 0 : 1;
}, 30000);
