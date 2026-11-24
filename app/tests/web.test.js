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
    const warn = console.warn;
    const events = [];
    let rejected;
    try {
      console.warn = event => events.push(JSON.parse(event));
      rejected = await fetch(`${url}/logout`, { method: 'POST', headers: { Cookie: cookie } });
    } finally {
      console.warn = warn;
    }
    assert.equal(rejected.status, 403);
    assert.deepEqual(events, [{ event: 'csrf_rejected', requestId: rejected.headers.get('x-request-id') }]);
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
    dashboard: { summary: { today_visits: 0, pending_reviews: 0, open_follow_ups: 0, patients_count: 0 }, followUps: [], recentVisits: [], trend: [], trendMax: 1 },
    'patients-list': { patients: [], query: '' },
    'patient-new': { consentText: 'رضایت آزمایشی' },
    'patient-history': {
      patient: { id: 'synthetic', full_name: 'آزمایشی', phone: '', consent_recorded_at: null }, visits: [],
      brief: { lastApproved: null, activeMedications: [], openFollowUps: [], alerts: [], visitCount: 0 }, timeline: [],
    },
    'visit-new': { patients: [], specialty: 'internal_medicine', templates: [{ label: 'قالب', text: '</script><script>bad()</script>' }] },
    'follow-ups': { followUps: [] },
    analytics: { metrics: { visits_last_30_days: 0, approved_notes_last_30_days: 0, unchanged_approvals_last_30_days: 0, average_approval_minutes: 0, sms_sent_last_30_days: 0, follow_ups_completed: 0, follow_ups_total: 0 } },
    'visit-review': { visit: { id: 'synthetic', status: 'draft', ai_draft: null }, changesSincePrevious: { hasPrevious: false }, disclaimer: 'پیش‌نویس', ddxDisclaimer: 'پیش‌نویس', evidence: {}, codeSuggestions: [] },
    'visit-handout': { visit: { id: 'synthetic', patient_name: 'آزمایشی', clinic_name: 'کلینیک', clinician_name: 'پزشک', visit_date: '2026-11-14', approved_content: { patient_summary: 'خلاصه', medications: [], warnings: [] } }, followUps: [] },
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
  const reviewed = await ejs.renderFile(`${views}visit-review.ejs`, {
    ...common, ...fixtures['visit-review'],
    visit: { id: 'synthetic', status: 'draft', ai_draft: { history: 'شرح حال', findings: 'یافته', treatment_plan: 'درمان', patient_summary: 'خلاصه' } },
    evidence: { history: { quote: 'بیمار از دو هفته پیش سرفه دارد', sentenceIndex: 0, score: 3 } },
    codeSuggestions: [{ code: 'J45.9', label: 'آسم، نامشخص', matched: ['سرفه'] }],
  });
  assert.match(reviewed, /class="evidence"/);
  assert.match(reviewed, /بیمار از دو هفته پیش سرفه دارد/);
  assert.match(reviewed, /class="coding-box"/);
  assert.match(reviewed, /J45\.9/);
  assert.doesNotMatch(reviewed, /برگهٔ چاپی بیمار/);
  const briefHistory = await ejs.renderFile(`${views}patient-history.ejs`, {
    ...common, ...fixtures['patient-history'],
    patient: { id: 'synthetic', full_name: 'آزمایشی', phone: '', consent_recorded_at: null },
    brief: {
      lastApproved: { id: 'v1', visit_date: '2026-11-10', approved_content: { patient_summary: 'خلاصهٔ قبلی' } },
      activeMedications: [{ name: 'متفورمین', dosage: '۵۰۰ میلی‌گرم' }],
      openFollowUps: [{ description: 'آزمایش قند ناشتا', due_date: '2026-12-01' }],
      alerts: [{ description: 'افزایش فشار خون', created_at: '2026-11-10' }],
      visitCount: 1,
    },
    timeline: [{ action: 'approved', entity_type: 'visit', created_at: '2026-11-10' }],
  });
  assert.match(briefHistory, /class="brief-panel"/);
  assert.match(briefHistory, /متفورمین/);
  assert.match(briefHistory, /آزمایش قند ناشتا/);
  assert.match(briefHistory, /class="timeline"/);
  assert.match(briefHistory, /تأیید نهایی/);
  const approvedHandout = await ejs.renderFile(`${views}visit-review.ejs`, {
    ...common, ...fixtures['visit-review'],
    visit: { id: 'v1', status: 'approved', ai_draft: { history: 'approved snapshot' }, approved_content: { history: 'approved snapshot' } },
  });
  assert.match(approvedHandout, /href="\/visits\/v1\/handout"/);
  const trend = await ejs.renderFile(`${views}dashboard.ejs`, {
    ...common, ...fixtures.dashboard,
    trend: [{ day: '2026-11-13', visits: 4, approved: 2 }, { day: '2026-11-14', visits: 0, approved: 0 }],
    trendMax: 4,
  });
  assert.match(trend, /--bar-height: 100%/);
  assert.match(trend, /--bar-height: 0%/);
  assert.match(trend, /<table class="visually-hidden">/);
  assert.doesNotMatch(trend, /<script>/);
  const demoHeader = await ejs.renderFile(`${views}partials/header.ejs`, { ...common, section: 'dashboard', demoMode: true });
  assert.match(demoHeader, /class="demo-banner"/);
  const demoLogin = await ejs.renderFile(`${views}login.ejs`, { ...common, error: null, demoMode: true, demoCredentials: { phone: '09120000000', password: 'Demo@TabibYar1405' } });
  assert.match(demoLogin, /09120000000/);
  assert.doesNotMatch(await ejs.renderFile(`${views}login.ejs`, { ...common, error: null, demoMode: false, demoCredentials: null }), /demo-hint/);
  const header = await ejs.renderFile(`${views}partials/header.ejs`, { ...common, section: 'dashboard' });
  assert.match(header, /aria-current="page"/);
  assert.doesNotMatch(header, /demo-banner/);
  assert.doesNotMatch(header, /aria-current=&#/);
});
