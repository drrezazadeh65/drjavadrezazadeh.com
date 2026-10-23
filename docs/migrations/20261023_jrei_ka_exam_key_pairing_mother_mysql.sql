-- JREI-KA source-metadata-only paper/answer-key matching proposals.
-- Original mother DB drjavad1_store; additive, STAGED NOT EXECUTED.
-- Matches are NOT official keys, reviewed answers or permission to sell.
-- A correction may supersede either partner at any time.
CREATE TABLE IF NOT EXISTS jrei_ka_paper_key_candidates (
 candidate_id CHAR(36) NOT NULL PRIMARY KEY,
 paper_source_id CHAR(36) NOT NULL,
 key_source_id CHAR(36) NOT NULL,
 original_country_code CHAR(2) NOT NULL,
 original_examination_year SMALLINT UNSIGNED NOT NULL,
 review_state VARCHAR(42) NOT NULL DEFAULT 'NEEDS_INDEPENDENT_KEY_MATCH',
 provenance_state VARCHAR(42) NOT NULL DEFAULT 'MATCHED_SOURCE_METADATA_ONLY',
 rights_state VARCHAR(42) NOT NULL DEFAULT 'PRIVATE_REVIEW_ONLY',
 source_content_verified TINYINT(1) NOT NULL DEFAULT 0,
 key_correctness_verified TINYINT(1) NOT NULL DEFAULT 0,
 official_correction_checked TINYINT(1) NOT NULL DEFAULT 0,
 reviewer_account_id CHAR(36) NULL,
 reviewer_decision_at BIGINT UNSIGNED NULL,
 created_at BIGINT UNSIGNED NOT NULL,
 updated_at BIGINT UNSIGNED NOT NULL,
 UNIQUE KEY uq_jrei_ka_paper_key_pair(paper_source_id,key_source_id),
 KEY idx_jrei_ka_key_match_review(review_state,created_at),
 KEY idx_jrei_ka_key_source(key_source_id,review_state),
 CONSTRAINT fk_jrei_ka_pair_paper FOREIGN KEY(paper_source_id)
    REFERENCES jrei_exam_sources(source_id) ON DELETE RESTRICT,
 CONSTRAINT fk_jrei_ka_pair_key FOREIGN KEY(key_source_id)
    REFERENCES jrei_exam_sources(source_id) ON DELETE RESTRICT,
 CONSTRAINT fk_jrei_ka_pair_reviewer FOREIGN KEY(reviewer_account_id)
    REFERENCES customer_accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- An unreviewed matching source is NOT an examination scoring answer key.
