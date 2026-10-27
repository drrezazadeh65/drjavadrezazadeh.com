-- JREI metacognitive provenance ledger: ADDITIVE SOURCE ONLY.
-- Never apply without owner-authorised mother-DB backup/restore and clone QA.
-- No parallel AI database, no training text, learner identities or tool output.
-- An immutable result is a PROPOSAL receipt, not scientific acceptance.
CREATE TABLE IF NOT EXISTS jrei_metacognitive_owner_cycles (
    cycle_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    owner_account_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    request_key CHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    policy_version VARCHAR(80) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    input_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    outcome_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    outcome_json JSON NOT NULL,
    lifecycle VARCHAR(24) NOT NULL DEFAULT 'PROPOSAL_ONLY',
    recorded_at BIGINT UNSIGNED NOT NULL,
    PRIMARY KEY (cycle_id),
    UNIQUE KEY uq_metacognitive_owner_request (owner_account_id, request_key),
    KEY idx_metacognitive_owner_recorded (owner_account_id, recorded_at),
    KEY idx_metacognitive_policy (policy_version, recorded_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- Only original SUPER_ADMIN current MFA may submit. Does not authorize work.
-- JR_JREI_METACOGNITIVE_OWNER_JOURNAL_ENABLED remains OFF by default.
