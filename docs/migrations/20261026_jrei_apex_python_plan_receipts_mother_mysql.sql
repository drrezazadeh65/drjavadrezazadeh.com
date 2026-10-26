-- JREI APEX V2 Python proposal receipt (ADD-ONLY SOURCE; NOT APPLIED).
-- Existing mother DB drjavad1_store. No CREATE DATABASE or live migration.
-- Requires independent schema diff, verified backup/restore, clone QA and approval.
-- Stores a bounded model-free DAG, not user text, private records, executable
-- instructions, worker receipts, authorisation, scientific acceptance or success.
CREATE TABLE IF NOT EXISTS jrei_apex_mission_python_plans (
  mission_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
  proposal_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  proposal_json JSON NOT NULL,
  created_at BIGINT UNSIGNED NOT NULL,
  CONSTRAINT fk_apex_python_plan_mission FOREIGN KEY(mission_id)
    REFERENCES jrei_apex_owner_missions(mission_id) ON DELETE RESTRICT,
  KEY idx_apex_python_plan_created(created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- The separate JR_JREI_APEX_MISSION_PYTHON_PLAN_ENABLED flag remains OFF by default.
-- Registration of a proposal never starts a scheduled task or enables execution.
