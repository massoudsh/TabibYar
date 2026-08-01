// راه‌اندازی اولیهٔ یک کلینیک و یک کاربر admin — پیش‌نیاز پایلوت (ایشو #25).
// استفاده: DATABASE_URL=... CLINIC_NAME="..." ADMIN_PHONE=... ADMIN_PASSWORD=... npm run seed
import 'dotenv/config';
import { pool } from './pool.js';
import { hashPassword } from '../lib/auth.js';

async function main() {
  const clinicName = process.env.CLINIC_NAME || 'کلینیک پایلوت طبیب‌یار';
  const adminPhone = process.env.ADMIN_PHONE;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const specialty = process.env.ADMIN_SPECIALTY || 'internal_medicine';

  if (!adminPhone || !adminPassword) {
    console.error('ADMIN_PHONE و ADMIN_PASSWORD الزامی‌اند.');
    process.exit(1);
  }

  const { rows: clinicRows } = await pool.query(
    'INSERT INTO clinics (name) VALUES ($1) RETURNING id',
    [clinicName]
  );
  const clinicId = clinicRows[0].id;

  const passwordHash = await hashPassword(adminPassword);
  await pool.query(
    `INSERT INTO clinicians (clinic_id, full_name, specialty, phone, role, password_hash)
     VALUES ($1, 'ادمین اولیه', $2, $3, 'admin', $4)`,
    [clinicId, specialty, adminPhone, passwordHash]
  );

  console.log(`کلینیک "${clinicName}" و کاربر admin (${adminPhone}) ساخته شد.`);
  await pool.end();
}

main();
