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

-- ADDITIONAL CANDIDATE: separate learner assent, never implied by guardian
-- permission. No user essay, child response, uploaded media or DOB is stored.
-- A secure approved workflow must attest comprehension and voluntary choice.
-- Capacity exceptions / withdrawal authority require human/ethics review.
CREATE TABLE IF NOT EXISTS eco_minor_assent_records (
  id CHAR(36) NOT NULL PRIMARY KEY,
  subject_id CHAR(36) NOT NULL,
  guardian_account_id CHAR(36) NOT NULL,
  notice_version VARCHAR(32) NOT NULL,
  notice_sha256 CHAR(64) NOT NULL,
  decision VARCHAR(24) NOT NULL,
  verification_status VARCHAR(24) NOT NULL DEFAULT 'PENDING',
  source_code VARCHAR(40) NOT NULL,
  reviewer_account_id CHAR(36) NULL,
  assented_at DATETIME(3) NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  withdrawn_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_eco_minor_assent_subject (subject_id,guardian_account_id,assented_at),
  CONSTRAINT fk_eco_assent_subject FOREIGN KEY(subject_id)
    REFERENCES eco_subjects(id) ON DELETE RESTRICT,
  CONSTRAINT fk_eco_assent_guardian FOREIGN KEY(guardian_account_id)
    REFERENCES customer_accounts(id) ON DELETE RESTRICT,
  CONSTRAINT fk_eco_assent_reviewer FOREIGN KEY(reviewer_account_id)
    REFERENCES customer_accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Release gate: the installed migration hash, indexes/foreign keys, approved
-- jurisdiction policy, independent reviewer capability, renewal/withdrawal
-- procedure, consent revocation and child assent all require review. No
-- runtime should assume this candidate table exists before inspection.
