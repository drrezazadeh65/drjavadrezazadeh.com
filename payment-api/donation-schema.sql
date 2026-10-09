-- Donation ledger; run in the EXISTING Cloudflare D1 database only after reviewing a backup.
-- Separate from book/service commerce orders and legacy payment_orders.
CREATE TABLE IF NOT EXISTS donation_orders (
 id TEXT PRIMARY KEY,
 factor_id TEXT NOT NULL UNIQUE,
 amount_toman INTEGER NOT NULL CHECK(amount_toman BETWEEN 1000 AND 1000000000),
 provider_amount INTEGER NOT NULL CHECK(provider_amount > 0),
 currency TEXT NOT NULL DEFAULT 'IRT' CHECK(currency='IRT'),
 purpose TEXT NOT NULL DEFAULT 'talented_student_support' CHECK(purpose='talented_student_support'),
 state TEXT NOT NULL DEFAULT 'created' CHECK(state IN ('created','pending','paid','failed','cancelled','refunded')),
 provider_id_get TEXT UNIQUE,
 provider_trans_id TEXT UNIQUE,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 paid_at TEXT,
 refunded_at TEXT,
 CHECK(state!='paid' OR (provider_id_get IS NOT NULL AND provider_trans_id IS NOT NULL AND paid_at IS NOT NULL)),
 CHECK(state!='refunded' OR refunded_at IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS donation_orders_state_created ON donation_orders(state,created_at);
