-- JR Educational Intelligence V5: privacy-minimal daily adaptive evaluation.
-- STAGED SOURCE ONLY. Never execute before single final acceptance, approved
-- backup/restore and explicit owner-authorised mother-DB migration.
-- All learning and model dispatch default OFF. No inference, consent or
-- scientific validation is conferred by creating these tables.
-- Database: EXISTING drjavad1_store only. No client transcripts, identity,
-- learner scorecards, private files, model tokens or raw questions.
CREATE TABLE IF NOT EXISTS jrei_learning_controls (
  id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
  enabled TINYINT(1) NOT NULL DEFAULT 0,
  auto_promote_low_risk TINYINT(1) NOT NULL DEFAULT 0,
  active_retrieval_version BIGINT UNSIGNED NOT NULL DEFAULT 1,
  active_retrieval_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  max_daily_evaluations INT UNSIGNED NOT NULL DEFAULT 500,
  minimum_reviewed_cases INT UNSIGNED NOT NULL DEFAULT 200,
  revision BIGINT UNSIGNED NOT NULL DEFAULT 1,
  updated_at BIGINT UNSIGNED NOT NULL DEFAULT 0,
  updated_by_account_id CHAR(36) NULL,
  CONSTRAINT fk_jrei_learning_owner
    FOREIGN KEY (updated_by_account_id) REFERENCES customer_accounts(id)
    ON DELETE SET NULL,
  CONSTRAINT ck_jrei_learning_singleton CHECK (id=1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- One nonpersonal, idempotent daily cycle; completed *scheduler tick* cannot
-- be interpreted as completed model training, source verification or gains.
CREATE TABLE IF NOT EXISTS jrei_learning_daily_cycles (
  cycle_day DATE NOT NULL PRIMARY KEY,
  status VARCHAR(32) NOT NULL DEFAULT 'NOT_EVALUATED',
  reviewed_source_count INT UNSIGNED NOT NULL DEFAULT 0,
  approved_holdout_case_count INT UNSIGNED NOT NULL DEFAULT 0,
  candidate_count INT UNSIGNED NOT NULL DEFAULT 0,
  evaluated_candidate_count INT UNSIGNED NOT NULL DEFAULT 0,
  accepted_candidate_count INT UNSIGNED NOT NULL DEFAULT 0,
  last_started_at BIGINT UNSIGNED NULL,
  last_finished_at BIGINT UNSIGNED NULL,
  revision BIGINT UNSIGNED NOT NULL DEFAULT 1,
  KEY idx_jrei_learning_cycle_finished(last_finished_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- This is a reviewed aggregate proposed change, not a learner content store.
-- No candidate can execute or publish just because a row is inserted.
CREATE TABLE IF NOT EXISTS jrei_learning_proposals (
  proposal_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
  cycle_day DATE NOT NULL,
  change_type VARCHAR(32) NOT NULL,
  dataset_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  evidence_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  evaluation_version VARCHAR(64) NOT NULL,
  baseline_model_version VARCHAR(64) NOT NULL,
  challenger_model_version VARCHAR(64) NOT NULL,
  sample_count INT UNSIGNED NOT NULL,
  baseline_correct INT UNSIGNED NOT NULL,
  challenger_correct INT UNSIGNED NOT NULL,
  baseline_unsupported INT UNSIGNED NOT NULL,
  challenger_unsupported INT UNSIGNED NOT NULL,
  privacy_incident_count INT UNSIGNED NOT NULL,
  baseline_fairness_gap_bps SMALLINT UNSIGNED NOT NULL,
  challenger_fairness_gap_bps SMALLINT UNSIGNED NOT NULL,
  baseline_p95_ms INT UNSIGNED NOT NULL,
  challenger_p95_ms INT UNSIGNED NOT NULL,
  candidate_policy_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  decision VARCHAR(32) NOT NULL DEFAULT 'PENDING_HUMAN_REVIEW',
  review_state VARCHAR(24) NOT NULL DEFAULT 'PENDING',
  reviewer_account_id CHAR(36) NULL,
  created_at BIGINT UNSIGNED NOT NULL,
  reviewed_at BIGINT UNSIGNED NULL,
  KEY idx_jrei_learning_proposal_cycle(cycle_day,review_state),
  CONSTRAINT fk_jrei_learning_proposal_cycle
    FOREIGN KEY (cycle_day) REFERENCES jrei_learning_daily_cycles(cycle_day),
  CONSTRAINT fk_jrei_learning_proposal_reviewer
    FOREIGN KEY (reviewer_account_id) REFERENCES customer_accounts(id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Deliberately do NOT auto-grant permission to learn or self-deploy.
INSERT IGNORE INTO jrei_learning_controls
 (id,enabled,auto_promote_low_risk,active_retrieval_version,
  max_daily_evaluations,minimum_reviewed_cases,updated_at)
 VALUES (1,0,0,1,500,200,0);

-- A future deployment must separately provision trusted evaluation material,
-- source provenance, Windows worker credentials, confidential config and E2E
-- acceptance. No fabricated gains or results are seeded.
