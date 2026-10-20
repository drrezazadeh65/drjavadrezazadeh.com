-- JR KONKUR: PROPOSED 003f scorecard adapter module (NOT EXECUTED).
-- Additive module within existing drjavad1_store mother DB. Run ONLY after
-- live schema inventory, backup+restore test, 003e acceptance and owner approval.
-- DO NOT use as a public scores API. No raw image, national ID or PDF storage here.
-- Provider results are NOT official Sanjesh eligibility or comparable calibrated scores.
SET NAMES utf8mb4;
USE drjavad1_store;

-- Provider-specific source namespace. New providers require records, not new tables.
CREATE TABLE IF NOT EXISTS eco_exam_score_providers (
 id CHAR(36) NOT NULL PRIMARY KEY,
 provider_code VARCHAR(60) NOT NULL,
 display_name_fa VARCHAR(150) NOT NULL,
 provider_kind ENUM('OFFICIAL','PRACTICE','SCHOOL') NOT NULL,
 verification_state ENUM('DRAFT','REVIEWED') NOT NULL DEFAULT 'DRAFT',
 created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 UNIQUE KEY uq_esp_code (provider_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Exam sitting: academic year and provider-native scale/version stay independent.
CREATE TABLE IF NOT EXISTS eco_exam_score_events (
 id CHAR(36) NOT NULL PRIMARY KEY,
 provider_id CHAR(36) NOT NULL,
 admission_cycle_id CHAR(36) NULL,
 provider_exam_code VARCHAR(120) NOT NULL,
 exam_on DATE NULL,
 group_code VARCHAR(80) NULL,
 scale_code VARCHAR(80) NULL,
 scale_version VARCHAR(80) NULL,
 source_revision VARCHAR(80) NULL,
 verification_state ENUM('DRAFT','REVIEWED') NOT NULL DEFAULT 'DRAFT',
 created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 UNIQUE KEY uq_ese_provider_exam (provider_id,provider_exam_code),
 KEY idx_ese_cycle (admission_cycle_id,provider_id),
 CONSTRAINT fk_ese_provider FOREIGN KEY (provider_id) REFERENCES eco_exam_score_providers(id) ON DELETE RESTRICT,
 CONSTRAINT fk_ese_cycle FOREIGN KEY (admission_cycle_id) REFERENCES eco_admission_cycles(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Confidential report header. Must be accessible ONLY through authenticated
-- account-scoped PHP, consent/guardian checks and rate-limited audited routes.
-- Account link is NOT permission to publish or use for marketing/training.
CREATE TABLE IF NOT EXISTS eco_exam_scorecards (
 id CHAR(36) NOT NULL PRIMARY KEY,
 account_id CHAR(36) NOT NULL,
 event_id CHAR(36) NOT NULL,
 report_kind ENUM('OFFICIAL','PRACTICE','SCHOOL') NOT NULL,
 capture_method ENUM('MANUAL','VERIFIED_IMPORT') NOT NULL DEFAULT 'MANUAL',
 entered_on DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 consent_record_id CHAR(36) NULL,
 verification_state ENUM('SELF_REPORTED','DOCUMENT_REVIEWED','PROVIDER_VERIFIED') NOT NULL DEFAULT 'SELF_REPORTED',
 overall_score DECIMAL(12,4) NULL,
 overall_rank INT UNSIGNED NULL,
 rank_scope VARCHAR(80) NULL,
 quota_code VARCHAR(80) NULL,
 cohort_size INT UNSIGNED NULL,
 report_version INT UNSIGNED NOT NULL DEFAULT 1,
 revoked_at DATETIME(3) NULL,
 KEY idx_esc_account (account_id,entered_on),
 KEY idx_esc_event (event_id,verification_state),
 CONSTRAINT fk_esc_account FOREIGN KEY (account_id) REFERENCES customer_accounts(id) ON DELETE RESTRICT,
 CONSTRAINT fk_esc_event FOREIGN KEY (event_id) REFERENCES eco_exam_score_events(id) ON DELETE RESTRICT,
 CONSTRAINT fk_esc_consent FOREIGN KEY (consent_record_id) REFERENCES eco_consent_records(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Per-subject measures: explicit measure type, scale and missingness.
-- Provider percentages, taz, ranks and official final scores never collapse into one metric.
CREATE TABLE IF NOT EXISTS eco_exam_scorecard_measures (
 id CHAR(36) NOT NULL PRIMARY KEY,
 scorecard_id CHAR(36) NOT NULL,
 subject_code VARCHAR(100) NOT NULL,
 measure_code VARCHAR(80) NOT NULL,
 measure_value DECIMAL(14,4) NULL,
 measure_unit VARCHAR(40) NULL,
 missing_reason ENUM('NOT_REPORTED','NOT_APPLICABLE','WITHHELD','UNKNOWN') NULL,
 source_label VARCHAR(180) NULL,
 entered_on DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 UNIQUE KEY uq_escm_measure (scorecard_id,subject_code,measure_code),
 KEY idx_escm_scorecard (scorecard_id),
 CONSTRAINT fk_escm_scorecard FOREIGN KEY (scorecard_id) REFERENCES eco_exam_scorecards(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- No inserts, provider defaults, official rank conversion or published scorecard views.
-- Retention and erasure operations must be implemented in existing privacy workflows
-- before any private scorecard persistence is enabled in production.
