-- JR Konkur official admission knowledge | PROPOSED additive migration 003e | 2026-10-20
-- SOURCE CONTROL ONLY. DO NOT RUN BEFORE live preflight, tested backup/restore and owner approval.
-- Canonical EXISTING mother DB: drjavad1_store (Bertina MySQL/MariaDB).
-- This file adds only PUBLIC OFFICIAL-KNOWLEDGE metadata: no accounts, scorecards, payments, passwords or OJS.
-- Explicit schema/engine/charset: never alter the database default or existing tables.
-- CREATE TABLE IF NOT EXISTS does NOT compare a preexisting table definition; require schema-drift checks.
-- No data import, activation, mass modification, privilege changes, deploy, or migration-ledger write.
SET NAMES utf8mb4;
SET time_zone = '+00:00';
USE drjavad1_store;

-- 1) One stable cycle per admission year + scope; any number of guides/editions may belong to it.
CREATE TABLE IF NOT EXISTS eco_admission_cycles (
  id CHAR(36) NOT NULL PRIMARY KEY,
  admission_year SMALLINT UNSIGNED NOT NULL,
  scope_code VARCHAR(60) NOT NULL DEFAULT 'NATIONAL',
  authority_code VARCHAR(80) NOT NULL DEFAULT 'SANJESH',
  record_status ENUM('DRAFT','SOURCE_REVIEW','ACTIVE','ARCHIVED') NOT NULL DEFAULT 'DRAFT',
  approved_by_account_id CHAR(36) NULL,
  approved_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_eac_year_scope (admission_year,scope_code),
  KEY idx_eac_status (record_status,admission_year),
  CONSTRAINT fk_eac_approver FOREIGN KEY (approved_by_account_id)
    REFERENCES customer_accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2) Each official PDF/notice has independent version, fingerprint and supersession chain.
-- Drive file IDs are private source pointers, NOT public download authorization.
CREATE TABLE IF NOT EXISTS eco_admission_documents (
  id CHAR(36) NOT NULL PRIMARY KEY,
  cycle_id CHAR(36) NOT NULL,
  document_code VARCHAR(120) NOT NULL,
  revision_no INT UNSIGNED NOT NULL,
  document_kind VARCHAR(50) NOT NULL, -- Versioned controlled vocabulary; new guide categories require NO ALTER TABLE.
  examination_group_code VARCHAR(80) NULL,
  issuer_code VARCHAR(80) NOT NULL DEFAULT 'SANJESH',
  source_external_id VARCHAR(191) NULL,
  storage_object_id CHAR(36) NULL,
  original_pdf_sha256 CHAR(64) NULL,
  pdf_page_count INT UNSIGNED NULL,
  published_on DATE NULL,
  effective_on DATE NULL,
  supersedes_document_id CHAR(36) NULL,
  document_review_state ENUM('DRAFT','OWNER_CONFIRMED','SOURCE_VERIFIED','QA_APPROVED','SUPERSEDED') NOT NULL DEFAULT 'DRAFT',
  reviewed_by_account_id CHAR(36) NULL,
  reviewed_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_ead_document_revision (cycle_id,document_code,revision_no),
  KEY idx_ead_cycle_kind (cycle_id,document_kind,document_review_state),
  KEY idx_ead_supersedes (supersedes_document_id),
  CONSTRAINT fk_ead_cycle FOREIGN KEY (cycle_id)
    REFERENCES eco_admission_cycles(id) ON DELETE RESTRICT,
  CONSTRAINT fk_ead_storage FOREIGN KEY (storage_object_id)
    REFERENCES eco_object_refs(id) ON DELETE SET NULL,
  CONSTRAINT fk_ead_supersedes FOREIGN KEY (supersedes_document_id)
    REFERENCES eco_admission_documents(id) ON DELETE RESTRICT,
  CONSTRAINT fk_ead_reviewer FOREIGN KEY (reviewed_by_account_id)
    REFERENCES customer_accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3) Source-page provenance and human comparison of tables against original PDF.
CREATE TABLE IF NOT EXISTS eco_admission_document_pages (
  id CHAR(36) NOT NULL PRIMARY KEY,
  document_id CHAR(36) NOT NULL,
  pdf_page_number INT UNSIGNED NOT NULL,
  printed_page_label VARCHAR(36) NULL,
  page_image_sha256 CHAR(64) NULL,
  extraction_sha256 CHAR(64) NULL,
  page_review_state ENUM('UNREVIEWED','DISCREPANT','REVIEWED') NOT NULL DEFAULT 'UNREVIEWED',
  reviewed_by_account_id CHAR(36) NULL,
  reviewed_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_eap_document_page (document_id,pdf_page_number),
  KEY idx_eap_review (document_id,page_review_state),
  CONSTRAINT fk_eap_document FOREIGN KEY (document_id)
    REFERENCES eco_admission_documents(id) ON DELETE RESTRICT,
  CONSTRAINT fk_eap_reviewer FOREIGN KEY (reviewed_by_account_id)
    REFERENCES customer_accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4) Independent imports/algorithms can be reproduced without mutating document evidence.
CREATE TABLE IF NOT EXISTS eco_admission_import_batches (
  id CHAR(36) NOT NULL PRIMARY KEY,
  document_id CHAR(36) NOT NULL,
  intake_version VARCHAR(50) NOT NULL,
  extraction_kind ENUM('TEXT','PDF_TABLE','MANUAL_REVIEW') NOT NULL,
  extraction_sha256 CHAR(64) NULL,
  batch_status ENUM('STAGED','REVIEWING','REJECTED','ACCEPTED') NOT NULL DEFAULT 'STAGED',
  created_by_account_id CHAR(36) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_eab_doc_state (document_id,batch_status,created_at),
  CONSTRAINT fk_eab_doc FOREIGN KEY (document_id)
    REFERENCES eco_admission_documents(id) ON DELETE RESTRICT,
  CONSTRAINT fk_eab_creator FOREIGN KEY (created_by_account_id)
    REFERENCES customer_accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5) Unclassified tokens and draft rows live ONLY in staging. They are never queryable as verified programmes.
CREATE TABLE IF NOT EXISTS eco_admission_import_rows (
  id CHAR(36) NOT NULL PRIMARY KEY,
  batch_id CHAR(36) NOT NULL,
  row_ordinal INT UNSIGNED NOT NULL,
  candidate_code VARCHAR(30) NULL,
  proposed_page_number INT UNSIGNED NULL,
  proposed_institution VARCHAR(220) NULL,
  proposed_programme VARCHAR(220) NULL,
  proposed_capacity INT UNSIGNED NULL,
  extracted_fragment_sha256 CHAR(64) NULL,
  review_state ENUM('UNREVIEWED','REJECTED','CORRECTED','SOURCE_MATCHED') NOT NULL DEFAULT 'UNREVIEWED',
  review_issue_code VARCHAR(100) NULL,
  reviewed_by_account_id CHAR(36) NULL,
  reviewed_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_eair_batch_row (batch_id,row_ordinal),
  KEY idx_eair_token_review (candidate_code,review_state),
  CONSTRAINT fk_eair_batch FOREIGN KEY (batch_id)
    REFERENCES eco_admission_import_batches(id) ON DELETE RESTRICT,
  CONSTRAINT fk_eair_reviewer FOREIGN KEY (reviewed_by_account_id)
    REFERENCES customer_accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6) Source-traceable programme-location revisions: no destructive overwrite of amendments.
-- Existing eco_institutions is reused when independently matched; source snapshot name retained.
CREATE TABLE IF NOT EXISTS eco_admission_programme_offerings (
  id CHAR(36) NOT NULL PRIMARY KEY,
  cycle_id CHAR(36) NOT NULL,
  examination_group_code VARCHAR(80) NOT NULL,
  admission_track_code VARCHAR(60) NOT NULL,
  programme_location_code VARCHAR(30) NOT NULL,
  record_revision INT UNSIGNED NOT NULL DEFAULT 1,
  institution_id CHAR(36) NULL,
  official_institution_name VARCHAR(220) NOT NULL,
  campus_name VARCHAR(220) NULL,
  province_name VARCHAR(100) NULL,
  city_name VARCHAR(100) NULL,
  programme_title VARCHAR(220) NOT NULL,
  degree_code VARCHAR(80) NULL,
  admission_method_code VARCHAR(80) NULL,
  capacity INT UNSIGNED NULL,
  tuition_status VARCHAR(60) NULL,
  source_page_id CHAR(36) NOT NULL,
  normalized_row_sha256 CHAR(64) NOT NULL,
  conditions_review_state ENUM('UNREVIEWED','COMPLETE') NOT NULL DEFAULT 'UNREVIEWED',
  conditions_reviewed_by_account_id CHAR(36) NULL,
  conditions_reviewed_at DATETIME(3) NULL,
  supersedes_offering_id CHAR(36) NULL,
  review_state ENUM('DRAFT','SOURCE_CHECKED','APPROVED','SUPERSEDED') NOT NULL DEFAULT 'DRAFT',
  approved_by_account_id CHAR(36) NULL,
  approved_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_eapo_cycle_code_revision
    (cycle_id,examination_group_code,admission_track_code,programme_location_code,record_revision),
  KEY idx_eapo_lookup (cycle_id,examination_group_code,review_state,programme_title),
  KEY idx_eapo_location (cycle_id,province_name,city_name),
  KEY idx_eapo_source (source_page_id,review_state),
  CONSTRAINT fk_eapo_cycle FOREIGN KEY (cycle_id)
    REFERENCES eco_admission_cycles(id) ON DELETE RESTRICT,
  CONSTRAINT fk_eapo_institution FOREIGN KEY (institution_id)
    REFERENCES eco_institutions(id) ON DELETE SET NULL,
  CONSTRAINT fk_eapo_page FOREIGN KEY (source_page_id)
    REFERENCES eco_admission_document_pages(id) ON DELETE RESTRICT,
  CONSTRAINT fk_eapo_supersedes FOREIGN KEY (supersedes_offering_id)
    REFERENCES eco_admission_programme_offerings(id) ON DELETE RESTRICT,
  CONSTRAINT fk_eapo_approver FOREIGN KEY (approved_by_account_id)
    REFERENCES customer_accounts(id) ON DELETE SET NULL,
  CONSTRAINT fk_eapo_conditions_reviewer FOREIGN KEY (conditions_reviewed_by_account_id)
    REFERENCES customer_accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7) Special requirements, local quotas, tuition and commitments remain explicit source facts.
-- A condition is a descriptive sourced fact until approved as a deterministic rule separately.
CREATE TABLE IF NOT EXISTS eco_admission_offering_conditions (
  id CHAR(36) NOT NULL PRIMARY KEY,
  offering_id CHAR(36) NOT NULL,
  condition_code VARCHAR(100) NOT NULL,
  condition_kind VARCHAR(60) NOT NULL,
  official_text_excerpt TEXT NOT NULL,
  source_page_id CHAR(36) NOT NULL,
  review_state ENUM('DRAFT','SOURCE_CHECKED','APPROVED','SUPERSEDED') NOT NULL DEFAULT 'DRAFT',
  approved_by_account_id CHAR(36) NULL,
  approved_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_eaoc_offering_code (offering_id,condition_code),
  KEY idx_eaoc_source (source_page_id,review_state),
  CONSTRAINT fk_eaoc_offering FOREIGN KEY (offering_id)
    REFERENCES eco_admission_programme_offerings(id) ON DELETE RESTRICT,
  CONSTRAINT fk_eaoc_page FOREIGN KEY (source_page_id)
    REFERENCES eco_admission_document_pages(id) ON DELETE RESTRICT,
  CONSTRAINT fk_eaoc_approver FOREIGN KEY (approved_by_account_id)
    REFERENCES customer_accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8) An official condition becomes machine-actionable only after explicit rule QA + review.
-- No statistical admission probability or implicit eligibility is generated by these rows.
CREATE TABLE IF NOT EXISTS eco_admission_rule_versions (
  id CHAR(36) NOT NULL PRIMARY KEY,
  cycle_id CHAR(36) NOT NULL,
  rule_code VARCHAR(100) NOT NULL,
  rule_revision INT UNSIGNED NOT NULL,
  scope_code VARCHAR(60) NOT NULL,
  offering_id CHAR(36) NULL,
  candidate_field_code VARCHAR(100) NOT NULL,
  operator_code ENUM('EQUALS','NOT_EQUALS','IN_SET','OFFICIAL_CONFIRMATION') NOT NULL,
  comparison_value_json LONGTEXT NULL,
  source_page_id CHAR(36) NOT NULL,
  effective_from DATE NULL,
  effective_until DATE NULL,
  review_state ENUM('DRAFT','SOURCE_CHECKED','APPROVED','SUPERSEDED') NOT NULL DEFAULT 'DRAFT',
  approved_by_account_id CHAR(36) NULL,
  approved_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_earv_cycle_rule_revision (cycle_id,rule_code,rule_revision),
  KEY idx_earv_scope_state (cycle_id,scope_code,review_state),
  KEY idx_earv_offering (offering_id),
  CONSTRAINT fk_earv_cycle FOREIGN KEY (cycle_id)
    REFERENCES eco_admission_cycles(id) ON DELETE RESTRICT,
  CONSTRAINT fk_earv_offering FOREIGN KEY (offering_id)
    REFERENCES eco_admission_programme_offerings(id) ON DELETE RESTRICT,
  CONSTRAINT fk_earv_page FOREIGN KEY (source_page_id)
    REFERENCES eco_admission_document_pages(id) ON DELETE RESTRICT,
  CONSTRAINT fk_earv_approver FOREIGN KEY (approved_by_account_id)
    REFERENCES customer_accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- NO INSERT/UPDATE/DELETE/DROP/ALTER/REPLACE statements deliberately.
-- No activation, no automatic promotion of STAGED to APPROVED, no public view created.
-- Before using a row in an API verify: same cycle and amendment lineage, APPROVED row
-- + approved document + reviewed PDF page + approved relevant rules/conditions.
-- Validate full schema/fingerprint against this file; do not rely solely on IF NOT EXISTS.
