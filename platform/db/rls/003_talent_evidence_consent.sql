-- Consent-aware RLS extension for Golden Talent evidence.
BEGIN;
DROP POLICY IF EXISTS talent_evidence_subject_select ON talent_evidence_event;
CREATE POLICY talent_evidence_subject_select ON talent_evidence_event FOR SELECT
USING (
 subject_user_id=gt_actor_id()
 OR (
  visibility_scope='PARENT_ALLOWED'
  AND gt_has_active_consent(subject_user_id,'PARENT_VISIBILITY')
  AND EXISTS(SELECT 1 FROM parent_student_relationship r WHERE r.parent_user_id=gt_actor_id() AND r.student_user_id=subject_user_id AND r.status='ACTIVE')
 )
 OR (
  visibility_scope='TEACHER_ALLOWED'
  AND gt_has_active_consent(subject_user_id,'TEACHER_OBSERVATION')
  AND EXISTS(SELECT 1 FROM teacher_student_assignment a WHERE a.teacher_user_id=gt_actor_id() AND a.student_user_id=subject_user_id AND a.status='ACTIVE' AND (a.ends_at IS NULL OR a.ends_at>now()) AND COALESCE((a.scope->>'VIEW_EVIDENCE')::boolean,false))
 )
 OR (
  visibility_scope IN ('PARENT_ALLOWED','TEACHER_ALLOWED','ADVISER_ALLOWED','REVIEW_TEAM')
  AND gt_has_active_consent(subject_user_id,'CONSULTANT_REVIEW')
  AND EXISTS(SELECT 1 FROM consultation_case c WHERE c.primary_consultant_user_id=gt_actor_id() AND c.student_user_id=subject_user_id AND c.status IN ('OPEN','FOLLOW_UP'))
 )
);
COMMIT;
