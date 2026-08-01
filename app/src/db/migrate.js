// اجرای ترتیبی فایل‌های migrations/*.sql روی DATABASE_URL.
// استفاده: DATABASE_URL=postgres://... npm run migrate
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './pool.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(__dirname, 'migrations');

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL ست نشده. مثال: DATABASE_URL=postgres://user:pass@host:5432/tabibyar npm run migrate');
    process.exit(1);
  }

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    filename TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);

  for (const file of files) {
    const { rows } = await pool.query('SELECT 1 FROM schema_migrations WHERE filename = $1', [file]);
    if (rows.length) {
      console.log(`[migrate] skip ${file} (قبلاً اجرا شده)`);
      continue;
    }
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    console.log(`[migrate] applying ${file} ...`);
    await pool.query('BEGIN');
    try {
      await pool.query(sql);
      await pool.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
      await pool.query('COMMIT');
      console.log(`[migrate] ✓ ${file}`);
    } catch (err) {
      await pool.query('ROLLBACK');
      console.error(`[migrate] ✗ ${file}:`, err.message);
      process.exit(1);
    }
  }

  console.log('[migrate] همه migrationها اجرا شدند.');
  await pool.end();
}

main();
