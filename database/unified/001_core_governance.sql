-- DRJR Unified Bertina Database | 001: shared identity, governance, privacy and integrations
-- MySQL 8.0 / MariaDB 10.11; append-only CREATE; never drop/overwrite live tables.
-- Requires docs/BERTINA_MYSQL_SCHEMA.sql already installed; keep customer_accounts as identity source of truth.
SET NAMES utf8mb4;
SET time_zone = '+00:00';
CREATE TABLE IF NOT EXISTS eco_schema_migrations (
  version VARCHAR(80) NOT NULL PRIMARY KEY,
  sha256 CHAR(64) NOT NULL,
  source_commit CHAR(40) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  applied_by VARCHAR(120) NOT NULL,
  completed TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_organizations (
  id CHAR(36) NOT NULL PRIMARY KEY,
  slug VARCHAR(100) NOT NULL UNIQUE,
  display_name VARCHAR(180) NOT NULL,
  organization_type VARCHAR(32) NOT NULL DEFAULT 'SITE',
  status VARCHAR(24) NOT NULL DEFAULT 'ACTIVE',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_org_memberships (
  id CHAR(36) NOT NULL PRIMARY KEY,
  organization_id CHAR(36) NOT NULL,
  account_id CHAR(36) NOT NULL,
  membership_status VARCHAR(24) NOT NULL DEFAULT 'PENDING',
  joined_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_eco_member (organization_id,account_id),
  KEY idx_eco_member_account (account_id,membership_status),
  FOREIGN KEY (organization_id) REFERENCES eco_organizations(id) ON DELETE RESTRICT,
  FOREIGN KEY (account_id) REFERENCES customer_accounts(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_role_definitions (
  role_code VARCHAR(64) NOT NULL PRIMARY KEY,
  description VARCHAR(320) NOT NULL,
  scope_kind VARCHAR(24) NOT NULL DEFAULT 'SITE',
  privilege_level SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  enabled TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_role_grants (
  id CHAR(36) NOT NULL PRIMARY KEY,
  account_id CHAR(36) NOT NULL,
  role_code VARCHAR(64) NOT NULL,
  organization_id CHAR(36) NULL,
  scope_key VARCHAR(100) NOT NULL DEFAULT 'site',
  approved_by_account_id CHAR(36) NULL,
  grant_status VARCHAR(24) NOT NULL DEFAULT 'PENDING',
  expires_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_eco_role_scope (account_id,role_code,scope_key),
  KEY idx_eco_role_scope (role_code,grant_status,expires_at),
  FOREIGN KEY (account_id) REFERENCES customer_accounts(id) ON DELETE RESTRICT,
  FOREIGN KEY (role_code) REFERENCES eco_role_definitions(role_code) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id) REFERENCES eco_organizations(id) ON DELETE SET NULL,
  FOREIGN KEY (approved_by_account_id) REFERENCES customer_accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_account_profiles (
  account_id CHAR(36) NOT NULL PRIMARY KEY,
  display_label VARCHAR(140) NULL,
  preferred_locale CHAR(2) NOT NULL DEFAULT 'fa',
  time_zone VARCHAR(64) NOT NULL DEFAULT 'Asia/Tehran',
  profile_visibility VARCHAR(24) NOT NULL DEFAULT 'PRIVATE',
  avatar_object_id CHAR(36) NULL,
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  FOREIGN KEY (account_id) REFERENCES customer_accounts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_subjects (
  id CHAR(36) NOT NULL PRIMARY KEY,
  owner_account_id CHAR(36) NULL,
  guardian_account_id CHAR(36) NULL,
  pseudonym VARCHAR(120) NOT NULL,
  subject_type VARCHAR(32) NOT NULL DEFAULT 'LEARNER',
  age_band VARCHAR(24) NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'DRAFT',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  KEY idx_eco_subject_guardian (guardian_account_id,status),
  FOREIGN KEY (owner_account_id) REFERENCES customer_accounts(id) ON DELETE SET NULL,
  FOREIGN KEY (guardian_account_id) REFERENCES customer_accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_subject_relationships (
  id CHAR(36) NOT NULL PRIMARY KEY,
  subject_id CHAR(36) NOT NULL,
  related_account_id CHAR(36) NOT NULL,
  relationship_code VARCHAR(32) NOT NULL,
  verification_status VARCHAR(24) NOT NULL DEFAULT 'PENDING',
  verified_by_account_id CHAR(36) NULL,
  expires_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_eco_subject_relation (subject_id,related_account_id,relationship_code),
  FOREIGN KEY (subject_id) REFERENCES eco_subjects(id) ON DELETE CASCADE,
  FOREIGN KEY (related_account_id) REFERENCES customer_accounts(id) ON DELETE RESTRICT,
  FOREIGN KEY (verified_by_account_id) REFERENCES customer_accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_consent_notices (
  id CHAR(36) NOT NULL PRIMARY KEY,
  purpose_code VARCHAR(64) NOT NULL,
  version_label VARCHAR(32) NOT NULL,
  locale CHAR(2) NOT NULL,
  notice_sha256 CHAR(64) NOT NULL,
  effective_at DATETIME(3) NOT NULL,
  retired_at DATETIME(3) NULL,
  UNIQUE KEY uq_eco_consent_notice (purpose_code,version_label,locale)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_consent_records (
  id CHAR(36) NOT NULL PRIMARY KEY,
  account_id CHAR(36) NULL,
  subject_id CHAR(36) NULL,
  notice_id CHAR(36) NOT NULL,
  decision VARCHAR(20) NOT NULL,
  lawful_basis VARCHAR(40) NOT NULL,
  evidence_sha256 CHAR(64) NULL,
  granted_at DATETIME(3) NOT NULL,
  withdrawn_at DATETIME(3) NULL,
  source_code VARCHAR(64) NOT NULL,
  KEY idx_eco_consent_account (account_id,granted_at),
  KEY idx_eco_consent_subject (subject_id,granted_at),
  FOREIGN KEY (account_id) REFERENCES customer_accounts(id) ON DELETE SET NULL,
  FOREIGN KEY (subject_id) REFERENCES eco_subjects(id) ON DELETE SET NULL,
  FOREIGN KEY (notice_id) REFERENCES eco_consent_notices(id) ON DELETE RESTRICT,
  CONSTRAINT ck_eco_consent_owner CHECK (account_id IS NOT NULL OR subject_id IS NOT NULL)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_privacy_requests (
  id CHAR(36) NOT NULL PRIMARY KEY,
  requester_account_id CHAR(36) NOT NULL,
  subject_id CHAR(36) NULL,
  request_type VARCHAR(32) NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'RECEIVED',
  due_at DATETIME(3) NULL,
  closed_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  KEY idx_eco_privacy_open (status,due_at),
  FOREIGN KEY (requester_account_id) REFERENCES customer_accounts(id) ON DELETE RESTRICT,
  FOREIGN KEY (subject_id) REFERENCES eco_subjects(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_privacy_actions (
  id CHAR(36) NOT NULL PRIMARY KEY,
  request_id CHAR(36) NOT NULL,
  action_code VARCHAR(64) NOT NULL,
  operator_account_id CHAR(36) NULL,
  result_code VARCHAR(32) NOT NULL,
  evidence_sha256 CHAR(64) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  FOREIGN KEY (request_id) REFERENCES eco_privacy_requests(id) ON DELETE CASCADE,
  FOREIGN KEY (operator_account_id) REFERENCES customer_accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_legal_holds (
  id CHAR(36) NOT NULL PRIMARY KEY,
  subject_id CHAR(36) NULL,
  account_id CHAR(36) NULL,
  reason_code VARCHAR(64) NOT NULL,
  approved_by_account_id CHAR(36) NULL,
  expires_at DATETIME(3) NULL,
  released_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  FOREIGN KEY (subject_id) REFERENCES eco_subjects(id) ON DELETE SET NULL,
  FOREIGN KEY (account_id) REFERENCES customer_accounts(id) ON DELETE SET NULL,
  FOREIGN KEY (approved_by_account_id) REFERENCES customer_accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_audit_events (
  event_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  event_key CHAR(64) NOT NULL UNIQUE,
  actor_account_id CHAR(36) NULL,
  action_code VARCHAR(64) NOT NULL,
  entity_kind VARCHAR(64) NOT NULL,
  entity_id VARCHAR(80) NULL,
  correlation_id CHAR(36) NULL,
  payload_sha256 CHAR(64) NULL,
  previous_event_sha256 CHAR(64) NULL,
  event_sha256 CHAR(64) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_eco_audit_actor (actor_account_id,created_at),
  KEY idx_eco_audit_entity (entity_kind,entity_id,created_at),
  FOREIGN KEY (actor_account_id) REFERENCES customer_accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_security_incidents (
  id CHAR(36) NOT NULL PRIMARY KEY,
  category VARCHAR(64) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  state VARCHAR(24) NOT NULL DEFAULT 'NEW',
  owner_account_id CHAR(36) NULL,
  evidence_object_id CHAR(36) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  resolved_at DATETIME(3) NULL,
  KEY idx_eco_incident_queue (state,severity,created_at),
  FOREIGN KEY (owner_account_id) REFERENCES customer_accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_object_refs (
  id CHAR(36) NOT NULL PRIMARY KEY,
  storage_provider VARCHAR(40) NOT NULL,
  object_reference VARCHAR(191) NOT NULL,
  content_sha256 CHAR(64) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  byte_size BIGINT UNSIGNED NOT NULL,
  encryption_key_reference VARCHAR(191) NULL,
  data_class VARCHAR(24) NOT NULL DEFAULT 'PRIVATE',
  malware_scan_status VARCHAR(24) NOT NULL DEFAULT 'PENDING',
  owner_account_id CHAR(36) NULL,
  retention_until DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_eco_object_ref (storage_provider,object_reference),
  KEY idx_eco_object_retention (retention_until,data_class),
  FOREIGN KEY (owner_account_id) REFERENCES customer_accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_object_versions (
  id CHAR(36) NOT NULL PRIMARY KEY,
  object_id CHAR(36) NOT NULL,
  version_no INT UNSIGNED NOT NULL,
  sha256 CHAR(64) NOT NULL,
  storage_reference VARCHAR(191) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_eco_object_version (object_id,version_no),
  FOREIGN KEY (object_id) REFERENCES eco_object_refs(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_object_access_grants (
  id CHAR(36) NOT NULL PRIMARY KEY,
  object_id CHAR(36) NOT NULL,
  account_id CHAR(36) NOT NULL,
  access_code VARCHAR(24) NOT NULL,
  expires_at DATETIME(3) NULL,
  approved_by_account_id CHAR(36) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_eco_obj_access (object_id,account_id,access_code),
  FOREIGN KEY (object_id) REFERENCES eco_object_refs(id) ON DELETE CASCADE,
  FOREIGN KEY (account_id) REFERENCES customer_accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by_account_id) REFERENCES customer_accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_feature_definitions (
  feature_code VARCHAR(80) NOT NULL PRIMARY KEY,
  module_code VARCHAR(40) NOT NULL,
  default_state VARCHAR(24) NOT NULL DEFAULT 'DISABLED',
  requires_acceptance TINYINT(1) NOT NULL DEFAULT 1,
  description VARCHAR(320) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_feature_assignments (
  id CHAR(36) NOT NULL PRIMARY KEY,
  feature_code VARCHAR(80) NOT NULL,
  account_id CHAR(36) NULL,
  organization_id CHAR(36) NULL,
  state VARCHAR(24) NOT NULL DEFAULT 'DISABLED',
  effective_from DATETIME(3) NULL,
  expires_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_eco_feat_user (account_id,feature_code),
  FOREIGN KEY (feature_code) REFERENCES eco_feature_definitions(feature_code) ON DELETE CASCADE,
  FOREIGN KEY (account_id) REFERENCES customer_accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (organization_id) REFERENCES eco_organizations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_integrations (
  id CHAR(36) NOT NULL PRIMARY KEY,
  provider_code VARCHAR(60) NOT NULL,
  integration_kind VARCHAR(40) NOT NULL,
  external_scope VARCHAR(160) NULL,
  state VARCHAR(24) NOT NULL DEFAULT 'DISCONNECTED',
  secret_reference VARCHAR(191) NULL,
  capabilities_json LONGTEXT NULL,
  verified_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_eco_integration (provider_code,integration_kind)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_idempotency_keys (
  scope_code VARCHAR(64) NOT NULL,
  request_key CHAR(64) NOT NULL,
  request_sha256 CHAR(64) NOT NULL,
  result_reference VARCHAR(120) NULL,
  state VARCHAR(24) NOT NULL DEFAULT 'PENDING',
  expires_at DATETIME(3) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (scope_code,request_key),
  KEY idx_eco_idem_expiry (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_outbox_events (
  id CHAR(36) NOT NULL PRIMARY KEY,
  event_key VARCHAR(160) NOT NULL UNIQUE,
  topic VARCHAR(90) NOT NULL,
  subject_ref VARCHAR(100) NOT NULL,
  payload_reference CHAR(36) NULL,
  state VARCHAR(24) NOT NULL DEFAULT 'PENDING',
  attempts INT UNSIGNED NOT NULL DEFAULT 0,
  next_attempt_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  sent_at DATETIME(3) NULL,
  KEY idx_eco_outbox_poll (state,next_attempt_at,created_at),
  FOREIGN KEY (payload_reference) REFERENCES eco_object_refs(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_jobs (
  id CHAR(36) NOT NULL PRIMARY KEY,
  job_type VARCHAR(80) NOT NULL,
  job_key VARCHAR(160) NOT NULL UNIQUE,
  payload_reference CHAR(36) NULL,
  state VARCHAR(24) NOT NULL DEFAULT 'PENDING',
  priority SMALLINT NOT NULL DEFAULT 0,
  not_before DATETIME(3) NULL,
  locked_until DATETIME(3) NULL,
  attempts INT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  KEY idx_eco_jobs_poll (state,not_before,priority),
  FOREIGN KEY (payload_reference) REFERENCES eco_object_refs(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_job_attempts (
  attempt_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  job_id CHAR(36) NOT NULL,
  attempt_number INT UNSIGNED NOT NULL,
  outcome_code VARCHAR(32) NOT NULL,
  error_code VARCHAR(80) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_eco_job_attempt (job_id,attempt_number),
  FOREIGN KEY (job_id) REFERENCES eco_jobs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_webhook_inbox (
  id CHAR(36) NOT NULL PRIMARY KEY,
  provider_code VARCHAR(60) NOT NULL,
  provider_event_id VARCHAR(160) NOT NULL,
  payload_sha256 CHAR(64) NOT NULL,
  signature_verified TINYINT(1) NOT NULL DEFAULT 0,
  state VARCHAR(24) NOT NULL DEFAULT 'RECEIVED',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  processed_at DATETIME(3) NULL,
  UNIQUE KEY uq_eco_webhook_provider (provider_code,provider_event_id),
  KEY idx_eco_webhook_poll (state,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_webhook_deliveries (
  id CHAR(36) NOT NULL PRIMARY KEY,
  delivery_key VARCHAR(160) NOT NULL UNIQUE,
  integration_id CHAR(36) NOT NULL,
  event_id CHAR(36) NULL,
  state VARCHAR(24) NOT NULL DEFAULT 'PENDING',
  http_status SMALLINT UNSIGNED NULL,
  attempts INT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  last_attempt_at DATETIME(3) NULL,
  FOREIGN KEY (integration_id) REFERENCES eco_integrations(id) ON DELETE RESTRICT,
  FOREIGN KEY (event_id) REFERENCES eco_outbox_events(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_retention_policies (
  id CHAR(36) NOT NULL PRIMARY KEY,
  data_class VARCHAR(64) NOT NULL UNIQUE,
  retain_days INT UNSIGNED NOT NULL,
  delete_mode VARCHAR(32) NOT NULL,
  legal_hold_override TINYINT(1) NOT NULL DEFAULT 1,
  policy_version VARCHAR(24) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_retention_runs (
  id CHAR(36) NOT NULL PRIMARY KEY,
  policy_id CHAR(36) NOT NULL,
  cutoff_at DATETIME(3) NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'PLANNED',
  records_scanned BIGINT UNSIGNED NOT NULL DEFAULT 0,
  records_deleted BIGINT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  completed_at DATETIME(3) NULL,
  FOREIGN KEY (policy_id) REFERENCES eco_retention_policies(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_workflow_versions (
  id CHAR(36) NOT NULL PRIMARY KEY,
  workflow_code VARCHAR(80) NOT NULL,
  version_no INT UNSIGNED NOT NULL,
  module_code VARCHAR(60) NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'DRAFT',
  definition_json LONGTEXT NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_eco_workflow_ver (workflow_code,version_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_workflow_transitions (
  id CHAR(36) NOT NULL PRIMARY KEY,
  workflow_version_id CHAR(36) NOT NULL,
  from_state VARCHAR(48) NOT NULL,
  action_code VARCHAR(48) NOT NULL,
  to_state VARCHAR(48) NOT NULL,
  requires_role VARCHAR(64) NULL,
  requires_evidence TINYINT(1) NOT NULL DEFAULT 0,
  UNIQUE KEY uq_eco_workflow_step (workflow_version_id,from_state,action_code),
  FOREIGN KEY (workflow_version_id) REFERENCES eco_workflow_versions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_vocabularies (
  vocabulary_code VARCHAR(80) NOT NULL PRIMARY KEY,
  module_code VARCHAR(40) NOT NULL,
  description VARCHAR(240) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_vocabulary_terms (
  vocabulary_code VARCHAR(80) NOT NULL,
  term_code VARCHAR(80) NOT NULL,
  display_fa VARCHAR(190) NULL,
  display_en VARCHAR(190) NULL,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  PRIMARY KEY (vocabulary_code,term_code),
  FOREIGN KEY (vocabulary_code) REFERENCES eco_vocabularies(vocabulary_code) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
