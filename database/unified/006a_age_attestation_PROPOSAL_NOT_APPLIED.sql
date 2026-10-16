-- PROPOSAL / DESIGN REVIEW ONLY — DO NOT RUN AGAINST LIVE BERTINA.
-- This is an additive research candidate, NOT an approved migration.
-- Depends on 001_core_governance.sql, existing customer_accounts identity,
-- ethics/privacy approval, verified guardian authority and a safe rollout plan.
--
-- No DOB, government ID number, document scan or unprotected proof is stored.
-- evidence_sha256 is an opaque digest of the verification *record*, not a
-- password, reversible identifier, or proof that a check was legally valid.
-- All reviewers must be independently authorized in the future PHP API.
CREATE TABLE IF NOT EXISTS eco_subject_age_attestations (
  id CHAR(36) NOT NULL PRIMARY KEY,
  subject_id CHAR(36) NOT NULL,
  classification VARCHAR(12) NOT NULL,
  jurisdiction_code CHAR(2) NOT NULL,
  policy_version VARCHAR(48) NOT NULL,
  source_code VARCHAR(64) NOT NULL,
  review_status VARCHAR(24) NOT NULL DEFAULT 'PENDING',
  verified_by_account_id CHAR(36) NULL,
  reviewed_by_account_id CHAR(36) NULL,
  evidence_sha256 CHAR(64) NULL,
  verified_at DATETIME(3) NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  revoked_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_eco_age_subject_event (subject_id,verified_at,id),
  CONSTRAINT fk_eco_age_subject FOREIGN KEY(subject_id)
    REFERENCES eco_subjects(id) ON DELETE RESTRICT,
  CONSTRAINT fk_eco_age_verifier FOREIGN KEY(verified_by_account_id)
    REFERENCES customer_accounts(id) ON DELETE SET NULL,
  CONSTRAINT fk_eco_age_reviewer FOREIGN KEY(reviewed_by_account_id)
    REFERENCES customer_accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Release gate: the installed migration hash, indexes/foreign keys, approved
-- jurisdiction policy, independent reviewer capability, renewal/withdrawal
-- procedure, consent revocation and child assent all require review. No
-- runtime should assume this candidate table exists before inspection.
