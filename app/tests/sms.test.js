import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPatientSummarySMS, getSMSProvider } from '../src/services/smsAdapter.js';

test('buildPatientSummarySMS شامل خلاصه، پیگیری و هشدار است (ایشو #18)', () => {
  const text = buildPatientSummarySMS({
    clinicName: 'کلینیک تست',
    patientSummary: 'قند خون شما بالاست',
    followUpItems: [{ description: 'آزمایش HbA1c', due_hint: 'دو هفته دیگر' }],
    warnings: ['در صورت سرگیجه شدید تماس بگیرید'],
  });
  assert.match(text, /قند خون شما بالاست/);
  assert.match(text, /آزمایش HbA1c/);
  assert.match(text, /سرگیجه شدید/);
});

test('getSMSProvider پیش‌فرض mock برمی‌گرداند (ایشو #17)', async () => {
  delete process.env.SMS_PROVIDER;
  const provider = getSMSProvider();
  const result = await provider.send('09120000000', 'تست');
  assert.ok(result.id);
});

test('getSMSProvider برای provider ناشناخته خطا می‌دهد', () => {
  process.env.SMS_PROVIDER = 'unknown';
  assert.throws(() => getSMSProvider());
  delete process.env.SMS_PROVIDER;
});
