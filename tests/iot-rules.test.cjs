const { test } = require('node:test');
const assert = require('node:assert/strict');
require('ts-node').register({
  transpileOnly: true,
  compilerOptions: { module: 'CommonJS', moduleResolution: 'node' },
});
const {
  decideAttendance,
  telemetrySchema,
  automaticReleaseAllowed,
} = require('../src/app/_lib/iot/rules.ts');
const { isActiveBooking } = require('../src/app/_lib/booking-status.ts');
const start = new Date('2026-11-05T10:00:00Z');
const at = (minutes) => new Date(start.getTime() + minutes * 60000);
const base = {
  now: at(10),
  start,
  end: at(120),
  status: 'CONFIRMED',
  attendance: 'WAITING',
  mode: 'OBSERVE',
  warningMinutes: 10,
  releaseMinutes: 20,
  warnedAt: null,
  deadline: null,
  lastSeen: at(10),
  healthySince: at(-5),
  lastMotion: null,
  heartbeatSeconds: 90,
  ready: true,
  connected: true,
  trusted: false,
};

test('waits before warning, then warns exactly at the configured boundary', () => {
  assert.equal(decideAttendance({ ...base, now: at(9) }), 'NONE');
  assert.equal(decideAttendance(base), 'WARN');
});
test('observation records suspected no-show without releasing', () => {
  assert.equal(
    decideAttendance({
      ...base,
      now: at(20),
      lastSeen: at(20),
      warnedAt: at(10),
      deadline: at(20),
    }),
    'SUSPECT',
  );
});
test('automatic release requires trusted infrastructure and the warning deadline', () => {
  const automatic = {
    ...base,
    mode: 'AUTOMATIC',
    now: at(20),
    lastSeen: at(20),
    warnedAt: at(10),
    deadline: at(20),
    trusted: true,
  };
  assert.equal(decideAttendance(automatic), 'RELEASE');
  assert.equal(decideAttendance({ ...automatic, trusted: false }), 'SUSPECT');
  assert.equal(decideAttendance({ ...automatic, deadline: at(21) }), 'NONE');
  assert.equal(decideAttendance({ ...automatic, warnedAt: null }), 'WARN');
});
test('offline, warming up, stale heartbeats, interrupted or missing coverage preserve reservations', () => {
  for (const patch of [
    { connected: false },
    { ready: false },
    { lastSeen: at(1) },
    { lastSeen: null },
    { healthySince: null },
    { healthySince: at(2) },
  ]) {
    assert.equal(decideAttendance({ ...base, ...patch }), 'INCONCLUSIVE');
  }
});
test('activity evidence prevents cancellation but previous reservations do not confirm this one', () => {
  assert.equal(decideAttendance({ ...base, lastMotion: at(1) }), 'VERIFY');
  assert.equal(decideAttendance({ ...base, lastMotion: at(-1) }), 'WARN');
  assert.equal(decideAttendance({ ...base, lastMotion: at(-3) }), 'WARN');
});

test('validation stops after 30 minutes and never uses later motion or releases late', () => {
  const pending = {
    ...base,
    mode: 'AUTOMATIC',
    trusted: true,
    warnedAt: at(10),
    deadline: at(30),
  };
  assert.equal(
    decideAttendance({ ...pending, now: at(30), lastSeen: at(30) }),
    'RELEASE',
  );
  assert.equal(
    decideAttendance({ ...pending, now: at(31), lastSeen: at(31) }),
    'INCONCLUSIVE',
  );
  assert.equal(
    decideAttendance({
      ...pending,
      now: at(31),
      lastSeen: at(31),
      lastMotion: at(31),
    }),
    'INCONCLUSIVE',
  );
  assert.equal(
    decideAttendance({
      ...pending,
      now: at(31),
      attendance: 'SUSPECTED_NO_SHOW',
    }),
    'NONE',
  );
  assert.equal(decideAttendance({ ...base, lastMotion: at(0) }), 'VERIFY');
});
test('confirmed usage is never reclassified as no-show', () => {
  assert.equal(
    decideAttendance({
      ...base,
      attendance: 'VERIFIED',
      connected: false,
      lastSeen: null,
    }),
    'NONE',
  );
});
test('inactive, future, ended and disabled reservations are untouched', () => {
  for (const patch of [
    { status: 'CANCELLED' },
    { status: 'NO_SHOW' },
    { status: 'PENDING' },
    { now: at(-1) },
    { now: at(120) },
    { mode: 'OFF' },
  ])
    assert.equal(decideAttendance({ ...base, ...patch }), 'NONE');
});
test('cancelled and no-show records do not occupy booking slots', () => {
  assert.equal(isActiveBooking('NO_SHOW'), false);
  assert.equal(isActiveBooking('CANCELLED'), false);
  assert.equal(isActiveBooking('CONFIRMED'), true);
  assert.equal(isActiveBooking('PENDING'), true);
});
test('telemetry rejects legacy payloads, malformed values and impossible motion age', () => {
  const sample = {
    version: 1,
    deviceId: 'esp32-b10',
    bootId: 'boot1',
    sequence: 1,
    motion: false,
    ready: true,
    uptimeMs: 120000,
    motionAgeMs: null,
  };
  assert.equal(telemetrySchema.safeParse(sample).success, true);
  for (const invalid of [
    'PARADO',
    { ...sample, sequence: -1 },
    { ...sample, motion: 'false' },
    { ...sample, motionAgeMs: 150000 },
    { ...sample, version: 2 },
  ])
    assert.equal(telemetrySchema.safeParse(invalid).success, false);
});
test('automatic release defaults to disabled and rejects public or unencrypted brokers', () => {
  const original = { ...process.env };
  try {
    process.env.IOT_ALLOW_AUTOMATIC_RELEASE = 'false';
    assert.equal(automaticReleaseAllowed(), false);
    process.env.IOT_ALLOW_AUTOMATIC_RELEASE = 'true';
    process.env.MQTT_USERNAME = 'test';
    process.env.MQTT_PASSWORD = 'test';
    process.env.MQTT_URL = 'mqtt://private.test:1883';
    assert.equal(automaticReleaseAllowed(), false);
    process.env.MQTT_URL = 'mqtts://broker.hivemq.com:8883';
    assert.equal(automaticReleaseAllowed(), false);
    process.env.MQTT_URL = 'mqtts://private.test:8883';
    assert.equal(automaticReleaseAllowed(), true);
  } finally {
    process.env = original;
  }
});
