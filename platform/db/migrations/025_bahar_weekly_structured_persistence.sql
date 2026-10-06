-- Align BAHAR weekly-cycle persistence with the structured runtime evidence model.
-- bahar_learning_evidence is authoritative for observations; weekly text is retained only for legacy compatibility.
BEGIN;

ALTER TABLE bahar_weekly_cycle
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'OPEN',
  ADD COLUMN IF NOT EXISTS reviewer_user_id uuid REFERENCES app_user(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

ALTER TABLE bahar_weekly_cycle DROP CONSTRAINT IF EXISTS bahar_weekly_cycle_status_check;
ALTER TABLE bahar_weekly_cycle
  ADD CONSTRAINT bahar_weekly_cycle_status_check
  CHECK (status IN ('OPEN','REVIEWED','CLOSED'));

COMMENT ON COLUMN bahar_weekly_cycle.observed_evidence IS
  'LEGACY display/summary field only. Structured observation source of truth is bahar_learning_evidence linked by weekly_cycle_id.';

CREATE INDEX IF NOT EXISTS bahar_weekly_cycle_status_idx
  ON bahar_weekly_cycle(portfolio_id,status,week_start DESC);

CREATE INDEX IF NOT EXISTS bahar_learning_evidence_source_event_idx
  ON bahar_learning_evidence(source_evidence_event_id)
  WHERE source_evidence_event_id IS NOT NULL;

COMMIT;
