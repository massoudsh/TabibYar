import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { authRouter } from './routes/auth.routes.js';
import { patientsRouter } from './routes/patients.routes.js';
import { visitsRouter } from './routes/visits.routes.js';
import { adminRouter } from './routes/admin.routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// پارسر سبک کوکی به‌جای وابستگی cookie-parser (چون فقط یک فیلد ساده لازم است).
function simpleCookieParser(req, _res, next) {
  req.cookies = {};
  const header = req.headers.cookie;
  if (header) {
    for (const pair of header.split(';')) {
      const idx = pair.indexOf('=');
      if (idx === -1) continue;
      const key = pair.slice(0, idx).trim();
      const value = pair.slice(idx + 1).trim();
      req.cookies[key] = decodeURIComponent(value);
    }
  }
  next();
}

export function createApp() {
  const app = express();

  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, '../views'));
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  app.use(simpleCookieParser);
  app.use(express.static(path.join(__dirname, '../public')));

  app.use((req, res, next) => {
    res.cookie = (name, value, opts = {}) => {
      const parts = [`${name}=${encodeURIComponent(value)}`];
      if (opts.httpOnly) parts.push('HttpOnly');
      if (opts.sameSite) parts.push(`SameSite=${opts.sameSite}`);
      if (opts.secure) parts.push('Secure');
      if (opts.maxAge) parts.push(`Max-Age=${Math.floor(opts.maxAge / 1000)}`);
      parts.push('Path=/');
      res.append('Set-Cookie', parts.join('; '));
    };
    res.clearCookie = (name) => res.append('Set-Cookie', `${name}=; Path=/; Max-Age=0`);
    next();
  });

  // باید قبل از routerهای محافظت‌شده (که middleware احراز هویت را برای کل مسیرهای
  // ورودی به خودشان اجرا می‌کنند) ثبت شود، وگرنه ری‌دایرکت به /login می‌گیرد.
  app.get('/health', (req, res) => res.json({ status: 'ok' }));
  app.get('/', (req, res) => res.redirect('/login'));

  app.use(authRouter);
  app.use(patientsRouter);
  app.use(visitsRouter);
  app.use(adminRouter);

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error(err);
    if (req.accepts('json')) return res.status(500).json({ error: 'خطای داخلی سرور' });
    res.status(500).send('خطای داخلی سرور');
  });

  return app;
}
