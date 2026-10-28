-- Owner-authorized one-time STOCK RECONCILIATION for the single
-- TWO-VOLUME Webster's collectible set. One two-volume set is ONE SKU.
-- Manual, emergency fallback reference only. The owner explicitly approved
-- automatic, idempotent first installation within the existing authenticated
-- one-click Bertina deployment on 2026-10-28. That path is implemented in
-- scripts/bertina-owner-webster-stock-on-deploy.php and does NOT expose a
-- general public migration endpoint. Never run this SQL separately if stock
-- has already been seeded, reserved, sold or otherwise reconciled.
-- The automatic installer checks/creates missing approved Stage09 tables and
-- verifies the actual mother database before attempting the single-row seed.
-- Owner's declaration on 2026-10-28: exactly one set physically on hand.
-- Run ONCE after verifying the current production DB/backup and that there
-- are no historic transactions for the exact SKU. Do not re-stock on deploy.
SET NAMES utf8mb4;
START TRANSACTION;
-- This INSERT is deliberately NOT an upsert. It cannot reset an existing
-- zero-on-hand sold item, an existing reservation, or a manually adjusted row.
-- The historical-order predicate also refuses to recreate missing stock for
-- a previously sold or pending order.
INSERT INTO commerce_book_stock
  (sku,physical_on_hand,reserved,reconciled_at,reconciled_by)
SELECT 'book:websters-third-1981',1,0,NOW(),'owner-confirmed-one-two-volume-set-2026-10-28'
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM commerce_book_stock
   WHERE sku='book:websters-third-1981'
)
AND NOT EXISTS (
  SELECT 1 FROM commerce_orders
   WHERE items_json LIKE '%"sku":"book:websters-third-1981"%'
)
AND NOT EXISTS (
  SELECT 1 FROM commerce_book_reservations
   WHERE sku='book:websters-third-1981'
)
AND NOT EXISTS (
  SELECT 1 FROM commerce_stock_movements
   WHERE sku='book:websters-third-1981'
);
COMMIT;
-- Non-mutating verification: physical_on_hand MUST be 1, reserved MUST
-- be 0, reservation ledger MUST be 0 and reconciled_at must not be NULL
-- before first payment. After the single paid sale, on_hand must be 0.
SELECT sku,physical_on_hand,reserved,reconciled_at,reconciled_by,
  (SELECT COALESCE(SUM(quantity),0) FROM commerce_book_reservations
   WHERE sku='book:websters-third-1981' AND state='reserved') AS held_units
FROM commerce_book_stock
WHERE sku='book:websters-third-1981';
