-- ایشو #20: فرم رضایت صریح بیمار (نسخه‌بندی متن رضایت‌نامه)
-- ایشو #21: RBAC پایه — نقش‌ها از قبل در clinicians.role تعریف شده‌اند (physician/admin)؛
--           این migration فقط ردیابی نسخهٔ متن رضایت را اضافه می‌کند.

ALTER TABLE patients
    ADD COLUMN IF NOT EXISTS consent_version TEXT,
    ADD COLUMN IF NOT EXISTS consent_channel TEXT
        CHECK (consent_channel IN ('in_person', 'sms', 'verbal') OR consent_channel IS NULL);

COMMENT ON COLUMN patients.consent_version IS
    'نسخهٔ متن رضایت‌نامه‌ای که بیمار پذیرفته (مثلاً v1.0-fa)؛ برای اثبات حقوقی کدام متن نمایش داده شده.';
