-- Bertina consultation calendar capacity. ADDITIVE, owner-reviewed migration.
-- Do not run automatically in CI against production; MySQL DDL implicitly commits.
-- No order, payment, user, book stock or existing appointment is modified.
-- UTC DATETIME, single internal owner resource; not an external free/busy feed.
SET NAMES utf8mb4;
CREATE TABLE IF NOT EXISTS commerce_consultation_availability (
  id CHAR(36) NOT NULL PRIMARY KEY,
  start_utc DATETIME NOT NULL,
  end_utc DATETIME NOT NULL,
  state ENUM('OPEN','CLOSED') NOT NULL DEFAULT 'OPEN',
  created_by CHAR(36) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_consultation_capacity_state_time (state,start_utc,end_utc),
  CONSTRAINT ck_consultation_capacity_interval CHECK (end_utc>start_utc)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- Read-only verification: SELECT id,start_utc,end_utc,state FROM commerce_consultation_availability LIMIT 0;
-- OPEN windows are populated only through MFA-protected owner operations.
-- Existing bookings remain intact. New bookings fail closed until this table is verified.
