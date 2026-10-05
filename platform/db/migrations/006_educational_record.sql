-- CORE PLATFORM MIGRATION 006
-- Educational record, academic history, observations and development timeline
-- Provider-neutral PostgreSQL baseline; not yet applied to production.

BEGIN;

CREATE TABLE IF NOT EXISTS institution (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  institution_type text
    CHECK (institution_type IS NULL OR institution_type IN ('SCHOOL','UNIVERSITY','INSTITUTE','OTHER')),
  country_code char(2),
  city text,
  external_reference text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS educational_record (
  id uuid PRIMARY KEY,
  student_user_id uuid NOT NULL UNIQUE REFERENCES app_user(id) ON DELETE CASCADE,
  current_stage text,
  current_institution_id uuid REFERENCES institution(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE','ARCHIVED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS academic_history (
  id uuid PRIMARY KEY,
  educational_record_id uuid NOT NULL REFERENCES educational_record(id) ON DELETE CASCADE,
  institution_id uuid REFERENCES institution(id) ON DELETE SET NULL,
  stage_or_program text NOT NULL,
  start_date date,
  end_date date,
  status text
    CHECK (status IS NULL OR status IN ('CURRENT','COMPLETED','INTERRUPTED','TRANSFERRED','OTHER')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS grade_record (
  id uuid PRIMARY KEY,
  educational_record_id uuid NOT NULL REFERENCES educational_record(id) ON DELETE CASCADE,
  academic_history_id uuid REFERENCES academic_history(id) ON DELETE SET NULL,
  subject_code text,
  subject_name text NOT NULL,
  assessment_label text,
  raw_value numeric,
  raw_scale_min numeric,
  raw_scale_max numeric,
  grade_text text,
  recorded_date date,
  source_type text NOT NULL DEFAULT 'USER_ENTERED'
    CHECK (source_type IN ('USER_ENTERED','DOCUMENT_VERIFIED','INSTITUTION_IMPORT','CONSULTANT_ENTERED')),
  source_document_id uuid REFERENCES private_document(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS grade_record_student_date_idx
  ON grade_record(educational_record_id, recorded_date DESC);

CREATE TABLE IF NOT EXISTS educational_goal (
  id uuid PRIMARY KEY,
  educational_record_id uuid NOT NULL REFERENCES educational_record(id) ON DELETE CASCADE,
  goal_type text NOT NULL
    CHECK (goal_type IN ('SHORT_TERM','MEDIUM_TERM','LONG_TERM','FIELD_SELECTION','EXAM','SKILL','OTHER')),
  title text NOT NULL,
  description text,
  target_date date,
  status text NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE','COMPLETED','PAUSED','CANCELLED')),
  created_by uuid REFERENCES app_user(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS interest_record (
  id uuid PRIMARY KEY,
  educational_record_id uuid NOT NULL REFERENCES educational_record(id) ON DELETE CASCADE,
  interest_key text NOT NULL,
  interest_label text NOT NULL,
  strength smallint CHECK (strength IS NULL OR strength BETWEEN 1 AND 5),
  evidence_note text,
  source_type text NOT NULL
    CHECK (source_type IN ('STUDENT_SELF','PARENT','TEACHER','CONSULTANT','ASSESSMENT')),
  observed_at date,
  created_at timestamptz NOT NULL DEFAULT now()
);


CREATE TABLE IF NOT EXISTS educational_observation (
  id uuid PRIMARY KEY,
  educational_record_id uuid NOT NULL REFERENCES educational_record(id) ON DELETE CASCADE,
  observer_user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE RESTRICT,
  observer_role text NOT NULL
    CHECK (observer_role IN ('STUDENT','PARENT','TEACHER','CONSULTANT')),
  observation_type text NOT NULL
    CHECK (observation_type IN ('LEARNING','ENGAGEMENT','PERSISTENCE','INTEREST','PERFORMANCE','CONTEXT','OTHER')),
  observation_text text NOT NULL,
  context_label text,
  observed_at timestamptz,
  visibility_scope text NOT NULL DEFAULT 'PRIVATE_TEAM'
    CHECK (visibility_scope IN ('SUBJECT_VISIBLE','PARENT_VISIBLE','TEACHER_VISIBLE','CONSULTANT_ONLY','PRIVATE_TEAM')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS educational_observation_record_idx
  ON educational_observation(educational_record_id, observed_at DESC);

CREATE TABLE IF NOT EXISTS educational_recommendation (
  id uuid PRIMARY KEY,
  educational_record_id uuid NOT NULL REFERENCES educational_record(id) ON DELETE CASCADE,
  consultation_case_id uuid REFERENCES consultation_case(id) ON DELETE SET NULL,
  report_id uuid REFERENCES report(id) ON DELETE SET NULL,
  author_user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE RESTRICT,
  recommendation_type text NOT NULL
    CHECK (recommendation_type IN ('LEARNING','FIELD_SELECTION','ASSESSMENT','EXPERIENCE','PARENT_SUPPORT','TEACHER_SUPPORT','OTHER')),
  recommendation_text text NOT NULL,
  rationale text,
  status text NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE','COMPLETED','SUPERSEDED','CANCELLED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS development_event (
  id uuid PRIMARY KEY,
  educational_record_id uuid NOT NULL REFERENCES educational_record(id) ON DELETE CASCADE,
  event_type text NOT NULL
    CHECK (event_type IN ('GOAL_CREATED','GOAL_COMPLETED','ASSESSMENT_COMPLETED','REPORT_READY','CONSULTATION_COMPLETED','RECOMMENDATION_CREATED','DOCUMENT_ADDED','PATH_UPDATED','OTHER')),
  source_resource_type text,
  source_resource_id uuid,
  event_summary text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS development_event_timeline_idx
  ON development_event(educational_record_id, occurred_at DESC);

COMMIT;
