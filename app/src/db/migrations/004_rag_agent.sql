-- ایشو #28: دستیار RAG — ذخیرهٔ نکات خودکار مرتبط از پایگاه دانش کنار هر ویزیت،
-- و افزودن action='rag_query' به audit_logs برای ثبت پرسش‌های پزشک از دستیار.

ALTER TABLE clinical_notes
    ADD COLUMN IF NOT EXISTS rag_insights JSONB;

COMMENT ON COLUMN clinical_notes.rag_insights IS
    'خروجی دستیار RAG (services/rag/ragAgent.js) — نکات یادآوری/مستندسازی مبتنی بر '
    'پایگاه دانش داخلی، همراه با ارجاع به منبع؛ هرگز تشخیص یا تجویز نیست.';

ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_action_check;
ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_action_check
    CHECK (action IN ('created', 'edited', 'approved', 'sent_to_patient', 'viewed', 'rag_query'));
