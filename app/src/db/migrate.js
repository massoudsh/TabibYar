import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './pool.js';

const migrationsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations');

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  const files = fs.readdirSync(migrationsDir).filter(file => file.endsWith('.sql')).sort();
  const client = await pool.connect();
  try {
    await client.query('SELECT pg_advisory_lock(741928)');
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);
    for (const file of files) {
      const { rows } = await client.query('SELECT 1 FROM schema_migrations WHERE filename = $1', [file]);
      if (rows.length) continue;
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(JSON.stringify({ event: 'migration_applied', file }));
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
  } finally {
    try { await client.query('SELECT pg_advisory_unlock(741928)'); }
    finally { client.release(); }
  }
}

main().catch(() => {
  console.error(JSON.stringify({ event: 'migration_failed' }));
  process.exitCode = 1;
}).finally(() => pool.end());
