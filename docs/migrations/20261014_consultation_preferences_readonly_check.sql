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

-- Result counts only. Never export individual customers' preferences.
SELECT 'commerce_consultation_preferences' AS checked_table,
  COUNT(*) AS existing_rows
FROM information_schema.tables
WHERE table_schema=DATABASE() AND table_name='commerce_consultation_preferences'
UNION ALL
SELECT 'commerce_consultation_preference_events',COUNT(*)
FROM information_schema.tables
WHERE table_schema=DATABASE() AND table_name='commerce_consultation_preference_events';
