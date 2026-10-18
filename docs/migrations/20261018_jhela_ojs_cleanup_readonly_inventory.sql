-- JHELA / OJS retirement and unified mother-DB inventory
-- READ ONLY: safe to run from phpMyAdmin SQL tab in ANY selected schema.
-- No DROP, DELETE, ALTER, CREATE, UPDATE, INSERT, secrets or article bodies.
-- Record results before planning any deletion. Never assume OJS DB name.
-- Owner-approved main operational schema from repository: drjavad1_store
SELECT DATABASE() AS current_phpmyadmin_schema,
       VERSION() AS mariadb_mysql_version,
       @@character_set_server AS server_charset,
       @@collation_server AS server_collation;

-- A. All account-owned schemas, tables, approximate size; no data rows read.
SELECT s.SCHEMA_NAME AS database_name,
       COUNT(t.TABLE_NAME) AS tables_and_views,
       COALESCE(ROUND(SUM(t.DATA_LENGTH+t.INDEX_LENGTH)/1024/1024,2),0) AS approximate_mb,
       SUM(CASE WHEN t.TABLE_NAME IN
         ('submissions','submission_files','publication_settings','journals','users',
          'review_assignments','issues','article_settings') THEN 1 ELSE 0 END)
         AS ojs_like_table_name_hits
FROM information_schema.SCHEMATA s
LEFT JOIN information_schema.TABLES t ON t.TABLE_SCHEMA=s.SCHEMA_NAME
WHERE s.SCHEMA_NAME LIKE 'drjavad1\_%'
GROUP BY s.SCHEMA_NAME
ORDER BY s.SCHEMA_NAME;

-- B. Relevant table inventory in the mother DB; names and estimated sizes only.
SELECT TABLE_NAME,TABLE_TYPE,ENGINE,TABLE_ROWS AS estimated_rows,
       ROUND((DATA_LENGTH+INDEX_LENGTH)/1024/1024,2) AS approx_mb
FROM information_schema.TABLES
WHERE TABLE_SCHEMA='drjavad1_store'
  AND (TABLE_NAME LIKE 'customer\_%'
    OR TABLE_NAME LIKE 'commerce\_%'
    OR TABLE_NAME LIKE 'publishing\_%'
    OR TABLE_NAME LIKE 'jhela\_%'
    OR TABLE_NAME LIKE 'eco\_journal\_%'
    OR TABLE_NAME LIKE 'eco\_manuscript\_%'
    OR TABLE_NAME LIKE 'eco\_review\_%'
    OR TABLE_NAME LIKE 'eco\_reviewer\_%'
    OR TABLE_NAME LIKE 'eco\_editorial\_%'
    OR TABLE_NAME LIKE 'eco\_doi\_%'
    OR TABLE_NAME LIKE 'eco\_ojs\_%')
ORDER BY TABLE_NAME;

-- C. All table names from other account-owned DBs: distinguish an OJS
-- installation from unrelated backups or other active applications.
SELECT TABLE_SCHEMA AS database_name,TABLE_NAME,ENGINE,
       TABLE_ROWS AS estimated_rows,
       ROUND((DATA_LENGTH+INDEX_LENGTH)/1024/1024,2) AS approx_mb
FROM information_schema.TABLES
WHERE TABLE_SCHEMA LIKE 'drjavad1\_%'
  AND TABLE_SCHEMA <> 'drjavad1_store'
ORDER BY TABLE_SCHEMA,TABLE_NAME;

-- D. Mother DB FK relationships to journal tables (both directions).
SELECT CONSTRAINT_NAME,TABLE_NAME,COLUMN_NAME,
       REFERENCED_TABLE_NAME,REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA='drjavad1_store'
  AND REFERENCED_TABLE_NAME IS NOT NULL
  AND (TABLE_NAME LIKE 'jhela\_%'
    OR TABLE_NAME LIKE 'eco\_journal\_%'
    OR TABLE_NAME LIKE 'eco\_manuscript\_%'
    OR REFERENCED_TABLE_NAME LIKE 'jhela\_%'
    OR REFERENCED_TABLE_NAME LIKE 'eco\_journal\_%'
    OR REFERENCED_TABLE_NAME LIKE 'eco\_manuscript\_%')
ORDER BY TABLE_NAME,CONSTRAINT_NAME,ORDINAL_POSITION;

-- E. Inspect existing mother table columns and types before applying a
-- versioned journal migration. Never assume CHAR(36) UUIDs or installed eco_*.
SELECT TABLE_NAME,COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE,COLUMN_KEY
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA='drjavad1_store'
  AND TABLE_NAME IN
    ('customer_accounts','commerce_orders','eco_organizations',
     'eco_object_refs','eco_content_items','eco_schema_migrations',
     'eco_journals','eco_journal_manuscripts','jhela_intake_manuscripts')
ORDER BY TABLE_NAME,ORDINAL_POSITION;

-- F. Journal-related triggers, views, routines and scheduled events,
-- names only; no source code or credential output.
SELECT 'TRIGGER' AS object_kind,TRIGGER_SCHEMA AS database_name,
       TRIGGER_NAME AS object_name
FROM information_schema.TRIGGERS
WHERE TRIGGER_SCHEMA LIKE 'drjavad1\_%'
  AND (EVENT_OBJECT_TABLE LIKE 'jhela\_%'
    OR EVENT_OBJECT_TABLE LIKE 'eco\_journal\_%')
UNION ALL
SELECT 'ROUTINE',ROUTINE_SCHEMA,ROUTINE_NAME
FROM information_schema.ROUTINES
WHERE ROUTINE_SCHEMA LIKE 'drjavad1\_%'
  AND (ROUTINE_NAME LIKE '%jhela%' OR ROUTINE_NAME LIKE '%ojs%' OR ROUTINE_NAME LIKE '%journal%')
UNION ALL
SELECT 'EVENT',EVENT_SCHEMA,EVENT_NAME
FROM information_schema.EVENTS
WHERE EVENT_SCHEMA LIKE 'drjavad1\_%'
  AND (EVENT_NAME LIKE '%jhela%' OR EVENT_NAME LIKE '%ojs%' OR EVENT_NAME LIKE '%journal%')
ORDER BY database_name,object_kind,object_name;

-- Table counts from information_schema.TABLES are estimates for InnoDB.
-- Actual row counts for any proposed deletion must be confirmed separately
-- on a backed-up, precisely identified database after this audit.
