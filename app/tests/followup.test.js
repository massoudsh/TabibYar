import test from 'node:test';
import assert from 'node:assert/strict';
import { diffVisits } from '../src/services/followup.js';

test('diffVisits: بدون ویزیت قبلی → hasPrevious=false (ایشو #23)', () => {
  const result = diffVisits({ history: 'سرگیجه' }, null);
  assert.equal(result.hasPrevious, false);
});

test('diffVisits: شکایت تکرارشونده تشخیص داده می‌شود (ایشو #24)', () => {
  const current = { history: 'بیمار همچنان سرگیجه صبحگاهی دارد', medications: [] };
  const previous = { history: 'بیمار سرگیجه صبحگاهی گزارش کرد', medications: [] };
  const result = diffVisits(current, previous);
  assert.equal(result.hasPrevious, true);
  assert.ok(result.recurringComplaints.includes('سرگیجه'));
});

test('diffVisits: داروی جدید و قطع‌شده تشخیص داده می‌شود', () => {
  const current = { history: '', medications: [{ name: 'متفورمین' }, { name: 'آتورواستاتین' }] };
  const previous = { history: '', medications: [{ name: 'متفورمین' }, { name: 'گلی‌بنکلامید' }] };
  const result = diffVisits(current, previous);
  assert.deepEqual(result.medicationsAdded, ['آتورواستاتین']);
  assert.deepEqual(result.medicationsStopped, ['گلی‌بنکلامید']);
});
