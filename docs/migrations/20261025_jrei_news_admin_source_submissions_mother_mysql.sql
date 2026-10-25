-- Additive admin-managed JREI News SOURCE DISCOVERY PROPOSALS only.
-- Same mother database, not a parallel crawler/source authority.
-- Original jrei_exam_sources + jrei_ka_source_policies remain the sole
-- authority for verified acquisition/rights/robots and monitor activation.
-- No default approvals, no new scheduler, no live production SQL.
SET NAMES utf8mb4;
CREATE TABLE IF NOT EXISTS jrei_news_admin_source_submissions (
  submission_id CHAR(36) NOT NULL PRIMARY KEY,
  submitted_by CHAR(36) NOT NULL,
  approved_by CHAR(36) NULL,
  approved_at BIGINT UNSIGNED NULL,
  source_title VARCHAR(200) NOT NULL,
  source_url VARCHAR(1000) NOT NULL,
  source_url_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  source_category VARCHAR(48) NOT NULL,
  news_priority CHAR(2) NOT NULL DEFAULT 'P2',
  submission_state VARCHAR(40) NOT NULL DEFAULT 'PENDING_ADMIN_APPROVAL',
  matched_jrei_source_id CHAR(36) NULL,
  linked_monitor_id CHAR(36) NULL,
  last_issue_code VARCHAR(80) NULL,
  created_at BIGINT UNSIGNED NOT NULL,
  updated_at BIGINT UNSIGNED NOT NULL,
  UNIQUE KEY uq_jrei_news_admin_source_url(source_url_sha256),
  KEY idx_jrei_news_admin_source_queue(submission_state,updated_at),
  CONSTRAINT fk_jrei_news_admin_submitter FOREIGN KEY(submitted_by)
    REFERENCES customer_accounts(id) ON DELETE RESTRICT,
  CONSTRAINT fk_jrei_news_admin_approver FOREIGN KEY(approved_by)
    REFERENCES customer_accounts(id) ON DELETE RESTRICT,
  CONSTRAINT fk_jrei_news_admin_source_reference FOREIGN KEY(matched_jrei_source_id)
    REFERENCES jrei_exam_sources(source_id) ON DELETE RESTRICT,
  CONSTRAINT fk_jrei_news_admin_monitor_reference FOREIGN KEY(linked_monitor_id)
    REFERENCES jrei_news_monitors(monitor_id) ON DELETE RESTRICT,
  CONSTRAINT ck_jrei_news_admin_source_state CHECK(submission_state IN (
    'PENDING_ADMIN_APPROVAL','APPROVED_DISCOVERY','ORIGINAL_POLICY_PENDING',
    'MONITOR_STAGED','MONITOR_ACTIVE','DISABLED')),
  CONSTRAINT ck_jrei_news_admin_source_priority CHECK(news_priority IN ('P0','P1','P2'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
