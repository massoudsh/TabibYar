import 'dotenv/config';
import { createApp } from './src/app.js';
import { validateConfig, isDemoMode, demoModeWarnings } from './src/lib/config.js';
import { pool } from './src/db/pool.js';
import { runSeed } from './src/db/seed-demo.js';

validateConfig();
for (const warning of demoModeWarnings()) {
  console.warn(JSON.stringify({ event: 'demo_mode_warning', warning }));
}

// حالت دمو: پیش از پذیرش درخواست، دادهٔ نمایشی ۲۰ بیمار ساخته/بازسازی می‌شود.
// خطای seed سرور را متوقف نمی‌کند؛ فقط لاگ می‌شود تا صفحهٔ ورود در دسترس بماند.
// سه تلاش با فاصلهٔ کوتاه تا دیتابیسی که دیر آماده می‌شود باعث ورود ناموفق نشود.
if (isDemoMode()) {
  let seeded = false;
  for (let attempt = 1; attempt <= 3 && !seeded; attempt++) {
    try {
      const { counts } = await runSeed();
      console.log(JSON.stringify({ event: 'demo_mode_seeded', counts }));
      seeded = true;
    } catch (error) {
      console.error(JSON.stringify({
        event: 'demo_mode_seed_failed',
        attempt,
        error: error?.message || String(error),
      }));
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
  if (!seeded) {
    console.error(JSON.stringify({
      event: 'demo_mode_seed_missing',
      detail: 'دادهٔ دمو ساخته نشد؛ ورود با حساب دمو ممکن نیست.',
    }));
  }
}

const app = createApp();
const port = Number(process.env.PORT || 3000);

const server = app.listen(port, () => {
  console.log(JSON.stringify({ event: 'server_started', port, demoMode: isDemoMode() }));
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
