-- JREI evidence-anchored learning-to-learn retention. SOURCE PROPOSAL ONLY.
-- Never execute on Bertina without an independently verified backup restore,
-- reviewed schema diff/privileges, isolated clone review and owner release gate.
-- Single mother DB: drjavad1_store. Do NOT create a parallel database.
-- No learner records, raw passages, prompts, model weights, payment objects,
-- personal conversations, encrypted owner memory or model-generated SQL.
-- These tables are provenance metadata; their presence grants NO source rights,
-- publishing permissions, autonomous mission leases or scientific validity.
--
-- Source rows are non-deleting by policy; explicit revocations take priority
-- over earlier versions. Production readers must reject withdrawn or revoked
-- evidence even if a previously computed proposal once referenced it.
CREATE TABLE IF NOT EXISTS jrei_learning_evidence_versions (
  source_id VARCHAR(80) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  version_id VARCHAR(80) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  content_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  observed_at BIGINT UNSIGNED NOT NULL,
  rights_state ENUM(
    'UNKNOWN','PENDING','ALLOWED','RESTRICTED','REVOKED'
  ) NOT NULL DEFAULT 'UNKNOWN',
  science_review ENUM(
    'UNREVIEWED','INDEPENDENT_REVIEWED','REJECTED'
  ) NOT NULL DEFAULT 'UNREVIEWED',
  issuer_review ENUM(
    'UNREVIEWED','VERIFIED','REJECTED'
  ) NOT NULL DEFAULT 'UNREVIEWED',
  withdrawn TINYINT(1) NOT NULL DEFAULT 0,
  superseded TINYINT(1) NOT NULL DEFAULT 0,
  review_receipt_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  policy_version VARCHAR(80) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  created_at BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (source_id,version_id),
  KEY idx_learning_source_revision (source_id,created_at),
  KEY idx_learning_source_rights (rights_state,withdrawn,superseded)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Digest-anchored claims: text remains in the existing rights-governed
-- educational/publication CMS. IDs and digests are NOT scientific approval.
CREATE TABLE IF NOT EXISTS jrei_learning_claim_revisions (
  claim_id VARCHAR(80) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  revision_id VARCHAR(80) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  language_code ENUM('fa','en','bi') NOT NULL,
  subject_code VARCHAR(80) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  content_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  evidence_manifest_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  review_status ENUM(
    'PENDING','HOLD_SOURCE','HOLD_RIGHTS','HOLD_REVISION',
    'HOLD_REVIEW','REVIEW_READY','INDEPENDENT_REVIEWED',
    'REVOKED'
  ) NOT NULL DEFAULT 'PENDING',
  reviewer_receipt_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  created_at BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (claim_id,revision_id),
  KEY idx_learning_claim_review (review_status,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- A citation must refer to one immutable *version*, not merely a URL.
CREATE TABLE IF NOT EXISTS jrei_learning_claim_evidence_refs (
  claim_id VARCHAR(80) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  revision_id VARCHAR(80) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  source_id VARCHAR(80) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  source_version_id VARCHAR(80) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  anchor_code VARCHAR(80) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  source_content_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  PRIMARY KEY (
    claim_id,revision_id,source_id,source_version_id,anchor_code
  ),
  KEY idx_learning_source_dependents (source_id,source_version_id),
  CONSTRAINT fk_learning_claim_ref FOREIGN KEY (claim_id,revision_id)
    REFERENCES jrei_learning_claim_revisions (claim_id,revision_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_learning_source_ref FOREIGN KEY (source_id,source_version_id)
    REFERENCES jrei_learning_evidence_versions (source_id,version_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Downstream claim changes must be evaluated transitively. The original
-- knowledge review must fail closed on missing/revoked predecessor revisions.
CREATE TABLE IF NOT EXISTS jrei_learning_claim_dependencies (
  claim_id VARCHAR(80) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  revision_id VARCHAR(80) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  predecessor_claim_id VARCHAR(80) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  predecessor_revision_id VARCHAR(80) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  PRIMARY KEY(
    claim_id,revision_id,predecessor_claim_id,predecessor_revision_id
  ),
  KEY idx_learning_predecessor (
    predecessor_claim_id,predecessor_revision_id
  ),
  CONSTRAINT fk_learning_claim_dependency FOREIGN KEY (claim_id,revision_id)
    REFERENCES jrei_learning_claim_revisions (claim_id,revision_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_learning_predecessor FOREIGN KEY(
    predecessor_claim_id,predecessor_revision_id
  ) REFERENCES jrei_learning_claim_revisions(claim_id,revision_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Historical negative outcomes are first-class; never silently count
-- withheld, rights-ineligible, leaked or insufficient experiments as wins.
CREATE TABLE IF NOT EXISTS jrei_learning_method_evidence (
  episode_id VARCHAR(80) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  experiment_id VARCHAR(80) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  domain_code VARCHAR(80) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  method_code VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  purpose_code VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  fixture_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  negative_cases_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  review_input_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  source_policy_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  experiment_review_receipt_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  review_decision VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  policy_version VARCHAR(80) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  observed_at BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY(episode_id),
  UNIQUE KEY uq_learning_experiment (experiment_id),
  KEY idx_learning_method_history (domain_code,method_code,observed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Content is a bounded result contract (never an executable policy),
-- with explicit review/promotion separation. Approval remains in the
-- ORIGINAL audited owner framework, not in this proposed table.
CREATE TABLE IF NOT EXISTS jrei_learning_strategy_proposals (
  proposal_id VARCHAR(80) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  request_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  result_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  domain_code VARCHAR(80) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  proposed_method VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  policy_version VARCHAR(80) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  status ENUM('PROPOSED','INDEPENDENT_REVIEW_REQUIRED','REJECTED',
              'SUPERSEDED') NOT NULL DEFAULT 'PROPOSED',
  created_at BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY(proposal_id),
  UNIQUE KEY uq_learning_request_policy(request_sha256,policy_version),
  KEY idx_learning_review_queue(status,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- No triggers, events, cron, backend enable flag, live agent access,
-- publication, knowledge promotion or automatic data extraction.
