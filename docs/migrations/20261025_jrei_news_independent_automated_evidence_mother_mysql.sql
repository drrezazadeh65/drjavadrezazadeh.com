-- JREI verified official news: no per-article human review after standing authorization.
-- Additive upgrade of ORIGINAL mother database. Apply once after backup and
-- prior jrei_news_intelligence migration, BEFORE enabling automated evidence QA.
-- Existing human reviewer rows and their foreign key remain unchanged.
SET NAMES utf8mb4;
ALTER TABLE jrei_news_evidence_reviews
    MODIFY COLUMN reviewer_account_id CHAR(36) NULL,
    ADD COLUMN independent_service_id VARCHAR(100) NULL,
    ADD COLUMN independent_evidence_sha256 CHAR(64)
        CHARACTER SET ascii COLLATE ascii_bin NULL,
    ADD COLUMN independent_audit_reference VARCHAR(180) NULL,
    ADD CONSTRAINT ck_jrei_news_evidence_reviewer_xor CHECK (
       (reviewer_account_id IS NOT NULL AND independent_service_id IS NULL)
       OR
       (reviewer_account_id IS NULL AND independent_service_id IS NOT NULL
        AND independent_evidence_sha256 IS NOT NULL
        AND independent_audit_reference IS NOT NULL)
    ),
    ADD KEY idx_jrei_news_evidence_independent_service(independent_service_id,reviewed_at);
-- This migration NEVER marks a feed, article, licence or evidence APPROVED.
