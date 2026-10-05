-- CORE PLATFORM MIGRATION 004
-- Research governance, pseudonymisation and dataset freezes
-- Provider-neutral PostgreSQL baseline; not yet applied to production.

BEGIN;

CREATE TABLE IF NOT EXISTS research_study (
  id uuid PRIMARY KEY,
  study_code text NOT NULL UNIQUE,
  title text NOT NULL,
  purpose text NOT NULL,
  status text NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT','APPROVED','ACTIVE','CLOSED','ARCHIVED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS research_study_version (
  id uuid PRIMARY KEY,
  study_id uuid NOT NULL REFERENCES research_study(id) ON DELETE CASCADE,
  version_number integer NOT NULL CHECK (version_number > 0),
  protocol_summary text NOT NULL,
  inclusion_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  variable_plan jsonb NOT NULL DEFAULT '{}'::jsonb,
  consent_requirements jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT','APPROVED','SUPERSEDED')),
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (study_id, version_number)
);

CREATE TABLE IF NOT EXISTS research_case (
  id uuid PRIMARY KEY,
  study_id uuid NOT NULL REFERENCES research_study(id) ON DELETE CASCADE,
  case_code text NOT NULL,
  status text NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE','EXCLUDED','WITHDRAWN','CLOSED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (study_id, case_code)
);

-- Identity linkage is deliberately separated from the research case.
CREATE TABLE IF NOT EXISTS research_case_identity_link (
  id uuid PRIMARY KEY,
  research_case_id uuid NOT NULL UNIQUE
    REFERENCES research_case(id) ON DELETE CASCADE,
  subject_user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS research_consent_snapshot (
  id uuid PRIMARY KEY,
  research_case_id uuid NOT NULL REFERENCES research_case(id) ON DELETE CASCADE,
  consent_record_id uuid REFERENCES consent_record(id) ON DELETE SET NULL,
  consent_state text NOT NULL
    CHECK (consent_state IN ('GRANTED','DECLINED','WITHDRAWN','NOT_REQUIRED')),
  policy_version text,
  captured_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS deidentification_run (
  id uuid PRIMARY KEY,
  study_id uuid NOT NULL REFERENCES research_study(id) ON DELETE CASCADE,
  run_version integer NOT NULL CHECK (run_version > 0),
  method_summary text NOT NULL,
  transformation_log jsonb NOT NULL DEFAULT '[]'::jsonb,
  executed_by uuid REFERENCES app_user(id) ON DELETE SET NULL,
  executed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (study_id, run_version)
);

CREATE TABLE IF NOT EXISTS codebook_version (
  id uuid PRIMARY KEY,
  study_id uuid NOT NULL REFERENCES research_study(id) ON DELETE CASCADE,
  version_number integer NOT NULL CHECK (version_number > 0),
  variables jsonb NOT NULL,
  missing_value_semantics jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT','FROZEN','SUPERSEDED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (study_id, version_number)
);

CREATE TABLE IF NOT EXISTS dataset_freeze (
  id uuid PRIMARY KEY,
  study_id uuid NOT NULL REFERENCES research_study(id) ON DELETE CASCADE,
  study_version_id uuid NOT NULL REFERENCES research_study_version(id) ON DELETE RESTRICT,
  codebook_version_id uuid NOT NULL REFERENCES codebook_version(id) ON DELETE RESTRICT,
  deidentification_run_id uuid NOT NULL REFERENCES deidentification_run(id) ON DELETE RESTRICT,
  freeze_number integer NOT NULL CHECK (freeze_number > 0),
  extraction_started_at timestamptz NOT NULL,
  extraction_completed_at timestamptz,
  row_count integer CHECK (row_count IS NULL OR row_count >= 0),
  checksum text,
  status text NOT NULL DEFAULT 'BUILDING'
    CHECK (status IN ('BUILDING','FROZEN','INVALIDATED','ARCHIVED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (study_id, freeze_number)
);

CREATE TABLE IF NOT EXISTS dataset_export (
  id uuid PRIMARY KEY,
  dataset_freeze_id uuid NOT NULL REFERENCES dataset_freeze(id) ON DELETE CASCADE,
  export_format text NOT NULL
    CHECK (export_format IN ('CSV','XLSX','SPSS','R','PYTHON','QUALITATIVE_TEXT_PACKAGE')),
  storage_key text NOT NULL,
  checksum text,
  generated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz
);

CREATE TABLE IF NOT EXISTS research_access_grant (
  id uuid PRIMARY KEY,
  study_id uuid NOT NULL REFERENCES research_study(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  access_level text NOT NULL
    CHECK (access_level IN ('METADATA','DEIDENTIFIED_DATA','ANALYSIS_EXPORT','IDENTITY_LINK_ADMIN')),
  granted_by uuid REFERENCES app_user(id) ON DELETE SET NULL,
  reason text NOT NULL,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  revoked_at timestamptz,
  UNIQUE (study_id, user_id, access_level, starts_at)
);

CREATE INDEX IF NOT EXISTS research_access_active_idx
  ON research_access_grant(study_id, user_id, revoked_at);

COMMIT;
