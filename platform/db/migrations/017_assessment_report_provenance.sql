-- Assessment/report provenance alignment; no Golden Talent norms or cutoffs are introduced.
BEGIN;
ALTER TABLE assessment_session ADD COLUMN IF NOT EXISTS frozen_at timestamptz;
ALTER TABLE assessment_score ADD COLUMN IF NOT EXISTS response_revision integer CHECK(response_revision IS NULL OR response_revision>0);
ALTER TABLE assessment_interpretation ADD COLUMN IF NOT EXISTS scoring_version_id uuid REFERENCES scoring_version(id) ON DELETE RESTRICT;
ALTER TABLE report ADD COLUMN IF NOT EXISTS scoring_version_id uuid REFERENCES scoring_version(id) ON DELETE RESTRICT;
ALTER TABLE report ADD COLUMN IF NOT EXISTS interpretation_version_id uuid REFERENCES interpretation_version(id) ON DELETE RESTRICT;
ALTER TABLE report ADD COLUMN IF NOT EXISTS source_response_revision integer CHECK(source_response_revision IS NULL OR source_response_revision>0);
ALTER TABLE report ADD COLUMN IF NOT EXISTS supersedes_report_id uuid REFERENCES report(id) ON DELETE RESTRICT;
COMMIT;
