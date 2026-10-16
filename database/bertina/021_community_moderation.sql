-- Moderated community pilot. MUST be applied manually after a verified backup.
-- MariaDB 10.11 / MySQL 8 InnoDB only. Does not mutate existing tables.
-- Feature flag JR_COMMUNITY_ENABLED defaults OFF. No automatic migration.
SET NAMES utf8mb4;
CREATE TABLE IF NOT EXISTS community_comments (
  id CHAR(36) NOT NULL,
  page_path VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  author_account_id CHAR(36) NOT NULL,
  body_text TEXT NOT NULL,
  rating TINYINT UNSIGNED NULL,
  state ENUM('pending','approved','rejected','removed') NOT NULL DEFAULT 'pending',
  created_at BIGINT UNSIGNED NOT NULL,
  consented_at BIGINT UNSIGNED NOT NULL,
  reviewed_at BIGINT UNSIGNED NULL,
  reviewer_account_id CHAR(36) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_community_one_review_per_account_page (author_account_id,page_path),
  KEY idx_community_public (page_path,state,created_at),
  KEY idx_community_queue (state,created_at),
  CONSTRAINT fk_community_author FOREIGN KEY (author_account_id)
    REFERENCES customer_accounts(id) ON DELETE CASCADE,
  CONSTRAINT fk_community_reviewer FOREIGN KEY (reviewer_account_id)
    REFERENCES customer_accounts(id) ON DELETE SET NULL,
  CONSTRAINT ck_community_rating CHECK (rating IS NULL OR (rating BETWEEN 1 AND 5))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS community_moderation_audit (
  id CHAR(36) NOT NULL,
  comment_id CHAR(36) NOT NULL,
  actor_account_id CHAR(36) NOT NULL,
  action ENUM('submitted','approved','rejected','removed') NOT NULL,
  created_at BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  KEY idx_community_audit_comment (comment_id,created_at),
  CONSTRAINT fk_community_audit_comment FOREIGN KEY (comment_id)
    REFERENCES community_comments(id) ON DELETE CASCADE,
  CONSTRAINT fk_community_audit_actor FOREIGN KEY (actor_account_id)
    REFERENCES customer_accounts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
