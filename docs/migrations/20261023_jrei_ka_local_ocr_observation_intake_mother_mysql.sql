-- JREI owner-recorded LOCAL OCR outcome metadata, SOURCE ONLY.
-- STAGED, NOT EXECUTED. Single existing mother DB: drjavad1_store.
-- Depends on jrei_ka_private_observations + jrei_ka_text_extraction_jobs.
-- Only a digest of the original owner-supplied offline manifest is retained.
-- Neither OCR document bytes nor Windows worker paths/identities are stored.
CREATE TABLE IF NOT EXISTS jrei_ka_local_ocr_observation_intake (
 observation_id CHAR(36) NOT NULL PRIMARY KEY,
 source_id CHAR(36) NOT NULL,
 original_pdf_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 ocr_text_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 ocr_page_manifest_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 recorded_manifest_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 rendered_page_count TINYINT UNSIGNED NOT NULL,
 empty_page_count TINYINT UNSIGNED NOT NULL,
 detected_math_page_count TINYINT UNSIGNED NOT NULL,
 intake_state VARCHAR(42) NOT NULL DEFAULT 'UNVERIFIED_LOCAL_OCR_OBSERVATION',
 recorded_by_account_id CHAR(36) NULL,
 recorded_at BIGINT UNSIGNED NOT NULL,
 FOREIGN KEY (observation_id) REFERENCES jrei_ka_private_observations(observation_id) ON DELETE RESTRICT,
 FOREIGN KEY (source_id) REFERENCES jrei_exam_sources(source_id) ON DELETE RESTRICT,
 FOREIGN KEY (recorded_by_account_id) REFERENCES customer_accounts(id) ON DELETE SET NULL,
 KEY idx_jrei_ka_local_ocr_intake(intake_state,recorded_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- A manual submission is an OBSERVATION CLAIM: no signed worker proof, OCR
-- accuracy, full-page coverage, formula fidelity, official exam validation,
-- personal-data right, publication, item creation or answer-key approval.
