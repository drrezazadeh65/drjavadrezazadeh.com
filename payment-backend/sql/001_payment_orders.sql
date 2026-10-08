-- Apply once using the Neon SQL editor. Never run schema changes from an unauthenticated HTTP endpoint.
CREATE TABLE IF NOT EXISTS payment_orders (
  id uuid PRIMARY KEY,
  factor_id bigint NOT NULL UNIQUE CHECK (factor_id > 0),
  currency text NOT NULL DEFAULT 'IRR' CHECK (currency = 'IRR'),
  amount_rial bigint NOT NULL CHECK (amount_rial >= 5000),
  cart jsonb NOT NULL,
  state text NOT NULL DEFAULT 'created' CHECK (state IN ('created','pending','paid','failed','cancelled')),
  provider_id_get text UNIQUE,
  provider_trans_id text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  CONSTRAINT paid_requires_provider_ids CHECK (state <> 'paid' OR (provider_id_get IS NOT NULL AND provider_trans_id IS NOT NULL AND paid_at IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS payment_orders_state_created_idx ON payment_orders(state,created_at);
CREATE TABLE IF NOT EXISTS payment_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES payment_orders(id),
  event_type text NOT NULL,
  provider_trans_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS payment_events_order_idx ON payment_events(order_id);
-- Only the server should hold database credentials. No public/anonymous SQL access.
