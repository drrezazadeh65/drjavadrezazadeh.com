-- JREI independent human review of a registered SOURCE candidate.
-- SOURCE ONLY, NOT EXECUTED. Run only in the final owner-approved,
-- backed-up mother-DB migration campaign, after earlier 20261023 exam tables.
-- No automatic rights discovery, source approval, download, OCR or publication.
CREATE TABLE IF NOT EXISTS jrei_ka_source_review_attestations (
  review_id CHAR(36) NOT NULL PRIMARY KEY,
  source_id CHAR(36) NOT NULL,
  reviewer_account_id CHAR(36) NULL,
  source_fingerprint_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  authority_evidence_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  private_rights_evidence_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  terms_evidence_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  decision VARCHAR(48) NOT NULL,
  reason_code VARCHAR(48) NULL,
  created_at BIGINT UNSIGNED NOT NULL,
  KEY idx_jrei_ka_source_review_source(source_id,created_at),
  KEY idx_jrei_ka_source_review_decision(decision,created_at),
  CONSTRAINT fk_jrei_ka_source_review_source
    FOREIGN KEY(source_id) REFERENCES jrei_exam_sources(source_id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_jrei_ka_source_review_actor
    FOREIGN KEY(reviewer_account_id) REFERENCES customer_accounts(id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Evidence digests are pointers, not legal documents or proof of truth.
-- Reviewed metadata never authorizes redistribution, learner-facing
-- questions, answer-key correctness or automatic generation.
