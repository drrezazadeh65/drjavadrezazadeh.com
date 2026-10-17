-- JR Publishing contract and 7% cost ledger · additive candidate after
-- docs/migrations/20261017_jr_future_publishing.sql (publishing_* tables).
-- SOURCE ONLY. NEVER RUN automatically or without staged MySQL validation,
-- backup, rollback plan, rights approval, platform legal/tax audit and MFA.
-- Do not combine with experimental jr_pub_* draft tables.
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS publishing_author_contracts (
  id CHAR(36) NOT NULL PRIMARY KEY,
  author_id CHAR(36) NOT NULL,
  work_id CHAR(36) NOT NULL,
  version_label VARCHAR(60) NOT NULL,
  contract_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  private_document_key VARCHAR(120) NOT NULL UNIQUE,
  rights_scope ENUM('digital_nonexclusive','digital_exclusive') NOT NULL DEFAULT 'digital_nonexclusive',
  state ENUM('draft','legal_review','awaiting_author','awaiting_owner','both_signed','effective','expired','terminated','withdrawn') NOT NULL DEFAULT 'draft',
  effective_from DATETIME NULL,
  effective_until DATETIME NULL,
  template_created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  activated_at DATETIME NULL,
  UNIQUE KEY uq_pub_contract_version (author_id,work_id,version_label),
  KEY idx_pub_contract_author_state (author_id,state),
  CONSTRAINT fk_pub_contract_author FOREIGN KEY(author_id) REFERENCES publishing_authors(id) ON DELETE RESTRICT,
  CONSTRAINT fk_pub_contract_work FOREIGN KEY(work_id) REFERENCES publishing_works(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Only store attested real signatures/versions, never display a fake signed badge.
-- A simple unchecked web click is NOT a verified signature. Signed copies are
-- private outside public_html and have an immutable checksum.
CREATE TABLE IF NOT EXISTS publishing_contract_signature_evidence (
  id CHAR(36) NOT NULL PRIMARY KEY,
  contract_id CHAR(36) NOT NULL,
  signer_account_id CHAR(36) NOT NULL,
  signer_role ENUM('author','publisher') NOT NULL,
  signature_method ENUM('wet_signed_copy','verified_electronic_signature') NOT NULL,
  signed_document_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  private_signed_copy_key VARCHAR(120) NOT NULL,
  signature_at DATETIME NOT NULL,
  staff_verified_by CHAR(36) NULL,
  staff_verified_at DATETIME NULL,
  verification_state ENUM('submitted','accepted','rejected') NOT NULL DEFAULT 'submitted',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_pub_contract_signer_version (contract_id,signer_role),
  KEY idx_pub_signature_verification (verification_state,staff_verified_at),
  CONSTRAINT fk_pub_sig_contract FOREIGN KEY(contract_id) REFERENCES publishing_author_contracts(id) ON DELETE RESTRICT,
  CONSTRAINT fk_pub_sig_account FOREIGN KEY(signer_account_id) REFERENCES customer_accounts(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Each verified paid sale is split 60/40 INSIDE existing author and fund entries.
-- The 7% reserve is a SEPARATE platform expense. Do not deduct it from either
-- existing allocation and do not confuse it with a statutory tax rate.
-- Post one immutable expense reservation per verified order line, and offset
-- refunds by negative entries with an independent unique event key.
CREATE TABLE IF NOT EXISTS publishing_platform_cost_entries (
  id CHAR(36) NOT NULL PRIMARY KEY,
  order_id CHAR(36) NOT NULL,
  offer_id CHAR(36) NOT NULL,
  event_key VARCHAR(190) NOT NULL UNIQUE,
  reserve_rate_bps SMALLINT UNSIGNED NOT NULL,
  reserve_amount_toman BIGINT NOT NULL,
  entry_kind ENUM('reserve_on_sale','reserve_reversal') NOT NULL,
  evidence_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_pub_platform_order (order_id,created_at),
  CONSTRAINT fk_pub_platform_order FOREIGN KEY(order_id) REFERENCES commerce_orders(id) ON DELETE RESTRICT,
  CONSTRAINT fk_pub_platform_offer FOREIGN KEY(offer_id) REFERENCES publishing_offers(id) ON DELETE RESTRICT,
  CONSTRAINT chk_pub_reserve_bps CHECK(reserve_rate_bps<=10000),
  CONSTRAINT chk_pub_reserve_sign CHECK(
    (entry_kind='reserve_on_sale' AND reserve_amount_toman>=0) OR
    (entry_kind='reserve_reversal' AND reserve_amount_toman<=0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Internal platform budget is a separate financing source for 7%.
-- Entries record authorization/funding, not taxes actually paid.
CREATE TABLE IF NOT EXISTS publishing_platform_funding_entries (
  id CHAR(36) NOT NULL PRIMARY KEY,
  cost_entry_id CHAR(36) NOT NULL,
  funding_event_key VARCHAR(190) NOT NULL UNIQUE,
  amount_toman BIGINT NOT NULL,
  funding_state ENUM('proposed','approved','bank_reconciled','reversed') NOT NULL DEFAULT 'proposed',
  owner_approver_account CHAR(36) NULL,
  financial_evidence_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_pub_platform_funding (cost_entry_id,funding_state),
  CONSTRAINT fk_pub_platform_cost FOREIGN KEY(cost_entry_id) REFERENCES publishing_platform_cost_entries(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- In author dashboards: sale confirmed != amount settled; earmarked != paid;
-- reserve calculated != real expense; proposed funding != reconciled funding.
-- SQL schema creation is insufficient to enable actual checkout or signatures.
