// ایشو T13: اعتبارسنجی config در زمان راه‌اندازی — فقط نام متغیر لاگ می‌شود، نه مقدار.
const REQUIRED_VARIABLES = ['JWT_SECRET', 'ENCRYPTION_KEY', 'DATABASE_URL'];

/** آیا حالت دمو فعال است؟ (DEMO_MODE=true) */
export function isDemoMode(env = process.env) {
  return env.DEMO_MODE === 'true';
}

export function validateConfig(env = process.env) {
  const errors = [];
  for (const name of REQUIRED_VARIABLES) {
    if (!env[name]) errors.push(`${name} تنظیم نشده است.`);
  }
  if (env.JWT_SECRET && Buffer.byteLength(env.JWT_SECRET) < 32) {
    errors.push('JWT_SECRET باید حداقل ۳۲ بایت باشد.');
  }
  if (env.ENCRYPTION_KEY && Buffer.from(env.ENCRYPTION_KEY, 'base64').length !== 32) {
    errors.push('ENCRYPTION_KEY باید پس از decode base64 دقیقاً ۳۲ بایت باشد.');
  }
  // حالت دمو: دادهٔ ساختگی ۲۰ بیمار در startup ساخته می‌شود — فقط برای نمایش، نه محیط واقعی.
  if (env.DEMO_MODE === 'true' && env.NODE_ENV === 'production') {
    errors.push('DEMO_MODE در NODE_ENV=production مجاز نیست.');
  }
  if (errors.length) {
    throw new Error(`پیکربندی نامعتبر است:\n- ${errors.join('\n- ')}`);
  }
  return true;
}
