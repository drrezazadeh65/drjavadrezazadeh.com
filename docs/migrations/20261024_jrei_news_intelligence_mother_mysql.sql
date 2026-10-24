-- JREI Education News source-only schema; DO NOT APPLY in development.
-- Single Bertina mother DB drjavad1_store. Stage for final owner-authorized
-- schema reconciliation, migration, backup/restore and integrated acceptance.
-- All source rights, user identity, opt-in email, AI, commerce and distribution
-- remain in the existing central JREI/customer_accounts/eco/social systems.
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS jrei_news_monitors (
  monitor_id CHAR(36) PRIMARY KEY,
  jrei_source_reference VARCHAR(100) NOT NULL,
  source_url_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  category_code VARCHAR(48) NOT NULL,
  priority_code VARCHAR(2) NOT NULL DEFAULT 'P2',
  interval_minutes SMALLINT UNSIGNED NOT NULL DEFAULT 60,
  policy_revision BIGINT UNSIGNED NOT NULL,
  enabled TINYINT(1) NOT NULL DEFAULT 0,
  last_success_at BIGINT UNSIGNED NULL,
  backoff_until BIGINT UNSIGNED NULL,
  created_at BIGINT UNSIGNED NOT NULL,
  UNIQUE KEY uq_jrei_news_monitor(jrei_source_reference,source_url_sha256),
  KEY idx_jrei_news_monitor_schedule(enabled,priority_code,last_success_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS jrei_news_candidates (
  candidate_id CHAR(36) PRIMARY KEY,
  monitor_id CHAR(36) NOT NULL,
  fingerprint_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  source_url VARCHAR(1000) NOT NULL,
  content_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  headline VARCHAR(240) NOT NULL,
  event_type VARCHAR(64) NOT NULL,
  priority_code VARCHAR(2) NOT NULL,
  source_published_at BIGINT UNSIGNED NULL,
  first_observed_at BIGINT UNSIGNED NOT NULL,
  state VARCHAR(56) NOT NULL DEFAULT 'PENDING_EVIDENCE_VERIFICATION',
  UNIQUE KEY uq_jrei_news_candidate(fingerprint_sha256),
  KEY idx_jrei_news_candidate_review(state,priority_code,first_observed_at),
  CONSTRAINT fk_jrei_news_candidate_monitor FOREIGN KEY(monitor_id)
    REFERENCES jrei_news_monitors(monitor_id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS jrei_news_evidence_reviews (
  review_id CHAR(36) PRIMARY KEY,
  candidate_id CHAR(36) NOT NULL,
  reviewer_account_id CHAR(36) NOT NULL,
  content_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  verification_state VARCHAR(48) NOT NULL DEFAULT 'PENDING',
  issuer_verified TINYINT(1) NOT NULL DEFAULT 0,
  usage_rights_verified TINYINT(1) NOT NULL DEFAULT 0,
  reviewed_at BIGINT UNSIGNED NOT NULL,
  evidence_private_reference VARCHAR(180) NULL,
  KEY idx_jrei_news_evidence(candidate_id,reviewed_at),
  CONSTRAINT fk_jrei_news_evidence_candidate FOREIGN KEY(candidate_id)
    REFERENCES jrei_news_candidates(candidate_id) ON DELETE RESTRICT,
  CONSTRAINT fk_jrei_news_evidence_reviewer FOREIGN KEY(reviewer_account_id)
    REFERENCES customer_accounts(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS jrei_news_editorial_versions (
  revision_id CHAR(36) PRIMARY KEY,
  candidate_id CHAR(36) NOT NULL,
  evidence_review_id CHAR(36) NOT NULL,
  revision_number INT UNSIGNED NOT NULL,
  bilingual_editorial_json LONGTEXT NOT NULL,
  approved_image_ref VARCHAR(500) NULL,
  approval_digest CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  editorial_state VARCHAR(48) NOT NULL DEFAULT 'PENDING_OWNER_APPROVAL',
  created_at BIGINT UNSIGNED NOT NULL,
  UNIQUE KEY uq_jrei_news_revision(candidate_id,revision_number),
  UNIQUE KEY uq_jrei_news_revision_digest(approval_digest),
  KEY idx_jrei_news_editorial_queue(editorial_state,created_at),
  CONSTRAINT fk_jrei_news_rev_candidate FOREIGN KEY(candidate_id)
    REFERENCES jrei_news_candidates(candidate_id) ON DELETE RESTRICT,
  CONSTRAINT fk_jrei_news_rev_review FOREIGN KEY(evidence_review_id)
    REFERENCES jrei_news_evidence_reviews(review_id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS jrei_news_owner_decisions (
  decision_id CHAR(36) PRIMARY KEY,
  revision_id CHAR(36) NOT NULL,
  owner_account_id CHAR(36) NOT NULL,
  approval_digest CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  action_code VARCHAR(28) NOT NULL,
  owner_mfa_audit_ref VARCHAR(100) NOT NULL,
  decided_at BIGINT UNSIGNED NOT NULL,
  UNIQUE KEY uq_jrei_news_owner_decision(revision_id,owner_account_id,action_code,approval_digest),
  CONSTRAINT fk_jrei_news_decision_revision FOREIGN KEY(revision_id)
    REFERENCES jrei_news_editorial_versions(revision_id) ON DELETE RESTRICT,
  CONSTRAINT fk_jrei_news_decision_owner FOREIGN KEY(owner_account_id)
    REFERENCES customer_accounts(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS jrei_news_publications (
  publication_id CHAR(36) PRIMARY KEY,
  revision_id CHAR(36) NOT NULL,
  approved_decision_id CHAR(36) NOT NULL,
  fa_route VARCHAR(260) NOT NULL,
  en_route VARCHAR(260) NOT NULL,
  fa_content_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  en_content_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  publisher_state VARCHAR(48) NOT NULL DEFAULT 'WAITING_FOR_PUBLISHER',
  publisher_receipt_reference VARCHAR(200) NULL,
  published_at BIGINT UNSIGNED NULL,
  UNIQUE KEY uq_jrei_news_pub_revision(revision_id),
  UNIQUE KEY uq_jrei_news_pub_fa(fa_route),
  UNIQUE KEY uq_jrei_news_pub_en(en_route),
  KEY idx_jrei_news_pub_state(publisher_state,published_at),
  CONSTRAINT fk_jrei_news_pub_revision FOREIGN KEY(revision_id)
    REFERENCES jrei_news_editorial_versions(revision_id) ON DELETE RESTRICT,
  CONSTRAINT fk_jrei_news_pub_decision FOREIGN KEY(approved_decision_id)
    REFERENCES jrei_news_owner_decisions(decision_id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS jrei_news_exam_milestones (
  milestone_id CHAR(36) PRIMARY KEY,
  external_exam_key VARCHAR(100) NOT NULL,
  milestone_type VARCHAR(48) NOT NULL,
  title_fa VARCHAR(220) NOT NULL,
  title_en VARCHAR(220) NOT NULL,
  event_utc BIGINT UNSIGNED NOT NULL,
  timezone_name VARCHAR(60) NOT NULL,
  source_ref VARCHAR(100) NOT NULL,
  source_evidence_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  version_number INT UNSIGNED NOT NULL,
  previous_milestone_id CHAR(36) NULL,
  review_state VARCHAR(40) NOT NULL DEFAULT 'PENDING_OFFICIAL_REVIEW',
  owner_approved TINYINT(1) NOT NULL DEFAULT 0,
  created_at BIGINT UNSIGNED NOT NULL,
  UNIQUE KEY uq_jrei_news_exam_version(external_exam_key,milestone_type,version_number),
  KEY idx_jrei_news_exam_due(review_state,event_utc),
  CONSTRAINT fk_jrei_news_exam_prior FOREIGN KEY(previous_milestone_id)
    REFERENCES jrei_news_exam_milestones(milestone_id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Follows only. Consent and deliveries use EXISTING eco_notification_*
-- preferences, consent and transactional outbox; never a second mail service.
CREATE TABLE IF NOT EXISTS jrei_news_exam_follows (
  follow_id CHAR(36) PRIMARY KEY,
  account_id CHAR(36) NOT NULL,
  milestone_id CHAR(36) NOT NULL,
  days_before SMALLINT UNSIGNED NOT NULL,
  channel_code VARCHAR(24) NOT NULL,
  consent_reference VARCHAR(100) NOT NULL,
  follow_state VARCHAR(24) NOT NULL DEFAULT 'ACTIVE',
  created_at BIGINT UNSIGNED NOT NULL,
  UNIQUE KEY uq_jrei_news_follow(account_id,milestone_id,days_before,channel_code),
  CONSTRAINT fk_jrei_news_follow_user FOREIGN KEY(account_id)
    REFERENCES customer_accounts(id) ON DELETE CASCADE,
  CONSTRAINT fk_jrei_news_follow_exam FOREIGN KEY(milestone_id)
    REFERENCES jrei_news_exam_milestones(milestone_id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS jrei_news_delivery_receipts (
  delivery_id CHAR(36) PRIMARY KEY,
  publication_id CHAR(36) NOT NULL,
  provider_code VARCHAR(40) NOT NULL,
  provider_account_reference VARCHAR(100) NOT NULL,
  idempotency_key CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  state VARCHAR(30) NOT NULL DEFAULT 'QUEUED',
  provider_receipt_reference VARCHAR(200) NULL,
  attempts SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  created_at BIGINT UNSIGNED NOT NULL,
  UNIQUE KEY uq_jrei_news_delivery_idempotency(idempotency_key),
  CONSTRAINT fk_jrei_news_delivery_pub FOREIGN KEY(publication_id)
    REFERENCES jrei_news_publications(publication_id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Publication, reminder, source acquisition and external sending all
-- remain disabled unless individually owner-authorized after final tests.
