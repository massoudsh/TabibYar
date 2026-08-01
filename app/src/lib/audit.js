// ایشو #15: Audit Log کامل برای هر تغییر روی پرونده.
import { pool } from '../db/pool.js';

const VALID_ACTIONS = new Set(['created', 'edited', 'approved', 'sent_to_patient', 'viewed']);

/**
 * ثبت یک رکورد Audit. هرگز نباید کل عملیات را به‌خاطر خطای audit متوقف کند در حالت viewed،
 * اما برای عملیات نوشتاری حساس (created/edited/approved/sent_to_patient) باید هم‌تراکنش با
 * عملیات اصلی باشد تا هرگز بدون رد پا نماند (طبق docs/architecture.md اصل ۳).
 */
export async function writeAuditLog({ entityType, entityId, action, actorId, metadata }, client = pool) {
  if (!VALID_ACTIONS.has(action)) {
    throw new Error(`action نامعتبر برای audit log: ${action}`);
  }
  await client.query(
    `INSERT INTO audit_logs (entity_type, entity_id, action, actor_id, metadata)
     VALUES ($1, $2, $3, $4, $5)`,
    [entityType, entityId, action, actorId ?? null, metadata ? JSON.stringify(metadata) : null]
  );
}
