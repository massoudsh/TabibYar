// ارجاع هر بخش از پیش‌نویس به جملهٔ متن خام پزشک — ویژگی‌ای که رقبای بین‌المللی
// (Abridge و مشابه‌ها) با نام source-linking می‌شناسند: پزشک می‌بیند هر جمله از کجا آمده
// و لازم نیست کل متن خام را دوباره بخواند.
//
// روش عمداً ساده و قابل‌پیش‌بینی است (بدون embedding): جمله‌های متن خام جدا می‌شوند و
// برای هر بخش، جمله‌ای با بیشترین هم‌پوشانی واژگانی انتخاب می‌شود. آستانهٔ حداقل هم‌پوشانی
// جلوی ارجاع بی‌ربط را می‌گیرد؛ اگر چیزی پیدا نشد، آن بخش بدون منبع می‌ماند (بهتر از ارجاع اشتباه).

const MIN_SCORE = 2;

export const EVIDENCE_SECTIONS = ['history', 'findings', 'treatment_plan', 'patient_summary'];

const STOPWORDS = new Set([
  'از', 'به', 'با', 'که', 'در', 'را', 'و', 'این', 'آن', 'برای', 'تا', 'هم', 'یا',
  'است', 'بود', 'شد', 'شده', 'می', 'های', 'ها', 'یک', 'بر', 'روی', 'نه', 'اما',
]);

export function splitSentences(rawInput) {
  return String(rawInput || '')
    .split(/[.!?؟؛\n]+/g)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 4);
}

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[،.,؛;:()«»"'/\\-]/g, ' ')
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length >= 3 && !STOPWORDS.has(word));
}

function score(sectionTokens, sentenceTokens) {
  const sentenceSet = new Set(sentenceTokens);
  let hits = 0;
  for (const token of sectionTokens) if (sentenceSet.has(token)) hits += 1;
  return hits;
}

/**
 * برای هر بخش متنی پیش‌نویس، نزدیک‌ترین جملهٔ متن خام را پیدا می‌کند.
 * @param {{ rawInput?: string, note?: object }} input
 * @returns {Record<string, { quote: string, sentenceIndex: number, score: number }>}
 */
export function linkEvidence({ rawInput, note } = {}) {
  const sentences = splitSentences(rawInput);
  const sentenceTokens = sentences.map(tokenize);
  const evidence = {};

  for (const section of EVIDENCE_SECTIONS) {
    const sectionTokens = tokenize(note?.[section]);
    if (!sectionTokens.length) continue;

    let best = null;
    sentenceTokens.forEach((tokens, index) => {
      const value = score(sectionTokens, tokens);
      if (value >= MIN_SCORE && (!best || value > best.score)) {
        best = { quote: sentences[index], sentenceIndex: index, score: value };
      }
    });
    if (best) evidence[section] = best;
  }

  return evidence;
}
