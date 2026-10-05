-- CORE PLATFORM MIGRATION 005
-- Relationships, private document metadata and privacy requests
-- Provider-neutral PostgreSQL baseline; not yet applied to production.

BEGIN;

CREATE TABLE IF NOT EXISTS parent_student_relationship (
  id uuid PRIMARY KEY,
  parent_user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  student_user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  relationship_label text,
  status text NOT NULL DEFAULT 'REQUESTED'
    CHECK (status IN ('REQUESTED','PENDING_VERIFICATION','ACTIVE','REJECTED','REVOKED','EXPIRED')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  verified_at timestamptz,
  revoked_at timestamptz,
  verification_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (parent_user_id, student_user_id)
);

CREATE INDEX IF NOT EXISTS parent_student_active_idx
  ON parent_student_relationship(parent_user_id, student_user_id, status);

CREATE TABLE IF NOT EXISTS teacher_student_assignment (
  id uuid PRIMARY KEY,
  teacher_user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  student_user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  institution_label text,
  class_label text,
  scope jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE','SUSPENDED','ENDED')),
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS teacher_student_scope_idx
  ON teacher_student_assignment(teacher_user_id, student_user_id, status);

CREATE TABLE IF NOT EXISTS private_document (
  id uuid PRIMARY KEY,
  owner_user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  subject_user_id uuid REFERENCES app_user(id) ON DELETE SET NULL,
  consultation_case_id uuid REFERENCES consultation_case(id) ON DELETE SET NULL,
  document_type text NOT NULL
    CHECK (document_type IN ('REPORT_CARD','CERTIFICATE','CONSULTATION_DOCUMENT','ASSESSMENT_ATTACHMENT','OTHER_APPROVED')),
  storage_provider text NOT NULL,
  storage_key text NOT NULL UNIQUE,
  original_file_name text NOT NULL,
  media_type text NOT NULL,
  size_bytes bigint NOT NULL CHECK (size_bytes > 0),
  checksum_sha256 text,
  malware_scan_status text NOT NULL DEFAULT 'PENDING'
    CHECK (malware_scan_status IN ('PENDING','CLEAN','BLOCKED','FAILED')),
  retention_class text NOT NULL,
  status text NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE','QUARANTINED','DELETED','EXPIRED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS private_document_subject_idx
  ON private_document(subject_user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS document_access_grant (
  id uuid PRIMARY KEY,
  document_id uuid NOT NULL REFERENCES private_document(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  permission text NOT NULL
    CHECK (permission IN ('READ','DOWNLOAD','REVIEW')),
  reason text NOT NULL,
  granted_by uuid REFERENCES app_user(id) ON DELETE SET NULL,
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  revoked_at timestamptz
);

CREATE INDEX IF NOT EXISTS document_access_grant_active_idx
  ON document_access_grant(document_id, user_id, revoked_at, expires_at);

CREATE TABLE IF NOT EXISTS privacy_request (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  request_type text NOT NULL
    CHECK (request_type IN ('ACCESS','CORRECTION','EXPORT','DELETION','RESTRICTION','CONSENT_WITHDRAWAL')),
  status text NOT NULL DEFAULT 'SUBMITTED'
    CHECK (status IN ('SUBMITTED','IDENTITY_VERIFICATION','IN_REVIEW','FULFILLED','PARTIALLY_FULFILLED','DECLINED','CANCELLED')),
  user_note text,
  resolution_note text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  handled_by uuid REFERENCES app_user(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS privacy_request_status_idx
  ON privacy_request(status, submitted_at);

CREATE TABLE IF NOT EXISTS retention_event (
  id uuid PRIMARY KEY,
  resource_type text NOT NULL,
  resource_id uuid NOT NULL,
  retention_class text NOT NULL,
  action text NOT NULL
    CHECK (action IN ('REVIEW','ARCHIVE','DELETE','ANONYMIZE','HOLD')),
  reason text,
  performed_by uuid REFERENCES app_user(id) ON DELETE SET NULL,
  performed_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

COMMIT;
