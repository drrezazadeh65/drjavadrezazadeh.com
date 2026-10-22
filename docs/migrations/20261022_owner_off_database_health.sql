-- ADDITIVE ONLY. NOT applied to live Bertina.
-- Authorise a database backup, maintenance window and owner deployment before running.
-- Must be executed against the EXISTING mother database; no CREATE DATABASE / DROP / TRUNCATE.
CREATE TABLE IF NOT EXISTS operations_database_health_settings (
  singleton_id TINYINT UNSIGNED PRIMARY KEY,
  monitoring_enabled TINYINT NOT NULL DEFAULT 0,
  error_logging_enabled TINYINT NOT NULL DEFAULT 0,
  cadence ENUM('manual','hourly','daily') NOT NULL DEFAULT 'manual',
  clock_minutes SMALLINT UNSIGNED NOT NULL DEFAULT 210,
  retention_days SMALLINT UNSIGNED NOT NULL DEFAULT 90,
  updated_at BIGINT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS operations_database_error_events (
  fingerprint CHAR(64) PRIMARY KEY,
  category VARCHAR(48) NOT NULL,
  component VARCHAR(48) NOT NULL,
  sqlstate_class CHAR(2) NULL,
  driver_code VARCHAR(12) NULL,
  first_observed_at BIGINT NOT NULL,
  last_observed_at BIGINT NOT NULL,
  occurrence_count INT UNSIGNED NOT NULL DEFAULT 1,
  INDEX idx_ops_db_error_last(last_observed_at),
  INDEX idx_ops_db_error_category(category,last_observed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Existing rows, if any, are preserved; newly installed defaults are OFF.
INSERT IGNORE INTO operations_database_health_settings
(singleton_id,monitoring_enabled,error_logging_enabled,cadence,clock_minutes,retention_days,updated_at)
VALUES(1,0,0,'manual',210,90,UNIX_TIMESTAMP());

INSERT IGNORE INTO operations_collection_policies
(scope_key,enabled,cadence,clock_minutes,next_due,updated_at)
VALUES('system:scheduled_collection',0,'manual',0,0,UNIX_TIMESTAMP());

-- No cron insertion, no automatic scanning, no mail and no cleanup.
