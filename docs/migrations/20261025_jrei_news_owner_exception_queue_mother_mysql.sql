-- JREI News: genuine source/claim owner exceptions ONLY.
-- Additive, same mother database, not executed by source build.
-- Current official-source standing policy supersedes per-story approval.
-- Missing CMS or model capacity is a system hold, NOT owner exception.
SET NAMES utf8mb4;
CREATE TABLE IF NOT EXISTS jrei_news_owner_exceptions (
  exception_id CHAR(36) NOT NULL PRIMARY KEY,
  revision_id CHAR(36) NOT NULL,
  issue_code VARCHAR(64) NOT NULL,
  state_code VARCHAR(24) NOT NULL DEFAULT 'PENDING',
  review_comment VARCHAR(500) NULL,
  reviewed_by CHAR(36) NULL,
  reviewed_at BIGINT UNSIGNED NULL,
  first_seen_at BIGINT UNSIGNED NOT NULL,
  last_seen_at BIGINT UNSIGNED NOT NULL,
  occurrence_count INT UNSIGNED NOT NULL DEFAULT 1,
  UNIQUE KEY uq_jrei_news_owner_issue(revision_id,issue_code),
  KEY idx_jrei_news_owner_queue(state_code,last_seen_at),
  CONSTRAINT fk_jrei_news_exception_revision
    FOREIGN KEY (revision_id) REFERENCES jrei_news_editorial_versions(revision_id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_jrei_news_exception_reviewer
    FOREIGN KEY (reviewed_by) REFERENCES customer_accounts(id)
    ON DELETE RESTRICT,
  CONSTRAINT ck_jrei_news_exception_issue CHECK(issue_code IN
    ('SOURCE_AUTHORITY_UNCONFIRMED','PUBLICATION_RIGHTS_UNCONFIRMED',
     'CLAIMS_UNVERIFIED_OR_CONTRADICTED')),
  CONSTRAINT ck_jrei_news_exception_state CHECK(state_code IN
    ('PENDING','ACKNOWLEDGED','RESOLVED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
