const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
require('ts-node').register({
  transpileOnly: true,
  compilerOptions: { module: 'CommonJS', moduleResolution: 'node' },
});
const { MqttMonitor } = require('../src/app/_lib/mqtt-monitor.ts');

function setup(grantedQos = 0) {
  const client = new EventEmitter();
  client.connected = true;
  client.subscribe = (topic, options, callback) =>
    callback(null, [{ topic, qos: grantedQos }]);
  client.end = () => {};
  client.reconnect = () => {};
  const monitor = new MqttMonitor(
    'mqtt://broker.hivemq.com:1883',
    'salas/b10/movimento',
    () => client,
  );
  return { client, monitor };
}

test('connection and subscription recover after a dropped connection', () => {
  const { client, monitor } = setup();
  assert.equal(monitor.snapshot().status, 'connecting');
  client.emit('connect');
  assert.equal(monitor.snapshot().subscribed, true);
  client.emit('error', new Error('private password'));
  assert.equal(monitor.snapshot().status, 'error');
  assert.ok(!monitor.snapshot().lastError.includes('private password'));
  client.emit('close');
  assert.equal(monitor.snapshot().subscribed, false);
  client.emit('reconnect');
  assert.equal(monitor.snapshot().status, 'reconnecting');
  client.emit('connect');
  assert.equal(monitor.snapshot().status, 'connected');
  assert.equal(monitor.snapshot().subscribed, true);
  assert.equal(monitor.snapshot().lastError, null);
  monitor.stop();
});

test('unknown readings stay unknown, invalid payloads do not overwrite valid readings', () => {
  const { client, monitor } = setup();
  assert.equal(monitor.snapshot().lastReading, null);
  client.emit('message', 'other/topic', Buffer.from('DETECTADO'), {
    retain: false,
  });
  assert.equal(monitor.snapshot().messageCount, 0);
  client.emit('message', 'salas/b10/movimento', Buffer.from('DETECTADO'), {
    retain: false,
  });
  assert.equal(monitor.snapshot().lastReading.state, 'DETECTADO');
  client.emit('message', 'salas/b10/movimento', Buffer.from('PARADO'), {
    retain: true,
  });
  assert.equal(monitor.snapshot().lastReading.state, 'PARADO');
  assert.equal(monitor.snapshot().lastReading.retained, true);
  client.emit('message', 'salas/b10/movimento', Buffer.from('invalid'), {
    retain: false,
  });
  assert.equal(monitor.snapshot().lastReading.state, 'PARADO');
  assert.equal(monitor.snapshot().messages[0].state, null);
  monitor.stop();
});

test('history is bounded and newest messages come first', () => {
  const { client, monitor } = setup();
  for (let i = 0; i < 125; i++)
    client.emit(
      'message',
      'salas/b10/movimento',
      Buffer.from('x'.repeat(1000)),
      { retain: false },
    );
  const snapshot = monitor.snapshot();
  assert.equal(snapshot.messageCount, 125);
  assert.equal(snapshot.messages.length, 100);
  assert.equal(snapshot.messages[0].id, 125);
  assert.equal(snapshot.messages[0].payload.length, 256);
  monitor.stop();
});

test('rejected subscriptions are not reported as active', () => {
  const { client, monitor } = setup(128);
  client.emit('connect');
  assert.equal(monitor.snapshot().subscribed, false);
  assert.match(monitor.snapshot().lastError, /assinatura/);
  monitor.stop();
});

test('configuration rejects wildcard topics and hides URL credentials', () => {
  assert.throws(() => new MqttMonitor('mqtt://localhost', 'salas/#'));
  assert.throws(
    () => new MqttMonitor('https://localhost', 'salas/b10/movimento'),
  );
  const client = new EventEmitter();
  client.end = () => {};
  const monitor = new MqttMonitor(
    'mqtt://user:secret@localhost:1883',
    'salas/b10/movimento',
    () => client,
  );
  assert.equal(monitor.snapshot().broker, 'mqtt://localhost:1883');
  monitor.stop();
});
