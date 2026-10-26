-- JREI APEX V2 / OWNER MISSION LEDGER -- SOURCE ONLY; NOT EXECUTED.
-- One existing mother DB: drjavad1_store. No CREATE DATABASE, DROP or ALTER.
-- This migration must be independently reconciled with LIVE information_schema,
-- verified mother-DB backup/restore, owner approval and clone acceptance first.
-- Only opaque owner-approved intent codes and hashes; no free-form commands,
-- student records, transcripts, private source contents or executable arguments.
-- No seed missions, synthetic receipts, external worker enrolments or auto-runs.
--
-- No completed/success/verified mission is created by this migration.
-- ALL PLANNING AND DELEGATION/EXECUTION CONTROLS DEFAULT OFF.

CREATE TABLE IF NOT EXISTS jrei_apex_mission_controls (
  singleton_id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
  planning_enabled TINYINT(1) NOT NULL DEFAULT 0,
  emergency_stop TINYINT(1) NOT NULL DEFAULT 1,
  execution_enabled TINYINT(1) NOT NULL DEFAULT 0,
  revision BIGINT UNSIGNED NOT NULL DEFAULT 1,
  updated_at BIGINT UNSIGNED NOT NULL DEFAULT 0,
  updated_by_account_id CHAR(36) NULL,
  CONSTRAINT ck_apex_mission_controls_singleton CHECK (singleton_id=1),
  CONSTRAINT fk_apex_mission_controls_owner FOREIGN KEY(updated_by_account_id)
    REFERENCES customer_accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS jrei_apex_owner_missions (
  mission_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
  owner_account_id CHAR(36) NOT NULL,
  request_key CHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  intent_code VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  request_digest CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  policy_digest CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  status VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT 'PLANNED',
  revision BIGINT UNSIGNED NOT NULL DEFAULT 1,
  last_event_seq INT UNSIGNED NOT NULL DEFAULT 0,
  last_event_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  created_at BIGINT UNSIGNED NOT NULL,
  updated_at BIGINT UNSIGNED NOT NULL,
  expires_at BIGINT UNSIGNED NOT NULL,
  cancellation_requested_at BIGINT UNSIGNED NULL,
  completed_at BIGINT UNSIGNED NULL,
  UNIQUE KEY uq_apex_owner_request(owner_account_id,request_key),
  KEY idx_apex_owner_missions(owner_account_id,created_at,mission_id),
  KEY idx_apex_mission_state(status,expires_at),
  CONSTRAINT fk_apex_mission_owner FOREIGN KEY(owner_account_id)
    REFERENCES customer_accounts(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Append-only from the reviewed application state-machine. Its hash chain
-- detects accidental modification but is not tamper-proof against a DB admin.
-- Independent off-site signed anchors are required for higher audit assurance.
CREATE TABLE IF NOT EXISTS jrei_apex_mission_events (
  mission_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  seq INT UNSIGNED NOT NULL,
  event_code VARCHAR(40) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  from_status VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NULL,
  to_status VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  actor_account_id CHAR(36) NULL,
  previous_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  event_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  evidence_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  occurred_at BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY(mission_id,seq),
  UNIQUE KEY uq_apex_event_digest(event_sha256),
  KEY idx_apex_event_time(occurred_at,mission_id),
  CONSTRAINT fk_apex_events_mission FOREIGN KEY(mission_id)
    REFERENCES jrei_apex_owner_missions(mission_id) ON DELETE RESTRICT,
  CONSTRAINT fk_apex_events_actor FOREIGN KEY(actor_account_id)
    REFERENCES customer_accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- A single OFF, STOPPED row is a policy safeguard, not an activated worker.
INSERT IGNORE INTO jrei_apex_mission_controls
  (singleton_id,planning_enabled,emergency_stop,execution_enabled,revision,updated_at)
VALUES (1,0,1,0,1,0);

-- No scheduled executor is installed or enabled here. Existing
-- operations_audit remains the owner-action audit authority.
