-- JR Future Publishing v0.1.0; ADDITIVE SOURCE-ONLY MIGRATION, NOT APPLIED TO PRODUCTION.
-- Apply only after approved Bertina backup, Stage09 commerce tables, private fund policy
-- and signed author rights / owner acceptance. All monetary units are TOMAN (IRT).
-- Never store paid PDFs, bank credentials or children's records in public assets.
SET NAMES utf8mb4;
CREATE TABLE IF NOT EXISTS publishing_authors (
  id CHAR(36) NOT NULL PRIMARY KEY,
  slug VARCHAR(100) NOT NULL UNIQUE,
  display_name_fa VARCHAR(180) NOT NULL,
  display_name_en VARCHAR(180) NOT NULL,
  biography_public MEDIUMTEXT NULL,
  status ENUM('draft','verification_pending','approved','suspended') NOT NULL DEFAULT 'draft',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS publishing_author_accounts (
  author_id CHAR(36) NOT NULL,
  account_id CHAR(36) NOT NULL,
  role ENUM('author','editor') NOT NULL DEFAULT 'author',
  approved_at DATETIME NULL,
  revoked_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (author_id,account_id),
  INDEX idx_pub_account (account_id,revoked_at),
  CONSTRAINT fk_pub_author_account_author FOREIGN KEY (author_id) REFERENCES publishing_authors(id) ON DELETE RESTRICT,
  CONSTRAINT fk_pub_author_account_customer FOREIGN KEY (account_id) REFERENCES customer_accounts(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS publishing_works (
  id CHAR(36) NOT NULL PRIMARY KEY,
  author_id CHAR(36) NOT NULL,
  public_slug VARCHAR(140) NOT NULL UNIQUE,
  title_fa VARCHAR(255) NOT NULL,
  title_en VARCHAR(255) NULL,
  publication_status ENUM('draft','prelaunch','approved','retired') NOT NULL DEFAULT 'draft',
  scientific_review ENUM('pending','under_review','approved','changes_requested','rejected') NOT NULL DEFAULT 'pending',
  rights_verified_at DATETIME NULL,
  display_approved_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_pub_works_author (author_id,publication_status),
  CONSTRAINT fk_pub_work_author FOREIGN KEY (author_id) REFERENCES publishing_authors(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS publishing_work_versions (
  id CHAR(36) NOT NULL PRIMARY KEY,
  work_id CHAR(36) NOT NULL,
  version_number INT UNSIGNED NOT NULL,
  content_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  changelog TEXT NULL,
  review_state ENUM('submitted','under_review','accepted','declined') NOT NULL DEFAULT 'submitted',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_pub_work_version (work_id,version_number),
  CONSTRAINT fk_pub_version_work FOREIGN KEY (work_id) REFERENCES publishing_works(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS publishing_review_decisions (
  id CHAR(36) NOT NULL PRIMARY KEY,
  work_version_id CHAR(36) NOT NULL,
  reviewer_account_id CHAR(36) NOT NULL,
  scope_summary TEXT NOT NULL,
  decision ENUM('revision_requested','accepted_with_limitations','approved','rejected') NOT NULL,
  supporting_evidence_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  signed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pub_review_version FOREIGN KEY (work_version_id) REFERENCES publishing_work_versions(id) ON DELETE RESTRICT,
  CONSTRAINT fk_pub_review_reviewer FOREIGN KEY (reviewer_account_id) REFERENCES customer_accounts(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS publishing_rights_licences (
  id CHAR(36) NOT NULL PRIMARY KEY,
  work_id CHAR(36) NOT NULL,
  author_account_id CHAR(36) NOT NULL,
  rights_scope ENUM('digital_distribution','portrait','derivative_cover','print_distribution') NOT NULL,
  evidence_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  valid_from DATETIME NOT NULL,
  revoked_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_pub_rights (work_id,rights_scope,revoked_at),
  CONSTRAINT fk_pub_rights_work FOREIGN KEY (work_id) REFERENCES publishing_works(id) ON DELETE RESTRICT,
  CONSTRAINT fk_pub_rights_account FOREIGN KEY (author_account_id) REFERENCES customer_accounts(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS publishing_offers (
  id CHAR(36) NOT NULL PRIMARY KEY,
  work_id CHAR(36) NOT NULL,
  sku VARCHAR(80) NOT NULL UNIQUE,
  currency CHAR(3) NOT NULL DEFAULT 'IRT',
  unit_price_toman BIGINT UNSIGNED NOT NULL,
  unit_author_toman BIGINT UNSIGNED NOT NULL,
  unit_fund_toman BIGINT UNSIGNED NOT NULL,
  checkout_enabled TINYINT(1) NOT NULL DEFAULT 0,
  effective_from DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  retired_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_pub_offer_work (work_id,checkout_enabled),
  CONSTRAINT fk_pub_offer_work FOREIGN KEY (work_id) REFERENCES publishing_works(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS publishing_private_assets (
  id CHAR(36) NOT NULL PRIMARY KEY,
  work_version_id CHAR(36) NOT NULL,
  logical_kind ENUM('question_pdf','answer_pdf','other_pdf') NOT NULL,
  private_storage_name VARCHAR(90) NOT NULL UNIQUE,
  sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  byte_size BIGINT UNSIGNED NOT NULL,
  malware_scanned_at DATETIME NULL,
  encrypted_at_rest TINYINT(1) NOT NULL DEFAULT 1,
  approved_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_pub_asset_version (work_version_id,logical_kind),
  CONSTRAINT fk_pub_asset_version FOREIGN KEY (work_version_id) REFERENCES publishing_work_versions(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Append-only cash allocations. Every sale has +author/+fund; refunds add NEGATIVE compensating rows.
-- Entry creation must happen inside a verified payment transaction or idempotent outbox consumer.
-- Never seed directly, never assign entries to non-paid orders, and verify sum of split shares.
CREATE TABLE IF NOT EXISTS publishing_sale_allocation_entries (
  id CHAR(36) NOT NULL PRIMARY KEY,
  order_id CHAR(36) NOT NULL,
  offer_id CHAR(36) NOT NULL,
  author_id CHAR(36) NOT NULL,
  line_key VARCHAR(64) NOT NULL,
  entry_kind ENUM('author_share','talent_fund','author_reversal','fund_reversal') NOT NULL,
  amount_toman BIGINT NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'IRT',
  source_event_key VARCHAR(180) NOT NULL UNIQUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_pub_allocation_line (order_id,offer_id,line_key,entry_kind),
  INDEX idx_pub_allocation_author (author_id,created_at),
  INDEX idx_pub_allocation_order (order_id,created_at),
  CONSTRAINT fk_pub_allocation_order FOREIGN KEY (order_id) REFERENCES commerce_orders(id) ON DELETE RESTRICT,
  CONSTRAINT fk_pub_allocation_offer FOREIGN KEY (offer_id) REFERENCES publishing_offers(id) ON DELETE RESTRICT,
  CONSTRAINT fk_pub_allocation_author FOREIGN KEY (author_id) REFERENCES publishing_authors(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS publishing_author_settlements (
  id CHAR(36) NOT NULL PRIMARY KEY,
  author_id CHAR(36) NOT NULL,
  amount_toman BIGINT UNSIGNED NOT NULL,
  status ENUM('proposed','approved','bank_verified','reversed') NOT NULL DEFAULT 'proposed',
  reference_private_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  approved_by CHAR(36) NULL,
  bank_verified_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_pub_settlement_author (author_id,status),
  CONSTRAINT fk_pub_settlement_author FOREIGN KEY (author_id) REFERENCES publishing_authors(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS publishing_digital_access_grants (
  id CHAR(36) NOT NULL PRIMARY KEY,
  order_id CHAR(36) NOT NULL,
  offer_id CHAR(36) NOT NULL,
  asset_id CHAR(36) NOT NULL,
  buyer_account_id CHAR(36) NULL,
  token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  download_count INT UNSIGNED NOT NULL DEFAULT 0,
  max_downloads INT UNSIGNED NOT NULL DEFAULT 3,
  revoked_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_pub_grants_order (order_id,offer_id,revoked_at),
  CONSTRAINT fk_pub_grant_order FOREIGN KEY (order_id) REFERENCES commerce_orders(id) ON DELETE RESTRICT,
  CONSTRAINT fk_pub_grant_offer FOREIGN KEY (offer_id) REFERENCES publishing_offers(id) ON DELETE RESTRICT,
  CONSTRAINT fk_pub_grant_asset FOREIGN KEY (asset_id) REFERENCES publishing_private_assets(id) ON DELETE RESTRICT,
  CONSTRAINT fk_pub_grant_account FOREIGN KEY (buyer_account_id) REFERENCES customer_accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS publishing_notification_outbox (
  id CHAR(36) NOT NULL PRIMARY KEY,
  event_key VARCHAR(190) NOT NULL UNIQUE,
  order_id CHAR(36) NOT NULL,
  event_type ENUM('buyer_paid','author_sale','fund_allocation','delivery_failed','refund') NOT NULL,
  recipient_account_id CHAR(36) NULL,
  status ENUM('queued','processing','sent','retry','dead_letter') NOT NULL DEFAULT 'queued',
  attempts INT UNSIGNED NOT NULL DEFAULT 0,
  next_attempt_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sent_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_pub_outbox_next (status,next_attempt_at),
  CONSTRAINT fk_pub_outbox_order FOREIGN KEY (order_id) REFERENCES commerce_orders(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS publishing_audit_events (
  id CHAR(36) NOT NULL PRIMARY KEY,
  author_id CHAR(36) NULL,
  work_id CHAR(36) NULL,
  actor_account_id CHAR(36) NULL,
  action_key VARCHAR(100) NOT NULL,
  evidence_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_pub_audit_author (author_id,created_at),
  INDEX idx_pub_audit_work (work_id,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
