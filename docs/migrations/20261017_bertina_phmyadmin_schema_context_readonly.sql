-- 2026-10-17 | BERTINA phpMyAdmin schema-context diagnostic (READ ONLY).
-- Target: drjavad1_store. Safe even when phpMyAdmin currently browses
-- information_schema.COLUMNS and DATABASE() resolves to information_schema.
-- IMPORTANT: Never run or infer migrations from a zero-result CONTEXT query.
-- No tables are created, altered, dropped or populated. No customer/order rows,
-- identifiers, payment transaction details, email or credentials are selected.
--
-- STEP 1: show CURRENT context vs the approved site's TARGET schema.
SELECT DATABASE() AS phpmyadmin_current_context,
       'drjavad1_store' AS canonical_commerce_schema,
       CASE WHEN DATABASE()='drjavad1_store'
            THEN 'SAME_SCHEMA' ELSE 'DIFFERENT_CONTEXT_USE_EXPLICIT_SCHEMA' END AS interpretation;

-- STEP 2: Inventory by EXPLICIT schema name, independent of DATABASE().
-- Baseline: 9 Stage09 commerce tables (incl. commerce_orders), already
-- screenshot-observed on 2026-10-13. Newer 3 document/receipt tables are
-- separate migrations and must not be silently presumed deployed.
SELECT expected.stage,expected.table_name,
       CASE WHEN actual.TABLE_NAME IS NULL THEN 'NOT_FOUND_IN_TARGET_SCHEMA'
            WHEN actual.ENGINE='InnoDB' THEN 'PRESENT_INNODB'
            ELSE 'PRESENT_REVIEW_ENGINE' END AS table_status,
       actual.ENGINE AS storage_engine,
       COALESCE(cols.column_count,0) AS column_count
FROM (
    SELECT 'BASELINE_STAGE09' AS stage,'commerce_orders' AS table_name
    UNION ALL SELECT 'BASELINE_STAGE09','commerce_book_stock'
    UNION ALL SELECT 'BASELINE_STAGE09','commerce_book_reservations'
    UNION ALL SELECT 'BASELINE_STAGE09','commerce_stock_movements'
    UNION ALL SELECT 'BASELINE_STAGE09','commerce_payment_claims'
    UNION ALL SELECT 'BASELINE_STAGE09','commerce_outbox'
    UNION ALL SELECT 'BASELINE_STAGE09','commerce_service_cases'
    UNION ALL SELECT 'BASELINE_STAGE09','commerce_parcels'
    UNION ALL SELECT 'BASELINE_STAGE09','commerce_refund_requests'
    UNION ALL SELECT 'NEW_SERVICE_CUSTODY','commerce_service_files'
    UNION ALL SELECT 'NEW_SERVICE_CUSTODY','commerce_service_delivery_evidence'
    UNION ALL SELECT 'NEW_SERVICE_CUSTODY','commerce_service_buyer_receipts'
    UNION ALL SELECT 'ACCOUNT','customer_accounts'
    UNION ALL SELECT 'OPTIONAL_ECOSYSTEM','eco_order_evidence'
    UNION ALL SELECT 'OPTIONAL_ECOSYSTEM','eco_object_refs'
    UNION ALL SELECT 'OPTIONAL_ECOSYSTEM','eco_object_versions'
    UNION ALL SELECT 'OPTIONAL_ECOSYSTEM','eco_case_notes'
    UNION ALL SELECT 'OPTIONAL_ECOSYSTEM','eco_private_messages'
    UNION ALL SELECT 'OPTIONAL_ECOSYSTEM','eco_entitlements'
    UNION ALL SELECT 'OPTIONAL_ECOSYSTEM','eco_publication_receipts'
) AS expected
LEFT JOIN information_schema.TABLES AS actual
  ON actual.TABLE_SCHEMA='drjavad1_store'
 AND actual.TABLE_NAME=expected.table_name
LEFT JOIN (
  SELECT TABLE_NAME,COUNT(*) AS column_count
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA='drjavad1_store'
  GROUP BY TABLE_NAME
) AS cols ON cols.TABLE_NAME=expected.table_name
ORDER BY FIELD(expected.stage,
  'BASELINE_STAGE09','ACCOUNT','NEW_SERVICE_CUSTODY','OPTIONAL_ECOSYSTEM'),
  expected.table_name;

-- STEP 3: Display non-sensitive columns for these tables, in the TARGET schema.
-- A 0-row result here is meaningful only together with the Step 2 inventory.
SELECT TABLE_NAME,COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE,COLUMN_KEY
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA='drjavad1_store'
  AND (
    TABLE_NAME LIKE 'commerce_%'
    OR TABLE_NAME IN (
      'customer_accounts','eco_order_evidence','eco_object_refs',
      'eco_object_versions','eco_case_notes','eco_private_messages',
      'eco_entitlements','eco_publication_receipts'
    )
  )
ORDER BY TABLE_NAME,ORDINAL_POSITION;

-- STEP 4: Payment-claim unique constraints (read-only metadata only).
SELECT INDEX_NAME,NON_UNIQUE,
       GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX SEPARATOR ',') AS indexed_columns
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA='drjavad1_store'
  AND TABLE_NAME='commerce_payment_claims'
GROUP BY INDEX_NAME,NON_UNIQUE
ORDER BY INDEX_NAME;

-- INTERPRETATION:
-- (a) Stage09 shows PRESENT_INNODB: existing commerce foundation is present.
-- (b) New custody tables NOT_FOUND: host migrations are not evidenced;
--     leave upload/receipt endpoints fail-closed; do NOT improvise imports.
-- (c) Baseline tables NOT_FOUND: confirm actual live API db_dsn's DATABASE,
--     available MySQL schemas, and screenshot timestamp before ANY schema write.
-- (d) Optional ecosystem tables NOT_FOUND: do not conflate with commerce defects.
-- OWNER RELEASE FREEZE: 100% verified masterplan gate + explicit authorization.
