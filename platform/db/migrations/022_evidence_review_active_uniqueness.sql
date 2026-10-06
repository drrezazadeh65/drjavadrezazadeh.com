-- Enforce one ACTIVE professional review projection per evidence event.
-- Historical superseded/void reviews remain append-only.
BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS talent_evidence_review_one_active_uq
  ON talent_evidence_review(evidence_event_id)
  WHERE review_status='ACTIVE';

CREATE INDEX IF NOT EXISTS talent_evidence_review_supersedes_idx
  ON talent_evidence_review(supersedes_review_id)
  WHERE supersedes_review_id IS NOT NULL;

COMMIT;
