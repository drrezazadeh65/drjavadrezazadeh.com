-- JR Konkur 003f: provider-aware mock exams, official scorecard fields and private choice drafts.
-- PROPOSED SOURCE ONLY. Never run before Bertina 003e + 001/003a preflight, tested restore, owner approval.
-- Extends EXISTING drjavad1_store, customer_accounts, eco_subjects, eco_consent_records,
-- eco_object_refs, eco_admission_cycles and eco_admission_programme_offerings. No new login or database.
-- NO STUDENT ROWS OR HISTORICAL SCORECARD IMAGE DATA ARE EMBEDDED. No vendor data scraping.
-- Provider mock-exam TAZ/score, provider ranks and official Sanjesh normalized scores are
-- INCOMPARABLE by default. Schema stores semantics and versions, not fictional conversions.
-- Creating tables does not authorize storing minors' data or selling identifiable datasets.
SET NAMES utf8mb4;
SET time_zone = '+00:00';
USE drjavad1_store;

CREATE TABLE IF NOT EXISTS eco_exam_providers (
  id CHAR(36) NOT NULL PRIMARY KEY,
  provider_code VARCHAR(70) NOT NULL,
  display_name VARCHAR(160) NOT NULL,
  provider_kind ENUM('OFFICIAL_ADMISSION','PRIVATE_MOCK','SCHOOL_FINAL','OTHER') NOT NULL,
  documented_source_url VARCHAR(400) NULL,
  provider_review_state ENUM('DRAFT','REVIEWED','RETIRED') NOT NULL DEFAULT 'DRAFT',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_eep_provider_code (provider_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dynamic scorecard layout across organizations, school years, exams and versions.
CREATE TABLE IF NOT EXISTS eco_exam_scorecard_schemas (
  id CHAR(36) NOT NULL PRIMARY KEY,
  provider_id CHAR(36) NOT NULL,
  admission_year SMALLINT UNSIGNED NOT NULL,
  group_code VARCHAR(80) NOT NULL,
  scorecard_kind VARCHAR(70) NOT NULL,
  schema_revision INT UNSIGNED NOT NULL,
  source_url VARCHAR(400) NULL,
  scorecard_layout_sha256 CHAR(64) NULL,
  review_state ENUM('DRAFT','SOURCE_CHECKED','APPROVED','RETIRED') NOT NULL DEFAULT 'DRAFT',
  approved_by_account_id CHAR(36) NULL,
  approved_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_eess_version (provider_id,admission_year,group_code,scorecard_kind,schema_revision),
  KEY idx_eess_cycle (admission_year,group_code,review_state),
  CONSTRAINT fk_eess_provider FOREIGN KEY (provider_id) REFERENCES eco_exam_providers(id) ON DELETE RESTRICT,
  CONSTRAINT fk_eess_approver FOREIGN KEY (approved_by_account_id) REFERENCES customer_accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Each metric retains its scale and comparison population: scores are NEVER automatically interchangeable.
CREATE TABLE IF NOT EXISTS eco_exam_metric_definitions (
  id CHAR(36) NOT NULL PRIMARY KEY,
  scorecard_schema_id CHAR(36) NOT NULL,
  metric_code VARCHAR(90) NOT NULL,
  subject_code VARCHAR(100) NULL,
  display_name VARCHAR(170) NOT NULL,
  metric_kind ENUM('SUBJECT_PERCENT','RAW_GRADE','MOCK_TAZ','OFFICIAL_NORMALIZED','RANK','PERCENTILE','COUNT_OF_TEN','GRADE_POINT','OTHER') NOT NULL,
  unit_code VARCHAR(40) NOT NULL,
  norm_population_code VARCHAR(100) NULL,
  scale_min DECIMAL(15,5) NULL,
  scale_max DECIMAL(15,5) NULL,
  interpretation_note VARCHAR(350) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_eemd_schema_metric (scorecard_schema_id,metric_code),
  KEY idx_eemd_kind (metric_kind,unit_code),
  CONSTRAINT fk_eemd_schema FOREIGN KEY (scorecard_schema_id) REFERENCES eco_exam_scorecard_schemas(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Institution's own test instance. 1405 mock exam is NOT a 1405 Sanjesh admission result.
CREATE TABLE IF NOT EXISTS eco_exam_events (
  id CHAR(36) NOT NULL PRIMARY KEY,
  scorecard_schema_id CHAR(36) NOT NULL,
  event_code VARCHAR(100) NOT NULL,
  exam_date DATE NULL,
  academic_year_label VARCHAR(40) NULL,
  grade_level_code VARCHAR(40) NULL,
  event_status ENUM('DRAFT','CONFIRMED','CANCELLED') NOT NULL DEFAULT 'DRAFT',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_eee_event (scorecard_schema_id,event_code),
  KEY idx_eee_date (exam_date,event_status),
  CONSTRAINT fk_eee_schema FOREIGN KEY (scorecard_schema_id) REFERENCES eco_exam_scorecard_schemas(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Private self-report belongs to an EXISTING eco_subjects identity and consent record.
-- Application MUST enforce account/guardian relationship, withdrawal and consent scope.
CREATE TABLE IF NOT EXISTS eco_candidate_exam_attempts (
  id CHAR(36) NOT NULL PRIMARY KEY,
  subject_id CHAR(36) NOT NULL,
  exam_event_id CHAR(36) NOT NULL,
  consent_record_id CHAR(36) NOT NULL,
  entered_by_account_id CHAR(36) NOT NULL,
  attempt_sequence SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  evidence_origin ENUM('MANUAL_SELF_REPORT','OWNER_REVIEWED','PROVIDER_VERIFIED') NOT NULL DEFAULT 'MANUAL_SELF_REPORT',
  verification_state ENUM('UNVERIFIED','UNDER_REVIEW','VERIFIED','REVOKED') NOT NULL DEFAULT 'UNVERIFIED',
  observed_at DATETIME(3) NULL,
  retention_until DATETIME(3) NOT NULL,
  deleted_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_ecea_subject_event_attempt (subject_id,exam_event_id,attempt_sequence),
  KEY idx_ecea_subject_date (subject_id,observed_at),
  KEY idx_ecea_owner_retention (entered_by_account_id,retention_until,deleted_at),
  CONSTRAINT fk_ecea_subject FOREIGN KEY (subject_id) REFERENCES eco_subjects(id) ON DELETE RESTRICT,
  CONSTRAINT fk_ecea_event FOREIGN KEY (exam_event_id) REFERENCES eco_exam_events(id) ON DELETE RESTRICT,
  CONSTRAINT fk_ecea_consent FOREIGN KEY (consent_record_id) REFERENCES eco_consent_records(id) ON DELETE RESTRICT,
  CONSTRAINT fk_ecea_author FOREIGN KEY (entered_by_account_id) REFERENCES customer_accounts(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Numeric observations, one reported value per provider-defined metric.
-- Validate definition/event schema equality, range and population in authorized PHP code;
-- never join or rank users across providers without research permission and comparable scales.
CREATE TABLE IF NOT EXISTS eco_candidate_exam_metric_values (
  id CHAR(36) NOT NULL PRIMARY KEY,
  attempt_id CHAR(36) NOT NULL,
  metric_definition_id CHAR(36) NOT NULL,
  reported_value DECIMAL(15,5) NOT NULL,
  verification_state ENUM('SELF_REPORTED','REVIEWED','CORRECTED','WITHDRAWN') NOT NULL DEFAULT 'SELF_REPORTED',
  source_note_code VARCHAR(80) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_ecemv_attempt_metric (attempt_id,metric_definition_id),
  KEY idx_ecemv_metric (metric_definition_id),
  CONSTRAINT fk_ecemv_attempt FOREIGN KEY (attempt_id) REFERENCES eco_candidate_exam_attempts(id) ON DELETE RESTRICT,
  CONSTRAINT fk_ecemv_metric FOREIGN KEY (metric_definition_id) REFERENCES eco_exam_metric_definitions(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Selection lists are private, user ordered and NOT official applications.
-- Null cycle_id permits tentative 1406 plan BEFORE 1406 officially verified documents exist.
CREATE TABLE IF NOT EXISTS eco_candidate_selection_drafts (
  id CHAR(36) NOT NULL PRIMARY KEY,
  subject_id CHAR(36) NOT NULL,
  owner_account_id CHAR(36) NOT NULL,
  consent_record_id CHAR(36) NOT NULL,
  proposed_admission_year SMALLINT UNSIGNED NOT NULL,
  verified_admission_cycle_id CHAR(36) NULL,
  group_code VARCHAR(80) NULL,
  revision_no INT UNSIGNED NOT NULL DEFAULT 1,
  draft_status ENUM('DRAFT','REVIEW_REQUESTED','ARCHIVED') NOT NULL DEFAULT 'DRAFT',
  owner_confirmed_at DATETIME(3) NULL,
  review_account_id CHAR(36) NULL,
  reviewed_revision_no INT UNSIGNED NULL,
  reviewed_at DATETIME(3) NULL,
  retention_until DATETIME(3) NOT NULL,
  deleted_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  KEY idx_ecsd_subject_owner (subject_id,owner_account_id,deleted_at),
  KEY idx_ecsd_year (proposed_admission_year,draft_status),
  CONSTRAINT fk_ecsd_subject FOREIGN KEY (subject_id) REFERENCES eco_subjects(id) ON DELETE RESTRICT,
  CONSTRAINT fk_ecsd_owner FOREIGN KEY (owner_account_id) REFERENCES customer_accounts(id) ON DELETE RESTRICT,
  CONSTRAINT fk_ecsd_consent FOREIGN KEY (consent_record_id) REFERENCES eco_consent_records(id) ON DELETE RESTRICT,
  CONSTRAINT fk_ecsd_cycle FOREIGN KEY (verified_admission_cycle_id) REFERENCES eco_admission_cycles(id) ON DELETE SET NULL,
  CONSTRAINT fk_ecsd_review FOREIGN KEY (review_account_id) REFERENCES customer_accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_candidate_selection_choices (
  id CHAR(36) NOT NULL PRIMARY KEY,
  draft_id CHAR(36) NOT NULL,
  preference_position SMALLINT UNSIGNED NOT NULL,
  user_entered_code VARCHAR(30) NOT NULL,
  verified_offering_id CHAR(36) NULL,
  source_status ENUM('UNVERIFIED','SOURCE_MATCHED','NEEDS_REVIEW','SUPERSEDED') NOT NULL DEFAULT 'UNVERIFIED',
  comment_object_id CHAR(36) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_ecsc_position (draft_id,preference_position),
  KEY idx_ecsc_offering (verified_offering_id),
  CONSTRAINT fk_ecsc_draft FOREIGN KEY (draft_id) REFERENCES eco_candidate_selection_drafts(id) ON DELETE RESTRICT,
  CONSTRAINT fk_ecsc_offering FOREIGN KEY (verified_offering_id) REFERENCES eco_admission_programme_offerings(id) ON DELETE SET NULL,
  CONSTRAINT fk_ecsc_note FOREIGN KEY (comment_object_id) REFERENCES eco_object_refs(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Do not encode any 60% rule globally: cycles, main/nonmain groups and revisions differ.
-- Approved evidence must reference an official numbered PDF page; a mock TAZ cannot be fed into official weight rules.
CREATE TABLE IF NOT EXISTS eco_exam_component_policies (
  id CHAR(36) NOT NULL PRIMARY KEY,
  admission_cycle_id CHAR(36) NOT NULL,
  examination_group_code VARCHAR(80) NOT NULL,
  admission_track_code VARCHAR(60) NOT NULL,
  component_code VARCHAR(80) NOT NULL,
  policy_revision INT UNSIGNED NOT NULL,
  effect_kind ENUM('DEFINITE','POSITIVE','NOT_APPLICABLE','OFFICIAL_CONFIRMATION_REQUIRED') NOT NULL,
  contribution_fraction DECIMAL(8,6) NULL,
  source_page_id CHAR(36) NOT NULL,
  effective_from DATE NULL,
  effective_until DATE NULL,
  review_state ENUM('DRAFT','SOURCE_CHECKED','APPROVED','SUPERSEDED') NOT NULL DEFAULT 'DRAFT',
  reviewed_by_account_id CHAR(36) NULL,
  reviewed_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_eecp_version (admission_cycle_id,examination_group_code,admission_track_code,component_code,policy_revision),
  KEY idx_eecp_review (admission_cycle_id,review_state),
  CONSTRAINT fk_eecp_cycle FOREIGN KEY (admission_cycle_id) REFERENCES eco_admission_cycles(id) ON DELETE RESTRICT,
  CONSTRAINT fk_eecp_page FOREIGN KEY (source_page_id) REFERENCES eco_admission_document_pages(id) ON DELETE RESTRICT,
  CONSTRAINT fk_eecp_reviewer FOREIGN KEY (reviewed_by_account_id) REFERENCES customer_accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- NO SOURCE SCORECARDS INCLUDED. NO DDL EXECUTED. NO AUTOMATIC ACTIVE/APPROVED ROWS.
-- Passwords, government identity numbers, parental contacts and provider login cookies
-- are intentionally absent; uploads/OCR/retention must use existing private object policies
-- and explicit separate acceptance. No user data monetization consent is assumed.
