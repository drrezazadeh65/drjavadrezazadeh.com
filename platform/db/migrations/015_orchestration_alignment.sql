-- Golden Talent orchestration persistence alignment.
BEGIN;
ALTER TABLE assessment_session DROP CONSTRAINT IF EXISTS assessment_session_status_check;
ALTER TABLE assessment_session ADD CONSTRAINT assessment_session_status_check
 CHECK (status IN ('IN_PROGRESS','SUBMITTED','ROUTING','REVIEW_REQUIRED','COMPLETE','CANCELLED'));

ALTER TABLE assessment_session ADD COLUMN IF NOT EXISTS response_revision integer NOT NULL DEFAULT 1 CHECK(response_revision>0);
ALTER TABLE assessment_session ADD COLUMN IF NOT EXISTS submitted_snapshot jsonb;
ALTER TABLE assessment_session ADD COLUMN IF NOT EXISTS submission_idempotency_key text;
CREATE UNIQUE INDEX IF NOT EXISTS assessment_session_submission_key_uq
 ON assessment_session(submission_idempotency_key) WHERE submission_idempotency_key IS NOT NULL;

ALTER TABLE bahar_portfolio ADD COLUMN IF NOT EXISTS source_golden_path_release_id uuid REFERENCES golden_path_release(id) ON DELETE RESTRICT;
ALTER TABLE bahar_portfolio ADD COLUMN IF NOT EXISTS source_route_run_id uuid REFERENCES talent_route_run(id) ON DELETE RESTRICT;
ALTER TABLE bahar_portfolio ADD COLUMN IF NOT EXISTS baseline_version integer NOT NULL DEFAULT 1 CHECK(baseline_version>0);
ALTER TABLE bahar_portfolio ADD COLUMN IF NOT EXISTS reconciliation_status text NOT NULL DEFAULT 'CURRENT'
 CHECK(reconciliation_status IN ('CURRENT','REASSESSMENT_REQUIRED','RECONCILED'));
COMMIT;
