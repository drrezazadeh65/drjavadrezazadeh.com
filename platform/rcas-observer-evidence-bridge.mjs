// RCAS-O1 observer evidence bridge. Server must verify relationship/assignment before calling.
const ROLE_SOURCE={PARENT:'PARENT',TEACHER:'TEACHER'};
const FIELD_DOMAIN={observed_behaviour_conditions:null,strength_or_progress:null,environmental_barrier_support:'D4',unknown_or_needs_review:null};
export function observerToEvidence(input){
 if(!input?.session_id||!input?.instrument_version||!input?.subject_user_id) throw new Error('Invalid observer submission');
 const source=ROLE_SOURCE[input.respondent_role];
 if(!source) throw new Error('Observer role is not production-authorised');
 if(input.relationship_verified!==true) throw new Error('Verified relationship or assignment required');
 if(input.visibility_authorised!==true) throw new Error('Visibility consent required');
 const fields=input.fields||{},out=[];
 for(const [key,domain] of Object.entries(FIELD_DOMAIN)){
  const value=String(fields[key]||'').trim();
  if(!value) continue;
  out.push({source_type:source,source_reference_id:input.session_id,instrument_code:'RCAS-O1',instrument_version:input.instrument_version,domain_code:domain,evidence_key:key,evidence_value:{observation:value},quality_state:'UNREVIEWED',visibility_scope:source==='PARENT'?'PARENT_ALLOWED':'TEACHER_ALLOWED',provenance:{respondent_role:input.respondent_role,subject_user_id:input.subject_user_id,relationship_verified:true,direction:'CONTEXTUALISES'}});
 }
 return out;
}
