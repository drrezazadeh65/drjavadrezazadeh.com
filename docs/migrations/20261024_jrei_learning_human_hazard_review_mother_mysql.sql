-- JREI V5 HUMAN HAZARD REVIEW, staged SOURCE ONLY / NOT EXECUTED.
-- Single existing Bertina mother database drjavad1_store.
-- Depends on docs/migrations/20261023_jrei_daily_learning_mother_mysql.sql.
-- Retains ORIGINAL benchmark/proposal rows; adds immutable HUMAN
-- intervention evidence only. No automatic approval, learning or deploy.
CREATE TABLE IF NOT EXISTS jrei_learning_hazard_review_history (
  decision_id CHAR(36) NOT NULL PRIMARY KEY,
  proposal_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  prior_review_state VARCHAR(24) NOT NULL,
  decision VARCHAR(32) NOT NULL,
  reason_code VARCHAR(48) NOT NULL,
  observation_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  decided_by_account_id CHAR(36) NULL,
  decided_at BIGINT UNSIGNED NOT NULL,
  KEY idx_jrei_learning_hazard_review_proposal(proposal_id,decided_at),
  CONSTRAINT fk_jrei_learning_hazard_review_proposal
    FOREIGN KEY(proposal_id) REFERENCES jrei_learning_proposals(proposal_id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_jrei_learning_hazard_review_actor
    FOREIGN KEY(decided_by_account_id) REFERENCES customer_accounts(id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- A human rejection is only a recorded safety decision; it does NOT
-- update model weights, authorize alternate benchmark results, overwrite
-- original evidence, release personal data or notify a student automatically.
