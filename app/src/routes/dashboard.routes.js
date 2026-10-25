import { Router } from 'express';
import { pool } from '../db/pool.js';
import { authenticate } from '../middleware/authenticate.js';

export const dashboardRouter = Router();
dashboardRouter.use(authenticate);

dashboardRouter.get('/dashboard', async (req, res) => {
  const [summaryResult, pendingResult, recentResult] = await Promise.all([
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
  ]);

  const summary = Object.fromEntries(
    Object.entries(summaryResult.rows[0]).map(([key, value]) => [key, Number(value) || 0])
  );
  res.render('dashboard', {
    summary,
    followUps: pendingResult.rows,
    recentVisits: recentResult.rows,
    clinician: req.user,
  });
});
