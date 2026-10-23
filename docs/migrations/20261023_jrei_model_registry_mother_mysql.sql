-- JREI V5.1 local model metadata ONLY; staged additive migration.
-- Do not execute before single consolidated owner-authorized final QA.
-- Existing mother DB: drjavad1_store. No new login/user/payment tables.
-- No model weights, binaries, prompts, conversations or learner data stored.

CREATE TABLE IF NOT EXISTS jrei_local_model_registry (
  model_id VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  model_version VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  model_artifact_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  source_url VARCHAR(500) NOT NULL,
  licence_code VARCHAR(80) NOT NULL,
  licence_url VARCHAR(500) NOT NULL,
  framework VARCHAR(32) NOT NULL DEFAULT 'LLAMA_CPP_LOOPBACK',
  quantization VARCHAR(40) NOT NULL,
  required_ram_mb INT UNSIGNED NOT NULL,
  languages VARCHAR(16) NOT NULL DEFAULT 'fa,en',
  status VARCHAR(24) NOT NULL DEFAULT 'PENDING',
  revision BIGINT UNSIGNED NOT NULL DEFAULT 1,
  weights_installed_verified TINYINT UNSIGNED NOT NULL DEFAULT 0,
  runtime_verified TINYINT UNSIGNED NOT NULL DEFAULT 0,
  measured_tokens_per_second DECIMAL(9,3) NULL,
  measured_p95_latency_ms INT UNSIGNED NULL,
  measured_peak_ram_mb INT UNSIGNED NULL,
  independent_quality_accepted TINYINT UNSIGNED NOT NULL DEFAULT 0,
  proposed_at BIGINT UNSIGNED NOT NULL,
  approved_at BIGINT UNSIGNED NULL,
  suspended_at BIGINT UNSIGNED NULL,
  updated_at BIGINT UNSIGNED NOT NULL,
  proposed_by_account_id CHAR(36) NULL,
  approved_by_account_id CHAR(36) NULL,
  PRIMARY KEY (model_id,model_version),
  KEY idx_jrei_model_registry_state(status,updated_at),
  KEY idx_jrei_model_registry_sha(model_artifact_sha256)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- APPROVED means metadata/right-to-consider only. It does NOT imply any
-- Windows machine has installed the weights, nor that a live LLM is running.
-- Runtime/quality fields stay UNKNOWN/0 until a separately reviewed
-- end-to-end acceptance process provides traceable evidence. The registry
-- MUST NOT automatically start/download a model or change task allowlists.
