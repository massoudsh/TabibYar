import test from 'node:test';
import assert from 'node:assert/strict';
import { validateConfig, isDemoMode } from '../src/lib/config.js';
import { normalizeDigits, toJalaliString } from '../src/lib/locale.js';

test('startup rejects missing or weak configuration without exposing values', () => {
  assert.throws(() => validateConfig({}), /JWT_SECRET/);
  const valid = { JWT_SECRET: 'synthetic-test-value-'.repeat(3), ENCRYPTION_KEY: Buffer.alloc(32).toString('base64'), DATABASE_URL: 'postgres://example.invalid/test' };
  assert.equal(validateConfig(valid), true);
  assert.throws(() => validateConfig({ ...valid, JWT_SECRET: 'weak' }), /JWT_SECRET/);
  assert.throws(() => validateConfig({ ...valid, ENCRYPTION_KEY: 'bad' }), /ENCRYPTION_KEY/);
});
test('demo mode is opt-in and refused in production', () => {
  const valid = { JWT_SECRET: 'synthetic-test-value-'.repeat(3), ENCRYPTION_KEY: Buffer.alloc(32).toString('base64'), DATABASE_URL: 'postgres://example.invalid/test' };
  assert.equal(isDemoMode({}), false);
  assert.equal(isDemoMode({ DEMO_MODE: 'true' }), true);
  assert.equal(isDemoMode({ DEMO_MODE: '1' }), false);
  assert.equal(validateConfig({ ...valid, DEMO_MODE: 'true' }), true);
  assert.throws(() => validateConfig({ ...valid, DEMO_MODE: 'true', NODE_ENV: 'production' }), /DEMO_MODE/);
});
test('mixed Persian and Arabic numerals normalize without altering text', () => {
  assert.equal(normalizeDigits('۰۹١٢۳۴۵٦٧۸۹'), '09123456789');
  assert.equal(normalizeDigits('آزمایش ۱۲'), 'آزمایش 12');
  assert.equal(normalizeDigits(null), null);
});
test('Jalali formatting handles Nowruz and invalid dates', () => {
  assert.match(toJalaliString('2024-03-20T12:00:00Z'), /۱۴۰۳/);
  assert.equal(toJalaliString('invalid'), '');
});
