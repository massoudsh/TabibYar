// ایشو #28: دستیار RAG — بازیابی از پایگاه دانش داخلی (src/knowledge/) + تولید پاسخ
// مبتنی بر منابع بازیابی‌شده. همان قرارداد MODEL_PROVIDER=mock|openai سرویس ساخت‌دهی
// (services/structuring.js) را بازاستفاده می‌کند تا بدون کلید API واقعی هم قابل
// اجرا/تست باشد.
//
// مرز محصول (docs/architecture.md): این دستیار هرگز تشخیص قطعی نمی‌دهد و دارو/دوز
// تجویز نمی‌کند؛ فقط یادآوری مستندسازی/پیگیری مبتنی بر منبع ارائه می‌دهد.
import { retrieve } from './retriever.js';

const REFUSAL_KEYWORDS = ['تشخیص بده', 'چی دارم', 'دارو تجویز کن', 'چی بخورم', 'درمانم چیه', 'چه دارویی بدم'];

const GROUNDED_SYSTEM_PROMPT = `تو دستیار مستندسازی بالینی طبیب‌یار هستی. فقط بر اساس متن‌های «منبع» زیر
پاسخ بده؛ هرگز تشخیص قطعی نده یا دارو/دوز تجویز نکن، فقط یادآوری/نکتهٔ مستندسازی یا پیگیری ارائه بده.
اگر پاسخ در منابع نبود، صریح بگو اطلاعات کافی در پایگاه دانش نیست. پاسخ کوتاه و به فارسی باشد.`;

function buildQueryFromNote(structuredNote) {
  return [
    structuredNote?.history,
    structuredNote?.findings,
    (structuredNote?.medications || []).map((m) => m.name).join(' '),
    (structuredNote?.warnings || []).join(' '),
  ]
    .filter(Boolean)
    .join(' ');
}

function looksLikeDiagnosisRequest(question) {
  const q = (question || '').toLowerCase();
  return REFUSAL_KEYWORDS.some((k) => q.includes(k));
}

async function mockGenerate({ sources }) {
  if (!sources.length) {
    return (
      'اطلاعات مرتبطی در پایگاه دانش داخلی پیدا نشد. این پاسخ صرفاً یادآوری مستندسازی است، ' +
      'نه تشخیص یا تجویز.'
    );
  }
  const top = sources[0];
  const snippet = top.text.length > 220 ? `${top.text.slice(0, 220)}…` : top.text;
  return (
    `بر اساس «${top.heading}» (${top.sourceFile}): ${snippet}\n\n` +
    'این یک یادآوری مبتنی بر پایگاه دانش است، نه تشخیص یا تجویز قطعی — تصمیم نهایی با پزشک است.'
  );
}

async function openAICompatibleGenerate({ question, sources }) {
  const apiUrl = process.env.LLM_API_URL || 'https://api.openai.com/v1/chat/completions';
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) throw new Error('LLM_API_KEY تنظیم نشده.');

  const sourcesText = sources
    .map((s, i) => `[منبع ${i + 1}] (${s.sourceFile} — ${s.heading})\n${s.text}`)
    .join('\n\n');

  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.LLM_MODEL || 'gpt-4o-mini',
      temperature: 0,
      messages: [
        { role: 'system', content: GROUNDED_SYSTEM_PROMPT },
        { role: 'user', content: `منابع:\n${sourcesText || '(چیزی بازیابی نشد)'}\n\nسؤال پزشک: ${question}` },
      ],
    }),
  });
  if (!res.ok) {
    throw new Error(`LLM provider خطا داد: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || 'پاسخی از مدل دریافت نشد.';
}

async function generate(args) {
  const provider = process.env.MODEL_PROVIDER || 'mock';
  if (provider === 'mock') return mockGenerate(args);
  if (provider === 'openai') return openAICompatibleGenerate(args);
  throw new Error(`MODEL_PROVIDER ناشناخته: ${provider}`);
}

/**
 * نکات خودکار مرتبط با پیش‌نویس ساخت‌دهی‌شده — بعد از هر ساخت‌دهی موفق در
 * services/queueWorker.js اجرا و در clinical_notes.rag_insights ذخیره می‌شود.
 * @param {{ specialty: string, structuredNote: object }} input
 */
export async function getGroundedInsights({ specialty, structuredNote }) {
  const query = buildQueryFromNote(structuredNote);
  if (!query.trim()) return { insights: [], generatedAt: new Date().toISOString() };

  const sources = retrieve(query, { specialty, k: 3 });
  const insights = sources.map((s) => ({
    sourceFile: s.sourceFile,
    sourceHeading: s.heading,
    note: s.text.length > 280 ? `${s.text.slice(0, 280)}…` : s.text,
  }));
  return { insights, generatedAt: new Date().toISOString() };
}

/**
 * پرسش‌وپاسخ تعاملی پزشک روی پایگاه دانش داخلی (route: POST /visits/:id/ask).
 * @param {{ specialty: string, question: string }} input
 */
export async function answerQuestion({ specialty, question }) {
  if (!question || !question.trim()) {
    throw new Error('question خالی است');
  }
  if (looksLikeDiagnosisRequest(question)) {
    return {
      answer:
        'این دستیار فقط برای مستندسازی و یادآوری است و تشخیص نمی‌دهد یا دارو تجویز نمی‌کند؛ ' +
        'لطفاً تصمیم بالینی نهایی را بر اساس قضاوت خودتان بگیرید.',
      sources: [],
      refused: true,
    };
  }
  const sources = retrieve(question, { specialty, k: 3 });
  const answer = await generate({ question, sources });
  return {
    answer,
    sources: sources.map((s) => ({ sourceFile: s.sourceFile, heading: s.heading })),
    refused: false,
  };
}
