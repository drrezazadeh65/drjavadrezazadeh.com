-- RLS reference policy for Golden Talent private evidence.
-- Apply only after the production API establishes trusted transaction-local app.user_id.
-- Migration owner must not be used by the application runtime.
BEGIN;
ALTER TABLE talent_evidence_event ENABLE ROW LEVEL SECURITY;
ALTER TABLE talent_evidence_event FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS talent_evidence_subject_select ON talent_evidence_event;
CREATE POLICY talent_evidence_subject_select ON talent_evidence_event
FOR SELECT
USING (
 subject_user_id = NULLIF(current_setting('app.user_id', true),'')::uuid
);

DROP POLICY IF EXISTS talent_evidence_subject_insert ON talent_evidence_event;
CREATE POLICY talent_evidence_subject_insert ON talent_evidence_event
FOR INSERT
WITH CHECK (
 subject_user_id = NULLIF(current_setting('app.user_id', true),'')::uuid
 AND source_type = 'STUDENT_SELF'
);

-- Parent, teacher, consultant and worker access is intentionally NOT granted by this
-- baseline policy. Production adds narrowly scoped SECURITY DEFINER functions or
-- dedicated policies backed by ACTIVE persisted relationships/assignments and audit.
COMMIT;
