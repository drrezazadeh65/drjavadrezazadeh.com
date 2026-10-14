# Canonical Bertina document registry — proposed migration, NOT executed
# Preconditions: identify the active canonical MariaDB schema and existing table names.
# Do not run until database backup, staging dry run, privilege review, and rollback test.
# This is a proposed additive table within the EXISTING canonical database, not a second database.
CREATE TABLE IF NOT EXISTS identity_document_registry (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  document_uuid CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  idempotency_key VARCHAR(768) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  source_type VARCHAR(60) NOT NULL,
  source_id VARCHAR(160) NOT NULL,
  document_type VARCHAR(60) NOT NULL,
  template_version VARCHAR(60) NOT NULL,
  brand_version VARCHAR(60) NOT NULL,
  account_reference VARCHAR(160) NOT NULL,
  status ENUM('pending','issued','revoked','superseded','failed') NOT NULL DEFAULT 'pending',
  private_storage_reference VARCHAR(512) DEFAULT NULL,
  content_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL,
  issued_at DATETIME(6) DEFAULT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_document_uuid (document_uuid),
  UNIQUE KEY uq_document_idempotency (idempotency_key),
  KEY idx_document_account (account_reference, created_at),
  KEY idx_document_source (source_type, source_id),
  KEY idx_document_status (status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
