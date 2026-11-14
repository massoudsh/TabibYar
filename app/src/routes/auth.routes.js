// ایشو #9: احراز هویت پزشک (ورود ساده، بدون پنل چندنقشی پیچیده در فاز اول).
import { Router } from 'express';
import { pool } from '../db/pool.js';
import { verifyPassword, issueToken } from '../lib/auth.js';
import { loginRateLimit } from '../middleware/security.js';

export const authRouter = Router();

authRouter.get('/login', (req, res) => {
  res.render('login', { error: null });
});

authRouter.post('/login', loginRateLimit(), async (req, res) => {
  const { phone, password } = req.body;
  if (typeof phone !== 'string' || typeof password !== 'string' || !phone || !password || phone.length > 32 || Buffer.byteLength(password) > 72) {
    return res.status(400).render('login', { error: 'شماره تماس و رمز عبور الزامی است' });
  }

  // شمارهٔ تلفن در clinicians یکتا نیست (مثلاً حساب دمو و ادمین پایلوت می‌توانند هم‌شماره باشند)،
  // پس همهٔ حساب‌های این شماره بررسی می‌شوند و حسابی که رمز با آن مطابق است انتخاب می‌شود.
  const { rows } = await pool.query(
    'SELECT * FROM clinicians WHERE phone = $1 ORDER BY created_at DESC',
    [phone]
  );
  let clinician = null;
  for (const candidate of rows) {
    if (await verifyPassword(password, candidate.password_hash)) {
      clinician = candidate;
      break;
    }
  }
  if (!clinician) {
    console.warn(JSON.stringify({ event: 'login_failed', requestId: req.requestId }));
    return res.status(401).render('login', { error: 'شماره تماس یا رمز عبور اشتباه است' });
  }

  const token = issueToken(clinician);
  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 12 * 60 * 60 * 1000,
  });
  res.redirect('/dashboard');
});

authRouter.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.redirect('/login');
});
