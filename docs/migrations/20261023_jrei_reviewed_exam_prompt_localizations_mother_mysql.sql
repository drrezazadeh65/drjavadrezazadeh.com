-- JREI independently reviewed bilingual examination prompt translations.
-- SOURCE ONLY; NOT EXECUTED. Sole mother DB drjavad1_store.
-- Original eco_assessment_items / original answer options and score models
-- remain canonical. Every localised manifest uses the SAME immutable
-- original item UUID and original option UUIDs, never a second answer key.
CREATE TABLE IF NOT EXISTS jrei_exam_item_prompt_localizations (
  item_id CHAR(36) NOT NULL,
  locale VARCHAR(2) NOT NULL,
  object_ref_id CHAR(36) NOT NULL,
  original_item_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  localized_manifest_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  translation_rights_evidence_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  linguistic_equivalence_evidence_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  review_state VARCHAR(28) NOT NULL DEFAULT 'DRAFT',
  prepared_by_account_id CHAR(36) NULL,
  independently_reviewed_by_account_id CHAR(36) NULL,
  reviewed_at BIGINT UNSIGNED NULL,
  revision BIGINT UNSIGNED NOT NULL DEFAULT 1,
  created_at BIGINT UNSIGNED NOT NULL,
  updated_at BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY(item_id,locale),
  KEY idx_jrei_localized_item_review(review_state,reviewed_at),
  CONSTRAINT fk_jrei_localized_item_original FOREIGN KEY(item_id)
    REFERENCES eco_assessment_items(id) ON DELETE RESTRICT,
  CONSTRAINT fk_jrei_localized_item_object FOREIGN KEY(object_ref_id)
    REFERENCES eco_object_refs(id) ON DELETE RESTRICT,
  CONSTRAINT fk_jrei_localized_item_preparer FOREIGN KEY(prepared_by_account_id)
    REFERENCES customer_accounts(id) ON DELETE SET NULL,
  CONSTRAINT fk_jrei_localized_item_reviewer FOREIGN KEY(independently_reviewed_by_account_id)
    REFERENCES customer_accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- A registered translation is NEVER a model-generated free translation.
-- A separate human checks original meaning, option consistency,
-- terminology, accessibility and sensitive/math diagrams, alongside
-- original source rights, before setting review_state='APPROVED'.
-- The original answer-key and reproduction rights are always revalidated
-- at request time; no bilingual exam content is automatically published.

-- Append-only scientific/legal provenance for each explicitly recorded
-- review or withdrawal. Unlike mutable "current" pointers, this preserves
-- the evidence digests linked to the then-reviewed manifest and actor.
CREATE TABLE IF NOT EXISTS jrei_exam_prompt_locale_review_history (
  review_id CHAR(36) NOT NULL PRIMARY KEY,
  item_id CHAR(36) NOT NULL,
  locale VARCHAR(2) NOT NULL,
  reviewed_revision BIGINT UNSIGNED NOT NULL,
  object_ref_id CHAR(36) NOT NULL,
  original_item_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  localized_manifest_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  translation_rights_evidence_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  linguistic_equivalence_evidence_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  decision VARCHAR(28) NOT NULL,
  reviewer_account_id CHAR(36) NULL,
  created_at BIGINT UNSIGNED NOT NULL,
  UNIQUE KEY uq_jrei_locale_review_revision(item_id,locale,reviewed_revision),
  KEY idx_jrei_locale_history_created(created_at),
  CONSTRAINT fk_jrei_locale_history_current FOREIGN KEY(item_id,locale)
    REFERENCES jrei_exam_item_prompt_localizations(item_id,locale)
    ON DELETE RESTRICT,
  CONSTRAINT fk_jrei_locale_history_object FOREIGN KEY(object_ref_id)
    REFERENCES eco_object_refs(id) ON DELETE RESTRICT,
  CONSTRAINT fk_jrei_locale_history_reviewer FOREIGN KEY(reviewer_account_id)
    REFERENCES customer_accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- Historical attestation digests preserve audit context. They are not
-- transferable publication rights and cannot activate an item after recall.
