const { test } = require('node:test');
const assert = require('node:assert/strict');
require('ts-node').register({
  transpileOnly: true,
  compilerOptions: { module: 'CommonJS', moduleResolution: 'node' },
});
const { isIotCollectionWindow } = require('../src/app/_lib/iot/schedule.ts');
const at = (time) => new Date(`2026-11-09T${time}-03:00`);

test('collector opens five minutes before each period and closes after initial validation', () => {
  for (const [before, start, end, after] of [
    ['07:24:59', '07:25:00', '08:00:00', '08:00:01'],
    ['12:54:59', '12:55:00', '13:30:00', '13:30:01'],
    ['18:24:59', '18:25:00', '19:00:00', '19:00:01'],
  ]) {
    assert.equal(isIotCollectionWindow(at(before)), false);
    assert.equal(isIotCollectionWindow(at(start)), true);
    assert.equal(isIotCollectionWindow(at(end)), true);
    assert.equal(isIotCollectionWindow(at(after)), false);
  }
});
test('overnight and second slots do not trigger database collection', () => {
  for (const time of [
    '00:00:00',
    '09:30:00',
    '12:00:00',
    '15:00:00',
    '20:00:00',
    '23:59:59',
  ])
    assert.equal(isIotCollectionWindow(at(time)), false);
});
test('schedule uses Sao Paulo time independently of server time zone', () => {
  assert.equal(isIotCollectionWindow(new Date('2026-11-09T16:00:00Z')), true);
  assert.equal(isIotCollectionWindow(new Date('2026-11-09T13:00:00Z')), false);
});
