-- Private identity database: apply only to a dedicated D1 database after review.
-- Never run against payment or analytics databases.
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  email_normalized TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  role TEXT NOT NULL CHECK(role IN ('student','parent','teacher','adviser')),
  email_verified_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS auth_tokens (
  token_hash TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL CHECK(purpose IN ('verify_email','reset_password')),
  expires_at INTEGER NOT NULL,
  consumed_at INTEGER,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS auth_tokens_account_purpose ON auth_tokens(account_id,purpose);
CREATE INDEX IF NOT EXISTS auth_tokens_expiry ON auth_tokens(expires_at);
CREATE TABLE IF NOT EXISTS auth_rate_limits (
  bucket TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  reset_at INTEGER NOT NULL
);
-- Consume token atomically in one SQL statement; check rows_written === 1.
-- UPDATE auth_tokens SET consumed_at = ? WHERE token_hash = ? AND purpose = ?
--   AND consumed_at IS NULL AND expires_at > ?;
