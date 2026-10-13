-- READ ONLY. For operator use on the existing Bertina database before any installation.
-- Never treat information_schema.TABLE_ROWS (estimated) as proof of zero real rows.
SELECT DATABASE() AS database_name, VERSION() AS server_version, CURRENT_USER() AS sql_account,
       @@character_set_database AS default_charset, @@collation_database AS default_collation;
SELECT 'customer_accounts' AS table_name, COUNT(*) AS exact_rows FROM customer_accounts
UNION ALL
SELECT 'commerce_orders', COUNT(*) FROM commerce_orders;
SELECT TABLE_NAME, ENGINE, TABLE_COLLATION, CREATE_TIME
  FROM information_schema.TABLES
 WHERE TABLE_SCHEMA=DATABASE()
   AND (TABLE_NAME LIKE 'customer_%' OR TABLE_NAME LIKE 'commerce_%'
     OR TABLE_NAME LIKE 'operations_%' OR TABLE_NAME LIKE 'growth_%'
     OR TABLE_NAME LIKE 'student_support_%' OR TABLE_NAME LIKE 'social_%'
     OR TABLE_NAME LIKE 'eco_%')
 ORDER BY TABLE_NAME;
SELECT TABLE_NAME, CONSTRAINT_NAME, REFERENCED_TABLE_NAME
  FROM information_schema.KEY_COLUMN_USAGE
 WHERE TABLE_SCHEMA=DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL
 ORDER BY TABLE_NAME, CONSTRAINT_NAME;
-- Any nonempty account, payment, stock, consent or audit table requires explicit
-- preservation regardless of the owner's expectation that the DB is empty.
