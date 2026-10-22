-- Owner-controlled additive migration: existing Bertina mother MySQL/MariaDB database.
-- Source parity: api/operations-schema.php, feature/owner-command-center-20261022.
-- MANUAL ONLY. Never automatically run on deployment or dashboard views.
-- BEFORE IMPORT: full verified database backup, chosen database confirmation,
-- name/column comparison in phpMyAdmin, maintenance approval by the owner.
-- No DROP, TRUNCATE, ALTER existing tables, Cron, mail, telemetry, or data reset.
-- All health monitoring, error journaling and retention automation default OFF.
-- Do not import if an existing named table has a different column definition;
-- CREATE IF NOT EXISTS would hide a mismatch rather than fix it.

CREATE TABLE IF NOT EXISTS operations_database_health_settings (
singleton_id TINYINT UNSIGNED PRIMARY KEY,
monitoring_enabled TINYINT NOT NULL DEFAULT 0,
error_logging_enabled TINYINT NOT NULL DEFAULT 0,
cadence ENUM('manual','hourly','daily') NOT NULL DEFAULT 'manual',
clock_minutes SMALLINT UNSIGNED NOT NULL DEFAULT 210,
retention_days SMALLINT UNSIGNED NOT NULL DEFAULT 90,
updated_at BIGINT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS operations_database_health_runs (
sequence_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
origin ENUM('manual','scheduled') NOT NULL,
slot_due_at BIGINT NULL,
observed_at BIGINT NOT NULL,
result ENUM('observed','attention','unavailable') NOT NULL,
checks_observed SMALLINT UNSIGNED NOT NULL DEFAULT 0,
checks_attention SMALLINT UNSIGNED NOT NULL DEFAULT 0,
checks_unavailable SMALLINT UNSIGNED NOT NULL DEFAULT 0,
tables_observed INT UNSIGNED NULL,
UNIQUE KEY uniq_db_health_slot(origin,slot_due_at),
INDEX idx_db_health_at(observed_at)
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

-- Only insert a disabled singleton preference when absent; never replace
-- an existing owner's setting. Creating this row does not start monitoring.
INSERT IGNORE INTO operations_database_health_settings
(singleton_id,monitoring_enabled,error_logging_enabled,cadence,clock_minutes,retention_days,updated_at)
VALUES (1,0,0,'manual',210,90,UNIX_TIMESTAMP());
