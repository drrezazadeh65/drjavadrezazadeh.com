-- 2026-10-17. Additive, encrypted, private service file custody; never public web storage.
-- Run after 20261012_stage09_commerce.sql, with reviewed Bertina backup and owner-gated migration.
-- The uploads are not entitlements, bank receipts, or claims of actual delivery.
CREATE TABLE IF NOT EXISTS commerce_service_files (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
  order_id CHAR(36) NOT NULL,
  sku VARCHAR(80) NOT NULL,
  kind ENUM('client_source','professional_output') NOT NULL,
  uploader_account_id CHAR(36) NOT NULL,
  storage_name CHAR(53) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  file_extension ENUM('pdf','docx') NOT NULL,
  mime_type VARCHAR(90) NOT NULL,
  plaintext_size INT UNSIGNED NOT NULL,
  content_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  consent_version VARCHAR(48) NOT NULL DEFAULT 'SERVICE_FILE_HANDLING_V1',
  subject_is_minor TINYINT(1) NOT NULL DEFAULT 0,
  guardian_acknowledged TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_service_file_storage (storage_name),
  KEY idx_service_files_case (order_id,sku,kind,created_at),
  CONSTRAINT fk_service_files_case FOREIGN KEY (order_id,sku)
    REFERENCES commerce_service_cases(order_id,sku) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
