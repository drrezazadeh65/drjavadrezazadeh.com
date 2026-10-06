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
 const c=validateDeepSubmission(input),r=c.completion_requirements||{};
 const usable=reviewedEvents.filter(e=>e.domain_code===input.domain&&e.quality_state==='USABLE');
 const taskCodes=new Set(usable.map(e=>e.provenance?.task_code||e.instrument_code));
 const sourceTypes=new Set(usable.map(e=>e.source_type));
 const reflective=usable.filter(e=>['STUDENT_SELF','ASSESSMENT'].includes(e.source_type)).length;
 const contextual=usable.filter(e=>['CONTEXT','PARENT','TEACHER'].includes(e.source_type)).length;
 const professional=usable.some(e=>e.provenance?.reviewer_user_id||e.reviewer_user_id);
 const contextPreserved=usable.some(e=>{
  const v=e.evidence_value||{};
  const p=e.provenance||{};
  return e.source_type==='CONTEXT'||p.context_preserved===true||Boolean(v.constraint||v.support||v.context||v.structural_barrier);
 });
 const processEvidence=usable.some(e=>{
  const v=e.evidence_value||{};
  const p=e.provenance||{};
  return p.process_evidence===true||Boolean(v.claim&&v.evidence&&v.decision)||Boolean(v.process_trace);
 });
 const requirements={
  minimum_usable_events:(r.minimum_usable_events||0)<=usable.length,
  required_task_codes:(r.required_task_codes||[]).every(x=>taskCodes.has(x)),
  required_source_types:(r.required_source_types||[]).every(x=>sourceTypes.has(x)),
  reflective:r.minimum_reflective_events==null||reflective>=r.minimum_reflective_events,
  contextual:r.minimum_contextual_events==null||contextual>=r.minimum_contextual_events,
  professional_review:r.professional_review_required!==true||professional,
  paired_performance:r.paired_performance_required!==true||usable.filter(e=>e.source_type==='PERFORMANCE_SAMPLE').length>=2,
  external_or_performance:r.external_or_performance_evidence_required!==true||usable.some(e=>['PERFORMANCE_SAMPLE','ACADEMIC_RECORD','CONSULTANT'].includes(e.source_type)),
  context_preservation:r.context_preservation_required!==true||contextPreserved,
  process_evidence:r.process_evidence_required!==true||processEvidence
 };
 const completed=Object.values(requirements).every(Boolean);
 return {domain:input.domain,task_code:input.task_code,contract_completion_rule:c.completion,requirements,evidence_count:usable.length,completed_for_workflow:completed,total_score:null,normative_label:null,requires_route_rerun:completed};
}
