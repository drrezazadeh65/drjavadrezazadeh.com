-- Student Support Programme (2026): OPTIONAL isolated upgrade, not automatically applied to Bertina.
-- Requires explicit operator approval, legal/safeguarding review, and a backup before migration.
-- Private profiles are pseudonymous. No student's address, phone, school or photo is kept here.
-- All consent-dependent views must remain inaccessible unless this schema is installed and verified.
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS student_support_cases (
  id CHAR(36) PRIMARY KEY,
  public_code VARCHAR(20) NOT NULL UNIQUE,
  pseudonym VARCHAR(80) NOT NULL,
  guardian_account_id CHAR(36) NOT NULL,
  student_account_id CHAR(36) NULL,
  school_stage ENUM('primary','middle','secondary','vocational','other') NOT NULL DEFAULT 'other',
  state ENUM('draft','review','verified','paused','closed') NOT NULL DEFAULT 'draft',
  eligible_at DATETIME NULL,
  staff_verified_by CHAR(36) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_support_guardian (guardian_account_id,state),
  INDEX idx_support_student (student_account_id,state)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS student_support_needs (
  id CHAR(36) PRIMARY KEY,
  case_id CHAR(36) NOT NULL,
  category ENUM('scholarship','books','services','essentials') NOT NULL,
  safe_summary VARCHAR(320) NOT NULL,
  amount_toman BIGINT UNSIGNED NOT NULL,
  status ENUM('proposed','under_review','approved','allocated','fulfilled','rejected','withdrawn') NOT NULL DEFAULT 'proposed',
  visible_to_sponsor TINYINT(1) NOT NULL DEFAULT 0,
  verified_by CHAR(36) NULL,
  verified_at DATETIME NULL,
  created_by_account_id CHAR(36) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_support_needs_case (case_id,status),
  CONSTRAINT fk_support_needs_case FOREIGN KEY (case_id) REFERENCES student_support_cases(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS student_support_sponsorships (
  id CHAR(36) PRIMARY KEY,
  case_id CHAR(36) NOT NULL,
  sponsor_account_id CHAR(36) NOT NULL,
  state ENUM('requested','approved','revoked','expired') NOT NULL DEFAULT 'requested',
  guardian_consent_at DATETIME NULL,
  student_assent_at DATETIME NULL,
  sponsor_consent_at DATETIME NULL,
  staff_approved_at DATETIME NULL,
  sponsor_identity_visible TINYINT(1) NOT NULL DEFAULT 0,
  student_identity_visible TINYINT(1) NOT NULL DEFAULT 0,
  approved_sponsor_display_name VARCHAR(100) NULL,
  approved_student_display_name VARCHAR(100) NULL,
  expires_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_support_case_sponsor (case_id,sponsor_account_id),
  INDEX idx_support_sponsor (sponsor_account_id,state),
  CONSTRAINT fk_support_link_case FOREIGN KEY (case_id) REFERENCES student_support_cases(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS student_support_progress (
  id CHAR(36) PRIMARY KEY,
  case_id CHAR(36) NOT NULL,
  safe_summary VARCHAR(400) NOT NULL,
  milestone_kind ENUM('education','needs','allocation','delivery','review') NOT NULL,
  approved_by CHAR(36) NULL,
  visible_to_sponsor TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_support_progress_case (case_id,created_at),
  CONSTRAINT fk_support_progress_case FOREIGN KEY (case_id) REFERENCES student_support_cases(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS student_support_allocations (
  id CHAR(36) PRIMARY KEY,
  order_id CHAR(36) NOT NULL,
  need_id CHAR(36) NOT NULL,
  amount_toman BIGINT UNSIGNED NOT NULL,
  state ENUM('proposed','approved','disbursed','reversed') NOT NULL DEFAULT 'proposed',
  approved_by CHAR(36) NULL,
  evidence_reference VARCHAR(160) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_support_alloc_order (order_id,state),
  INDEX idx_support_alloc_need (need_id,state),
  CONSTRAINT fk_support_alloc_order FOREIGN KEY (order_id) REFERENCES commerce_orders(id),
  CONSTRAINT fk_support_alloc_need FOREIGN KEY (need_id) REFERENCES student_support_needs(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS student_support_audit (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  actor_account_id CHAR(36) NULL,
  event_code VARCHAR(70) NOT NULL,
  object_id CHAR(36) NOT NULL,
  event_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_support_audit_object (object_id,event_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Mandatory governance before enabling real cases:
-- 1. Verified eligibility, identity/guardian relationship & age-appropriate student assent.
-- 2. No automatic sponsor/staff access; approved + all three consent timestamps + unexpired grant.
-- 3. No contacts, school address or other identifying details in safe_summary.
-- 4. Fund disbursement must check paid gateway evidence, category, available/unallocated balance,
--    approved need, second-person approval, expense receipt and refund/reversal process.
-- 5. Separate legal/accounting review of receiving earmarked contributions through the merchant account.
