-- CORE PLATFORM MIGRATION 007
-- Service catalogue, consultant eligibility and booking availability
-- Provider-neutral PostgreSQL baseline; not yet applied to production.

BEGIN;

CREATE TABLE IF NOT EXISTS service_definition (
  id uuid PRIMARY KEY,
  service_code text NOT NULL UNIQUE,
  title_fa text NOT NULL,
  title_en text,
  description_fa text,
  description_en text,
  default_duration_minutes integer NOT NULL
    CHECK (default_duration_minutes BETWEEN 15 AND 240),
  booking_mode text NOT NULL DEFAULT 'TRIAGE_REQUIRED'
    CHECK (booking_mode IN ('TRIAGE_REQUIRED','DIRECT_BOOKING','MANUAL_ONLY')),
  payment_timing text NOT NULL DEFAULT 'AFTER_TRIAGE'
    CHECK (payment_timing IN ('NONE','BEFORE_BOOKING','AFTER_TRIAGE','BEFORE_SESSION')),
  product_id uuid REFERENCES product(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT','ACTIVE','PAUSED','RETIRED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS consultant_service (
  consultant_user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  service_definition_id uuid NOT NULL REFERENCES service_definition(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE','PAUSED','ENDED')),
  default_duration_minutes integer
    CHECK (default_duration_minutes IS NULL OR default_duration_minutes BETWEEN 15 AND 240),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (consultant_user_id, service_definition_id)
);

CREATE TABLE IF NOT EXISTS availability_rule (
  id uuid PRIMARY KEY,
  consultant_user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  service_definition_id uuid REFERENCES service_definition(id) ON DELETE CASCADE,
  timezone text NOT NULL,
  weekday smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  local_start_time time NOT NULL,
  local_end_time time NOT NULL,
  slot_minutes integer NOT NULL CHECK (slot_minutes BETWEEN 15 AND 240),
  buffer_before_minutes integer NOT NULL DEFAULT 0 CHECK (buffer_before_minutes BETWEEN 0 AND 120),
  buffer_after_minutes integer NOT NULL DEFAULT 0 CHECK (buffer_after_minutes BETWEEN 0 AND 120),
  valid_from date NOT NULL DEFAULT CURRENT_DATE,
  valid_until date,
  status text NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE','PAUSED','ENDED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (local_end_time > local_start_time),
  CHECK (valid_until IS NULL OR valid_until >= valid_from)
);

CREATE INDEX IF NOT EXISTS availability_rule_consultant_idx
  ON availability_rule(consultant_user_id, weekday, status);

CREATE TABLE IF NOT EXISTS availability_exception (
  id uuid PRIMARY KEY,
  consultant_user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  exception_type text NOT NULL
    CHECK (exception_type IN ('UNAVAILABLE','CUSTOM_AVAILABLE')),
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS availability_exception_time_idx
  ON availability_exception(consultant_user_id, starts_at, ends_at);

ALTER TABLE appointment
  ADD COLUMN IF NOT EXISTS service_definition_id uuid
  REFERENCES service_definition(id) ON DELETE SET NULL;

ALTER TABLE appointment
  ADD COLUMN IF NOT EXISTS ends_at timestamptz;

ALTER TABLE appointment
  ADD COLUMN IF NOT EXISTS reschedule_count integer NOT NULL DEFAULT 0
  CHECK (reschedule_count >= 0);

ALTER TABLE appointment
  ADD COLUMN IF NOT EXISTS cancellation_reason text;

CREATE TABLE IF NOT EXISTS appointment_status_event (
  id uuid PRIMARY KEY,
  appointment_id uuid NOT NULL REFERENCES appointment(id) ON DELETE CASCADE,
  previous_status text,
  new_status text NOT NULL,
  changed_by uuid REFERENCES app_user(id) ON DELETE SET NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS appointment_status_event_idx
  ON appointment_status_event(appointment_id, created_at);

COMMIT;
