import crypto from 'node:crypto';
import { normalizeDigits } from '../lib/locale.js';

const CSRF_COOKIE = 'csrf';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function parseCookies(header = '') {
  const cookies = Object.create(null);
  for (const pair of header.split(';')) {
    const index = pair.indexOf('=');
    if (index === -1) continue;
    const key = pair.slice(0, index).trim();
    if (!key) continue;
    try {
      cookies[key] = decodeURIComponent(pair.slice(index + 1).trim());
    } catch {
      cookies[key] = '';
    }
  }
  return cookies;
}

// ایشو T13: پارسر کوکی بدون پرتاب خطا روی مقدار ناقص و پشتیبانی از double-submit CSRF.
export function securityMiddleware({ production = process.env.NODE_ENV === 'production' } = {}) {
  return (req, res, next) => {
    req.cookies = parseCookies(req.headers.cookie);
    const validCookie = /^[A-Za-z0-9_-]{32}$/.test(req.cookies[CSRF_COOKIE] || '');
    res.locals.csrfToken = validCookie ? req.cookies[CSRF_COOKIE] : crypto.randomBytes(24).toString('base64url');
    if (!validCookie) {
      res.cookie(CSRF_COOKIE, res.locals.csrfToken, {
        httpOnly: false,
        sameSite: 'strict',
        secure: production,
        maxAge: 12 * 60 * 60 * 1000,
      });
    }
    next();
  };
}

/** همهٔ درخواست‌های تغییردهنده باید توکن هدر یا فیلد form را با کوکی CSRF مطابقت دهند. */
export function csrfProtection(req, res, next) {
  if (SAFE_METHODS.has(req.method)) return next();
  const cookieToken = req.cookies?.csrf;
  const requestToken = req.get('x-csrf-token') || req.body?._csrf;
  const valid =
    typeof cookieToken === 'string' &&
    typeof requestToken === 'string' &&
    /^[A-Za-z0-9_-]{32}$/.test(cookieToken) &&
    /^[A-Za-z0-9_-]{32}$/.test(requestToken) &&
    crypto.timingSafeEqual(Buffer.from(cookieToken), Buffer.from(requestToken));
  if (!valid) {
    if (req.accepts('html')) return res.status(403).send('درخواست نامعتبر است. صفحه را دوباره بارگذاری کنید.');
    return res.status(403).json({ error: 'توکن امنیتی نامعتبر است' });
  }
  next();
}

/** رقم‌های ورودی‌های شناسه‌ای را پیش از اعتبارسنجی و ذخیره یکسان می‌کند. */
export function normalizeIdentityFields(req, _res, next) {
  for (const field of ['phone', 'national_id', 'q']) {
    if (typeof req.body?.[field] === 'string') req.body[field] = normalizeDigits(req.body[field]).trim();
    if (typeof req.query?.[field] === 'string') req.query[field] = normalizeDigits(req.query[field]).trim();
  }
  next();
}
