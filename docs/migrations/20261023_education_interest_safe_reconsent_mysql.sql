-- JR educational-interest SAFE RE-CONSENT — single Bertina mother database.
-- SOURCE ONLY: never execute before end-stage owner-approved integration QA.
-- Requires docs/migrations/20261022_education_interest_double_optin_mysql.sql.
-- Keeps an existing verified subscriber active under their prior permission
-- while a NEW, independently mailbox-confirmed scope/notice is pending.
-- A guest knowing someone's email cannot retarget, cancel, or renew their
-- existing consent; only the mailbox holder can confirm this staged change.
-- No email address, learner content, phone, secret or marketing list stored.

CREATE TABLE IF NOT EXISTS eco_education_interest_renewals (
  lead_id CHAR(36) NOT NULL PRIMARY KEY,
  token_hash CHAR(64) NOT NULL,
  educational_need VARCHAR(40) NOT NULL,
  preferred_locale CHAR(2) NOT NULL,
  consent_version VARCHAR(32) NOT NULL,
  consent_notice_sha256 CHAR(64) NOT NULL,
  requested_at BIGINT UNSIGNED NOT NULL,
  expires_at BIGINT UNSIGNED NOT NULL,
  UNIQUE KEY uq_edu_interest_renewal_token (token_hash),
  KEY idx_edu_interest_renewal_expiry (expires_at),
  CONSTRAINT fk_edu_interest_renewal_lead
    FOREIGN KEY (lead_id) REFERENCES eco_education_interest_leads(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Host lifecycle (NOT ENABLED): discard any expired rows after 48 hours.
-- This table changes NO current permissions, payments, accounts or URLs.
-- Re-consent is effective only after an original mailbox-owned token POST.
