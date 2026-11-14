import test from 'node:test';
import assert from 'node:assert/strict';
import { DEMO_PATIENTS } from '../src/db/demo/patients.js';
import { buildDemoRows } from '../src/db/demo/build.js';
import { validateStructuredNote } from '../src/services/structuring.js';

const now = new Date('2026-11-14T08:00:00Z');
const rows = buildDemoRows(now);

test('demo seed has 20 distinct, fully populated patients', () => {
  assert.equal(DEMO_PATIENTS.length, 20);
  assert.equal(new Set(DEMO_PATIENTS.map(p => p.fullName)).size, 20);
  assert.equal(new Set(DEMO_PATIENTS.map(p => p.phone)).size, 20);
  assert.equal(new Set(DEMO_PATIENTS.map(p => p.nationalId)).size, 20);
  for (const patient of rows.patients) {
    assert.match(patient.phone, /^091210000\d{2}$/);
    assert.match(patient.nationalId, /^\d{10}$/);
    assert.ok(patient.consentRecordedAt instanceof Date);
    assert.ok(['in_person', 'sms', 'verbal'].includes(patient.consentChannel));
  }
});

test('every demo draft is schema-valid and every visit has a note', () => {
  assert.equal(rows.notes.length, rows.visits.length);
  for (const note of rows.notes) {
    const { valid, errors } = validateStructuredNote(note.aiDraft);
    assert.equal(valid, true, JSON.stringify(errors));
    assert.ok(note.rawInput.length > 20);
  }
});

test('approved visits carry approved content, medications and audit trail', () => {
  const approved = rows.visits.filter(v => v.status === 'approved');
  assert.ok(approved.length >= 15);
  for (const visit of approved) {
    const note = rows.notes.find(n => n.visitKey === visit.key);
    assert.ok(note.approvedContent);
    assert.ok(note.approvedAt > visit.createdAt);
    assert.ok(rows.auditLogs.some(a => a.entityKey === visit.key && a.action === 'approved'));
  }
  assert.ok(rows.medications.length > 20);
  assert.ok(rows.auditLogs.some(a => a.action === 'sent_to_patient'));
  assert.ok(rows.auditLogs.some(a => a.action === 'edited'));
});

test('dashboard and analytics windows are populated', () => {
  const today = rows.visits.filter(v => v.createdAt.toDateString() === now.toDateString());
  assert.ok(today.length >= 2, 'today visits');
  assert.ok(rows.visits.some(v => ['draft', 'reviewed'].includes(v.status)), 'pending reviews');
  assert.ok(rows.followUps.some(f => f.status === 'pending'), 'open follow-ups');
  assert.ok(rows.followUps.some(f => f.status === 'done'), 'completed follow-ups');
  assert.ok(rows.smsReminders.length > 0);
  assert.ok(rows.alerts.length > 0);
  assert.ok(rows.jobs.length > 0);
  const last30 = rows.visits.filter(v => v.createdAt >= new Date(now.getTime() - 30 * 86400000));
  assert.ok(last30.length >= 15);
});

test('demo rows are deterministic for a fixed clock', () => {
  const again = buildDemoRows(now);
  assert.deepEqual(again.visits.map(v => v.createdAt.toISOString()), rows.visits.map(v => v.createdAt.toISOString()));
  assert.equal(again.followUps.length, rows.followUps.length);
});
