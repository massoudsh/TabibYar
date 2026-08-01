// اپیک ۲ — رابط وب برای ورود خلاصهٔ ویزیت (#7)، بازبینی پیش‌نویس (#8)،
// خلاصهٔ تغییرات از ویزیت قبلی (#11)، ارسال پیامک پس از تأیید (#16).
import { Router } from 'express';
import { pool } from '../db/pool.js';
import { authenticate } from '../middleware/authenticate.js';
import { writeAuditLog } from '../lib/audit.js';
import { enqueue } from '../services/queue.js';
import { validateStructuredNote } from '../services/structuring.js';
import { getPreviousApprovedVisit, diffVisits } from '../services/followup.js';
import { getSMSProvider, buildPatientSummarySMS } from '../services/smsAdapter.js';
import { AI_DRAFT_DISCLAIMER, DIFFERENTIAL_DIAGNOSIS_DISCLAIMER } from '../lib/disclaimers.js';

export const visitsRouter = Router();
visitsRouter.use(authenticate);

// ایشو #7: فرم ورود خلاصهٔ ویزیت (متن آزاد در فاز اول؛ صدا از طریق سرویس STT جدا آپلود می‌شود).
visitsRouter.get('/visits/new', async (req, res) => {
  const { rows: patients } = await pool.query(
    'SELECT id, full_name FROM patients WHERE clinic_id = $1 ORDER BY full_name',
    [req.user.clinicId]
  );
  res.render('visit-new', { patients, specialty: req.user.specialty });
});

// ایشو #1/#6: ثبت ویزیت + قرار دادن درخواست ساخت‌دهی در صف پردازش ناهمزمان.
visitsRouter.post('/visits', async (req, res) => {
  const { patient_id, raw_input } = req.body;
  if (!patient_id || !raw_input?.trim()) {
    return res.status(400).json({ error: 'patient_id و raw_input الزامی‌اند' });
  }

  const { rows: patientRows } = await pool.query(
    'SELECT id FROM patients WHERE id = $1 AND clinic_id = $2',
    [patient_id, req.user.clinicId]
  );
  if (!patientRows.length) return res.status(404).json({ error: 'بیمار یافت نشد' });

  const { rows: visitRows } = await pool.query(
    `INSERT INTO visits (patient_id, clinician_id, status) VALUES ($1, $2, 'draft') RETURNING id`,
    [patient_id, req.user.sub]
  );
  const visitId = visitRows[0].id;

  await pool.query(
    `INSERT INTO clinical_notes (visit_id, raw_input) VALUES ($1, $2)`,
    [visitId, raw_input]
  );

  await writeAuditLog({
    entityType: 'visit',
    entityId: visitId,
    action: 'created',
    actorId: req.user.sub,
  });

  const previous = await getPreviousApprovedVisit(patient_id, visitId);
  await enqueue('structure_visit', {
    visitId,
    specialty: req.user.specialty,
    rawInput: raw_input,
    previousVisitSummary: previous?.approved_content?.patient_summary || null,
  });

  res.redirect(`/visits/${visitId}/review`);
});

// ایشو #8: صفحهٔ بازبینی پیش‌نویس با ویرایش inline قبل از تأیید.
// ایشو #11: خلاصهٔ تغییرات از ویزیت قبلی در همین صفحه نمایش داده می‌شود.
visitsRouter.get('/visits/:id/review', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT v.id, v.patient_id, v.status, cn.raw_input, cn.ai_draft, cn.approved_content
     FROM visits v JOIN clinical_notes cn ON cn.visit_id = v.id
     WHERE v.id = $1 AND v.clinician_id = $2`,
    [req.params.id, req.user.sub]
  );
  const visit = rows[0];
  if (!visit) return res.status(404).send('ویزیت یافت نشد');

  const previous = await getPreviousApprovedVisit(visit.patient_id, visit.id);
  const changesSincePrevious = diffVisits(visit.ai_draft, previous?.approved_content);

  await writeAuditLog({ entityType: 'visit', entityId: visit.id, action: 'viewed', actorId: req.user.sub });

  res.render('visit-review', {
    visit,
    changesSincePrevious,
    disclaimer: AI_DRAFT_DISCLAIMER,
    ddxDisclaimer: DIFFERENTIAL_DIAGNOSIS_DISCLAIMER,
  });
});

// ایشو #8 (ادامه): ذخیرهٔ ویرایش پزشک روی پیش‌نویس، بدون تأیید نهایی هنوز.
visitsRouter.post('/visits/:id/draft', async (req, res) => {
  const { edited } = req.body; // JSON string از فرم ویرایش inline
  let parsed;
  try {
    parsed = JSON.parse(edited);
  } catch {
    return res.status(400).json({ error: 'edited باید JSON معتبر باشد' });
  }
  const { valid, errors } = validateStructuredNote(parsed);
  if (!valid) return res.status(400).json({ error: 'ساختار نامعتبر', details: errors });

  await pool.query(
    `UPDATE clinical_notes SET ai_draft = $2
     WHERE visit_id = (SELECT id FROM visits WHERE id = $1 AND clinician_id = $3)`,
    [req.params.id, JSON.stringify(parsed), req.user.sub]
  );
  await pool.query(`UPDATE visits SET status = 'reviewed' WHERE id = $1`, [req.params.id]);
  await writeAuditLog({ entityType: 'clinical_note', entityId: req.params.id, action: 'edited', actorId: req.user.sub });

  res.redirect(`/visits/${req.params.id}/review`);
});

// ایشو #8 (نهایی) + #15: تأیید نهایی — approved_content فقط از این مسیر نوشته می‌شود
// و هم‌زمان یک ردیف audit با action='approved' درج می‌گردد (طبق قاعدهٔ schema.sql).
visitsRouter.post('/visits/:id/approve', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `SELECT cn.ai_draft FROM clinical_notes cn
       JOIN visits v ON v.id = cn.visit_id
       WHERE v.id = $1 AND v.clinician_id = $2 FOR UPDATE`,
      [req.params.id, req.user.sub]
    );
    if (!rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'ویزیت یافت نشد' });
    }
    const approvedContent = rows[0].ai_draft;
    await client.query(
      `UPDATE clinical_notes SET approved_content = $2, approved_at = now(), approved_by = $3
       WHERE visit_id = $1`,
      [req.params.id, JSON.stringify(approvedContent), req.user.sub]
    );
    await client.query(`UPDATE visits SET status = 'approved' WHERE id = $1`, [req.params.id]);
    await writeAuditLog(
      { entityType: 'visit', entityId: req.params.id, action: 'approved', actorId: req.user.sub },
      client
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  res.redirect(`/visits/${req.params.id}/review`);
});

// ایشو #16/#18: ارسال خلاصهٔ بیمار از طریق پیامک — فقط برای ویزیت approved مجاز است.
visitsRouter.post('/visits/:id/send-sms', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT v.status, cn.approved_content, p.phone
     FROM visits v
     JOIN clinical_notes cn ON cn.visit_id = v.id
     JOIN patients p ON p.id = v.patient_id
     WHERE v.id = $1 AND v.clinician_id = $2`,
    [req.params.id, req.user.sub]
  );
  const visit = rows[0];
  if (!visit) return res.status(404).json({ error: 'ویزیت یافت نشد' });
  if (visit.status !== 'approved') {
    return res.status(409).json({ error: 'فقط ویزیت تأییدشده قابل ارسال به بیمار است' });
  }

  const content = visit.approved_content;
  const text = buildPatientSummarySMS({
    clinicName: 'طبیب‌یار',
    patientSummary: content.patient_summary,
    followUpItems: content.follow_up,
    warnings: content.warnings,
  });

  const provider = getSMSProvider();
  await provider.send(visit.phone, text);

  await writeAuditLog({
    entityType: 'visit',
    entityId: req.params.id,
    action: 'sent_to_patient',
    actorId: req.user.sub,
  });

  res.redirect(`/visits/${req.params.id}/review`);
});
