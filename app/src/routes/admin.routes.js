// ایشو #21: RBAC پایه — این route فقط برای نقش admin مجاز است (نمونهٔ عملی enforcement).
import { Router } from 'express';
import { pool } from '../db/pool.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/rbac.js';
import { hashPassword } from '../lib/auth.js';
import { writeAuditLog } from '../lib/audit.js';

export const adminRouter = Router();
adminRouter.use(authenticate, requireRole('admin'));

adminRouter.get('/admin/analytics', async (req, res) => {
  const { rows } = await pool.query(
    `WITH clinic_visits AS (
       SELECT v.id, v.created_at
       FROM visits v
       JOIN clinicians c ON c.id = v.clinician_id
       WHERE c.clinic_id = $1
     )
     SELECT
       (SELECT COUNT(*) FROM clinic_visits WHERE created_at >= now() - INTERVAL '30 days') AS visits_last_30_days,
       (SELECT COUNT(*) FROM clinical_notes cn JOIN clinic_visits v ON v.id = cn.visit_id
        WHERE cn.approved_at >= now() - INTERVAL '30 days') AS approved_notes_last_30_days,
       (SELECT COUNT(*) FROM clinical_notes cn JOIN clinic_visits v ON v.id = cn.visit_id
        WHERE cn.approved_at >= now() - INTERVAL '30 days'
          AND cn.ai_draft IS NOT DISTINCT FROM cn.approved_content) AS unchanged_approvals_last_30_days,
       (SELECT AVG(EXTRACT(EPOCH FROM (cn.approved_at - v.created_at)) / 60)
        FROM clinical_notes cn JOIN clinic_visits v ON v.id = cn.visit_id
        WHERE cn.approved_at >= now() - INTERVAL '30 days') AS average_approval_minutes,
       (SELECT COUNT(*) FROM audit_logs al JOIN clinic_visits v ON v.id = al.entity_id
        WHERE al.entity_type = 'visit' AND al.action = 'sent_to_patient'
          AND al.created_at >= now() - INTERVAL '30 days') AS sms_sent_last_30_days,
       (SELECT COUNT(*) FROM follow_up_items f JOIN clinic_visits v ON v.id = f.visit_id) AS follow_ups_total,
       (SELECT COUNT(*) FROM follow_up_items f JOIN clinic_visits v ON v.id = f.visit_id
        WHERE f.status = 'done') AS follow_ups_completed`,
    [req.user.clinicId]
  );

  const metrics = Object.fromEntries(
    Object.entries(rows[0]).map(([key, value]) => [key, Number(value) || 0])
  );
  res.render('analytics', { metrics });
});

adminRouter.post('/admin/clinicians', async (req, res) => {
  const { full_name, specialty, phone, password, role } = req.body;
  if (!full_name || !specialty || !phone || !password) {
    return res.status(400).json({ error: 'full_name، specialty، phone و password الزامی‌اند' });
  }
  const passwordHash = await hashPassword(password);
  const { rows } = await pool.query(
    `INSERT INTO clinicians (clinic_id, full_name, specialty, phone, role, password_hash)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [req.user.clinicId, full_name, specialty, phone, role || 'physician', passwordHash]
  );
  await writeAuditLog({
    entityType: 'clinician',
    entityId: rows[0].id,
    action: 'created',
    actorId: req.user.sub,
  });
  res.status(201).json({ id: rows[0].id });
});
