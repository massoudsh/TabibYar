# طبیب‌یار — MVP سرور

پیاده‌سازی فاز اول طبق `docs/roadmap.md` و `docs/issues.md`. Node.js + Express + PostgreSQL،
بدون بیلد/باندلر (EJS سمت سرور) تا اجرا و دیپلوی ساده بماند.

## اجرا

```bash
cp .env.example .env   # مقداردهی DATABASE_URL, JWT_SECRET, ENCRYPTION_KEY
npm install
npm run migrate        # اجرای db/migrations/*.sql روی DATABASE_URL
npm run seed           # ساخت کلینیک/ادمین اولیه — ADMIN_PHONE=... ADMIN_PASSWORD=... npm run seed
npm start               # سرور وب روی PORT (پیش‌فرض 3000)
npm run worker          # در ترمینال جدا — worker صف پردازش ساخت‌دهی (ایشو #6)
```

## تست

```bash
npm test   # تست‌های واحد بدون نیاز به دیتابیس واقعی (mock providers)
```

## نگاشت ایشوها به کد

| ایشو | پیاده‌سازی |
|---|---|
| #1 پایپ‌لاین ساخت‌دهی | `src/services/structuring.js` + `src/services/queueWorker.js` |
| #2 انتخاب STT | `src/services/sttAdapter.js` (contract + mock) + `docs/research/stt-vendor-comparison.md` |
| #3 JSON Schema | `src/schemas/structuredNote.schema.json` |
| #4 پرامپت اختصاصی تخصص | `src/services/prompts.js` |
| #5 علامت‌گذاری موارد مبهم | `missing_or_ambiguous` در schema + نمایش برجسته در `views/visit-review.ejs` |
| #6 صف پردازش | `src/services/queue.js` + جدول `jobs` (migration 003) |
| #7 ورود خلاصهٔ ویزیت | `views/visit-new.ejs` + `POST /visits` |
| #8 بازبینی/ویرایش inline | `views/visit-review.ejs` + `public/js/review.js` |
| #9 احراز هویت پزشک | `src/lib/auth.js` + `src/routes/auth.routes.js` |
| #10 تاریخچهٔ ویزیت | `GET /patients/:id` در `patients.routes.js` |
| #11 خلاصهٔ تغییرات از ویزیت قبل | `src/services/followup.js` در صفحهٔ review |
| #12/#13 مدل داده/DDL | `src/db/migrations/001_init.sql` (از `docs/db/schema.sql`) |
| #14 رمزنگاری در حالت ذخیره | `src/lib/crypto.js` (AES-256-GCM روی `national_id_encrypted`) |
| #15 Audit Log | `src/lib/audit.js` — فراخوانی‌شده در همهٔ mutationهای حساس |
| #16/#18 ارسال پیامک خلاصه | `POST /visits/:id/send-sms` + `smsAdapter.buildPatientSummarySMS` |
| #17 انتخاب سرویس پیامک | `src/services/smsAdapter.js` (Kavenegar/Ippanel/mock) + `docs/research/sms-vendor-comparison.md` |
| #19 بررسی حقوقی محل نگهداری داده | `docs/research/legal-data-residency.md` |
| #20 رضایت صریح بیمار | `src/lib/disclaimers.js` (CONSENT_TEXT) + `views/patient-new.ejs` + ستون `consent_version` |
| #21 RBAC پایه | `src/middleware/rbac.js` + `src/routes/admin.routes.js` (نمونهٔ enforcement) |
| #22 Disclaimer الزامی | `src/lib/disclaimers.js` + `views/partials/disclaimer.ejs` |
| #23/#24 مقایسه/شکایت تکرارشونده | `src/services/followup.js` |
| #25 پایلوت | `src/db/seed.js` + `docs/research/pilot-recruitment-plan.md` |
| #26 معیارهای موفقیت | `docs/research/success-metrics.md` |
| #27 جمع‌آوری فیدبک | `docs/research/feedback-collection-plan.md` |
| #28 دستیار RAG | `src/services/rag/` (knowledgeStore + retriever + ragAgent) + `src/knowledge/*.md` + `POST /visits/:id/ask` |
| #29 بازآرایی پوشهٔ app/ | همین جدول + ساختار زیرپوشه‌ای `src/services/rag/` و `src/knowledge/` |
| #30 بهبود UI/UX | `views/partials/header.ejs` + `public/css/style.css` + `views/patients-list.ejs` |

## دستیار RAG (ایشو #28)

بعد از هر ساخت‌دهی موفق (`services/queueWorker.js`)، دستیار RAG پایگاه دانش داخلی
(`src/knowledge/*.md`) را با بازیابی کلیدواژه‌محور (`services/rag/retriever.js`) جست‌وجو
می‌کند و نکات یادآوری/مستندسازی مرتبط را در `clinical_notes.rag_insights` ذخیره می‌کند —
این نکات در صفحهٔ بازبینی ویزیت نمایش داده می‌شوند. علاوه‌بر آن، پزشک می‌تواند از طریق
`POST /visits/:id/ask` سؤال آزاد بپرسد؛ پاسخ همیشه مبتنی بر منبع است، هرگز تشخیص یا تجویز
نمی‌دهد (`REFUSAL_KEYWORDS` در `ragAgent.js`) و در Audit Log با `action='rag_query'` ثبت
می‌شود. برای افزودن سند جدید به پایگاه دانش، `src/knowledge/README.md` را ببینید.

## محدودیت‌های شناخته‌شده (نیازمند تصمیم/اقدام انسانی، نه کد)

- STT، LLM و SMS در حالت `mock` تنظیم شده‌اند چون به اعتبار/قرارداد سرویس واقعی نیاز دارند؛
  adapterها آماده‌اند و فقط با env vars سوییچ می‌شوند.
- بررسی حقوقی نهایی محل نگهداری داده (#19) نیازمند مشاور حقوقی واقعی است.
- انتخاب پزشکان پایلوت (#25) و جمع‌آوری فیدبک واقعی (#27) اقدام میدانی تیم محصول است.
