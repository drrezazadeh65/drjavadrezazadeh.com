-- Unified Bertina | 004b journal editorial metadata, provenance, editorial RBAC and OJS bridge.
-- Not a substitute for native OJS tables or a claim of indexing/ISI/DOI accreditation.
-- Manuscript/review bodies must be private encrypted objects, never public URLs.
SET NAMES utf8mb4;
SET time_zone = '+00:00';
CREATE TABLE IF NOT EXISTS eco_journals (
  id CHAR(36) NOT NULL PRIMARY KEY,
  journal_code VARCHAR(80) NOT NULL UNIQUE,
  public_name VARCHAR(220) NOT NULL,
  issn_print VARCHAR(12) NULL,
  issn_online VARCHAR(12) NULL,
  owner_org_id CHAR(36) NULL,
  lifecycle_state VARCHAR(32) NOT NULL DEFAULT 'FOUNDING',
  submission_language CHAR(2) NOT NULL DEFAULT 'en',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  FOREIGN KEY (owner_org_id) REFERENCES eco_organizations(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_journal_issues (
  id CHAR(36) NOT NULL PRIMARY KEY,
  journal_id CHAR(36) NOT NULL,
  volume_no INT UNSIGNED NULL,
  issue_no VARCHAR(24) NULL,
  publication_year SMALLINT UNSIGNED NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'PLANNED',
  published_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  FOREIGN KEY (journal_id) REFERENCES eco_journals(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_journal_manuscripts (
  id CHAR(36) NOT NULL PRIMARY KEY,
  journal_id CHAR(36) NOT NULL,
  tracking_code VARCHAR(64) NOT NULL UNIQUE,
  submitter_account_id CHAR(36) NULL,
  manuscript_kind VARCHAR(50) NOT NULL,
  workflow_state VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
  confidentiality_class VARCHAR(32) NOT NULL DEFAULT 'PRIVATE',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  KEY idx_eco_ms_queue (journal_id,workflow_state,created_at),
  FOREIGN KEY (journal_id) REFERENCES eco_journals(id) ON DELETE RESTRICT,
  FOREIGN KEY (submitter_account_id) REFERENCES customer_accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_manuscript_versions (
  id CHAR(36) NOT NULL PRIMARY KEY,
  manuscript_id CHAR(36) NOT NULL,
  revision_no INT UNSIGNED NOT NULL,
  file_object_id CHAR(36) NOT NULL,
  checksum_sha256 CHAR(64) NOT NULL,
  submission_type VARCHAR(36) NOT NULL DEFAULT 'ORIGINAL',
  submitted_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_eco_ms_version (manuscript_id,revision_no),
  FOREIGN KEY (manuscript_id) REFERENCES eco_journal_manuscripts(id) ON DELETE RESTRICT,
  FOREIGN KEY (file_object_id) REFERENCES eco_object_refs(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_editorial_roles (
  id CHAR(36) NOT NULL PRIMARY KEY,
  journal_id CHAR(36) NOT NULL,
  account_id CHAR(36) NOT NULL,
  role_code VARCHAR(60) NOT NULL,
  verification_state VARCHAR(24) NOT NULL DEFAULT 'PENDING',
  effective_from DATETIME(3) NULL,
  effective_until DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_eco_editor_account (account_id,verification_state),
  FOREIGN KEY (journal_id) REFERENCES eco_journals(id) ON DELETE RESTRICT,
  FOREIGN KEY (account_id) REFERENCES customer_accounts(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_review_rounds (
  id CHAR(36) NOT NULL PRIMARY KEY,
  manuscript_id CHAR(36) NOT NULL,
  round_number SMALLINT UNSIGNED NOT NULL,
  opened_at DATETIME(3) NULL,
  closed_at DATETIME(3) NULL,
  state VARCHAR(24) NOT NULL DEFAULT 'PLANNED',
  UNIQUE KEY uq_eco_review_round (manuscript_id,round_number),
  FOREIGN KEY (manuscript_id) REFERENCES eco_journal_manuscripts(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_reviewer_assignments (
  id CHAR(36) NOT NULL PRIMARY KEY,
  round_id CHAR(36) NOT NULL,
  reviewer_account_id CHAR(36) NULL,
  invitation_ref_hash CHAR(64) NULL,
  conflict_declared VARCHAR(24) NOT NULL DEFAULT 'UNDECLARED',
  state VARCHAR(24) NOT NULL DEFAULT 'INVITED',
  invited_at DATETIME(3) NULL,
  due_at DATETIME(3) NULL,
  accepted_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_eco_review_invite (round_id,state,due_at),
  FOREIGN KEY (round_id) REFERENCES eco_review_rounds(id) ON DELETE RESTRICT,
  FOREIGN KEY (reviewer_account_id) REFERENCES customer_accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_review_reports (
  id CHAR(36) NOT NULL PRIMARY KEY,
  assignment_id CHAR(36) NOT NULL,
  report_revision INT UNSIGNED NOT NULL,
  private_report_object_id CHAR(36) NOT NULL,
  recommendation_code VARCHAR(50) NOT NULL,
  integrity_check_state VARCHAR(24) NOT NULL DEFAULT 'PENDING',
  submitted_at DATETIME(3) NULL,
  UNIQUE KEY uq_eco_review_report (assignment_id,report_revision),
  FOREIGN KEY (assignment_id) REFERENCES eco_reviewer_assignments(id) ON DELETE RESTRICT,
  FOREIGN KEY (private_report_object_id) REFERENCES eco_object_refs(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_editorial_decisions (
  id CHAR(36) NOT NULL PRIMARY KEY,
  round_id CHAR(36) NOT NULL,
  editor_account_id CHAR(36) NOT NULL,
  decision_code VARCHAR(50) NOT NULL,
  decision_object_id CHAR(36) NULL,
  decided_at DATETIME(3) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  FOREIGN KEY (round_id) REFERENCES eco_review_rounds(id) ON DELETE RESTRICT,
  FOREIGN KEY (editor_account_id) REFERENCES customer_accounts(id) ON DELETE RESTRICT,
  FOREIGN KEY (decision_object_id) REFERENCES eco_object_refs(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_ojs_external_links (
  id CHAR(36) NOT NULL PRIMARY KEY,
  journal_id CHAR(36) NOT NULL,
  local_entity_kind VARCHAR(70) NOT NULL,
  local_entity_id CHAR(36) NOT NULL,
  ojs_installation_code VARCHAR(80) NOT NULL,
  ojs_entity_type VARCHAR(70) NOT NULL,
  ojs_entity_id VARCHAR(100) NOT NULL,
  last_sync_at DATETIME(3) NULL,
  sync_state VARCHAR(24) NOT NULL DEFAULT 'UNVERIFIED',
  UNIQUE KEY uq_eco_ojs_entity (ojs_installation_code,ojs_entity_type,ojs_entity_id),
  UNIQUE KEY uq_eco_ojs_local (ojs_installation_code,local_entity_kind,local_entity_id),
  FOREIGN KEY (journal_id) REFERENCES eco_journals(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_doi_identifiers (
  id CHAR(36) NOT NULL PRIMARY KEY,
  journal_id CHAR(36) NOT NULL,
  manuscript_id CHAR(36) NULL,
  doi VARCHAR(180) NOT NULL UNIQUE,
  registration_state VARCHAR(24) NOT NULL DEFAULT 'PLANNED',
  provider_receipt_sha256 CHAR(64) NULL,
  confirmed_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  FOREIGN KEY (journal_id) REFERENCES eco_journals(id) ON DELETE RESTRICT,
  FOREIGN KEY (manuscript_id) REFERENCES eco_journal_manuscripts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_journal_publications (
  id CHAR(36) NOT NULL PRIMARY KEY,
  manuscript_id CHAR(36) NOT NULL,
  issue_id CHAR(36) NULL,
  public_content_item_id CHAR(36) NULL,
  doi_id CHAR(36) NULL,
  publication_state VARCHAR(24) NOT NULL DEFAULT 'UNPUBLISHED',
  published_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  FOREIGN KEY (manuscript_id) REFERENCES eco_journal_manuscripts(id) ON DELETE RESTRICT,
  FOREIGN KEY (issue_id) REFERENCES eco_journal_issues(id) ON DELETE SET NULL,
  FOREIGN KEY (public_content_item_id) REFERENCES eco_content_items(id) ON DELETE SET NULL,
  FOREIGN KEY (doi_id) REFERENCES eco_doi_identifiers(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
