-- Unified Bertina | 005b opt-in marketing, external-channel publication, referrals and experiments.
-- No autonomous social publishing, unsolicited contact, monetary rewards or unapproved targeting.
-- Existing social_accounts/social_deliveries keep their original source of truth until explicit bridge acceptance.
SET NAMES utf8mb4;
SET time_zone = '+00:00';
CREATE TABLE IF NOT EXISTS eco_campaigns (
  id CHAR(36) NOT NULL PRIMARY KEY,
  campaign_code VARCHAR(90) NOT NULL UNIQUE,
  campaign_kind VARCHAR(50) NOT NULL,
  state VARCHAR(24) NOT NULL DEFAULT 'DRAFT',
  starts_at DATETIME(3) NULL,
  ends_at DATETIME(3) NULL,
  created_by_account_id CHAR(36) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  FOREIGN KEY (created_by_account_id) REFERENCES customer_accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_campaign_audiences (
  id CHAR(36) NOT NULL PRIMARY KEY,
  campaign_id CHAR(36) NOT NULL,
  audience_code VARCHAR(80) NOT NULL,
  consent_purpose VARCHAR(70) NOT NULL,
  eligibility_revision VARCHAR(40) NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'UNAPPROVED',
  UNIQUE KEY uq_eco_campaign_audience (campaign_id,audience_code),
  FOREIGN KEY (campaign_id) REFERENCES eco_campaigns(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_campaign_creatives (
  id CHAR(36) NOT NULL PRIMARY KEY,
  campaign_id CHAR(36) NOT NULL,
  content_revision_id CHAR(36) NULL,
  creative_object_id CHAR(36) NULL,
  asset_id CHAR(36) NULL,
  locale CHAR(2) NOT NULL,
  version_no INT UNSIGNED NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'DRAFT',
  UNIQUE KEY uq_eco_campaign_creative (campaign_id,locale,version_no),
  FOREIGN KEY (campaign_id) REFERENCES eco_campaigns(id) ON DELETE RESTRICT,
  FOREIGN KEY (content_revision_id) REFERENCES eco_content_revisions(id) ON DELETE SET NULL,
  FOREIGN KEY (creative_object_id) REFERENCES eco_object_refs(id) ON DELETE SET NULL,
  FOREIGN KEY (asset_id) REFERENCES eco_media_assets(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_campaign_channel_variants (
  id CHAR(36) NOT NULL PRIMARY KEY,
  creative_id CHAR(36) NOT NULL,
  channel_code VARCHAR(40) NOT NULL,
  version_no INT UNSIGNED NOT NULL,
  body_object_id CHAR(36) NULL,
  utm_campaign VARCHAR(120) NULL,
  approval_state VARCHAR(24) NOT NULL DEFAULT 'PENDING',
  UNIQUE KEY uq_eco_campaign_channel (creative_id,channel_code,version_no),
  FOREIGN KEY (creative_id) REFERENCES eco_campaign_creatives(id) ON DELETE RESTRICT,
  FOREIGN KEY (body_object_id) REFERENCES eco_object_refs(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_campaign_approvals (
  id CHAR(36) NOT NULL PRIMARY KEY,
  channel_variant_id CHAR(36) NOT NULL,
  approver_account_id CHAR(36) NOT NULL,
  decision_code VARCHAR(32) NOT NULL,
  decision_at DATETIME(3) NOT NULL,
  FOREIGN KEY (channel_variant_id) REFERENCES eco_campaign_channel_variants(id) ON DELETE RESTRICT,
  FOREIGN KEY (approver_account_id) REFERENCES customer_accounts(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_campaign_publication_jobs (
  id CHAR(36) NOT NULL PRIMARY KEY,
  channel_variant_id CHAR(36) NOT NULL,
  integration_id CHAR(36) NULL,
  scheduled_at DATETIME(3) NULL,
  state VARCHAR(24) NOT NULL DEFAULT 'DRAFT',
  idempotency_key CHAR(64) NOT NULL UNIQUE,
  attempts INT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_eco_pubjob_ready (state,scheduled_at),
  FOREIGN KEY (channel_variant_id) REFERENCES eco_campaign_channel_variants(id) ON DELETE RESTRICT,
  FOREIGN KEY (integration_id) REFERENCES eco_integrations(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_campaign_publication_receipts (
  id CHAR(36) NOT NULL PRIMARY KEY,
  publication_job_id CHAR(36) NOT NULL,
  external_post_ref VARCHAR(160) NULL,
  evidence_sha256 CHAR(64) NULL,
  verification_state VARCHAR(24) NOT NULL DEFAULT 'UNVERIFIED',
  verified_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  FOREIGN KEY (publication_job_id) REFERENCES eco_campaign_publication_jobs(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_referral_programs (
  id CHAR(36) NOT NULL PRIMARY KEY,
  program_code VARCHAR(80) NOT NULL UNIQUE,
  state VARCHAR(24) NOT NULL DEFAULT 'DISABLED',
  reward_policy_version VARCHAR(50) NOT NULL,
  fraud_review_required TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_referral_codes (
  id CHAR(36) NOT NULL PRIMARY KEY,
  program_id CHAR(36) NOT NULL,
  owner_account_id CHAR(36) NOT NULL,
  code_hash CHAR(64) NOT NULL UNIQUE,
  expires_at DATETIME(3) NULL,
  state VARCHAR(24) NOT NULL DEFAULT 'PENDING',
  FOREIGN KEY (program_id) REFERENCES eco_referral_programs(id) ON DELETE RESTRICT,
  FOREIGN KEY (owner_account_id) REFERENCES customer_accounts(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_referral_events (
  id CHAR(36) NOT NULL PRIMARY KEY,
  referral_code_id CHAR(36) NOT NULL,
  event_kind VARCHAR(50) NOT NULL,
  referred_account_id CHAR(36) NULL,
  fraud_state VARCHAR(24) NOT NULL DEFAULT 'UNREVIEWED',
  evidence_sha256 CHAR(64) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  FOREIGN KEY (referral_code_id) REFERENCES eco_referral_codes(id) ON DELETE RESTRICT,
  FOREIGN KEY (referred_account_id) REFERENCES customer_accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_experiments (
  id CHAR(36) NOT NULL PRIMARY KEY,
  experiment_code VARCHAR(90) NOT NULL UNIQUE,
  hypothesis_object_id CHAR(36) NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'DRAFT',
  consent_purpose VARCHAR(70) NULL,
  started_at DATETIME(3) NULL,
  completed_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  FOREIGN KEY (hypothesis_object_id) REFERENCES eco_object_refs(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_experiment_exposures (
  id CHAR(36) NOT NULL PRIMARY KEY,
  experiment_id CHAR(36) NOT NULL,
  anonymous_subject_hash CHAR(64) NOT NULL,
  variant_code VARCHAR(50) NOT NULL,
  consent_evidence_hash CHAR(64) NULL,
  exposed_at DATETIME(3) NOT NULL,
  UNIQUE KEY uq_eco_exposure (experiment_id,anonymous_subject_hash),
  FOREIGN KEY (experiment_id) REFERENCES eco_experiments(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
