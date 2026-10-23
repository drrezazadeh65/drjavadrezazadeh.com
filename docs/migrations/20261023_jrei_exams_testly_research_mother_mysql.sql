-- 2026-10-23 | JREI examination knowledge + TESTLY research
-- ADDITIVE SOURCE ONLY — DO NOT RUN BEFORE FINAL SINGLE ACCEPTANCE AND
-- explicit owner approval, verified eco_assessment_* dependencies and backup.
-- Existing Bertina MySQL/MariaDB mother database drjavad1_store ONLY.
-- Reuse eco_assessment_instruments, eco_instrument_versions,
-- eco_assessment_items, eco_assessment_sessions, eco_consent_records and
-- eco_object_refs (when their known upstream migrations have been installed).
-- No second assessment/identity, no payment changes, no public PDF dump.
-- All operational discovery/generation/research flags default OFF.
CREATE TABLE IF NOT EXISTS jrei_exam_controls (
  id TINYINT UNSIGNED PRIMARY KEY,
  discovery_enabled TINYINT(1) NOT NULL DEFAULT 0,
  extraction_enabled TINYINT(1) NOT NULL DEFAULT 0,
  generation_enabled TINYINT(1) NOT NULL DEFAULT 0,
  participant_enrolment_enabled TINYINT(1) NOT NULL DEFAULT 0,
  research_processing_enabled TINYINT(1) NOT NULL DEFAULT 0,
  policy_revision BIGINT UNSIGNED NOT NULL DEFAULT 1,
  updated_at BIGINT UNSIGNED NOT NULL DEFAULT 0,
  updated_by_account_id CHAR(36) NULL,
  CONSTRAINT fk_jrei_exam_control_owner
    FOREIGN KEY (updated_by_account_id) REFERENCES customer_accounts(id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS jrei_exam_sources (
  source_id CHAR(36) NOT NULL PRIMARY KEY,
  source_authority_id VARCHAR(100) NOT NULL,
  source_title VARCHAR(240) NOT NULL,
  publication_date DATE NULL,
  source_version VARCHAR(100) NOT NULL,
  original_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  source_locator_digest CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  country_code CHAR(2) NOT NULL DEFAULT 'IR',
  educational_level VARCHAR(40) NOT NULL,
  exam_category VARCHAR(50) NOT NULL,
  curriculum_version VARCHAR(100) NOT NULL,
  subject_id VARCHAR(100) NOT NULL,
  examination_year SMALLINT UNSIGNED NOT NULL,
  source_kind VARCHAR(40) NOT NULL DEFAULT 'EXAM_PAPER',
  rights_state VARCHAR(40) NOT NULL DEFAULT 'PERMISSION_UNVERIFIED',
  review_state VARCHAR(40) NOT NULL DEFAULT 'DISCOVERED',
  extraction_state VARCHAR(40) NOT NULL DEFAULT 'NOT_STARTED',
  answer_key_state VARCHAR(40) NOT NULL DEFAULT 'UNKNOWN',
  is_superseded TINYINT(1) NOT NULL DEFAULT 0,
  is_revoked TINYINT(1) NOT NULL DEFAULT 0,
  private_object_ref_id CHAR(36) NULL,
  reviewer_account_id CHAR(36) NULL,
  verified_at BIGINT UNSIGNED NULL,
  created_at BIGINT UNSIGNED NOT NULL,
  updated_at BIGINT UNSIGNED NOT NULL,
  KEY idx_jrei_exam_source_coverage(examination_year,educational_level,subject_id,source_kind),
  KEY idx_jrei_exam_source_review(rights_state,review_state,extraction_state),
  CONSTRAINT fk_jrei_exam_source_reviewer FOREIGN KEY (reviewer_account_id)
    REFERENCES customer_accounts(id) ON DELETE SET NULL,
  CONSTRAINT fk_jrei_exam_source_private FOREIGN KEY (private_object_ref_id)
    REFERENCES eco_object_refs(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- A known absent resource must have an explicit coverage expectation;
-- no fabricated missing-paper count is inferred from the current crawler.
CREATE TABLE IF NOT EXISTS jrei_exam_coverage_requirements (
  requirement_id CHAR(36) NOT NULL PRIMARY KEY,
  educational_level VARCHAR(40) NOT NULL,
  grade SMALLINT UNSIGNED NULL,
  country_code CHAR(2) NOT NULL DEFAULT 'IR',
  curriculum_id VARCHAR(100) NOT NULL,
  curriculum_version VARCHAR(100) NOT NULL,
  exam_category VARCHAR(50) NOT NULL,
  examination_year SMALLINT UNSIGNED NOT NULL,
  subject_id VARCHAR(100) NOT NULL,
  expected_kind VARCHAR(40) NOT NULL,
  source_id CHAR(36) NULL,
  requirement_state VARCHAR(40) NOT NULL DEFAULT 'REQUIRES_SOURCE_REVIEW',
  approved_by_account_id CHAR(36) NULL,
  created_at BIGINT UNSIGNED NOT NULL,
  UNIQUE KEY uq_jrei_exam_expected(curriculum_id,curriculum_version,
    exam_category,examination_year,subject_id,expected_kind),
  KEY idx_jrei_exam_missing(requirement_state,educational_level,examination_year),
  CONSTRAINT fk_jrei_coverage_source FOREIGN KEY (source_id)
    REFERENCES jrei_exam_sources(source_id) ON DELETE SET NULL,
  CONSTRAINT fk_jrei_coverage_approver FOREIGN KEY (approved_by_account_id)
    REFERENCES customer_accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS jrei_exam_discovery_attempts (
  discovery_id CHAR(36) NOT NULL PRIMARY KEY,
  source_id CHAR(36) NULL,
  request_locator_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  source_authority_id VARCHAR(100) NOT NULL,
  discovery_type VARCHAR(40) NOT NULL,
  result_state VARCHAR(40) NOT NULL DEFAULT 'QUEUED_REVIEW',
  rights_review_state VARCHAR(40) NOT NULL DEFAULT 'PENDING',
  robots_review_state VARCHAR(40) NOT NULL DEFAULT 'PENDING',
  bytes_processed BIGINT UNSIGNED NOT NULL DEFAULT 0,
  questions_extracted INT UNSIGNED NOT NULL DEFAULT 0,
  duplicate_candidates INT UNSIGNED NOT NULL DEFAULT 0,
  last_attempt_at BIGINT UNSIGNED NULL,
  created_at BIGINT UNSIGNED NOT NULL,
  KEY idx_jrei_exam_discovery(result_state,last_attempt_at),
  CONSTRAINT fk_jrei_discovery_source FOREIGN KEY(source_id)
    REFERENCES jrei_exam_sources(source_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Existing eco_assessment_items is the canonical assessment item bank;
-- this table adds exam/curriculum provenance and generated-item review state.
CREATE TABLE IF NOT EXISTS jrei_exam_item_metadata (
  id CHAR(36) NOT NULL PRIMARY KEY,
  canonical_assessment_item_id CHAR(36) NULL,
  source_id CHAR(36) NULL,
  item_version VARCHAR(50) NOT NULL,
  authored_by_account_id CHAR(36) NULL,
  derived_from_metadata_id CHAR(36) NULL,
  curriculum_topic VARCHAR(120) NULL,
  competency_code VARCHAR(100) NULL,
  cognitive_demand_state VARCHAR(40) NOT NULL DEFAULT 'NOT_REVIEWED',
  difficulty_state VARCHAR(40) NOT NULL DEFAULT 'NOT_EMPIRICALLY_ESTIMATED',
  item_state VARCHAR(40) NOT NULL DEFAULT 'DRAFT',
  provenance_digest CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  item_content_digest CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  answer_key_digest CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  similarity_check_state VARCHAR(40) NOT NULL DEFAULT 'NOT_RUN',
  ambiguity_review_state VARCHAR(40) NOT NULL DEFAULT 'NOT_REVIEWED',
  diagram_formula_integrity VARCHAR(40) NOT NULL DEFAULT 'NOT_REVIEWED',
  copyright_review_state VARCHAR(40) NOT NULL DEFAULT 'NOT_REVIEWED',
  reviewed_by_account_id CHAR(36) NULL,
  reviewed_at BIGINT UNSIGNED NULL,
  created_at BIGINT UNSIGNED NOT NULL,
  UNIQUE KEY uq_jrei_item_ver(id,item_version),
  KEY idx_jrei_item_review(item_state,ambiguity_review_state,copyright_review_state),
  KEY idx_jrei_item_source(source_id),
  CONSTRAINT fk_jrei_item_original FOREIGN KEY(canonical_assessment_item_id)
    REFERENCES eco_assessment_items(id) ON DELETE RESTRICT,
  CONSTRAINT fk_jrei_item_source FOREIGN KEY(source_id)
    REFERENCES jrei_exam_sources(source_id) ON DELETE SET NULL,
  CONSTRAINT fk_jrei_item_author FOREIGN KEY(authored_by_account_id)
    REFERENCES customer_accounts(id) ON DELETE SET NULL,
  CONSTRAINT fk_jrei_item_reviewer FOREIGN KEY(reviewed_by_account_id)
    REFERENCES customer_accounts(id) ON DELETE SET NULL,
  CONSTRAINT fk_jrei_item_parent FOREIGN KEY(derived_from_metadata_id)
    REFERENCES jrei_exam_item_metadata(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS jrei_exam_blueprints (
  blueprint_id CHAR(36) NOT NULL PRIMARY KEY,
  scope_digest CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  source_id CHAR(36) NULL,
  approved_instrument_version_id CHAR(36) NULL,
  blueprint_version VARCHAR(60) NOT NULL,
  format_review_state VARCHAR(40) NOT NULL DEFAULT 'NOT_REVIEWED',
  timing_review_state VARCHAR(40) NOT NULL DEFAULT 'NOT_REVIEWED',
  scoring_review_state VARCHAR(40) NOT NULL DEFAULT 'NOT_REVIEWED',
  status VARCHAR(28) NOT NULL DEFAULT 'DRAFT',
  approved_by_account_id CHAR(36) NULL,
  approved_at BIGINT UNSIGNED NULL,
  created_at BIGINT UNSIGNED NOT NULL,
  UNIQUE KEY uq_jrei_blueprint_ver(scope_digest,blueprint_version),
  CONSTRAINT fk_jrei_blueprint_source FOREIGN KEY(source_id)
    REFERENCES jrei_exam_sources(source_id) ON DELETE SET NULL,
  CONSTRAINT fk_jrei_blueprint_instrument FOREIGN KEY(approved_instrument_version_id)
    REFERENCES eco_instrument_versions(id) ON DELETE RESTRICT,
  CONSTRAINT fk_jrei_blueprint_reviewer FOREIGN KEY(approved_by_account_id)
    REFERENCES customer_accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS jrei_exam_preparation_programmes (
  programme_id CHAR(36) NOT NULL PRIMARY KEY,
  blueprint_id CHAR(36) NOT NULL,
  official_exam_date DATE NULL,
  official_exam_date_source_id CHAR(36) NULL,
  exam_date_verified TINYINT(1) NOT NULL DEFAULT 0,
  scoring_version_id CHAR(36) NULL,
  eligibility_policy_version VARCHAR(70) NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
  created_by_account_id CHAR(36) NULL,
  created_at BIGINT UNSIGNED NOT NULL,
  updated_at BIGINT UNSIGNED NOT NULL,
  CONSTRAINT fk_jrei_prep_blueprint FOREIGN KEY(blueprint_id)
    REFERENCES jrei_exam_blueprints(blueprint_id) ON DELETE RESTRICT,
  CONSTRAINT fk_jrei_prep_date_source FOREIGN KEY(official_exam_date_source_id)
    REFERENCES jrei_exam_sources(source_id) ON DELETE SET NULL,
  CONSTRAINT fk_jrei_prep_owner FOREIGN KEY(created_by_account_id)
    REFERENCES customer_accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS jrei_exam_preparation_stages (
  stage_id CHAR(36) NOT NULL PRIMARY KEY,
  programme_id CHAR(36) NOT NULL,
  stage_code VARCHAR(20) NOT NULL,
  stage_date DATE NULL,
  duration_minutes SMALLINT UNSIGNED NULL,
  approved_instrument_version_id CHAR(36) NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
  published_by_account_id CHAR(36) NULL,
  created_at BIGINT UNSIGNED NOT NULL,
  UNIQUE KEY uq_jrei_prep_stage(programme_id,stage_code),
  CONSTRAINT fk_jrei_stage_programme FOREIGN KEY(programme_id)
    REFERENCES jrei_exam_preparation_programmes(programme_id) ON DELETE RESTRICT,
  CONSTRAINT fk_jrei_stage_assessment FOREIGN KEY(approved_instrument_version_id)
    REFERENCES eco_instrument_versions(id) ON DELETE RESTRICT,
  CONSTRAINT fk_jrei_stage_publisher FOREIGN KEY(published_by_account_id)
    REFERENCES customer_accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Research metadata only; participants, consent, identity and assessment
-- submissions remain in their EXISTING purpose-limited mother-DB tables.
CREATE TABLE IF NOT EXISTS jrei_testly_framework_versions (
  framework_version_id CHAR(36) NOT NULL PRIMARY KEY,
  framework_code VARCHAR(25) NOT NULL,
  author_proposal_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  version_label VARCHAR(80) NOT NULL,
  evidence_maturity VARCHAR(40) NOT NULL DEFAULT 'THEORETICAL_PROPOSITION',
  research_status VARCHAR(40) NOT NULL DEFAULT 'CONCEPTUAL_PROPOSAL',
  validated_composite_score TINYINT(1) NOT NULL DEFAULT 0,
  approved_by_account_id CHAR(36) NULL,
  created_at BIGINT UNSIGNED NOT NULL,
  UNIQUE KEY uq_jrei_framework_version(framework_code,version_label),
  CONSTRAINT fk_jrei_framework_owner FOREIGN KEY(approved_by_account_id)
    REFERENCES customer_accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS jrei_testly_indicator_proposals (
  indicator_id CHAR(36) NOT NULL PRIMARY KEY,
  framework_version_id CHAR(36) NOT NULL,
  dimension_code VARCHAR(90) NOT NULL,
  author_source_paragraph SMALLINT UNSIGNED NOT NULL,
  indicator_version VARCHAR(64) NOT NULL,
  indicator_definition_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  evidence_maturity VARCHAR(40) NOT NULL DEFAULT 'PROPOSED_OPERATIONAL_INDICATOR',
  operational_definition_state VARCHAR(30) NOT NULL DEFAULT 'NOT_APPROVED',
  review_by_account_id CHAR(36) NULL,
  review_at BIGINT UNSIGNED NULL,
  created_at BIGINT UNSIGNED NOT NULL,
  UNIQUE KEY uq_jrei_indicator_version(framework_version_id,dimension_code,indicator_version),
  CONSTRAINT fk_jrei_indicator_framework FOREIGN KEY(framework_version_id)
    REFERENCES jrei_testly_framework_versions(framework_version_id) ON DELETE RESTRICT,
  CONSTRAINT fk_jrei_indicator_reviewer FOREIGN KEY(review_by_account_id)
    REFERENCES customer_accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS jrei_testly_research_protocols (
  protocol_id CHAR(36) NOT NULL PRIMARY KEY,
  protocol_version VARCHAR(70) NOT NULL,
  framework_version_id CHAR(36) NOT NULL,
  registration_digest CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  ethics_review_state VARCHAR(35) NOT NULL DEFAULT 'NOT_REVIEWED',
  consent_notice_version VARCHAR(80) NULL,
  minor_participants_allowed TINYINT(1) NOT NULL DEFAULT 0,
  guardian_review_status VARCHAR(35) NOT NULL DEFAULT 'NOT_REVIEWED',
  authorized_purpose VARCHAR(64) NOT NULL DEFAULT 'TESTLY_HUMANABILITY_RESEARCH',
  research_state VARCHAR(35) NOT NULL DEFAULT 'DRAFT',
  owner_account_id CHAR(36) NULL,
  created_at BIGINT UNSIGNED NOT NULL,
  revised_at BIGINT UNSIGNED NULL,
  UNIQUE KEY uq_jrei_protocol_revision(protocol_id,protocol_version),
  CONSTRAINT fk_jrei_research_framework FOREIGN KEY(framework_version_id)
    REFERENCES jrei_testly_framework_versions(framework_version_id) ON DELETE RESTRICT,
  CONSTRAINT fk_jrei_research_owner FOREIGN KEY(owner_account_id)
    REFERENCES customer_accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS jrei_testly_research_datasets (
  dataset_id CHAR(36) NOT NULL PRIMARY KEY,
  protocol_id CHAR(36) NOT NULL,
  dataset_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  instrument_version_id CHAR(36) NULL,
  consent_attestation_digest CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  pseudonymization_review_state VARCHAR(40) NOT NULL DEFAULT 'NOT_REVIEWED',
  withdrawal_recheck_state VARCHAR(40) NOT NULL DEFAULT 'NOT_REVIEWED',
  dataset_state VARCHAR(36) NOT NULL DEFAULT 'QUARANTINED',
  participant_count INT UNSIGNED NULL,
  external_export_approved TINYINT(1) NOT NULL DEFAULT 0,
  retention_policy_version VARCHAR(80) NULL,
  created_at BIGINT UNSIGNED NOT NULL,
  KEY idx_jrei_research_datasets(protocol_id,dataset_state),
  CONSTRAINT fk_jrei_dataset_protocol FOREIGN KEY(protocol_id)
    REFERENCES jrei_testly_research_protocols(protocol_id) ON DELETE RESTRICT,
  CONSTRAINT fk_jrei_dataset_instrument FOREIGN KEY(instrument_version_id)
    REFERENCES eco_instrument_versions(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS jrei_testly_research_analyses (
  analysis_id CHAR(36) NOT NULL PRIMARY KEY,
  dataset_id CHAR(36) NOT NULL,
  protocol_version VARCHAR(70) NOT NULL,
  method_code VARCHAR(50) NOT NULL,
  analysis_code_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  result_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  interpretation VARCHAR(35) NOT NULL DEFAULT 'NOT_EVALUATED',
  results_review_state VARCHAR(35) NOT NULL DEFAULT 'NOT_REVIEWED',
  contradictory_findings_documented TINYINT(1) NOT NULL DEFAULT 0,
  scientific_validation_claim TINYINT(1) NOT NULL DEFAULT 0,
  reviewer_account_id CHAR(36) NULL,
  created_at BIGINT UNSIGNED NOT NULL,
  completed_at BIGINT UNSIGNED NULL,
  KEY idx_jrei_research_analysis(dataset_id,results_review_state),
  CONSTRAINT fk_jrei_analysis_dataset FOREIGN KEY(dataset_id)
    REFERENCES jrei_testly_research_datasets(dataset_id) ON DELETE RESTRICT,
  CONSTRAINT fk_jrei_analysis_reviewer FOREIGN KEY(reviewer_account_id)
    REFERENCES customer_accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO jrei_exam_controls
 (id,discovery_enabled,extraction_enabled,generation_enabled,
 participant_enrolment_enabled,research_processing_enabled,
 policy_revision,updated_at)
 VALUES(1,0,0,0,0,0,1,0);

-- No child/student enrolment, source discovery, answer approval, generating,
-- model training or official score claims are enabled by this migration.
-- Do not run it without reviewing actual eco_assessment table presence/column
-- compatibility in the mother DB, FK charset/collation and rollback plan.
