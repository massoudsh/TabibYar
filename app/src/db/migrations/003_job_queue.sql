-- ایشو #6: صف پردازش ناهمزمان برای درخواست‌های ساعات شلوغ.
-- به‌جای وابستگی به سرویس خارجی (Redis/RabbitMQ) که در فاز اول لزوماً موجود نیست،
-- یک صف سبک مبتنی بر جدول ساخته می‌شود؛ در فاز بعد قابل مهاجرت به Redis Queue است
-- بدون تغییر contract سرویس (services/queue.js).

CREATE TABLE IF NOT EXISTS jobs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type            TEXT NOT NULL, -- مثال: 'structure_visit'
    payload         JSONB NOT NULL,
    status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'processing', 'done', 'failed')),
    attempts        INT NOT NULL DEFAULT 0,
    last_error      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_jobs_status_created ON jobs(status, created_at);
