-- Bilingual JREI News DIGESTS inside the ORIGINAL eco notification outbox.
-- These are PRIVATE per-subscriber message packages, NOT a second mailer,
-- user database or email list. Apply only after native eco/News migrations,
-- successful original backup/restore and final source acceptance.
SET NAMES utf8mb4;
CREATE TABLE IF NOT EXISTS jrei_news_eco_digest_packages (
 package_id CHAR(36) PRIMARY KEY,
 recipient_account_id CHAR(36) NOT NULL,
 consent_record_id CHAR(36) NOT NULL,
 eco_object_ref_id CHAR(36) NOT NULL,
 locale_code CHAR(2) NOT NULL,
 digest_mode VARCHAR(12) NOT NULL,
 digest_idempotency_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 payload_json LONGTEXT NOT NULL,
 payload_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 item_count SMALLINT UNSIGNED NOT NULL,
 created_at BIGINT UNSIGNED NOT NULL,
 UNIQUE KEY uq_jrei_news_eco_digest_key(digest_idempotency_sha256),
 UNIQUE KEY uq_jrei_news_eco_digest_object(eco_object_ref_id),
 KEY idx_jrei_news_eco_digest_recipient(recipient_account_id,created_at),
 CONSTRAINT fk_jrei_news_eco_digest_recipient FOREIGN KEY(recipient_account_id)
    REFERENCES customer_accounts(id) ON DELETE RESTRICT,
 CONSTRAINT fk_jrei_news_eco_digest_consent FOREIGN KEY(consent_record_id)
    REFERENCES eco_consent_records(id) ON DELETE RESTRICT,
 CONSTRAINT fk_jrei_news_eco_digest_object FOREIGN KEY(eco_object_ref_id)
    REFERENCES eco_object_refs(id) ON DELETE RESTRICT,
 CONSTRAINT ck_jrei_news_eco_digest_mode CHECK(digest_mode IN
    ('URGENT','DAILY','WEEKLY','EXAM_ONLY')),
 CONSTRAINT ck_jrei_news_eco_digest_lang CHECK(locale_code IN ('fa','en')),
 CONSTRAINT ck_jrei_news_eco_digest_items CHECK(item_count BETWEEN 1 AND 20)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
