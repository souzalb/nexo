// Opt-in integration test: creates and drops ONLY a unique temporary schema.
// No real reservations, users, broker connections or e-mail deliveries are used.
require('@next/env').loadEnvConfig(process.cwd());
require('ts-node').register({
  transpileOnly: true,
  compilerOptions: { module: 'CommonJS', moduleResolution: 'node' },
});
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const { PrismaClient } = require('@prisma/client');
const {
  evaluateBookings,
  confirmAttendance,
  ingestTelemetry,
} = require('../src/app/_lib/iot/service.ts');
const { activeBookingStatus } = require('../src/app/_lib/booking-status.ts');

async function main() {
  const schema = `iot_test_${randomUUID().replaceAll('-', '')}`;
  assert.match(schema, /^iot_test_[a-f0-9]{32}$/);
  const originalUrl = process.env.DATABASE_URL;
  const url = new URL(originalUrl);
  url.searchParams.set('schema', schema);
  const admin = new PrismaClient({ datasourceUrl: originalUrl });
  const db = new PrismaClient({ datasourceUrl: url.toString() });
  let created = false;
  try {
    await admin.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
    created = true;
    // Old repository migrations explicitly name public. Never replay them here.
    // db push creates the final model only in this freshly-created empty schema.
    execFileSync(
      process.execPath,
      [
        require.resolve('prisma/build/index.js'),
        'db',
        'push',
        '--skip-generate',
      ],
      {
        env: { ...process.env, DATABASE_URL: url.toString() },
        stdio: 'pipe',
        timeout: 90000,
      },
    );
    const user = await db.user.create({
      data: {
        name: 'IoT test owner',
        email: 'iot-test@example.invalid',
        password: 'disabled-test-account',
        role: 'TEACHER',
      },
    });
    const room = await db.room.create({
      data: { name: 'IoT temporary room', capacity: 1, type: 'TEST' },
    });
    const start = new Date(Date.now() - 10 * 60000);
    const at = (minutes) => new Date(+start + minutes * 60000);
    const config = await db.roomIotConfig.create({
      data: {
        roomId: room.id,
        deviceId: 'test-device',
        topic: 'test/telemetry',
        lastSeenAt: at(10),
        healthySince: at(-5),
        ready: true,
        bootId: 'boot1',
        lastSequence: 0,
      },
    });
    await db.iotRuntime.create({
      data: {
        id: 'collector',
        owner: 'worker',
        leaseUntil: at(500),
        lastTickAt: at(10),
        connected: true,
      },
    });
    const booking = await db.booking.create({
      data: {
        title: 'IoT test',
        userId: user.id,
        roomId: room.id,
        startTime: start,
        endTime: at(120),
        bookingGroupId: 'test-series',
      },
    });
    const tomorrow = await db.booking.create({
      data: {
        title: 'IoT tomorrow',
        userId: user.id,
        roomId: room.id,
        startTime: at(1440),
        endTime: at(1560),
        bookingGroupId: 'test-series',
      },
    });
    await Promise.all([
      evaluateBookings(db, 'worker', at(10)),
      evaluateBookings(db, 'worker', at(10)),
      evaluateBookings(db, 'worker', at(10)),
    ]);
    assert.equal(await db.notification.count(), 1);
    assert.equal(await db.iotEmail.count(), 1);
    console.log(
      'PASS concurrent warning jobs produce one notification and one email record',
    );
    await db.roomIotConfig.update({
      where: { id: config.id },
      data: { lastSeenAt: at(20) },
    });
    await evaluateBookings(db, 'worker', at(20));
    let current = await db.booking.findUniqueOrThrow({
      where: { id: booking.id },
    });
    assert.equal(current.status, 'CONFIRMED');
    assert.equal(current.attendance, 'SUSPECTED_NO_SHOW');
    console.log('PASS observation preserves reservation');
    await confirmAttendance(db, booking.id, user.id, false, at(21));
    await evaluateBookings(db, 'worker', at(22));
    current = await db.booking.findUniqueOrThrow({ where: { id: booking.id } });
    assert.equal(current.attendance, 'VERIFIED');
    assert.equal(current.status, 'CONFIRMED');
    console.log('PASS owner confirmation wins over later no-show evaluation');
    // A second independent occurrence exercises automatic release and availability.
    const automatic = await db.booking.create({
      data: {
        title: 'IoT automatic test',
        userId: user.id,
        roomId: room.id,
        startTime: at(180),
        endTime: at(300),
        bookingGroupId: 'test-series',
      },
    });
    process.env.IOT_ALLOW_AUTOMATIC_RELEASE = 'true';
    process.env.MQTT_URL = 'mqtts://private.example.invalid:8883';
    process.env.MQTT_USERNAME = 'test';
    process.env.MQTT_PASSWORD = 'test';
    await db.roomIotConfig.update({
      where: { id: config.id },
      data: { mode: 'AUTOMATIC', lastSeenAt: at(190) },
    });
    await evaluateBookings(db, 'worker', at(190));
    await db.roomIotConfig.update({
      where: { id: config.id },
      data: { lastSeenAt: at(200) },
    });
    await Promise.all([
      evaluateBookings(db, 'worker', at(200)),
      evaluateBookings(db, 'worker', at(200)),
    ]);
    current = await db.booking.findUniqueOrThrow({
      where: { id: automatic.id },
    });
    assert.equal(current.status, 'NO_SHOW');
    assert.ok(current.releasedAt);
    assert.equal(
      await db.attendanceEvent.count({
        where: { bookingId: automatic.id, kind: 'NO_SHOW' },
      }),
      1,
    );
    assert.equal(
      (await db.booking.findUniqueOrThrow({ where: { id: tomorrow.id } }))
        .status,
      'CONFIRMED',
    );
    assert.equal(
      await db.booking.count({
        where: {
          roomId: room.id,
          status: activeBookingStatus,
          startTime: { lt: at(300) },
          endTime: { gt: at(200) },
        },
      }),
      0,
    );
    assert.equal(
      (await confirmAttendance(db, automatic.id, user.id, false, at(201)))
        .status,
      409,
    );
    console.log(
      'PASS automatic no-show releases only one occurrence and leaves an auditable record',
    );
    const packet = Buffer.from(
      JSON.stringify({
        version: 1,
        deviceId: 'test-device',
        bootId: 'boot1',
        sequence: 1,
        motion: false,
        ready: true,
        uptimeMs: 900000,
        motionAgeMs: null,
      }),
    );
    await ingestTelemetry(db, 'test/telemetry', packet, true, at(201));
    assert.equal(await db.iotTelemetry.count(), 0);
    await ingestTelemetry(db, 'test/telemetry', packet, false, at(201));
    await ingestTelemetry(db, 'test/telemetry', packet, false, at(202));
    assert.equal(await db.iotTelemetry.count(), 1);
    console.log(
      'PASS telemetry retention and duplicate handling against PostgreSQL',
    );
  } finally {
    await db.$disconnect();
    if (created)
      await admin.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
    await admin.$disconnect();
  }
}
main().catch((error) => {
  console.error(
    'Integration test failed:',
    error.code || error.name,
    error instanceof assert.AssertionError
      ? error.message
      : 'Check database connectivity and migrations.',
  );
  process.exitCode = 1;
});
