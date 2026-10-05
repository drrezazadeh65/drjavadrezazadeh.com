-- CORE PLATFORM MIGRATION 010
-- Golden Talent RCAS routing, premium module access and BAHAR continuity
-- Provider-neutral PostgreSQL baseline; not yet applied to production.

BEGIN;

CREATE TABLE IF NOT EXISTS assessment_route (
  id uuid PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES assessment_session(id) ON DELETE CASCADE,
  route_code text NOT NULL
    CHECK (route_code IN ('D1','D2','D3','D4','D5','D6')),
  evidence_state text
    CHECK (evidence_state IS NULL OR evidence_state IN ('CONVERGENT','DISCREPANT','SINGLE_SOURCE','INSUFFICIENT')),
  is_priority boolean NOT NULL DEFAULT false,
  rationale text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, route_code)
);

CREATE INDEX IF NOT EXISTS assessment_route_session_idx
  ON assessment_route(session_id, is_priority DESC);

CREATE TABLE IF NOT EXISTS product_entitlement_rule (
  id uuid PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES product(id) ON DELETE CASCADE,
  entitlement_type text NOT NULL
    CHECK (entitlement_type IN ('ASSESSMENT_ACCESS','REPORT_ACCESS','CONSULTATION_ACCESS','COURSE_ACCESS','DIGITAL_DOWNLOAD')),
  feature_key text NOT NULL,
  route_code text
    CHECK (route_code IS NULL OR route_code IN ('D1','D2','D3','D4','D5','D6')),
  requires_human_review boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (product_id, feature_key, route_code)
);

CREATE TABLE IF NOT EXISTS user_feature_access (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  entitlement_id uuid REFERENCES entitlement(id) ON DELETE CASCADE,
  feature_key text NOT NULL,
  route_code text
    CHECK (route_code IS NULL OR route_code IN ('D1','D2','D3','D4','D5','D6')),
  status text NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE','PENDING_REVIEW','EXPIRED','REVOKED')),
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (user_id, feature_key, route_code)
);

CREATE INDEX IF NOT EXISTS user_feature_access_user_idx
  ON user_feature_access(user_id, status);

CREATE TABLE IF NOT EXISTS bahar_portfolio (
  id uuid PRIMARY KEY,
  subject_user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  talent_profile_id uuid REFERENCES talent_profile(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE','PAUSED','COMPLETED','ARCHIVED')),
  started_at timestamptz NOT NULL DEFAULT now(),
  target_end_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bahar_portfolio_subject_idx
  ON bahar_portfolio(subject_user_id, status);

CREATE TABLE IF NOT EXISTS bahar_baseline_snapshot (
  id uuid PRIMARY KEY,
  portfolio_id uuid NOT NULL UNIQUE REFERENCES bahar_portfolio(id) ON DELETE CASCADE,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  evidence_summary text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bahar_compass (
  id uuid PRIMARY KEY,
  portfolio_id uuid NOT NULL REFERENCES bahar_portfolio(id) ON DELETE CASCADE,
  version_number integer NOT NULL CHECK (version_number > 0),
  goal_text text NOT NULL,
  why_it_matters text,
  success_evidence text,
  constraints text,
  starts_on date,
  ends_on date,
  status text NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('DRAFT','ACTIVE','SUPERSEDED','COMPLETED','CANCELLED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (portfolio_id, version_number)
);

CREATE TABLE IF NOT EXISTS bahar_weekly_cycle (
  id uuid PRIMARY KEY,
  portfolio_id uuid NOT NULL REFERENCES bahar_portfolio(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  goal_text text,
  planned_action text,
  observed_evidence text,
  interpretation text,
  adaptation text,
  review_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (portfolio_id, week_start)
);

CREATE TABLE IF NOT EXISTS bahar_learning_evidence (
  id uuid PRIMARY KEY,
  portfolio_id uuid NOT NULL REFERENCES bahar_portfolio(id) ON DELETE CASCADE,
  evidence_type text NOT NULL
    CHECK (evidence_type IN ('RETRIEVAL_GAP','ERROR','PERFORMANCE_SAMPLE','FEEDBACK','OBSERVATION','OTHER')),
  description text NOT NULL,
  interpretation text,
  next_action text,
  observed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bahar_review (
  id uuid PRIMARY KEY,
  portfolio_id uuid NOT NULL REFERENCES bahar_portfolio(id) ON DELETE CASCADE,
  review_type text NOT NULL
    CHECK (review_type IN ('FOUR_WEEK','EIGHT_WEEK','THIRTY_DAY_STARTER','AD_HOC')),
  period_start date,
  period_end date,
  evidence_summary text,
  decision text
    CHECK (decision IS NULL OR decision IN ('CONTINUE','CHANGE','PAUSE','STOP','INVESTIGATE')),
  rationale text,
  next_step text,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMIT;
