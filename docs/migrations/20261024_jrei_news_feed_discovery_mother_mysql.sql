-- JREI NEWS approved-feed URL discovery, source only, NOT EXECUTED.
-- Original sole mother DB: drjavad1_store. NO new crawler/registration.
-- Depends on 20261024_jrei_news_intelligence_mother_mysql.sql.
-- Feed discovery only proposes URL metadata; article acquisition needs
-- separately recorded original JREI source policy and private observation.
SET NAMES utf8mb4;
CREATE TABLE IF NOT EXISTS jrei_news_discovered_urls (
  discovery_id CHAR(36) NOT NULL PRIMARY KEY,
  monitor_id CHAR(36) NOT NULL,
  source_registry_id CHAR(36) NOT NULL,
  canonical_article_url VARCHAR(1000) NOT NULL,
  canonical_url_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  latest_feed_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  discovered_headline VARCHAR(240) NOT NULL,
  claimed_published_at BIGINT UNSIGNED NULL,
  first_seen_at BIGINT UNSIGNED NOT NULL,
  last_seen_at BIGINT UNSIGNED NOT NULL,
  review_state VARCHAR(48) NOT NULL DEFAULT 'REQUIRES_ARTICLE_SOURCE_APPROVAL',
  approved_article_source_id CHAR(36) NULL,
  UNIQUE KEY uq_jrei_news_feed_url(monitor_id,canonical_url_sha256),
  KEY idx_jrei_news_feed_discovery(review_state,last_seen_at),
  KEY idx_jrei_news_feed_monitor(monitor_id,last_seen_at),
  CONSTRAINT fk_jrei_news_feed_monitor FOREIGN KEY(monitor_id)
    REFERENCES jrei_news_monitors(monitor_id) ON DELETE RESTRICT,
  CONSTRAINT fk_jrei_news_feed_original_source FOREIGN KEY(source_registry_id)
    REFERENCES jrei_exam_sources(source_id) ON DELETE RESTRICT,
  CONSTRAINT fk_jrei_news_feed_item_source FOREIGN KEY(approved_article_source_id)
    REFERENCES jrei_exam_sources(source_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- The original JREI resolver registers and verifies the article URL before
-- the acquisition worker may fetch it. No raw feed bytes are public content.
