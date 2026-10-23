-- JREI commercial examination centre — ADDITIVE, STAGED, NOT EXECUTED
-- Bertina/MariaDB mother DB: drjavad1_store. Depends on original identity,
-- commerce_orders and database/unified/003c_assessment_scoring.sql, plus
-- 20261023_jrei_exams_testly_research_mother_mysql.sql.
--
-- Assessment items, candidate responses, instrument versions and score runs
-- remain in existing eco_assessment_* / eco_score_* tables. There is no new
-- payment provider, identity table, answer bank or parallel scoring engine.
-- Import only following backup, live column/engine/FK review, and owner signoff.

CREATE TABLE IF NOT EXISTS jrei_exam_commercial_products (
  product_id CHAR(36) NOT NULL PRIMARY KEY,
  product_code VARCHAR(70) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  division VARCHAR(28) NOT NULL, -- KONKUR | MASTERS | DOCTORAL | SCHOOL
  title_fa VARCHAR(180) NOT NULL,
  title_en VARCHAR(180) NULL,
  summary_fa VARCHAR(800) NULL,
  blueprint_id CHAR(36) NOT NULL,
  instrument_version_id CHAR(36) NOT NULL,
  scoring_model_id CHAR(36) NULL,
  product_state VARCHAR(24) NOT NULL DEFAULT 'DRAFT',
  content_rights_state VARCHAR(32) NOT NULL DEFAULT 'NOT_REVIEWED',
  question_key_review_state VARCHAR(32) NOT NULL DEFAULT 'NOT_REVIEWED',
  delivery_review_state VARCHAR(32) NOT NULL DEFAULT 'NOT_REVIEWED',
  published_at BIGINT UNSIGNED NULL,
  revision BIGINT UNSIGNED NOT NULL DEFAULT 1,
  created_at BIGINT UNSIGNED NOT NULL,
  updated_at BIGINT UNSIGNED NOT NULL,
  approved_by_account_id CHAR(36) NULL,
  UNIQUE KEY uq_jrei_commercial_code(product_code),
  KEY idx_jrei_commercial_state(division,product_state,updated_at),
  CONSTRAINT fk_jrei_commercial_blueprint FOREIGN KEY(blueprint_id)
    REFERENCES jrei_exam_blueprints(blueprint_id) ON DELETE RESTRICT,
  CONSTRAINT fk_jrei_commercial_instrument FOREIGN KEY(instrument_version_id)
    REFERENCES eco_instrument_versions(id) ON DELETE RESTRICT,
  CONSTRAINT fk_jrei_commercial_scoring FOREIGN KEY(scoring_model_id)
    REFERENCES eco_scoring_models(id) ON DELETE RESTRICT,
  CONSTRAINT fk_jrei_commercial_reviewer FOREIGN KEY(approved_by_account_id)
    REFERENCES customer_accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Timed offering is a publication snapshot; no live candidate uses the
-- Windows workers for clocks, question text or score authority.
CREATE TABLE IF NOT EXISTS jrei_exam_commercial_offerings (
  offering_id CHAR(36) NOT NULL PRIMARY KEY,
  product_id CHAR(36) NOT NULL,
  stage_code VARCHAR(20) NULL, -- DIAGNOSTIC / PROGRESS / FINAL_MOCK
  opens_at BIGINT UNSIGNED NOT NULL,
  closes_at BIGINT UNSIGNED NOT NULL,
  registration_closes_at BIGINT UNSIGNED NOT NULL,
  duration_seconds INT UNSIGNED NOT NULL,
  max_attempts SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  registered_capacity INT UNSIGNED NULL,
  offering_state VARCHAR(24) NOT NULL DEFAULT 'DRAFT',
  revision BIGINT UNSIGNED NOT NULL DEFAULT 1,
  created_at BIGINT UNSIGNED NOT NULL,
  updated_at BIGINT UNSIGNED NOT NULL,
  UNIQUE KEY uq_jrei_commercial_stage(product_id,stage_code,opens_at),
  KEY idx_jrei_commercial_availability(offering_state,opens_at,closes_at),
  CONSTRAINT fk_jrei_commercial_offering_product FOREIGN KEY(product_id)
    REFERENCES jrei_exam_commercial_products(product_id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Access is ONLY a materialized server-verified entitlement, NEVER granted
-- by a browser redirect, a self-reported invoice or a pending order row.
-- The original verified commerce_payment_claims remains authoritative.
CREATE TABLE IF NOT EXISTS jrei_exam_commercial_entitlements (
  entitlement_id CHAR(36) NOT NULL PRIMARY KEY,
  offering_id CHAR(36) NOT NULL,
  account_id CHAR(36) NOT NULL,
  verified_order_id CHAR(36) NULL,
  granted_by_account_id CHAR(36) NULL,
  grant_reason VARCHAR(32) NOT NULL,
  state VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  begins_at BIGINT UNSIGNED NOT NULL,
  expires_at BIGINT UNSIGNED NOT NULL,
  created_at BIGINT UNSIGNED NOT NULL,
  revoked_at BIGINT UNSIGNED NULL,
  revision BIGINT UNSIGNED NOT NULL DEFAULT 1,
  UNIQUE KEY uq_jrei_exam_grant_offering_account_order(offering_id,account_id,verified_order_id),
  KEY idx_jrei_exam_access(account_id,offering_id,state,expires_at),
  CONSTRAINT fk_jrei_exam_access_offering FOREIGN KEY(offering_id)
    REFERENCES jrei_exam_commercial_offerings(offering_id) ON DELETE RESTRICT,
  CONSTRAINT fk_jrei_exam_access_account FOREIGN KEY(account_id)
    REFERENCES customer_accounts(id) ON DELETE RESTRICT,
  CONSTRAINT fk_jrei_exam_access_order FOREIGN KEY(verified_order_id)
    REFERENCES commerce_orders(id) ON DELETE RESTRICT,
  CONSTRAINT fk_jrei_exam_access_admin FOREIGN KEY(granted_by_account_id)
    REFERENCES customer_accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Existing eco_assessment_sessions + eco_assessment_responses own the answer
-- data. This table links a paid attempt to ONE immutable assessment version
-- and holds only the authoritative monotonic time/status envelope.
CREATE TABLE IF NOT EXISTS jrei_exam_commercial_attempts (
  attempt_id CHAR(36) NOT NULL PRIMARY KEY,
  offering_id CHAR(36) NOT NULL,
  entitlement_id CHAR(36) NOT NULL,
  account_id CHAR(36) NOT NULL,
  assessment_session_id CHAR(36) NOT NULL,
  attempt_number SMALLINT UNSIGNED NOT NULL,
  attempt_state VARCHAR(24) NOT NULL DEFAULT 'CREATED',
  starts_at BIGINT UNSIGNED NULL,
  deadline_at BIGINT UNSIGNED NULL,
  submitted_at BIGINT UNSIGNED NULL,
  submission_digest CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  revision BIGINT UNSIGNED NOT NULL DEFAULT 1,
  created_at BIGINT UNSIGNED NOT NULL,
  updated_at BIGINT UNSIGNED NOT NULL,
  UNIQUE KEY uq_jrei_exam_attempt_number(offering_id,account_id,attempt_number),
  UNIQUE KEY uq_jrei_exam_assessment_session(assessment_session_id),
  KEY idx_jrei_exam_attempt_owner(account_id,attempt_state,updated_at),
  CONSTRAINT fk_jrei_exam_attempt_offering FOREIGN KEY(offering_id)
    REFERENCES jrei_exam_commercial_offerings(offering_id) ON DELETE RESTRICT,
  CONSTRAINT fk_jrei_exam_attempt_entitlement FOREIGN KEY(entitlement_id)
    REFERENCES jrei_exam_commercial_entitlements(entitlement_id) ON DELETE RESTRICT,
  CONSTRAINT fk_jrei_exam_attempt_account FOREIGN KEY(account_id)
    REFERENCES customer_accounts(id) ON DELETE RESTRICT,
  CONSTRAINT fk_jrei_exam_attempt_session FOREIGN KEY(assessment_session_id)
    REFERENCES eco_assessment_sessions(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- NEVER seed paid products, attempts, entitlements or synthetic transactions.
-- Existing server-side commerce verification and controlled science signoffs
-- must be integrated and accepted before any product becomes purchasable.
