-- JR Master CLI Scheduler v1 (2026-10-23): additive mother-database policy.
-- SOURCE ONLY / NOT EXECUTED. Install only after final single QA and owner
-- approval; neither this DDL nor any row enables a worker or changes revenue.
-- This is not a new account/database/queue/payment stack.
CREATE TABLE IF NOT EXISTS operations_cron_jobs (
  job_id VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
  enabled TINYINT(1) NOT NULL DEFAULT 0,
  cadence_seconds INT UNSIGNED NOT NULL DEFAULT 600,
  next_due_at BIGINT UNSIGNED NOT NULL DEFAULT 0,
  last_started_at BIGINT UNSIGNED NULL,
  last_finished_at BIGINT UNSIGNED NULL,
  last_state VARCHAR(20) NOT NULL DEFAULT 'never_run',
  last_exit_code SMALLINT NULL,
  needs_owner_review TINYINT(1) NOT NULL DEFAULT 0,
  row_revision BIGINT UNSIGNED NOT NULL DEFAULT 1,
  updated_at BIGINT UNSIGNED NOT NULL DEFAULT 0,
  updated_by_account_id CHAR(36) NULL,
  KEY idx_ops_cron_due (enabled,needs_owner_review,next_due_at),
  CONSTRAINT fk_ops_cron_owner_account
    FOREIGN KEY (updated_by_account_id) REFERENCES customer_accounts(id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- Known source workers are installed DISABLED and without any provider authority.
-- Additional future registered job IDs can be staged disabled by the existing
-- MFA owner API after that job's code-only allowlist definition is published.
INSERT IGNORE INTO operations_cron_jobs
  (job_id,enabled,cadence_seconds,next_due_at,updated_at)
VALUES
  ('github_collector',0,600,0,0),
  ('response_monitor',0,60,0,0),
  ('private_http_log',0,60,0,0),
  ('operations_alert_mail',0,60,0,0),
  ('newsletter_outbox',0,300,0,0),
  ('publishing_outbox',0,300,0,0);
-- No automated enable/migration, provider send or cron installation.
