-- JHELA founding-issue first-party author intake, scholarly profiles and reviewer interest.
-- DO NOT apply without a database backup and private storage/AV/TLS preflight.
-- This is the pre-OJS submission queue; real editorial decisions stay in native OJS.
SET NAMES utf8mb4;
CREATE TABLE IF NOT EXISTS jhela_author_profiles(
 account_id CHAR(36) NOT NULL PRIMARY KEY,
 public_name VARCHAR(160) NOT NULL,
 affiliation VARCHAR(220) NOT NULL,
 country VARCHAR(100) NOT NULL,
 orcid VARCHAR(40) NULL,
 research_interests VARCHAR(1200) NULL,
 updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
 FOREIGN KEY(account_id) REFERENCES customer_accounts(id) ON DELETE CASCADE
)ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS jhela_intake_manuscripts(
 id CHAR(36) NOT NULL PRIMARY KEY,
 account_id CHAR(36) NOT NULL,
 tracking_code VARCHAR(40) NOT NULL UNIQUE,
 title VARCHAR(320) NOT NULL,
 article_type VARCHAR(36) NOT NULL,
 abstract_text TEXT NOT NULL,
 keywords_text VARCHAR(500) NOT NULL,
 declarations TEXT NOT NULL,
 originality_confirmed TINYINT(1) NOT NULL DEFAULT 0,
 status VARCHAR(32) NOT NULL DEFAULT 'AWAITING_FILE',
 original_filename VARCHAR(180) NULL,
 private_file_rel VARCHAR(160) NULL,
 manuscript_sha256 CHAR(64) NULL,
 file_bytes BIGINT UNSIGNED NULL,
 uploaded_at DATETIME(3) NULL,
 ojs_external_id VARCHAR(100) NULL,
 created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
 KEY idx_jhela_author_status(account_id,status,created_at),
 FOREIGN KEY(account_id) REFERENCES customer_accounts(id) ON DELETE RESTRICT
)ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS jhela_intake_events(
 id CHAR(36) NOT NULL PRIMARY KEY,
 manuscript_id CHAR(36) NOT NULL,
 event_kind VARCHAR(40) NOT NULL,
 public_message VARCHAR(600) NOT NULL,
 created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 KEY idx_jhela_manuscript_history(manuscript_id,created_at),
 FOREIGN KEY(manuscript_id) REFERENCES jhela_intake_manuscripts(id) ON DELETE CASCADE
)ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS jhela_reviewer_candidates(
 id CHAR(36) NOT NULL PRIMARY KEY,
 account_id CHAR(36) NOT NULL UNIQUE,
 academic_name VARCHAR(160) NOT NULL,
 academic_rank VARCHAR(100) NOT NULL,
 institution VARCHAR(220) NOT NULL,
 country VARCHAR(100) NOT NULL,
 orcid VARCHAR(40) NULL,
 institutional_page VARCHAR(360) NULL,
 expertise VARCHAR(1000) NOT NULL,
 methods VARCHAR(800) NOT NULL,
 cv_summary TEXT NOT NULL,
 publications TEXT NOT NULL,
 profile_public_consent TINYINT(1) NOT NULL DEFAULT 0,
 privacy_consent TINYINT(1) NOT NULL DEFAULT 0,
 status VARCHAR(24) NOT NULL DEFAULT 'PENDING',
 approved_by CHAR(36) NULL,
 approved_at DATETIME(3) NULL,
 updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
 created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 KEY idx_jhela_reviewer_visibility(status,profile_public_consent),
 FOREIGN KEY(account_id) REFERENCES customer_accounts(id) ON DELETE CASCADE
)ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS jhela_finance_records(
 id CHAR(36) NOT NULL PRIMARY KEY,
 manuscript_id CHAR(36) NOT NULL,
 invoice_ref VARCHAR(80) NULL UNIQUE,
 state VARCHAR(30) NOT NULL DEFAULT 'NOT_ASSESSED',
 amount_chf DECIMAL(10,2) NULL,
 waiver_percent TINYINT UNSIGNED NULL,
 verified_at DATETIME(3) NULL,
 created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 KEY idx_jhela_finance(manuscript_id,created_at),
 FOREIGN KEY(manuscript_id) REFERENCES jhela_intake_manuscripts(id) ON DELETE RESTRICT
)ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
