// ایشو #14: رمزنگاری داده در حالت ذخیره (encryption at rest) — لایهٔ اپلیکیشن.
// از AES-256-GCM با کلید ۳۲بایتی از ENCRYPTION_KEY (base64) استفاده می‌شود.
// این مکمل رمزنگاری دیسک/دیتابیس در سطح زیرساخت است، نه جایگزین آن —
// جزئیات کامل در docs/research/legal-data-residency.md و wiki/security-privacy.md.
import crypto from 'node:crypto';

const ALGO = 'aes-256-gcm';
const IV_LENGTH = 12; // توصیه‌شده برای GCM

function getKey() {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      'ENCRYPTION_KEY تنظیم نشده. یک کلید ۳۲بایتی base64 با ' +
        '`node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"` بسازید.'
    );
  }
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) {
    throw new Error('ENCRYPTION_KEY باید پس از decode base64 دقیقاً ۳۲ بایت باشد.');
  }
  return key;
}

/**
 * رمزنگاری یک رشته متنی. خروجی Buffer برای ذخیره در ستون BYTEA.
 * فرمت: [12 بایت IV][16 بایت authTag][ciphertext]
 */
export function encryptField(plaintext) {
  if (plaintext === null || plaintext === undefined || plaintext === '') return null;
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]);
}

/** رمزگشایی خروجی encryptField. ورودی می‌تواند Buffer یا null باشد. */
export function decryptField(buffer) {
  if (!buffer) return null;
  const key = getKey();
  const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  const iv = buf.subarray(0, IV_LENGTH);
  const authTag = buf.subarray(IV_LENGTH, IV_LENGTH + 16);
  const ciphertext = buf.subarray(IV_LENGTH + 16);
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString('utf8');
}
