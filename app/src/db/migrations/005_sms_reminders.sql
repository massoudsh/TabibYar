ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS available_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_jobs_pending_available
  ON jobs (available_at, created_at)
  WHERE status = 'pending';

CREATE TABLE sms_reminders (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follow_up_id    UUID NOT NULL REFERENCES follow_up_items(id) ON DELETE CASCADE,
    scheduled_for   TIMESTAMPTZ NOT NULL,
    message         TEXT NOT NULL CHECK (char_length(message) BETWEEN 1 AND 480),
    status          TEXT NOT NULL DEFAULT 'scheduled'
                    CHECK (status IN ('scheduled', 'sending', 'sent', 'cancelled')),
    sent_at         TIMESTAMPTZ,
    created_by      UUID NOT NULL REFERENCES clinicians(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sms_reminders_due ON sms_reminders (status, scheduled_for);
