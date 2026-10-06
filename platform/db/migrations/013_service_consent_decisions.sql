-- Golden Talent purpose-specific consent persistence.
-- Append-only decisions; production legal review still required.
BEGIN;
CREATE TABLE IF NOT EXISTS service_consent_decision (
 id uuid PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
 subject_user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
 purpose text NOT NULL CHECK (purpose IN ('SERVICE_ASSESSMENT','PARENT_VISIBILITY','TEACHER_OBSERVATION','CONSULTANT_REVIEW','RESEARCH')),
 policy_version text NOT NULL,
 decision text NOT NULL CHECK (decision IN ('GRANTED','DECLINED','WITHDRAWN')),
 source text NOT NULL,
 decided_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz,
 supersedes_id uuid REFERENCES service_consent_decision(id) ON DELETE RESTRICT,
 metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS service_consent_lookup_idx ON service_consent_decision(subject_user_id,purpose,decided_at DESC);

CREATE OR REPLACE FUNCTION gt_has_active_consent(target uuid, requested_purpose text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT COALESCE((
  SELECT d.decision='GRANTED' AND (d.expires_at IS NULL OR d.expires_at>now())
  FROM service_consent_decision d
  WHERE d.subject_user_id=target AND d.purpose=requested_purpose
  ORDER BY d.decided_at DESC, d.id DESC LIMIT 1
 ),false)
$$;
REVOKE ALL ON FUNCTION gt_has_active_consent(uuid,text) FROM PUBLIC;
COMMIT;
