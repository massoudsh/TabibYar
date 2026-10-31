import express from 'express';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { authRouter } from './routes/auth.routes.js';
import { patientsRouter } from './routes/patients.routes.js';
import { visitsRouter } from './routes/visits.routes.js';
import { dashboardRouter } from './routes/dashboard.routes.js';
import { adminRouter } from './routes/admin.routes.js';
import { securityMiddleware, csrfProtection, normalizeIdentityFields } from './middleware/security.js';
import { toJalaliString } from './lib/locale.js';
import { asyncHandler } from './lib/asyncHandler.js';
import { pool } from './db/pool.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const routers = [authRouter, dashboardRouter, patientsRouter, visitsRouter, adminRouter];
// Express 4 needs promise rejection forwarding on each registered route handler.
for (const router of routers) {
  for (const layer of router.stack) {
    if (layer.route) {
      for (const handler of layer.route.stack) handler.handle = asyncHandler(handler.handle);
    }
  }
}

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, '../views'));
  app.locals.toJalaliString = toJalaliString;
  app.use((req, res, next) => {
    req.requestId = crypto.randomUUID();
    res.locals.requestId = req.requestId;
    res.set('X-Request-ID', res.locals.requestId);
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('X-Frame-Options', 'DENY');
    res.set('Referrer-Policy', 'no-referrer');
    res.set('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; frame-ancestors 'none'; form-action 'self'; base-uri 'none'; object-src 'none'");
    if (process.env.NODE_ENV === 'production') res.set('Strict-Transport-Security', 'max-age=31536000');
    next();
  });
  app.use(express.static(path.join(__dirname, '../public')));
  app.use(express.urlencoded({ extended: false, limit: '100kb' }));
  app.use(express.json({ limit: '100kb' }));
  app.use(securityMiddleware());
  app.use(csrfProtection);
  app.use(normalizeIdentityFields);
  app.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  app.get(['/health', '/health/live'], (_req, res) => res.json({ status: 'ok' }));
  app.get('/health/ready', asyncHandler(async (_req, res) => {
    try {
      await pool.query('SELECT 1');
      res.json({ status: 'ok' });
    } catch {
      res.status(503).json({ status: 'unavailable' });
    }
  }));
  app.get('/', (_req, res) => res.redirect('/dashboard'));
  for (const router of routers) app.use(router);
  app.use((err, req, res, _next) => {
    const status = [400, 413].includes(err.status) ? err.status : 500;
    console.error(JSON.stringify({ event: 'request_failed', requestId: res.locals.requestId, status }));
    if (res.headersSent) return _next(err);
    if (req.accepts('json')) return res.status(status).json({ error: 'درخواست انجام نشد. دوباره تلاش کنید.' });
    res.status(status).send('درخواست انجام نشد. دوباره تلاش کنید.');
  });
  return app;
}
