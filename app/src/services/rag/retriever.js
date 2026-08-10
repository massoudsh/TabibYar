// ایشو #28: بازیابی سادهٔ کلیدواژه‌محور روی پایگاه دانش داخلی.
// عمداً بدون وابستگی به سرویس embedding خارجی — قطعی (deterministic) و بدون نیاز
// به API key، تا هم در توسعه/تست و هم بدون اتصال به سرویس LLM واقعی کار کند.
import { loadKnowledgeChunks } from './knowledgeStore.js';

function tokenize(text) {
  return (text || '')
    .toLowerCase()
    .split(/[\s،.,؛;:()«»"'/\-]+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 2);
}

function scoreChunk(queryTokens, chunk) {
  const chunkTokens = tokenize(`${chunk.heading} ${chunk.text}`);
  if (!chunkTokens.length) return 0;
  const counts = new Map();
  for (const t of chunkTokens) counts.set(t, (counts.get(t) || 0) + 1);
  let score = 0;
  for (const qt of queryTokens) {
    if (counts.has(qt)) score += counts.get(qt);
  }
  // نرمال‌سازی سبک به طول chunk تا متن‌های خیلی بلند مصنوعاً امتیاز بالاتر نگیرند.
  return score / Math.sqrt(chunkTokens.length);
}

/**
 * @param {string} query متن جست‌وجو (خلاصهٔ پیش‌نویس ویزیت یا سؤال آزاد پزشک)
 * @param {{ specialty?: string, k?: number }} [opts]
 * @returns {{id:string, sourceFile:string, heading:string, text:string, score:number}[]}
 */
export function retrieve(query, { specialty, k = 3 } = {}) {
  const queryTokens = tokenize(query);
  if (!queryTokens.length) return [];

  const specialtySlug = specialty ? specialty.replace(/_/g, '-') : null;
  const chunks = loadKnowledgeChunks();

  return chunks
    .map((chunk) => {
      const base = scoreChunk(queryTokens, chunk);
      const boosted = specialtySlug && chunk.sourceFile.includes(specialtySlug) ? base * 1.3 : base;
      return { ...chunk, score: Number(boosted.toFixed(3)) };
    })
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}
