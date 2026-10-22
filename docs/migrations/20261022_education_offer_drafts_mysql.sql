-- JR education offers: SOURCE-ONLY ADMIN DRAFT MIGRATION, NOT APPLIED.
-- Compatible with existing Bertina MariaDB/MySQL identity and operations audit.
-- This table is NOT a public price list, transaction system or entitlement.
-- All records are non-purchasable. A separately reviewed product delivery,
-- scientific gate, verified payment, contract and owner approval are mandatory.
-- DO NOT AUTOMATICALLY RUN this during source development.
CREATE TABLE IF NOT EXISTS operations_educational_offer_drafts (
  offer_id VARCHAR(64) NOT NULL PRIMARY KEY,
  proposed_price_toman BIGINT UNSIGNED NOT NULL,
  review_state ENUM('DRAFT','SUBMITTED_FOR_REVIEW') NOT NULL DEFAULT 'DRAFT',
  rationale VARCHAR(300) NOT NULL DEFAULT '',
  admin_desired TINYINT(1) NOT NULL DEFAULT 0,
  publicly_purchasable TINYINT(1) NOT NULL DEFAULT 0,
  row_revision INT UNSIGNED NOT NULL DEFAULT 1,
  updated_by_account_id CHAR(36) NOT NULL,
  updated_at BIGINT UNSIGNED NOT NULL,
  KEY idx_education_offer_review (review_state,updated_at),
  CONSTRAINT fk_education_offer_draft_admin
    FOREIGN KEY (updated_by_account_id) REFERENCES customer_accounts(id)
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- No triggers, no order rows, no links to checkout, no price activations.
-- The API always returns publiclyPurchasable=false irrespective of row state.
