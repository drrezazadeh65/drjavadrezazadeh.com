-- SOURCE ONLY: apply to existing mother database after verified recovery/preflight.
-- No changes to existing BitPay payments, orders, inventory, or customer accounts.
CREATE TABLE IF NOT EXISTS commerce_usdt_quotes (
 order_id CHAR(36) PRIMARY KEY,
 account_id CHAR(36) NOT NULL,
 request_id CHAR(36) NOT NULL,
 request_digest CHAR(64) NOT NULL,
 amount_toman BIGINT UNSIGNED NOT NULL,
 rate_irr BIGINT UNSIGNED NOT NULL,
 rate_side ENUM('buyIRR','sellIRR') NOT NULL,
 amount_micros BIGINT UNSIGNED NOT NULL,
 receiver CHAR(42) NOT NULL,
 token_contract CHAR(42) NOT NULL,
 rate_observed_at BIGINT UNSIGNED NOT NULL,
 issued_at BIGINT UNSIGNED NOT NULL,
 expires_at BIGINT UNSIGNED NOT NULL,
 status ENUM('issued','submitted','settled','cancelled') NOT NULL DEFAULT 'issued',
 claimed_hash CHAR(66) NULL,
 settled_hash CHAR(66) NULL,
 credit_reference_hash CHAR(64) NULL,
 transferred_at BIGINT UNSIGNED NULL,
 credited_micros BIGINT UNSIGNED NULL,
 reviewer_id CHAR(36) NULL,
 reviewed_at BIGINT UNSIGNED NULL,
 review_note VARCHAR(1000) NULL,
 UNIQUE KEY uq_usdt_request(account_id,request_id),
 UNIQUE KEY uq_usdt_settled_hash(settled_hash),
 UNIQUE KEY uq_usdt_credit_ref(credit_reference_hash),
 KEY idx_usdt_status(status,issued_at),
 CONSTRAINT fk_usdt_order FOREIGN KEY(order_id) REFERENCES commerce_orders(id),
 CONSTRAINT fk_usdt_account FOREIGN KEY(account_id) REFERENCES customer_accounts(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Owner-confirmed contractual JREI offers, not public advertised starting prices.
CREATE TABLE IF NOT EXISTS commerce_usdt_authorized_offers (
 id CHAR(36) PRIMARY KEY,
 account_id CHAR(36) NOT NULL,
 sku VARCHAR(80) NOT NULL,
 title VARCHAR(160) NOT NULL,
 amount_toman BIGINT UNSIGNED NOT NULL,
 invoice_reference VARCHAR(100) NOT NULL,
 approved_by CHAR(36) NOT NULL,
 approved_at BIGINT UNSIGNED NOT NULL,
 expires_at BIGINT UNSIGNED NOT NULL,
 consumed_order_id CHAR(36) NULL,
 UNIQUE KEY uq_usdt_offer_invoice(account_id,invoice_reference),
 UNIQUE KEY uq_usdt_offer_order(consumed_order_id),
 KEY idx_usdt_offer_account(account_id,expires_at),
 CONSTRAINT fk_usdt_offer_account FOREIGN KEY(account_id) REFERENCES customer_accounts(id),
 CONSTRAINT fk_usdt_offer_order FOREIGN KEY(consumed_order_id) REFERENCES commerce_orders(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
