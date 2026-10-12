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
  INDEX idx_commerce_refunds_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
