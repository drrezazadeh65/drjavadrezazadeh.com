-- Unified Bertina | 003d Golden Talent, RCAS and BAHAR evidence/decision architecture.
-- All talent findings remain unvalidated until scientific audit and human review; no automatic learner label.
SET NAMES utf8mb4;
SET time_zone = '+00:00';
CREATE TABLE IF NOT EXISTS eco_talent_evidence (
  id CHAR(36) NOT NULL PRIMARY KEY,
  subject_id CHAR(36) NOT NULL,
  evidence_kind VARCHAR(80) NOT NULL,
  source_code VARCHAR(80) NOT NULL,
  source_record_id CHAR(36) NULL,
  evidence_object_id CHAR(36) NULL,
  consent_id CHAR(36) NULL,
  captured_at DATETIME(3) NOT NULL,
  verification_state VARCHAR(24) NOT NULL DEFAULT 'UNREVIEWED',
  KEY idx_eco_talent_subject (subject_id,captured_at),
  FOREIGN KEY (subject_id) REFERENCES eco_subjects(id) ON DELETE RESTRICT,
  FOREIGN KEY (evidence_object_id) REFERENCES eco_object_refs(id) ON DELETE SET NULL,
  FOREIGN KEY (consent_id) REFERENCES eco_consent_records(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_talent_evidence_reviews (
  id CHAR(36) NOT NULL PRIMARY KEY,
  evidence_id CHAR(36) NOT NULL,
  reviewer_account_id CHAR(36) NOT NULL,
  decision_code VARCHAR(32) NOT NULL,
  limitations_object_id CHAR(36) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_eco_evidence_review (evidence_id,created_at),
  FOREIGN KEY (evidence_id) REFERENCES eco_talent_evidence(id) ON DELETE RESTRICT,
  FOREIGN KEY (reviewer_account_id) REFERENCES customer_accounts(id) ON DELETE RESTRICT,
  FOREIGN KEY (limitations_object_id) REFERENCES eco_object_refs(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_talent_profiles (
  id CHAR(36) NOT NULL PRIMARY KEY,
  subject_id CHAR(36) NOT NULL,
  profile_code VARCHAR(90) NOT NULL,
  state VARCHAR(24) NOT NULL DEFAULT 'DRAFT',
  active_revision_no INT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_eco_talent_profile (subject_id,profile_code),
  FOREIGN KEY (subject_id) REFERENCES eco_subjects(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_talent_profile_revisions (
  id CHAR(36) NOT NULL PRIMARY KEY,
  profile_id CHAR(36) NOT NULL,
  revision_no INT UNSIGNED NOT NULL,
  body_object_id CHAR(36) NULL,
  evidence_sha256 CHAR(64) NULL,
  approved_by_account_id CHAR(36) NULL,
  approval_state VARCHAR(24) NOT NULL DEFAULT 'DRAFT',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_eco_talent_revision (profile_id,revision_no),
  FOREIGN KEY (profile_id) REFERENCES eco_talent_profiles(id) ON DELETE RESTRICT,
  FOREIGN KEY (body_object_id) REFERENCES eco_object_refs(id) ON DELETE SET NULL,
  FOREIGN KEY (approved_by_account_id) REFERENCES customer_accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_rcas_route_runs (
  id CHAR(36) NOT NULL PRIMARY KEY,
  subject_id CHAR(36) NOT NULL,
  route_code VARCHAR(90) NOT NULL,
  route_revision VARCHAR(40) NOT NULL,
  input_snapshot_sha256 CHAR(64) NOT NULL,
  output_snapshot_sha256 CHAR(64) NULL,
  state VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
  human_review_required TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_eco_rcas_subject (subject_id,route_code,created_at),
  FOREIGN KEY (subject_id) REFERENCES eco_subjects(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_rcas_route_evidence (
  id CHAR(36) NOT NULL PRIMARY KEY,
  route_run_id CHAR(36) NOT NULL,
  evidence_id CHAR(36) NOT NULL,
  evidence_role VARCHAR(40) NOT NULL,
  weight_annotation DECIMAL(12,6) NULL,
  UNIQUE KEY uq_eco_rcas_evidence (route_run_id,evidence_id,evidence_role),
  FOREIGN KEY (route_run_id) REFERENCES eco_rcas_route_runs(id) ON DELETE RESTRICT,
  FOREIGN KEY (evidence_id) REFERENCES eco_talent_evidence(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_golden_path_releases (
  id CHAR(36) NOT NULL PRIMARY KEY,
  subject_id CHAR(36) NOT NULL,
  talent_profile_revision_id CHAR(36) NULL,
  route_run_id CHAR(36) NULL,
  release_number INT UNSIGNED NOT NULL,
  release_state VARCHAR(32) NOT NULL DEFAULT 'PROPOSED',
  approved_by_account_id CHAR(36) NULL,
  approved_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_eco_path_release (subject_id,release_number),
  FOREIGN KEY (subject_id) REFERENCES eco_subjects(id) ON DELETE RESTRICT,
  FOREIGN KEY (talent_profile_revision_id) REFERENCES eco_talent_profile_revisions(id) ON DELETE SET NULL,
  FOREIGN KEY (route_run_id) REFERENCES eco_rcas_route_runs(id) ON DELETE SET NULL,
  FOREIGN KEY (approved_by_account_id) REFERENCES customer_accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_golden_path_actions (
  id CHAR(36) NOT NULL PRIMARY KEY,
  release_id CHAR(36) NOT NULL,
  action_order INT UNSIGNED NOT NULL,
  goal_id CHAR(36) NULL,
  action_object_id CHAR(36) NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'PLANNED',
  scheduled_for DATE NULL,
  UNIQUE KEY uq_eco_golden_action (release_id,action_order),
  FOREIGN KEY (release_id) REFERENCES eco_golden_path_releases(id) ON DELETE RESTRICT,
  FOREIGN KEY (goal_id) REFERENCES eco_learning_goals(id) ON DELETE SET NULL,
  FOREIGN KEY (action_object_id) REFERENCES eco_object_refs(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_bahar_portfolios (
  id CHAR(36) NOT NULL PRIMARY KEY,
  subject_id CHAR(36) NOT NULL,
  portfolio_code VARCHAR(80) NOT NULL,
  state VARCHAR(24) NOT NULL DEFAULT 'DRAFT',
  human_mentor_account_id CHAR(36) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_eco_bahar_subject (subject_id,portfolio_code),
  FOREIGN KEY (subject_id) REFERENCES eco_subjects(id) ON DELETE RESTRICT,
  FOREIGN KEY (human_mentor_account_id) REFERENCES customer_accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_bahar_baselines (
  id CHAR(36) NOT NULL PRIMARY KEY,
  portfolio_id CHAR(36) NOT NULL,
  baseline_revision INT UNSIGNED NOT NULL,
  baseline_object_id CHAR(36) NULL,
  source_fingerprint CHAR(64) NOT NULL,
  review_status VARCHAR(24) NOT NULL DEFAULT 'UNREVIEWED',
  reviewed_by_account_id CHAR(36) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_eco_bahar_base (portfolio_id,baseline_revision),
  FOREIGN KEY (portfolio_id) REFERENCES eco_bahar_portfolios(id) ON DELETE RESTRICT,
  FOREIGN KEY (baseline_object_id) REFERENCES eco_object_refs(id) ON DELETE SET NULL,
  FOREIGN KEY (reviewed_by_account_id) REFERENCES customer_accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_bahar_weekly_cycles (
  id CHAR(36) NOT NULL PRIMARY KEY,
  portfolio_id CHAR(36) NOT NULL,
  week_start_date DATE NOT NULL,
  cycle_number INT UNSIGNED NOT NULL,
  plan_object_id CHAR(36) NULL,
  state VARCHAR(24) NOT NULL DEFAULT 'PLANNED',
  human_reviewed_at DATETIME(3) NULL,
  UNIQUE KEY uq_eco_bahar_week (portfolio_id,week_start_date),
  FOREIGN KEY (portfolio_id) REFERENCES eco_bahar_portfolios(id) ON DELETE RESTRICT,
  FOREIGN KEY (plan_object_id) REFERENCES eco_object_refs(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_bahar_learning_evidence (
  id CHAR(36) NOT NULL PRIMARY KEY,
  cycle_id CHAR(36) NOT NULL,
  talent_evidence_id CHAR(36) NULL,
  object_id CHAR(36) NULL,
  evidence_kind VARCHAR(70) NOT NULL,
  observed_at DATETIME(3) NOT NULL,
  review_state VARCHAR(24) NOT NULL DEFAULT 'UNREVIEWED',
  FOREIGN KEY (cycle_id) REFERENCES eco_bahar_weekly_cycles(id) ON DELETE RESTRICT,
  FOREIGN KEY (talent_evidence_id) REFERENCES eco_talent_evidence(id) ON DELETE SET NULL,
  FOREIGN KEY (object_id) REFERENCES eco_object_refs(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_bahar_reviews (
  id CHAR(36) NOT NULL PRIMARY KEY,
  cycle_id CHAR(36) NOT NULL,
  reviewer_account_id CHAR(36) NOT NULL,
  decision_code VARCHAR(40) NOT NULL,
  feedback_object_id CHAR(36) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  FOREIGN KEY (cycle_id) REFERENCES eco_bahar_weekly_cycles(id) ON DELETE RESTRICT,
  FOREIGN KEY (reviewer_account_id) REFERENCES customer_accounts(id) ON DELETE RESTRICT,
  FOREIGN KEY (feedback_object_id) REFERENCES eco_object_refs(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
