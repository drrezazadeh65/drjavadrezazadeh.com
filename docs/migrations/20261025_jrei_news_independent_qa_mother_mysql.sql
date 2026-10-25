-- Additive, central JREI News independently signed editorial QA audit.
-- Records immutable version/evidence bindings; NOT model self-approval.
-- Does not grant source rights, owner MFA, live Cron or CMS filesystem access.
-- Preflight production backup/restore before applying in drjavad1_store.
SET NAMES utf8mb4;
CREATE TABLE IF NOT EXISTS jrei_news_independent_qa_receipts (
  qa_id CHAR(36) NOT NULL PRIMARY KEY,
  revision_id CHAR(36) NOT NULL,
  candidate_id CHAR(36) NOT NULL,
  evidence_review_id CHAR(36) NOT NULL,
  evidence_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  editorial_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  audit_evidence_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  reviewer_account_id CHAR(36) NULL,
  independent_service_id VARCHAR(100) NULL,
  auditor_kind VARCHAR(32) NOT NULL,
  current_source_verified TINYINT(1) NOT NULL,
  all_claims_supported TINYINT(1) NOT NULL,
  no_material_contradictions TINYINT(1) NOT NULL,
  fa_en_complete TINYINT(1) NOT NULL,
  author_style_measured TINYINT(1) NOT NULL,
  next_steps_grounded TINYINT(1) NOT NULL,
  verified_media_ref VARCHAR(500) NOT NULL,
  verified_at BIGINT UNSIGNED NOT NULL,
  expires_at BIGINT UNSIGNED NOT NULL,
  revoked_at BIGINT UNSIGNED NULL,
  UNIQUE KEY uq_jrei_news_independent_qa_revision(revision_id),
  KEY idx_jrei_news_qa_current(expires_at,revoked_at),
  CONSTRAINT fk_jrei_news_qa_revision FOREIGN KEY(revision_id)
    REFERENCES jrei_news_editorial_versions(revision_id) ON DELETE RESTRICT,
  CONSTRAINT fk_jrei_news_qa_candidate FOREIGN KEY(candidate_id)
    REFERENCES jrei_news_candidates(candidate_id) ON DELETE RESTRICT,
  CONSTRAINT fk_jrei_news_qa_evidence FOREIGN KEY(evidence_review_id)
    REFERENCES jrei_news_evidence_reviews(review_id) ON DELETE RESTRICT,
  CONSTRAINT fk_jrei_news_qa_human FOREIGN KEY(reviewer_account_id)
    REFERENCES customer_accounts(id) ON DELETE RESTRICT,
  CONSTRAINT ck_jrei_news_qa_kind CHECK(
    auditor_kind IN ('INDEPENDENT_AUTOMATED_QA','INDEPENDENT_HUMAN_QA')),
  CONSTRAINT ck_jrei_news_qa_separation CHECK (
    (auditor_kind='INDEPENDENT_HUMAN_QA' AND reviewer_account_id IS NOT NULL
     AND independent_service_id IS NULL)
    OR (auditor_kind='INDEPENDENT_AUTOMATED_QA' AND reviewer_account_id IS NULL
        AND independent_service_id IS NOT NULL)),
  CONSTRAINT ck_jrei_news_qa_period CHECK(expires_at>verified_at),
  CONSTRAINT ck_jrei_news_qa_all_gates CHECK(
    current_source_verified=1 AND all_claims_supported=1 AND
    no_material_contradictions=1 AND fa_en_complete=1 AND
    author_style_measured=1 AND next_steps_grounded=1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
