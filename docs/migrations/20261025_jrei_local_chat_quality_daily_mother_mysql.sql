-- JREI aggregate model-output veto observations, no prompts or accounts.
-- Additive source migration for original drjavad1_store ONLY; NOT APPLIED.
-- Run only in reviewed mother-DB migration framework after verified backup.
-- Counts are operational fault signals, NOT scientific validation or training.
CREATE TABLE IF NOT EXISTS jrei_local_chat_quality_daily (
  day_utc DATE NOT NULL,
  model_artifact_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  failure_category VARCHAR(48) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  rejected_count INT UNSIGNED NOT NULL DEFAULT 0,
  first_seen_at BIGINT UNSIGNED NOT NULL,
  last_seen_at BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY(day_utc,model_artifact_sha256,failure_category),
  KEY idx_jrei_local_chat_quality_retention(day_utc),
  KEY idx_jrei_local_chat_quality_model(model_artifact_sha256,day_utc)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- NO student identifiers, account IDs, IPs, original questions, responses,
-- generated text, source documents, keys, cookies or queue ciphertext.
