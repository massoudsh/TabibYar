// ایشو #9: احراز هویت پزشک (ورود ساده با JWT).
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_EXPIRY = '12h'; // طول یک شیفت کاری معمول مطب

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET تنظیم نشده.');
  return secret;
}

export async function hashPassword(plain) {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

export function issueToken(clinician) {
  return jwt.sign(
    {
      sub: clinician.id,
      clinicId: clinician.clinic_id,
      role: clinician.role, // 'physician' | 'admin' — پایهٔ RBAC (ایشو #21)
      specialty: clinician.specialty,
    },
    getSecret(),
    { expiresIn: JWT_EXPIRY }
  );
}

export function verifyToken(token) {
  return jwt.verify(token, getSecret());
}
