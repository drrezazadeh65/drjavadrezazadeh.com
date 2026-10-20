-- JR Konkur — read-only Bertina mother database compatibility check, 2026-10-20
-- SAFE IN phpMyAdmin: SELECT only; NO USE, DDL, data/PII, payments or updates.
-- Inspect results before contemplating proposed 003e migration.
-- The schema name is explicitly constrained so an accidental information_schema
-- phpMyAdmin context cannot produce false conclusions.
SELECT DATABASE() AS phpmyadmin_context,
       'drjavad1_store' AS canonical_target_schema,
       VERSION() AS db_engine_version,
       CASE WHEN DATABASE()='drjavad1_store'
            THEN 'TARGET_SELECTED'
            ELSE 'OTHER_CONTEXT_SELECT_TARGET_BEFORE_ANY_MIGRATION' END AS context_status;

-- 1) Confirm base dependencies, future additions and any potential naming clashes.
SELECT t.TABLE_NAME,t.ENGINE,t.TABLE_COLLATION,
       CASE WHEN t.TABLE_NAME IN (
         'customer_accounts','eco_schema_migrations','eco_institutions',
         'eco_object_refs','eco_pathway_options','eco_education_decisions',
         'eco_consent_records','eco_audit_events'
       ) THEN 'EXISTING_REUSE_DEPENDENCY'
       ELSE 'PROPOSED_003E_OR_OVERLAP_REVIEW' END AS classification
FROM information_schema.TABLES AS t
WHERE t.TABLE_SCHEMA='drjavad1_store'
  AND (t.TABLE_NAME IN (
    'customer_accounts','eco_schema_migrations','eco_institutions',
    'eco_object_refs','eco_pathway_options','eco_education_decisions',
    'eco_consent_records','eco_audit_events',
    'eco_admission_cycles','eco_admission_documents','eco_admission_document_pages',
    'eco_admission_import_batches','eco_admission_import_rows',
    'eco_admission_programme_offerings','eco_admission_offering_conditions',
    'eco_admission_rule_versions'
  ) OR t.TABLE_NAME REGEXP '(^eco_admission_|konkur|admission|university|programme)')
ORDER BY classification,t.TABLE_NAME;

-- 2) Inspect exact columns and compatible key types of the REUSED tables.
SELECT c.TABLE_NAME,c.ORDINAL_POSITION,c.COLUMN_NAME,c.COLUMN_TYPE,c.IS_NULLABLE,
       c.EXTRA,c.COLLATION_NAME
FROM information_schema.COLUMNS AS c
WHERE c.TABLE_SCHEMA='drjavad1_store'
 AND c.TABLE_NAME IN (
  'customer_accounts','eco_schema_migrations','eco_institutions',
  'eco_object_refs','eco_pathway_options','eco_education_decisions',
  'eco_consent_records','eco_audit_events'
 )
 AND c.COLUMN_NAME IN (
  'id','version','sha256','source_commit','applied_by','institution_code',
  'display_name','subject_id','account_id','storage_provider','object_reference',
  'content_sha256','consent_record_id'
 )
ORDER BY c.TABLE_NAME,c.ORDINAL_POSITION;

-- 3) Ensure the canonical PK/UK constraint and foreign-key environment is consistent.
SELECT k.TABLE_NAME,k.CONSTRAINT_NAME,k.COLUMN_NAME,k.ORDINAL_POSITION,
       k.REFERENCED_TABLE_NAME,k.REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE AS k
WHERE k.TABLE_SCHEMA='drjavad1_store'
 AND k.TABLE_NAME IN (
  'customer_accounts','eco_institutions','eco_object_refs',
  'eco_pathway_options','eco_education_decisions',
  'eco_admission_cycles','eco_admission_documents','eco_admission_document_pages',
  'eco_admission_import_batches','eco_admission_import_rows',
  'eco_admission_programme_offerings','eco_admission_offering_conditions',
  'eco_admission_rule_versions'
 )
ORDER BY k.TABLE_NAME,k.CONSTRAINT_NAME,k.ORDINAL_POSITION;

-- 4) Return explicit presence/absence flags. Missing dependencies block DDL.
SELECT required.TABLE_NAME AS required_table,
       CASE WHEN t.TABLE_NAME IS NULL THEN 'MISSING_BLOCK_MIGRATION'
            WHEN t.ENGINE<>'InnoDB' THEN 'NON_INNODB_BLOCK_MIGRATION'
            ELSE 'PRESENT_REVIEW_COLUMNS' END AS requirement_status
FROM (
 SELECT 'customer_accounts' AS TABLE_NAME
 UNION ALL SELECT 'eco_institutions'
 UNION ALL SELECT 'eco_object_refs'
 UNION ALL SELECT 'eco_schema_migrations'
) AS required
LEFT JOIN information_schema.TABLES t
 ON t.TABLE_SCHEMA='drjavad1_store' AND t.TABLE_NAME=required.TABLE_NAME
ORDER BY required.TABLE_NAME;

-- 5) Record the target table-count and default charset AS METADATA ONLY.
-- information_schema.TABLE_ROWS is intentionally NOT used to infer emptiness.
SELECT s.SCHEMA_NAME,s.DEFAULT_CHARACTER_SET_NAME,s.DEFAULT_COLLATION_NAME,
       (SELECT COUNT(*) FROM information_schema.TABLES AS x
        WHERE x.TABLE_SCHEMA='drjavad1_store' AND x.TABLE_TYPE='BASE TABLE')
        AS existing_base_tables
FROM information_schema.SCHEMATA AS s
WHERE s.SCHEMA_NAME='drjavad1_store';

-- Report results without emailing screenshots showing credentials, private rows or tokens.
-- After backups/restore evidence and approval, compare SHOW CREATE TABLE for any
-- existing proposed names; IF NOT EXISTS is NOT sufficient for drift management.
