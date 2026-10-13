-- Unified Bertina | 003a longitudinal educational records; privacy, guardians and provenance first.
-- A database row does not establish validated educational or diagnostic conclusions.
SET NAMES utf8mb4;
SET time_zone = '+00:00';
CREATE TABLE IF NOT EXISTS eco_institutions (
  id CHAR(36) NOT NULL PRIMARY KEY,
  organization_id CHAR(36) NULL,
  institution_code VARCHAR(100) NOT NULL UNIQUE,
  display_name VARCHAR(220) NOT NULL,
  country_code CHAR(2) NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'UNVERIFIED',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  FOREIGN KEY (organization_id) REFERENCES eco_organizations(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_education_enrollments (
  id CHAR(36) NOT NULL PRIMARY KEY,
  subject_id CHAR(36) NOT NULL,
  institution_id CHAR(36) NULL,
  education_stage VARCHAR(50) NOT NULL,
  start_date DATE NULL,
  end_date DATE NULL,
  consent_record_id CHAR(36) NULL,
  source_verification VARCHAR(24) NOT NULL DEFAULT 'SELF_REPORTED',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_eco_edu_subject (subject_id,start_date),
  FOREIGN KEY (subject_id) REFERENCES eco_subjects(id) ON DELETE RESTRICT,
  FOREIGN KEY (institution_id) REFERENCES eco_institutions(id) ON DELETE SET NULL,
  FOREIGN KEY (consent_record_id) REFERENCES eco_consent_records(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_academic_records (
  id CHAR(36) NOT NULL PRIMARY KEY,
  enrollment_id CHAR(36) NOT NULL,
  record_kind VARCHAR(40) NOT NULL,
  academic_year VARCHAR(24) NULL,
  evidence_object_id CHAR(36) NULL,
  verified_by_account_id CHAR(36) NULL,
  verification_status VARCHAR(24) NOT NULL DEFAULT 'UNVERIFIED',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  FOREIGN KEY (enrollment_id) REFERENCES eco_education_enrollments(id) ON DELETE RESTRICT,
  FOREIGN KEY (evidence_object_id) REFERENCES eco_object_refs(id) ON DELETE SET NULL,
  FOREIGN KEY (verified_by_account_id) REFERENCES customer_accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_grade_records (
  id CHAR(36) NOT NULL PRIMARY KEY,
  academic_record_id CHAR(36) NOT NULL,
  subject_code VARCHAR(80) NOT NULL,
  grade_value DECIMAL(12,4) NULL,
  grade_scale_code VARCHAR(60) NULL,
  source_note_code VARCHAR(60) NULL,
  verified_status VARCHAR(24) NOT NULL DEFAULT 'UNVERIFIED',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_eco_grade_record (academic_record_id,subject_code),
  FOREIGN KEY (academic_record_id) REFERENCES eco_academic_records(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_learning_goals (
  id CHAR(36) NOT NULL PRIMARY KEY,
  subject_id CHAR(36) NOT NULL,
  goal_code VARCHAR(80) NULL,
  goal_text_object_id CHAR(36) NULL,
  target_date DATE NULL,
  priority SMALLINT UNSIGNED NOT NULL DEFAULT 5,
  status VARCHAR(24) NOT NULL DEFAULT 'PROPOSED',
  human_approved_by CHAR(36) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  KEY idx_eco_goal_subject (subject_id,status,target_date),
  FOREIGN KEY (subject_id) REFERENCES eco_subjects(id) ON DELETE RESTRICT,
  FOREIGN KEY (goal_text_object_id) REFERENCES eco_object_refs(id) ON DELETE SET NULL,
  FOREIGN KEY (human_approved_by) REFERENCES customer_accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_study_plans (
  id CHAR(36) NOT NULL PRIMARY KEY,
  subject_id CHAR(36) NOT NULL,
  owner_account_id CHAR(36) NOT NULL,
  goal_id CHAR(36) NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'DRAFT',
  current_revision_no INT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  KEY idx_eco_study_subject (subject_id,status),
  FOREIGN KEY (subject_id) REFERENCES eco_subjects(id) ON DELETE RESTRICT,
  FOREIGN KEY (owner_account_id) REFERENCES customer_accounts(id) ON DELETE RESTRICT,
  FOREIGN KEY (goal_id) REFERENCES eco_learning_goals(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_study_plan_revisions (
  id CHAR(36) NOT NULL PRIMARY KEY,
  plan_id CHAR(36) NOT NULL,
  revision_no INT UNSIGNED NOT NULL,
  body_object_id CHAR(36) NULL,
  reason_code VARCHAR(80) NULL,
  approved_by_account_id CHAR(36) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_eco_study_rev (plan_id,revision_no),
  FOREIGN KEY (plan_id) REFERENCES eco_study_plans(id) ON DELETE RESTRICT,
  FOREIGN KEY (body_object_id) REFERENCES eco_object_refs(id) ON DELETE SET NULL,
  FOREIGN KEY (approved_by_account_id) REFERENCES customer_accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_study_tasks (
  id CHAR(36) NOT NULL PRIMARY KEY,
  plan_revision_id CHAR(36) NOT NULL,
  task_order INT UNSIGNED NOT NULL,
  task_type VARCHAR(60) NOT NULL,
  scheduled_for DATE NULL,
  duration_minutes INT UNSIGNED NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'PLANNED',
  evidence_object_id CHAR(36) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_eco_study_task (plan_revision_id,task_order),
  FOREIGN KEY (plan_revision_id) REFERENCES eco_study_plan_revisions(id) ON DELETE RESTRICT,
  FOREIGN KEY (evidence_object_id) REFERENCES eco_object_refs(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_progress_measurements (
  id CHAR(36) NOT NULL PRIMARY KEY,
  subject_id CHAR(36) NOT NULL,
  goal_id CHAR(36) NULL,
  dimension_code VARCHAR(80) NOT NULL,
  measure_value DECIMAL(18,5) NULL,
  measure_unit VARCHAR(40) NOT NULL,
  method_code VARCHAR(80) NOT NULL,
  measured_at DATETIME(3) NOT NULL,
  evidence_object_id CHAR(36) NULL,
  verification_status VARCHAR(24) NOT NULL DEFAULT 'UNVERIFIED',
  KEY idx_eco_progress_series (subject_id,dimension_code,measured_at),
  FOREIGN KEY (subject_id) REFERENCES eco_subjects(id) ON DELETE RESTRICT,
  FOREIGN KEY (goal_id) REFERENCES eco_learning_goals(id) ON DELETE SET NULL,
  FOREIGN KEY (evidence_object_id) REFERENCES eco_object_refs(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_learning_observations (
  id CHAR(36) NOT NULL PRIMARY KEY,
  subject_id CHAR(36) NOT NULL,
  observer_account_id CHAR(36) NOT NULL,
  observation_code VARCHAR(70) NOT NULL,
  observed_at DATETIME(3) NOT NULL,
  notes_object_id CHAR(36) NULL,
  consent_id CHAR(36) NULL,
  verification_status VARCHAR(24) NOT NULL DEFAULT 'UNREVIEWED',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_eco_observation_subject (subject_id,observed_at),
  FOREIGN KEY (subject_id) REFERENCES eco_subjects(id) ON DELETE RESTRICT,
  FOREIGN KEY (observer_account_id) REFERENCES customer_accounts(id) ON DELETE RESTRICT,
  FOREIGN KEY (notes_object_id) REFERENCES eco_object_refs(id) ON DELETE SET NULL,
  FOREIGN KEY (consent_id) REFERENCES eco_consent_records(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_learning_milestones (
  id CHAR(36) NOT NULL PRIMARY KEY,
  subject_id CHAR(36) NOT NULL,
  goal_id CHAR(36) NULL,
  milestone_code VARCHAR(80) NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'PLANNED',
  achieved_at DATETIME(3) NULL,
  evidence_object_id CHAR(36) NULL,
  validated_by_account_id CHAR(36) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  FOREIGN KEY (subject_id) REFERENCES eco_subjects(id) ON DELETE RESTRICT,
  FOREIGN KEY (goal_id) REFERENCES eco_learning_goals(id) ON DELETE SET NULL,
  FOREIGN KEY (evidence_object_id) REFERENCES eco_object_refs(id) ON DELETE SET NULL,
  FOREIGN KEY (validated_by_account_id) REFERENCES customer_accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_external_credentials (
  id CHAR(36) NOT NULL PRIMARY KEY,
  subject_id CHAR(36) NOT NULL,
  credential_kind VARCHAR(60) NOT NULL,
  issuer_code VARCHAR(100) NULL,
  credential_reference_hash CHAR(64) NULL,
  evidence_object_id CHAR(36) NULL,
  issued_on DATE NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'SELF_REPORTED',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  FOREIGN KEY (subject_id) REFERENCES eco_subjects(id) ON DELETE RESTRICT,
  FOREIGN KEY (evidence_object_id) REFERENCES eco_object_refs(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_advisor_assignments (
  id CHAR(36) NOT NULL PRIMARY KEY,
  subject_id CHAR(36) NOT NULL,
  advisor_account_id CHAR(36) NOT NULL,
  relationship_code VARCHAR(40) NOT NULL,
  consent_id CHAR(36) NULL,
  starts_at DATETIME(3) NOT NULL,
  ends_at DATETIME(3) NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'PENDING',
  KEY idx_eco_advisor_subject (subject_id,status,ends_at),
  FOREIGN KEY (subject_id) REFERENCES eco_subjects(id) ON DELETE RESTRICT,
  FOREIGN KEY (advisor_account_id) REFERENCES customer_accounts(id) ON DELETE RESTRICT,
  FOREIGN KEY (consent_id) REFERENCES eco_consent_records(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
