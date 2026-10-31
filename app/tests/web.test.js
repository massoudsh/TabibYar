import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import ejs from 'ejs';
import { fileURLToPath } from 'node:url';
import { createApp } from '../src/app.js';
import { pool } from '../src/db/pool.js';
import { issueToken } from '../src/lib/auth.js';
import { toJalaliString } from '../src/lib/locale.js';

const views = fileURLToPath(new URL('../views/', import.meta.url));

test('HTTP security, rendering, health and async error boundaries', async () => {
  const server = createApp().listen(0, '127.0.0.1');
  await once(server, 'listening');
  const url = `http://127.0.0.1:${server.address().port}`;
  const query = pool.query;
  try {
    const login = await fetch(`${url}/login`, { headers: { Cookie: 'broken=%' } });
    assert.equal(login.status, 200);
    const html = await login.text();
    assert.match(html, /name="_csrf"/);
    assert.match(login.headers.get('content-security-policy'), /script-src 'self'/);
    assert.doesNotMatch(login.headers.get('content-security-policy'), /unsafe-inline/);
    const cookie = login.headers.get('set-cookie').split(';')[0];
    const token = decodeURIComponent(cookie.split('=')[1]);
    assert.equal((await fetch(`${url}/logout`, { method: 'POST', headers: { Cookie: cookie } })).status, 403);
    assert.equal((await fetch(`${url}/logout`, { method: 'POST', headers: { Cookie: cookie, 'X-CSRF-Token': 'é'.repeat(32) } })).status, 403);
    const logout = await fetch(`${url}/logout`, { method: 'POST', redirect: 'manual', headers: { Cookie: cookie, 'X-CSRF-Token': token } });
    assert.equal(logout.status, 302);
    assert.equal(logout.headers.get('location'), '/login');
    assert.equal((await fetch(`${url}/dashboard`, { redirect: 'manual' })).status, 302);
    assert.equal((await fetch(`${url}/health/live`)).status, 200);
    pool.query = async () => { throw new Error('private clinical data'); };
    assert.equal((await fetch(`${url}/health/ready`)).status, 503);
    const failure = await fetch(`${url}/login`, {
      method: 'POST', headers: { Cookie: cookie, 'X-CSRF-Token': token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '09120000000', password: 'synthetic' }),
    });
    assert.equal(failure.status, 500);
    assert.doesNotMatch(await failure.text(), /private clinical data/);
    pool.query = async () => ({ rows: [{ ok: 1 }] });
    assert.equal((await fetch(`${url}/health/ready`)).status, 200);
    assert.equal((await fetch(`${url}/health/live`)).status, 200);
  } finally {
    pool.query = query;
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});

test('draft status is clinician-scoped and exposes no clinical content', async () => {
  const secret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'synthetic-test-secret-not-for-production';
  const token = issueToken({ id: 'doctor', clinic_id: 'clinic', role: 'physician', specialty: 'internal_medicine' });
  const server = createApp().listen(0, '127.0.0.1');
  await once(server, 'listening');
  const query = pool.query;
  try {
    const url = `http://127.0.0.1:${server.address().port}/visits/synthetic/status`;
    pool.query = async (sql, args) => {
      assert.match(sql, /v.clinician_id = \$2/);
      assert.deepEqual(args, ['synthetic', 'doctor']);
      return { rows: [{ ready: false, job_status: 'failed', raw_input: 'private' }] };
    };
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } });
    assert.deepEqual(await response.json(), { status: 'failed' });
    pool.query = async () => ({ rows: [] });
    assert.equal((await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } })).status, 404);
    assert.equal((await fetch(url, { headers: { Accept: 'application/json' } })).status, 401);
  } finally {
    pool.query = query;
    if (secret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = secret;
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});

test('all screens render with empty fixtures and shared security locals', async () => {
  const common = { user: { role: 'physician' }, csrfToken: 'a'.repeat(32), toJalaliString };
  const fixtures = {
    login: { error: null },
    dashboard: { summary: { today_visits: 0, pending_reviews: 0, open_follow_ups: 0, patients_count: 0 }, followUps: [], recentVisits: [] },
    'patients-list': { patients: [], query: '' },
    'patient-new': { consentText: 'رضایت آزمایشی' },
    'patient-history': { patient: { id: 'synthetic', full_name: 'آزمایشی', phone: '', consent_recorded_at: null }, visits: [] },
    'visit-new': { patients: [], specialty: 'internal_medicine', templates: [{ label: 'قالب', text: '</script><script>bad()</script>' }] },
    'follow-ups': { followUps: [] },
    analytics: { metrics: { visits_last_30_days: 0, approved_notes_last_30_days: 0, unchanged_approvals_last_30_days: 0, average_approval_minutes: 0, sms_sent_last_30_days: 0, follow_ups_completed: 0, follow_ups_total: 0 } },
    'visit-review': { visit: { id: 'synthetic', status: 'draft', ai_draft: null }, changesSincePrevious: { hasPrevious: false }, disclaimer: 'پیش‌نویس', ddxDisclaimer: 'پیش‌نویس' },
  };
  for (const [name, data] of Object.entries(fixtures)) {
    const html = await ejs.renderFile(`${views}${name}.ejs`, { ...common, ...data });
    assert.match(html, /<main/);
    assert.doesNotMatch(html, /<script>/);
  }
  const populated = await ejs.renderFile(`${views}visit-new.ejs`, { ...common, ...fixtures['visit-new'], patients: [{ id: 'synthetic', full_name: 'آزمایشی' }] });
  assert.doesNotMatch(populated, /<script>bad/);
  assert.match(populated, /data-text="&lt;/);
  const approved = await ejs.renderFile(`${views}visit-review.ejs`, {
    ...common, ...fixtures['visit-review'],
    visit: { id: 'synthetic', status: 'approved', ai_draft: { history: 'outdated' }, approved_content: { history: 'approved snapshot' } },
  });
  assert.match(approved, /<fieldset disabled>/);
  assert.match(approved, /approved snapshot/);
  assert.doesNotMatch(approved, /outdated/);
  const header = await ejs.renderFile(`${views}partials/header.ejs`, { ...common, section: 'dashboard' });
  assert.match(header, /aria-current="page"/);
  assert.doesNotMatch(header, /aria-current=&#/);
});
