-- READ-ONLY Bertina phpMyAdmin preflight and post-migration verification.
-- Database: select drjavad1_store manually. These queries never read
-- personal customer fields, order contents, addresses or payment credentials.
-- Run BEFORE migration to inspect existing definitions and AFTER to verify.
-- Expected: 2 InnoDB tables; PRIMARY(order_id,sku); two case FKs;
-- exactly one CHECK forbidding a city for PHONE/VIDEO and requiring one for
-- IN_PERSON. Database CHECK cannot enforce a VIP/catalogue entitlement: PHP does.
SELECT DATABASE() AS selected_database;

SELECT table_name,engine,table_collation
FROM information_schema.tables
WHERE table_schema=DATABASE()
  AND table_name IN ('commerce_service_cases',
    'commerce_consultation_preferences',
    'commerce_consultation_preference_events')
ORDER BY table_name;

SELECT table_name,column_name,column_type,is_nullable,column_default
FROM information_schema.columns
WHERE table_schema=DATABASE()
  AND table_name IN ('commerce_consultation_preferences',
    'commerce_consultation_preference_events')
ORDER BY table_name,ordinal_position;

SELECT table_name,index_name,non_unique,
  GROUP_CONCAT(column_name ORDER BY seq_in_index SEPARATOR ',') AS indexed_columns
FROM information_schema.statistics
WHERE table_schema=DATABASE()
  AND table_name IN ('commerce_consultation_preferences',
    'commerce_consultation_preference_events')
GROUP BY table_name,index_name,non_unique
ORDER BY table_name,index_name;

SELECT table_name,constraint_name,referenced_table_name,
  GROUP_CONCAT(column_name ORDER BY ordinal_position SEPARATOR ',') AS local_columns,
  GROUP_CONCAT(referenced_column_name ORDER BY ordinal_position SEPARATOR ',') AS referenced_columns
FROM information_schema.key_column_usage
WHERE table_schema=DATABASE()
  AND table_name IN ('commerce_consultation_preferences',
    'commerce_consultation_preference_events')
  AND referenced_table_name IS NOT NULL
GROUP BY table_name,constraint_name,referenced_table_name
ORDER BY table_name,constraint_name;

-- A CREATE TABLE IF NOT EXISTS is NOT a schema-verification success.
-- Require both named foreign keys and the actual city/mode CHECK constraint;
-- verify their check_clause in the result. This joins table_constraints so
-- it works on MariaDB 10.11 and MySQL 8 information_schema differences.
SELECT tc.table_name,tc.constraint_name,tc.constraint_type,
  cc.check_clause
FROM information_schema.table_constraints AS tc
LEFT JOIN information_schema.check_constraints AS cc
  ON cc.constraint_schema=tc.constraint_schema
 AND cc.constraint_name=tc.constraint_name
WHERE tc.table_schema=DATABASE()
  AND tc.table_name IN ('commerce_consultation_preferences',
    'commerce_consultation_preference_events')
  AND tc.constraint_type IN ('FOREIGN KEY','CHECK')
ORDER BY tc.table_name,tc.constraint_type,tc.constraint_name;

-- Compare both composite FK columns against the live parent definition.
-- Differences in type, length, character set or collation require manual
-- investigation before migration; do not modify populated parent tables.
SELECT child.column_name,
  parent.column_type AS parent_type,
  parent.character_set_name AS parent_charset,
  parent.collation_name AS parent_collation,
  child.column_type AS child_type,
  child.character_set_name AS child_charset,
  child.collation_name AS child_collation
FROM information_schema.columns AS child
LEFT JOIN information_schema.columns AS parent
  ON parent.table_schema=child.table_schema
 AND parent.table_name='commerce_service_cases'
 AND parent.column_name=child.column_name
WHERE child.table_schema=DATABASE()
  AND child.table_name='commerce_consultation_preferences'
  AND child.column_name IN ('order_id','sku')
ORDER BY child.column_name;

-- Presence of table definitions only. No customer records are read.
SELECT 'commerce_consultation_preferences' AS checked_table,
  COUNT(*) AS table_present
FROM information_schema.tables
WHERE table_schema=DATABASE() AND table_name='commerce_consultation_preferences'
UNION ALL
SELECT 'commerce_consultation_preference_events',COUNT(*)
FROM information_schema.tables
WHERE table_schema=DATABASE() AND table_name='commerce_consultation_preference_events';
