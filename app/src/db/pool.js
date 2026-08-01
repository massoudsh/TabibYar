import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

// اگر DATABASE_URL ست نشده باشد، pool ساخته می‌شود اما اولین کوئری خطای واضح می‌دهد
// (به‌جای کرش خاموش در import-time). این برای اجرای تست‌های بدون دیتابیس واقعی لازم است.
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || undefined,
  max: Number(process.env.PG_POOL_MAX || 10),
});

pool.on('error', (err) => {
  // eslint-disable-next-line no-console
  console.error('[db] خطای غیرمنتظره در pool اتصال:', err.message);
});

export async function query(text, params) {
  return pool.query(text, params);
}
