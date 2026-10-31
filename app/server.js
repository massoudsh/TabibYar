import 'dotenv/config';
import { createApp } from './src/app.js';
import { validateConfig } from './src/lib/config.js';
import { pool } from './src/db/pool.js';

validateConfig();
const app = createApp();
const port = Number(process.env.PORT || 3000);

const server = app.listen(port, () => {
  console.log(JSON.stringify({ event: 'server_started', port }));
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
