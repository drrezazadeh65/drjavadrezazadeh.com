-- Unified Bertina | 004c research governance and pseudonymisation.
-- Isolate identity bridges, honour consent and legal holds; no public exports without approval.
SET NAMES utf8mb4;
SET time_zone = '+00:00';
CREATE TABLE IF NOT EXISTS eco_research_studies (
  id CHAR(36) NOT NULL PRIMARY KEY,
  study_code VARCHAR(90) NOT NULL UNIQUE,
  owner_organization_id CHAR(36) NULL,
  principal_investigator_account_id CHAR(36) NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'DRAFT',
  ethics_reference VARCHAR(150) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  FOREIGN KEY (owner_organization_id) REFERENCES eco_organizations(id) ON DELETE SET NULL,
  FOREIGN KEY (principal_investigator_account_id) REFERENCES customer_accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_research_protocol_versions (
  id CHAR(36) NOT NULL PRIMARY KEY,
  study_id CHAR(36) NOT NULL,
  protocol_revision INT UNSIGNED NOT NULL,
  protocol_object_id CHAR(36) NOT NULL,
  protocol_sha256 CHAR(64) NOT NULL,
  approval_state VARCHAR(24) NOT NULL DEFAULT 'DRAFT',
  ethics_approved_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_eco_protocol_rev (study_id,protocol_revision),
  FOREIGN KEY (study_id) REFERENCES eco_research_studies(id) ON DELETE RESTRICT,
  FOREIGN KEY (protocol_object_id) REFERENCES eco_object_refs(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_research_cases (
  id CHAR(36) NOT NULL PRIMARY KEY,
  study_id CHAR(36) NOT NULL,
  pseudonym VARCHAR(120) NOT NULL,
  case_state VARCHAR(24) NOT NULL DEFAULT 'SCREENING',
  enrolled_at DATETIME(3) NULL,
  withdrawn_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_eco_study_pseudonym (study_id,pseudonym),
  FOREIGN KEY (study_id) REFERENCES eco_research_studies(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_research_identity_bridges (
  id CHAR(36) NOT NULL PRIMARY KEY,
  research_case_id CHAR(36) NOT NULL,
  subject_id CHAR(36) NOT NULL,
  relationship_basis VARCHAR(50) NOT NULL,
  created_by_account_id CHAR(36) NOT NULL,
  expires_at DATETIME(3) NULL,
  access_state VARCHAR(24) NOT NULL DEFAULT 'LOCKED',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_eco_research_bridge (research_case_id,subject_id),
  FOREIGN KEY (research_case_id) REFERENCES eco_research_cases(id) ON DELETE RESTRICT,
  FOREIGN KEY (subject_id) REFERENCES eco_subjects(id) ON DELETE RESTRICT,
  FOREIGN KEY (created_by_account_id) REFERENCES customer_accounts(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_research_consent_snapshots (
  id CHAR(36) NOT NULL PRIMARY KEY,
  research_case_id CHAR(36) NOT NULL,
  consent_record_id CHAR(36) NOT NULL,
  protocol_version_id CHAR(36) NOT NULL,
  snapshot_sha256 CHAR(64) NOT NULL,
  valid_from DATETIME(3) NOT NULL,
  withdrawn_at DATETIME(3) NULL,
  FOREIGN KEY (research_case_id) REFERENCES eco_research_cases(id) ON DELETE RESTRICT,
  FOREIGN KEY (consent_record_id) REFERENCES eco_consent_records(id) ON DELETE RESTRICT,
  FOREIGN KEY (protocol_version_id) REFERENCES eco_research_protocol_versions(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_research_codebooks (
  id CHAR(36) NOT NULL PRIMARY KEY,
  study_id CHAR(36) NOT NULL,
  version_label VARCHAR(50) NOT NULL,
  definition_object_id CHAR(36) NULL,
  approved_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_eco_codebook_ver (study_id,version_label),
  FOREIGN KEY (study_id) REFERENCES eco_research_studies(id) ON DELETE RESTRICT,
  FOREIGN KEY (definition_object_id) REFERENCES eco_object_refs(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_research_codes (
  id CHAR(36) NOT NULL PRIMARY KEY,
  codebook_id CHAR(36) NOT NULL,
  code VARCHAR(80) NOT NULL,
  definition_object_id CHAR(36) NULL,
  parent_code_id CHAR(36) NULL,
  UNIQUE KEY uq_eco_codebook_term (codebook_id,code),
  FOREIGN KEY (codebook_id) REFERENCES eco_research_codebooks(id) ON DELETE RESTRICT,
  FOREIGN KEY (definition_object_id) REFERENCES eco_object_refs(id) ON DELETE SET NULL,
  FOREIGN KEY (parent_code_id) REFERENCES eco_research_codes(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_research_annotations (
  id CHAR(36) NOT NULL PRIMARY KEY,
  research_case_id CHAR(36) NOT NULL,
  research_code_id CHAR(36) NOT NULL,
  coder_account_id CHAR(36) NOT NULL,
  source_object_id CHAR(36) NULL,
  annotation_object_id CHAR(36) NULL,
  coded_at DATETIME(3) NOT NULL,
  review_state VARCHAR(24) NOT NULL DEFAULT 'UNREVIEWED',
  FOREIGN KEY (research_case_id) REFERENCES eco_research_cases(id) ON DELETE RESTRICT,
  FOREIGN KEY (research_code_id) REFERENCES eco_research_codes(id) ON DELETE RESTRICT,
  FOREIGN KEY (coder_account_id) REFERENCES customer_accounts(id) ON DELETE RESTRICT,
  FOREIGN KEY (source_object_id) REFERENCES eco_object_refs(id) ON DELETE SET NULL,
  FOREIGN KEY (annotation_object_id) REFERENCES eco_object_refs(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_research_ethics_reviews (
  id CHAR(36) NOT NULL PRIMARY KEY,
  study_id CHAR(36) NOT NULL,
  protocol_version_id CHAR(36) NULL,
  reviewer_account_id CHAR(36) NULL,
  decision_code VARCHAR(40) NOT NULL,
  decision_evidence_id CHAR(36) NULL,
  decision_at DATETIME(3) NOT NULL,
  FOREIGN KEY (study_id) REFERENCES eco_research_studies(id) ON DELETE RESTRICT,
  FOREIGN KEY (protocol_version_id) REFERENCES eco_research_protocol_versions(id) ON DELETE SET NULL,
  FOREIGN KEY (reviewer_account_id) REFERENCES customer_accounts(id) ON DELETE SET NULL,
  FOREIGN KEY (decision_evidence_id) REFERENCES eco_object_refs(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_deidentification_runs (
  id CHAR(36) NOT NULL PRIMARY KEY,
  study_id CHAR(36) NOT NULL,
  algorithm_revision VARCHAR(60) NOT NULL,
  input_hash CHAR(64) NOT NULL,
  output_hash CHAR(64) NOT NULL,
  risk_review_status VARCHAR(24) NOT NULL DEFAULT 'PENDING',
  executed_by_account_id CHAR(36) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  FOREIGN KEY (study_id) REFERENCES eco_research_studies(id) ON DELETE RESTRICT,
  FOREIGN KEY (executed_by_account_id) REFERENCES customer_accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_dataset_freezes (
  id CHAR(36) NOT NULL PRIMARY KEY,
  study_id CHAR(36) NOT NULL,
  freeze_label VARCHAR(60) NOT NULL,
  source_hash CHAR(64) NOT NULL,
  dataset_object_id CHAR(36) NOT NULL,
  deidentification_run_id CHAR(36) NULL,
  governance_status VARCHAR(24) NOT NULL DEFAULT 'UNREVIEWED',
  frozen_at DATETIME(3) NOT NULL,
  UNIQUE KEY uq_eco_dataset_freeze (study_id,freeze_label),
  FOREIGN KEY (study_id) REFERENCES eco_research_studies(id) ON DELETE RESTRICT,
  FOREIGN KEY (dataset_object_id) REFERENCES eco_object_refs(id) ON DELETE RESTRICT,
  FOREIGN KEY (deidentification_run_id) REFERENCES eco_deidentification_runs(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_dataset_exports (
  id CHAR(36) NOT NULL PRIMARY KEY,
  dataset_freeze_id CHAR(36) NOT NULL,
  exporter_account_id CHAR(36) NOT NULL,
  recipient_scope VARCHAR(70) NOT NULL,
  export_object_id CHAR(36) NULL,
  reviewer_account_id CHAR(36) NULL,
  export_state VARCHAR(24) NOT NULL DEFAULT 'PENDING',
  approved_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  FOREIGN KEY (dataset_freeze_id) REFERENCES eco_dataset_freezes(id) ON DELETE RESTRICT,
  FOREIGN KEY (exporter_account_id) REFERENCES customer_accounts(id) ON DELETE RESTRICT,
  FOREIGN KEY (export_object_id) REFERENCES eco_object_refs(id) ON DELETE SET NULL,
  FOREIGN KEY (reviewer_account_id) REFERENCES customer_accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_research_access_grants (
  id CHAR(36) NOT NULL PRIMARY KEY,
  study_id CHAR(36) NOT NULL,
  account_id CHAR(36) NOT NULL,
  access_role VARCHAR(60) NOT NULL,
  data_scope VARCHAR(60) NOT NULL,
  approved_by_account_id CHAR(36) NULL,
  expires_at DATETIME(3) NULL,
  revoked_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_eco_research_access (account_id,study_id,expires_at),
  FOREIGN KEY (study_id) REFERENCES eco_research_studies(id) ON DELETE RESTRICT,
  FOREIGN KEY (account_id) REFERENCES customer_accounts(id) ON DELETE RESTRICT,
  FOREIGN KEY (approved_by_account_id) REFERENCES customer_accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
