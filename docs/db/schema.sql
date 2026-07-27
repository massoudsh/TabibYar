-- طبیب‌یار — اسکیمای پایگاه‌دادهٔ فاز اول (PostgreSQL 14+)
-- مطابق با docs/wiki/data-model.md
-- نکته: نام تخصص و enumها قابل گسترش‌اند؛ برای فاز اول به‌صورت TEXT با CHECK نگه داشته شده
--       تا افزودن تخصص/وضعیت جدید نیاز به migration نوع (type) نداشته باشد.

CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- برای gen_random_uuid()

-- ==========================================================
-- Clinic
-- ==========================================================
CREATE TABLE clinics (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==========================================================
-- Clinician (پزشک)
-- ==========================================================
CREATE TABLE clinicians (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id       UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    full_name       TEXT NOT NULL,
    specialty       TEXT NOT NULL, -- مثال: 'internal_medicine', 'dermatology'
    phone           TEXT,
    role            TEXT NOT NULL DEFAULT 'physician'
                    CHECK (role IN ('physician', 'admin')),
    password_hash   TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_clinicians_clinic_id ON clinicians(clinic_id);

-- ==========================================================
-- Patient
-- ==========================================================
CREATE TABLE patients (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id               UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    full_name               TEXT NOT NULL,
    national_id_encrypted   BYTEA, -- رمزنگاری‌شده در لایهٔ اپلیکیشن، نه plain text
    phone                   TEXT NOT NULL,
    consent_recorded_at     TIMESTAMPTZ, -- null یعنی رضایت هنوز ثبت نشده
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_patients_clinic_id ON patients(clinic_id);
CREATE INDEX idx_patients_phone ON patients(phone);

-- ==========================================================
-- Visit
-- ==========================================================
CREATE TABLE visits (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id      UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
    clinician_id    UUID NOT NULL REFERENCES clinicians(id) ON DELETE RESTRICT,
    visit_date      TIMESTAMPTZ NOT NULL DEFAULT now(),
    status          TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'reviewed', 'approved')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_visits_patient_id ON visits(patient_id);
CREATE INDEX idx_visits_clinician_id ON visits(clinician_id);
CREATE INDEX idx_visits_visit_date ON visits(visit_date DESC);

-- ==========================================================
-- ClinicalNote — سه نسخه: خام / پیش‌نویس AI / تأییدشده
-- ==========================================================
CREATE TABLE clinical_notes (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visit_id            UUID NOT NULL UNIQUE REFERENCES visits(id) ON DELETE CASCADE,
    raw_input           TEXT,              -- رونوشت/متن خام گفتهٔ پزشک
    raw_input_audio_url TEXT,              -- لینک فایل صوتی در Object Storage (اختیاری)
    ai_draft            JSONB,             -- خروجی خام مدل، پیش از هرگونه ویرایش
    approved_content    JSONB,             -- نسخهٔ نهایی تأییدشدهٔ پزشک؛ مرجع رسمی پرونده
    approved_at         TIMESTAMPTZ,
    approved_by         UUID REFERENCES clinicians(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_clinical_notes_visit_id ON clinical_notes(visit_id);
-- برای جست‌وجوی معنایی بعدی داخل ai_draft/approved_content
CREATE INDEX idx_clinical_notes_approved_gin ON clinical_notes USING GIN (approved_content);

-- ==========================================================
-- Medication
-- ==========================================================
CREATE TABLE medications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visit_id        UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    dosage          TEXT,
    instructions    TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_medications_visit_id ON medications(visit_id);

-- ==========================================================
-- FollowUpItem
-- ==========================================================
CREATE TABLE follow_up_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visit_id        UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
    description     TEXT NOT NULL,
    due_date        DATE,
    status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'done')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_follow_up_items_visit_id ON follow_up_items(visit_id);
CREATE INDEX idx_follow_up_items_status ON follow_up_items(status);

-- ==========================================================
-- Alert
-- ==========================================================
CREATE TABLE alerts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visit_id        UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
    description     TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_alerts_visit_id ON alerts(visit_id);

-- ==========================================================
-- AuditLog — ردیابی تمام تغییرات حساس (الزام امنیتی/قانونی)
-- ==========================================================
CREATE TABLE audit_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type     TEXT NOT NULL, -- مثال: 'visit', 'clinical_note', 'patient'
    entity_id       UUID NOT NULL,
    action          TEXT NOT NULL
                    CHECK (action IN ('created', 'edited', 'approved', 'sent_to_patient', 'viewed')),
    actor_id        UUID REFERENCES clinicians(id),
    metadata        JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- ==========================================================
-- قاعدهٔ حیاتی سطح دیتابیس:
-- approved_content هرگز مستقیماً از سمت اپلیکیشن overwrite نمی‌شود مگر از طریق
-- مسیر Approve که هم‌زمان یک ردیف در audit_logs با action='approved' درج می‌کند.
-- این محدودیت در لایهٔ اپلیکیشن اعمال می‌شود؛ در صورت نیاز به تضمین سخت‌تر می‌توان
-- با یک trigger سطح DB نیز اجرای هم‌زمان INSERT INTO audit_logs را الزامی کرد.
-- ==========================================================
