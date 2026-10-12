-- Stage 13 durable Bertina MySQL *design migration* (not automatically installed).
-- Run only from an authenticated, backed-up, approved migration flow.
-- Secrets/tokens MUST NEVER be stored as plaintext in these tables.
CREATE TABLE IF NOT EXISTS social_accounts (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  provider VARCHAR(32) NOT NULL,
  external_id VARCHAR(191) NOT NULL,
  display_handle VARCHAR(191) NOT NULL,
  status ENUM('pending','verified','expired','revoked','disabled') NOT NULL DEFAULT 'pending',
  scopes_json JSON NULL,
  secret_reference VARCHAR(191) NULL,
  expires_at BIGINT NULL,
  verified_at BIGINT NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  UNIQUE KEY uq_social_provider_identity (provider,external_id),
  INDEX idx_social_accounts_status (provider,status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS social_campaigns (
  id CHAR(36) PRIMARY KEY,
  source_canonical VARCHAR(500) NOT NULL,
  source_locale ENUM('fa','en') NOT NULL,
  title VARCHAR(500) NOT NULL,
  editorial_state ENUM('draft','review','approved','rejected') NOT NULL DEFAULT 'draft',
  source_hash CHAR(64) NOT NULL,
  created_by CHAR(36) NOT NULL,
  approved_by CHAR(36) NULL,
  approved_at BIGINT NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  INDEX idx_social_campaign_source (source_canonical(191)),
  INDEX idx_social_campaign_state (editorial_state,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS social_assets (
  id CHAR(36) PRIMARY KEY,
  campaign_id CHAR(36) NOT NULL,
  media_type VARCHAR(30) NOT NULL,
  sha256 CHAR(64) NOT NULL,
  media_url VARCHAR(500) NOT NULL,
  alt_text VARCHAR(500) NULL,
  rights_status ENUM('unverified','verified','revoked') NOT NULL DEFAULT 'unverified',
  width INT UNSIGNED NULL,
  height INT UNSIGNED NULL,
  bytes BIGINT UNSIGNED NULL,
  FOREIGN KEY (campaign_id) REFERENCES social_campaigns(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS social_deliveries (
  id CHAR(36) PRIMARY KEY,
  campaign_id CHAR(36) NOT NULL,
  account_id BIGINT UNSIGNED NOT NULL,
  provider VARCHAR(32) NOT NULL,
  format VARCHAR(32) NOT NULL,
  body MEDIUMTEXT NOT NULL,
  body_hash CHAR(64) NOT NULL,
  tracking_url VARCHAR(700) NOT NULL,
  schedule_utc BIGINT NULL,
  time_zone VARCHAR(64) NOT NULL DEFAULT 'Asia/Tehran',
  status ENUM('draft','approved','scheduled','dispatching','confirmed','manual_required','uncertain','failed','revoked') NOT NULL DEFAULT 'draft',
  dedupe_key CHAR(64) NOT NULL,
  approved_by CHAR(36) NULL,
  approved_at BIGINT NULL,
  approval_digest CHAR(64) NULL,
  leased_until BIGINT NULL,
  lease_token CHAR(64) NULL,
  provider_id VARCHAR(191) NULL,
  provider_url VARCHAR(700) NULL,
  confirmation_method VARCHAR(64) NULL,
  confirmed_at BIGINT NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  UNIQUE KEY uq_social_dedupe (dedupe_key),
  INDEX idx_social_due (status,schedule_utc,leased_until),
  INDEX idx_social_account (account_id,created_at),
  FOREIGN KEY (campaign_id) REFERENCES social_campaigns(id),
  FOREIGN KEY (account_id) REFERENCES social_accounts(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS social_attempts (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  delivery_id CHAR(36) NOT NULL,
  attempt_started_at BIGINT NOT NULL,
  completed_at BIGINT NULL,
  status ENUM('pending','confirmed','definite_failure','uncertain') NOT NULL,
  http_status SMALLINT UNSIGNED NULL,
  error_code VARCHAR(100) NULL,
  provider_request_id VARCHAR(191) NULL,
  INDEX idx_social_attempt_history (delivery_id,attempt_started_at),
  FOREIGN KEY (delivery_id) REFERENCES social_deliveries(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS social_metrics (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  delivery_id CHAR(36) NOT NULL,
  observed_at BIGINT NOT NULL,
  source VARCHAR(60) NOT NULL,
  impressions BIGINT UNSIGNED NULL,
  reach BIGINT UNSIGNED NULL,
  engagements BIGINT UNSIGNED NULL,
  clicks BIGINT UNSIGNED NULL,
  conversions BIGINT UNSIGNED NULL,
  UNIQUE KEY uq_social_metric_observation (delivery_id,source,observed_at),
  FOREIGN KEY (delivery_id) REFERENCES social_deliveries(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS social_audit (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  actor_id CHAR(36) NULL,
  delivery_id CHAR(36) NULL,
  action VARCHAR(64) NOT NULL,
  event_at BIGINT NOT NULL,
  evidence_digest CHAR(64) NULL,
  INDEX idx_social_audit_delivery (delivery_id,event_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Owner-managed channel preferences are never proof of provider authorization.
CREATE TABLE IF NOT EXISTS social_channel_settings (
  provider VARCHAR(32) PRIMARY KEY,
  draft_enabled TINYINT(1) NOT NULL DEFAULT 1,
  draft_locale ENUM('fa','en','both') NOT NULL DEFAULT 'both',
  approval_mode ENUM('manual','review_required') NOT NULL DEFAULT 'review_required',
  daily_draft_limit TINYINT UNSIGNED NOT NULL DEFAULT 1,
  preferred_local_time CHAR(5) NOT NULL DEFAULT '21:00',
  utm_campaign VARCHAR(64) NOT NULL DEFAULT 'editorial',
  updated_by CHAR(36) NOT NULL,
  updated_at BIGINT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Saved account identities are plans, NOT connected social accounts.
CREATE TABLE IF NOT EXISTS social_connection_intents (
  id CHAR(36) PRIMARY KEY,
  provider VARCHAR(32) NOT NULL,
  public_handle VARCHAR(100) NOT NULL,
  status ENUM('awaiting_authorization','cancelled') NOT NULL DEFAULT 'awaiting_authorization',
  created_by CHAR(36) NOT NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  UNIQUE KEY uq_social_intent (provider,public_handle),
  INDEX idx_social_intent_status (status,updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
