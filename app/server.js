import 'dotenv/config';
import { createApp } from './src/app.js';
import { validateConfig, isDemoMode, demoModeWarnings } from './src/lib/config.js';
import { pool } from './src/db/pool.js';
import { runSeed } from './src/db/seed-demo.js';

validateConfig();
for (const warning of demoModeWarnings()) {
  console.warn(JSON.stringify({ event: 'demo_mode_warning', warning }));
}

// حالت دمو: دادهٔ نمایشی ۲۰ بیمار ساخته/بازسازی می‌شود.
// سرور اول listen می‌کند تا صفحهٔ ورود هرگز به‌خاطر seed در دسترس نباشد؛ seed در پس‌زمینه
// با مهلت زمانی اجرا می‌شود و وضعیتش در لاگ و در /health/ready دیده می‌شود.
const demoState = { status: isDemoMode() ? 'pending' : 'off', attempts: 0, error: null };

async function seedDemoData() {
  for (let attempt = 1; attempt <= 3; attempt++) {
    demoState.attempts = attempt;
    try {
      const { counts } = await runSeed();
      demoState.status = 'ready';
      demoState.error = null;
      console.log(JSON.stringify({ event: 'demo_mode_seeded', counts }));
      return;
    } catch (error) {
      demoState.error = error?.message || String(error);
      console.error(JSON.stringify({ event: 'demo_mode_seed_failed', attempt, error: demoState.error }));
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
  demoState.status = 'failed';
  console.error(JSON.stringify({
    event: 'demo_mode_seed_missing',
    detail: 'دادهٔ دمو ساخته نشد؛ ورود با حساب دمو ممکن نیست.',
  }));
}

const app = createApp();
app.locals.demoState = demoState;
const port = Number(process.env.PORT || 3000);

const server = app.listen(port, () => {
  console.log(JSON.stringify({ event: 'server_started', port, demoMode: isDemoMode() }));
  if (isDemoMode()) {
    const deadline = setTimeout(() => {
      if (demoState.status === 'pending') {
        demoState.status = 'failed';
        demoState.error = 'timeout';
        console.error(JSON.stringify({ event: 'demo_mode_seed_timeout' }));
      }
    }, 120000);
    deadline.unref();
    seedDemoData().finally(() => clearTimeout(deadline));
  }
});
let shuttingDown = false;
function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  const timeout = setTimeout(() => { server.closeAllConnections(); process.exit(1); }, 30000);
  timeout.unref();
  server.close(async () => {
    await pool.end();
    clearTimeout(timeout);
  });
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
