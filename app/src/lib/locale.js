// ایشو T10: یکسان‌سازی رقم‌های فارسی/عربی و نمایش تاریخ شمسی.
const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

/** رقم‌های فارسی و عربی-هندی را به لاتین تبدیل می‌کند. */
export function normalizeDigits(input) {
  if (input === null || input === undefined) return input;
  return String(input).replace(/[۰-۹٠-٩]/g, (digit) => {
    const persian = PERSIAN_DIGITS.indexOf(digit);
    return String(persian === -1 ? ARABIC_DIGITS.indexOf(digit) : persian);
  });
}

/** تاریخ را با تقویم شمسی و رقم‌های فارسی نمایش می‌دهد؛ تاریخ نامعتبر رشتهٔ خالی است. */
export function toJalaliString(date, options = { year: 'numeric', month: 'long', day: 'numeric' }) {
  const value = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(value.valueOf())) return '';
  return new Intl.DateTimeFormat('fa-IR-u-ca-persian', options).format(value);
}
