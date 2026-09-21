// ایشو #6: worker پردازش صف — با `npm run worker` جدا از پروسهٔ وب اجرا می‌شود
// تا ساعات شلوغ مطب باعث انسداد درخواست‌های HTTP نشود.
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

const HANDLERS = {
  structure_visit: handleStructureVisit,
};

async function tick() {
  const job = await claimNextJob();
  if (!job) return false;
  try {
    const handler = HANDLERS[job.type];
    if (!handler) throw new Error(`نوع job ناشناخته: ${job.type}`);
    await handler(job);
    await markJobDone(job.id);
    console.log(`[worker] ✓ job ${job.id} (${job.type})`);
  } catch (err) {
    console.error(`[worker] ✗ job ${job.id}:`, err.message);
    await markJobFailed(job.id, err.message);
  }
  return true;
}

async function loop() {
  console.log('[worker] شروع به گوش‌دادن به صف jobs...');
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const handled = await tick();
    if (!handled) await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
}

if (process.env.NODE_ENV !== 'test') {
  loop();
}
