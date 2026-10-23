-- Additive mother DB schema: PRIVATE first-pass text extraction.
-- Must be applied only after approved KA source/observation migrations and
-- one consolidated owner-authorised acceptance campaign. NOT EXECUTED.
-- The original jrei_ka_private_observations owns acquisition provenance.
-- Text is kept outside public_html, no student data, financial ledger
-- or model-generated scientific assertion is stored in this table.
CREATE TABLE IF NOT EXISTS jrei_ka_text_extraction_jobs (
  observation_id CHAR(36) NOT NULL PRIMARY KEY,
  source_id CHAR(36) NOT NULL,
  processing_state VARCHAR(36) NOT NULL DEFAULT 'QUEUED',
  claimed_at BIGINT UNSIGNED NULL,
  claim_token CHAR(36) NULL,
  attempts SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  extraction_method VARCHAR(42) NULL,
  text_content_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  text_private_object_key VARCHAR(90) NULL,
  extracted_bytes INT UNSIGNED NULL,
  extracted_characters INT UNSIGNED NULL,
  detected_language VARCHAR(12) NULL,
  scanned_pdf_needs_ocr TINYINT(1) NOT NULL DEFAULT 0,
  math_or_diagram_integrity_review_required TINYINT(1) NOT NULL DEFAULT 1,
  extraction_review_required TINYINT(1) NOT NULL DEFAULT 1,
  failure_code VARCHAR(64) NULL,
  created_at BIGINT UNSIGNED NOT NULL,
  updated_at BIGINT UNSIGNED NOT NULL,
  KEY idx_jrei_ka_extract_queue(processing_state,created_at),
  KEY idx_jrei_ka_extract_source(source_id,processing_state),
  CONSTRAINT fk_jrei_ka_extract_observation FOREIGN KEY(observation_id)
    REFERENCES jrei_ka_private_observations(observation_id) ON DELETE RESTRICT,
  CONSTRAINT fk_jrei_ka_extract_source FOREIGN KEY(source_id)
    REFERENCES jrei_exam_sources(source_id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- No update to the original source approval, exam items, answer-key registry,
-- reviewed knowledge index or learner memory occurs in the extraction worker.
