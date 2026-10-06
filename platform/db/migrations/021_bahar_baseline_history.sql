-- Versioned BAHAR baseline history and release-reconciliation persistence.
-- Preserves every longitudinal baseline; replacement requires an explicit released Golden Path.
BEGIN;

ALTER TABLE bahar_baseline_snapshot
  ADD COLUMN IF NOT EXISTS version_number integer,
  ADD COLUMN IF NOT EXISTS source_golden_path_release_id uuid REFERENCES golden_path_release(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS source_route_run_id uuid REFERENCES talent_route_run(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS supersedes_snapshot_id uuid REFERENCES bahar_baseline_snapshot(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS superseded_at timestamptz;

UPDATE bahar_baseline_snapshot SET version_number=1 WHERE version_number IS NULL;
ALTER TABLE bahar_baseline_snapshot ALTER COLUMN version_number SET NOT NULL;
ALTER TABLE bahar_baseline_snapshot
  ADD CONSTRAINT bahar_baseline_snapshot_version_positive CHECK (version_number>0);
ALTER TABLE bahar_baseline_snapshot
  ADD CONSTRAINT bahar_baseline_snapshot_status_check CHECK (status IN ('ACTIVE','SUPERSEDED','REVOKED'));

ALTER TABLE bahar_baseline_snapshot DROP CONSTRAINT IF EXISTS bahar_baseline_snapshot_portfolio_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS bahar_baseline_snapshot_portfolio_version_uq
  ON bahar_baseline_snapshot(portfolio_id,version_number);
CREATE UNIQUE INDEX IF NOT EXISTS bahar_baseline_snapshot_one_active_uq
  ON bahar_baseline_snapshot(portfolio_id) WHERE status='ACTIVE';
CREATE INDEX IF NOT EXISTS bahar_baseline_snapshot_release_idx
  ON bahar_baseline_snapshot(source_golden_path_release_id);

ALTER TABLE bahar_learning_evidence
  ADD COLUMN IF NOT EXISTS weekly_cycle_id uuid REFERENCES bahar_weekly_cycle(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_evidence_event_id uuid REFERENCES talent_evidence_event(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS bahar_learning_evidence_cycle_idx
  ON bahar_learning_evidence(weekly_cycle_id,observed_at);

COMMIT;
