// Golden Talent privacy lifecycle core.
const PURPOSES=new Set(['SERVICE_ASSESSMENT','PARENT_VISIBILITY','TEACHER_OBSERVATION','CONSULTANT_REVIEW','RESEARCH']);
export function activeConsent({consent,purpose,at=new Date()}={}){
 if(!PURPOSES.has(purpose)||!consent||consent.purpose!==purpose||!consent.version) return false;
 if(consent.status!=='ACTIVE'||consent.withdrawn_at) return false;
 if(consent.expires_at&&new Date(consent.expires_at)<=at) return false;
 return true;
}
export function withdrawEvidence(events=[],{source_reference_id,withdrawn_at}={}){
 if(!source_reference_id||!withdrawn_at) throw new Error('Withdrawal source and time required');
 return events.map(e=>e.source_reference_id===source_reference_id?{...e,quality_state:'WITHDRAWN',withdrawn_at,provenance:{...(e.provenance||{}),withdrawal_propagated:true}}:e);
}
export function privacyImpact({request_type,resources=[]}={}){
 const allowed=new Set(['ACCESS','CORRECTION','EXPORT','DELETION','RESTRICTION','CONSENT_WITHDRAWAL']);
 if(!allowed.has(request_type)) throw new Error('Unknown privacy request');
 return resources.map(r=>({
  resource_id:r.id,resource_type:r.type,retention_class:r.retention_class,
  action:request_type==='DELETION'?(r.legal_hold?'HOLD':r.can_anonymize?'ANONYMIZE':'DELETE'):
    request_type==='RESTRICTION'?'HOLD':request_type==='CONSENT_WITHDRAWAL'?'REVIEW':'REVIEW',
  historical_integrity:r.audit_record===true
 }));
}
export function researchProjection(record={}){
 const {name,email,user_id,document_url,consultation_notes,payment_reference,...rest}=record;
 return {...rest,direct_identity_removed:true};
}
