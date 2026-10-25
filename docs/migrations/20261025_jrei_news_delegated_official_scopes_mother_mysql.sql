-- ORIGINAL JREI mother DB: standing, explicit URL/path delegation.
-- Manager approves a bounded HTTPS path once, NOT every article.
-- Independent primary issuer + rights/robots/transport are verified on
-- each enrollment. No default grants, activation, HTTP calls or publishing.
-- Apply after the existing 20261024 JREI News discovery schema, once backup
-- and rollback preflight are verified; use existing original JREI source DB.
SET NAMES utf8mb4;
CREATE TABLE IF NOT EXISTS jrei_news_delegated_scopes (
 scope_id CHAR(36) NOT NULL PRIMARY KEY,
 feed_source_id CHAR(36) NOT NULL,
 owner_account_id CHAR(36) NOT NULL,
 approved_host VARCHAR(253) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 approved_path_prefix VARCHAR(220) NOT NULL,
 scope_policy_revision BIGINT UNSIGNED NOT NULL,
 rights_evidence_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 robots_evidence_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 transport_evidence_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 maximum_articles_per_cycle SMALLINT UNSIGNED NOT NULL DEFAULT 20,
 effective_at BIGINT UNSIGNED NOT NULL,
 expires_at BIGINT UNSIGNED NOT NULL,
 revoked_at BIGINT UNSIGNED NULL,
 owner_mfa_audit_reference VARCHAR(100) NOT NULL,
 created_at BIGINT UNSIGNED NOT NULL,
 UNIQUE KEY uq_jrei_news_delegated_scope(feed_source_id,approved_host,approved_path_prefix,scope_policy_revision),
 KEY idx_jrei_news_delegated_active(expires_at,revoked_at,feed_source_id),
 CONSTRAINT fk_jrei_news_scope_feed FOREIGN KEY(feed_source_id)
   REFERENCES jrei_exam_sources(source_id) ON DELETE RESTRICT,
 CONSTRAINT fk_jrei_news_scope_owner FOREIGN KEY(owner_account_id)
   REFERENCES customer_accounts(id) ON DELETE RESTRICT,
 CONSTRAINT ck_jrei_news_scope_period CHECK(expires_at>effective_at),
 CONSTRAINT ck_jrei_news_scope_limit CHECK(maximum_articles_per_cycle BETWEEN 1 AND 40)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
