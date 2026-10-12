-- Stage 14: opt-in consultation interest records; do NOT apply blindly.
-- Bertina MySQL/InnoDB only. Requires existing customer_accounts and
-- customer_auth_rate_limits from the canonical email-auth deployment.
-- Operator must back up, review and apply once; deployment is not automatic.
SET NAMES utf8mb4;
CREATE TABLE IF NOT EXISTS growth_lead_requests (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
  account_id CHAR(36) NOT NULL,
  service_id VARCHAR(80) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  period_bucket CHAR(7) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  state ENUM('NEW','QUALIFIED','NEEDS_INFO','CLOSED','WITHDRAWN') NOT NULL DEFAULT 'NEW',
  purpose VARCHAR(50) NOT NULL DEFAULT 'CONSULTATION_CONTACT',
  consent_version VARCHAR(50) NOT NULL,
  consent_granted_at BIGINT UNSIGNED NOT NULL,
  consent_withdrawn_at BIGINT UNSIGNED NULL,
  marketing_opt_in TINYINT(1) NOT NULL DEFAULT 0,
  created_at BIGINT UNSIGNED NOT NULL,
  updated_at BIGINT UNSIGNED NOT NULL,
  expires_at BIGINT UNSIGNED NOT NULL,
  CONSTRAINT fk_growth_lead_account FOREIGN KEY (account_id) REFERENCES customer_accounts(id) ON DELETE CASCADE,
  UNIQUE KEY uq_growth_lead_account_service_month (account_id,service_id,period_bucket),
  KEY idx_growth_expiry (expires_at),
  KEY idx_growth_state (state,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS growth_lead_consent_events (
  event_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  lead_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  account_id CHAR(36) NOT NULL,
  event ENUM('GRANTED','WITHDRAWN') NOT NULL,
  consent_version VARCHAR(50) NOT NULL,
  recorded_at BIGINT UNSIGNED NOT NULL,
  CONSTRAINT fk_growth_consent_lead FOREIGN KEY (lead_id) REFERENCES growth_lead_requests(id) ON DELETE CASCADE,
  KEY idx_growth_consent_account (account_id,recorded_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- Required private retention job (not deployed by this SQL):
-- DELETE FROM growth_lead_requests WHERE expires_at < UNIX_TIMESTAMP()
--                                   OR (state='WITHDRAWN' AND consent_withdrawn_at < UNIX_TIMESTAMP() - 2592000);
-- Consent event rows cascade with the related lead. Review jurisdiction,
-- retention/legal holds and do not log personal payloads into CI or analytics.
