-- JREI APEX V2, signed-worker OBSERVATION bridge. SOURCE ONLY; NOT RUN.
-- ADDITIVE expansion of EXISTING drjavad1_store, after APEX mission tables
-- AND existing JREI hybrid node/job mother migrations are independently verified.
-- No separate DB, arbitrary task type, worker dispatch, seed job, source grants
-- or changes to the established Ed25519 lease/completion contract.
-- The owner explicitly links an EXISTING owned retrieval-evaluation job.
-- A linked job may have been queued by another owner action; it is NOT
-- evidence that the APEX mission automatically dispatched it.
CREATE TABLE IF NOT EXISTS jrei_apex_worker_links (
  mission_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
  job_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  owner_account_id CHAR(36) NOT NULL,
  task_type VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  job_request_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  dataset_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  evidence_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  linked_at BIGINT UNSIGNED NOT NULL,
  last_checkpoint_seq INT UNSIGNED NOT NULL DEFAULT 0,
  last_checkpoint_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  last_job_revision BIGINT UNSIGNED NOT NULL DEFAULT 0,
  last_job_status VARCHAR(22) NOT NULL DEFAULT 'UNOBSERVED',
  last_observation_code VARCHAR(55) NOT NULL DEFAULT 'UNOBSERVED',
  last_observed_at BIGINT UNSIGNED NULL,
  UNIQUE KEY uq_apex_worker_job_once(job_id),
  KEY idx_apex_worker_owner(owner_account_id,linked_at),
  CONSTRAINT fk_apex_worker_link_mission FOREIGN KEY(mission_id)
    REFERENCES jrei_apex_owner_missions(mission_id) ON DELETE RESTRICT,
  CONSTRAINT fk_apex_worker_link_job FOREIGN KEY(job_id)
    REFERENCES jrei_hybrid_jobs(job_id) ON DELETE RESTRICT,
  CONSTRAINT fk_apex_worker_link_owner FOREIGN KEY(owner_account_id)
    REFERENCES customer_accounts(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Append-only bounded, minimal snapshots of original signed-worker JOB ROWS.
-- No raw result_json, lease token, private key, learner text or source excerpts.
-- SHA-256 chaining is an integrity indicator, not independently signed proof.
CREATE TABLE IF NOT EXISTS jrei_apex_worker_checkpoints (
  mission_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  seq INT UNSIGNED NOT NULL,
  job_revision BIGINT UNSIGNED NOT NULL,
  job_status VARCHAR(22) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  observation_code VARCHAR(55) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  leased_node_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  lease_fingerprint_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  result_digest CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  previous_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  checkpoint_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  observed_at BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY(mission_id,seq),
  UNIQUE KEY uq_apex_worker_checkpoint_hash(checkpoint_sha256),
  KEY idx_apex_worker_observation(observed_at,mission_id),
  CONSTRAINT fk_apex_worker_checkpoint_link FOREIGN KEY(mission_id)
    REFERENCES jrei_apex_worker_links(mission_id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Both tables are intentionally EMPTY. New linkage writes require separate
-- private owner flag + already-authenticated MFA/CSRF plus original mother DB.
-- APEX emergency-stop and "cancel" DO NOT alter the existing hybrid job:
-- original jrei-hybrid owner's revisioned cancel mechanism remains authoritative.
