-- OWNER APPROVAL REQUIRED. Additive Bertina MariaDB 10.11 / MySQL 8 migration.
-- Source only: never auto-run from GitHub Actions. DDL implicitly commits.
-- A restorable production backup and table definition comparison are required.
-- Does NOT modify existing orders, payment claims, book stocks or service cases.
-- Customer chooses PHONE, VIDEO or eligible IN_PERSON before operator books.
-- In-person restricted server-side to catalogued VIP / future annual coaching
-- and exactly TEHRAN or KASHAN. Preferences are NOT confirmed appointments.
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS commerce_consultation_preferences (
  order_id CHAR(36) NOT NULL,
  sku VARCHAR(80) NOT NULL,
  delivery_mode ENUM('PHONE','VIDEO','IN_PERSON') NOT NULL,
  meeting_city ENUM('TEHRAN','KASHAN') NULL,
  selected_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (order_id,sku),
  CONSTRAINT fk_commerce_consultation_case
    FOREIGN KEY (order_id,sku) REFERENCES commerce_service_cases(order_id,sku)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT ck_commerce_consultation_city CHECK (
    (delivery_mode='IN_PERSON' AND meeting_city IS NOT NULL)
    OR (delivery_mode IN ('PHONE','VIDEO') AND meeting_city IS NULL)
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS commerce_consultation_preference_events (
  event_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  order_id CHAR(36) NOT NULL,
  sku VARCHAR(80) NOT NULL,
  actor_account_id CHAR(36) NOT NULL,
  previous_mode VARCHAR(24) NULL,
  next_mode VARCHAR(24) NOT NULL,
  previous_city VARCHAR(24) NULL,
  next_city VARCHAR(24) NULL,
  recorded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_consultation_preference_events_order (order_id,sku,recorded_at),
  CONSTRAINT fk_consultation_preference_events_case
    FOREIGN KEY (order_id,sku) REFERENCES commerce_service_cases(order_id,sku)
    ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Read-only postmigration probes:
-- SELECT delivery_mode,meeting_city FROM commerce_consultation_preferences LIMIT 0;
-- SELECT next_mode,next_city FROM commerce_consultation_preference_events LIMIT 0;
-- Old orders remain unchanged; do not auto-backfill customer preference.
