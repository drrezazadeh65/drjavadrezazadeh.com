-- DRJAVAD ECOSYSTEM 5.0 | OWNER-REVIEWED PRODUCTION SCHEMA / STOCK INITIALIZATION
-- MariaDB 10.11 and MySQL 8. Requires explicit owner execution inside drjavad1_store.
-- DDL performs implicit commits; do not claim this is a rollbackable transaction.
-- Do NOT run until a suitable cPanel backup is confirmed and the owner authorizes
-- live migration. The private deployment recovery gate remains independent.
-- NEVER delete or alter the two existing commerce_orders, claims or customers.
-- Owner: 100 copies per each of the three books, confirmed 2026-10-13.
-- The owner's legacy pending book test is NOT a real customer hold and is
-- intentionally NOT inserted into commerce_book_reservations.
-- Existing rows in commerce_book_stock MUST NOT be overwritten. The first
-- insert is allowed only when that SKU has no existing row.
-- CAUTION: reconciled_at below records the owner's inventory declaration,
-- not a third-party physical audit. Reconfirm physical copies before shipping.

-- Stage 09 additive MySQL/MariaDB migration, SOURCE ONLY: DO NOT AUTO-RUN.
-- Requires owner-private signed/restorable Bertina backup and schema preflight.
-- No INSERT/UPDATE/DELETE to customer balances, orders or book inventory.
-- Never reseed historic inventory to the owner's original 1000 copies.
SET NAMES utf8mb4;
CREATE TABLE IF NOT EXISTS commerce_book_stock (
  sku VARCHAR(80) PRIMARY KEY,
  physical_on_hand INT UNSIGNED NOT NULL,
  reserved INT UNSIGNED NOT NULL DEFAULT 0,
  reconciled_at DATETIME NULL,
  reconciled_by VARCHAR(100) NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS commerce_book_reservations (
  order_id CHAR(36) NOT NULL,
  sku VARCHAR(80) NOT NULL,
  quantity INT UNSIGNED NOT NULL,
  state ENUM('reserved','committed','released') NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (order_id,sku),
  INDEX idx_book_reservations_sku_state (sku,state)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS commerce_stock_movements (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id CHAR(36) NOT NULL,
  sku VARCHAR(80) NOT NULL,
  reason ENUM('sale','release','adjustment','physical_return') NOT NULL,
  units INT NOT NULL,
  recorded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_book_movement (order_id,sku,reason),
  INDEX idx_book_movement_sku (sku,recorded_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS commerce_payment_claims (
  provider VARCHAR(24) NOT NULL,
  transaction_id VARCHAR(80) NOT NULL,
  order_id CHAR(36) NOT NULL,
  verified_amount BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (provider,transaction_id),
  UNIQUE KEY uq_payment_order (provider,order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS commerce_outbox (
  event_key VARCHAR(120) PRIMARY KEY,
  order_id CHAR(36) NOT NULL,
  event_type VARCHAR(40) NOT NULL,
  state ENUM('pending','processing','sent','failed') NOT NULL DEFAULT 'pending',
  attempts INT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_commerce_outbox_dispatch (state,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tables below create *no* service entitlements, bookings or parcel claims.
-- Each row must later be explicitly linked to an authenticated, paid order.
CREATE TABLE IF NOT EXISTS commerce_service_cases (
  order_id CHAR(36) NOT NULL,
  sku VARCHAR(80) NOT NULL,
  status ENUM('awaiting_contact','scheduling','booked','in_progress','delivered','cancelled') NOT NULL,
  booking_start DATETIME NULL,
  booking_end DATETIME NULL,
  delivered_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (order_id,sku)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS commerce_parcels (
  order_id CHAR(36) NOT NULL PRIMARY KEY,
  carrier VARCHAR(100) NULL,
  tracking_code VARCHAR(100) NULL,
  state ENUM('preparing','dispatched','in_transit','delivered','returned') NOT NULL,
  dispatched_at DATETIME NULL,
  delivered_at DATETIME NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_carrier_tracking (carrier,tracking_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS commerce_refund_requests (
  id CHAR(36) NOT NULL PRIMARY KEY,
  order_id CHAR(36) NOT NULL,
  requester_account_id CHAR(36) NOT NULL,
  status ENUM('requested','reviewing','approved','declined','settled') NOT NULL,
  reason_code VARCHAR(40) NOT NULL,
  requested_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  settled_at DATETIME NULL,
  INDEX idx_commerce_refunds_order (order_id),
  UNIQUE KEY uq_commerce_refund_request (order_id,requester_account_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Owner-supplied starting sellable inventory. Add missing SKU rows only;
-- never overwrite existing recorded stock, reservation or audit timestamps.
INSERT INTO commerce_book_stock(sku,physical_on_hand,reserved,reconciled_at,reconciled_by)
SELECT 'book:roshanaei',100,0,NOW(),'owner-declared-2026-10-13'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM commerce_book_stock WHERE sku='book:roshanaei');

INSERT INTO commerce_book_stock(sku,physical_on_hand,reserved,reconciled_at,reconciled_by)
SELECT 'book:tariki',100,0,NOW(),'owner-declared-2026-10-13'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM commerce_book_stock WHERE sku='book:tariki');

INSERT INTO commerce_book_stock(sku,physical_on_hand,reserved,reconciled_at,reconciled_by)
SELECT 'book:bonbast',100,0,NOW(),'owner-declared-2026-10-13'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM commerce_book_stock WHERE sku='book:bonbast');

-- Read-only release confirmation. One should see 8 Stage09 InnoDB tables,
-- and 3 stock rows. A SELECT here is NOT proof of provider settlement.
SELECT TABLE_NAME,ENGINE FROM information_schema.TABLES
WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN (
  'commerce_book_stock','commerce_book_reservations',
  'commerce_stock_movements','commerce_payment_claims','commerce_outbox',
  'commerce_service_cases','commerce_parcels','commerce_refund_requests'
) ORDER BY TABLE_NAME;
SELECT sku,physical_on_hand,reserved,reconciled_at,reconciled_by
FROM commerce_book_stock ORDER BY sku;
SELECT state,COUNT(*) AS existing_order_count
FROM commerce_orders GROUP BY state ORDER BY state;
