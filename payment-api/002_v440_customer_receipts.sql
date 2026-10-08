-- v4.4.0-alpha additive migration for EXISTING Cloudflare D1 binding DB.
-- Must be applied ONCE before deploying updated commerce worker. Back up D1 first.
-- This migration intentionally leaves legacy payment_orders untouched.
ALTER TABLE commerce_orders ADD COLUMN customer_json TEXT;
ALTER TABLE commerce_orders ADD COLUMN receipt_token_sha256 TEXT;
ALTER TABLE commerce_orders ADD COLUMN idempotency_key TEXT;
ALTER TABLE commerce_orders ADD COLUMN request_fingerprint TEXT;
ALTER TABLE commerce_orders ADD COLUMN fulfilment_state TEXT NOT NULL DEFAULT 'awaiting_payment';
ALTER TABLE commerce_orders ADD COLUMN tracking_code TEXT;
ALTER TABLE commerce_orders ADD COLUMN receipt_email_sent_at TEXT;
ALTER TABLE commerce_orders ADD COLUMN receipt_token_wrapped TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS commerce_orders_idempotency ON commerce_orders(idempotency_key);
CREATE INDEX IF NOT EXISTS commerce_orders_fulfilment ON commerce_orders(fulfilment_state,created_at);
-- Do NOT include customer addresses or receipt tokens in analytics or access logs.

CREATE TABLE IF NOT EXISTS commerce_fulfilment_events (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 order_id TEXT NOT NULL REFERENCES commerce_orders(id),
 actor_email TEXT NOT NULL,
 previous_state TEXT NOT NULL,
 next_state TEXT NOT NULL,
 tracking_code TEXT,
 changed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS commerce_fulfilment_events_order ON commerce_fulfilment_events(order_id,changed_at);

-- Refund workflow records review requests only. It never makes or certifies a bank refund.
CREATE TABLE IF NOT EXISTS commerce_refund_requests (
 id TEXT PRIMARY KEY,
 order_id TEXT NOT NULL UNIQUE REFERENCES commerce_orders(id),
 reason TEXT NOT NULL CHECK(length(reason) BETWEEN 20 AND 500),
 state TEXT NOT NULL DEFAULT 'requested'
  CHECK(state IN ('requested','reviewing','declined','approved_pending_disbursement')),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 reviewed_by TEXT,
 review_note TEXT
);
CREATE INDEX IF NOT EXISTS commerce_refund_requests_state ON commerce_refund_requests(state,created_at);
