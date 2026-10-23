-- JREI V5.1 governed educational source discovery and version proposals.
-- STAGED, additive. Owner must approve migration in drjavad1_store.
-- This is NOT a live crawler, automatic source certification or a parallel DB.
-- Never store private correspondence, learner records, copyrighted fulltext,
-- source passwords, API credentials or model-generated educational claims.

CREATE TABLE IF NOT EXISTS jrei_public_source_registry (
  source_id VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
  issuer VARCHAR(160) NOT NULL,
  canonical_url VARCHAR(600) NOT NULL,
  content_type VARCHAR(12) NOT NULL,
  language_code VARCHAR(12) NOT NULL,
  trust_class VARCHAR(24) NOT NULL,
  licence_code VARCHAR(80) NOT NULL,
  usage_rights VARCHAR(32) NOT NULL,
  acquisition_method VARCHAR(32) NOT NULL,
  update_interval_hours SMALLINT UNSIGNED NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'PENDING',
  revision BIGINT UNSIGNED NOT NULL DEFAULT 1,
  proposed_at BIGINT UNSIGNED NOT NULL,
  approved_at BIGINT UNSIGNED NULL,
  suspended_at BIGINT UNSIGNED NULL,
  last_successful_fetch_at BIGINT UNSIGNED NULL,
  last_verified_publication_at BIGINT UNSIGNED NULL,
  last_approved_document_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  proposed_by_account_id CHAR(36) NULL,
  approved_by_account_id CHAR(36) NULL,
  updated_at BIGINT UNSIGNED NOT NULL,
  KEY idx_jrei_sources_status(status,updated_at),
  KEY idx_jrei_sources_fetch(status,last_successful_fetch_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Store provenance and change reports, NOT source body or extracted passage.
-- Review evidence is an external human task; nothing here automatically
-- supersedes an official amendment or changes published guidance.
CREATE TABLE IF NOT EXISTS jrei_public_source_proposals (
  proposal_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
  source_id VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  document_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  preceding_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  declared_mime VARCHAR(80) NOT NULL,
  byte_count INT UNSIGNED NOT NULL,
  observed_change VARCHAR(16) NOT NULL,
  retrieved_at BIGINT UNSIGNED NOT NULL,
  declared_publication_at BIGINT UNSIGNED NULL,
  origin_section VARCHAR(100) NULL,
  status VARCHAR(22) NOT NULL DEFAULT 'PENDING_REVIEW',
  revision BIGINT UNSIGNED NOT NULL DEFAULT 1,
  proposed_at BIGINT UNSIGNED NOT NULL,
  reviewed_at BIGINT UNSIGNED NULL,
  reviewed_by_account_id CHAR(36) NULL,
  proposed_by_account_id CHAR(36) NULL,
  UNIQUE KEY uq_jrei_source_version_hash(source_id,document_sha256),
  KEY idx_jrei_source_proposals_status(status,proposed_at),
  KEY idx_jrei_source_proposals_source(source_id,retrieved_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Security of network retrieval must be supplied by a separate HTTPS/DNS
-- pinned, robots- and rights-compliant acquisition adapter. These tables
-- alone do not trigger HTTP fetches or public educational publication.
