// ایشو #6: worker پردازش صف — با `npm run worker` جدا از پروسهٔ وب اجرا می‌شود
// تا ساعات شلوغ مطب باعث انسداد درخواست‌های HTTP نشود.
import 'dotenv/config';
import { validateConfig } from '../lib/config.js';
import { claimNextJob, markJobDone, markJobFailed } from './queue.js';
import { structureVisit } from './structuring.js';
import { getGroundedInsights } from './rag/ragAgent.js';
import { pool } from '../db/pool.js';
import { writeAuditLog } from '../lib/audit.js';

const POLL_INTERVAL_MS = Number(process.env.QUEUE_POLL_INTERVAL_MS || 2000);

async function handleStructureVisit(job) {
  const { visitId, specialty, rawInput, previousVisitSummary } = job.payload;
  const draft = await structureVisit({ specialty, rawInput, previousVisitSummary });
  // ایشو #28: بعد از ساخت‌دهی موفق، دستیار RAG نکات مرتبط از پایگاه دانش داخلی را
  // پیوست می‌کند (بدون تشخیص/تجویز) تا در صفحهٔ بازبینی به پزشک نمایش داده شود.
  const ragInsights = await getGroundedInsights({ specialty, structuredNote: draft });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `SELECT id FROM visits WHERE id = $1 AND status = 'draft' FOR UPDATE`,
      [visitId]
    );
    if (!rows.length) {
      await client.query('ROLLBACK');
      return;
    }
    await client.query(`UPDATE clinical_notes SET ai_draft = $2, rag_insights = $3 WHERE visit_id = $1`, [
      visitId,
      JSON.stringify(draft),
      JSON.stringify(ragInsights),
    ]);
    await writeAuditLog(
      {
        entityType: 'clinical_note',
        entityId: visitId,
        action: 'edited',
        actorId: null,
        metadata: { source: 'structuring_pipeline', jobId: job.id },
      },
      client
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function handleSendSmsReminder(job) {
  const { reminderId } = job.payload;
  const client = await pool.connect();
  let reminder;
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `SELECT r.id, r.message, p.phone
       FROM sms_reminders r
       JOIN follow_up_items f ON f.id = r.follow_up_id
       JOIN visits v ON v.id = f.visit_id
       JOIN patients p ON p.id = v.patient_id
       WHERE r.id = $1 AND r.status = 'scheduled' AND p.consent_recorded_at IS NOT NULL
         AND v.status = 'approved' AND f.status = 'pending'
       FOR UPDATE`,
      [reminderId]
    );
    reminder = rows[0];
    if (!reminder) {
      await client.query('COMMIT');
      return;
    }
    await client.query(`UPDATE sms_reminders SET status = 'sending' WHERE id = $1`, [reminder.id]);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  const { getSMSProvider } = await import('./smsAdapter.js');
  await getSMSProvider().send(reminder.phone, reminder.message);
  await pool.query(`UPDATE sms_reminders SET status = 'sent', sent_at = now() WHERE id = $1`, [reminder.id]);
  await writeAuditLog({ entityType: 'sms_reminder', entityId: reminder.id, action: 'sent_to_patient', actorId: null });
}

const HANDLERS = {
  structure_visit: handleStructureVisit,
  send_sms_reminder: handleSendSmsReminder,
};

async function tick() {
  const job = await claimNextJob();
  if (!job) return false;
  try {
    const handler = HANDLERS[job.type];
    if (!handler) throw new Error(`نوع job ناشناخته: ${job.type}`);
    await handler(job);
    await markJobDone(job.id);
    console.log(JSON.stringify({ event: 'job_done', jobId: job.id, type: job.type }));
  } catch {
    console.error(JSON.stringify({ event: 'job_failed', jobId: job.id, type: job.type }));
    await markJobFailed(job.id);
  }
  return true;
}

export async function runWorker({ signal, pollInterval = POLL_INTERVAL_MS, processNext = tick } = {}) {
  while (!signal?.aborted) {
    let handled = false;
    try {
      handled = await processNext();
    } catch {
      console.error(JSON.stringify({ event: 'queue_unavailable' }));
    }
    if (!handled && !signal?.aborted) {
      await new Promise(resolve => {
        const done = () => {
          clearTimeout(timer);
          signal?.removeEventListener('abort', done);
          resolve();
        };
        const timer = setTimeout(done, pollInterval);
        signal?.addEventListener('abort', done, { once: true });
      });
    }
  }
}

if (process.env.NODE_ENV !== 'test') {
  validateConfig();
  const controller = new AbortController();
  let deadline;
  const stop = () => {
    if (controller.signal.aborted) return;
    controller.abort();
    deadline = setTimeout(() => process.exit(1), 30000);
    deadline.unref();
  };
  process.once('SIGTERM', stop);
  process.once('SIGINT', stop);
  runWorker({ signal: controller.signal }).finally(async () => {
    await pool.end();
    clearTimeout(deadline);
  });
}
