-- JR Future Publishing: ADDITIVE multi-author digital edition, payment allocation and private fulfilment model.
-- Draft schema only, 2026-10-17. NOT INSTALLED ON BERTINA, NOT A DEPLOYMENT, NOT LIVE FINANCIAL AUTHORISATION.
-- Explicit owner approval, DB backup, current migrations and vetted reconciliation/rollback are required first.
-- Existing customer_accounts / commerce_orders remain authoritative for identities and paid orders.
-- Never put PDF binary, session tokens, gateway credentials, original portrait, passwords or child data in SQL.
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS jr_pub_authors (
  id CHAR(36) NOT NULL PRIMARY KEY,
  slug VARCHAR(100) NOT NULL,
  name_fa VARCHAR(190) NOT NULL,
  name_en VARCHAR(190) NULL,
  identity_state ENUM('pending','verified','suspended') NOT NULL DEFAULT 'pending',
  public_state ENUM('draft','approved','hidden') NOT NULL DEFAULT 'draft',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_jp_author_slug(slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS jr_pub_author_accounts (
  author_id CHAR(36) NOT NULL,
  account_id CHAR(36) NOT NULL,
  membership_state ENUM('requested','approved','revoked') NOT NULL DEFAULT 'requested',
  approved_by CHAR(36) NULL,
  approved_at DATETIME NULL,
  PRIMARY KEY (author_id,account_id),
  KEY idx_jp_author_member_account (account_id,membership_state),
  CONSTRAINT fk_jp_member_author FOREIGN KEY(author_id) REFERENCES jr_pub_authors(id) ON DELETE RESTRICT,
  CONSTRAINT fk_jp_member_account FOREIGN KEY(account_id) REFERENCES customer_accounts(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS jr_pub_works (
  id CHAR(36) NOT NULL PRIMARY KEY,
  slug VARCHAR(128) NOT NULL,
  title_fa VARCHAR(300) NOT NULL,
  title_en VARCHAR(300) NULL,
  public_state ENUM('draft','review','approved','listed','retired') NOT NULL DEFAULT 'draft',
  rights_state ENUM('unconfirmed','submitted','approved','revoked') NOT NULL DEFAULT 'unconfirmed',
  seo_slug_locked TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_jp_work_slug(slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS jr_pub_work_contributors (
  work_id CHAR(36) NOT NULL,
  author_id CHAR(36) NOT NULL,
  role ENUM('author','editor','compiler','translator','reviewer') NOT NULL DEFAULT 'author',
  credit_order SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  publicly_approved TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY(work_id,author_id,role),
  KEY idx_jp_author_works(author_id,role),
  CONSTRAINT fk_jp_contrib_work FOREIGN KEY(work_id) REFERENCES jr_pub_works(id) ON DELETE RESTRICT,
  CONSTRAINT fk_jp_contrib_author FOREIGN KEY(author_id) REFERENCES jr_pub_authors(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS jr_pub_editions (
  id CHAR(36) NOT NULL PRIMARY KEY,
  work_id CHAR(36) NOT NULL,
  version_label VARCHAR(48) NOT NULL,
  format ENUM('digital_pdf','epub','printed','other') NOT NULL,
  workflow_state ENUM('draft','submitted','peer_review','revisions','review_approved','commerce_approved','listed','withdrawn') NOT NULL DEFAULT 'draft',
  print_status ENUM('not_applicable','planned','in_press','published') NOT NULL DEFAULT 'not_applicable',
  scientific_approval_at DATETIME NULL,
  publication_rights_approved_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_jp_work_version(work_id,version_label),
  CONSTRAINT fk_jp_edition_work FOREIGN KEY(work_id) REFERENCES jr_pub_works(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS jr_pub_review_decisions (
  id CHAR(36) NOT NULL PRIMARY KEY,
  edition_id CHAR(36) NOT NULL,
  reviewer_account_id CHAR(36) NOT NULL,
  decision ENUM('needs_revision','limited_approval','full_approval','not_approved') NOT NULL,
  scope_summary TEXT NOT NULL,
  evidence_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  signed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_jp_review_edition(edition_id,created_at),
  CONSTRAINT fk_jp_review_edition FOREIGN KEY(edition_id) REFERENCES jr_pub_editions(id) ON DELETE RESTRICT,
  CONSTRAINT fk_jp_review_account FOREIGN KEY(reviewer_account_id) REFERENCES customer_accounts(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS jr_pub_private_assets (
  id CHAR(36) NOT NULL PRIMARY KEY,
  edition_id CHAR(36) NOT NULL,
  asset_role VARCHAR(48) NOT NULL,
  storage_key CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  mime_type VARCHAR(70) NOT NULL,
  bytes BIGINT UNSIGNED NOT NULL,
  scan_state ENUM('pending','clean','rejected') NOT NULL DEFAULT 'pending',
  approved_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_jp_private_key(storage_key),
  UNIQUE KEY uq_jp_asset_role(edition_id,asset_role),
  CONSTRAINT fk_jp_asset_edition FOREIGN KEY(edition_id) REFERENCES jr_pub_editions(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS jr_pub_contracts (
  id CHAR(36) NOT NULL PRIMARY KEY,
  edition_id CHAR(36) NOT NULL,
  sku VARCHAR(90) NOT NULL,
  gross_price_toman BIGINT UNSIGNED NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'IRT',
  author_basis_points SMALLINT UNSIGNED NOT NULL,
  talent_fund_basis_points SMALLINT UNSIGNED NOT NULL,
  status ENUM('draft','signed','active','superseded','cancelled') NOT NULL DEFAULT 'draft',
  evidence_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  signed_at DATETIME NULL,
  effective_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_jp_contract_sku_version(sku,id),
  KEY idx_jp_contract_edition(edition_id,status),
  CONSTRAINT fk_jp_contract_edition FOREIGN KEY(edition_id) REFERENCES jr_pub_editions(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- At commerce activation, app must enforce author_basis_points + talent_fund_basis_points = 10000,
-- active contract, independently verified rights, immutable server-side quote and owner-verified fund terms.

CREATE TABLE IF NOT EXISTS jr_pub_contract_authors (
  contract_id CHAR(36) NOT NULL,
  author_id CHAR(36) NOT NULL,
  author_fraction_basis_points SMALLINT UNSIGNED NOT NULL,
  PRIMARY KEY(contract_id,author_id),
  CONSTRAINT fk_jp_split_contract FOREIGN KEY(contract_id) REFERENCES jr_pub_contracts(id) ON DELETE RESTRICT,
  CONSTRAINT fk_jp_split_author FOREIGN KEY(author_id) REFERENCES jr_pub_authors(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- Sum of author fractions per contract must equal 10000. Each author's share = author subtotal * author fraction.
-- Reject/hold if any beneficiary or signed split is missing. Author membership alone grants no payout authority.

CREATE TABLE IF NOT EXISTS jr_pub_sale_events (
  id CHAR(36) NOT NULL PRIMARY KEY,
  order_id CHAR(36) NOT NULL,
  edition_id CHAR(36) NOT NULL,
  contract_id CHAR(36) NOT NULL,
  event_type ENUM('paid_sale','full_refund_reversal') NOT NULL,
  event_key VARCHAR(180) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  gross_delta_toman BIGINT NOT NULL,
  author_delta_toman BIGINT NOT NULL,
  talent_fund_delta_toman BIGINT NOT NULL,
  verified_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_jp_sale_event_key(event_key),
  UNIQUE KEY uq_jp_sale_kind(order_id,edition_id,event_type),
  KEY idx_jp_sale_edition(edition_id,created_at),
  KEY idx_jp_sale_contract(contract_id,created_at),
  CONSTRAINT fk_jp_sale_paid_order FOREIGN KEY(order_id) REFERENCES commerce_orders(id) ON DELETE RESTRICT,
  CONSTRAINT fk_jp_sale_edition FOREIGN KEY(edition_id) REFERENCES jr_pub_editions(id) ON DELETE RESTRICT,
  CONSTRAINT fk_jp_sale_contract FOREIGN KEY(contract_id) REFERENCES jr_pub_contracts(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- Immutable signed delta rows; only insert within verified idempotent paid order consumer transaction.
-- For single bundle: (gross, author, talent) = (1000000, 600000, 400000); a full refund reverses all.
-- No automatic chargeback accounting without independently verified provider evidence.

CREATE TABLE IF NOT EXISTS jr_pub_author_earnings (
  sale_event_id CHAR(36) NOT NULL,
  author_id CHAR(36) NOT NULL,
  author_delta_toman BIGINT NOT NULL,
  PRIMARY KEY(sale_event_id,author_id),
  CONSTRAINT fk_jp_earning_sale FOREIGN KEY(sale_event_id) REFERENCES jr_pub_sale_events(id) ON DELETE RESTRICT,
  CONSTRAINT fk_jp_earning_author FOREIGN KEY(author_id) REFERENCES jr_pub_authors(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- Each event's author_delta_toman must exactly equal SUM(jr_pub_author_earnings.author_delta_toman).

CREATE TABLE IF NOT EXISTS jr_pub_download_grants (
  id CHAR(36) NOT NULL PRIMARY KEY,
  sale_event_id CHAR(36) NOT NULL,
  buyer_account_id CHAR(36) NULL,
  token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  revoked_at DATETIME NULL,
  download_count SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  max_download_count SMALLINT UNSIGNED NOT NULL DEFAULT 5,
  UNIQUE KEY uq_jp_grant_token(token_hash),
  KEY idx_jp_grant_sale(sale_event_id,revoked_at),
  CONSTRAINT fk_jp_grant_sale FOREIGN KEY(sale_event_id) REFERENCES jr_pub_sale_events(id) ON DELETE RESTRICT,
  CONSTRAINT fk_jp_grant_buyer FOREIGN KEY(buyer_account_id) REFERENCES customer_accounts(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- Only hashes of high-entropy expiring tokens; never full URLs or raw tokens in DB. No public blob URLs.

CREATE TABLE IF NOT EXISTS jr_pub_mail_outbox (
  id CHAR(36) NOT NULL PRIMARY KEY,
  order_id CHAR(36) NOT NULL,
  sale_event_id CHAR(36) NOT NULL,
  event_key VARCHAR(180) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  recipient_role ENUM('buyer','author','operator') NOT NULL,
  recipient_account_id CHAR(36) NULL,
  template_code VARCHAR(80) NOT NULL,
  state ENUM('pending','in_progress','sent','retry','failed') NOT NULL DEFAULT 'pending',
  attempts SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  last_attempt_at DATETIME NULL,
  sent_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_jp_mail_event(event_key),
  KEY idx_jp_mail_queue(state,created_at),
  CONSTRAINT fk_jp_mail_order FOREIGN KEY(order_id) REFERENCES commerce_orders(id) ON DELETE RESTRICT,
  CONSTRAINT fk_jp_mail_sale FOREIGN KEY(sale_event_id) REFERENCES jr_pub_sale_events(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- Recipient email resolved from verified private account/order only at dispatch; do not disclose buyer identity
-- to author. SMTP dispatch must be retried with a bounded policy and operational failures surfaced to staff.

CREATE TABLE IF NOT EXISTS jr_pub_settlements (
  id CHAR(36) NOT NULL PRIMARY KEY,
  beneficiary_kind ENUM('author','talent_fund') NOT NULL,
  author_id CHAR(36) NULL,
  amount_toman BIGINT UNSIGNED NOT NULL,
  state ENUM('proposed','approved','transferred','reconciled','cancelled') NOT NULL DEFAULT 'proposed',
  evidence_reference VARCHAR(180) NULL,
  proposed_by CHAR(36) NOT NULL,
  approved_by CHAR(36) NULL,
  reconciled_by CHAR(36) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_jp_settlement_author(author_id,state),
  KEY idx_jp_settlement_kind(beneficiary_kind,state),
  CONSTRAINT fk_jp_settle_author FOREIGN KEY(author_id) REFERENCES jr_pub_authors(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- Transfer != entitlement. Require TWO independent approvals + reconciliation to actual bank statements.
-- Talent-support disbursement additionally follows existing student-support legal/guardian safeguarding.

CREATE TABLE IF NOT EXISTS jr_pub_audit (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  actor_account_id CHAR(36) NULL,
  action_code VARCHAR(90) NOT NULL,
  object_type VARCHAR(60) NOT NULL,
  object_id CHAR(36) NOT NULL,
  reason_code VARCHAR(120) NULL,
  occurred_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_jp_audit_object(object_type,object_id,occurred_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- STOP: There are deliberately NO seeded users, fake sales, merchant credentials or automatically enabled SKUs.
-- REST/API integration, settlement logic, malware scan and real SMTP still require reviewed implementation.
