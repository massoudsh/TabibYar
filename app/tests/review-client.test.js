import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../public/js/review.js', import.meta.url), 'utf8');
function setup({ saveOk = true, confirm = true } = {}) {
  const calls = [];
  const handlers = {};
  const status = {};
  const original = { missing_or_ambiguous: ['نیاز به بررسی'], parse_error: true };
  const form = {
    dataset: { visitId: 'synthetic', original: JSON.stringify(original) },
    querySelector: () => ({ disabled: false }), addEventListener() {},
  };
  for (const name of ['history', 'findings', 'differential_diagnosis_draft', 'treatment_plan', 'medications', 'patient_summary', 'warnings', 'follow_up']) form[name] = { value: '' };
  const elements = { 'draft-form': form, 'save-status': status };
  for (const id of ['save-draft', 'approve-btn']) elements[id] = { addEventListener: (_, fn) => { handlers[id] = fn; } };
  const document = { getElementById: id => elements[id], querySelector: () => ({ content: 'synthetic-csrf' }), addEventListener() {} };
  let reloads = 0;
  vm.runInNewContext(source, {
    document, window: { addEventListener() {}, confirm: () => confirm, location: { reload: () => { reloads++; } } },
    fetch: async (url, options) => {
      calls.push({ url, options });
      return { ok: url.endsWith('/draft') ? saveOk : true, redirected: false };
    },
  });
  return { calls, handlers, status, get reloads() { return reloads; } };
}

test('failed save prevents approval and reload', async () => {
  const app = setup({ saveOk: false });
  await app.handlers['approve-btn']();
  assert.equal(app.calls.length, 1);
  assert.match(app.calls[0].url, /draft$/);
  assert.equal(app.reloads, 0);
  assert.ok(app.status.textContent);
});
test('cancelled confirmation sends nothing', async () => {
  const app = setup({ confirm: false });
  await app.handlers['approve-btn']();
  assert.equal(app.calls.length, 0);
});
test('confirmed approval saves first, preserves flags and includes CSRF', async () => {
  const app = setup();
  await app.handlers['approve-btn']();
  assert.equal(app.calls.length, 2);
  assert.match(app.calls[1].url, /approve$/);
  assert.equal(app.reloads, 1);
  const saved = JSON.parse(JSON.parse(app.calls[0].options.body).edited);
  assert.deepEqual(saved.missing_or_ambiguous, ['نیاز به بررسی']);
  assert.equal(saved.parse_error, true);
  for (const call of app.calls) assert.equal(call.options.headers['X-CSRF-Token'], 'synthetic-csrf');
});
