-- Additive private editorial review evidence. NOT EXECUTED.
-- A passage may be disclosed as a SHORT authorised quotation only after
-- independent source-rights and passage review. It is never a scientific
-- truth certificate, training grant, validated answer or assessment key.
CREATE TABLE IF NOT EXISTS jrei_ka_public_quote_attestations (
  review_id CHAR(36) NOT NULL PRIMARY KEY,
  passage_id CHAR(36) NOT NULL,
  source_id CHAR(36) NOT NULL,
  reviewer_account_id CHAR(36) NOT NULL,
  decision VARCHAR(45) NOT NULL,
  quoted_passage_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  reviewed_source_rights_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  independent_review_evidence_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  reviewer_acknowledges_claim_not_validated TINYINT(1) NOT NULL DEFAULT 1,
  reviewed_at BIGINT UNSIGNED NOT NULL,
  UNIQUE KEY uq_jrei_public_quote_passage(passage_id),
  KEY idx_jrei_public_quote_decision(decision,reviewed_at),
  CONSTRAINT fk_jrei_quote_passage FOREIGN KEY(passage_id)
      REFERENCES jrei_ka_private_passages(passage_id) ON DELETE RESTRICT,
  CONSTRAINT fk_jrei_quote_source FOREIGN KEY(source_id)
      REFERENCES jrei_exam_sources(source_id) ON DELETE RESTRICT,
  CONSTRAINT fk_jrei_quote_reviewer FOREIGN KEY(reviewer_account_id)
      REFERENCES customer_accounts(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
