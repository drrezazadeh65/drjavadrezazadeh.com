-- Explicit Golden Path professional release record.
BEGIN;
CREATE TABLE IF NOT EXISTS golden_path_release (
 id uuid PRIMARY KEY,
 golden_path_id uuid NOT NULL REFERENCES golden_path(id) ON DELETE RESTRICT,
 route_run_id uuid NOT NULL REFERENCES talent_route_run(id) ON DELETE RESTRICT,
 reviewer_user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE RESTRICT,
 synthesis_version text NOT NULL,
 release_status text NOT NULL DEFAULT 'RELEASED' CHECK (release_status IN ('RELEASED','REVOKED','SUPERSEDED')),
 rationale text NOT NULL,
 released_at timestamptz NOT NULL DEFAULT now(),
 revoked_at timestamptz,
 supersedes_release_id uuid REFERENCES golden_path_release(id) ON DELETE RESTRICT,
 UNIQUE(golden_path_id,route_run_id,synthesis_version)
);
CREATE INDEX IF NOT EXISTS golden_path_release_route_idx ON golden_path_release(route_run_id,released_at DESC);
COMMIT;
