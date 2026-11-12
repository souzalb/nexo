const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
require('ts-node').register({
  transpileOnly: true,
  compilerOptions: { module: 'CommonJS', moduleResolution: 'node' },
});
const {
  MqttMonitor,
  getEsp32ReceiverConfig,
} = require('../src/app/_lib/mqtt-monitor.ts');

test('original ESP32 receiver does not inherit EMQX credentials or address', () => {
  const original = { ...process.env };
  try {
    delete process.env.ESP32_MQTT_URL;
    delete process.env.ESP32_MQTT_USE_COLLECTOR;
    delete process.env.ESP32_MQTT_TOPIC;
    process.env.MQTT_URL = 'mqtts://private.example.invalid:8883';
    process.env.MQTT_USERNAME = 'private-user';
    process.env.MQTT_PASSWORD = 'private-password';
    process.env.MQTT_PIR_TOPIC = 'private/topic';
    const config = getEsp32ReceiverConfig();
    assert.deepEqual(config, {
      url: 'mqtt://broker.hivemq.com:1883',
      topic: 'salas/b10/movimento',
    });
    const client = new EventEmitter();
    client.end = () => {};
    const monitor = new MqttMonitor(
      config.url,
      config.topic,
      (url, options) => {
        assert.equal(options.username, undefined);
        assert.equal(options.password, undefined);
        return client;
      },
    );
    monitor.stop();
  } finally {
    process.env = original;
  }
});

test('private receiver explicitly uses collector credentials and requires TLS', () => {
  const original = { ...process.env };
  try {
    process.env.ESP32_MQTT_USE_COLLECTOR = 'true';
    process.env.MQTT_URL = 'mqtts://private.example.invalid:8883';
    process.env.MQTT_USERNAME = 'collector';
    process.env.MQTT_PASSWORD = 'test-secret';
    const config = getEsp32ReceiverConfig();
    assert.equal(config.username, 'collector');
    assert.equal(config.password, 'test-secret');
    const client = new EventEmitter();
    client.end = () => {};
    const monitor = new MqttMonitor(
      config.url,
      config.topic,
      (url, options) => {
        assert.equal(options.username, 'collector');
        assert.equal(options.password, 'test-secret');
        assert.equal(options.rejectUnauthorized, true);
        return client;
      },
      { username: config.username, password: config.password },
    );
    assert.ok(!JSON.stringify(monitor.snapshot()).includes('test-secret'));
    monitor.stop();
    process.env.MQTT_URL = 'mqtt://private.example.invalid:1883';
    assert.throws(() => getEsp32ReceiverConfig());
    assert.throws(
      () =>
        new MqttMonitor(process.env.MQTT_URL, config.topic, () => client, {
          username: 'collector',
          password: 'secret',
        }),
    );
    process.env.MQTT_URL = 'mqtts://private.example.invalid:8883';
    delete process.env.MQTT_PASSWORD;
    assert.throws(() => getEsp32ReceiverConfig());
  } finally {
    process.env = original;
  }
});

function setup(grantedQos = 0, topic = 'salas/b10/movimento') {
  const client = new EventEmitter();
  client.connected = true;
  client.subscribe = (topic, options, callback) =>
    callback(null, [{ topic, qos: grantedQos }]);
  client.end = () => {};
  client.reconnect = () => {};
  const monitor = new MqttMonitor(
    'mqtt://broker.hivemq.com:1883',
    topic,
    () => client,
  );
  return { client, monitor };
}

test('rooms keep independent subscriptions, readings and history', () => {
  const first = setup();
  const second = setup(0, 'salas/b11/movimento');
  try {
    first.client.emit('connect');
    second.client.emit('connect');
    for (const { client } of [first, second]) {
      client.emit('message', 'salas/b10/movimento', Buffer.from('DETECTADO'), {
        retain: false,
      });
      client.emit('message', 'salas/b11/movimento', Buffer.from('PARADO'), {
        retain: false,
      });
    }
    assert.equal(first.monitor.snapshot().lastReading.state, 'DETECTADO');
    assert.equal(second.monitor.snapshot().lastReading.state, 'PARADO');
    assert.equal(first.monitor.snapshot().messageCount, 1);
    assert.equal(second.monitor.snapshot().messageCount, 1);
    first.client.emit('close');
    assert.equal(second.monitor.snapshot().subscribed, true);
  } finally {
    first.monitor.stop();
    second.monitor.stop();
  }
});

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
