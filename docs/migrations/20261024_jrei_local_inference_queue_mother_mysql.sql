-- JREI-LM FIRST: independently authorised Windows inference bridge.
-- Additive-only, original drjavad1_store mother DB. SOURCE; NOT APPLIED.
-- Requires jrei_hybrid_nodes, jrei_local_model_registry, customer_accounts.
-- NO passwords, plaintext visitor conversations, paid provider keys,
-- public model weights, customer records, commerce state or parallel DB.
-- Independent owner authorisation defaults OFF; no worker or model is started.
CREATE TABLE IF NOT EXISTS jrei_local_chat_node_authorizations (
  node_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
  model_id VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  model_version VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  model_artifact_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  enabled TINYINT(1) NOT NULL DEFAULT 0,
  -- Signed GENERATIVE worker only; evaluation-only heartbeats cannot
  -- make a model eligible for the public assistant.
  last_signed_chat_seen_at BIGINT UNSIGNED NULL DEFAULT NULL,
  revision BIGINT UNSIGNED NOT NULL DEFAULT 1,
  reviewed_by_account_id CHAR(36) NULL,
  reviewed_at BIGINT UNSIGNED NULL,
  updated_at BIGINT UNSIGNED NOT NULL,
  CONSTRAINT fk_jrei_local_chat_node
    FOREIGN KEY(node_id) REFERENCES jrei_hybrid_nodes(node_id) ON DELETE RESTRICT,
  CONSTRAINT fk_jrei_local_chat_owner
    FOREIGN KEY(reviewed_by_account_id) REFERENCES customer_accounts(id) ON DELETE SET NULL,
  KEY idx_jrei_local_chat_approved(enabled,model_id,model_version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Random per-job retrieval secret hash; only the caller knows raw secret.
-- The server-side key for authenticated encryption stays in PRIVATE env.
-- Both request and answer are encrypted at rest and physically deleted
-- on the first authorized result read; 2 minute bounded stale cleanup.
CREATE TABLE IF NOT EXISTS jrei_local_chat_jobs (
  job_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
  retrieval_secret_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'QUEUED',
  request_ciphertext VARBINARY(16384) NULL,
  response_ciphertext VARBINARY(8192) NULL,
  leased_to_node CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  lease_secret_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  lease_expires_at BIGINT UNSIGNED NULL,
  attempt_count TINYINT UNSIGNED NOT NULL DEFAULT 0,
  expires_at BIGINT UNSIGNED NOT NULL,
  created_at BIGINT UNSIGNED NOT NULL,
  updated_at BIGINT UNSIGNED NOT NULL,
  KEY idx_jrei_local_chat_due(status,expires_at,created_at),
  KEY idx_jrei_local_chat_node(leased_to_node,status),
  KEY idx_jrei_local_chat_expiry(expires_at),
  CONSTRAINT fk_jrei_local_chat_lease_node
    FOREIGN KEY(leased_to_node) REFERENCES jrei_hybrid_nodes(node_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- Publication/rights, personal-memory, self-training and live runtime
-- require separate verified permissions; no existing switches changed.
