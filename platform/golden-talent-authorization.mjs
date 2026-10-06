// Golden Talent deny-by-default authorisation core.
const evidenceVisibility={
 SUBJECT_PRIVATE:new Set(['SELF']),
 PARENT_ALLOWED:new Set(['SELF','PARENT','CONSULTANT']),
 TEACHER_ALLOWED:new Set(['SELF','TEACHER','CONSULTANT']),
 ADVISER_ALLOWED:new Set(['SELF','CONSULTANT']),
 REVIEW_TEAM:new Set(['CONSULTANT'])
};
export function authorizeSubjectAccess({actor,subject_user_id,capability,relationship,assignment,case_assignment,consent}={}){
 if(!actor?.user_id||!subject_user_id||!capability) return {allow:false,reason:'MISSING_AUTH_CONTEXT'};
 if(actor.user_id===subject_user_id) return {allow:true,reason:'SELF'};
 const roles=new Set(actor.roles||[]);
 if(roles.has('PARENT')&&relationship?.status==='ACTIVE'&&relationship.student_user_id===subject_user_id&&consent?.allows!==false) return {allow:true,reason:'ACTIVE_PARENT_RELATIONSHIP'};
 if(roles.has('TEACHER')&&assignment?.status==='ACTIVE'&&assignment.student_user_id===subject_user_id&&assignment.scope?.includes?.(capability)&&consent?.allows===true) return {allow:true,reason:'SCOPED_TEACHER_ASSIGNMENT'};
 if(roles.has('CONSULTANT')&&case_assignment?.status==='ACTIVE'&&case_assignment.subject_user_id===subject_user_id&&case_assignment.capabilities?.includes?.(capability)) return {allow:true,reason:'ACTIVE_CASE_ASSIGNMENT'};
 return {allow:false,reason:'DENY_BY_DEFAULT'};
}
export function authorizeEvidenceView({actor,subject_user_id,evidence,access_context}={}){
 const base=authorizeSubjectAccess({actor,subject_user_id,capability:'VIEW_EVIDENCE',...(access_context||{})});
 if(!base.allow) return base;
 const relation=actor.user_id===subject_user_id?'SELF':(actor.roles||[]).includes('PARENT')?'PARENT':(actor.roles||[]).includes('TEACHER')?'TEACHER':(actor.roles||[]).includes('CONSULTANT')?'CONSULTANT':'OTHER';
 if(!evidenceVisibility[evidence?.visibility_scope]?.has(relation)) return {allow:false,reason:'VISIBILITY_SCOPE_DENIED'};
 return base;
}
export function authorizeEvidenceReview({actor,case_assignment,evidence}={}){
 if(!(actor?.roles||[]).includes('CONSULTANT')) return {allow:false,reason:'QUALIFIED_REVIEWER_REQUIRED'};
 if(case_assignment?.status!=='ACTIVE'||case_assignment.subject_user_id!==evidence?.subject_user_id||!case_assignment.capabilities?.includes?.('REVIEW_EVIDENCE')) return {allow:false,reason:'ACTIVE_CASE_REVIEW_ASSIGNMENT_REQUIRED'};
 return {allow:true,reason:'SCOPED_REVIEW_ASSIGNMENT'};
}
