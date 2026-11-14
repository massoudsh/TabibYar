import { Router } from 'express';
import { pool } from '../db/pool.js';
import { authenticate } from '../middleware/authenticate.js';

export const dashboardRouter = Router();
dashboardRouter.use(authenticate);

dashboardRouter.get('/dashboard', async (req, res) => {
  const [summaryResult, pendingResult, recentResult, trendResult] = await Promise.all([
    pool.query(
      `SELECT
        (SELECT COUNT(*) FROM patients WHERE clinic_id = $1) AS patients_count,
        (SELECT COUNT(*) FROM visits v WHERE v.clinician_id = $2 AND v.created_at >= CURRENT_DATE) AS today_visits,
        (SELECT COUNT(*) FROM visits v WHERE v.clinician_id = $2 AND v.status IN ('draft', 'reviewed')) AS pending_reviews,
        (SELECT COUNT(*) FROM follow_up_items f JOIN visits v ON v.id = f.visit_id
         WHERE v.clinician_id = $2 AND f.status = 'pending') AS open_follow_ups`,
      [req.user.clinicId, req.user.sub]
    ),
    pool.query(
      `SELECT f.id, f.description, f.due_date, p.full_name AS patient_name, p.id AS patient_id
       FROM follow_up_items f
       JOIN visits v ON v.id = f.visit_id
       JOIN patients p ON p.id = v.patient_id
       WHERE v.clinician_id = $1 AND f.status = 'pending'
       ORDER BY f.due_date NULLS LAST, f.created_at DESC
       LIMIT 5`,
      [req.user.sub]
    ),
    pool.query(
      `SELECT v.id, v.status, v.visit_date, p.full_name AS patient_name
       FROM visits v JOIN patients p ON p.id = v.patient_id
       WHERE v.clinician_id = $1
       ORDER BY v.visit_date DESC LIMIT 6`,
      [req.user.sub]
    ),
    // نمودار روند ۱۴ روز اخیر: ویزیت‌های ثبت‌شده و تأییدشدهٔ هر روز (روزهای خالی صفر).
    pool.query(
      `WITH days AS (
         SELECT generate_series(CURRENT_DATE - INTERVAL '13 days', CURRENT_DATE, INTERVAL '1 day')::date AS day
       )
       SELECT d.day,
         (SELECT COUNT(*) FROM visits v
          WHERE v.clinician_id = $1 AND v.created_at::date = d.day) AS visits,
         (SELECT COUNT(*) FROM clinical_notes cn JOIN visits v ON v.id = cn.visit_id
          WHERE v.clinician_id = $1 AND cn.approved_at::date = d.day) AS approved
       FROM days d ORDER BY d.day`,
      [req.user.sub]
    ),
  ]);

  const summary = Object.fromEntries(
    Object.entries(summaryResult.rows[0]).map(([key, value]) => [key, Number(value) || 0])
  );
  const trend = trendResult.rows.map((row) => ({
    day: row.day,
    visits: Number(row.visits) || 0,
    approved: Number(row.approved) || 0,
  }));
  const trendMax = Math.max(1, ...trend.map((point) => point.visits));

  res.render('dashboard', {
    summary,
    followUps: pendingResult.rows,
    recentVisits: recentResult.rows,
    trend,
    trendMax,
    clinician: req.user,
  });
});
