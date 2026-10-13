-- Unified Bertina | 002b service delivery, appointment, fulfilment. Depends on 001 and 002a.
-- Booking is not confirmed by a lead, contact, or gateway start. Shipping addresses require app-layer encryption.
SET NAMES utf8mb4;
SET time_zone = '+00:00';
CREATE TABLE IF NOT EXISTS eco_service_offerings (
  id CHAR(36) NOT NULL PRIMARY KEY,
  product_id CHAR(36) NOT NULL,
  service_code VARCHAR(100) NOT NULL UNIQUE,
  duration_minutes INT UNSIGNED NULL,
  delivery_mode VARCHAR(40) NOT NULL DEFAULT 'ONLINE',
  requires_human_confirmation TINYINT(1) NOT NULL DEFAULT 1,
  requires_guardian TINYINT(1) NOT NULL DEFAULT 0,
  status VARCHAR(24) NOT NULL DEFAULT 'DRAFT',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_eco_service_product (product_id),
  FOREIGN KEY (product_id) REFERENCES eco_products(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_availability_rules (
  id CHAR(36) NOT NULL PRIMARY KEY,
  service_id CHAR(36) NOT NULL,
  resource_ref VARCHAR(100) NOT NULL,
  tzid VARCHAR(64) NOT NULL,
  weekday_no TINYINT UNSIGNED NOT NULL,
  start_local TIME NOT NULL,
  end_local TIME NOT NULL,
  valid_from DATE NOT NULL,
  valid_until DATE NULL,
  state VARCHAR(24) NOT NULL DEFAULT 'ACTIVE',
  KEY idx_eco_avail_service (service_id,resource_ref,weekday_no),
  FOREIGN KEY (service_id) REFERENCES eco_service_offerings(id) ON DELETE RESTRICT,
  CONSTRAINT ck_eco_avail_day CHECK (weekday_no BETWEEN 1 AND 7),
  CONSTRAINT ck_eco_avail_time CHECK (end_local > start_local)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_availability_exceptions (
  id CHAR(36) NOT NULL PRIMARY KEY,
  resource_ref VARCHAR(100) NOT NULL,
  service_id CHAR(36) NULL,
  starts_at_utc DATETIME(3) NOT NULL,
  ends_at_utc DATETIME(3) NOT NULL,
  exception_type VARCHAR(24) NOT NULL,
  reason_code VARCHAR(64) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_eco_avail_except (resource_ref,starts_at_utc,ends_at_utc),
  FOREIGN KEY (service_id) REFERENCES eco_service_offerings(id) ON DELETE SET NULL,
  CONSTRAINT ck_eco_except_time CHECK (ends_at_utc > starts_at_utc)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_booking_slots (
  id CHAR(36) NOT NULL PRIMARY KEY,
  service_id CHAR(36) NOT NULL,
  resource_ref VARCHAR(100) NOT NULL,
  starts_at_utc DATETIME(3) NOT NULL,
  ends_at_utc DATETIME(3) NOT NULL,
  capacity SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  reserved_count SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  slot_status VARCHAR(24) NOT NULL DEFAULT 'OPEN',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_eco_resource_slot (resource_ref,starts_at_utc,ends_at_utc),
  KEY idx_eco_slot_lookup (service_id,starts_at_utc,slot_status),
  FOREIGN KEY (service_id) REFERENCES eco_service_offerings(id) ON DELETE RESTRICT,
  CONSTRAINT ck_eco_slot_time CHECK (ends_at_utc > starts_at_utc),
  CONSTRAINT ck_eco_slot_capacity CHECK (reserved_count <= capacity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_appointments (
  id CHAR(36) NOT NULL PRIMARY KEY,
  slot_id CHAR(36) NOT NULL,
  service_id CHAR(36) NOT NULL,
  customer_account_id CHAR(36) NOT NULL,
  commerce_order_id CHAR(36) NULL,
  subject_id CHAR(36) NULL,
  state VARCHAR(32) NOT NULL DEFAULT 'REQUESTED',
  confirmed_by_account_id CHAR(36) NULL,
  confirmed_at DATETIME(3) NULL,
  completed_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_eco_slot_customer (slot_id,customer_account_id),
  KEY idx_eco_appt_owner (customer_account_id,state,created_at),
  FOREIGN KEY (slot_id) REFERENCES eco_booking_slots(id) ON DELETE RESTRICT,
  FOREIGN KEY (service_id) REFERENCES eco_service_offerings(id) ON DELETE RESTRICT,
  FOREIGN KEY (customer_account_id) REFERENCES customer_accounts(id) ON DELETE RESTRICT,
  FOREIGN KEY (commerce_order_id) REFERENCES commerce_orders(id) ON DELETE SET NULL,
  FOREIGN KEY (subject_id) REFERENCES eco_subjects(id) ON DELETE SET NULL,
  FOREIGN KEY (confirmed_by_account_id) REFERENCES customer_accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_appointment_events (
  event_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  appointment_id CHAR(36) NOT NULL,
  prior_state VARCHAR(32) NULL,
  next_state VARCHAR(32) NOT NULL,
  actor_account_id CHAR(36) NULL,
  evidence_object_id CHAR(36) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_eco_appt_event (appointment_id,created_at),
  FOREIGN KEY (appointment_id) REFERENCES eco_appointments(id) ON DELETE RESTRICT,
  FOREIGN KEY (actor_account_id) REFERENCES customer_accounts(id) ON DELETE SET NULL,
  FOREIGN KEY (evidence_object_id) REFERENCES eco_object_refs(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_service_cases (
  id CHAR(36) NOT NULL PRIMARY KEY,
  customer_account_id CHAR(36) NOT NULL,
  service_id CHAR(36) NOT NULL,
  appointment_id CHAR(36) NULL,
  commerce_order_id CHAR(36) NULL,
  case_state VARCHAR(32) NOT NULL DEFAULT 'NEW',
  assigned_to_account_id CHAR(36) NULL,
  subject_id CHAR(36) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  KEY idx_eco_service_case_owner (customer_account_id,case_state),
  FOREIGN KEY (customer_account_id) REFERENCES customer_accounts(id) ON DELETE RESTRICT,
  FOREIGN KEY (service_id) REFERENCES eco_service_offerings(id) ON DELETE RESTRICT,
  FOREIGN KEY (appointment_id) REFERENCES eco_appointments(id) ON DELETE SET NULL,
  FOREIGN KEY (commerce_order_id) REFERENCES commerce_orders(id) ON DELETE SET NULL,
  FOREIGN KEY (subject_id) REFERENCES eco_subjects(id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_to_account_id) REFERENCES customer_accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_case_notes (
  id CHAR(36) NOT NULL PRIMARY KEY,
  case_id CHAR(36) NOT NULL,
  author_account_id CHAR(36) NOT NULL,
  note_object_id CHAR(36) NOT NULL,
  visibility_code VARCHAR(32) NOT NULL DEFAULT 'STAFF_ONLY',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  FOREIGN KEY (case_id) REFERENCES eco_service_cases(id) ON DELETE RESTRICT,
  FOREIGN KEY (author_account_id) REFERENCES customer_accounts(id) ON DELETE RESTRICT,
  FOREIGN KEY (note_object_id) REFERENCES eco_object_refs(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_service_deliverables (
  id CHAR(36) NOT NULL PRIMARY KEY,
  case_id CHAR(36) NOT NULL,
  deliverable_kind VARCHAR(60) NOT NULL,
  object_id CHAR(36) NULL,
  review_status VARCHAR(24) NOT NULL DEFAULT 'PENDING',
  approved_by_account_id CHAR(36) NULL,
  delivered_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  FOREIGN KEY (case_id) REFERENCES eco_service_cases(id) ON DELETE RESTRICT,
  FOREIGN KEY (object_id) REFERENCES eco_object_refs(id) ON DELETE SET NULL,
  FOREIGN KEY (approved_by_account_id) REFERENCES customer_accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_entitlements (
  id CHAR(36) NOT NULL PRIMARY KEY,
  customer_account_id CHAR(36) NOT NULL,
  product_id CHAR(36) NOT NULL,
  commerce_order_id CHAR(36) NULL,
  entitlement_status VARCHAR(24) NOT NULL DEFAULT 'PENDING',
  granted_at DATETIME(3) NULL,
  expires_at DATETIME(3) NULL,
  revoked_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_eco_entitlement_account (customer_account_id,product_id,entitlement_status),
  FOREIGN KEY (customer_account_id) REFERENCES customer_accounts(id) ON DELETE RESTRICT,
  FOREIGN KEY (product_id) REFERENCES eco_products(id) ON DELETE RESTRICT,
  FOREIGN KEY (commerce_order_id) REFERENCES commerce_orders(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_shipping_address_refs (
  id CHAR(36) NOT NULL PRIMARY KEY,
  account_id CHAR(36) NOT NULL,
  encrypted_address_object_id CHAR(36) NOT NULL,
  country_code CHAR(2) NOT NULL,
  region_code VARCHAR(40) NULL,
  postal_hint VARCHAR(20) NULL,
  address_type VARCHAR(24) NOT NULL DEFAULT 'SHIPPING',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  FOREIGN KEY (account_id) REFERENCES customer_accounts(id) ON DELETE RESTRICT,
  FOREIGN KEY (encrypted_address_object_id) REFERENCES eco_object_refs(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_shipment_records (
  id CHAR(36) NOT NULL PRIMARY KEY,
  commerce_order_id CHAR(36) NOT NULL,
  shipping_address_id CHAR(36) NOT NULL,
  carrier_code VARCHAR(60) NULL,
  tracking_reference VARCHAR(150) NULL,
  shipment_status VARCHAR(24) NOT NULL DEFAULT 'PREPARING',
  dispatched_at DATETIME(3) NULL,
  delivered_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  KEY idx_eco_shipment_order (commerce_order_id,shipment_status),
  FOREIGN KEY (commerce_order_id) REFERENCES commerce_orders(id) ON DELETE RESTRICT,
  FOREIGN KEY (shipping_address_id) REFERENCES eco_shipping_address_refs(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_shipment_events (
  id CHAR(36) NOT NULL PRIMARY KEY,
  shipment_id CHAR(36) NOT NULL,
  event_code VARCHAR(50) NOT NULL,
  occurred_at DATETIME(3) NOT NULL,
  provider_event_key VARCHAR(120) NULL,
  proof_object_id CHAR(36) NULL,
  UNIQUE KEY uq_eco_ship_event (shipment_id,event_code,occurred_at),
  FOREIGN KEY (shipment_id) REFERENCES eco_shipment_records(id) ON DELETE RESTRICT,
  FOREIGN KEY (proof_object_id) REFERENCES eco_object_refs(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_digital_deliveries (
  id CHAR(36) NOT NULL PRIMARY KEY,
  entitlement_id CHAR(36) NOT NULL,
  digital_object_id CHAR(36) NOT NULL,
  access_token_sha256 CHAR(64) NULL,
  valid_until DATETIME(3) NULL,
  download_limit INT UNSIGNED NULL,
  download_count INT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  FOREIGN KEY (entitlement_id) REFERENCES eco_entitlements(id) ON DELETE RESTRICT,
  FOREIGN KEY (digital_object_id) REFERENCES eco_object_refs(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
