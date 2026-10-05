-- CORE PLATFORM MIGRATION 003
-- Assessment, reporting and Golden Talent evidence model
-- Provider-neutral PostgreSQL baseline; not yet applied to production.

BEGIN;

CREATE TABLE IF NOT EXISTS assessment (
  id uuid PRIMARY KEY,
  code text NOT NULL UNIQUE,
  title text NOT NULL,
  purpose text,
  status text NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT','ACTIVE','RETIRED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS assessment_version (
  id uuid PRIMARY KEY,
  assessment_id uuid NOT NULL REFERENCES assessment(id) ON DELETE CASCADE,
  version_number integer NOT NULL CHECK (version_number > 0),
  status text NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT','PUBLISHED','RETIRED')),
  instructions text,
  response_schema jsonb NOT NULL DEFAULT '{}'::jsonb,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assessment_id, version_number)
);

CREATE TABLE IF NOT EXISTS assessment_dimension (
  id uuid PRIMARY KEY,
  assessment_version_id uuid NOT NULL
    REFERENCES assessment_version(id) ON DELETE CASCADE,
  code text NOT NULL,
  title text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  UNIQUE (assessment_version_id, code)
);

CREATE TABLE IF NOT EXISTS assessment_item (
  id uuid PRIMARY KEY,
  assessment_version_id uuid NOT NULL
    REFERENCES assessment_version(id) ON DELETE CASCADE,
  dimension_id uuid REFERENCES assessment_dimension(id) ON DELETE SET NULL,
  item_code text NOT NULL,
  prompt text NOT NULL,
  response_type text NOT NULL
    CHECK (response_type IN ('LIKERT','SINGLE_CHOICE','MULTI_CHOICE','NUMBER','TEXT','BOOLEAN')),
  required boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  configuration jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (assessment_version_id, item_code)
);

CREATE TABLE IF NOT EXISTS assessment_item_option (
  id uuid PRIMARY KEY,
  item_id uuid NOT NULL REFERENCES assessment_item(id) ON DELETE CASCADE,
  option_code text NOT NULL,
  label text NOT NULL,
  numeric_value numeric,
  sort_order integer NOT NULL DEFAULT 0,
  UNIQUE (item_id, option_code)
);

CREATE TABLE IF NOT EXISTS assessment_session (
  id uuid PRIMARY KEY,
  assessment_version_id uuid NOT NULL
    REFERENCES assessment_version(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  subject_user_id uuid REFERENCES app_user(id) ON DELETE SET NULL,
  respondent_role text
    CHECK (respondent_role IS NULL OR respondent_role IN ('SELF','PARENT','TEACHER','CONSULTANT')),
  status text NOT NULL DEFAULT 'IN_PROGRESS'
    CHECK (status IN ('IN_PROGRESS','SUBMITTED','SCORING','COMPLETE','CANCELLED')),
  started_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS assessment_session_user_idx
  ON assessment_session(user_id, started_at DESC);

CREATE TABLE IF NOT EXISTS assessment_response (
  id uuid PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES assessment_session(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES assessment_item(id) ON DELETE RESTRICT,
  value jsonb NOT NULL,
  client_updated_at timestamptz,
  saved_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, item_id)
);

CREATE TABLE IF NOT EXISTS scoring_version (
  id uuid PRIMARY KEY,
  assessment_version_id uuid NOT NULL
    REFERENCES assessment_version(id) ON DELETE CASCADE,
  version_number integer NOT NULL CHECK (version_number > 0),
  status text NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT','PUBLISHED','RETIRED')),
  rules jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  UNIQUE (assessment_version_id, version_number)
);

CREATE TABLE IF NOT EXISTS assessment_score (
  id uuid PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES assessment_session(id) ON DELETE CASCADE,
  scoring_version_id uuid NOT NULL REFERENCES scoring_version(id) ON DELETE RESTRICT,
  dimension_id uuid REFERENCES assessment_dimension(id) ON DELETE SET NULL,
  score_key text NOT NULL,
  raw_value numeric,
  standard_value numeric,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS interpretation_version (
  id uuid PRIMARY KEY,
  assessment_version_id uuid NOT NULL
    REFERENCES assessment_version(id) ON DELETE CASCADE,
  version_number integer NOT NULL CHECK (version_number > 0),
  status text NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT','PUBLISHED','RETIRED')),
  rules jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  UNIQUE (assessment_version_id, version_number)
);

CREATE TABLE IF NOT EXISTS assessment_interpretation (
  id uuid PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES assessment_session(id) ON DELETE CASCADE,
  interpretation_version_id uuid NOT NULL
    REFERENCES interpretation_version(id) ON DELETE RESTRICT,
  interpretation_key text NOT NULL,
  text_value text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS report_template_version (
  id uuid PRIMARY KEY,
  template_key text NOT NULL,
  version_number integer NOT NULL CHECK (version_number > 0),
  status text NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT','PUBLISHED','RETIRED')),
  template_definition jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  UNIQUE (template_key, version_number)
);

CREATE TABLE IF NOT EXISTS report (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  assessment_session_id uuid REFERENCES assessment_session(id) ON DELETE SET NULL,
  report_template_version_id uuid NOT NULL
    REFERENCES report_template_version(id) ON DELETE RESTRICT,
  report_type text NOT NULL
    CHECK (report_type IN ('FREE_SNAPSHOT','STANDARD','PROFESSIONAL','INTEGRATED_TALENT_PROFILE','GOLDEN_PATH','HUMAN_REVIEWED')),
  status text NOT NULL DEFAULT 'GENERATING'
    CHECK (status IN ('GENERATING','READY','SUPERSEDED','REVOKED')),
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  generated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS human_review_event (
  id uuid PRIMARY KEY,
  report_id uuid NOT NULL REFERENCES report(id) ON DELETE CASCADE,
  reviewer_user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE RESTRICT,
  review_status text NOT NULL
    CHECK (review_status IN ('REQUESTED','IN_REVIEW','APPROVED','REVISED','DECLINED')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS talent_profile (
  id uuid PRIMARY KEY,
  subject_user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE','ARCHIVED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS talent_evidence (
  id uuid PRIMARY KEY,
  talent_profile_id uuid NOT NULL REFERENCES talent_profile(id) ON DELETE CASCADE,
  source_type text NOT NULL
    CHECK (source_type IN ('STUDENT_SELF','PARENT','TEACHER','ACADEMIC_RECORD','ASSESSMENT','CONTEXT','CONSULTANT')),
  source_reference_id uuid,
  evidence_key text NOT NULL,
  evidence_value jsonb NOT NULL,
  observed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS golden_path (
  id uuid PRIMARY KEY,
  talent_profile_id uuid NOT NULL REFERENCES talent_profile(id) ON DELETE CASCADE,
  version_number integer NOT NULL CHECK (version_number > 0),
  status text NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT','ACTIVE','SUPERSEDED','ARCHIVED')),
  summary text,
  created_by uuid REFERENCES app_user(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (talent_profile_id, version_number)
);

CREATE TABLE IF NOT EXISTS golden_path_action (
  id uuid PRIMARY KEY,
  golden_path_id uuid NOT NULL REFERENCES golden_path(id) ON DELETE CASCADE,
  action_text text NOT NULL,
  rationale text,
  priority text
    CHECK (priority IS NULL OR priority IN ('LOW','MEDIUM','HIGH')),
  status text NOT NULL DEFAULT 'PLANNED'
    CHECK (status IN ('PLANNED','IN_PROGRESS','COMPLETED','CANCELLED')),
  target_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMIT;
