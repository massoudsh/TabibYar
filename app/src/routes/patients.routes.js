// ایشو #10: تاریخچهٔ ویزیت‌های هر بیمار (نمای ساده).
// ایشو #20: ثبت رضایت صریح بیمار.
import { Router } from 'express';
import { pool } from '../db/pool.js';
import { authenticate } from '../middleware/authenticate.js';
import { encryptField } from '../lib/crypto.js';
import { writeAuditLog } from '../lib/audit.js';
import { CONSENT_TEXT, CONSENT_TEXT_VERSION } from '../lib/disclaimers.js';

export const patientsRouter = Router();
patientsRouter.use(authenticate);

// ایشو #29 (بازآرایی/UX): فهرست بیماران کلینیک — نقطهٔ ورود ناوبری اصلی به پروندهٔ هر بیمار.
patientsRouter.get('/patients', async (req, res) => {
  const query = req.query.q?.trim() || '';
  const { rows: patients } = await pool.query(
    `SELECT id, full_name, phone, consent_recorded_at
     FROM patients
     WHERE clinic_id = $1 AND ($2 = '' OR full_name ILIKE $3 OR phone ILIKE $3)
     ORDER BY full_name`,
    [req.user.clinicId, query, `%${query}%`]
  );
  res.render('patients-list', { patients, query });
});

patientsRouter.get('/patients/new', (req, res) => {
  res.render('patient-new', { consentText: CONSENT_TEXT });
});

patientsRouter.post('/patients', async (req, res) => {
  const { full_name, national_id, phone, consent_given, consent_channel } = req.body;
  if (!full_name || !phone) {
    return res.status(400).json({ error: 'full_name و phone الزامی‌اند' });
  }

  const nationalIdEncrypted = national_id ? encryptField(national_id) : null; // ایشو #14

  const { rows } = await pool.query(
    `INSERT INTO patients (clinic_id, full_name, national_id_encrypted, phone,
       consent_recorded_at, consent_version, consent_channel)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [
      req.user.clinicId,
      full_name,
      nationalIdEncrypted,
      phone,
      consent_given ? new Date() : null,
      consent_given ? CONSENT_TEXT_VERSION : null,
      consent_given ? consent_channel || 'in_person' : null,
    ]
  );

  await writeAuditLog({
    entityType: 'patient',
    entityId: rows[0].id,
    action: 'created',
    actorId: req.user.sub,
    metadata: { consentGiven: Boolean(consent_given) },
  });

  res.redirect(`/patients/${rows[0].id}`);
});

// ایشو #10: تاریخچهٔ ویزیت‌ها — نمای ساده، بدون گراف/نمودار.
patientsRouter.get('/patients/:id', async (req, res) => {
  const { rows: patientRows } = await pool.query(
    'SELECT id, full_name, phone, consent_recorded_at FROM patients WHERE id = $1 AND clinic_id = $2',
    [req.params.id, req.user.clinicId]
  );
  const patient = patientRows[0];
  if (!patient) return res.status(404).send('بیمار یافت نشد');

  const { rows: visits } = await pool.query(
    `SELECT v.id, v.visit_date, v.status, cn.approved_content
     FROM visits v
     LEFT JOIN clinical_notes cn ON cn.visit_id = v.id
      WHERE v.patient_id = $1 AND v.clinician_id = $2
      ORDER BY v.visit_date DESC`,
    [patient.id, req.user.sub]
  );

  // خلاصهٔ پیش از ویزیت (pre-visit brief): پزشک پیش از ورود بیمار، تصویر یک‌صفحه‌ای می‌بیند.
  const [medicationsResult, followUpsResult, alertsResult, auditResult] = await Promise.all([
    pool.query(
      `SELECT m.name, m.dosage, m.instructions, v.visit_date
       FROM medications m JOIN visits v ON v.id = m.visit_id
       WHERE v.patient_id = $1 AND v.clinician_id = $2
       ORDER BY v.visit_date DESC, m.created_at`,
      [patient.id, req.user.sub]
    ),
    pool.query(
      `SELECT f.id, f.description, f.due_date, f.status
       FROM follow_up_items f JOIN visits v ON v.id = f.visit_id
       WHERE v.patient_id = $1 AND v.clinician_id = $2
       ORDER BY CASE f.status WHEN 'pending' THEN 0 ELSE 1 END, f.due_date NULLS LAST`,
      [patient.id, req.user.sub]
    ),
    pool.query(
      `SELECT a.description, a.created_at FROM alerts a JOIN visits v ON v.id = a.visit_id
       WHERE v.patient_id = $1 AND v.clinician_id = $2
       ORDER BY a.created_at DESC LIMIT 5`,
      [patient.id, req.user.sub]
    ),
    pool.query(
      `SELECT al.action, al.entity_type, al.created_at, al.metadata
       FROM audit_logs al
       WHERE (al.entity_type = 'patient' AND al.entity_id = $1)
          OR (al.entity_type = 'visit' AND al.entity_id IN (
                SELECT id FROM visits WHERE patient_id = $1 AND clinician_id = $2))
          OR (al.entity_type = 'follow_up_item' AND al.entity_id IN (
                SELECT f.id FROM follow_up_items f JOIN visits v ON v.id = f.visit_id
                WHERE v.patient_id = $1 AND v.clinician_id = $2))
       ORDER BY al.created_at DESC LIMIT 20`,
      [patient.id, req.user.sub]
    ),
  ]);

  // داروی فعال = آخرین نسخهٔ تأییدشده (ویزیت‌های قدیمی‌تر ممکن است داروی قطع‌شده داشته باشند).
  const latestApproved = visits.find((visit) => visit.status === 'approved');
  const latestMedicationNames = new Set(
    (latestApproved?.approved_content?.medications || []).map((m) => m.name)
  );
  const brief = {
    lastApproved: latestApproved || null,
    activeMedications: latestMedicationNames.size
      ? medicationsResult.rows.filter((row) => latestMedicationNames.has(row.name))
      : medicationsResult.rows.slice(0, 8),
    openFollowUps: followUpsResult.rows.filter((row) => row.status === 'pending'),
    alerts: alertsResult.rows,
    visitCount: visits.length,
  };

  await writeAuditLog({
    entityType: 'patient',
    entityId: patient.id,
    action: 'viewed',
    actorId: req.user.sub,
  });

  res.render('patient-history', { patient, visits, brief, timeline: auditResult.rows });
});
