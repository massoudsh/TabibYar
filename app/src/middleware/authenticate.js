// ایشو #9 + #21: استخراج و اعتبارسنجی JWT از کوکی/هدر، مقداردهی req.user برای RBAC.
import { verifyToken } from '../lib/auth.js';

export function authenticate(req, res, next) {
  const token = req.cookies?.token || (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) {
    if (req.accepts('html')) return res.redirect('/login');
    return res.status(401).json({ error: 'احراز هویت لازم است' });
  }
  try {
    req.user = verifyToken(token); // { sub, clinicId, role, specialty }
    next();
  } catch {
    if (req.accepts('html')) return res.redirect('/login');
    return res.status(401).json({ error: 'توکن نامعتبر یا منقضی‌شده' });
  }
}
