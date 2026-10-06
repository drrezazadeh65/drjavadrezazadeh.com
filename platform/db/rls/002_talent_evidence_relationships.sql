-- Golden Talent scoped RLS extension.
-- Requires trusted transaction-local app.user_id set by API after authentication.
BEGIN;
CREATE OR REPLACE FUNCTION gt_actor_id() RETURNS uuid LANGUAGE sql STABLE AS $$
 SELECT NULLIF(current_setting('app.user_id', true),'')::uuid
$$;

CREATE OR REPLACE FUNCTION gt_can_view_subject(target uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT target=gt_actor_id()
 OR EXISTS(SELECT 1 FROM parent_student_relationship r WHERE r.parent_user_id=gt_actor_id() AND r.student_user_id=target AND r.status='ACTIVE')
 OR EXISTS(SELECT 1 FROM teacher_student_assignment a WHERE a.teacher_user_id=gt_actor_id() AND a.student_user_id=target AND a.status='ACTIVE' AND (a.ends_at IS NULL OR a.ends_at>now()) AND COALESCE((a.scope->>'VIEW_EVIDENCE')::boolean,false))
 OR EXISTS(SELECT 1 FROM consultation_case c WHERE c.primary_consultant_user_id=gt_actor_id() AND c.student_user_id=target AND c.status IN ('OPEN','FOLLOW_UP'));
$$;

REVOKE ALL ON FUNCTION gt_can_view_subject(uuid) FROM PUBLIC;

DROP POLICY IF EXISTS talent_evidence_subject_select ON talent_evidence_event;
CREATE POLICY talent_evidence_subject_select ON talent_evidence_event FOR SELECT
USING (
 gt_can_view_subject(subject_user_id)
 AND (
  subject_user_id=gt_actor_id()
  OR (visibility_scope='PARENT_ALLOWED' AND EXISTS(SELECT 1 FROM parent_student_relationship r WHERE r.parent_user_id=gt_actor_id() AND r.student_user_id=subject_user_id AND r.status='ACTIVE'))
  OR (visibility_scope='TEACHER_ALLOWED' AND EXISTS(SELECT 1 FROM teacher_student_assignment a WHERE a.teacher_user_id=gt_actor_id() AND a.student_user_id=subject_user_id AND a.status='ACTIVE' AND COALESCE((a.scope->>'VIEW_EVIDENCE')::boolean,false)))
  OR (visibility_scope IN ('PARENT_ALLOWED','TEACHER_ALLOWED','ADVISER_ALLOWED','REVIEW_TEAM') AND EXISTS(SELECT 1 FROM consultation_case c WHERE c.primary_consultant_user_id=gt_actor_id() AND c.student_user_id=subject_user_id AND c.status IN ('OPEN','FOLLOW_UP')))
 )
);
COMMIT;
