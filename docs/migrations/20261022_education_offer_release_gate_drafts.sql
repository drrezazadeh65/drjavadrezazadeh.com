-- JR educational commerce release planning: ADDITIVE, SOURCE-ONLY.
-- Do not apply until owner-authorized mother-database migration at final QA.
-- No customer PII, order or payment row, access entitlement, or sale is created.
-- STATUS means editorial preparation, NOT independent approval/certification.
CREATE TABLE IF NOT EXISTS operations_educational_release_gate_drafts (
  offer_id VARCHAR(64) NOT NULL,
  gate_code VARCHAR(24) NOT NULL,
  review_state ENUM('NOT_STARTED','IN_PROGRESS','NEEDS_REVISION','READY_FOR_REVIEW')
    NOT NULL DEFAULT 'NOT_STARTED',
  owner_note VARCHAR(350) NOT NULL DEFAULT '',
  evidence_reference_sha256 CHAR(64) NULL,
  row_revision INT UNSIGNED NOT NULL DEFAULT 1,
  updated_by_account_id CHAR(36) NOT NULL,
  updated_at BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY(offer_id,gate_code),
  KEY idx_educational_release_review_state(review_state,updated_at),
  CONSTRAINT fk_educational_release_gate_owner
    FOREIGN KEY(updated_by_account_id) REFERENCES customer_accounts(id)
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- No automatic seeds or triggers. Every entry is a user-initiated draft.
-- External science/psychometric approval, bank settlement, actual fulfilment,
-- inventory, jurisdictional legal review, release QA and service availability
-- MUST each be independently verified before real commerce activation.
-- The release-gate API cannot enable any product or payment.
