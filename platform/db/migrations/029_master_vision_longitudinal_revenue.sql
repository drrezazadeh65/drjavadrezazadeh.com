-- MASTER VISION MIGRATION 029
-- Longitudinal student development, broader professional-service intake,
-- recurring coaching and explainable decision-support foundations.
-- Provider-neutral PostgreSQL baseline; not yet applied to production.
BEGIN;

-- Expand role vocabulary for the master ecosystem while preserving existing roles.
-- Institution and counsellor authority still requires separate verification/RBAC;
-- adding a role value does not itself grant access.
ALTER TABLE user_role
  DROP CONSTRAINT IF EXISTS user_role_role_check;

ALTER TABLE user_role
  ADD CONSTRAINT user_role_role_check
  CHECK (role IN (
    'STUDENT','PARENT','TEACHER','CONSULTANT','COUNSELLOR','RESEARCHER',
    'CONSULTATION_CLIENT','INSTITUTION','EDITOR','ADMIN','SUPER_ADMIN'
  ));

-- Broaden one intake architecture beyond student counselling while preserving
-- the same fail-closed triage, booking and payment lifecycle.
ALTER TABLE consultation_request
  DROP CONSTRAINT IF EXISTS consultation_request_service_type_check;

ALTER TABLE consultation_request
  ADD CONSTRAINT consultation_request_service_type_check
  CHECK (service_type IN (
    'ACADEMIC_COUNSELLING',
    'FIELD_SELECTION',
    'ENTRANCE_EXAM',
    'TALENT_IDENTIFICATION',
    'REPORT_CARD_ANALYSIS',
    'PARENT_COUNSELLING',
    'ACADEMIC_ENGLISH_EDITING',
    'MANUSCRIPT_DIAGNOSTIC',
    'RESEARCH_CONSULTATION',
    'PUBLICATION_CONSULTATION',
    'REVIEWER_RESPONSE_SUPPORT',
    'ACADEMIC_CAREER_CONSULTATION',
    'TEACHER_MENTORING',
    'ASSESSMENT_CONSULTATION',
    'INSTITUTIONAL_CONSULTING',
    'SPEAKING_TRAINING'
  ));

ALTER TABLE consultation_request
  ALTER COLUMN education_stage DROP NOT NULL;

ALTER TABLE consultation_request
  ADD COLUMN IF NOT EXISTS requester_context text
    CHECK (requester_context IS NULL OR requester_context IN (
      'STUDENT','PARENT','RESEARCHER','ACADEMIC','TEACHER','EDUCATOR',
      'INSTITUTION','PROFESSIONAL','OTHER'
    )),
  ADD COLUMN IF NOT EXISTS context_label text;

COMMENT ON COLUMN consultation_request.context_label IS
  'Minimal routing context only. Do not place confidential manuscripts, sensitive student records or secrets in this field.';

-- Expand product/entitlement vocabulary for professional and recurring services.
ALTER TABLE product
  DROP CONSTRAINT IF EXISTS product_product_type_check;

ALTER TABLE product
  ADD CONSTRAINT product_product_type_check
  CHECK (product_type IN (
    'CONSULTATION','PHYSICAL_BOOK','EBOOK','WORKBOOK','ASSESSMENT','REPORT',
    'COURSE','TOOLKIT','INSTITUTION_SERVICE','PROFESSIONAL_SERVICE',
    'COACHING_PROGRAM','SPEAKING_TRAINING'
  ));

ALTER TABLE entitlement
  DROP CONSTRAINT IF EXISTS entitlement_entitlement_type_check;

ALTER TABLE entitlement
  ADD CONSTRAINT entitlement_entitlement_type_check
  CHECK (entitlement_type IN (
    'DIGITAL_DOWNLOAD','ASSESSMENT_ACCESS','REPORT_ACCESS','COURSE_ACCESS',
    'CONSULTATION_ACCESS','COACHING_ACCESS'
  ));

-- Adaptive study planning: plans are versioned rather than overwritten.
CREATE TABLE IF NOT EXISTS study_plan (
  id uuid PRIMARY KEY,
  educational_record_id uuid NOT NULL REFERENCES educational_record(id) ON DELETE CASCADE,
  created_by uuid REFERENCES app_user(id) ON DELETE SET NULL,
  purpose text NOT NULL,
  timezone text,
  starts_on date,
  ends_on date,
  status text NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('DRAFT','ACTIVE','PAUSED','COMPLETED','CANCELLED','ARCHIVED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_on IS NULL OR starts_on IS NULL OR ends_on >= starts_on)
);

CREATE INDEX IF NOT EXISTS study_plan_record_idx
  ON study_plan(educational_record_id,status,created_at DESC);

CREATE TABLE IF NOT EXISTS study_plan_revision (
  id uuid PRIMARY KEY,
  study_plan_id uuid NOT NULL REFERENCES study_plan(id) ON DELETE CASCADE,
  version_number integer NOT NULL CHECK (version_number > 0),
  goal_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  weekly_capacity_minutes integer CHECK (weekly_capacity_minutes IS NULL OR weekly_capacity_minutes >= 0),
  rationale text,
  trigger_type text
    CHECK (trigger_type IS NULL OR trigger_type IN (
      'INITIAL','FELL_BEHIND','GRADE_CHANGE','NEW_EXAM','STUDY_HOURS_CHANGE',
      'PRIORITY_CHANGE','TARGET_CHANGE','PROFESSIONAL_REVIEW','OTHER'
    )),
  status text NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT','ACTIVE','SUPERSEDED','COMPLETED','CANCELLED')),
  created_by uuid REFERENCES app_user(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  activated_at timestamptz,
  UNIQUE (study_plan_id,version_number)
);

CREATE UNIQUE INDEX IF NOT EXISTS study_plan_one_active_revision_idx
  ON study_plan_revision(study_plan_id)
  WHERE status='ACTIVE';

CREATE TABLE IF NOT EXISTS study_task (
  id uuid PRIMARY KEY,
  study_plan_revision_id uuid NOT NULL REFERENCES study_plan_revision(id) ON DELETE CASCADE,
  title text NOT NULL,
  task_type text NOT NULL DEFAULT 'STUDY'
    CHECK (task_type IN ('STUDY','REVIEW','PRACTICE','PROJECT','EXAM_PREP','REFLECTION','EXPERIENCE','OTHER')),
  planned_minutes integer CHECK (planned_minutes IS NULL OR planned_minutes >= 0),
  due_at timestamptz,
  status text NOT NULL DEFAULT 'PLANNED'
    CHECK (status IN ('PLANNED','IN_PROGRESS','COMPLETED','SKIPPED','CANCELLED')),
  completed_at timestamptz,
  completion_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS study_task_revision_status_idx
  ON study_task(study_plan_revision_id,status,due_at);

-- Generic comparable observations support trajectory analysis without forcing
-- grades, study hours and mock-exam scores into one artificial score.
CREATE TABLE IF NOT EXISTS progress_measurement (
  id uuid PRIMARY KEY,
  educational_record_id uuid NOT NULL REFERENCES educational_record(id) ON DELETE CASCADE,
  measure_key text NOT NULL,
  measure_label text NOT NULL,
  value_numeric numeric,
  value_text text,
  unit text,
  scale_min numeric,
  scale_max numeric,
  comparability_key text NOT NULL,
  source_type text NOT NULL
    CHECK (source_type IN (
      'GRADE_RECORD','MOCK_EXAM','STUDY_LOG','ASSESSMENT','PERFORMANCE_SAMPLE',
      'TEACHER_RECORD','CONSULTANT_RECORD','SELF_TRACKED','INSTITUTION_IMPORT','OTHER'
    )),
  source_reference_id uuid,
  observed_at timestamptz NOT NULL,
  provenance jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (value_numeric IS NOT NULL OR value_text IS NOT NULL),
  CHECK (scale_max IS NULL OR scale_min IS NULL OR scale_max > scale_min)
);

CREATE INDEX IF NOT EXISTS progress_measurement_timeline_idx
  ON progress_measurement(educational_record_id,comparability_key,observed_at DESC);

-- Saved pathway options retain source/version/jurisdiction rather than becoming
-- untraceable browser bookmarks.
CREATE TABLE IF NOT EXISTS saved_pathway_option (
  id uuid PRIMARY KEY,
  educational_record_id uuid NOT NULL REFERENCES educational_record(id) ON DELETE CASCADE,
  reference_type text NOT NULL
    CHECK (reference_type IN ('CAREER','EDUCATION_PROGRAM','QUALIFICATION','EXPERIENCE','INSTITUTION_OPTION')),
  source_system text NOT NULL,
  source_version text NOT NULL,
  source_record_id text NOT NULL,
  jurisdiction text NOT NULL,
  locale text NOT NULL,
  title text NOT NULL,
  source_url text,
  status text NOT NULL DEFAULT 'SAVED'
    CHECK (status IN ('SAVED','SHORTLISTED','REMOVED','DECIDED')),
  note text,
  saved_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (educational_record_id,source_system,source_version,source_record_id)
);

CREATE INDEX IF NOT EXISTS saved_pathway_option_record_idx
  ON saved_pathway_option(educational_record_id,status,updated_at DESC);

-- Decisions are historical records. A later decision supersedes; it does not
-- erase the earlier reasoning.
CREATE TABLE IF NOT EXISTS educational_decision (
  id uuid PRIMARY KEY,
  educational_record_id uuid NOT NULL REFERENCES educational_record(id) ON DELETE CASCADE,
  decision_type text NOT NULL
    CHECK (decision_type IN (
      'STUDY_PLAN','FIELD_SELECTION','PATHWAY','APPLICATION','CAREER_EXPLORATION',
      'ASSESSMENT_FOLLOW_UP','COACHING','OTHER'
    )),
  decision_text text NOT NULL,
  rationale text,
  uncertainty text,
  created_by uuid REFERENCES app_user(id) ON DELETE SET NULL,
  decided_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE','SUPERSEDED','WITHDRAWN')),
  supersedes_decision_id uuid REFERENCES educational_decision(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS educational_decision_record_idx
  ON educational_decision(educational_record_id,decided_at DESC);

-- Explainability record for any consequential future recommendation.
CREATE TABLE IF NOT EXISTS decision_support_explanation (
  id uuid PRIMARY KEY,
  educational_record_id uuid NOT NULL REFERENCES educational_record(id) ON DELETE CASCADE,
  decision_id uuid REFERENCES educational_decision(id) ON DELETE SET NULL,
  recommendation_type text NOT NULL,
  recommendation_reference text,
  supporting_evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  counterevidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  contextual_constraints jsonb NOT NULL DEFAULT '[]'::jsonb,
  explanation_text text NOT NULL,
  uncertainty_text text NOT NULL,
  reviewer_user_id uuid REFERENCES app_user(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT','REVIEW_REQUIRED','APPROVED','SUPERSEDED','VOID')),
  created_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz
);

CREATE INDEX IF NOT EXISTS decision_support_explanation_record_idx
  ON decision_support_explanation(educational_record_id,status,created_at DESC);

-- Recurring development programmes use verified commerce entitlements but keep
-- professional review state separate from payment state.
CREATE TABLE IF NOT EXISTS coaching_program (
  id uuid PRIMARY KEY,
  product_id uuid REFERENCES product(id) ON DELETE SET NULL,
  programme_type text NOT NULL
    CHECK (programme_type IN ('MONTHLY_COACHING','QUARTERLY_REVIEW','ANNUAL_DEVELOPMENT','PREMIUM_LONG_TERM')),
  title text NOT NULL,
  default_review_cadence_days integer
    CHECK (default_review_cadence_days IS NULL OR default_review_cadence_days BETWEEN 7 AND 366),
  status text NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT','ACTIVE','PAUSED','RETIRED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS coaching_enrollment (
  id uuid PRIMARY KEY,
  coaching_program_id uuid NOT NULL REFERENCES coaching_program(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  consultation_case_id uuid REFERENCES consultation_case(id) ON DELETE SET NULL,
  entitlement_id uuid REFERENCES entitlement(id) ON DELETE SET NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  status text NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING','ACTIVE','PAUSED','COMPLETED','CANCELLED','EXPIRED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at IS NULL OR ends_at >= starts_at)
);

CREATE INDEX IF NOT EXISTS coaching_enrollment_user_idx
  ON coaching_enrollment(user_id,status,starts_at DESC);

CREATE TABLE IF NOT EXISTS coaching_review (
  id uuid PRIMARY KEY,
  coaching_enrollment_id uuid NOT NULL REFERENCES coaching_enrollment(id) ON DELETE CASCADE,
  reviewer_user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE RESTRICT,
  period_start date,
  period_end date,
  evidence_summary text,
  interpretation text,
  decision text NOT NULL
    CHECK (decision IN ('CONTINUE','ADAPT','PAUSE','COMPLETE','ESCALATE')),
  next_action text,
  next_review_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (period_end IS NULL OR period_start IS NULL OR period_end >= period_start)
);

CREATE INDEX IF NOT EXISTS coaching_review_enrollment_idx
  ON coaching_review(coaching_enrollment_id,created_at DESC);

COMMIT;
