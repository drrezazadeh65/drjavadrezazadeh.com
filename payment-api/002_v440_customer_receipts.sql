-- v4.4.0-alpha additive migration for EXISTING Cloudflare D1 binding DB.
-- Must be applied ONCE before deploying updated commerce worker. Back up D1 first.
-- This migration intentionally leaves legacy payment_orders untouched.
ALTER TABLE commerce_orders ADD COLUMN customer_json TEXT;
ALTER TABLE commerce_orders ADD COLUMN receipt_token_sha256 TEXT;
ALTER TABLE commerce_orders ADD COLUMN idempotency_key TEXT;
ALTER TABLE commerce_orders ADD COLUMN fulfilment_state TEXT NOT NULL DEFAULT 'awaiting_payment';
ALTER TABLE commerce_orders ADD COLUMN tracking_code TEXT;
ALTER TABLE commerce_orders ADD COLUMN receipt_email_sent_at TEXT;
ALTER TABLE commerce_orders ADD COLUMN receipt_token_wrapped TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS commerce_orders_idempotency ON commerce_orders(idempotency_key);
CREATE INDEX IF NOT EXISTS commerce_orders_fulfilment ON commerce_orders(fulfilment_state,created_at);
-- Do NOT include customer addresses or receipt tokens in analytics or access logs.
