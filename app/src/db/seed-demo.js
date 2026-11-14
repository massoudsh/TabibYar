// دادهٔ نمایشی ۲۰ بیمار برای دموی پزشک — همهٔ صفحه‌ها (داشبورد، بیماران، پرونده،
// پیگیری‌ها، شاخص‌های ادمین) با دادهٔ واقع‌نما پر می‌شوند.
//
// استفاده:
//   npm run seed:demo
//   DEMO_PHONE=09120000000 DEMO_PASSWORD=... npm run seed:demo
//
// رفتار:
// - اگر کلینیک/پزشک دمو وجود نداشته باشد ساخته می‌شود؛ در اجرای دوباره از همان‌ها استفاده می‌شود.
// - بیماران دمو با شمارهٔ تلفن الگویی شناسایی می‌شوند؛ اجرای دوباره آن‌ها را حذف و از نو می‌سازد
//   (idempotent) و به دادهٔ واقعی دست نمی‌زند.
// - همهٔ درج‌ها در یک تراکنش انجام می‌شوند؛ هر خطا کل تغییرات را برمی‌گرداند.
// - لاگ ساخت‌یافتهٔ JSON با event و requestId برای پایش (monitoring) چاپ می‌شود.
import 'dotenv/config';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './pool.js';
import { hashPassword } from '../lib/auth.js';
import { encryptField } from '../lib/crypto.js';
import { CONSENT_TEXT_VERSION } from '../lib/disclaimers.js';
import { validateStructuredNote } from '../services/structuring.js';
import { getGroundedInsights } from '../services/rag/ragAgent.js';
import { buildDemoRows } from './demo/build.js';

export const DEMO_CLINIC_NAME = 'کلینیک دمو طبیب‌یار';
export const DEFAULT_DEMO_PHONE = '09120000000';
export const DEFAULT_DEMO_PASSWORD = 'Demo@TabibYar1405';
const DEMO_SPECIALTY = 'internal_medicine';
const DEMO_PHONE_PREFIX = '091210000';
const DEMO_SEED_LOCK = 741929; // با قفل migration (741928) متفاوت است

function createLogger({ runId, startedAt, out = console.log, err = console.error }) {
  return {
    log(event, fields = {}) {
      out(JSON.stringify({ event, runId, ...fields }));
    },
    fail(event, error) {
      err(JSON.stringify({
        event, runId, error: error?.message || String(error),
        durationMs: Date.now() - startedAt,
      }));
    },
  };
}

async function ensureDemoClinician(client, { phone, password, log }) {
  const { rows: existing } = await client.query(
    `SELECT c.id AS clinic_id, c.name AS clinic_name, cl.id AS clinician_id, cl.role
     FROM clinicians cl JOIN clinics c ON c.id = cl.clinic_id
     WHERE cl.phone = $1 ORDER BY cl.created_at DESC`,
    [phone]
  );

  // حساب دمو = حسابی با همین شماره که در کلینیک دمو است. رمز فقط برای همین حساب بازنویسی می‌شود.
  const demoAccount = existing.find((row) => row.clinic_name === DEMO_CLINIC_NAME);
  if (demoAccount) {
    await client.query(
      `UPDATE clinicians SET password_hash = $2, role = 'admin', specialty = $3 WHERE id = $1`,
      [demoAccount.clinician_id, await hashPassword(password), DEMO_SPECIALTY]
    );
    log('demo_clinician_reused', {
      clinicId: demoAccount.clinic_id,
      clinicianId: demoAccount.clinician_id,
      previousRole: demoAccount.role,
    });
    return { clinic_id: demoAccount.clinic_id, clinician_id: demoAccount.clinician_id };
  }

  // شماره در کلینیک دیگری ثبت شده (مثلاً ادمین پایلوت). رمز آن حساب هرگز تغییر نمی‌کند؛
  // به‌جای آن یک حساب دمو جدا در کلینیک دمو ساخته می‌شود. ورود جدیدترین حساب را برمی‌دارد.
  if (existing.length) {
    log('demo_clinician_phone_taken', {
      clinicId: existing[0].clinic_id,
      detail: 'شمارهٔ دمو در کلینیک دیگری ثبت است؛ حساب دمو جداگانه ساخته می‌شود.',
    });
  }

  const { rows: clinicRows } = await client.query(
    `INSERT INTO clinics (name) VALUES ($1) RETURNING id`,
    [DEMO_CLINIC_NAME]
  );
  const clinicId = clinicRows[0].id;
  const passwordHash = await hashPassword(password);
  const { rows: clinicianRows } = await client.query(
    `INSERT INTO clinicians (clinic_id, full_name, specialty, phone, role, password_hash)
     VALUES ($1, 'دکتر دمو', $2, $3, 'admin', $4) RETURNING id`,
    [clinicId, DEMO_SPECIALTY, phone, passwordHash]
  );
  log('demo_clinician_created', { clinicId, clinicianId: clinicianRows[0].id });
  return { clinic_id: clinicId, clinician_id: clinicianRows[0].id };
}

async function removePreviousDemoPatients(client, clinicId, log) {
  // visits.patient_id با ON DELETE RESTRICT تعریف شده، پس ویزیت‌ها باید اول حذف شوند.
  // حذف ویزیت، به‌واسطهٔ CASCADE، یادداشت بالینی، دارو، پیگیری، هشدار و یادآوری پیامکی
  // همان ویزیت را هم پاک می‌کند.
  const { rows: visitRows } = await client.query(
    `DELETE FROM visits
     WHERE patient_id IN (
       SELECT id FROM patients WHERE clinic_id = $1 AND phone LIKE $2
     ) RETURNING id`,
    [clinicId, `${DEMO_PHONE_PREFIX}%`]
  );
  const { rows } = await client.query(
    `DELETE FROM patients WHERE clinic_id = $1 AND phone LIKE $2 RETURNING id`,
    [clinicId, `${DEMO_PHONE_PREFIX}%`]
  );
  if (visitRows.length || rows.length) {
    log('demo_patients_removed', { patients: rows.length, visits: visitRows.length });
  }
  return rows.length;
}

async function insertRows(client, { clinicId, clinicianId, rows, log }) {
  const patientIds = new Map();
  for (const patient of rows.patients) {
    const { rows: inserted } = await client.query(
      `INSERT INTO patients (clinic_id, full_name, national_id_encrypted, phone,
         consent_recorded_at, consent_version, consent_channel, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [
        clinicId, patient.fullName, encryptField(patient.nationalId), patient.phone,
        patient.consentRecordedAt,
        patient.consentRecordedAt ? CONSENT_TEXT_VERSION : null,
        patient.consentChannel, patient.createdAt,
      ]
    );
    patientIds.set(patient.key, inserted[0].id);
  }
  log('demo_patients_created', { count: patientIds.size });

  const visitIds = new Map();
  for (const visit of rows.visits) {
    const { rows: inserted } = await client.query(
      `INSERT INTO visits (patient_id, clinician_id, visit_date, status, created_at)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [patientIds.get(visit.patientKey), clinicianId, visit.visitDate, visit.status, visit.createdAt]
    );
    visitIds.set(visit.key, inserted[0].id);
  }

  for (const note of rows.notes) {
    const insights = await getGroundedInsights({ specialty: DEMO_SPECIALTY, structuredNote: note.aiDraft });
    await client.query(
      `INSERT INTO clinical_notes (visit_id, raw_input, ai_draft, approved_content, approved_at,
         approved_by, rag_insights, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        visitIds.get(note.visitKey), note.rawInput, JSON.stringify(note.aiDraft),
        note.approvedContent ? JSON.stringify(note.approvedContent) : null,
        note.approvedAt, note.approvedAt ? clinicianId : null,
        JSON.stringify(insights), note.createdAt,
      ]
    );
  }

  for (const medication of rows.medications) {
    await client.query(
      `INSERT INTO medications (visit_id, name, dosage, instructions) VALUES ($1, $2, $3, $4)`,
      [visitIds.get(medication.visitKey), medication.name, medication.dosage, medication.instructions]
    );
  }

  const followUpIds = new Map();
  for (const item of rows.followUps) {
    const { rows: inserted } = await client.query(
      `INSERT INTO follow_up_items (visit_id, description, due_date, status, created_at)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [visitIds.get(item.visitKey), item.description, item.dueDate, item.status, item.createdAt]
    );
    followUpIds.set(item.key, inserted[0].id);
  }

  for (const alert of rows.alerts) {
    await client.query(
      `INSERT INTO alerts (visit_id, description, created_at) VALUES ($1, $2, $3)`,
      [visitIds.get(alert.visitKey), alert.description, alert.createdAt]
    );
  }

  for (const reminder of rows.smsReminders) {
    await client.query(
      `INSERT INTO sms_reminders (follow_up_id, scheduled_for, message, status, created_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [followUpIds.get(reminder.followUpKey), reminder.scheduledFor, reminder.message,
        reminder.status, clinicianId, reminder.createdAt]
    );
  }

  for (const job of rows.jobs) {
    await client.query(
      `INSERT INTO jobs (type, payload, status, attempts, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [job.type, JSON.stringify({ visitId: visitIds.get(job.payload.visitKey), specialty: job.payload.specialty }),
        job.status, job.attempts, job.createdAt, job.updatedAt]
    );
  }

  for (const entry of rows.auditLogs) {
    const entityId = entry.entityType === 'patient'
      ? patientIds.get(entry.entityKey)
      : entry.entityType === 'follow_up_item'
        ? followUpIds.get(entry.entityKey)
        : visitIds.get(entry.entityKey);
    await client.query(
      `INSERT INTO audit_logs (entity_type, entity_id, action, actor_id, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [entry.entityType, entityId, entry.action, clinicianId,
        entry.metadata ? JSON.stringify(entry.metadata) : null, entry.createdAt]
    );
  }

  return {
    patients: patientIds.size,
    visits: visitIds.size,
    notes: rows.notes.length,
    medications: rows.medications.length,
    followUps: rows.followUps.length,
    alerts: rows.alerts.length,
    smsReminders: rows.smsReminders.length,
    jobs: rows.jobs.length,
    auditLogs: rows.auditLogs.length,
  };
}

/**
 * اجرای کامل seed دمو. pool قابل تزریق است تا در تست بدون PostgreSQL واقعی اجرا شود.
 * @param {{ pool?: object, now?: Date, phone?: string, password?: string,
 *   log?: Function, errorLog?: Function }} [options]
 */
export async function runSeed({
  pool: database = pool,
  now = new Date(),
  phone = process.env.DEMO_PHONE || DEFAULT_DEMO_PHONE,
  password = process.env.DEMO_PASSWORD || DEFAULT_DEMO_PASSWORD,
  log = console.log,
  errorLog = console.error,
} = {}) {
  const runId = crypto.randomUUID();
  const startedAt = Date.now();
  const logger = createLogger({ runId, startedAt, out: log, err: errorLog });
  logger.log('seed_started', { clinic: DEMO_CLINIC_NAME, phone });
  const rows = buildDemoRows(now);

  // اعتبارسنجی پیش از نوشتن: هر پیش‌نویس باید مطابق schema باشد.
  const invalid = rows.notes
    .map((note, index) => ({ index, result: validateStructuredNote(note.aiDraft) }))
    .filter(({ result }) => !result.valid);
  if (invalid.length) {
    throw new Error(`پیش‌نویس نامعتبر در دادهٔ دمو: ${JSON.stringify(invalid[0].result.errors)}`);
  }
  logger.log('demo_rows_built', {
    patients: rows.patients.length, visits: rows.visits.length, notes: rows.notes.length,
  });

  const client = await database.connect();
  try {
    // قفل مشاوره‌ای: اگر چند نمونهٔ وب هم‌زمان بالا بیایند، seed فقط یک‌بار اجرا می‌شود.
    // lock_timeout تضمین می‌کند انتظار برای قفل بی‌نهایت طول نکشد و startup قفل نشود.
    await client.query("SET lock_timeout = '15s'");
    await client.query('SELECT pg_advisory_lock($1)', [DEMO_SEED_LOCK]);
    await client.query('BEGIN');
    const { clinic_id: clinicId, clinician_id: clinicianId } = await ensureDemoClinician(
      client, { phone, password, log: logger.log }
    );
    await removePreviousDemoPatients(client, clinicId, logger.log);
    const counts = await insertRows(client, { clinicId, clinicianId, rows, log: logger.log });
    await client.query('COMMIT');
    logger.log('seed_completed', { clinicId, clinicianId, counts, durationMs: Date.now() - startedAt });
    return { clinicId, clinicianId, counts, phone, password };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    try {
      await client.query('SELECT pg_advisory_unlock($1)', [DEMO_SEED_LOCK]);
    } catch {
      // اتصال از دست رفته — قفل با بسته‌شدن session آزاد می‌شود.
    }
    client.release();
  }
}

const isEntryPoint = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isEntryPoint) {
  runSeed()
    .then(({ phone, password }) => {
      console.log(`\nورود دمو: ${phone} / ${password}`);
    })
    .catch((error) => {
      createLogger({ runId: 'cli', startedAt: Date.now() }).fail('seed_failed', error);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
