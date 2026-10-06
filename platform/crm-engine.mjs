// CRM lead intake minimises data and keeps editorial recruitment separate from consulting.
export function createLead({lead_id,source,service_interest,contact_channel,contact_value_hash,marketing_opt_in=false}={}){
 if(!lead_id||!source||!service_interest||!contact_channel||!contact_value_hash) throw new Error('Minimal attributed lead fields required');
 return {lead_id,source,service_interest,contact_channel,contact_value_hash,status:'NEW',marketing_opt_in:marketing_opt_in===true,raw_contact_in_analytics:false};
}
export function qualifyLead(lead,{decision,owner_user_id,reason}={}){
 if(lead?.status!=='NEW'||!['QUALIFIED','NOT_A_FIT','NEEDS_INFO'].includes(decision)||!owner_user_id||!String(reason||'').trim()) throw new Error('Audited lead qualification required');
 return {...lead,status:decision,owner_user_id,qualification_reason:reason};
}
export function createEditorialCandidate(input={}){
 if(!input.candidate_id||!input.contact_hash||!input.expertise?.length) throw new Error('Editorial candidate expertise required');
 return {candidate_id:input.candidate_id,contact_hash:input.contact_hash,expertise:input.expertise,role_interest:input.role_interest||'REVIEWER',status:'PROSPECT',consulting_crm_link:null,public_listing:false};
}
