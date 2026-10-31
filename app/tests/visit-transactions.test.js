import test from 'node:test';
import assert from 'node:assert/strict';
import { visitsRouter } from '../src/routes/visits.routes.js';
import { pool } from '../src/db/pool.js';

const draft = {
  history: '', findings: '', differential_diagnosis_draft: [], treatment_plan: '', medications: [],
  patient_summary: '', warnings: [], follow_up: [{ description: 'پیگیری | آزمایش', due_hint: 'هفتهٔ آینده' }],
  missing_or_ambiguous: [], parse_error: false,
};
function handler(path) {
  return visitsRouter.stack.find(layer => layer.route?.path === path && layer.route.methods.post).route.stack.at(-1).handle;
}
async function invoke(path, query, body = {}) {
  const connect = pool.connect;
  const calls = [];
  let released = false;
  pool.connect = async () => ({
    query: async (sql, args) => { calls.push({ sql, args }); return query(sql, args); },
    release: () => { released = true; },
  });
  const req = { params: { id: 'visit' }, user: { sub: 'doctor' }, body, get: () => 'application/json' };
  const res = { code: 200, status(code) { this.code = code; return this; }, json() {}, send() {}, redirect() {}, set() {} };
  let error;
  try { await handler(path)(req, res); } catch (failure) { error = failure; }
  finally { pool.connect = connect; }
  assert.equal(released, true);
  return { calls, res, error };
}

test('approval materializes follow-ups inside its transaction without guessing dates', async () => {
  const result = await invoke('/visits/:id/approve', async sql => ({ rows: sql.includes('SELECT v.status') ? [{ status: 'reviewed', ai_draft: draft }] : [] }));
  assert.equal(result.error, undefined);
  const insertion = result.calls.find(call => call.sql.includes('INSERT INTO follow_up_items'));
  assert.deepEqual(insertion.args, ['visit', 'پیگیری | آزمایش']);
  assert.doesNotMatch(insertion.sql, /due_date/);
  assert.equal(result.calls.at(-1).sql, 'COMMIT');
});
test('repeated approval cannot duplicate follow-ups', async () => {
  const result = await invoke('/visits/:id/approve', async () => ({ rows: [{ status: 'approved', ai_draft: draft }] }));
  assert.equal(result.res.code, 409);
  assert.equal(result.calls.at(-1).sql, 'ROLLBACK');
  assert.ok(!result.calls.some(call => call.sql.includes('INSERT INTO follow_up_items')));
});
test('follow-up insert failure rolls back approval', async () => {
  const result = await invoke('/visits/:id/approve', async sql => {
    if (sql.includes('INSERT INTO follow_up_items')) throw new Error('synthetic');
    return { rows: sql.includes('SELECT v.status') ? [{ status: 'reviewed', ai_draft: draft }] : [] };
  });
  assert.ok(result.error);
  assert.equal(result.calls.at(-1).sql, 'ROLLBACK');
});
test('reminder queue failure rolls back reminder creation', async () => {
  const result = await invoke('/follow-ups/:id/reminders', async sql => {
    if (sql.includes('INSERT INTO jobs')) throw new Error('synthetic');
    return { rows: [{ id: 'reminder' }] };
  }, { message: 'پیگیری', scheduled_for: '2099-01-01T12:00:00Z' });
  assert.ok(result.error);
  assert.equal(result.calls.at(-1).sql, 'ROLLBACK');
  assert.match(result.calls[1].sql, /v.status = 'approved'/);
});
