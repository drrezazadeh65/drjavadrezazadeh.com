-- Append-only payment provider event ledger for callback/webhook/query idempotency.
BEGIN;

CREATE TABLE IF NOT EXISTS payment_provider_event (
  id uuid PRIMARY KEY,
  payment_intent_id uuid NOT NULL REFERENCES payment_intent(id) ON DELETE RESTRICT,
  provider_key text NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('RETURN','CALLBACK','WEBHOOK','STATUS_QUERY','REFUND_EVENT')),
  provider_reference text,
  event_dedupe_key text NOT NULL,
  payload_hash text NOT NULL,
  verification_state text NOT NULL CHECK (verification_state IN ('RECEIVED','VERIFIED','REJECTED','DUPLICATE','ERROR')),
  safe_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  received_at timestamptz NOT NULL DEFAULT now(),
  verified_at timestamptz,
  processed_at timestamptz,
  UNIQUE(provider_key,event_dedupe_key)
);

COMMENT ON TABLE payment_provider_event IS
  'Append-only provider event ledger. Store payload digests and safe normalized metadata; raw secrets/card data are prohibited.';

CREATE INDEX IF NOT EXISTS payment_provider_event_intent_idx
  ON payment_provider_event(payment_intent_id,received_at DESC);

CREATE INDEX IF NOT EXISTS payment_provider_event_verify_idx
  ON payment_provider_event(verification_state,received_at DESC);

COMMIT;
