-- Customer auth tables for the existing production D1 binding.
-- Auth data is namespaced and must never be exposed from public commerce status endpoints.
PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS customer_accounts (
  id TEXT PRIMARY KEY,
  email_normalized TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  mobile_e164 TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','active','disabled')),
  email_verified_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS customer_accounts_status ON customer_accounts(status);

CREATE TABLE IF NOT EXISTS customer_auth_tokens (
  token_hash TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES customer_accounts(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL CHECK(purpose IN ('verify_email','reset_password')),
  expires_at INTEGER NOT NULL,
  consumed_at INTEGER,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS customer_auth_tokens_account_purpose ON customer_auth_tokens(account_id,purpose);
CREATE INDEX IF NOT EXISTS customer_auth_tokens_expiry ON customer_auth_tokens(expires_at);

CREATE TABLE IF NOT EXISTS customer_auth_sessions (
  token_hash TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES customer_accounts(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  revoked_at INTEGER,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS customer_auth_sessions_account ON customer_auth_sessions(account_id);
CREATE INDEX IF NOT EXISTS customer_auth_sessions_expiry ON customer_auth_sessions(expires_at);

CREATE TABLE IF NOT EXISTS customer_auth_rate_limits (
  bucket TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  reset_at INTEGER NOT NULL
);
