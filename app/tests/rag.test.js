import test from 'node:test';
import assert from 'node:assert/strict';

process.env.MODEL_PROVIDER = 'mock';
const { retrieve } = await import('../src/services/rag/retriever.js');
const { getGroundedInsights, answerQuestion } = await import('../src/services/rag/ragAgent.js');

test('retrieve نتایج مرتبط با تخصص را با اولویت بالاتر برمی‌گرداند (ایشو #28)', () => {
  const results = retrieve('قند خون HbA1c پیگیری دیابت', { specialty: 'internal_medicine' });
  assert.ok(results.length > 0);
  assert.ok(results[0].sourceFile.includes('internal-medicine'));
});

test('retrieve برای کوئری بی‌ربط چیزی برنمی‌گرداند', () => {
  const results = retrieve('xyzxyz notreal termterm qqqww');
  assert.equal(results.length, 0);
});

test('retrieve برای کوئری خالی آرایهٔ خالی می‌دهد', () => {
  assert.deepEqual(retrieve(''), []);
});

test('getGroundedInsights نکات مبتنی بر پایگاه دانش با ارجاع به منبع برمی‌گرداند', async () => {
  const result = await getGroundedInsights({
    specialty: 'dermatology',
    structuredNote: {
      history: 'ضایعه پوستی با خارش و قرمزی',
      findings: 'کورتیکواستروئید موضعی تجویزشده',
      medications: [],
      warnings: [],
    },
  });
  assert.ok(Array.isArray(result.insights));
  assert.ok(result.insights.length > 0);
  assert.ok(result.insights[0].sourceFile);
});

test('getGroundedInsights برای پیش‌نویس خالی آرایهٔ خالی می‌دهد', async () => {
  const result = await getGroundedInsights({ specialty: 'internal_medicine', structuredNote: {} });
  assert.deepEqual(result.insights, []);
});

test('answerQuestion در برابر درخواست تشخیص/تجویز امتناع می‌کند (مرز محصول)', async () => {
  const result = await answerQuestion({ specialty: 'internal_medicine', question: 'من چی دارم؟ تشخیص بده' });
  assert.equal(result.refused, true);
  assert.equal(result.sources.length, 0);
});

test('answerQuestion برای سؤال مستندسازی پاسخ مبتنی بر منبع می‌دهد', async () => {
  const result = await answerQuestion({
    specialty: 'internal_medicine',
    question: 'برای پیگیری دیابت چه مواردی را باید ثبت کنم؟',
  });
  assert.equal(result.refused, false);
  assert.equal(typeof result.answer, 'string');
  assert.ok(result.answer.length > 0);
});

test('answerQuestion با question خالی خطا می‌دهد', async () => {
  await assert.rejects(() => answerQuestion({ specialty: 'internal_medicine', question: '' }));
});
