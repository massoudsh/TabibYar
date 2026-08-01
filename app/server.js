import 'dotenv/config';
import { createApp } from './src/app.js';

const app = createApp();
const port = Number(process.env.PORT || 3000);

app.listen(port, () => {
  console.log(`[server] طبیب‌یار روی پورت ${port} اجرا شد`);
});
