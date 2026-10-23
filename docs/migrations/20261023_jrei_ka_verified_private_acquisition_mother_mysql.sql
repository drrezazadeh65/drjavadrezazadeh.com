-- JREI-KA protected, bounded autonomous acquisition -- STAGED, NOT EXECUTED.
-- Original sole mother DB: drjavad1_store. Depends on staged JREI-KA jobs
-- and jrei_exam_sources tables; no parallel account, finance or queue DB.
-- All files are inside a separately owned PRIVATE directory outside web root.
-- Retaining acquired bytes is NOT a license to publish or reuse them in exams.
CREATE TABLE IF NOT EXISTS jrei_ka_private_observations (
  observation_id CHAR(36) NOT NULL PRIMARY KEY,
  job_id CHAR(36) NOT NULL,
  source_id CHAR(36) NOT NULL,
  source_policy_revision BIGINT UNSIGNED NOT NULL,
  observed_at BIGINT UNSIGNED NOT NULL,
  content_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  private_object_key VARCHAR(85) NOT NULL,
  mime_type VARCHAR(50) NOT NULL,
  bytes_total INT UNSIGNED NOT NULL,
  state VARCHAR(35) NOT NULL DEFAULT 'PENDING_SCIENTIFIC_REVIEW',
  rights_state_at_acquisition VARCHAR(45) NOT NULL,
  source_uri_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  review_accepted_by_account_id CHAR(36) NULL,
  review_accepted_at BIGINT UNSIGNED NULL,
  UNIQUE KEY uq_jrei_ka_observation_job(job_id),
  KEY idx_jrei_ka_observation_digest(source_id,content_sha256),
  KEY idx_jrei_ka_observation_review(state,observed_at),
  CONSTRAINT fk_jrei_ka_observation_job FOREIGN KEY(job_id)
    REFERENCES jrei_ka_jobs(job_id) ON DELETE RESTRICT,
  CONSTRAINT fk_jrei_ka_observation_source FOREIGN KEY(source_id)
    REFERENCES jrei_exam_sources(source_id) ON DELETE RESTRICT,
  CONSTRAINT fk_jrei_ka_observation_reviewer FOREIGN KEY(review_accepted_by_account_id)
    REFERENCES customer_accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Count worst-case reserved BYTES before an outbound request, not after.
-- A failed/unknown request keeps its reservation to prevent infinite cost.
CREATE TABLE IF NOT EXISTS jrei_ka_daily_transfer_reservations (
  reservation_day DATE NOT NULL,
  source_id CHAR(36) NOT NULL,
  reserved_requests SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  reserved_bytes BIGINT UNSIGNED NOT NULL DEFAULT 0,
  updated_at BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY(reservation_day,source_id),
  CONSTRAINT fk_jrei_ka_daily_source FOREIGN KEY(source_id)
    REFERENCES jrei_exam_sources(source_id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- A lease and a received file NEVER automatically change source approval,
-- scientific review, question publication or any customer entitlement.
