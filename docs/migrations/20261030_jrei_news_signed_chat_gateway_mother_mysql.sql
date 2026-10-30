-- JREI News: original-site signed API replay/idempotency holding ledger.
-- SOURCE ONLY. DO NOT EXECUTE OR APPLY DURING CODE-ONLY DEVELOPMENT.
-- Original drjavad1_store MySQL/MariaDB (one mother database).
-- Site is authority for QA, standing MFA policy, CMS, canonical paths and receipts.
-- Requires separately verified backup, restore rehearsal, private service key,
-- original master Cron acceptance and owner-authorized final migration.
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS jrei_news_site_nonces (
  nonce_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
  issued_at BIGINT UNSIGNED NOT NULL,
  expires_at BIGINT UNSIGNED NOT NULL,
  KEY idx_jrei_news_gateway_nonce_expiry(expires_at),
  CONSTRAINT ck_jrei_news_gateway_nonce_expiry CHECK (expires_at > issued_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS jrei_news_site_packets (
  packet_id VARCHAR(40) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
  packet_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  request_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  state VARCHAR(64) NOT NULL,
  verified_candidate_id CHAR(36) NULL,
  verified_revision_id CHAR(36) NULL,
  verified_publication_id CHAR(36) NULL,
  independent_qa_receipt_id CHAR(36) NULL,
  editorial_json LONGTEXT NULL,
  received_at BIGINT UNSIGNED NOT NULL,
  updated_at BIGINT UNSIGNED NOT NULL,
  UNIQUE KEY uq_jrei_news_gateway_packet_sha(packet_sha256),
  KEY idx_jrei_news_gateway_queue(state,received_at),
  KEY idx_jrei_news_gateway_verified_publication(verified_publication_id),
  CONSTRAINT ck_jrei_news_gateway_state CHECK (
    state IN (
      'RECEIVING',
      'HELD_FOR_ORIGINAL_INDEPENDENT_QA',
      'HELD_UNSUPPORTED_OR_REVOKED_SOURCE',
      'HELD_CONFLICT',
      'ORIGINAL_CMS_VERIFIED'
    )
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- No new Cron, user, editorial system, publisher or standing policy is created.
-- No packet is a review receipt or CMS publication merely by being stored.
-- Verified foreign-key mappings may be added only after live schema inspection.
