-- CORE PLATFORM MIGRATION 001
-- Provider-neutral PostgreSQL baseline
-- Status: foundation migration; not yet applied to production.

BEGIN;

CREATE TABLE IF NOT EXISTS app_user (
  id uuid PRIMARY KEY,
  email text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE','PENDING','SUSPENDED','DELETED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_role (
  user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  role text NOT NULL
    CHECK (role IN ('STUDENT','PARENT','TEACHER','CONSULTANT','RESEARCHER','EDITOR','ADMIN','SUPER_ADMIN')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role)
);

CREATE TABLE IF NOT EXISTS profile (
  user_id uuid PRIMARY KEY REFERENCES app_user(id) ON DELETE CASCADE,
  display_name text,
  preferred_language text NOT NULL DEFAULT 'fa'
    CHECK (preferred_language IN ('fa','en')),
  timezone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS consent_record (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES app_user(id) ON DELETE SET NULL,
  consent_type text NOT NULL
    CHECK (consent_type IN ('PRIVACY','SERVICE','RESEARCH','PUBLICATION','MARKETING')),
  policy_version text NOT NULL,
  decision text NOT NULL
    CHECK (decision IN ('GRANTED','DECLINED','WITHDRAWN')),
  decided_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS consultation_request (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES app_user(id) ON DELETE SET NULL,
  contact_email text NOT NULL,
  contact_name text,
  preferred_language text NOT NULL
    CHECK (preferred_language IN ('fa','en')),
  service_type text NOT NULL
    CHECK (service_type IN (
      'ACADEMIC_COUNSELLING',
      'FIELD_SELECTION',
      'ENTRANCE_EXAM',
      'TALENT_IDENTIFICATION',
      'REPORT_CARD_ANALYSIS',
      'PARENT_COUNSELLING'
    )),
  education_stage text NOT NULL,
  primary_question text NOT NULL,
  relevant_deadline date,
  document_availability jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'SUBMITTED'
    CHECK (status IN (
      'DRAFT','SUBMITTED','TRIAGED','AWAITING_BOOKING','BOOKED',
      'AWAITING_PAYMENT','CONFIRMED','COMPLETED','FOLLOW_UP',
      'CLOSED','CANCELLED','NO_SHOW','DECLINED','REFUNDED'
    )),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS consultation_request_status_idx
  ON consultation_request(status);

CREATE INDEX IF NOT EXISTS consultation_request_created_at_idx
  ON consultation_request(created_at DESC);

CREATE TABLE IF NOT EXISTS consultation_triage (
  id uuid PRIMARY KEY,
  consultation_request_id uuid NOT NULL UNIQUE
    REFERENCES consultation_request(id) ON DELETE CASCADE,
  assigned_consultant_user_id uuid
    REFERENCES app_user(id) ON DELETE SET NULL,
  recommended_service_type text,
  session_length_minutes integer
    CHECK (session_length_minutes IS NULL OR session_length_minutes BETWEEN 15 AND 240),
  assessment_needed boolean NOT NULL DEFAULT false,
  parent_attendance_recommended boolean,
  payment_required boolean NOT NULL DEFAULT false,
  preparation_notes text,
  triaged_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS appointment (
  id uuid PRIMARY KEY,
  consultation_request_id uuid NOT NULL
    REFERENCES consultation_request(id) ON DELETE CASCADE,
  consultant_user_id uuid
    REFERENCES app_user(id) ON DELETE SET NULL,
  starts_at timestamptz NOT NULL,
  timezone text NOT NULL,
  status text NOT NULL DEFAULT 'BOOKED'
    CHECK (status IN ('BOOKED','AWAITING_PAYMENT','CONFIRMED','CANCELLED','COMPLETED','NO_SHOW')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS appointment_starts_at_idx
  ON appointment(starts_at);

CREATE TABLE IF NOT EXISTS consultation_case (
  id uuid PRIMARY KEY,
  consultation_request_id uuid NOT NULL UNIQUE
    REFERENCES consultation_request(id) ON DELETE CASCADE,
  student_user_id uuid REFERENCES app_user(id) ON DELETE SET NULL,
  primary_consultant_user_id uuid REFERENCES app_user(id) ON DELETE SET NULL,
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  status text NOT NULL DEFAULT 'OPEN'
    CHECK (status IN ('OPEN','FOLLOW_UP','CLOSED'))
);

CREATE TABLE IF NOT EXISTS consultation_note (
  id uuid PRIMARY KEY,
  consultation_case_id uuid NOT NULL
    REFERENCES consultation_case(id) ON DELETE CASCADE,
  author_user_id uuid NOT NULL
    REFERENCES app_user(id) ON DELETE RESTRICT,
  note_type text NOT NULL
    CHECK (note_type IN ('SESSION_NOTE','EVIDENCE_NOTE','RECOMMENDATION','FOLLOW_UP')),
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS consultation_recommendation (
  id uuid PRIMARY KEY,
  consultation_case_id uuid NOT NULL
    REFERENCES consultation_case(id) ON DELETE CASCADE,
  author_user_id uuid NOT NULL
    REFERENCES app_user(id) ON DELETE RESTRICT,
  recommendation text NOT NULL,
  priority text
    CHECK (priority IS NULL OR priority IN ('LOW','MEDIUM','HIGH')),
  due_date date,
  status text NOT NULL DEFAULT 'OPEN'
    CHECK (status IN ('OPEN','COMPLETED','CANCELLED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_event (
  id uuid PRIMARY KEY,
  actor_user_id uuid REFERENCES app_user(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid,
  request_id text,
  ip_hash text,
  user_agent_summary text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_event_resource_idx
  ON audit_event(resource_type, resource_id);

CREATE INDEX IF NOT EXISTS audit_event_created_at_idx
  ON audit_event(created_at DESC);

COMMIT;
