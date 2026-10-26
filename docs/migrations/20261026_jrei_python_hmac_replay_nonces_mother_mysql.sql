-- SOURCE ONLY / JREI Python HMAC replay ledger -- NEVER APPLY UNREVIEWED.
-- Canonical mother DB: drjavad1_store (no new database).
-- Reviewed backup+restore, schema drift check, restricted INSERT grant,
-- TLS configuration, clone QA, and approval are prerequisites.
-- The gateway and nonce are stored only as static service ID + SHA-256 hash.
CREATE TABLE IF NOT EXISTS jrei_python_hmac_nonces (
  service_name VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  nonce_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  first_seen_at BIGINT UNSIGNED NOT NULL,
  expires_at BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (service_name,nonce_sha256),
  KEY idx_jrei_python_nonce_expiry (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- No credentials, scheduler, purge job or runtime service is provisioned.
-- After approval, a separately authorized retention task may remove rows
-- expired far beyond the clock-skew acceptance window. Never run this from
-- an unauthenticated request or weaken the UNIQUE constraint.
