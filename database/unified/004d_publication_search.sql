-- Unified Bertina | 004d publication evidence, search visibility and future onsite search.
-- Request accepted != indexed; reporting unknown != zero; never auto-change canonical paths.
SET NAMES utf8mb4;
SET time_zone = '+00:00';
CREATE TABLE IF NOT EXISTS eco_publication_runs (
  id CHAR(36) NOT NULL PRIMARY KEY,
  release_sha CHAR(40) NOT NULL,
  runner_kind VARCHAR(60) NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'PLANNED',
  started_at DATETIME(3) NULL,
  finished_at DATETIME(3) NULL,
  evidence_url VARCHAR(500) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_eco_publication_sha (release_sha,status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_publication_receipts (
  id CHAR(36) NOT NULL PRIMARY KEY,
  run_id CHAR(36) NOT NULL,
  content_locale_id CHAR(36) NULL,
  canonical_url VARCHAR(500) NOT NULL,
  artifact_sha256 CHAR(64) NOT NULL,
  http_status SMALLINT UNSIGNED NULL,
  validated_at DATETIME(3) NULL,
  UNIQUE KEY uq_eco_public_receipt (run_id,artifact_sha256),
  FOREIGN KEY (run_id) REFERENCES eco_publication_runs(id) ON DELETE RESTRICT,
  FOREIGN KEY (content_locale_id) REFERENCES eco_content_locales(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_indexing_requests (
  id CHAR(36) NOT NULL PRIMARY KEY,
  canonical_url VARCHAR(500) NOT NULL,
  provider_code VARCHAR(40) NOT NULL,
  request_kind VARCHAR(40) NOT NULL,
  request_state VARCHAR(24) NOT NULL DEFAULT 'QUEUED',
  external_request_id VARCHAR(160) NULL,
  last_submitted_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_eco_index_request (provider_code,request_state,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_indexing_snapshots (
  id CHAR(36) NOT NULL PRIMARY KEY,
  canonical_url VARCHAR(500) NOT NULL,
  provider_code VARCHAR(40) NOT NULL,
  index_state VARCHAR(50) NOT NULL DEFAULT 'UNKNOWN',
  last_crawled_at DATETIME(3) NULL,
  sampled_at DATETIME(3) NOT NULL,
  source_code VARCHAR(60) NOT NULL,
  KEY idx_eco_index_state (provider_code,index_state,sampled_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_link_integrity_events (
  id CHAR(36) NOT NULL PRIMARY KEY,
  source_url VARCHAR(500) NOT NULL,
  target_url VARCHAR(500) NOT NULL,
  observed_status SMALLINT UNSIGNED NULL,
  failure_code VARCHAR(70) NULL,
  detected_at DATETIME(3) NOT NULL,
  resolved_at DATETIME(3) NULL,
  KEY idx_eco_link_broken (resolved_at,detected_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_content_search_documents (
  id CHAR(36) NOT NULL PRIMARY KEY,
  content_locale_id CHAR(36) NOT NULL,
  source_revision_id CHAR(36) NOT NULL,
  index_model_code VARCHAR(80) NOT NULL,
  derived_object_id CHAR(36) NULL,
  source_sha256 CHAR(64) NOT NULL,
  index_state VARCHAR(24) NOT NULL DEFAULT 'PENDING',
  indexed_at DATETIME(3) NULL,
  UNIQUE KEY uq_eco_search_doc (content_locale_id,index_model_code),
  FOREIGN KEY (content_locale_id) REFERENCES eco_content_locales(id) ON DELETE RESTRICT,
  FOREIGN KEY (source_revision_id) REFERENCES eco_content_revisions(id) ON DELETE RESTRICT,
  FOREIGN KEY (derived_object_id) REFERENCES eco_object_refs(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
