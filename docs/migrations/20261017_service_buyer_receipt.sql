-- Additive buyer self-attested receipt record for a verified paid service output.
-- This DOES NOT prove independent network download, buyer satisfaction, refund or settlement.
-- Apply after 20261017_private_service_files.sql using the approved Bertina gate.
CREATE TABLE IF NOT EXISTS commerce_service_buyer_receipts (
  file_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  order_id CHAR(36) NOT NULL,
  sku VARCHAR(80) NOT NULL,
  account_id CHAR(36) NOT NULL,
  acknowledged_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (file_id),
  KEY idx_service_buyer_receipts_case (order_id,sku,acknowledged_at),
  CONSTRAINT fk_service_buyer_receipt_file
    FOREIGN KEY (file_id) REFERENCES commerce_service_files(id) ON DELETE RESTRICT,
  CONSTRAINT fk_service_buyer_receipt_case
    FOREIGN KEY (order_id,sku) REFERENCES commerce_service_cases(order_id,sku) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
