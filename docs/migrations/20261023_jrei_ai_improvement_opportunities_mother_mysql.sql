-- Governed, evidence-grounded self-improvement signals.
-- ADDITIVE, NOT EXECUTED. Sole mother DB: drjavad1_store.
-- Only aggregates from real DB measurements; no chat or learner records.
-- No autonomous execution, merge, security/payment modification or deploy.
CREATE TABLE IF NOT EXISTS jrei_ai_improvement_opportunities (
 opportunity_id CHAR(36) NOT NULL PRIMARY KEY,
 rule_code VARCHAR(48) NOT NULL,
 rule_version SMALLINT UNSIGNED NOT NULL DEFAULT 1,
 evidence_window_utc DATE NOT NULL,
 evidence_source_digest CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 observed_count INT UNSIGNED NOT NULL,
 observed_severity VARCHAR(16) NOT NULL DEFAULT 'REVIEW',
 owner_state VARCHAR(36) NOT NULL DEFAULT 'PROPOSED_UNVERIFIED',
 opportunity_summary_code VARCHAR(90) NOT NULL,
 risk_review_required TINYINT(1) NOT NULL DEFAULT 1,
 independent_quality_review_required TINYINT(1) NOT NULL DEFAULT 1,
 code_change_approved TINYINT(1) NOT NULL DEFAULT 0,
 public_release_approved TINYINT(1) NOT NULL DEFAULT 0,
 owner_reviewer_account_id CHAR(36) NULL,
 owner_reviewed_at BIGINT UNSIGNED NULL,
 created_at BIGINT UNSIGNED NOT NULL,
 updated_at BIGINT UNSIGNED NOT NULL,
 UNIQUE KEY uq_jrei_improve_rule_window(rule_code,rule_version,evidence_window_utc,evidence_source_digest),
 KEY idx_jrei_improve_owner(owner_state,created_at),
 CONSTRAINT fk_jrei_improve_reviewer FOREIGN KEY(owner_reviewer_account_id)
   REFERENCES customer_accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Suggested improvement != tested fix != merged code != production release.
-- Never seed successful benchmarks, actual dollar spend, or pseudo-attested
-- expert review from the draft generation engine.
