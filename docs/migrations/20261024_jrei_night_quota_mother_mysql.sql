-- JREI-KA nightly transfer accounting, source-only, not executed.
-- Reuses the existing single Bertina mother database.
CREATE TABLE IF NOT EXISTS jrei_ka_nightly_transfer_quota (
 iran_date DATE NOT NULL PRIMARY KEY,
 reserved_bytes BIGINT UNSIGNED NOT NULL DEFAULT 0,
 reserved_requests INT UNSIGNED NOT NULL DEFAULT 0,
 updated_at BIGINT UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- A failed or unconfirmed download retains its budget reservation.
