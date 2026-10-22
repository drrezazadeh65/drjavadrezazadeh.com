-- JR BAHAR private adult workbook, SOURCE-ONLY additive migration.
-- DO NOT RUN before the final integrated test/owner-approved DB migration.
-- Uses the pre-existing Bertina mother database and customer_accounts.
-- No identifiable workbook content or encryption secrets are seeded.
-- The admin master switch defaults to OFF, and no account is age-approved.
-- Separate reviewed BAHAR_PRIVATE_WORKBOOK consent notice is required.
-- MySQL 8 / MariaDB 10.11 InnoDB utf8mb4.

CREATE TABLE IF NOT EXISTS eco_bahar_account_workbook_policy (
  singleton_id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
  enabled TINYINT(1) NOT NULL DEFAULT 0,
  owner_note VARCHAR(240) NOT NULL DEFAULT '',
  changed_by_account_id CHAR(36) NULL,
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_eco_bahar_workbook_policy_admin
    FOREIGN KEY(changed_by_account_id) REFERENCES customer_accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO eco_bahar_account_workbook_policy
  (singleton_id,enabled,owner_note,changed_by_account_id)
VALUES (1,0,'Awaiting final secure-storage, scientific and legal approval',NULL);

-- An operator must independently establish adult identity AND proper role.
-- A self-reported checkbox, DOB entered by a visitor, or child/guardian link
-- is never adequate to populate this record.
CREATE TABLE IF NOT EXISTS eco_bahar_verified_adult_accounts (
  account_id CHAR(36) NOT NULL PRIMARY KEY,
  review_state VARCHAR(24) NOT NULL DEFAULT 'PENDING',
  verified_by_account_id CHAR(36) NULL,
  verifier_evidence_sha256 CHAR(64) NULL,
  verified_at DATETIME(3) NULL,
  expires_at DATETIME(3) NULL,
  revoked_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  KEY idx_bahar_verified_adults(review_state,expires_at,revoked_at),
  CONSTRAINT fk_bahar_adult_account
    FOREIGN KEY(account_id) REFERENCES customer_accounts(id) ON DELETE RESTRICT,
  CONSTRAINT fk_bahar_adult_verifier
    FOREIGN KEY(verified_by_account_id) REFERENCES customer_accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_bahar_account_workbooks (
  owner_account_id CHAR(36) NOT NULL PRIMARY KEY,
  schema_version VARCHAR(16) NOT NULL DEFAULT '1.0.0',
  key_reference VARCHAR(64) NOT NULL,
  cipher_name VARCHAR(24) NOT NULL DEFAULT 'AES-256-GCM',
  encryption_nonce VARBINARY(12) NOT NULL,
  ciphertext MEDIUMBLOB NOT NULL,
  encryption_tag VARBINARY(16) NOT NULL,
  consent_notice_id CHAR(36) NOT NULL,
  row_revision INT UNSIGNED NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  KEY idx_bahar_workbook_updated (updated_at),
  CONSTRAINT fk_bahar_workbook_owner
    FOREIGN KEY(owner_account_id) REFERENCES customer_accounts(id) ON DELETE RESTRICT,
  CONSTRAINT fk_bahar_workbook_consent_notice
    FOREIGN KEY(consent_notice_id) REFERENCES eco_consent_notices(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Operational contract:
-- - BOTH the private JR_BAHAR_WORKBOOK_KEY_B64 (32-byte key) and
--   JR_BAHAR_WORKBOOK_KEY_ID must be supplied separately, never Git-tracked.
-- - Source does not rotate or export plaintext automatically.
-- - Existing eco_consent_records stores account-scoped, independently
--   versioned notice approvals; no default consent is granted.
-- - Every read/write/delete requires identity, verified adult proof,
--   current scoped consent (or authorized deletion), rate-limit and audit.
-- - A legal hold prevents erasure. No child/guardian workbook can use this.
-- - Privacy periods and backup erasure must receive legal sign-off.
