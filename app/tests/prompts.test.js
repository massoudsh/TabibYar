import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSystemPrompt, supportedSpecialties } from '../src/services/prompts.js';

test('supportedSpecialties دقیقاً دو تخصص فاز اول را برمی‌گرداند (ایشو #4)', () => {
  const specialties = supportedSpecialties();
  assert.deepEqual(specialties.sort(), ['dermatology', 'internal_medicine']);
});

test('buildSystemPrompt برای تخصص پشتیبانی‌نشده خطا می‌دهد', () => {
  assert.throws(() => buildSystemPrompt('cardiology'));
});

test('buildSystemPrompt شامل راهنمای اختصاصی تخصص است', () => {
  const prompt = buildSystemPrompt('dermatology');
  assert.match(prompt, /پوست/);
});
