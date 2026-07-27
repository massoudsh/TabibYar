# طرح کلی API (فاز اول)

> سطح این طرح مفهومی است؛ جزئیات دقیق (status codeها، validation) در زمان پیاده‌سازی نهایی می‌شود.

## احراز هویت

```
POST /auth/login          → ورود پزشک
POST /auth/logout
```

## بیماران و ویزیت‌ها

```
GET    /patients                  → لیست بیماران کلینیک/پزشک
POST   /patients                  → ثبت بیمار جدید
GET    /patients/:id               → جزئیات + تاریخچهٔ ویزیت‌ها
GET    /patients/:id/last-visit-summary   → خلاصهٔ تغییرات از ویزیت قبلی (Follow-up Engine)

POST   /visits                    → شروع ویزیت جدید برای یک بیمار
GET    /visits/:id                → جزئیات ویزیت
```

## Ingestion و Structuring

```
POST /visits/:id/notes/ingest
  body: { type: "audio" | "text", content: <file|string> }
  → صف پردازش؛ برمی‌گرداند job_id

GET  /jobs/:job_id/status
  → { status: "processing" | "done" | "failed" }

GET  /visits/:id/notes/draft
  → پیش‌نویس AI ساختاریافته (ai_draft) برای بازبینی پزشک

PUT  /visits/:id/notes/approve
  body: { approved_content: {...} }
  → ثبت نسخهٔ نهایی تأییدشده؛ وضعیت ویزیت به approved تغییر می‌کند
```

## ارتباط با بیمار

```
POST /visits/:id/patient-summary/send
  body: { channel: "sms" }
  → فقط پس از approve مجاز است؛ نیازمند تأیید صریح پزشک در همان درخواست
```

## پیگیری

```
GET  /visits/:id/follow-up-items
PATCH /follow-up-items/:id        → تغییر وضعیت (pending/done)
```

## قاعدهٔ کلی طراحی API

هیچ endpointای نباید بتواند بدون عبور از مرحلهٔ `approve` محتوای AI را مستقیماً برای بیمار ارسال کند یا آن را به‌عنوان یادداشت رسمی پرونده ثبت کند.
