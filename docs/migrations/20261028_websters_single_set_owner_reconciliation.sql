-- Owner-authorized one-time STOCK RECONCILIATION for the single
-- TWO-VOLUME Webster's collectible set. One two-volume set is ONE SKU.
-- Manual owner-only reconciliation reference. Never execute automatically during
-- deployment or via an HTTP endpoint. Owner is responsible for the database.
-- Requires the approved Stage09 tables already installed and the owner to
-- verify this is still exactly one unsold, unreserved physical two-volume set.
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
