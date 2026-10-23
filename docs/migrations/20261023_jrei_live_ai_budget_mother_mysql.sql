-- JREI real-model provider budget authority, ADDITIVE, NOT EXECUTED.
-- Bertina original mother database: drjavad1_store. No parallel accounts.
-- This protects a genuinely billable cloud model call: requests are charged
-- to the conservative quota BEFORE outbound HTTPS. Unknown outcomes consume
-- quota, so retries cannot repeatedly spend beyond owner-approved limits.
-- The upstream provider may bill differently; this table is NOT a bank
-- invoice, exact USD spend ledger, model access key, or scientific approval.
CREATE TABLE IF NOT EXISTS jrei_ai_daily_budget (
  quota_date DATE NOT NULL,
  provider_code VARCHAR(24) NOT NULL,
  reserved_calls INT UNSIGNED NOT NULL DEFAULT 0,
  reserved_input_tokens BIGINT UNSIGNED NOT NULL DEFAULT 0,
  reserved_output_tokens BIGINT UNSIGNED NOT NULL DEFAULT 0,
  updated_at BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY(quota_date,provider_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- Never seed any provider API key, model identifier, content transcript,
-- user identity, payment order or privileged runtime authorization.
-- Initial runtime switch: JR_JREI_LIVE_AI_ENABLED=false (private).
