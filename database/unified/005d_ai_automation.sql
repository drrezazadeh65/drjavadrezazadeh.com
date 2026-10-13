-- Unified Bertina | 005d guarded AI knowledge, no-PII-by-default sessions and human-approved automation.
-- Actual AI models, vector indexes and large private objects may use specialised processing/storage
-- without creating another transactional source-of-truth database.
SET NAMES utf8mb4;
SET time_zone = '+00:00';
CREATE TABLE IF NOT EXISTS eco_ai_knowledge_sources (
  id CHAR(36) NOT NULL PRIMARY KEY,
  source_code VARCHAR(100) NOT NULL UNIQUE,
  source_kind VARCHAR(40) NOT NULL,
  content_item_id CHAR(36) NULL,
  owner_org_id CHAR(36) NULL,
  visibility VARCHAR(24) NOT NULL DEFAULT 'PRIVATE',
  use_in_answers TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  FOREIGN KEY (content_item_id) REFERENCES eco_content_items(id) ON DELETE SET NULL,
  FOREIGN KEY (owner_org_id) REFERENCES eco_organizations(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_ai_knowledge_revisions (
  id CHAR(36) NOT NULL PRIMARY KEY,
  source_id CHAR(36) NOT NULL,
  revision_no INT UNSIGNED NOT NULL,
  content_sha256 CHAR(64) NOT NULL,
  object_ref_id CHAR(36) NULL,
  approval_state VARCHAR(24) NOT NULL DEFAULT 'DRAFT',
  verified_by_account_id CHAR(36) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_eco_ai_source_revision (source_id,revision_no),
  FOREIGN KEY (source_id) REFERENCES eco_ai_knowledge_sources(id) ON DELETE RESTRICT,
  FOREIGN KEY (object_ref_id) REFERENCES eco_object_refs(id) ON DELETE SET NULL,
  FOREIGN KEY (verified_by_account_id) REFERENCES customer_accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_ai_model_policies (
  id CHAR(36) NOT NULL PRIMARY KEY,
  policy_code VARCHAR(90) NOT NULL,
  version_no INT UNSIGNED NOT NULL,
  approved_purpose VARCHAR(80) NOT NULL,
  safety_review_state VARCHAR(32) NOT NULL DEFAULT 'NOT_APPROVED',
  policy_object_id CHAR(36) NULL,
  active_from DATETIME(3) NULL,
  UNIQUE KEY uq_eco_ai_policy_version (policy_code,version_no),
  FOREIGN KEY (policy_object_id) REFERENCES eco_object_refs(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_ai_conversations (
  id CHAR(36) NOT NULL PRIMARY KEY,
  account_id CHAR(36) NULL,
  anonymous_subject_hash CHAR(64) NULL,
  purpose_code VARCHAR(80) NOT NULL,
  consent_id CHAR(36) NULL,
  policy_id CHAR(36) NULL,
  retention_until DATETIME(3) NULL,
  state VARCHAR(24) NOT NULL DEFAULT 'OPEN',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_eco_ai_retention (retention_until),
  FOREIGN KEY (account_id) REFERENCES customer_accounts(id) ON DELETE SET NULL,
  FOREIGN KEY (consent_id) REFERENCES eco_consent_records(id) ON DELETE SET NULL,
  FOREIGN KEY (policy_id) REFERENCES eco_ai_model_policies(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_ai_turn_evidence (
  id CHAR(36) NOT NULL PRIMARY KEY,
  conversation_id CHAR(36) NOT NULL,
  turn_index INT UNSIGNED NOT NULL,
  input_sha256 CHAR(64) NULL,
  output_sha256 CHAR(64) NULL,
  response_object_id CHAR(36) NULL,
  retrieval_source_revision_id CHAR(36) NULL,
  human_escalated TINYINT(1) NOT NULL DEFAULT 0,
  model_code VARCHAR(90) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_eco_ai_turn (conversation_id,turn_index),
  FOREIGN KEY (conversation_id) REFERENCES eco_ai_conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (response_object_id) REFERENCES eco_object_refs(id) ON DELETE SET NULL,
  FOREIGN KEY (retrieval_source_revision_id) REFERENCES eco_ai_knowledge_revisions(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_ai_safety_reviews (
  id CHAR(36) NOT NULL PRIMARY KEY,
  turn_evidence_id CHAR(36) NOT NULL,
  reviewer_account_id CHAR(36) NULL,
  risk_code VARCHAR(60) NOT NULL,
  decision_code VARCHAR(40) NOT NULL,
  review_evidence_object_id CHAR(36) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  FOREIGN KEY (turn_evidence_id) REFERENCES eco_ai_turn_evidence(id) ON DELETE RESTRICT,
  FOREIGN KEY (reviewer_account_id) REFERENCES customer_accounts(id) ON DELETE SET NULL,
  FOREIGN KEY (review_evidence_object_id) REFERENCES eco_object_refs(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_automation_definitions (
  id CHAR(36) NOT NULL PRIMARY KEY,
  automation_code VARCHAR(100) NOT NULL UNIQUE,
  owner_org_id CHAR(36) NULL,
  workflow_version_id CHAR(36) NULL,
  state VARCHAR(24) NOT NULL DEFAULT 'DISABLED',
  requires_owner_approval TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  FOREIGN KEY (owner_org_id) REFERENCES eco_organizations(id) ON DELETE SET NULL,
  FOREIGN KEY (workflow_version_id) REFERENCES eco_workflow_versions(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_automation_runs (
  id CHAR(36) NOT NULL PRIMARY KEY,
  definition_id CHAR(36) NOT NULL,
  request_key CHAR(64) NOT NULL,
  trigger_code VARCHAR(70) NOT NULL,
  state VARCHAR(24) NOT NULL DEFAULT 'PENDING',
  approved_by_account_id CHAR(36) NULL,
  started_at DATETIME(3) NULL,
  finished_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_eco_automation_key (definition_id,request_key),
  FOREIGN KEY (definition_id) REFERENCES eco_automation_definitions(id) ON DELETE RESTRICT,
  FOREIGN KEY (approved_by_account_id) REFERENCES customer_accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_automation_run_steps (
  id CHAR(36) NOT NULL PRIMARY KEY,
  run_id CHAR(36) NOT NULL,
  step_index INT UNSIGNED NOT NULL,
  action_code VARCHAR(90) NOT NULL,
  result_code VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  result_evidence_sha256 CHAR(64) NULL,
  executed_at DATETIME(3) NULL,
  UNIQUE KEY uq_eco_automation_step (run_id,step_index),
  FOREIGN KEY (run_id) REFERENCES eco_automation_runs(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_automation_approvals (
  id CHAR(36) NOT NULL PRIMARY KEY,
  run_id CHAR(36) NOT NULL,
  approver_account_id CHAR(36) NOT NULL,
  approval_scope VARCHAR(70) NOT NULL,
  approval_sha256 CHAR(64) NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  consumed_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  FOREIGN KEY (run_id) REFERENCES eco_automation_runs(id) ON DELETE RESTRICT,
  FOREIGN KEY (approver_account_id) REFERENCES customer_accounts(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
