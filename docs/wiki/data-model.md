# مدل دادهٔ اصلی

> این مدل برای فاز اول ساده نگه داشته شده؛ روابط پیچیده‌تر (مثل گراف روند علائم) در فاز دو اضافه می‌شود.

## موجودیت‌ها

### `Clinic`
- `id`
- `name`
- `created_at`

### `Clinician` (پزشک)
- `id`
- `clinic_id` → Clinic
- `full_name`
- `specialty` (تخصص — برای انتخاب پرامپت مناسب)
- `phone` / `credentials`

### `Patient`
- `id`
- `clinic_id` → Clinic
- `full_name`
- `national_id` (اختیاری، رمزنگاری‌شده)
- `phone` (برای ارسال پیامک پیگیری)
- `consent_recorded_at` — تاریخ ثبت رضایت بیمار برای پردازش داده

### `Visit`
- `id`
- `patient_id` → Patient
- `clinician_id` → Clinician
- `visit_date`
- `status` (`draft` / `reviewed` / `approved`)

### `ClinicalNote`
هستهٔ اصلی محصول؛ سه نسخه از هر یادداشت نگه داشته می‌شود (برای Audit و مسئولیت پزشکی-قانونی):
- `id`
- `visit_id` → Visit
- `raw_input` — متن/رونوشت خام گفتهٔ پزشک
- `ai_draft` — خروجی ساختاریافتهٔ AI (JSON) پیش از بازبینی
- `approved_content` — نسخهٔ نهایی تأییدشده توسط پزشک (JSON)
- `approved_at`, `approved_by`

ساختار داخلی `approved_content` (بخش‌های اصلی):
```json
{
  "history": "...",
  "findings": "...",
  "differential_diagnosis_draft": ["...", "..."],
  "treatment_plan": "...",
  "patient_summary": "...",
  "warnings": ["..."],
  "follow_up": ["..."]
}
```

### `Medication`
- `id`
- `visit_id` → Visit
- `name`, `dosage`, `instructions`

### `FollowUpItem`
- `id`
- `visit_id` → Visit
- `description`
- `due_date` (اختیاری)
- `status` (`pending` / `done`)

### `Alert`
- `id`
- `visit_id` → Visit
- `description` (هشداری که بیمار باید بداند)

### `AuditLog`
- `id`
- `entity_type`, `entity_id`
- `action` (`created` / `edited` / `approved` / `sent_to_patient`)
- `actor_id` (چه‌کسی)
- `timestamp`

## روابط کلیدی

```
Clinic 1───* Clinician
Clinic 1───* Patient
Patient 1───* Visit
Clinician 1───* Visit
Visit 1───1 ClinicalNote
Visit 1───* Medication
Visit 1───* FollowUpItem
Visit 1───* Alert
(همه) *───* AuditLog
```
