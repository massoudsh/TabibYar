// ایشو #6: صف پردازش ناهمزمان برای درخواست‌های ساعات شلوغ.
// پیاده‌سازی سبک مبتنی بر جدول jobs (به‌جای Redis که در فاز اول ممکن است در دسترس نباشد).
// contract جدا از پیاده‌سازی است تا در فاز دو با صف واقعی (Redis/RabbitMQ) جایگزین شود
// بدون تغییر کد routes.
import { pool } from '../db/pool.js';

export async function enqueue(type, payload) {
  const { rows } = await pool.query(
    `INSERT INTO jobs (type, payload) VALUES ($1, $2) RETURNING id`,
    [type, JSON.stringify(payload)]
  );
  return rows[0].id;
}

export async function getJob(id) {
  const { rows } = await pool.query('SELECT * FROM jobs WHERE id = $1', [id]);
  return rows[0] || null;
}

/**
 * یک job در وضعیت pending را با قفل ردیفی (FOR UPDATE SKIP LOCKED) برمی‌دارد
 * تا چند worker هم‌زمان بتوانند بدون تداخل کار کنند.
 */
export async function claimNextJob() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `SELECT * FROM jobs WHERE status = 'pending'
       ORDER BY created_at ASC LIMIT 1 FOR UPDATE SKIP LOCKED`
    );
    if (!rows.length) {
      await client.query('COMMIT');
      return null;
    }
    const job = rows[0];
    await client.query(
      `UPDATE jobs SET status = 'processing', attempts = attempts + 1, updated_at = now() WHERE id = $1`,
      [job.id]
    );
    await client.query('COMMIT');
    return job;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function markJobDone(id) {
  await pool.query(`UPDATE jobs SET status = 'done', updated_at = now() WHERE id = $1`, [id]);
}

export async function markJobFailed(id, errorMessage) {
  await pool.query(
    `UPDATE jobs SET status = 'failed', last_error = $2, updated_at = now() WHERE id = $1`,
    [id, String(errorMessage).slice(0, 2000)]
  );
}
