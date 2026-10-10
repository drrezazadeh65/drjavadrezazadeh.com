-- Bertina MySQL baseline for same-origin PHP API
-- Import through phpMyAdmin after creating a dedicated database/user in cPanel.
SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE TABLE IF NOT EXISTS customer_accounts (
  id CHAR(36) PRIMARY KEY,
  email_normalized VARCHAR(254) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  mobile_e164 VARCHAR(20) NULL,
  status ENUM('pending','active','disabled') NOT NULL DEFAULT 'pending',
  email_verified_at BIGINT NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  INDEX idx_customer_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS customer_auth_tokens (
  token_hash CHAR(64) PRIMARY KEY,
  account_id CHAR(36) NOT NULL,
  purpose VARCHAR(40) NOT NULL,
  expires_at BIGINT NOT NULL,
  created_at BIGINT NOT NULL,
  consumed_at BIGINT NULL,
  INDEX idx_auth_token_account (account_id,purpose,consumed_at),
  CONSTRAINT fk_auth_token_account FOREIGN KEY (account_id) REFERENCES customer_accounts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS customer_auth_sessions (
  token_hash CHAR(64) PRIMARY KEY,
  account_id CHAR(36) NOT NULL,
  expires_at BIGINT NOT NULL,
  created_at BIGINT NOT NULL,
  revoked_at BIGINT NULL,
  INDEX idx_auth_session_account (account_id,revoked_at),
  CONSTRAINT fk_auth_session_account FOREIGN KEY (account_id) REFERENCES customer_accounts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS customer_auth_rate_limits (
  bucket CHAR(64) PRIMARY KEY,
  count INT UNSIGNED NOT NULL,
  reset_at BIGINT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS commerce_orders (
  id CHAR(36) PRIMARY KEY,
  factor_id VARCHAR(40) NOT NULL UNIQUE,
  amount_toman BIGINT UNSIGNED NOT NULL,
  provider_amount BIGINT UNSIGNED NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'IRT',
  items_json LONGTEXT NOT NULL,
  state ENUM('created','pending','paid','failed','cancelled') NOT NULL,
  provider_id_get VARCHAR(80) NULL,
  provider_trans_id VARCHAR(80) NULL,
  paid_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_commerce_state (state),
  INDEX idx_commerce_provider (provider_id_get)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
