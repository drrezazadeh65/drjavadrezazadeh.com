-- Commerce idempotency and immutable pricing snapshots.
BEGIN;
ALTER TABLE customer_order ADD COLUMN IF NOT EXISTS idempotency_key text;
CREATE UNIQUE INDEX IF NOT EXISTS customer_order_idempotency_uq ON customer_order(idempotency_key) WHERE idempotency_key IS NOT NULL;
ALTER TABLE customer_order ADD COLUMN IF NOT EXISTS pricing_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE customer_order ADD CONSTRAINT customer_order_totals_valid CHECK(discount_minor<=subtotal_minor AND total_minor=subtotal_minor-discount_minor);

ALTER TABLE entitlement ADD COLUMN IF NOT EXISTS granted_from_payment_id uuid REFERENCES payment(id) ON DELETE RESTRICT;
ALTER TABLE entitlement ADD COLUMN IF NOT EXISTS revoked_at timestamptz;
ALTER TABLE entitlement ADD COLUMN IF NOT EXISTS revocation_reason text;

ALTER TABLE refund ADD COLUMN IF NOT EXISTS idempotency_key text;
CREATE UNIQUE INDEX IF NOT EXISTS refund_idempotency_uq ON refund(idempotency_key) WHERE idempotency_key IS NOT NULL;
COMMIT;
