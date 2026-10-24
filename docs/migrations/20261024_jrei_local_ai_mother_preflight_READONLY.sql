-- JREI-LM 2026-10-24 | SAFE READ-ONLY LIVE MOTHER-DB PREFLIGHT
-- Apply in Bertina phpMyAdmin -> SQL, NOT to information_schema.
-- This file NEVER writes data, changes schema, creates databases, or
-- selects user rows, payment records, model prompts or credentials.
-- Requires direct view of target drjavad1_store. Do not proceed to DDL
-- unless private backup is verified and the prerequisite column types match.

SELECT DATABASE() AS currently_selected_schema,
       'drjavad1_store' AS required_mother_schema,
       CASE WHEN DATABASE()='drjavad1_store'
         THEN 'CORRECT_SCHEMA' ELSE 'STOP_SELECT_MOTHER_DATABASE'
       END AS decision;

-- Existing commerce identity and four JREI migration groups.
SELECT wanted.stage,wanted.table_name,
       CASE WHEN t.TABLE_NAME IS NULL THEN 'MISSING'
         WHEN t.TABLE_TYPE<>'BASE TABLE' THEN 'STOP_NOT_BASE_TABLE'
         WHEN t.ENGINE<>'InnoDB' THEN 'STOP_WRONG_ENGINE'
         ELSE 'PRESENT_INNODB'
       END AS state,
       t.ENGINE,
       (SELECT COUNT(*) FROM information_schema.COLUMNS c
        WHERE c.TABLE_SCHEMA='drjavad1_store'
          AND c.TABLE_NAME=wanted.table_name) AS column_count
FROM (
  SELECT 'IDENTITY' AS stage,'customer_accounts' AS table_name
  UNION ALL SELECT 'HYBRID','jrei_hybrid_nodes'
  UNION ALL SELECT 'HYBRID','jrei_hybrid_jobs'
  UNION ALL SELECT 'HYBRID','jrei_hybrid_node_nonces'
  UNION ALL SELECT 'MODEL','jrei_local_model_registry'
  UNION ALL SELECT 'LOCAL_CHAT','jrei_local_chat_node_authorizations'
  UNION ALL SELECT 'LOCAL_CHAT','jrei_local_chat_jobs'
  UNION ALL SELECT 'OPERATIONS','operations_cron_jobs'
) wanted
LEFT JOIN information_schema.TABLES t
  ON t.TABLE_SCHEMA='drjavad1_store' AND t.TABLE_NAME=wanted.table_name
ORDER BY FIELD(wanted.stage,'IDENTITY','HYBRID','MODEL','LOCAL_CHAT','OPERATIONS'),wanted.table_name;

-- Confirm parent-key type, collation, indexes, and potentially existing JREI
-- child column types BEFORE running foreign-key-bearing CREATE TABLE DDL.
SELECT c.TABLE_NAME,c.COLUMN_NAME,c.COLUMN_TYPE,c.CHARACTER_SET_NAME,
       c.COLLATION_NAME,c.IS_NULLABLE,c.COLUMN_KEY
FROM information_schema.COLUMNS c
WHERE c.TABLE_SCHEMA='drjavad1_store' AND (
  (c.TABLE_NAME='customer_accounts' AND c.COLUMN_NAME='id') OR
  (c.TABLE_NAME='jrei_hybrid_nodes' AND
   c.COLUMN_NAME IN ('node_id','status','permitted_task','revision')) OR
  (c.TABLE_NAME='jrei_local_model_registry' AND
   c.COLUMN_NAME IN ('model_id','model_version','model_artifact_sha256')) OR
  (c.TABLE_NAME='operations_cron_jobs' AND
   c.COLUMN_NAME IN ('job_id','enabled','last_finished_at','last_state'))
)
ORDER BY c.TABLE_NAME,c.ORDINAL_POSITION;

-- Database server compatibility information without disclosing credentials.
SELECT VERSION() AS database_server_version,
       @@version_comment AS database_server_family;
