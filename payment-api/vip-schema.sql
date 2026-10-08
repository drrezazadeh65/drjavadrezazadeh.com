-- Separate VIP orders from the fixed-amount legacy test table.
CREATE TABLE IF NOT EXISTS vip_orders (
 id TEXT PRIMARY KEY,
 sku TEXT NOT NULL CHECK(sku IN ('academic-direction','university-selection','golden-talent-signature','research-publication','educator-development','institutional-advisory')),
 amount_rial INTEGER NOT NULL CHECK(amount_rial > 0),
 factor_id TEXT NOT NULL UNIQUE,
 state TEXT NOT NULL CHECK(state IN ('created','pending','paid','cancelled','failed')),
 provider_id_get TEXT UNIQUE,
 provider_trans_id TEXT UNIQUE,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 paid_at TEXT,
 CHECK(state <> 'paid' OR (provider_id_get IS NOT NULL AND provider_trans_id IS NOT NULL AND paid_at IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS vip_orders_state_created ON vip_orders(state,created_at);
