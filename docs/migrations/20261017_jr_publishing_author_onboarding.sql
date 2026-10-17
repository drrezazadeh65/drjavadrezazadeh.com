-- JR Publishing author KYC / settlement onboarding (SOURCE ONLY; NOT APPLIED).
-- Additive extension to the SAME Bertina mother DB. Apply ONLY at the owner's final
-- joint host migration step, AFTER canonical publishing base + contract/reserve
-- migrations and separately tested backup/restore. Never import experimental jr_pub_*.
-- PII ciphertext uses application-managed AES-256-GCM; private evidence files live
-- outside public_html, never in Git or document URLs. No new login/payment system.
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS publishing_author_profiles (
  author_id CHAR(36) NOT NULL PRIMARY KEY,
  legal_name_fa VARCHAR(180) NOT NULL,
  legal_name_en VARCHAR(180) NOT NULL,
  academic_title VARCHAR(120) NOT NULL DEFAULT '',
  affiliation VARCHAR(240) NOT NULL DEFAULT '',
  specialization VARCHAR(500) NOT NULL DEFAULT '',
  orcid VARCHAR(25) NOT NULL DEFAULT '',
  professional_bio TEXT NULL,
  identity_kind ENUM('iran_national_id','passport') NOT NULL,
  identity_reference_sealed TEXT NOT NULL,
  birth_date_sealed TEXT NULL,
  mobile_sealed TEXT NULL,
  address_sealed TEXT NULL,
  cv_public_consent TINYINT(1) NOT NULL DEFAULT 0,
  privacy_consent_version VARCHAR(64) NOT NULL,
  review_state ENUM('submitted','changes_requested','approved','suspended') NOT NULL DEFAULT 'submitted',
  review_note VARCHAR(600) NULL,
  reviewed_by CHAR(36) NULL,
  reviewed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_pub_author_profile_review (review_state,updated_at),
  CONSTRAINT fk_pub_profile_author FOREIGN KEY(author_id) REFERENCES publishing_authors(id) ON DELETE RESTRICT,
  CONSTRAINT fk_pub_profile_reviewer FOREIGN KEY(reviewed_by) REFERENCES customer_accounts(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS publishing_author_bank_accounts (
  author_id CHAR(36) NOT NULL PRIMARY KEY,
  holder_name VARCHAR(180) NOT NULL,
  bank_name VARCHAR(140) NOT NULL,
  card_last4 CHAR(4) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  iban_last4 CHAR(4) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  card_sealed TEXT NOT NULL,
  iban_sealed TEXT NOT NULL,
  review_state ENUM('submitted','changes_requested','verified','suspended') NOT NULL DEFAULT 'submitted',
  review_note VARCHAR(600) NULL,
  reviewed_by CHAR(36) NULL,
  reviewed_at DATETIME NULL,
  verified_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_pub_author_bank_review (review_state,updated_at),
  CONSTRAINT fk_pub_bank_author FOREIGN KEY(author_id) REFERENCES publishing_authors(id) ON DELETE RESTRICT,
  CONSTRAINT fk_pub_bank_reviewer FOREIGN KEY(reviewed_by) REFERENCES customer_accounts(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS publishing_author_documents (
  id CHAR(36) NOT NULL PRIMARY KEY,
  author_id CHAR(36) NOT NULL,
  document_kind ENUM('identity_front','identity_back','academic_cv','bank_ownership','other') NOT NULL,
  encrypted_storage_name VARCHAR(90) NOT NULL UNIQUE,
  content_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  byte_size BIGINT UNSIGNED NOT NULL,
  content_type ENUM('application/pdf','image/jpeg','image/png') NOT NULL,
  review_state ENUM('submitted','approved','rejected') NOT NULL DEFAULT 'submitted',
  review_note VARCHAR(600) NULL,
  reviewed_by CHAR(36) NULL,
  reviewed_at DATETIME NULL,
  submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_pub_author_docs_review (review_state,submitted_at),
  KEY idx_pub_author_docs_owner (author_id,document_kind,submitted_at),
  CONSTRAINT fk_pub_doc_author FOREIGN KEY(author_id) REFERENCES publishing_authors(id) ON DELETE RESTRICT,
  CONSTRAINT fk_pub_doc_reviewer FOREIGN KEY(reviewed_by) REFERENCES customer_accounts(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Manual settlement release gate:
-- publishing_author_profiles.review_state='approved'
-- AND publishing_author_bank_accounts.review_state='verified'
-- AND real, independently accepted identity/bank-ownership documentation
-- AND author rights & contract & funds evidence. Existing settlement table is
-- never automatically changed by this migration or a bank-form submission.
