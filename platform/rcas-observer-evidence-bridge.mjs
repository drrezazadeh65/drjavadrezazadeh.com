// RCAS-O1 observer evidence bridge. Server must verify relationship/assignment before calling.
const ROLE_SOURCE={PARENT:'PARENT',TEACHER:'TEACHER'};
const FIELD_DOMAIN={observed_behaviour_conditions:null,strength_or_progress:null,environmental_barrier_support:'D4',unknown_or_needs_review:null};
export function observerToEvidence(input){
 const safeId=v=>typeof v==='string'&&/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(v);
 if(!safeId(input?.session_id)||!safeId(input?.instrument_version)||!safeId(input?.subject_user_id)) throw new Error('Invalid observer submission');
 const source=ROLE_SOURCE[input.respondent_role];
 if(!source) throw new Error('Observer role is not production-authorised');
 if(input.relationship_verified!==true) throw new Error('Verified relationship or assignment required');
 if(input.visibility_authorised!==true) throw new Error('Visibility consent required');
 const fields=input.fields??{},out=[];
 if(!fields||typeof fields!=='object'||Array.isArray(fields)||
    Object.keys(fields).some(key=>!Object.hasOwn(FIELD_DOMAIN,key)))
    throw new Error('Unrecognized observer evidence field');
 for(const [key,domain] of Object.entries(FIELD_DOMAIN)){
  if(fields[key]!==undefined&&typeof fields[key]!=='string')throw new Error('Observer narrative must be text');
  const value=(fields[key]||'').trim();
  if(value.length>2000)throw new Error('Observer observation exceeds text limit');
  if(!value) continue;
  out.push({source_type:source,source_reference_id:input.session_id,instrument_code:'RCAS-O1',instrument_version:input.instrument_version,domain_code:domain,evidence_key:key,evidence_value:{observation:value},quality_state:'UNREVIEWED',visibility_scope:source==='PARENT'?'PARENT_ALLOWED':'TEACHER_ALLOWED',provenance:{respondent_role:input.respondent_role,subject_user_id:input.subject_user_id,relationship_verified:true,direction:'CONTEXTUALISES',independence_group_id:input.session_id,observation_reference_id:input.session_id+':'+key,independence_verified:false,review_required:true}});
 }
 return out;
}
