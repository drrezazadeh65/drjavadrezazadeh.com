-- JR User-First Educational Interest, SINGLE Bertina mother database.
-- SOURCE ONLY. DO NOT EXECUTE before owner-approved final acceptance.
-- Guest email is encrypted, never copied to the account table or analytics.
-- No automatic advertising, scientific data analysis, or commercial offer
-- activation. Opt-in requires one explicit popup decision AND email control.
-- Existing customer accounts, books, donations and approved checkout untouched.

CREATE TABLE IF NOT EXISTS eco_education_interest_policy (
  singleton_id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
  enabled TINYINT(1) NOT NULL DEFAULT 0,
  updated_by_account_id CHAR(36) NULL,
  updated_at BIGINT UNSIGNED NOT NULL DEFAULT 0,
  CONSTRAINT fk_edu_interest_policy_owner
    FOREIGN KEY (updated_by_account_id) REFERENCES customer_accounts(id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO eco_education_interest_policy(singleton_id,enabled,updated_at)
VALUES (1,0,0);

CREATE TABLE IF NOT EXISTS eco_education_interest_leads (
  id CHAR(36) NOT NULL PRIMARY KEY,
  email_hmac CHAR(64) NOT NULL,
  encryption_key_id VARCHAR(64) NOT NULL,
  email_cipher VARBINARY(512) NOT NULL,
  email_nonce VARBINARY(12) NOT NULL,
  email_tag VARBINARY(16) NOT NULL,
  educational_need VARCHAR(40) NOT NULL,
  preferred_locale CHAR(2) NOT NULL,
  consent_version VARCHAR(32) NOT NULL,
  consent_notice_sha256 CHAR(64) NOT NULL,
  consent_given_at BIGINT UNSIGNED NOT NULL,
  status ENUM('PENDING','VERIFIED','WITHDRAWN') NOT NULL DEFAULT 'PENDING',
  verification_token_hash CHAR(64) NULL,
  verification_expires_at BIGINT UNSIGNED NULL,
  withdrawal_token_hash CHAR(64) NOT NULL,
  verified_at BIGINT UNSIGNED NULL,
  withdrawn_at BIGINT UNSIGNED NULL,
  last_invitation_at BIGINT UNSIGNED NULL,
  expires_at BIGINT UNSIGNED NOT NULL,
  created_at BIGINT UNSIGNED NOT NULL,
  updated_at BIGINT UNSIGNED NOT NULL,
  UNIQUE KEY uq_edu_interest_email (email_hmac),
  UNIQUE KEY uq_edu_interest_verification (verification_token_hash),
  UNIQUE KEY uq_edu_interest_withdrawal (withdrawal_token_hash),
  KEY idx_edu_interest_admin (status,educational_need,verified_at),
  KEY idx_edu_interest_retention (status,expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_education_interest_consent_events (
  event_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  lead_id CHAR(36) NOT NULL,
  event_code ENUM('SUBMITTED','EMAIL_VERIFIED','WITHDRAWN') NOT NULL,
  consent_version VARCHAR(32) NOT NULL,
  notice_sha256 CHAR(64) NOT NULL,
  occurred_at BIGINT UNSIGNED NOT NULL,
  KEY idx_edu_interest_consent (lead_id,occurred_at),
  CONSTRAINT fk_edu_interest_consent_lead
    FOREIGN KEY(lead_id) REFERENCES eco_education_interest_leads(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- The optional maintenance workflow must delete/expire pending invitations
-- after 48 hours and remove stale verified interests when consent expires.
-- Backup retention, email opt-out, legal holds and final regional compliance
-- require independent review. No cron or test is authorized at this stage.
