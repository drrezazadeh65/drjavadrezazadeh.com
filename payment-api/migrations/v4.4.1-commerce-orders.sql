-- v4.4.1 operator-reviewed D1 migration template
-- PURPOSE: bring an EXISTING commerce_orders table to the reviewed refund-state shape.
-- DO NOT run blindly. Back up D1 and inspect the current schema first.
-- This file is intentionally not wired to automatic deployment.

-- PRECHECKS (run manually and retain evidence):
-- PRAGMA table_info(commerce_orders);
-- SELECT sql FROM sqlite_schema WHERE type='table' AND name='commerce_orders';
-- SELECT state, COUNT(*) FROM commerce_orders GROUP BY state;
-- SELECT COUNT(*) AS malformed_paid FROM commerce_orders
--   WHERE state='paid' AND (provider_id_get IS NULL OR provider_trans_id IS NULL OR paid_at IS NULL);

-- SQLite cannot add/replace CHECK constraints in place. The safe pattern is table rebuild.
PRAGMA foreign_keys=OFF;
BEGIN IMMEDIATE;

CREATE TABLE commerce_orders_v441 (
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
 CHECK(state!='paid' OR (provider_id_get IS NOT NULL AND provider_trans_id IS NOT NULL AND paid_at IS NOT NULL)),
 CHECK(state!='refunded' OR refunded_at IS NOT NULL)
);

-- STOP before executing this INSERT if the production table lacks any selected source column.
-- If refunded_at is absent, substitute NULL AS refunded_at only after confirming there are no refunded rows.
INSERT INTO commerce_orders_v441
 (id,factor_id,amount_toman,provider_amount,currency,items_json,state,provider_id_get,provider_trans_id,created_at,updated_at,paid_at,refunded_at)
SELECT id,factor_id,amount_toman,provider_amount,currency,items_json,state,provider_id_get,provider_trans_id,created_at,updated_at,paid_at,refunded_at
FROM commerce_orders;

-- These assertions must each return zero before the rename is accepted.
SELECT COUNT(*) AS invalid_paid FROM commerce_orders_v441
 WHERE state='paid' AND (provider_id_get IS NULL OR provider_trans_id IS NULL OR paid_at IS NULL);
SELECT COUNT(*) AS invalid_refunded FROM commerce_orders_v441
 WHERE state='refunded' AND refunded_at IS NULL;

DROP TABLE commerce_orders;
ALTER TABLE commerce_orders_v441 RENAME TO commerce_orders;
CREATE INDEX commerce_orders_state_created ON commerce_orders(state,created_at);

COMMIT;
PRAGMA foreign_keys=ON;

-- POSTCHECKS:
-- PRAGMA integrity_check;
-- SELECT sql FROM sqlite_schema WHERE type='table' AND name='commerce_orders';
-- SELECT state, COUNT(*) FROM commerce_orders GROUP BY state;
