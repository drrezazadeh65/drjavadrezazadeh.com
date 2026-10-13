-- Unified Bertina | 003b coaching, explanations, pathway choice and human decision-support.
-- No automatic student placement or professional judgement from database records alone.
SET NAMES utf8mb4;
SET time_zone = '+00:00';
CREATE TABLE IF NOT EXISTS eco_coaching_programs (
  id CHAR(36) NOT NULL PRIMARY KEY,
  program_code VARCHAR(90) NOT NULL UNIQUE,
  service_id CHAR(36) NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'DRAFT',
  revision_no INT UNSIGNED NOT NULL DEFAULT 1,
  requires_human_coach TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  FOREIGN KEY (service_id) REFERENCES eco_service_offerings(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_coaching_enrollments (
  id CHAR(36) NOT NULL PRIMARY KEY,
  program_id CHAR(36) NOT NULL,
  subject_id CHAR(36) NOT NULL,
  responsible_account_id CHAR(36) NOT NULL,
  entitlement_id CHAR(36) NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'PENDING',
  started_at DATETIME(3) NULL,
  completed_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  FOREIGN KEY (program_id) REFERENCES eco_coaching_programs(id) ON DELETE RESTRICT,
  FOREIGN KEY (subject_id) REFERENCES eco_subjects(id) ON DELETE RESTRICT,
  FOREIGN KEY (responsible_account_id) REFERENCES customer_accounts(id) ON DELETE RESTRICT,
  FOREIGN KEY (entitlement_id) REFERENCES eco_entitlements(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_coaching_reviews (
  id CHAR(36) NOT NULL PRIMARY KEY,
  enrollment_id CHAR(36) NOT NULL,
  reviewer_account_id CHAR(36) NOT NULL,
  review_code VARCHAR(60) NOT NULL,
  review_object_id CHAR(36) NULL,
  reviewed_at DATETIME(3) NOT NULL,
  followup_due DATE NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  FOREIGN KEY (enrollment_id) REFERENCES eco_coaching_enrollments(id) ON DELETE RESTRICT,
  FOREIGN KEY (reviewer_account_id) REFERENCES customer_accounts(id) ON DELETE RESTRICT,
  FOREIGN KEY (review_object_id) REFERENCES eco_object_refs(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_pathway_options (
  id CHAR(36) NOT NULL PRIMARY KEY,
  subject_id CHAR(36) NOT NULL,
  pathway_code VARCHAR(100) NOT NULL,
  source_code VARCHAR(80) NOT NULL,
  confidence_label VARCHAR(24) NOT NULL DEFAULT 'UNVALIDATED',
  evidence_object_id CHAR(36) NULL,
  state VARCHAR(24) NOT NULL DEFAULT 'SAVED',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_eco_pathway_subject (subject_id,created_at),
  FOREIGN KEY (subject_id) REFERENCES eco_subjects(id) ON DELETE RESTRICT,
  FOREIGN KEY (evidence_object_id) REFERENCES eco_object_refs(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_education_decisions (
  id CHAR(36) NOT NULL PRIMARY KEY,
  subject_id CHAR(36) NOT NULL,
  decision_kind VARCHAR(80) NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'DRAFT',
  chosen_option_id CHAR(36) NULL,
  decided_by_account_id CHAR(36) NULL,
  guardian_approved_at DATETIME(3) NULL,
  decision_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  FOREIGN KEY (subject_id) REFERENCES eco_subjects(id) ON DELETE RESTRICT,
  FOREIGN KEY (chosen_option_id) REFERENCES eco_pathway_options(id) ON DELETE SET NULL,
  FOREIGN KEY (decided_by_account_id) REFERENCES customer_accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_decision_explanations (
  id CHAR(36) NOT NULL PRIMARY KEY,
  decision_id CHAR(36) NOT NULL,
  revision_no INT UNSIGNED NOT NULL,
  explanation_object_id CHAR(36) NULL,
  evidence_sha256 CHAR(64) NULL,
  reviewed_by_account_id CHAR(36) NULL,
  limitations_code VARCHAR(100) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_eco_decision_expl (decision_id,revision_no),
  FOREIGN KEY (decision_id) REFERENCES eco_education_decisions(id) ON DELETE RESTRICT,
  FOREIGN KEY (explanation_object_id) REFERENCES eco_object_refs(id) ON DELETE SET NULL,
  FOREIGN KEY (reviewed_by_account_id) REFERENCES customer_accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_education_feedback (
  id CHAR(36) NOT NULL PRIMARY KEY,
  subject_id CHAR(36) NOT NULL,
  related_goal_id CHAR(36) NULL,
  author_account_id CHAR(36) NOT NULL,
  feedback_kind VARCHAR(60) NOT NULL,
  feedback_object_id CHAR(36) NULL,
  visibility_code VARCHAR(24) NOT NULL DEFAULT 'PRIVATE',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  FOREIGN KEY (subject_id) REFERENCES eco_subjects(id) ON DELETE RESTRICT,
  FOREIGN KEY (related_goal_id) REFERENCES eco_learning_goals(id) ON DELETE SET NULL,
  FOREIGN KEY (author_account_id) REFERENCES customer_accounts(id) ON DELETE RESTRICT,
  FOREIGN KEY (feedback_object_id) REFERENCES eco_object_refs(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
