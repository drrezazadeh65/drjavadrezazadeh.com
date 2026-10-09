-- v4.4.0 Accounts. Apply ONLY after production D1 backup. New tables only; preserves legacy and commerce orders.
-- Email verification is mandatory; telephone numbers are collected as contact only.
CREATE TABLE IF NOT EXISTS jr_account_users (
 id TEXT PRIMARY KEY,
 email TEXT NOT NULL UNIQUE,
 full_name TEXT NOT NULL,
 mobile TEXT NOT NULL,
 pass_salt TEXT NOT NULL,
 pass_hash TEXT NOT NULL,
 pass_iterations INTEGER NOT NULL,
 email_verified_at INTEGER,
 role TEXT NOT NULL DEFAULT 'customer' CHECK(role IN ('customer','student','parent','teacher','advisor')),
 disabled_at INTEGER,
 created_at INTEGER NOT NULL,
 updated_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS jr_account_users_email ON jr_account_users(email);
CREATE TABLE IF NOT EXISTS jr_account_tokens (
 digest TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES jr_account_users(id),
 purpose TEXT NOT NULL CHECK(purpose IN ('verify','reset')),
 expires_at INTEGER NOT NULL,
 used_at INTEGER,
 created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS jr_account_tokens_user ON jr_account_tokens(user_id,purpose,expires_at);
CREATE TABLE IF NOT EXISTS jr_account_sessions (
 digest TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES jr_account_users(id),
 expires_at INTEGER NOT NULL,
 revoked_at INTEGER,
 created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS jr_account_sessions_user ON jr_account_sessions(user_id,expires_at);
CREATE TABLE IF NOT EXISTS jr_account_rate (
 bucket TEXT PRIMARY KEY,
 hits INTEGER NOT NULL,
 expires_at INTEGER NOT NULL
);
-- No family or student-case relationships are inferred from an email alone.
-- Never expose passwords, token digests, raw tokens, customer addresses or phone values through public endpoints.
