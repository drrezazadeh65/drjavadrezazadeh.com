-- Run ONCE in the existing D1 database; does not modify legacy payment_orders.
CREATE TABLE IF NOT EXISTS commerce_orders (
 id TEXT PRIMARY KEY,
 factor_id TEXT NOT NULL UNIQUE,
 amount_toman INTEGER NOT NULL CHECK(amount_toman>0),
 provider_amount INTEGER NOT NULL CHECK(provider_amount>0),
 currency TEXT NOT NULL CHECK(currency='IRT'),
 items_json TEXT NOT NULL,
 state TEXT NOT NULL CHECK(state IN ('created','pending','paid','failed','cancelled','refunded')),
 provider_id_get TEXT UNIQUE,
 provider_trans_id TEXT UNIQUE,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 paid_at TEXT,
 refunded_at TEXT,
 CHECK(state!='paid' OR (provider_id_get IS NOT NULL AND provider_trans_id IS NOT NULL AND paid_at IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS commerce_orders_state_created ON commerce_orders(state,created_at);
