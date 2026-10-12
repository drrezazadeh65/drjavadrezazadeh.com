-- DrJavad Ecosystem 5.0 — Bertina MariaDB 10.11 READ-ONLY review.
-- Select drjavad1_store BEFORE running. NO DDL or data mutations.
-- Results are aggregates/structural metadata, not customer PII.
-- Run against the EXISTING 11-table live schema, prior to Stage09 migration.
SELECT DATABASE() AS selected_database, VERSION() AS server_version;
SELECT TABLE_NAME,ENGINE
FROM information_schema.TABLES
WHERE TABLE_SCHEMA=DATABASE()
  AND TABLE_NAME IN (
    'commerce_orders','commerce_book_stock','commerce_book_reservations',
    'commerce_stock_movements','commerce_payment_claims','commerce_outbox',
    'commerce_service_cases','commerce_parcels','commerce_refund_requests'
  ) ORDER BY TABLE_NAME;
SELECT COLUMN_NAME,DATA_TYPE,IS_NULLABLE
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='commerce_orders'
  AND COLUMN_NAME IN ('customer_email','customer_json','receipt_email_sent_at')
ORDER BY COLUMN_NAME;
SELECT state,COUNT(*) AS order_rows
FROM commerce_orders GROUP BY state ORDER BY state;
-- Pre-migration book case counts: no UUID, contact or transaction numbers exposed.
SELECT jt.sku,
  COALESCE(SUM(CASE WHEN o.state='paid' THEN jt.quantity ELSE 0 END),0) AS paid_book_units,
  COALESCE(SUM(CASE WHEN o.state IN ('created','pending') THEN jt.quantity ELSE 0 END),0) AS unpaid_book_units,
  COALESCE(SUM(CASE WHEN o.state='pending' THEN jt.quantity ELSE 0 END),0) AS pending_gateway_book_units
FROM commerce_orders AS o
JOIN JSON_TABLE(o.items_json,'$[*]' COLUMNS (
  kind VARCHAR(32) PATH '$.kind',
  sku VARCHAR(80) PATH '$.sku',
  quantity INT PATH '$.quantity'
)) AS jt
WHERE jt.kind='book'
GROUP BY jt.sku ORDER BY jt.sku;
-- Aggregate pending gateway cases; do not expose transaction identifiers.
SELECT COUNT(*) AS pending_gateway_book_orders
FROM commerce_orders
WHERE state='pending' AND JSON_VALID(items_json)=1
  AND items_json LIKE '%"kind":"book"%';
-- Historical paid-state without gateway reference remains a REVIEW signal,
-- not an assertion of bank settlement.
SELECT COUNT(*) AS paid_state_missing_provider_reference
FROM commerce_orders
WHERE state='paid' AND
  (provider_trans_id IS NULL OR provider_trans_id=''
   OR provider_id_get IS NULL OR provider_id_get='');
