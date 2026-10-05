-- CORE PLATFORM MIGRATION 008
-- Secure messaging, notifications and transactional communication events
-- Provider-neutral PostgreSQL baseline; not yet applied to production.

BEGIN;

CREATE TABLE IF NOT EXISTS message_thread (
  id uuid PRIMARY KEY,
  thread_type text NOT NULL
    CHECK (thread_type IN ('CONSULTATION','SUPPORT','GENERAL_PRIVATE')),
  consultation_case_id uuid REFERENCES consultation_case(id) ON DELETE SET NULL,
  subject text,
  status text NOT NULL DEFAULT 'OPEN'
    CHECK (status IN ('OPEN','CLOSED','ARCHIVED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS message_thread_participant (
  thread_id uuid NOT NULL REFERENCES message_thread(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  participant_role text,
  joined_at timestamptz NOT NULL DEFAULT now(),
  left_at timestamptz,
  PRIMARY KEY (thread_id, user_id)
);

CREATE TABLE IF NOT EXISTS private_message (
  id uuid PRIMARY KEY,
  thread_id uuid NOT NULL REFERENCES message_thread(id) ON DELETE CASCADE,
  sender_user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE RESTRICT,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'SENT'
    CHECK (status IN ('SENT','REDACTED','DELETED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  edited_at timestamptz
);

CREATE INDEX IF NOT EXISTS private_message_thread_idx
  ON private_message(thread_id, created_at);

CREATE TABLE IF NOT EXISTS message_read_receipt (
  message_id uuid NOT NULL REFERENCES private_message(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id)
);

CREATE TABLE IF NOT EXISTS notification (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  notification_type text NOT NULL
    CHECK (notification_type IN (
      'APPOINTMENT',
      'PAYMENT',
      'REPORT_READY',
      'ASSESSMENT',
      'MESSAGE',
      'FOLLOW_UP',
      'SYSTEM'
    )),
  title text NOT NULL,
  body text,
  action_url text,
  status text NOT NULL DEFAULT 'UNREAD'
    CHECK (status IN ('UNREAD','READ','DISMISSED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);

CREATE INDEX IF NOT EXISTS notification_user_status_idx
  ON notification(user_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS communication_preference (
  user_id uuid PRIMARY KEY REFERENCES app_user(id) ON DELETE CASCADE,
  allow_transactional_email boolean NOT NULL DEFAULT true,
  allow_appointment_reminders boolean NOT NULL DEFAULT true,
  allow_product_updates boolean NOT NULL DEFAULT false,
  allow_marketing boolean NOT NULL DEFAULT false,
  preferred_channel text NOT NULL DEFAULT 'EMAIL'
    CHECK (preferred_channel IN ('EMAIL','IN_APP')),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS email_event (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES app_user(id) ON DELETE SET NULL,
  email_category text NOT NULL
    CHECK (email_category IN (
      'VERIFICATION',
      'PASSWORD_RESET',
      'APPOINTMENT_CONFIRMATION',
      'APPOINTMENT_REMINDER',
      'PAYMENT_RECEIPT',
      'REPORT_READY',
      'CASE_STATUS',
      'SYSTEM_NOTICE',
      'MARKETING'
    )),
  template_key text NOT NULL,
  provider_message_id text,
  recipient_hash text NOT NULL,
  status text NOT NULL DEFAULT 'QUEUED'
    CHECK (status IN ('QUEUED','SENT','DELIVERED','BOUNCED','FAILED','SUPPRESSED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_event_status_idx
  ON email_event(status, created_at);

COMMIT;
