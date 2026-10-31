import test from 'node:test';
import assert from 'node:assert/strict';
import { loginRateLimit } from '../src/middleware/security.js';

function request(limiter, ip) {
  let passed = false;
  const response = { code: 200, headers: {}, set(key, value) { this.headers[key] = value; }, status(code) { this.code = code; return this; }, send() {} };
  limiter({ ip, requestId: 'synthetic' }, response, () => { passed = true; });
  return { passed, ...response };
}
test('login limit separates addresses, supplies retry delay and expires', () => {
  let time = 0;
  const limiter = loginRateLimit({ limit: 2, windowMs: 1000, now: () => time });
  assert.equal(request(limiter, 'synthetic-a').passed, true);
  assert.equal(request(limiter, 'synthetic-a').passed, true);
  const blocked = request(limiter, 'synthetic-a');
  assert.equal(blocked.code, 429);
  assert.equal(blocked.headers['Retry-After'], '1');
  assert.equal(request(limiter, 'synthetic-b').passed, true);
  time = 1001;
  assert.equal(request(limiter, 'synthetic-a').passed, true);
});
test('limiter bounds memory and reclaims expired entries', () => {
  let time = 0;
  const limiter = loginRateLimit({ maxEntries: 1, windowMs: 1000, now: () => time });
  assert.equal(request(limiter, 'synthetic-a').passed, true);
  assert.equal(request(limiter, 'synthetic-b').code, 429);
  time = 1001;
  assert.equal(request(limiter, 'synthetic-b').passed, true);
});
