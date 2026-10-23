-- Stage only; do not run before consolidated owner-approved DB acceptance.
-- Original mother drjavad1_store. Depends on private extraction/observation
-- migrations. These rows store fingerprints/byte spans only, NOT text.
-- A segment is a private scientific-review proposal, NOT a public citation
-- or independent research claim, regardless of its original source.
CREATE TABLE IF NOT EXISTS jrei_ka_private_passages (
 passage_id CHAR(36) NOT NULL PRIMARY KEY,
 observation_id CHAR(36) NOT NULL,
 source_id CHAR(36) NOT NULL,
 text_content_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 passage_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 byte_offset INT UNSIGNED NOT NULL,
 byte_length INT UNSIGNED NOT NULL,
 passage_index SMALLINT UNSIGNED NOT NULL,
 passage_state VARCHAR(36) NOT NULL DEFAULT 'NEEDS_SCIENTIFIC_REVIEW',
 review_rights_state VARCHAR(40) NOT NULL DEFAULT 'UNVERIFIED_FOR_PUBLIC_DISPLAY',
 created_at BIGINT UNSIGNED NOT NULL,
 reviewed_at BIGINT UNSIGNED NULL,
 reviewer_account_id CHAR(36) NULL,
 UNIQUE KEY uq_jrei_private_passage_span(observation_id,text_content_sha256,byte_offset,byte_length),
 UNIQUE KEY uq_jrei_private_passage_index(observation_id,passage_index),
 KEY idx_jrei_private_passage_review(passage_state,created_at),
 CONSTRAINT fk_jrei_private_passage_observation FOREIGN KEY(observation_id)
   REFERENCES jrei_ka_private_observations(observation_id) ON DELETE RESTRICT,
 CONSTRAINT fk_jrei_private_passage_source FOREIGN KEY(source_id)
   REFERENCES jrei_exam_sources(source_id) ON DELETE RESTRICT,
 CONSTRAINT fk_jrei_private_passage_reviewer FOREIGN KEY(reviewer_account_id)
   REFERENCES customer_accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS jrei_ka_private_passage_runs (
 observation_id CHAR(36) NOT NULL PRIMARY KEY,
 text_content_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 segmentation_version VARCHAR(32) NOT NULL DEFAULT 'PARAGRAPH_V1',
 run_state VARCHAR(36) NOT NULL DEFAULT 'PARTIAL_UNREVIEWED',
 stored_passage_count SMALLINT UNSIGNED NOT NULL DEFAULT 0,
 source_paragraph_count SMALLINT UNSIGNED NOT NULL DEFAULT 0,
 rejected_paragraph_count SMALLINT UNSIGNED NOT NULL DEFAULT 0,
 created_at BIGINT UNSIGNED NOT NULL,
 CONSTRAINT fk_jrei_private_passage_run_observation FOREIGN KEY(observation_id)
   REFERENCES jrei_ka_private_observations(observation_id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Never populate a user-facing retriever from these rows without a
-- separate legal permission and expert scholarly passage-review workflow.
