// Privacy-minimised Golden Talent audit event builder.
const ACTIONS=new Set(['ACCESS_ALLOWED','ACCESS_DENIED','EVIDENCE_RECORDED','EVIDENCE_REVIEWED','CONSENT_CHANGED','PRIVACY_REQUEST','SESSION_TRANSITION','ROUTE_CREATED','ROUTE_REVIEWED','GOLDEN_PATH_RELEASED','BAHAR_REVIEWED','PAYMENT_VERIFIED','ENTITLEMENT_CHANGED']);
export function auditEvent({action,actor_user_id=null,subject_user_id=null,resource_type,resource_id=null,outcome,authorization_basis=null,correlation_id,engine_version=null,policy_version=null,metadata={}}={}){
 if(!ACTIONS.has(action)||!resource_type||!outcome||!correlation_id) throw new Error('Valid auditable action context required');
 const safe={};
 for(const key of ['reason_code','role','capability','state_from','state_to','instrument_code','instrument_version','evidence_revision','route_run_id','consent_purpose']) if(metadata[key]!=null) safe[key]=metadata[key];
 return {action,actor_user_id,subject_user_id,resource_type,resource_id,outcome,authorization_basis,correlation_id,engine_version,policy_version,metadata:safe,occurred_at:new Date().toISOString()};
}
export function deniedAccessEvent(input){
 return auditEvent({...input,action:'ACCESS_DENIED',outcome:'DENIED',resource_id:null,metadata:{reason_code:input?.metadata?.reason_code,role:input?.metadata?.role,capability:input?.metadata?.capability}});
}
export function auditContainsSensitivePayload(event){
 const serialized=JSON.stringify(event?.metadata||{}).toLowerCase();
 return ['evidence_value','description','consultation_notes','document_url','payment_reference','password','token'].some(k=>serialized.includes(k));
}
