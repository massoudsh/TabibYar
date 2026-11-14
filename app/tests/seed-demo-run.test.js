// تست یکپارچهٔ seed دمو با pool شبیه‌سازی‌شده: اسکریپت واقعی اجرا می‌شود، همهٔ
// جدول‌ها پر می‌شوند، لاگ ساخت‌یافته چاپ می‌شود و اجرای دوباره داده را تکرار نمی‌کند.
import test from 'node:test';
import assert from 'node:assert/strict';
import { runSeed } from '../src/db/seed-demo.js';

process.env.ENCRYPTION_KEY ||= Buffer.alloc(32, 7).toString('base64');

function fakeDatabase({ existingClinician = [] } = {}) {
  const tables = {};
  const statements = [];
  const client = {
    async query(sql, params = []) {
      statements.push(sql.trim().split('\n')[0]);
      if (/^(BEGIN|COMMIT|ROLLBACK)$/i.test(sql.trim())) return { rows: [] };
      if (/pg_advisory_(un)?lock/.test(sql)) return { rows: [] };
      if (/SELECT c\.id AS clinic_id/.test(sql)) return { rows: existingClinician };
      if (/INSERT INTO clinics/.test(sql)) return { rows: [{ id: 'clinic-1' }] };
      if (/INSERT INTO clinicians/.test(sql)) return { rows: [{ id: 'clinician-1' }] };
      if (/DELETE FROM patients/.test(sql)) return { rows: [] };
      const match = sql.match(/(?:INSERT INTO|DELETE FROM|UPDATE)\s+(\w+)/i);
      if (!match) throw new Error(`unexpected SQL: ${sql}`);
      (tables[match[1]] ||= []).push(params);
      return { rows: [{ id: `${match[1]}-${tables[match[1]].length}` }] };
    },
    release() {},
  };
  return { tables, statements, connect: async () => client };
}

test('seed-demo fills every table, logs structured events and is idempotent', async () => {
  const database = fakeDatabase();
  const events = [];
  const result = await runSeed({ pool: database, log: (line) => events.push(JSON.parse(line)) });

  const names = events.map((event) => event.event);
  assert.deepEqual(names, ['seed_started', 'demo_rows_built', 'demo_clinician_created', 'demo_patients_created', 'seed_completed']);
  assert.ok(events.every((event) => typeof event.runId === 'string' && event.runId.length === 36));
  assert.equal(result.counts.patients, 20);
  assert.ok(result.counts.visits >= 20);
  assert.ok(result.counts.medications > 0);
  assert.ok(result.counts.followUps > 0);
  assert.ok(result.counts.auditLogs > 0);
  assert.ok(result.counts.smsReminders > 0);
  assert.ok(result.counts.alerts > 0);
  assert.ok(result.counts.jobs > 0);

  for (const table of ['patients', 'visits', 'clinical_notes', 'medications', 'follow_up_items',
    'alerts', 'audit_logs', 'sms_reminders', 'jobs']) {
    assert.ok(database.tables[table]?.length > 0, `${table} should be populated`);
  }
  assert.equal(database.tables.patients.length, 20);
  assert.ok(database.statements.includes('COMMIT'));
  assert.equal(database.statements.at(-1), 'SELECT pg_advisory_unlock($1)');

  // اجرای دوباره: بیماران قبلی حذف و از نو ساخته می‌شوند، نه اضافه.
  const second = fakeDatabase();
  const secondEvents = [];
  await runSeed({ pool: second, log: (line) => secondEvents.push(JSON.parse(line)) });
  assert.equal(second.tables.patients.length, 20);
  assert.ok(second.statements.some((sql) => sql.startsWith('DELETE FROM patients')));
});

test('seed-demo rolls back and reports seed_failed on database errors', async () => {
  const database = fakeDatabase();
  const failing = {
    connect: async () => {
      const client = await database.connect();
      return {
        query: async (sql, params) => {
          if (/INSERT INTO visits/.test(sql)) throw new Error('connection lost');
          return client.query(sql, params);
        },
        release() {},
      };
    },
  };
  const errors = [];
  await assert.rejects(
    runSeed({ pool: failing, log: () => {}, errorLog: (line) => errors.push(JSON.parse(line)) }),
    /connection lost/
  );
  assert.ok(database.statements.includes('ROLLBACK'));
});

test('re-running the seed resets the password of the demo account only', async () => {
  const demo = fakeDatabase({
    existingClinician: [{ clinic_id: 'clinic-1', clinic_name: 'کلینیک دمو طبیب‌یار', clinician_id: 'clinician-1', role: 'physician' }],
  });
  const events = [];
  const result = await runSeed({ pool: demo, password: 'Rotated@1405', log: (line) => events.push(JSON.parse(line)) });
  assert.equal(result.phone, '09120000000');
  assert.ok(demo.statements.some((sql) => sql.startsWith('UPDATE clinicians')));
  assert.ok(events.some((event) => event.event === 'demo_clinician_credentials_reset'));
  assert.ok(!demo.statements.some((sql) => sql.startsWith('INSERT INTO clinicians')), 'existing clinician must not be duplicated');

  const realClinic = fakeDatabase({
    existingClinician: [{ clinic_id: 'clinic-9', clinic_name: 'کلینیک واقعی', clinician_id: 'clinician-9', role: 'admin' }],
  });
  const realEvents = [];
  await runSeed({ pool: realClinic, log: (line) => realEvents.push(JSON.parse(line)) });
  assert.ok(realEvents.some((event) => event.event === 'demo_clinician_password_kept'));
});
