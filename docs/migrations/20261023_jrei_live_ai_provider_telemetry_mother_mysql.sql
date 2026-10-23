-- Real cloud model call telemetry; STAGED AND NOT EXECUTED.
-- Additive only to sole drjavad1_store mother database. No prompt,
-- account/visitor identifier, IP address, response content, token secret,
-- credit card, source passage or private user record is stored here.
CREATE TABLE IF NOT EXISTS jrei_ai_provider_telemetry_daily (
  date_utc DATE NOT NULL,
  provider_code VARCHAR(24) NOT NULL,
  model_code VARCHAR(96) NOT NULL,
  completed_count INT UNSIGNED NOT NULL DEFAULT 0,
  failed_count INT UNSIGNED NOT NULL DEFAULT 0,
  input_tokens_reported BIGINT UNSIGNED NOT NULL DEFAULT 0,
  output_tokens_reported BIGINT UNSIGNED NOT NULL DEFAULT 0,
  usage_unknown_count INT UNSIGNED NOT NULL DEFAULT 0,
  latency_total_ms BIGINT UNSIGNED NOT NULL DEFAULT 0,
  latency_le_500_count INT UNSIGNED NOT NULL DEFAULT 0,
  latency_le_1500_count INT UNSIGNED NOT NULL DEFAULT 0,
  latency_le_5000_count INT UNSIGNED NOT NULL DEFAULT 0,
  latency_le_15000_count INT UNSIGNED NOT NULL DEFAULT 0,
  latency_gt_15000_count INT UNSIGNED NOT NULL DEFAULT 0,
  last_completed_at BIGINT UNSIGNED NULL,
  updated_at BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY(date_utc,provider_code,model_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- These are observed transport/model API outcomes, NOT independent proof
-- that the answer was correct, safe, original or psychometrically validated.
-- Histogram bins are for approximate latency bands; never label as exact p95.
