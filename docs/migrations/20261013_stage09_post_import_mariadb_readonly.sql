-- DrJavad v5.0 | READ-ONLY live MariaDB 10.11 post-import gate
-- Inspect against the real drjavad1_store database; no modifications, PII or secrets.
-- 8 new rows + the legacy commerce_orders should report ENGINE = InnoDB.
SELECT TABLE_NAME, ENGINE
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'drjavad1_store'
  AND TABLE_NAME IN (
    'commerce_orders','commerce_book_stock','commerce_book_reservations',
    'commerce_stock_movements','commerce_payment_claims','commerce_outbox',
    'commerce_service_cases','commerce_parcels','commerce_refund_requests'
  )
ORDER BY TABLE_NAME;

-- Primary(provider,transaction_id) and uq_payment_order(provider,order_id)
-- must each be UNIQUE (NON_UNIQUE=0). No payment values are returned.
SELECT INDEX_NAME, NON_UNIQUE,
       GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX SEPARATOR ',') AS indexed_columns
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = 'drjavad1_store'
  AND TABLE_NAME = 'commerce_payment_claims'
GROUP BY INDEX_NAME, NON_UNIQUE
ORDER BY INDEX_NAME;
