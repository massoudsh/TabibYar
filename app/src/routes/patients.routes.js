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
  const { rows: patients } = await pool.query(
    `SELECT id, full_name, phone, consent_recorded_at
     FROM patients WHERE clinic_id = $1 ORDER BY full_name`,
    [req.user.clinicId]
  );
  res.render('patients-list', { patients });
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

  await writeAuditLog({
    entityType: 'patient',
    entityId: patient.id,
    action: 'viewed',
    actorId: req.user.sub,
  });

  res.render('patient-history', { patient, visits });
});
