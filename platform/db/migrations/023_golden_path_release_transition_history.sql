-- Append-only Golden Path release transition history and BAHAR reassessment linkage.
BEGIN;

ALTER TABLE golden_path_release
  ADD COLUMN IF NOT EXISTS superseded_at timestamptz;

CREATE TABLE IF NOT EXISTS golden_path_release_transition (
  id uuid PRIMARY KEY,
  release_id uuid NOT NULL REFERENCES golden_path_release(id) ON DELETE RESTRICT,
  from_status text NOT NULL CHECK (from_status='RELEASED'),
  to_status text NOT NULL CHECK (to_status IN ('REVOKED','SUPERSEDED')),
  reason text NOT NULL CHECK (reason IN ('EVIDENCE_WITHDRAWN','CONSENT_WITHDRAWN','MATERIAL_ROUTE_CHANGE','PROFESSIONAL_REVOCATION')),
  actor_user_id uuid REFERENCES app_user(id) ON DELETE RESTRICT,
  trigger_reference text,
  replacement_route_run_id uuid REFERENCES talent_route_run(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (actor_user_id IS NOT NULL OR NULLIF(btrim(trigger_reference),'') IS NOT NULL),
  CHECK (to_status<>'SUPERSEDED' OR replacement_route_run_id IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS golden_path_release_terminal_transition_uq
  ON golden_path_release_transition(release_id);

CREATE INDEX IF NOT EXISTS golden_path_release_transition_route_idx
  ON golden_path_release_transition(replacement_route_run_id)
  WHERE replacement_route_run_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS golden_path_release_transition_evidence (
  transition_id uuid NOT NULL REFERENCES golden_path_release_transition(id) ON DELETE RESTRICT,
  evidence_event_id uuid NOT NULL REFERENCES talent_evidence_event(id) ON DELETE RESTRICT,
  PRIMARY KEY (transition_id,evidence_event_id)
);

ALTER TABLE bahar_portfolio
  ADD COLUMN IF NOT EXISTS pending_route_run_id uuid REFERENCES talent_route_run(id) ON DELETE RESTRICT;

COMMIT;
