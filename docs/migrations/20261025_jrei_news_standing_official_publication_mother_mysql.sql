-- JREI News: owner-standing policy for trustworthy official primary notices.
-- SOURCE MIGRATION ONLY. Not automatically applied on Bertina.
-- Requires owner-authorized backup, restoration procedure and SQL preflight.
-- One mother database: drjavad1_store; preserve every existing manual approval.
-- Apply after the four 20261024_jrei_news_* migration files.
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS jrei_news_standing_policies (
  policy_id CHAR(36) PRIMARY KEY,
  owner_account_id CHAR(36) NOT NULL,
  owner_mfa_audit_ref VARCHAR(100) NOT NULL,
  policy_code VARCHAR(56) NOT NULL,
  policy_digest CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  revision_number BIGINT UNSIGNED NOT NULL,
  effective_at BIGINT UNSIGNED NOT NULL,
  expires_at BIGINT UNSIGNED NOT NULL,
  revoked_at BIGINT UNSIGNED NULL,
  created_at BIGINT UNSIGNED NOT NULL,
  UNIQUE KEY uq_jrei_news_standing_owner_revision(owner_account_id,revision_number),
  KEY idx_jrei_news_standing_active(policy_code,expires_at,revoked_at),
  CONSTRAINT fk_jrei_news_standing_owner FOREIGN KEY(owner_account_id)
    REFERENCES customer_accounts(id) ON DELETE RESTRICT,
  CONSTRAINT ck_jrei_news_standing_duration CHECK(expires_at > effective_at),
  CONSTRAINT ck_jrei_news_standing_code CHECK(policy_code = 'OFFICIAL_PRIMARY_AUTO_NEWS')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Existing per-article decisions remain referenced, but automated stories
-- explicitly reference a DISTINCT, durable, MFA-authorized standing policy.
-- Exactly one authority type is required; never fabricate owner decisions.
ALTER TABLE jrei_news_publications
  MODIFY COLUMN approved_decision_id CHAR(36) NULL,
  ADD COLUMN standing_policy_id CHAR(36) NULL,
  ADD KEY idx_jrei_news_pub_standing_policy(standing_policy_id),
  ADD CONSTRAINT fk_jrei_news_pub_standing_policy
    FOREIGN KEY(standing_policy_id) REFERENCES jrei_news_standing_policies(policy_id)
    ON DELETE RESTRICT,
  ADD CONSTRAINT ck_jrei_news_publication_authority_xor
    CHECK (
      (approved_decision_id IS NOT NULL AND standing_policy_id IS NULL)
      OR
      (approved_decision_id IS NULL AND standing_policy_id IS NOT NULL)
    );

-- No default policy, source activation, crawler, CMS write or publication.
