const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');

test('idle worker never creates a database client or MQTT connection', () => {
  const script = `
    require('ts-node').register({transpileOnly:true,compilerOptions:{module:'CommonJS',moduleResolution:'node'}});
    const RealDate = Date;
    global.Date = class extends RealDate {
      constructor(...args) { super(...(args.length ? args : ['2026-11-09T03:00:00Z'])); }
      static now() { return new RealDate('2026-11-09T03:00:00Z').getTime(); }
    };
    const Module = require('node:module');
    const original = Module._load;
    let calls = 0;
    Module._load = function(name, ...args) {
      if (name === '@prisma/client') return { PrismaClient: class { constructor() { calls++; throw new Error('Database used while idle'); } } };
      if (name === 'mqtt') return { connect() { calls++; throw new Error('MQTT used while idle'); } };
      return original.call(this, name, ...args);
    };
    const { runWorker } = require('./src/app/_lib/iot/worker.ts');
    setTimeout(() => process.emit('SIGTERM'), 50);
    runWorker().then(() => { if (calls) process.exitCode = 1; }).catch(() => { process.exitCode = 1; });
  `;
  const result = spawnSync(process.execPath, ['-e', script], {
    cwd: require('node:path').resolve(__dirname, '..'),
    encoding: 'utf8',
    timeout: 15000,
  });
  assert.equal(result.status, 0, result.stderr || result.error?.message);
});
