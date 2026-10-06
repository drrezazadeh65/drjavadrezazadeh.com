-- Append-only professional review persistence for evidence.
BEGIN;
CREATE TABLE IF NOT EXISTS talent_evidence_review (
 id uuid PRIMARY KEY,
 evidence_event_id uuid NOT NULL REFERENCES talent_evidence_event(id) ON DELETE RESTRICT,
 reviewer_user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE RESTRICT,
 quality_state text NOT NULL CHECK(quality_state IN ('USABLE','LIMITED','CONFLICTING','WITHDRAWN')),
 direction text NOT NULL CHECK(direction IN ('SUPPORTS','CONTRADICTS','CONTEXTUALISES')),
 rationale text NOT NULL,
 review_status text NOT NULL DEFAULT 'ACTIVE' CHECK(review_status IN ('ACTIVE','SUPERSEDED','VOID')),
 supersedes_review_id uuid REFERENCES talent_evidence_review(id) ON DELETE RESTRICT,
 reviewed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS talent_evidence_review_event_idx ON talent_evidence_review(evidence_event_id,reviewed_at DESC);
COMMIT;
