-- JR Academic Community: additional schema already installed by the owner on 2026-10-21.
-- Mirror of the five-table maternal MariaDB mother-database design.
-- FOR ISOLATED CI FIXTURES AND DISASTER-RECOVERY DOCUMENTATION ONLY.
-- DO NOT RE-RUN against drjavad1_store; owner already created these three tables.
-- Production installation and recoverable backups remain manual, separately evidenced.
-- No CREATE DATABASE, DROP, ALTER, DELETE, UPDATE or automatic activation.
SET NAMES utf8mb4;

CREATE TABLE community_admin_replies (
  id CHAR(36) NOT NULL,
  comment_id CHAR(36) NOT NULL,
  admin_account_id CHAR(36) NOT NULL,
  body_text TEXT NOT NULL,
  state ENUM('draft','published','hidden','removed') NOT NULL DEFAULT 'draft',
  revision_no INT UNSIGNED NOT NULL DEFAULT 1,
  created_at BIGINT UNSIGNED NOT NULL,
  updated_at BIGINT UNSIGNED NOT NULL,
  published_at BIGINT UNSIGNED NULL,
  removed_at BIGINT UNSIGNED NULL,
  PRIMARY KEY (id),
  KEY idx_jr_reply_public (comment_id,state,published_at,id),
  KEY idx_jr_reply_queue (state,updated_at),
  KEY idx_jr_reply_admin (admin_account_id,updated_at),
  CONSTRAINT fk_jr_reply_comment FOREIGN KEY (comment_id)
    REFERENCES community_comments(id) ON DELETE CASCADE,
  CONSTRAINT fk_jr_reply_admin FOREIGN KEY (admin_account_id)
    REFERENCES customer_accounts(id) ON DELETE RESTRICT,
  CONSTRAINT ck_jr_reply_body CHECK (CHAR_LENGTH(TRIM(body_text)) BETWEEN 1 AND 6000),
  CONSTRAINT ck_jr_reply_revision CHECK (revision_no >= 1),
  CONSTRAINT ck_jr_reply_publish CHECK (state <> 'published' OR published_at IS NOT NULL)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE community_admin_reply_revisions (
  id CHAR(36) NOT NULL,
  reply_id CHAR(36) NOT NULL,
  revision_no INT UNSIGNED NOT NULL,
  actor_account_id CHAR(36) NOT NULL,
  event_kind ENUM('created','edited','published','hidden','restored','removed') NOT NULL,
  state_after ENUM('draft','published','hidden','removed') NOT NULL,
  body_snapshot TEXT NULL,
  reason_code VARCHAR(80) CHARACTER SET ascii COLLATE ascii_bin NULL,
  created_at BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_jr_reply_revision (reply_id,revision_no),
  KEY idx_jr_reply_rev_actor (actor_account_id,created_at),
  CONSTRAINT fk_jr_reply_rev_parent FOREIGN KEY (reply_id)
    REFERENCES community_admin_replies(id) ON DELETE CASCADE,
  CONSTRAINT fk_jr_reply_rev_actor FOREIGN KEY (actor_account_id)
    REFERENCES customer_accounts(id) ON DELETE RESTRICT,
  CONSTRAINT ck_jr_reply_rev_no CHECK (revision_no >= 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE community_erasure_audit (
  id CHAR(36) NOT NULL,
  target_kind ENUM('comment','admin_reply') NOT NULL,
  target_id CHAR(36) NOT NULL,
  actor_account_id CHAR(36) NOT NULL,
  reason_code ENUM('owner_request','spam','abuse','privacy','retention','other') NOT NULL,
  affected_reply_count INT UNSIGNED NOT NULL DEFAULT 0,
  occurred_at BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  KEY idx_jr_erasures_target (target_kind,target_id,occurred_at),
  KEY idx_jr_erasures_actor (actor_account_id,occurred_at),
  CONSTRAINT fk_jr_erasure_actor FOREIGN KEY (actor_account_id)
    REFERENCES customer_accounts(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
