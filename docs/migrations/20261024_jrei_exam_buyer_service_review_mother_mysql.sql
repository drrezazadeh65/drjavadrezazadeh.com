-- JREI owner buyer-service follow-up decisions, additive and NOT EXECUTED.
-- Same canonical Bertina mother DB: drjavad1_store.
-- This log is for human non-financial follow-up ONLY, not a refund/settlement.
CREATE TABLE IF NOT EXISTS jrei_exam_buyer_service_review_log (
  review_id CHAR(36) NOT NULL PRIMARY KEY,
  entitlement_id CHAR(36) NOT NULL,
  entitlement_revision BIGINT UNSIGNED NOT NULL,
  offering_id CHAR(36) NOT NULL,
  reason_code VARCHAR(48) NOT NULL,
  decision VARCHAR(28) NOT NULL DEFAULT 'HUMAN_FOLLOW_UP_REQUIRED',
  recorded_by_account_id CHAR(36) NULL,
  created_at BIGINT UNSIGNED NOT NULL,
  UNIQUE KEY uq_jrei_exam_buyer_followup(entitlement_id,entitlement_revision,reason_code),
  KEY idx_jrei_exam_buyer_followup_time(created_at),
  CONSTRAINT fk_jrei_exam_followup_entitlement FOREIGN KEY(entitlement_id)
    REFERENCES jrei_exam_commercial_entitlements(entitlement_id) ON DELETE RESTRICT,
  CONSTRAINT fk_jrei_exam_followup_offering FOREIGN KEY(offering_id)
    REFERENCES jrei_exam_commercial_offerings(offering_id) ON DELETE RESTRICT,
  CONSTRAINT fk_jrei_exam_followup_actor FOREIGN KEY(recorded_by_account_id)
    REFERENCES customer_accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- Never record buyer PII, payment tokens, free-text medical/identity content
-- or promises that a refund or service remedy has been made.
