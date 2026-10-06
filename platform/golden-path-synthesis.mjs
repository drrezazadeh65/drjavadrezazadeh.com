// Golden Path synthesis core: structured, evidence-traceable and human-gated.
const DOMAINS=['D1','D2','D3','D4','D5','D6'];
export function synthesizeGoldenPath({route_result,evidence_events=[],review_accepted=false}={}){
 if(!route_result?.routes) throw new Error('Persisted route result required');
 if(review_accepted!==true) throw new Error('Human review approval required');
 const unresolved=route_result.routes.filter(r=>r.evidence_state==='DISCREPANT'||r.human_review_required);
 if(unresolved.length) throw new Error('Unresolved evidence requires review');
 const sections=DOMAINS.map(domain=>{
  const route=route_result.routes.find(r=>r.route_code===domain);
  const evidence=evidence_events.filter(e=>e.domain_code===domain&&e.quality_state==='USABLE'&&['SUPPORTS','CONTRADICTS'].includes(e.provenance?.direction));
  return {
   domain,
   evidence_state:route?.evidence_state||'INSUFFICIENT',
   strengths:evidence.filter(e=>e.provenance.direction==='SUPPORTS').map(e=>e.id).filter(Boolean),
   counterevidence:evidence.filter(e=>e.provenance.direction==='CONTRADICTS').map(e=>e.id).filter(Boolean),
   uncertainty:route?.requires_more_evidence===true,
   next_evidence_needed:route?.requires_more_evidence===true,
   evidence_ids:evidence.map(e=>e.id).filter(Boolean)
  };
 });
 return {
  synthesis_version:'0.1-prevalidation',
  engine_version:route_result.engine_version,
  total_score:null,
  normative_label:null,
  automatic_career_prescription:null,
  sections,
  context_constraints:evidence_events.filter(e=>e.source_type==='CONTEXT'&&e.quality_state!=='WITHDRAWN').map(e=>e.id).filter(Boolean),
  requires_professional_release:true
 };
}
export function createBaharHandoff(synthesis){
 if(!synthesis?.requires_professional_release) throw new Error('Released Golden Path synthesis required');
 return {
  source:'GOLDEN_PATH',
  source_version:synthesis.synthesis_version,
  baseline:{sections:synthesis.sections,context_constraints:synthesis.context_constraints},
  compass_status:'DRAFT',
  goal_text:null,
  planned_action:null,
  requires_human_goal_setting:true
 };
}
