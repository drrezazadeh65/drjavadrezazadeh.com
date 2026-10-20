-- JR Konkur catalogue 003e: READ-ONLY POST-APPLICATION ACCEPTANCE (2026-10-20).
-- Only after the proposed migration has been explicitly applied and the owner has
-- independently verified an encrypted backup and a successful restore test.
-- SELECT statements only. Always inspect exact drjavad1_store schema, not the phpMyAdmin context.

-- Exactly the eight proposed tables, with engine and charset validation.
SELECT expected.name AS required_table,
       CASE WHEN t.TABLE_NAME IS NULL THEN 'MISSING'
            WHEN t.ENGINE <> 'InnoDB' THEN 'BAD_ENGINE'
            WHEN t.TABLE_COLLATION <> 'utf8mb4_unicode_ci' THEN 'REVIEW_COLLATION'
            ELSE 'PRESENT_METADATA_ONLY' END AS check_result,
       t.ENGINE, t.TABLE_COLLATION
FROM (
 SELECT 'eco_admission_cycles' AS name
 UNION ALL SELECT 'eco_admission_documents'
 UNION ALL SELECT 'eco_admission_document_pages'
 UNION ALL SELECT 'eco_admission_import_batches'
 UNION ALL SELECT 'eco_admission_import_rows'
 UNION ALL SELECT 'eco_admission_programme_offerings'
 UNION ALL SELECT 'eco_admission_offering_conditions'
 UNION ALL SELECT 'eco_admission_rule_versions'
) AS expected
LEFT JOIN information_schema.TABLES t
 ON t.TABLE_SCHEMA='drjavad1_store' AND t.TABLE_NAME=expected.name
ORDER BY expected.name;

-- Check PRIMARY KEY/UNIQUE/FOREIGN KEY definitions against source, not only table names.
SELECT k.TABLE_NAME,k.CONSTRAINT_NAME,k.COLUMN_NAME,
       k.ORDINAL_POSITION,k.REFERENCED_TABLE_NAME,k.REFERENCED_COLUMN_NAME,
       tc.CONSTRAINT_TYPE
FROM information_schema.KEY_COLUMN_USAGE k
JOIN information_schema.TABLE_CONSTRAINTS tc
 ON tc.CONSTRAINT_SCHEMA=k.CONSTRAINT_SCHEMA
 AND tc.TABLE_SCHEMA=k.TABLE_SCHEMA AND tc.TABLE_NAME=k.TABLE_NAME
 AND tc.CONSTRAINT_NAME=k.CONSTRAINT_NAME
WHERE k.TABLE_SCHEMA='drjavad1_store'
  AND k.TABLE_NAME LIKE 'eco_admission_%'
ORDER BY k.TABLE_NAME,k.CONSTRAINT_NAME,k.ORDINAL_POSITION;

-- Compare all fields/defaults with 003e source; mandatory review states must remain fail-closed.
SELECT c.TABLE_NAME,c.ORDINAL_POSITION,c.COLUMN_NAME,c.COLUMN_TYPE,
       c.IS_NULLABLE,c.COLUMN_DEFAULT,c.COLLATION_NAME
FROM information_schema.COLUMNS c
WHERE c.TABLE_SCHEMA='drjavad1_store'
  AND c.TABLE_NAME LIKE 'eco_admission_%'
ORDER BY c.TABLE_NAME,c.ORDINAL_POSITION;

-- Report the number of tables found among the eight intended names (not data rows).
SELECT COUNT(*) AS proposal_tables_found,
       CASE WHEN COUNT(*)=8 THEN 'NAMES_PRESENT_CHECK_SHAPES_ABOVE'
            ELSE 'BLOCK_DATA_IMPORT' END AS status
FROM information_schema.TABLES
WHERE TABLE_SCHEMA='drjavad1_store' AND TABLE_TYPE='BASE TABLE'
 AND TABLE_NAME IN (
  'eco_admission_cycles','eco_admission_documents','eco_admission_document_pages',
  'eco_admission_import_batches','eco_admission_import_rows',
  'eco_admission_programme_offerings','eco_admission_offering_conditions',
  'eco_admission_rule_versions'
 );

-- Presence/shape does NOT certify approved source pages, imported data, reviewer authority
-- or production eligibility API readiness. Do not activate publication on this evidence alone.
