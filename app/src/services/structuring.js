// ایشو #1 (epic): پایپ‌لاین تبدیل خلاصهٔ صوتی/متنی پزشک به JSON ساختاریافته.
// ایشو #3: اعتبارسنجی خروجی مطابق JSON Schema.
// ایشو #5: اگر missing_or_ambiguous غیرخالی بود، در سطح بالاتر (routes/visits) به پزشک
//          برجسته نمایش داده می‌شود؛ اینجا فقط تضمین می‌کنیم فیلد همیشه معتبر برگردد.
import Ajv from 'ajv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSystemPrompt, buildUserPrompt } from './prompts.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schema = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../schemas/structuredNote.schema.json'), 'utf8')
);

const ajv = new Ajv({ allErrors: true });
const validate = ajv.compile(schema);

export class StructuringValidationError extends Error {
  constructor(errors) {
    super('خروجی مدل مطابق JSON Schema نیست');
    this.name = 'StructuringValidationError';
    this.errors = errors;
  }
}

/**
 * پیاده‌سازی توسعه/تست: بدون فراخوانی واقعی LLM، خروجی حداقلی معتبر با
 * missing_or_ambiguous پر می‌سازد تا کل پایپ‌لاین (validate → save draft → review UI)
 * قابل تست باشد. در production با MODEL_PROVIDER=openai (یا معادل) جایگزین می‌شود.
 */
async function mockCompletion({ rawInput }) {
  return {
    history: rawInput.slice(0, 500),
    findings: '',
    differential_diagnosis_draft: [],
    treatment_plan: '',
    medications: [],
    patient_summary: '',
    warnings: [],
    follow_up: [],
    missing_or_ambiguous: [
      'این خروجی توسط MOCK_MODEL_PROVIDER ساخته شده و نیازمند تکمیل دستی توسط پزشک است.',
    ],
    parse_error: false,
  };
}

async function openAICompatibleCompletion({ systemPrompt, userPrompt }) {
  const apiUrl = process.env.LLM_API_URL || 'https://api.openai.com/v1/chat/completions';
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) throw new Error('LLM_API_KEY تنظیم نشده.');

  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.LLM_MODEL || 'gpt-4o-mini',
      temperature: 0, // طبق docs/prompts/structuring-prompt.md بخش ۷
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  });
  if (!res.ok) {
    throw new Error(`LLM provider خطا داد: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('پاسخ مدل خالی بود');
  return JSON.parse(content);
}

/**
 * @param {{ specialty: string, rawInput: string, previousVisitSummary?: string }} input
 * @returns {Promise<object>} خروجی معتبر مطابق structuredNote.schema.json
 */
export async function structureVisit({ specialty, rawInput, previousVisitSummary }) {
  if (!rawInput || !rawInput.trim()) {
    throw new Error('rawInput خالی است — چیزی برای ساخت‌دهی وجود ندارد');
  }

  const provider = process.env.MODEL_PROVIDER || 'mock';
  let raw;
  if (provider === 'mock') {
    raw = await mockCompletion({ rawInput });
  } else if (provider === 'openai') {
    const systemPrompt = buildSystemPrompt(specialty);
    const userPrompt = buildUserPrompt({ rawInput, previousVisitSummary });
    raw = await openAICompatibleCompletion({ systemPrompt, userPrompt });
  } else {
    throw new Error(`MODEL_PROVIDER ناشناخته: ${provider}`);
  }

  const valid = validate(raw);
  if (!valid) {
    throw new StructuringValidationError(validate.errors);
  }
  return raw;
}

export function validateStructuredNote(candidate) {
  const valid = validate(candidate);
  return { valid, errors: valid ? [] : validate.errors };
}
