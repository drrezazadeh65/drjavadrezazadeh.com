-- JREI owner-only encrypted memory / SOURCE ONLY; NOT APPLIED.
-- Sole relational authority remains drjavad1_store.
-- Requires read-only schema reconciliation, signed backup and proven restore,
-- independent clone QA, least-privilege table grants, TLS, AES-GCM key custody,
-- retention, breach policy and explicit owner authorization.
-- No public customer memory, automatic model training, raw chat capture or
-- unreviewed learning from this table.
CREATE TABLE IF NOT EXISTS jrei_python_owner_memory_records (
  record_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
  owner_account_id CHAR(36) NOT NULL,
  request_key CHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  purpose VARCHAR(40) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  nonce VARBINARY(12) NULL,
  ciphertext LONGBLOB NULL,
  ciphertext_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  created_at BIGINT UNSIGNED NOT NULL,
  expires_at BIGINT UNSIGNED NOT NULL,
  revoked_at BIGINT UNSIGNED NULL,
  UNIQUE KEY uq_jrei_owner_memory_request(owner_account_id,request_key),
  KEY idx_jrei_owner_memory_retention(expires_at,revoked_at),
  KEY idx_jrei_owner_memory_owner(owner_account_id,record_id),
  CONSTRAINT fk_jrei_owner_memory_account FOREIGN KEY(owner_account_id)
    REFERENCES customer_accounts(id) ON DELETE RESTRICT,
  CONSTRAINT ck_jrei_owner_memory_purpose CHECK (
    purpose IN ('OWNER_WORK_NOTE','OWNER_RESEARCH_NOTE','OWNER_PREFERENCE')
  ),
  CONSTRAINT ck_jrei_owner_memory_revocation CHECK (
    (revoked_at IS NULL AND nonce IS NOT NULL AND ciphertext IS NOT NULL)
    OR (revoked_at IS NOT NULL AND nonce IS NULL AND ciphertext IS NULL)
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- Application revoke nulls current-row ciphertext; backups/replicas remain
-- subject to a separately documented retention, purge and subject-rights flow.
-- No automatic migration or data deletion is authorized by this source file.
