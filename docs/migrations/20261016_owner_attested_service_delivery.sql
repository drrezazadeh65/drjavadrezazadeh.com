-- 2026-10-16 | Owner-attested service delivery evidence, additive Stage09 migration.
-- Apply only through the approved Bertina migration gate and operator backup policy.
-- This table never asserts bank settlement, customer notification or independent receipt.
CREATE TABLE IF NOT EXISTS commerce_service_delivery_evidence (
  order_id CHAR(36) NOT NULL,
  sku VARCHAR(80) NOT NULL,
  evidence_kind ENUM('session_completed','document_handed_over') NOT NULL,
  evidence_reference_hmac CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  owner_account_id CHAR(36) NOT NULL,
  attested_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (order_id,sku),
  KEY idx_delivery_owner_time (owner_account_id,attested_at),
  CONSTRAINT fk_service_delivery_case FOREIGN KEY (order_id,sku)
      REFERENCES commerce_service_cases(order_id,sku) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
