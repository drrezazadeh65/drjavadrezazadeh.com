-- JREI | canonical mother DB STRUCTURE ONLY, 2026-10-27.
-- No SQL executed by committing this file. No DDL, migration, credentials,
-- payments or personal/learner data. Only metadata from drjavad1_store.
-- IMPORTANT: phpMyAdmin's current DATABASE() may be information_schema even
-- when its breadcrumb identifies drjavad1_store. Do not use DATABASE() as a
-- filter for JREI mother-DB inventories. Explicit TABLE_SCHEMA on EVERY arm.
-- Never treat system views (ALL_PLUGINS, CHARACTER_SETS, etc.) as JREI tables.

SELECT
  DATABASE() AS execution_context,
  'drjavad1_store' AS intended_mother_schema,
  IF(DATABASE()='drjavad1_store',
     'CONTEXT_MATCHES_MOTHER',
     'CONTEXT_DIFFERENT_METADATA_REQUIRES_EXPLICIT_TARGET') AS context_state;

-- Actual JREI tables only, no information_schema system views, no user rows.
SELECT
  t.TABLE_NAME AS table_name,
  t.TABLE_TYPE AS table_type,
  t.ENGINE AS engine,
  COALESCE(c.col_count,0) AS total_columns
FROM information_schema.TABLES AS t
LEFT JOIN (
  SELECT TABLE_NAME, COUNT(*) AS col_count
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA='drjavad1_store'
    AND (LEFT(TABLE_NAME,5)='jrei_'
         OR TABLE_NAME='customer_accounts'
         OR TABLE_NAME='operations_cron_jobs')
  GROUP BY TABLE_NAME
) AS c ON c.TABLE_NAME=t.TABLE_NAME
WHERE t.TABLE_SCHEMA='drjavad1_store'
  AND t.TABLE_TYPE='BASE TABLE'
  AND (t.LEFT(TABLE_NAME,5)='jrei_'
       OR t.TABLE_NAME='customer_accounts'
       OR t.TABLE_NAME='operations_cron_jobs')
ORDER BY t.TABLE_NAME;

-- Exact Python bridge schema columns; explicit target on every read.
SELECT
  c.TABLE_NAME AS table_name,
  c.ORDINAL_POSITION AS ordinal_position,
  c.COLUMN_NAME AS column_name,
  c.COLUMN_TYPE AS column_type,
  c.IS_NULLABLE AS nullable,
  c.COLUMN_KEY AS key_type
FROM information_schema.COLUMNS AS c
WHERE c.TABLE_SCHEMA='drjavad1_store'
  AND c.TABLE_NAME IN (
    'jrei_python_node_health','jrei_python_canary_jobs','jrei_hybrid_nodes'
  )
ORDER BY c.TABLE_NAME,c.ORDINAL_POSITION;

-- The owner canary relies on unique idempotency and bounded lease indexes.
-- Missing index evidence is a blocker, not an invitation to add DDL blindly.
SELECT s.TABLE_NAME AS table_name,
       s.INDEX_NAME AS index_name,
       s.NON_UNIQUE AS non_unique,
       GROUP_CONCAT(s.COLUMN_NAME ORDER BY s.SEQ_IN_INDEX SEPARATOR ',') AS columns_in_order
FROM information_schema.STATISTICS AS s
WHERE s.TABLE_SCHEMA='drjavad1_store'
  AND s.TABLE_NAME IN ('jrei_python_canary_jobs','jrei_python_node_health')
GROUP BY s.TABLE_NAME,s.INDEX_NAME,s.NON_UNIQUE
ORDER BY s.TABLE_NAME,s.INDEX_NAME;

-- Interpretation: A zero-row return does not prove a table was deleted.
-- Confirm account/database grants, explicit target, and actual missing status
-- before authorising any migration. This source file cannot approve one.
