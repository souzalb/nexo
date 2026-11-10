const { test } = require('node:test');
const assert = require('node:assert/strict');
require('ts-node').register({
  transpileOnly: true,
  compilerOptions: { module: 'CommonJS', moduleResolution: 'node' },
});
const {
  ingestTelemetry,
  evaluateBookings,
  confirmAttendance,
  releaseManually,
} = require('../src/app/_lib/iot/service.ts');

// Transactional in-memory adapter to exercise service transitions without sending
// notifications to real users or changing the configured PostgreSQL database.
function fixture() {
  const start = new Date('2026-11-05T10:00:00Z');
  const at = (m) => new Date(+start + m * 60000);
  const config = {
    id: 'config1',
    roomId: 'room1',
    deviceId: 'esp32-b10',
    topic: 'salas/b10/movimento',
    mode: 'OBSERVE',
    warningMinutes: 10,
    releaseMinutes: 20,
    heartbeatSeconds: 90,
    lastSeenAt: at(10),
    healthySince: at(-5),
    lastMotionAt: null,
    bootId: 'boot1',
    lastSequence: 1,
    ready: true,
  };
  const booking = {
    id: 'today',
    roomId: 'room1',
    userId: 'owner',
    startTime: start,
    endTime: at(120),
    status: 'CONFIRMED',
    attendance: 'WAITING',
    warnedAt: null,
    confirmationDeadline: null,
    verifiedAt: null,
    bookingGroupId: 'series1',
    room: { name: 'B10', iotConfig: config },
    user: { email: 'test@example.invalid' },
  };
  const tomorrow = { ...booking, id: 'tomorrow', startTime: at(1440) };
  const events = [],
    notifications = [],
    emails = [],
    telemetry = [];
  const db = {
    $transaction: async (work) => work(db),
    iotRuntime: {
      findUnique: async () => ({
        owner: 'worker',
        leaseUntil: at(180),
        connected: true,
      }),
    },
    booking: {
      findMany: async () => [{ id: booking.id }],
      findUnique: async ({ where }) => (where.id === 'today' ? booking : null),
      update: async ({ where, data }) => {
        assert.equal(where.id, 'today');
        Object.assign(booking, data);
        return booking;
      },
    },
    roomIotConfig: {
      findUnique: async () => config,
      update: async ({ data }) => Object.assign(config, data),
    },
    iotTelemetry: {
      findUnique: async ({ where }) =>
        telemetry.find(
          (entry) =>
            entry.bootId === where.configId_bootId_sequence.bootId &&
            entry.sequence === where.configId_bootId_sequence.sequence,
        ) || null,
      findFirst: async ({ where }) =>
        telemetry.find((entry) => entry.bootId === where.bootId) || null,
      create: async ({ data }) => telemetry.push(data),
    },
    attendanceEvent: { create: async ({ data }) => events.push(data) },
    notification: { create: async ({ data }) => notifications.push(data) },
    iotEmail: {
      create: async ({ data }) => emails.push(data),
      updateMany: async () => ({ count: 0 }),
    },
  };
  return {
    db,
    booking,
    tomorrow,
    config,
    events,
    notifications,
    emails,
    telemetry,
    at,
  };
}

test('warning is delivered once to the owner and keeps a persisted deadline', async () => {
  const f = fixture();
  await evaluateBookings(f.db, 'worker', f.at(10));
  await evaluateBookings(f.db, 'worker', f.at(10));
  assert.equal(f.notifications.length, 1);
  assert.equal(f.notifications[0].userId, 'owner');
  assert.equal(f.emails.length, 1);
  assert.equal(+f.booking.confirmationDeadline, +f.at(20));
});
test('late evaluation preserves the booking when the response interval exceeds the initial window', async () => {
  const f = fixture();
  f.config.lastSeenAt = f.at(25);
  await evaluateBookings(f.db, 'worker', f.at(25));
  assert.equal(f.booking.confirmationDeadline, null);
  assert.equal(f.booking.attendance, 'INCONCLUSIVE');
  assert.equal(f.notifications.length, 0);
  assert.equal(f.booking.status, 'CONFIRMED');
});
test('late warning still grants its full interval when it fits within 30 minutes', async () => {
  const f = fixture();
  f.config.lastSeenAt = f.at(15);
  await evaluateBookings(f.db, 'worker', f.at(15));
  assert.equal(+f.booking.confirmationDeadline, +f.at(25));
  assert.equal(f.notifications.length, 1);
});
test('observation then manual release preserves the other occurrence and the original times', async () => {
  const f = fixture();
  await evaluateBookings(f.db, 'worker', f.at(10));
  f.config.lastSeenAt = f.at(20);
  await evaluateBookings(f.db, 'worker', f.at(20));
  assert.equal(f.booking.attendance, 'SUSPECTED_NO_SHOW');
  assert.equal(f.booking.status, 'CONFIRMED');
  const result = await releaseManually(f.db, 'today', 'admin', f.at(21));
  assert.equal(result.status, 200);
  assert.equal(f.booking.status, 'NO_SHOW');
  assert.equal(f.tomorrow.status, 'CONFIRMED');
  assert.equal(+f.booking.endTime, +f.at(120));
});
test('owner confirmation prevents later release; unrelated users cannot confirm', async () => {
  const f = fixture();
  assert.equal(
    (await confirmAttendance(f.db, 'today', 'other', false, f.at(10))).status,
    403,
  );
  assert.equal(
    (await confirmAttendance(f.db, 'today', 'owner', false, f.at(10))).status,
    200,
  );
  await evaluateBookings(f.db, 'worker', f.at(20));
  assert.equal(f.notifications.length, 0);
  assert.equal(
    (await releaseManually(f.db, 'today', 'admin', f.at(21))).status,
    409,
  );
});
test('released reservations cannot be resurrected by late confirmation', async () => {
  const f = fixture();
  f.booking.status = 'NO_SHOW';
  assert.equal(
    (await confirmAttendance(f.db, 'today', 'owner', false, f.at(30))).status,
    409,
  );
});
test('stale worker lease cannot evaluate a booking', async () => {
  const f = fixture();
  await evaluateBookings(f.db, 'another-worker', f.at(10));
  assert.equal(f.notifications.length, 0);
});
test('retained, wrong-device, duplicate, out-of-order and legacy packets cannot establish coverage', async () => {
  const f = fixture();
  const sample = {
    version: 1,
    deviceId: 'esp32-b10',
    bootId: 'boot1',
    sequence: 2,
    motion: false,
    ready: true,
    uptimeMs: 120000,
    motionAgeMs: null,
  };
  const send = (s, retained = false, time = f.at(10)) =>
    ingestTelemetry(
      f.db,
      f.config.topic,
      Buffer.from(JSON.stringify(s)),
      retained,
      time,
    );
  await send(sample, true);
  await send({ ...sample, deviceId: 'other' });
  await ingestTelemetry(
    f.db,
    f.config.topic,
    Buffer.from('PARADO'),
    false,
    f.at(10),
  );
  assert.equal(f.telemetry.length, 0);
  await send(sample);
  await send(sample);
  await send({ ...sample, sequence: 1 });
  assert.equal(f.telemetry.length, 1);
  await send({ ...sample, sequence: 3 }, false, f.at(15));
  assert.equal(+f.config.healthySince, +f.at(15));
  await send({ ...sample, bootId: 'boot2', sequence: 0 }, false, f.at(16));
  assert.equal(+f.config.healthySince, +f.at(16));
  await send({ ...sample, sequence: 4 }, false, f.at(17));
  assert.equal(f.config.bootId, 'boot2');
});
