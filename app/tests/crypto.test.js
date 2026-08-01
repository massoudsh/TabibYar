import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

process.env.ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64');
const { encryptField, decryptField } = await import('../src/lib/crypto.js');

test('encryptField/decryptField round-trip (ایشو #14)', () => {
  const plaintext = '۰۰۱۲۳۴۵۶۷۸';
  const encrypted = encryptField(plaintext);
  assert.ok(Buffer.isBuffer(encrypted));
  assert.equal(decryptField(encrypted), plaintext);
});

test('encryptField(null/empty) برمی‌گرداند null', () => {
  assert.equal(encryptField(null), null);
  assert.equal(encryptField(''), null);
});

test('decryptField(null) برمی‌گرداند null', () => {
  assert.equal(decryptField(null), null);
});

test('دو رمزنگاری متن یکسان، ciphertext متفاوت تولید می‌کنند (IV تصادفی)', () => {
  const a = encryptField('test');
  const b = encryptField('test');
  assert.notDeepEqual(a, b);
  assert.equal(decryptField(a), decryptField(b));
});
