-- USDT BEP20 human reconciliation pilot. ADDITIVE ONLY, OFF until migrated.
-- Customer quote and settled state are NOT inferred from screenshots or a browser.
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS manual_usdt_claims (
 id CHAR(36) NOT NULL PRIMARY KEY,
 account_id CHAR(36) NOT NULL,
 purpose ENUM('donation','bookstore','service','golden_talent','journal_invoice','other') NOT NULL,
 order_id CHAR(36) DEFAULT NULL,
 invoice_reference VARCHAR(80) DEFAULT NULL,
 amount_claimed DECIMAL(20,6) DEFAULT NULL,
 quote_amount_usdt DECIMAL(20,6) DEFAULT NULL,
 quote_issued_at BIGINT UNSIGNED DEFAULT NULL,
 tx_hash CHAR(66) DEFAULT NULL,
 receipt_filename VARCHAR(90) DEFAULT NULL,
 receipt_mime ENUM('image/jpeg','image/png','application/pdf') DEFAULT NULL,
 receipt_bytes INT UNSIGNED DEFAULT NULL,
 status ENUM('submitted','under_review','needs_information','approved','rejected','fulfilled') NOT NULL DEFAULT 'submitted',
 admin_note VARCHAR(1500) DEFAULT NULL,
 reviewed_by CHAR(36) DEFAULT NULL,
 reviewed_at BIGINT UNSIGNED DEFAULT NULL,
 submitted_at BIGINT UNSIGNED NOT NULL,
 updated_at BIGINT UNSIGNED NOT NULL,
 email_notice_status ENUM('pending','accepted','failed') NOT NULL DEFAULT 'pending',
 email_notice_at BIGINT UNSIGNED DEFAULT NULL,
 UNIQUE KEY uq_manual_usdt_tx_hash (tx_hash),
 KEY idx_manual_usdt_user (account_id,submitted_at),
 KEY idx_manual_usdt_review (status,submitted_at),
 KEY idx_manual_usdt_order (order_id),
 CONSTRAINT fk_manual_usdt_account FOREIGN KEY (account_id) REFERENCES customer_accounts(id),
 CONSTRAINT fk_manual_usdt_reviewer FOREIGN KEY (reviewed_by) REFERENCES customer_accounts(id),
 CONSTRAINT ck_manual_usdt_nonempty_proof CHECK (tx_hash IS NOT NULL OR receipt_filename IS NOT NULL),
 CONSTRAINT ck_manual_usdt_amount CHECK (amount_claimed IS NULL OR amount_claimed > 0),
 CONSTRAINT ck_manual_usdt_quote CHECK (quote_amount_usdt IS NULL OR quote_amount_usdt > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS manual_usdt_audit (
 id CHAR(36) NOT NULL PRIMARY KEY,
 claim_id CHAR(36) NOT NULL,
 actor_id CHAR(36) NOT NULL,
 action ENUM('submitted','review_started','needs_information','approved','rejected','fulfilled') NOT NULL,
 note VARCHAR(1200) DEFAULT NULL,
 at_ts BIGINT UNSIGNED NOT NULL,
 PRIMARY KEY (id),
 KEY idx_manual_usdt_audit (claim_id,at_ts),
 CONSTRAINT fk_manual_usdt_audit_claim FOREIGN KEY (claim_id) REFERENCES manual_usdt_claims(id),
 CONSTRAINT fk_manual_usdt_audit_actor FOREIGN KEY (actor_id) REFERENCES customer_accounts(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
