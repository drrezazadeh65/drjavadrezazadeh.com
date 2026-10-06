-- Make versioned talent_route_run the canonical routing source of truth.
-- assessment_route remains legacy compatibility only; no new runtime writes are permitted.
BEGIN;

ALTER TABLE talent_route_run
  ADD COLUMN IF NOT EXISTS evidence_revision integer NOT NULL DEFAULT 1 CHECK (evidence_revision>0),
  ADD COLUMN IF NOT EXISTS route_version_key text;

CREATE UNIQUE INDEX IF NOT EXISTS talent_route_run_version_key_uq
  ON talent_route_run(route_version_key)
  WHERE route_version_key IS NOT NULL;

COMMENT ON TABLE assessment_route IS
  'LEGACY compatibility table only. New routing writes must use talent_route_run/talent_route_evidence.';

CREATE OR REPLACE VIEW assessment_route_projection AS
SELECT DISTINCT ON (rr.trigger_session_id,re.route_code)
  rr.trigger_session_id AS session_id,
  re.route_code,
  re.evidence_state,
  re.requires_more_evidence,
  re.human_review_required,
  rr.id AS route_run_id,
  rr.engine_version,
  rr.evidence_revision,
  rr.status AS route_run_status,
  rr.created_at
FROM talent_route_run rr
JOIN talent_route_evidence re ON re.route_run_id=rr.id
WHERE rr.trigger_session_id IS NOT NULL
  AND rr.status<>'VOID'
ORDER BY rr.trigger_session_id,re.route_code,rr.created_at DESC,rr.id DESC;

COMMIT;
