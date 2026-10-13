-- Unified Bertina | 002a finance extensions. Existing commerce_orders remains authoritative.
-- No bank settlement asserted without external verified evidence. Amounts are currency minor units.
SET NAMES utf8mb4;
SET time_zone = '+00:00';
CREATE TABLE IF NOT EXISTS eco_products (
  id CHAR(36) NOT NULL PRIMARY KEY,
  sku VARCHAR(100) NOT NULL UNIQUE,
  product_kind VARCHAR(32) NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'DRAFT',
  fulfilment_kind VARCHAR(32) NOT NULL,
  owner_organization_id CHAR(36) NULL,
  public_catalog_code VARCHAR(100) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_eco_product_public (public_catalog_code),
  FOREIGN KEY (owner_organization_id) REFERENCES eco_organizations(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_product_prices (
  id CHAR(36) NOT NULL PRIMARY KEY,
  product_id CHAR(36) NOT NULL,
  region_code VARCHAR(12) NOT NULL DEFAULT 'IR',
  currency_code CHAR(3) NOT NULL DEFAULT 'IRT',
  amount_minor BIGINT UNSIGNED NOT NULL,
  tax_included TINYINT(1) NOT NULL DEFAULT 0,
  valid_from DATETIME(3) NOT NULL,
  valid_until DATETIME(3) NULL,
  price_revision INT UNSIGNED NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_eco_price_revision (product_id,region_code,currency_code,price_revision),
  FOREIGN KEY (product_id) REFERENCES eco_products(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_carts (
  id CHAR(36) NOT NULL PRIMARY KEY,
  owner_account_id CHAR(36) NOT NULL,
  state VARCHAR(24) NOT NULL DEFAULT 'ACTIVE',
  expires_at DATETIME(3) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  KEY idx_eco_cart_owner (owner_account_id,state,expires_at),
  FOREIGN KEY (owner_account_id) REFERENCES customer_accounts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_cart_lines (
  id CHAR(36) NOT NULL PRIMARY KEY,
  cart_id CHAR(36) NOT NULL,
  product_id CHAR(36) NOT NULL,
  quantity INT UNSIGNED NOT NULL,
  selected_price_id CHAR(36) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_eco_cart_product (cart_id,product_id),
  FOREIGN KEY (cart_id) REFERENCES eco_carts(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES eco_products(id) ON DELETE RESTRICT,
  FOREIGN KEY (selected_price_id) REFERENCES eco_product_prices(id) ON DELETE SET NULL,
  CONSTRAINT ck_eco_cart_qty CHECK (quantity > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_order_lines (
  id CHAR(36) NOT NULL PRIMARY KEY,
  commerce_order_id CHAR(36) NOT NULL,
  line_no SMALLINT UNSIGNED NOT NULL,
  product_id CHAR(36) NULL,
  sku_snapshot VARCHAR(100) NOT NULL,
  quantity INT UNSIGNED NOT NULL,
  unit_minor BIGINT UNSIGNED NOT NULL,
  currency_code CHAR(3) NOT NULL DEFAULT 'IRT',
  tax_minor BIGINT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_eco_order_line_no (commerce_order_id,line_no),
  FOREIGN KEY (commerce_order_id) REFERENCES commerce_orders(id) ON DELETE RESTRICT,
  FOREIGN KEY (product_id) REFERENCES eco_products(id) ON DELETE SET NULL,
  CONSTRAINT ck_eco_order_line_qty CHECK (quantity > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_order_evidence (
  id CHAR(36) NOT NULL PRIMARY KEY,
  commerce_order_id CHAR(36) NOT NULL,
  evidence_kind VARCHAR(50) NOT NULL,
  external_ref VARCHAR(160) NULL,
  object_ref_id CHAR(36) NULL,
  sha256 CHAR(64) NOT NULL,
  observed_at DATETIME(3) NOT NULL,
  verification_state VARCHAR(32) NOT NULL DEFAULT 'UNVERIFIED',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_eco_order_evidence (commerce_order_id,evidence_kind,verification_state),
  FOREIGN KEY (commerce_order_id) REFERENCES commerce_orders(id) ON DELETE RESTRICT,
  FOREIGN KEY (object_ref_id) REFERENCES eco_object_refs(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_payment_events (
  id CHAR(36) NOT NULL PRIMARY KEY,
  commerce_order_id CHAR(36) NULL,
  provider_code VARCHAR(32) NOT NULL,
  provider_event_id VARCHAR(150) NOT NULL,
  event_kind VARCHAR(50) NOT NULL,
  received_at DATETIME(3) NOT NULL,
  signature_verified TINYINT(1) NOT NULL DEFAULT 0,
  payload_sha256 CHAR(64) NOT NULL,
  processing_state VARCHAR(24) NOT NULL DEFAULT 'RECEIVED',
  verified_at DATETIME(3) NULL,
  UNIQUE KEY uq_eco_payment_event (provider_code,provider_event_id),
  FOREIGN KEY (commerce_order_id) REFERENCES commerce_orders(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_settlement_batches (
  id CHAR(36) NOT NULL PRIMARY KEY,
  provider_code VARCHAR(32) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  bank_statement_object_id CHAR(36) NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'AWAITING_EVIDENCE',
  approved_by_account_id CHAR(36) NULL,
  verified_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  FOREIGN KEY (bank_statement_object_id) REFERENCES eco_object_refs(id) ON DELETE SET NULL,
  FOREIGN KEY (approved_by_account_id) REFERENCES customer_accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_settlement_entries (
  id CHAR(36) NOT NULL PRIMARY KEY,
  batch_id CHAR(36) NOT NULL,
  commerce_order_id CHAR(36) NULL,
  provider_reference VARCHAR(150) NOT NULL,
  expected_minor BIGINT UNSIGNED NOT NULL,
  confirmed_minor BIGINT UNSIGNED NULL,
  currency_code CHAR(3) NOT NULL DEFAULT 'IRT',
  status VARCHAR(28) NOT NULL DEFAULT 'UNRECONCILED',
  bank_evidence_sha256 CHAR(64) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_eco_settle_provider (batch_id,provider_reference),
  FOREIGN KEY (batch_id) REFERENCES eco_settlement_batches(id) ON DELETE RESTRICT,
  FOREIGN KEY (commerce_order_id) REFERENCES commerce_orders(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_refund_cases (
  id CHAR(36) NOT NULL PRIMARY KEY,
  commerce_order_id CHAR(36) NOT NULL,
  requester_account_id CHAR(36) NULL,
  state VARCHAR(28) NOT NULL DEFAULT 'REQUESTED',
  reason_code VARCHAR(50) NOT NULL,
  requested_minor BIGINT UNSIGNED NOT NULL,
  approved_minor BIGINT UNSIGNED NULL,
  currency_code CHAR(3) NOT NULL DEFAULT 'IRT',
  approved_by_account_id CHAR(36) NULL,
  bank_settled_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  FOREIGN KEY (commerce_order_id) REFERENCES commerce_orders(id) ON DELETE RESTRICT,
  FOREIGN KEY (requester_account_id) REFERENCES customer_accounts(id) ON DELETE SET NULL,
  FOREIGN KEY (approved_by_account_id) REFERENCES customer_accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_refund_evidence (
  id CHAR(36) NOT NULL PRIMARY KEY,
  refund_id CHAR(36) NOT NULL,
  evidence_code VARCHAR(60) NOT NULL,
  object_id CHAR(36) NULL,
  evidence_sha256 CHAR(64) NOT NULL,
  verified_by_account_id CHAR(36) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  FOREIGN KEY (refund_id) REFERENCES eco_refund_cases(id) ON DELETE RESTRICT,
  FOREIGN KEY (object_id) REFERENCES eco_object_refs(id) ON DELETE SET NULL,
  FOREIGN KEY (verified_by_account_id) REFERENCES customer_accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_invoices (
  id CHAR(36) NOT NULL PRIMARY KEY,
  commerce_order_id CHAR(36) NOT NULL,
  invoice_number VARCHAR(64) NOT NULL UNIQUE,
  issue_date DATE NOT NULL,
  currency_code CHAR(3) NOT NULL DEFAULT 'IRT',
  total_minor BIGINT UNSIGNED NOT NULL,
  buyer_snapshot_object_id CHAR(36) NULL,
  status VARCHAR(28) NOT NULL DEFAULT 'ISSUED',
  source_sha256 CHAR(64) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  FOREIGN KEY (commerce_order_id) REFERENCES commerce_orders(id) ON DELETE RESTRICT,
  FOREIGN KEY (buyer_snapshot_object_id) REFERENCES eco_object_refs(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_invoice_lines (
  id CHAR(36) NOT NULL PRIMARY KEY,
  invoice_id CHAR(36) NOT NULL,
  line_no SMALLINT UNSIGNED NOT NULL,
  description_snapshot VARCHAR(320) NOT NULL,
  quantity INT UNSIGNED NOT NULL,
  unit_minor BIGINT UNSIGNED NOT NULL,
  tax_minor BIGINT UNSIGNED NOT NULL DEFAULT 0,
  UNIQUE KEY uq_eco_invoice_line (invoice_id,line_no),
  FOREIGN KEY (invoice_id) REFERENCES eco_invoices(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
