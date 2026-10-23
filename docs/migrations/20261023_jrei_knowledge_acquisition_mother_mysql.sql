-- JREI-KA persistent scheduled acquisition foundation.
-- Staged addition to drjavad1_store only; NOT EXECUTED.
-- Depends on 20261023_jrei_exams_testly_research_mother_mysql.sql.
-- No crawler fetches, background jobs or email are activated by this DDL.
-- The original jrei_exam_sources holds publisher/version/rights metadata.

CREATE TABLE IF NOT EXISTS jrei_ka_controls (
  singleton_id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
  scheduling_enabled TINYINT(1) NOT NULL DEFAULT 0,
  acquisition_enabled TINYINT(1) NOT NULL DEFAULT 0,
  max_new_tasks_per_cycle SMALLINT UNSIGNED NOT NULL DEFAULT 10,
  max_queue_depth INT UNSIGNED NOT NULL DEFAULT 200,
  max_daily_download_bytes BIGINT UNSIGNED NOT NULL DEFAULT 1073741824,
  max_storage_bytes BIGINT UNSIGNED NOT NULL DEFAULT 10737418240,
  policy_revision BIGINT UNSIGNED NOT NULL DEFAULT 1,
  updated_at BIGINT UNSIGNED NOT NULL DEFAULT 0,
  updated_by_account_id CHAR(36) NULL,
  CONSTRAINT fk_jrei_ka_control_actor FOREIGN KEY(updated_by_account_id)
    REFERENCES customer_accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- A source can enter an automated queue ONLY after separate source rights,
-- safe access policy, robots/terms and publisher review. The HTTP transport
-- must recheck these rights AND the source at actual fetch/lease time.
CREATE TABLE IF NOT EXISTS jrei_ka_source_policies (
  source_id CHAR(36) NOT NULL PRIMARY KEY,
  priority_tier VARCHAR(2) NOT NULL DEFAULT 'P2',
  refresh_interval_seconds INT UNSIGNED NOT NULL DEFAULT 604800,
  max_document_bytes INT UNSIGNED NOT NULL DEFAULT 8388608,
  min_request_spacing_seconds INT UNSIGNED NOT NULL DEFAULT 30,
  rights_reviewed TINYINT(1) NOT NULL DEFAULT 0,
  robots_terms_reviewed TINYINT(1) NOT NULL DEFAULT 0,
  transport_reviewed TINYINT(1) NOT NULL DEFAULT 0,
  rights_evidence_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  robots_terms_evidence_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  transport_evidence_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  scheduling_state VARCHAR(20) NOT NULL DEFAULT 'PENDING_REVIEW',
  revision BIGINT UNSIGNED NOT NULL DEFAULT 1,
  last_scheduled_at BIGINT UNSIGNED NULL,
  last_observed_at BIGINT UNSIGNED NULL,
  -- Reservation is durable ACROSS UTC midnight; per-day quotas alone
  -- cannot enforce publisher per-source request spacing.
  last_network_request_reserved_at BIGINT UNSIGNED NULL,
  next_due_at BIGINT UNSIGNED NOT NULL,
  updated_at BIGINT UNSIGNED NOT NULL,
  approved_by_account_id CHAR(36) NULL,
  KEY idx_jrei_ka_due(scheduling_state,next_due_at,priority_tier),
  CONSTRAINT fk_jrei_ka_source FOREIGN KEY(source_id)
    REFERENCES jrei_exam_sources(source_id) ON DELETE RESTRICT,
  CONSTRAINT fk_jrei_ka_source_reviewer FOREIGN KEY(approved_by_account_id)
    REFERENCES customer_accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Time-bucket unique key prevents duplicate scheduled acquisition even
-- when two cron processes observe the same due source. No raw document bodies,
-- learner data, passwords or worker private keys enter this queue.
CREATE TABLE IF NOT EXISTS jrei_ka_jobs (
  job_id CHAR(36) NOT NULL PRIMARY KEY,
  source_id CHAR(36) NOT NULL,
  due_slot BIGINT UNSIGNED NOT NULL,
  job_kind VARCHAR(24) NOT NULL DEFAULT 'VERIFY_PUBLIC_SOURCE',
  priority_tier VARCHAR(2) NOT NULL,
  source_policy_revision BIGINT UNSIGNED NOT NULL,
  job_state VARCHAR(24) NOT NULL DEFAULT 'QUEUED',
  attempt_count SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  next_attempt_at BIGINT UNSIGNED NOT NULL,
  lease_id CHAR(36) NULL,
  leased_to_node CHAR(36) NULL,
  lease_expires_at BIGINT UNSIGNED NULL,
  last_failure_code VARCHAR(60) NULL,
  bytes_observed BIGINT UNSIGNED NOT NULL DEFAULT 0,
  observed_digest CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  created_at BIGINT UNSIGNED NOT NULL,
  updated_at BIGINT UNSIGNED NOT NULL,
  revision BIGINT UNSIGNED NOT NULL DEFAULT 1,
  UNIQUE KEY uq_jrei_ka_cycle(source_id,due_slot,job_kind),
  KEY idx_jrei_ka_dispatch(job_state,next_attempt_at,priority_tier),
  KEY idx_jrei_ka_source_history(source_id,created_at),
  CONSTRAINT fk_jrei_ka_job_source FOREIGN KEY(source_id)
    REFERENCES jrei_exam_sources(source_id) ON DELETE RESTRICT,
  CONSTRAINT fk_jrei_ka_lease_node FOREIGN KEY(leased_to_node)
    REFERENCES jrei_hybrid_nodes(node_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO jrei_ka_controls
  (singleton_id,scheduling_enabled,acquisition_enabled,
   max_new_tasks_per_cycle,max_queue_depth,max_daily_download_bytes,
   max_storage_bytes,policy_revision,updated_at)
VALUES (1,0,0,10,200,1073741824,10737418240,1,0);

-- Scheduler must remain OFF until explicit owner configuration and successful
-- final acceptance. Live acquisition requires a separately signed,
-- source-specific, rate-limited retrieval Worker dispatch protocol.
-- Do not reuse the reviewed-retrieval EVALUATION task allowlist for crawling.
