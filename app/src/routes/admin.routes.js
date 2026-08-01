// ایشو #21: RBAC پایه — این route فقط برای نقش admin مجاز است (نمونهٔ عملی enforcement).
import { Router } from 'express';
import { pool } from '../db/pool.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/rbac.js';
import { hashPassword } from '../lib/auth.js';
import { writeAuditLog } from '../lib/audit.js';

export const adminRouter = Router();
adminRouter.use(authenticate, requireRole('admin'));

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
