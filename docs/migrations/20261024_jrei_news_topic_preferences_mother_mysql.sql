-- News-topic segmentation ONLY, additive to existing eco_* consent/outbox.
-- SOURCE-ONLY. Final owner-authorized mother-DB migration required.
-- Not a parallel newsletter service. Parent: customer_accounts.
SET NAMES utf8mb4;
CREATE TABLE IF NOT EXISTS jrei_news_topic_follows (
  follow_id CHAR(36) NOT NULL PRIMARY KEY,
  account_id CHAR(36) NOT NULL,
  topic_code VARCHAR(40) NOT NULL,
  locale_code CHAR(2) NOT NULL,
  digest_mode VARCHAR(24) NOT NULL,
  channel_code VARCHAR(24) NOT NULL DEFAULT 'EMAIL',
  consent_reference VARCHAR(100) NOT NULL,
  follow_state VARCHAR(24) NOT NULL DEFAULT 'ACTIVE',
  updated_at BIGINT UNSIGNED NOT NULL,
  UNIQUE KEY uq_jrei_news_topic_follow(account_id,topic_code,channel_code),
  KEY idx_jrei_news_topic_audience(topic_code,digest_mode,follow_state),
  CONSTRAINT fk_jrei_news_topic_owner FOREIGN KEY(account_id)
    REFERENCES customer_accounts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- One topic has ONE current digest cadence per account/channel; changing
-- frequency updates that row instead of creating a duplicate active topic.
-- Purpose-specific eco_consent_records and notification suppression remain
-- authoritative; rows in this table do not establish marketing permission.
