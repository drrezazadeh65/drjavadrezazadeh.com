-- Unified Bertina | 003c assessment versioning, response provenance and human approval.
-- Never treat raw/derived scores as scientifically validated without independent evidence.
SET NAMES utf8mb4;
SET time_zone = '+00:00';
CREATE TABLE IF NOT EXISTS eco_assessment_instruments (
  id CHAR(36) NOT NULL PRIMARY KEY,
  instrument_code VARCHAR(100) NOT NULL UNIQUE,
  purpose_code VARCHAR(80) NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'DRAFT',
  validation_state VARCHAR(32) NOT NULL DEFAULT 'UNVALIDATED',
  owner_org_id CHAR(36) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  FOREIGN KEY (owner_org_id) REFERENCES eco_organizations(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_instrument_versions (
  id CHAR(36) NOT NULL PRIMARY KEY,
  instrument_id CHAR(36) NOT NULL,
  version_label VARCHAR(40) NOT NULL,
  content_hash CHAR(64) NOT NULL,
  language_code CHAR(2) NOT NULL DEFAULT 'fa',
  status VARCHAR(24) NOT NULL DEFAULT 'DRAFT',
  approved_by_account_id CHAR(36) NULL,
  approved_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_eco_instrument_ver (instrument_id,version_label,language_code),
  FOREIGN KEY (instrument_id) REFERENCES eco_assessment_instruments(id) ON DELETE RESTRICT,
  FOREIGN KEY (approved_by_account_id) REFERENCES customer_accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_assessment_dimensions (
  id CHAR(36) NOT NULL PRIMARY KEY,
  instrument_version_id CHAR(36) NOT NULL,
  dimension_code VARCHAR(80) NOT NULL,
  sort_order SMALLINT UNSIGNED NOT NULL,
  construct_definition_ref CHAR(36) NULL,
  UNIQUE KEY uq_eco_dim_ver (instrument_version_id,dimension_code),
  FOREIGN KEY (instrument_version_id) REFERENCES eco_instrument_versions(id) ON DELETE RESTRICT,
  FOREIGN KEY (construct_definition_ref) REFERENCES eco_object_refs(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_assessment_items (
  id CHAR(36) NOT NULL PRIMARY KEY,
  instrument_version_id CHAR(36) NOT NULL,
  dimension_id CHAR(36) NULL,
  item_code VARCHAR(80) NOT NULL,
  display_order INT UNSIGNED NOT NULL,
  item_type VARCHAR(32) NOT NULL,
  prompt_object_id CHAR(36) NULL,
  is_sensitive TINYINT(1) NOT NULL DEFAULT 0,
  UNIQUE KEY uq_eco_item_ver (instrument_version_id,item_code),
  FOREIGN KEY (instrument_version_id) REFERENCES eco_instrument_versions(id) ON DELETE RESTRICT,
  FOREIGN KEY (dimension_id) REFERENCES eco_assessment_dimensions(id) ON DELETE SET NULL,
  FOREIGN KEY (prompt_object_id) REFERENCES eco_object_refs(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_assessment_options (
  id CHAR(36) NOT NULL PRIMARY KEY,
  item_id CHAR(36) NOT NULL,
  option_code VARCHAR(80) NOT NULL,
  display_order SMALLINT UNSIGNED NOT NULL,
  label_object_id CHAR(36) NULL,
  UNIQUE KEY uq_eco_item_option (item_id,option_code),
  FOREIGN KEY (item_id) REFERENCES eco_assessment_items(id) ON DELETE RESTRICT,
  FOREIGN KEY (label_object_id) REFERENCES eco_object_refs(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_assessment_sessions (
  id CHAR(36) NOT NULL PRIMARY KEY,
  subject_id CHAR(36) NOT NULL,
  instrument_version_id CHAR(36) NOT NULL,
  consent_id CHAR(36) NULL,
  facilitator_account_id CHAR(36) NULL,
  locale CHAR(2) NOT NULL DEFAULT 'fa',
  status VARCHAR(28) NOT NULL DEFAULT 'CREATED',
  started_at DATETIME(3) NULL,
  submitted_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  KEY idx_eco_assess_subject (subject_id,created_at),
  FOREIGN KEY (subject_id) REFERENCES eco_subjects(id) ON DELETE RESTRICT,
  FOREIGN KEY (instrument_version_id) REFERENCES eco_instrument_versions(id) ON DELETE RESTRICT,
  FOREIGN KEY (consent_id) REFERENCES eco_consent_records(id) ON DELETE SET NULL,
  FOREIGN KEY (facilitator_account_id) REFERENCES customer_accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_assessment_responses (
  id CHAR(36) NOT NULL PRIMARY KEY,
  session_id CHAR(36) NOT NULL,
  item_id CHAR(36) NOT NULL,
  selected_option_id CHAR(36) NULL,
  response_object_id CHAR(36) NULL,
  response_numeric DECIMAL(18,6) NULL,
  recorded_at DATETIME(3) NOT NULL,
  UNIQUE KEY uq_eco_response_item (session_id,item_id),
  FOREIGN KEY (session_id) REFERENCES eco_assessment_sessions(id) ON DELETE RESTRICT,
  FOREIGN KEY (item_id) REFERENCES eco_assessment_items(id) ON DELETE RESTRICT,
  FOREIGN KEY (selected_option_id) REFERENCES eco_assessment_options(id) ON DELETE SET NULL,
  FOREIGN KEY (response_object_id) REFERENCES eco_object_refs(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_scoring_models (
  id CHAR(36) NOT NULL PRIMARY KEY,
  instrument_version_id CHAR(36) NOT NULL,
  model_code VARCHAR(80) NOT NULL,
  revision_no INT UNSIGNED NOT NULL,
  algorithm_sha256 CHAR(64) NOT NULL,
  validation_state VARCHAR(32) NOT NULL DEFAULT 'NOT_PILOTED',
  governance_object_id CHAR(36) NULL,
  approved_by_account_id CHAR(36) NULL,
  UNIQUE KEY uq_eco_scoring_ver (instrument_version_id,model_code,revision_no),
  FOREIGN KEY (instrument_version_id) REFERENCES eco_instrument_versions(id) ON DELETE RESTRICT,
  FOREIGN KEY (governance_object_id) REFERENCES eco_object_refs(id) ON DELETE SET NULL,
  FOREIGN KEY (approved_by_account_id) REFERENCES customer_accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_score_runs (
  id CHAR(36) NOT NULL PRIMARY KEY,
  session_id CHAR(36) NOT NULL,
  scoring_model_id CHAR(36) NOT NULL,
  input_sha256 CHAR(64) NOT NULL,
  output_sha256 CHAR(64) NOT NULL,
  state VARCHAR(24) NOT NULL DEFAULT 'UNREVIEWED',
  executed_at DATETIME(3) NOT NULL,
  human_review_required TINYINT(1) NOT NULL DEFAULT 1,
  UNIQUE KEY uq_eco_score_model_input (session_id,scoring_model_id,input_sha256),
  FOREIGN KEY (session_id) REFERENCES eco_assessment_sessions(id) ON DELETE RESTRICT,
  FOREIGN KEY (scoring_model_id) REFERENCES eco_scoring_models(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_score_dimensions (
  id CHAR(36) NOT NULL PRIMARY KEY,
  score_run_id CHAR(36) NOT NULL,
  dimension_id CHAR(36) NOT NULL,
  raw_value DECIMAL(18,6) NULL,
  scaled_value DECIMAL(18,6) NULL,
  scale_code VARCHAR(70) NULL,
  interpretability_flag VARCHAR(32) NOT NULL DEFAULT 'UNCERTIFIED',
  UNIQUE KEY uq_eco_score_dim (score_run_id,dimension_id),
  FOREIGN KEY (score_run_id) REFERENCES eco_score_runs(id) ON DELETE RESTRICT,
  FOREIGN KEY (dimension_id) REFERENCES eco_assessment_dimensions(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_interpretation_templates (
  id CHAR(36) NOT NULL PRIMARY KEY,
  instrument_version_id CHAR(36) NOT NULL,
  template_version VARCHAR(40) NOT NULL,
  locale CHAR(2) NOT NULL,
  template_object_id CHAR(36) NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'DRAFT',
  UNIQUE KEY uq_eco_interpret_version (instrument_version_id,template_version,locale),
  FOREIGN KEY (instrument_version_id) REFERENCES eco_instrument_versions(id) ON DELETE RESTRICT,
  FOREIGN KEY (template_object_id) REFERENCES eco_object_refs(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_assessment_reports (
  id CHAR(36) NOT NULL PRIMARY KEY,
  session_id CHAR(36) NOT NULL,
  score_run_id CHAR(36) NULL,
  template_id CHAR(36) NULL,
  report_object_id CHAR(36) NULL,
  report_status VARCHAR(24) NOT NULL DEFAULT 'DRAFT',
  human_approved_by CHAR(36) NULL,
  approved_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_eco_report_session (session_id,report_status),
  FOREIGN KEY (session_id) REFERENCES eco_assessment_sessions(id) ON DELETE RESTRICT,
  FOREIGN KEY (score_run_id) REFERENCES eco_score_runs(id) ON DELETE SET NULL,
  FOREIGN KEY (template_id) REFERENCES eco_interpretation_templates(id) ON DELETE SET NULL,
  FOREIGN KEY (report_object_id) REFERENCES eco_object_refs(id) ON DELETE SET NULL,
  FOREIGN KEY (human_approved_by) REFERENCES customer_accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_assessment_reviews (
  id CHAR(36) NOT NULL PRIMARY KEY,
  report_id CHAR(36) NOT NULL,
  reviewer_account_id CHAR(36) NOT NULL,
  decision_code VARCHAR(32) NOT NULL,
  evidence_object_id CHAR(36) NULL,
  limitations_object_id CHAR(36) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  FOREIGN KEY (report_id) REFERENCES eco_assessment_reports(id) ON DELETE RESTRICT,
  FOREIGN KEY (reviewer_account_id) REFERENCES customer_accounts(id) ON DELETE RESTRICT,
  FOREIGN KEY (evidence_object_id) REFERENCES eco_object_refs(id) ON DELETE SET NULL,
  FOREIGN KEY (limitations_object_id) REFERENCES eco_object_refs(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
