-- JREI curriculum + grade source-scope alignment attestations, SOURCE ONLY.
-- STAGED / NOT EXECUTED. Uses drjavad1_store and existing scope/source/admin.
-- Requires 20261023_jrei_exams_testly_research_mother_mysql.sql.
-- A reviewer attests only curriculum-ID/grade *metadata* alignment against
-- independently examined documentary evidence; never scientific answer truth.
CREATE TABLE IF NOT EXISTS jrei_ka_scope_alignment_current (
  requirement_id CHAR(36) NOT NULL PRIMARY KEY,
  source_id CHAR(36) NOT NULL,
  review_state VARCHAR(40) NOT NULL DEFAULT 'PENDING_INDEPENDENT_REVIEW',
  evidence_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  source_locator_digest CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  source_version VARCHAR(100) NOT NULL,
  source_updated_at BIGINT UNSIGNED NOT NULL,
  curriculum_id VARCHAR(100) NOT NULL,
  grade SMALLINT UNSIGNED NOT NULL,
  reviewed_by_account_id CHAR(36) NULL,
  reviewed_at BIGINT UNSIGNED NULL,
  revision BIGINT UNSIGNED NOT NULL DEFAULT 1,
  CONSTRAINT fk_jrei_ka_scope_alignment_scope
    FOREIGN KEY(requirement_id) REFERENCES jrei_exam_coverage_requirements(requirement_id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_jrei_ka_scope_alignment_source
    FOREIGN KEY(source_id) REFERENCES jrei_exam_sources(source_id) ON DELETE RESTRICT,
  CONSTRAINT fk_jrei_ka_scope_alignment_reviewer
    FOREIGN KEY(reviewed_by_account_id) REFERENCES customer_accounts(id)
    ON DELETE SET NULL,
  KEY idx_jrei_ka_alignment_review(review_state,reviewed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS jrei_ka_scope_alignment_history (
  decision_id CHAR(36) NOT NULL PRIMARY KEY,
  requirement_id CHAR(36) NOT NULL,
  source_id CHAR(36) NOT NULL,
  decision VARCHAR(40) NOT NULL,
  evidence_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  review_reason_code VARCHAR(48) NULL,
  source_updated_at BIGINT UNSIGNED NOT NULL,
  decided_by_account_id CHAR(36) NULL,
  created_at BIGINT UNSIGNED NOT NULL,
  KEY idx_jrei_ka_scope_alignment_history(requirement_id,created_at),
  CONSTRAINT fk_jrei_ka_scope_history_scope
    FOREIGN KEY(requirement_id) REFERENCES jrei_exam_coverage_requirements(requirement_id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_jrei_ka_scope_history_source
    FOREIGN KEY(source_id) REFERENCES jrei_exam_sources(source_id) ON DELETE RESTRICT,
  CONSTRAINT fk_jrei_ka_scope_history_actor
    FOREIGN KEY(decided_by_account_id) REFERENCES customer_accounts(id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Neither table changes candidate source rights, user consent, payment or
-- item bank. No first-party live source/curriculum verification is implied.
