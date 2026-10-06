// Consultation record lifecycle: notes are private, append-only revisions; reports require human approval.
export function createConsultationNote({consultation_id,author_user_id,note_type='SESSION',body,follow_up_at=null,supersedes_note_id=null}={}){
 if(!consultation_id||!author_user_id||!String(body||'').trim()) throw new Error('Private consultation note requires consultation, author and body');
 return {consultation_id,author_user_id,note_type,body,follow_up_at,supersedes_note_id,status:'ACTIVE',visibility:'ASSIGNED_PROFESSIONALS',append_only:true};
}
export function planFollowUp({consultation,status,due_at,owner_user_id,action}={}){
 if(!consultation?.id||!['COMPLETED','FOLLOW_UP'].includes(status)||!due_at||!owner_user_id||!String(action||'').trim()) throw new Error('Valid completed consultation follow-up required');
 return {consultation_id:consultation.id,due_at,owner_user_id,action,status:'PENDING'};
}
export function consultationReportDecision({consultation,report,reviewer_user_id,decision}={}){
 if(consultation?.status!=='COMPLETED'||!report?.report_id||!reviewer_user_id||!['APPROVE','RETURN'].includes(decision)) throw new Error('Human consultation report review required');
 return {report_id:report.report_id,reviewer_user_id,decision,client_visible:decision==='APPROVE',automatic_release:false};
}
