-- CORE PLATFORM MIGRATION 012
-- Golden Talent evidence-ledger engine and auditable routing
-- No total talent score; no normative cut-score until empirical validation authorises one.
BEGIN;

CREATE TABLE IF NOT EXISTS talent_evidence_event (
  id uuid PRIMARY KEY,
  talent_profile_id uuid NOT NULL REFERENCES talent_profile(id) ON DELETE CASCADE,
  subject_user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  source_type text NOT NULL CHECK (source_type IN ('STUDENT_SELF','PARENT','TEACHER','ACADEMIC_RECORD','ASSESSMENT','CONTEXT','CONSULTANT','PERFORMANCE_SAMPLE')),
  source_reference_id uuid,
  instrument_code text,
  instrument_version text,
  domain_code text CHECK (domain_code IS NULL OR domain_code IN ('D1','D2','D3','D4','D5','D6')),
  evidence_key text NOT NULL,
  evidence_value jsonb NOT NULL,
  provenance jsonb NOT NULL DEFAULT '{}'::jsonb,
  visibility_scope text NOT NULL DEFAULT 'SUBJECT_PRIVATE'
    CHECK (visibility_scope IN ('SUBJECT_PRIVATE','PARENT_ALLOWED','TEACHER_ALLOWED','ADVISER_ALLOWED','REVIEW_TEAM')),
  quality_state text NOT NULL DEFAULT 'UNREVIEWED'
    CHECK (quality_state IN ('UNREVIEWED','USABLE','LIMITED','CONFLICTING','WITHDRAWN')),
  observed_at timestamptz,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  withdrawn_at timestamptz
);
CREATE INDEX IF NOT EXISTS talent_evidence_event_profile_idx ON talent_evidence_event(talent_profile_id,domain_code,recorded_at DESC);

CREATE TABLE IF NOT EXISTS talent_route_run (
  id uuid PRIMARY KEY,
  talent_profile_id uuid NOT NULL REFERENCES talent_profile(id) ON DELETE CASCADE,
  trigger_session_id uuid REFERENCES assessment_session(id) ON DELETE SET NULL,
  engine_version text NOT NULL,
  status text NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT','REVIEW_REQUIRED','RELEASED','SUPERSEDED','VOID')),
  policy_snapshot jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  released_at timestamptz
);

CREATE TABLE IF NOT EXISTS talent_route_evidence (
  id uuid PRIMARY KEY,
  route_run_id uuid NOT NULL REFERENCES talent_route_run(id) ON DELETE CASCADE,
  route_code text NOT NULL CHECK (route_code IN ('D1','D2','D3','D4','D5','D6')),
  evidence_state text NOT NULL CHECK (evidence_state IN ('CONVERGENT','DISCREPANT','SINGLE_SOURCE','INSUFFICIENT')),
  source_count integer NOT NULL DEFAULT 0 CHECK (source_count >= 0),
  usable_event_count integer NOT NULL DEFAULT 0 CHECK (usable_event_count >= 0),
  rationale_codes jsonb NOT NULL DEFAULT '[]'::jsonb,
  requires_more_evidence boolean NOT NULL DEFAULT true,
  human_review_required boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(route_run_id,route_code)
);

CREATE TABLE IF NOT EXISTS talent_route_evidence_link (
  route_evidence_id uuid NOT NULL REFERENCES talent_route_evidence(id) ON DELETE CASCADE,
  evidence_event_id uuid NOT NULL REFERENCES talent_evidence_event(id) ON DELETE RESTRICT,
  contribution text NOT NULL CHECK (contribution IN ('SUPPORTS','CONTRADICTS','CONTEXTUALISES','QUALITY_LIMIT')),
  PRIMARY KEY(route_evidence_id,evidence_event_id)
);

CREATE TABLE IF NOT EXISTS talent_engine_review (
  id uuid PRIMARY KEY,
  route_run_id uuid NOT NULL REFERENCES talent_route_run(id) ON DELETE CASCADE,
  reviewer_user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE RESTRICT,
  decision text NOT NULL CHECK (decision IN ('REQUEST_MORE_EVIDENCE','ACCEPT_ROUTING','REVISE_ROUTING','VOID_RUN')),
  rationale text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMIT;
