-- Administrative audit and content revision history.
BEGIN;
CREATE TABLE IF NOT EXISTS admin_audit_event (
 id uuid PRIMARY KEY,
 actor_user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE RESTRICT,
 action_key text NOT NULL,
 resource_type text NOT NULL,
 resource_id text NOT NULL,
 outcome text NOT NULL CHECK(outcome IN ('ALLOWED','DENIED','COMPLETED','FAILED')),
 correlation_id text NOT NULL,
 metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_audit_resource_idx ON admin_audit_event(resource_type,resource_id,created_at DESC);

CREATE TABLE IF NOT EXISTS content_revision (
 id uuid PRIMARY KEY,
 content_key text NOT NULL,
 revision_number integer NOT NULL CHECK(revision_number>0),
 status text NOT NULL CHECK(status IN ('DRAFT','IN_REVIEW','APPROVED','PUBLISHED','SUPERSEDED','REJECTED')),
 editor_user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE RESTRICT,
 reviewer_user_id uuid REFERENCES app_user(id) ON DELETE RESTRICT,
 content_hash text NOT NULL,
 change_summary text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 published_at timestamptz,
 supersedes_revision_id uuid REFERENCES content_revision(id) ON DELETE RESTRICT,
 UNIQUE(content_key,revision_number)
);
COMMIT;
