-- ADDITIVE ONLY: private, authenticated buyer-to-operator academic service brief.
-- OWNER: 2026-10-16. Apply only via the signed Bertina backup / migration gate.
-- No migration writes any payment record, customer data, or live entitlement.
-- Buyer text is AES-256-GCM encrypted in PHP before insertion, not stored in clear.
CREATE TABLE IF NOT EXISTS commerce_service_intakes (
  order_id CHAR(36) NOT NULL,
  sku VARCHAR(80) NOT NULL,
  payload_ciphertext MEDIUMTEXT NOT NULL,
  revision INT UNSIGNED NOT NULL DEFAULT 1,
  consent_version VARCHAR(40) NOT NULL,
  guardian_acknowledged TINYINT(1) NOT NULL DEFAULT 0,
  last_updated_by CHAR(36) NOT NULL,
  consented_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (order_id,sku),
  CONSTRAINT fk_commerce_service_intake_case FOREIGN KEY (order_id,sku)
    REFERENCES commerce_service_cases(order_id,sku) ON DELETE RESTRICT,
  CONSTRAINT ck_commerce_service_intake_revision CHECK(revision>=1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
