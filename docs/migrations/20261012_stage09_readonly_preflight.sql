-- READ-ONLY operational acceptance; run privately after signed Bertina backup.
-- All queries use SELECT only. DO NOT publish results containing customer/order identifiers.
-- FIRST run against the existing schema (no Stage09 table required).
SELECT state,COUNT(*) AS orders,MIN(created_at) AS oldest,MAX(updated_at) AS latest
FROM commerce_orders GROUP BY state;
SELECT provider_trans_id,COUNT(*) AS seen
FROM commerce_orders
WHERE provider_trans_id IS NOT NULL AND provider_trans_id<>''
GROUP BY provider_trans_id HAVING COUNT(*)>1;
SELECT COUNT(*) AS historical_paid_without_gateway_reference
FROM commerce_orders
WHERE state='paid' AND (provider_trans_id IS NULL OR provider_trans_id='' OR provider_id_get IS NULL);
SELECT COUNT(*) AS pending_book_orders
FROM commerce_orders
WHERE state IN ('created','pending') AND items_json LIKE '%"kind":"book"%';
-- AFTER privately applying and verifying the additive migration, use:
SELECT table_name,engine
FROM information_schema.tables
WHERE table_schema=DATABASE()
  AND table_name IN (
    'commerce_book_stock','commerce_book_reservations','commerce_stock_movements',
    'commerce_payment_claims','commerce_outbox','commerce_service_cases',
    'commerce_parcels','commerce_refund_requests'
  ) ORDER BY table_name;
SELECT sku,physical_on_hand,reserved,(physical_on_hand-reserved) AS available,reconciled_at
FROM commerce_book_stock ORDER BY sku;
SELECT sku,COUNT(*) AS active_reservations,SUM(quantity) AS units_held
FROM commerce_book_reservations WHERE state='reserved' GROUP BY sku;
SELECT s.sku,s.reserved,COALESCE(r.held,0) AS reservation_units
FROM commerce_book_stock s LEFT JOIN
  (SELECT sku,SUM(quantity) AS held FROM commerce_book_reservations WHERE state='reserved' GROUP BY sku) r
  ON r.sku=s.sku
WHERE s.reserved<>COALESCE(r.held,0) OR s.physical_on_hand<s.reserved OR s.reconciled_at IS NULL;
SELECT COUNT(*) AS paid_order_rows, (SELECT COUNT(*) FROM commerce_payment_claims) AS unique_provider_claims
FROM commerce_orders WHERE state='paid';
SELECT o.id,o.provider_trans_id
FROM commerce_orders o LEFT JOIN commerce_payment_claims p
ON p.provider='bitpay' AND p.order_id=o.id AND p.transaction_id=o.provider_trans_id
WHERE o.state='paid' AND p.order_id IS NULL;
SELECT COUNT(*) AS pending_paid_events FROM commerce_outbox
WHERE state IN ('pending','processing','failed') AND event_type='order_paid';
-- Do not mark a paid row settled until confirmed independently against bank/merchant reports.
-- Do not auto-release 'pending' gateway reservations without provider-negative evidence.
