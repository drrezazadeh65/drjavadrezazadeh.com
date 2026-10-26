-- JREI model-free first signed site -> Windows -> Python -> site mission.
-- ADDITIVE / NOT APPLIED. Existing mother drjavad1_store only.
-- Apply after backup, restore rehearsal and verified clone compatibility.
-- Exact fixed arithmetic canary only. No arbitrary tasks, user PII or model tools.
CREATE TABLE IF NOT EXISTS jrei_python_canary_jobs (
  job_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
  owner_account_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  request_key CHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  state VARCHAR(16) NOT NULL DEFAULT 'QUEUED',
  assigned_node CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  lease_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  lease_expires_at BIGINT UNSIGNED NULL,
  created_at BIGINT UNSIGNED NOT NULL,
  expires_at BIGINT UNSIGNED NOT NULL,
  completed_at BIGINT UNSIGNED NULL,
  numerator INT NULL,
  denominator INT NULL,
  result_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  UNIQUE KEY uq_python_canary_owner_request (owner_account_id,request_key),
  KEY idx_python_canary_lease(state,expires_at,created_at),
  KEY idx_python_canary_node(assigned_node,lease_expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- A reviewed owner route alone creates a job, but never executes it.
-- Flag JR_JREI_PYTHON_CANARY_ENABLED remains false by default.
