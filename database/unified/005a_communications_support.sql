-- Unified Bertina | 005a consent-based communications, inbox and support.
-- Never store plaintext email tokens, SMTP secrets or confidential messages in these tables.
SET NAMES utf8mb4;
SET time_zone = '+00:00';
CREATE TABLE IF NOT EXISTS eco_contact_points (
  id CHAR(36) NOT NULL PRIMARY KEY,
  account_id CHAR(36) NOT NULL,
  contact_kind VARCHAR(30) NOT NULL,
  contact_hash CHAR(64) NOT NULL,
  private_object_id CHAR(36) NULL,
  verified_at DATETIME(3) NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'UNVERIFIED',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_eco_contact_kind (account_id,contact_kind,contact_hash),
  FOREIGN KEY (account_id) REFERENCES customer_accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (private_object_id) REFERENCES eco_object_refs(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_notification_templates (
  id CHAR(36) NOT NULL PRIMARY KEY,
  template_code VARCHAR(90) NOT NULL UNIQUE,
  channel_code VARCHAR(40) NOT NULL,
  purpose_code VARCHAR(70) NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'DRAFT',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_notification_template_versions (
  id CHAR(36) NOT NULL PRIMARY KEY,
  template_id CHAR(36) NOT NULL,
  version_no INT UNSIGNED NOT NULL,
  locale CHAR(2) NOT NULL,
  body_object_id CHAR(36) NOT NULL,
  approved_by_account_id CHAR(36) NULL,
  UNIQUE KEY uq_eco_notify_ver (template_id,version_no,locale),
  FOREIGN KEY (template_id) REFERENCES eco_notification_templates(id) ON DELETE RESTRICT,
  FOREIGN KEY (body_object_id) REFERENCES eco_object_refs(id) ON DELETE RESTRICT,
  FOREIGN KEY (approved_by_account_id) REFERENCES customer_accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_notification_preferences (
  id CHAR(36) NOT NULL PRIMARY KEY,
  account_id CHAR(36) NOT NULL,
  purpose_code VARCHAR(70) NOT NULL,
  channel_code VARCHAR(40) NOT NULL,
  opted_in TINYINT(1) NOT NULL DEFAULT 0,
  consent_record_id CHAR(36) NULL,
  changed_at DATETIME(3) NOT NULL,
  UNIQUE KEY uq_eco_notify_pref (account_id,purpose_code,channel_code),
  FOREIGN KEY (account_id) REFERENCES customer_accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (consent_record_id) REFERENCES eco_consent_records(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_notifications (
  id CHAR(36) NOT NULL PRIMARY KEY,
  recipient_account_id CHAR(36) NOT NULL,
  template_version_id CHAR(36) NULL,
  channel_code VARCHAR(40) NOT NULL,
  purpose_code VARCHAR(70) NOT NULL,
  message_object_id CHAR(36) NULL,
  delivery_state VARCHAR(24) NOT NULL DEFAULT 'PENDING',
  idempotency_key CHAR(64) NOT NULL UNIQUE,
  scheduled_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_eco_notification_queue (delivery_state,scheduled_at),
  FOREIGN KEY (recipient_account_id) REFERENCES customer_accounts(id) ON DELETE RESTRICT,
  FOREIGN KEY (template_version_id) REFERENCES eco_notification_template_versions(id) ON DELETE SET NULL,
  FOREIGN KEY (message_object_id) REFERENCES eco_object_refs(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_notification_attempts (
  id CHAR(36) NOT NULL PRIMARY KEY,
  notification_id CHAR(36) NOT NULL,
  attempt_no INT UNSIGNED NOT NULL,
  provider_code VARCHAR(60) NULL,
  result_code VARCHAR(60) NOT NULL,
  external_message_hash CHAR(64) NULL,
  attempted_at DATETIME(3) NOT NULL,
  UNIQUE KEY uq_eco_notify_attempt (notification_id,attempt_no),
  FOREIGN KEY (notification_id) REFERENCES eco_notifications(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_message_threads (
  id CHAR(36) NOT NULL PRIMARY KEY,
  thread_kind VARCHAR(50) NOT NULL,
  subject_ref VARCHAR(120) NULL,
  confidentiality_class VARCHAR(32) NOT NULL DEFAULT 'PRIVATE',
  created_by_account_id CHAR(36) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  FOREIGN KEY (created_by_account_id) REFERENCES customer_accounts(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_thread_members (
  id CHAR(36) NOT NULL PRIMARY KEY,
  thread_id CHAR(36) NOT NULL,
  account_id CHAR(36) NOT NULL,
  membership_state VARCHAR(24) NOT NULL DEFAULT 'ACTIVE',
  joined_at DATETIME(3) NOT NULL,
  left_at DATETIME(3) NULL,
  UNIQUE KEY uq_eco_thread_member (thread_id,account_id),
  FOREIGN KEY (thread_id) REFERENCES eco_message_threads(id) ON DELETE RESTRICT,
  FOREIGN KEY (account_id) REFERENCES customer_accounts(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_private_messages (
  id CHAR(36) NOT NULL PRIMARY KEY,
  thread_id CHAR(36) NOT NULL,
  sender_account_id CHAR(36) NOT NULL,
  message_object_id CHAR(36) NOT NULL,
  state VARCHAR(24) NOT NULL DEFAULT 'SENT',
  sent_at DATETIME(3) NOT NULL,
  deleted_at DATETIME(3) NULL,
  KEY idx_eco_private_thread (thread_id,sent_at),
  FOREIGN KEY (thread_id) REFERENCES eco_message_threads(id) ON DELETE RESTRICT,
  FOREIGN KEY (sender_account_id) REFERENCES customer_accounts(id) ON DELETE RESTRICT,
  FOREIGN KEY (message_object_id) REFERENCES eco_object_refs(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_message_receipts (
  id CHAR(36) NOT NULL PRIMARY KEY,
  message_id CHAR(36) NOT NULL,
  recipient_account_id CHAR(36) NOT NULL,
  received_at DATETIME(3) NULL,
  read_at DATETIME(3) NULL,
  UNIQUE KEY uq_eco_message_receipt (message_id,recipient_account_id),
  FOREIGN KEY (message_id) REFERENCES eco_private_messages(id) ON DELETE RESTRICT,
  FOREIGN KEY (recipient_account_id) REFERENCES customer_accounts(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_support_tickets (
  id CHAR(36) NOT NULL PRIMARY KEY,
  account_id CHAR(36) NULL,
  ticket_code VARCHAR(80) NOT NULL UNIQUE,
  category VARCHAR(60) NOT NULL,
  priority VARCHAR(24) NOT NULL DEFAULT 'NORMAL',
  state VARCHAR(24) NOT NULL DEFAULT 'OPEN',
  assigned_to_account_id CHAR(36) NULL,
  private_description_object_id CHAR(36) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  FOREIGN KEY (account_id) REFERENCES customer_accounts(id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_to_account_id) REFERENCES customer_accounts(id) ON DELETE SET NULL,
  FOREIGN KEY (private_description_object_id) REFERENCES eco_object_refs(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_ticket_events (
  id CHAR(36) NOT NULL PRIMARY KEY,
  ticket_id CHAR(36) NOT NULL,
  actor_account_id CHAR(36) NULL,
  event_code VARCHAR(50) NOT NULL,
  notes_object_id CHAR(36) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  FOREIGN KEY (ticket_id) REFERENCES eco_support_tickets(id) ON DELETE RESTRICT,
  FOREIGN KEY (actor_account_id) REFERENCES customer_accounts(id) ON DELETE SET NULL,
  FOREIGN KEY (notes_object_id) REFERENCES eco_object_refs(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
