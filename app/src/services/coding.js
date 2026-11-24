// پیش‌نویس کدگذاری: پیشنهاد کدهای ICD-10 بر اساس واژه‌های مستندشده در یادداشت.
// این یک «کمک مستندسازی» است، نه کد نهایی صورت‌حساب و نه تشخیص قطعی؛ هر پیشنهاد با
// دلیل و متن منبع نمایش داده می‌شود و پزشک باید خودش تأیید/اصلاح کند.
//
// نگاشت عمداً کوچک و شفاف است (نه مدل زبانی) تا خروجی قابل پیش‌بینی و قابل بازبینی باشد
// و هیچ‌گاه کدی که در متن ذکر نشده تولید نشود.
import { normalizeDigits } from '../lib/locale.js';

/** @typedef {{ code: string, label: string, keywords: string[], mustMatch?: 'any' }} CodingRule */

/** @type {CodingRule[]} */
const RULES = [
  { code: 'E11.9', label: 'دیابت نوع ۲ بدون عارضه', keywords: ['دیابت', 'متفورمین', 'قند ناشتا', 'hba1c'] },
  { code: 'E11.4', label: 'دیابت نوع ۲ با عارضهٔ عصبی', keywords: ['نوروپاتی', 'بی‌حسی', 'گزگز'] },
  { code: 'I10', label: 'فشار خون بالا (اولیه)', keywords: ['فشار خون', 'لوزارتان', 'آملودیپین'] },
  { code: 'E78.5', label: 'اختلال چربی خون، نامشخص', keywords: ['چربی', 'ldl', 'تری‌گلیسرید', 'کلسترول', 'آتورواستاتین'] },
  { code: 'E03.9', label: 'کم‌کاری تیروئید، نامشخص', keywords: ['tsh', 'تیروئید', 'لووتیروکسین'] },
  { code: 'D50.9', label: 'کم‌خونی فقر آهن، نامشخص', keywords: ['فریتین', 'هموگلوبین', 'کم‌خونی', 'آهن'] },
  { code: 'J45.9', label: 'آسم، نامشخص', keywords: ['آسم', 'سالبوتامول', 'خس‌خس', 'اسپیرومتری'] },
  { code: 'J44.9', label: 'بیماری انسدادی مزمن ریه، نامشخص', keywords: ['copd', 'تیوتروپیوم', 'اسپیرومتری', 'سیگار'] },
  { code: 'K21.9', label: 'بیماری ریفلاکس معده به مری بدون ازوفاژیت', keywords: ['ریفلاکس', 'سوزش سر دل', 'امپرازول'] },
  { code: 'G43.9', label: 'میگرن، نامشخص', keywords: ['میگرن', 'سوماتریپتان', 'سردرد ضربان'] },
  { code: 'M17.9', label: 'استئوآرتریت زانو، نامشخص', keywords: ['زانو', 'استئوآرتریت', 'ساییدگی مفصل'] },
  { code: 'M10.9', label: 'نقرس، نامشخص', keywords: ['نقرس', 'اسید اوریک', 'کولشیسین'] },
  { code: 'L20.9', label: 'درماتیت آتوپیک، نامشخص', keywords: ['اگزما', 'درماتیت', 'خارش', 'پوسته‌ریزی'] },
  { code: 'L40.9', label: 'پسوریازیس، نامشخص', keywords: ['پسوریازیس', 'پلاک', 'پوسته نقره‌ای'] },
  { code: 'L70.0', label: 'آکنهٔ ولگاریس', keywords: ['آکنه', 'جوش', 'پوسچول', 'بنزوئیل'] },
  { code: 'L50.9', label: 'کهیر، نامشخص', keywords: ['کهیر', 'لوراتادین', 'خارش شب'] },
  { code: 'L80', label: 'ویتیلیگو', keywords: ['ویتیلیگو', 'هیپوپیگمانته', 'لکه‌های سفید', 'تاکرولیموس'] },
  { code: 'I50.9', label: 'نارسایی قلبی، نامشخص', keywords: ['نارسایی قلبی', 'فوروزماید', 'ادم پا', 'ef'] },
];

/** بخش‌هایی از یادداشت که برای تطبیق بررسی می‌شوند. */
const SEARCHED_SECTIONS = ['history', 'findings', 'differential_diagnosis_draft', 'treatment_plan', 'patient_summary'];

function noteText(note) {
  const parts = [];
  for (const section of SEARCHED_SECTIONS) {
    const value = note?.[section];
    if (Array.isArray(value)) parts.push(value.join(' '));
    else if (typeof value === 'string') parts.push(value);
  }
  for (const medication of note?.medications || []) parts.push(medication?.name || '');
  return normalizeDigits(parts.join(' ')).toLowerCase();
}

/**
 * @param {object} note پیش‌نویس یا نسخهٔ تأییدشدهٔ ساختاریافته
 * @param {{ limit?: number }} [options]
 * @returns {{ code: string, label: string, matched: string[] }[]}
 */
export function suggestCodes(note, { limit = 4 } = {}) {
  const text = noteText(note);
  if (!text.trim()) return [];

  return RULES
    .map((rule) => {
      const matched = rule.keywords.filter((keyword) => text.includes(normalizeDigits(keyword).toLowerCase()));
      return { code: rule.code, label: rule.label, matched };
    })
    .filter((suggestion) => suggestion.matched.length > 0)
    // بیشترین تطبیق اول؛ در تساوی، ترتیب ثابت فهرست حفظ می‌شود (خروجی قطعی).
    .sort((a, b) => b.matched.length - a.matched.length)
    .slice(0, limit);
}
