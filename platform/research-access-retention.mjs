// Research access is purpose-bound, time-bound and auditable.
export function requestResearchAccess({request_id,study_id,requester_user_id,purpose,requested_scopes=[],expires_at}={}){
 if(!request_id||!study_id||!requester_user_id||!String(purpose||'').trim()||!requested_scopes.length||!expires_at) throw new Error('Complete research access request required');
 return {request_id,study_id,requester_user_id,purpose,requested_scopes:[...new Set(requested_scopes)].sort(),expires_at,status:'PENDING',direct_identity:false};
}
export function decideResearchAccess(request,{decision,reviewer_user_id,approved_scopes=[],reason}={}){
 if(request?.status!=='PENDING'||!reviewer_user_id||!['APPROVED','DENIED'].includes(decision)||!String(reason||'').trim()) throw new Error('Audited research access decision required');
 if(decision==='APPROVED'&&approved_scopes.some(x=>!request.requested_scopes.includes(x))) throw new Error('Cannot expand requested scope during approval');
 return {...request,status:decision,approved_scopes:decision==='APPROVED'?approved_scopes:[],reviewer_user_id,decision_reason:reason,audit_required:true};
}
export function retentionDecision({data_class,purpose_active,legal_hold=false,research_basis_active=false}={}){
 if(legal_hold) return {action:'RETAIN_LOCKED',reason:'LEGAL_HOLD'};
 if(data_class==='RESEARCH'&&research_basis_active) return {action:'RETAIN_RESEARCH_ONLY',operational_use:false};
 if(purpose_active) return {action:'RETAIN_FOR_ACTIVE_PURPOSE'};
 return {action:'DELETE_OR_ANONYMISE',human_or_policy_review_required:true};
}
