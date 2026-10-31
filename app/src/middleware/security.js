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
    console.warn(JSON.stringify({ event: 'csrf_rejected', requestId: req.requestId }));
    if (req.accepts('html')) return res.status(403).send('درخواست نامعتبر است. صفحه را دوباره بارگذاری کنید.');
    return res.status(403).json({ error: 'توکن امنیتی نامعتبر است' });
  }
  next();
}

export function loginRateLimit({ limit = 20, windowMs = 15 * 60 * 1000, maxEntries = 10000, now = Date.now } = {}) {
  const attempts = new Map();
  return (req, res, next) => {
    const time = now();
    const key = req.ip;
    let entry = attempts.get(key);
    if (!entry || entry.resetAt <= time) {
      if (attempts.size >= maxEntries) {
        for (const [ip, value] of attempts) if (value.resetAt <= time) attempts.delete(ip);
      }
      if (attempts.size >= maxEntries && !attempts.has(key)) {
        res.set('Retry-After', String(Math.ceil(windowMs / 1000)));
        return res.status(429).send('تعداد درخواست‌ها زیاد است؛ بعداً تلاش کنید.');
      }
      entry = { count: 0, resetAt: time + windowMs };
      attempts.set(key, entry);
    }
    entry.count++;
    if (entry.count > limit) {
      console.warn(JSON.stringify({ event: 'login_rate_limited', requestId: req.requestId }));
      res.set('Retry-After', String(Math.ceil((entry.resetAt - time) / 1000)));
      return res.status(429).send('تعداد تلاش‌های ورود زیاد است؛ کمی بعد تلاش کنید.');
    }
    next();
  };
}

/** رقم‌های ورودی‌های شناسه‌ای را پیش از اعتبارسنجی و ذخیره یکسان می‌کند. */
export function normalizeIdentityFields(req, _res, next) {
  for (const field of ['phone', 'national_id', 'q']) {
    if (typeof req.body?.[field] === 'string') req.body[field] = normalizeDigits(req.body[field]).trim();
    if (typeof req.query?.[field] === 'string') req.query[field] = normalizeDigits(req.query[field]).trim();
  }
  next();
}
