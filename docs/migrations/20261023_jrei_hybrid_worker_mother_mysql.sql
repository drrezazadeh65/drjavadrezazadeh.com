-- JREI hybrid Windows worker / Bertina outbound HTTPS queue, 2026-10-23.
-- STAGED ONLY. DO NOT EXECUTE / DEPLOY BEFORE OWNER-APPROVED FINAL QA.
-- Existing mother database drjavad1_store; no parallel identity, finance DB
-- or customer-order modification. NO plain learner conversations/files.
-- Worker registration, model selection, queue and feature availability OFF.
CREATE TABLE IF NOT EXISTS jrei_hybrid_nodes (
  node_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
  provider_type VARCHAR(32) NOT NULL DEFAULT 'LOCAL_WINDOWS_WORKER',
  public_key_b64 CHAR(44) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  display_label VARCHAR(80) NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'DISABLED',
  permitted_task VARCHAR(64) NOT NULL DEFAULT 'REVIEWED_PUBLIC_RETRIEVAL_EVALUATION',
  model_id VARCHAR(64) NULL,
  model_version VARCHAR(64) NULL,
  max_concurrent TINYINT UNSIGNED NOT NULL DEFAULT 1,
  last_seen_at BIGINT UNSIGNED NULL,
  latest_cpu_percent DECIMAL(5,2) NULL,
  latest_ram_percent DECIMAL(5,2) NULL,
  latest_gpu_percent DECIMAL(5,2) NULL,
  latest_latency_ms INT UNSIGNED NULL,
  last_reported_state VARCHAR(16) NOT NULL DEFAULT 'OFFLINE',
  revoked_at BIGINT UNSIGNED NULL,
  revision BIGINT UNSIGNED NOT NULL DEFAULT 1,
  created_at BIGINT UNSIGNED NOT NULL,
  updated_at BIGINT UNSIGNED NOT NULL,
  created_by_account_id CHAR(36) NULL,
  CONSTRAINT fk_jrei_node_owner FOREIGN KEY (created_by_account_id)
    REFERENCES customer_accounts(id) ON DELETE SET NULL,
  KEY idx_jrei_nodes_status(status,revoked_at,last_seen_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- No raw prompts or private educational records; payload contains ONLY an
-- approved corpus fingerprint and bounded BM25 parameter options.
CREATE TABLE IF NOT EXISTS jrei_hybrid_jobs (
  job_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
  task_type VARCHAR(64) NOT NULL,
  status VARCHAR(22) NOT NULL DEFAULT 'QUEUED',
  request_digest CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  idempotency_key CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  requested_dataset_id VARCHAR(64) NOT NULL,
  dataset_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  evidence_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  policy_current_json VARCHAR(160) NOT NULL,
  policy_candidate_json VARCHAR(160) NOT NULL,
  evaluation_version VARCHAR(64) NOT NULL,
  queued_at BIGINT UNSIGNED NOT NULL,
  expires_at BIGINT UNSIGNED NOT NULL,
  cancelled_at BIGINT UNSIGNED NULL,
  leased_to_node CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  lease_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  lease_started_at BIGINT UNSIGNED NULL,
  lease_expires_at BIGINT UNSIGNED NULL,
  attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
  completed_at BIGINT UNSIGNED NULL,
  result_digest CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  result_json VARCHAR(2048) NULL,
  failure_code VARCHAR(48) NULL,
  revision BIGINT UNSIGNED NOT NULL DEFAULT 1,
  created_by_account_id CHAR(36) NULL,
  UNIQUE KEY uq_jrei_hybrid_idempotency(idempotency_key),
  KEY idx_jrei_hybrid_due(status,expires_at,queued_at),
  KEY idx_jrei_hybrid_owner(leased_to_node,status),
  CONSTRAINT fk_jrei_job_node FOREIGN KEY (leased_to_node)
    REFERENCES jrei_hybrid_nodes(node_id) ON DELETE SET NULL,
  CONSTRAINT fk_jrei_job_owner FOREIGN KEY (created_by_account_id)
    REFERENCES customer_accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Single-use signed-request nonces. No raw private key or bearer token.
-- Retention cleanup may run after the final approved mother-DB scheduler is
-- operational; expired nonces cannot authorize requests.
CREATE TABLE IF NOT EXISTS jrei_hybrid_node_nonces (
  node_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  nonce CHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  accepted_at BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY(node_id,nonce),
  KEY idx_jrei_node_nonce_retention(accepted_at),
  CONSTRAINT fk_jrei_nonce_node FOREIGN KEY(node_id)
    REFERENCES jrei_hybrid_nodes(node_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- IMPORTANT: these tables intentionally have NO active rows, no auto approval,
-- no model credentials and no datasets. All node status begins DISABLED.
-- The private JR_JREI_HYBRID_ENABLED flag also defaults false.
