const { test } = require('node:test');
const assert = require('node:assert/strict');
require('ts-node').register({
  transpileOnly: true,
  compilerOptions: { module: 'CommonJS', moduleResolution: 'node' },
});
const {
  classifyAiError,
  aiErrorResponse,
} = require('../src/app/_lib/ai-provider-errors.ts');
test('provider gateway timeout and SDK abort trigger fallback', () => {
  for (const error of [
    { status: 504 },
    { code: 20, name: 'Error' },
    { message: '{"error":{"code":504,"status":"DEADLINE_EXCEEDED"}}' },
    { name: 'AbortError' },
    { message: 'fetch failed' },
  ])
    assert.equal(classifyAiError(error).retryable, true);
  assert.equal(aiErrorResponse({ status: 504 }).status, 504);
  assert.match(aiErrorResponse({ status: 504 }).message, /demorou/);
});
test('provider errors are distinguished without exposing secrets', () => {
  assert.equal(aiErrorResponse({ status: 429 }).status, 429);
  assert.equal(classifyAiError({ status: 401 }).retryable, false);
  assert.equal(classifyAiError({ status: 400 }).retryable, false);
  assert.equal(aiErrorResponse({ status: 503 }).status, 503);
  assert.ok(
    !JSON.stringify(
      classifyAiError({ message: 'secret-password', status: 403 }),
    ).includes('secret-password'),
  );
  assert.ok(
    !aiErrorResponse({
      message: 'secret-password',
      status: 403,
    }).message.includes('secret-password'),
  );
});
