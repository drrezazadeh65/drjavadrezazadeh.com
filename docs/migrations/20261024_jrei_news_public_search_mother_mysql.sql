-- JREI News searchable public content index; staged, NOT APPLIED.
-- Depends on 20261024_jrei_news_intelligence_mother_mysql.sql.
-- Search indexes include ONLY source-and-owner approved PUBLISHED articles,
-- with authentic existing publisher receipts and verified canonical URLs.
-- No private JREI corpus, learner record, draft or email may enter here.
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS jrei_news_search_documents (
  document_id CHAR(36) NOT NULL PRIMARY KEY,
  publication_id CHAR(36) NOT NULL,
  language_code CHAR(2) NOT NULL,
  public_route VARCHAR(260) NOT NULL,
  title VARCHAR(240) NOT NULL,
  summary TEXT NOT NULL,
  searchable_body MEDIUMTEXT NOT NULL,
  country_code CHAR(2) NOT NULL DEFAULT 'IR',
  category_code VARCHAR(48) NOT NULL,
  event_code VARCHAR(64) NOT NULL,
  owner_approval_digest CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  content_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  published_at BIGINT UNSIGNED NOT NULL,
  indexed_at BIGINT UNSIGNED NOT NULL,
  index_state VARCHAR(28) NOT NULL DEFAULT 'PUBLISHED',
  UNIQUE KEY uq_jrei_news_search_lang(publication_id,language_code),
  UNIQUE KEY uq_jrei_news_search_route(public_route),
  KEY idx_jrei_news_search_latest(language_code,index_state,published_at),
  KEY idx_jrei_news_search_topic(language_code,category_code,index_state,published_at),
  FULLTEXT KEY ft_jrei_news_public_text(title,summary,searchable_body),
  CONSTRAINT fk_jrei_news_search_pub FOREIGN KEY(publication_id)
    REFERENCES jrei_news_publications(publication_id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- On an approved correction, replace only the already-published language
-- projection of that same URL/version; keep source audit and old revisions.
-- In a withdrawal, set index_state=RETRACTED and purge from public search.
-- Final acceptance must verify actual host MariaDB FULLTEXT and Unicode.
