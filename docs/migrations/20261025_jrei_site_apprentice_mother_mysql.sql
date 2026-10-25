-- SOURCE ONLY; NOT RUN. Additive proposal for the EXISTING drjavad1_store.
-- Owner approval, real backup/restore evidence and live schema inventory REQUIRED.
-- No secondary database, model downloads, API secrets or user chat transcripts.
-- A source commit does not confer authority to learn from private user data.

CREATE TABLE IF NOT EXISTS jrei_site_apprentice_observations (
  record_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
  repository_name VARCHAR(130) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  commit_sha CHAR(40) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  commit_time_utc DATETIME NOT NULL,
  first_seen_at BIGINT UNSIGNED NOT NULL,
  changed_file_count INT UNSIGNED NOT NULL DEFAULT 0,
  domain_tags_json LONGTEXT NOT NULL,
  evidence_scope VARCHAR(52) NOT NULL DEFAULT 'GITHUB_COMMIT_FILENAMES_ONLY',
  evidence_state VARCHAR(35) NOT NULL DEFAULT 'OBSERVED_UNVERIFIED',
  ci_receipt_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  public_deploy_receipt_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  source_revoked_at BIGINT UNSIGNED NULL,
  UNIQUE KEY uq_jrei_apprentice_repo_commit(repository_name,commit_sha),
  KEY idx_jrei_apprentice_observed(first_seen_at,evidence_state)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS jrei_site_apprentice_lessons (
  lesson_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
  observation_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  practice_domain VARCHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  problem_summary VARCHAR(600) NOT NULL,
  approach_summary VARCHAR(600) NOT NULL,
  verification_summary VARCHAR(600) NOT NULL,
  limitations_summary VARCHAR(600) NOT NULL,
  rollback_summary VARCHAR(600) NOT NULL,
  risk_level VARCHAR(12) NOT NULL DEFAULT 'REVIEW',
  review_state VARCHAR(38) NOT NULL DEFAULT 'PROPOSED',
  independently_reviewed TINYINT(1) NOT NULL DEFAULT 0,
  accepted_for_retrieval TINYINT(1) NOT NULL DEFAULT 0,
  accepted_for_training TINYINT(1) NOT NULL DEFAULT 0,
  evidence_digests_json LONGTEXT NULL,
  owner_reviewer_account_id CHAR(36) NULL,
  owner_reviewed_at BIGINT UNSIGNED NULL,
  revoked_at BIGINT UNSIGNED NULL,
  created_at BIGINT UNSIGNED NOT NULL,
  updated_at BIGINT UNSIGNED NOT NULL,
  KEY idx_jrei_apprentice_lessons_review(review_state,practice_domain,created_at),
  CONSTRAINT fk_jrei_apprentice_lesson_observation FOREIGN KEY(observation_sha256)
    REFERENCES jrei_site_apprentice_observations(record_sha256) ON DELETE RESTRICT,
  CONSTRAINT fk_jrei_apprentice_lesson_reviewer FOREIGN KEY(owner_reviewer_account_id)
    REFERENCES customer_accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- This table is observation-only, not a tool executor or deployment approval.
CREATE TABLE IF NOT EXISTS jrei_site_apprentice_outcome_evidence (
  outcome_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
  lesson_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  observed_commit_sha CHAR(40) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  evidence_kind VARCHAR(28) NOT NULL,
  evidence_receipt_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  external_verification_state VARCHAR(32) NOT NULL DEFAULT 'UNKNOWN',
  reviewer_account_id CHAR(36) NULL,
  recorded_at BIGINT UNSIGNED NOT NULL,
  KEY idx_jrei_apprentice_outcomes(lesson_sha256,evidence_kind,recorded_at),
  CONSTRAINT fk_jrei_apprentice_outcome_lesson FOREIGN KEY(lesson_sha256)
    REFERENCES jrei_site_apprentice_lessons(lesson_sha256) ON DELETE RESTRICT,
  CONSTRAINT fk_jrei_apprentice_outcome_reviewer FOREIGN KEY(reviewer_account_id)
    REFERENCES customer_accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- NO SEED ROWS. NO AUTOMATIC APPROVAL. The source-only importer must
-- establish actual provider receipt, reviewer identity and safe redaction.
