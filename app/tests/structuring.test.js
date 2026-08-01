import test from 'node:test';
import assert from 'node:assert/strict';

process.env.MODEL_PROVIDER = 'mock';
const { structureVisit, validateStructuredNote, StructuringValidationError } = await import(
  '../src/services/structuring.js'
);

test('structureVisit (mock provider) خروجی معتبر مطابق schema برمی‌گرداند (ایشو #1/#3)', async () => {
  const result = await structureVisit({
    specialty: 'internal_medicine',
    rawInput: 'بیمار قند خون ۲۱۰ داشت',
  });
  const { valid } = validateStructuredNote(result);
  assert.equal(valid, true);
  assert.equal(Array.isArray(result.missing_or_ambiguous), true);
});

test('structureVisit با rawInput خالی خطا می‌دهد', async () => {
  await assert.rejects(() => structureVisit({ specialty: 'internal_medicine', rawInput: '' }));
});

test('validateStructuredNote یک شیء ناقص را رد می‌کند (ایشو #3)', () => {
  const { valid, errors } = validateStructuredNote({ history: 'x' });
  assert.equal(valid, false);
  assert.ok(errors.length > 0);
});

test('StructuringValidationError کلاس صحیح صادر می‌شود', () => {
  const err = new StructuringValidationError([{ message: 'test' }]);
  assert.equal(err.name, 'StructuringValidationError');
});
