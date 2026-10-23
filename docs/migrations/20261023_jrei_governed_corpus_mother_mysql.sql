-- JREI V5.1 governed public holdout catalogue and node advertisements.
-- ADDITIVE, STAGED FOR THE SINGLE FINAL OWNER-AUTHORIZED MIGRATION.
-- Execute ONLY in the EXISTING drjavad1_store mother database after reviewing
-- the existing schema. Never create a second DB or overwrite live node keys.
-- No student records, raw source content, private prompts or model weights.

CREATE TABLE IF NOT EXISTS jrei_hybrid_public_datasets (
  dataset_id VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  evaluation_version VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  dataset_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  evidence_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  active_policy_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  active_policy_json VARCHAR(160) NOT NULL,
  source_label VARCHAR(160) NOT NULL,
  source_url VARCHAR(500) NOT NULL,
  licence_code VARCHAR(80) NOT NULL,
  reviewed_case_count INT UNSIGNED NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'PENDING',
  revision BIGINT UNSIGNED NOT NULL DEFAULT 1,
  proposed_at BIGINT UNSIGNED NOT NULL,
  proposed_by_account_id CHAR(36) NULL,
  approved_at BIGINT UNSIGNED NULL,
  approved_by_account_id CHAR(36) NULL,
  suspended_at BIGINT UNSIGNED NULL,
  updated_at BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (dataset_id,evaluation_version),
  KEY idx_jrei_corpus_status(status,updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Ephemeral digests declared by signed nodes. A declaration is not
-- scientific approval, actual file verification or independent attestation.
-- One row per node and locally advertised dataset ID; refreshed each poll.
CREATE TABLE IF NOT EXISTS jrei_hybrid_node_offers (
  node_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  dataset_id VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  dataset_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  evidence_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  evaluation_version VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  last_advertised_at BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (node_id,dataset_id),
  KEY idx_jrei_offer_freshness(last_advertised_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Never silently promote PENDING proposals. A SUPER_ADMIN must separately
-- approve source rights/independent holdout review and may suspend any version.
-- Never drop/truncate these tables or replay an unknown leased job.


-- Append-only coded owner review notes for JREI signed aggregate jobs.
-- This table contains no free-text decision rationale, student content,
-- raw model output, tokens, private source excerpts or worker credentials.
-- Original operations_audit remains the authoritative administrative audit.
CREATE TABLE IF NOT EXISTS jrei_hybrid_job_reviews (
  review_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  job_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  decision_code VARCHAR(24) NOT NULL,
  rationale_code VARCHAR(48) NOT NULL,
  job_revision_before BIGINT UNSIGNED NOT NULL,
  result_digest CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  reviewed_by_account_id CHAR(36) NULL,
  reviewed_at BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY(review_id),
  UNIQUE KEY uq_jrei_owner_review_job_revision(job_id,job_revision_before),
  KEY idx_jrei_review_timeline(reviewed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
