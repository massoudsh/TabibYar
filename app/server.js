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
if (isDemoMode()) {
  try {
    const { counts } = await runSeed();
    console.log(JSON.stringify({ event: 'demo_mode_seeded', counts }));
  } catch (error) {
    console.error(JSON.stringify({ event: 'demo_mode_seed_failed', error: error?.message || String(error) }));
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
