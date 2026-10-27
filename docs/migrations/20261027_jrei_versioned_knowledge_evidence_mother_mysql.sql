-- JREI APEX: immutable claim/version/evidence pointers and observed reversals.
-- SOURCE ONLY. Do NOT apply, deploy, or enable runtime merely by committing.
-- Existing drjavad1_store is the ONLY mother database.
-- Depends on the original jrei_exam_sources, customer_accounts and
-- jrei_learning_proposals schema. No new source catalogue is constructed.
-- No raw student records, full copyrighted books, model output or secrets.
-- Real rights are ALWAYS rechecked in jrei_exam_sources and
-- jrei_ka_source_policies before any actual retrieval or publication.

CREATE TABLE IF NOT EXISTS jrei_knowledge_claims (
  claim_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
  claim_subject VARCHAR(80) NOT NULL,
  language_code VARCHAR(4) NOT NULL,
  current_version_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  claim_status VARCHAR(24) NOT NULL DEFAULT 'PENDING_INDEPENDENT_REVIEW',
  withdrawn_at BIGINT UNSIGNED NULL,
  created_at BIGINT UNSIGNED NOT NULL,
  updated_at BIGINT UNSIGNED NOT NULL,
  revision BIGINT UNSIGNED NOT NULL DEFAULT 1,
  KEY idx_knowledge_claim_subject(claim_subject,claim_status),
  CONSTRAINT ck_jrei_claim_lang CHECK (language_code IN ('fa','en','bi'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- An append-only claim revision. Keep the digest; the independently reviewed
-- text lives in the existing controlled content store, NOT this table.
CREATE TABLE IF NOT EXISTS jrei_knowledge_claim_versions (
  version_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
  claim_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  revision_number INT UNSIGNED NOT NULL,
  claim_content_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  citation_manifest_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  scientific_review_state VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  reviewed_by_account_id CHAR(36) NULL,
  reviewed_at BIGINT UNSIGNED NULL,
  published_at BIGINT UNSIGNED NULL,
  revoked_at BIGINT UNSIGNED NULL,
  created_at BIGINT UNSIGNED NOT NULL,
  UNIQUE KEY uq_knowledge_claim_revision(claim_id,revision_number),
  KEY idx_knowledge_claim_version_review(scientific_review_state,created_at),
  CONSTRAINT fk_jrei_claim_version_parent FOREIGN KEY (claim_id)
    REFERENCES jrei_knowledge_claims(claim_id) ON DELETE RESTRICT,
  CONSTRAINT fk_jrei_claim_version_reviewer FOREIGN KEY (reviewed_by_account_id)
    REFERENCES customer_accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Citation anchors always identify the immutable publisher/source version
-- digest observed at review time. A newer document or withdrawn licence never
-- inherits the earlier source permission or claim review automatically.
CREATE TABLE IF NOT EXISTS jrei_knowledge_citation_edges (
  edge_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
  claim_version_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  source_id CHAR(36) NOT NULL,
  source_version_id VARCHAR(100) NOT NULL,
  source_content_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  excerpt_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  citation_anchor VARCHAR(80) NOT NULL,
  supporting_role VARCHAR(16) NOT NULL DEFAULT 'SUPPORTS',
  attached_at BIGINT UNSIGNED NOT NULL,
  invalidated_at BIGINT UNSIGNED NULL,
  invalidation_event_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  UNIQUE KEY uq_jrei_claim_source_pointer(
    claim_version_id,source_id,source_version_id,citation_anchor
  ),
  KEY idx_jrei_citation_source(source_id,source_version_id,invalidated_at),
  KEY idx_jrei_citation_invalidation(invalidation_event_id),
  CONSTRAINT fk_jrei_citation_claim_version FOREIGN KEY (claim_version_id)
    REFERENCES jrei_knowledge_claim_versions(version_id) ON DELETE RESTRICT,
  CONSTRAINT fk_jrei_citation_exam_source FOREIGN KEY (source_id)
    REFERENCES jrei_exam_sources(source_id) ON DELETE RESTRICT,
  CONSTRAINT ck_jrei_citation_role CHECK (
    supporting_role IN ('SUPPORTS','CONTRADICTS','NEUTRAL')
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Explicit claim-to-claim dependency. A withdrawn parent invalidates its
-- downstream dependents until a fresh independent review; no AI self-approval.
CREATE TABLE IF NOT EXISTS jrei_knowledge_claim_dependencies (
  claim_version_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  prerequisite_claim_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  recorded_at BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY(claim_version_id,prerequisite_claim_id),
  KEY idx_jrei_claim_dependency_reverse(prerequisite_claim_id),
  CONSTRAINT fk_jrei_claim_dependency_version FOREIGN KEY(claim_version_id)
    REFERENCES jrei_knowledge_claim_versions(version_id) ON DELETE RESTRICT,
  CONSTRAINT fk_jrei_claim_dependency_claim FOREIGN KEY(prerequisite_claim_id)
    REFERENCES jrei_knowledge_claims(claim_id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- A durable causal chain of observed source events; an inserted event does
-- not itself mutate the source's canonical rights/review record.
CREATE TABLE IF NOT EXISTS jrei_knowledge_invalidation_events (
  event_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
  source_id CHAR(36) NOT NULL,
  source_version_id VARCHAR(100) NOT NULL,
  prior_source_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  new_source_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  reason_code VARCHAR(40) NOT NULL,
  observed_evidence_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  observed_at BIGINT UNSIGNED NOT NULL,
  human_reviewer_account_id CHAR(36) NULL,
  reviewed_at BIGINT UNSIGNED NULL,
  event_status VARCHAR(24) NOT NULL DEFAULT 'AWAITING_INDEPENDENT_REVIEW',
  UNIQUE KEY uq_jrei_source_evidence_event(source_id,observed_evidence_sha256),
  KEY idx_jrei_source_invalidation(source_id,observed_at),
  CONSTRAINT fk_jrei_invalidation_source FOREIGN KEY(source_id)
    REFERENCES jrei_exam_sources(source_id) ON DELETE RESTRICT,
  CONSTRAINT fk_jrei_invalidation_reviewer FOREIGN KEY(human_reviewer_account_id)
    REFERENCES customer_accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Observed failures are retained alongside promising outcomes so the
-- 'learning to learn' planner cannot hide regressions when ranking methods.
CREATE TABLE IF NOT EXISTS jrei_learning_method_trial_evidence (
  trial_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
  proposal_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  gap_kind VARCHAR(40) NOT NULL,
  scientific_domain VARCHAR(80) NOT NULL,
  proposed_method VARCHAR(48) NOT NULL,
  policy_version VARCHAR(80) NOT NULL,
  heldout_fixture_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  heldout_result_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  negative_cases_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  benchmark_decision VARCHAR(48) NOT NULL,
  observed_case_count INT UNSIGNED NOT NULL,
  rights_review_state VARCHAR(24) NOT NULL DEFAULT 'NOT_REVIEWED',
  fixture_review_state VARCHAR(24) NOT NULL DEFAULT 'NOT_REVIEWED',
  independent_reviewer_account_id CHAR(36) NULL,
  observed_at BIGINT UNSIGNED NOT NULL,
  reviewed_at BIGINT UNSIGNED NULL,
  UNIQUE KEY uq_jrei_method_trial_proposal(proposal_id,heldout_result_sha256),
  KEY idx_jrei_method_evidence(scientific_domain,benchmark_decision),
  CONSTRAINT fk_jrei_method_trial_proposal FOREIGN KEY(proposal_id)
    REFERENCES jrei_learning_proposals(proposal_id) ON DELETE RESTRICT,
  CONSTRAINT fk_jrei_method_trial_reviewer FOREIGN KEY(independent_reviewer_account_id)
    REFERENCES customer_accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- All new rows default to PENDING/REVIEW; no approved sources, claims,
-- tests, scores, model improvements, or live crawler jobs are inserted.
