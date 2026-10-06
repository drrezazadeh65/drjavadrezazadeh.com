// D1-D6 deep-module submission bridge.
import fs from 'node:fs';
const contracts=JSON.parse(fs.readFileSync(new URL('./golden-talent-deep-modules.json',import.meta.url),'utf8'));
export function validateDeepSubmission(input){
 const c=contracts.modules[input?.domain];
 if(!c) throw new Error('Unknown deep module');
 if(!input.session_id||!input.instrument_version||!input.entitlement_verified) throw new Error('Server session, version and entitlement required');
 if(!c.tasks.includes(input.task_code)) throw new Error('Task is not contracted for domain');
 if(!Array.isArray(input.evidence)||!input.evidence.length) throw new Error('Traceable evidence required');
 return c;
}
export function deepSubmissionToEvidence(input){
 validateDeepSubmission(input);
 return input.evidence.map((e,i)=>{
  if(!e?.id||!String(e.description||'').trim()) throw new Error('Evidence id and description required');
  return {id:e.id,source_type:e.source_type||'PERFORMANCE_SAMPLE',source_reference_id:input.session_id,instrument_code:input.task_code,instrument_version:input.instrument_version,domain_code:input.domain,evidence_key:input.task_code+'-'+(i+1),evidence_value:{description:e.description,artifact_ref:e.artifact_ref||null},quality_state:'UNREVIEWED',visibility_scope:'SUBJECT_PRIVATE',provenance:{task_code:input.task_code,direction:'CONTEXTUALISES',server_entitlement_verified:true}};
 });
}
export function deepModuleCompletion(input,reviewedEvents=[]){
 const c=validateDeepSubmission(input);
 const usable=reviewedEvents.filter(e=>e.domain_code===input.domain&&e.quality_state==='USABLE');
 return {domain:input.domain,task_code:input.task_code,contract_completion_rule:c.completion,evidence_count:usable.length,completed_for_workflow:usable.length>0,total_score:null,normative_label:null,requires_route_rerun:usable.length>0};
}
