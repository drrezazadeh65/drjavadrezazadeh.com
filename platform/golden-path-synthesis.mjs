// Golden Path synthesis core: evidence-traceable, reviewed, then explicitly released.
const DOMAINS=['D1','D2','D3','D4','D5','D6'];
export function synthesizeGoldenPath({route_result,evidence_events=[],review_accepted=false}={}){
 if(!route_result?.routes) throw new Error('Persisted route result required');
 if(review_accepted!==true) throw new Error('Human review approval required');
 const unresolved=route_result.routes.filter(r=>r.evidence_state==='DISCREPANT'||r.human_review_required);
 if(unresolved.length) throw new Error('Unresolved evidence requires review');
 const sections=DOMAINS.map(domain=>{
  const route=route_result.routes.find(r=>r.route_code===domain);
  const evidence=evidence_events.filter(e=>e.domain_code===domain&&e.quality_state==='USABLE'&&['SUPPORTS','CONTRADICTS'].includes(e.provenance?.direction));
  return {domain,evidence_state:route?.evidence_state||'INSUFFICIENT',strengths:evidence.filter(e=>e.provenance.direction==='SUPPORTS').map(e=>e.id).filter(Boolean),counterevidence:evidence.filter(e=>e.provenance.direction==='CONTRADICTS').map(e=>e.id).filter(Boolean),uncertainty:route?.requires_more_evidence===true,next_evidence_needed:route?.requires_more_evidence===true,evidence_ids:evidence.map(e=>e.id).filter(Boolean)};
 });
 return {synthesis_version:'0.2-prevalidation',engine_version:route_result.engine_version,route_run_id:route_result.id||null,total_score:null,normative_label:null,automatic_career_prescription:null,sections,context_constraints:evidence_events.filter(e=>e.source_type==='CONTEXT'&&e.quality_state!=='WITHDRAWN').map(e=>e.id).filter(Boolean),release_status:'PENDING_PROFESSIONAL_RELEASE',requires_professional_release:true};
}
export function releaseGoldenPath(synthesis,{release_id,reviewer_user_id,released_at,route_run_id}={}){
 if(synthesis?.release_status!=='PENDING_PROFESSIONAL_RELEASE') throw new Error('Pending synthesis required');
 if(!release_id||!reviewer_user_id||!released_at||!route_run_id) throw new Error('Professional release record required');
 if(synthesis.route_run_id&&synthesis.route_run_id!==route_run_id) throw new Error('Release route mismatch');
 return {...synthesis,release_status:'RELEASED',requires_professional_release:false,release:{id:release_id,reviewer_user_id,released_at,route_run_id,synthesis_version:synthesis.synthesis_version}};
}
export function createBaharHandoff(synthesis){
 if(synthesis?.release_status!=='RELEASED'||synthesis?.requires_professional_release!==false||!synthesis?.release?.reviewer_user_id) throw new Error('Explicitly released Golden Path required');
 return {source:'GOLDEN_PATH',source_version:synthesis.synthesis_version,source_release_id:synthesis.release.id,source_route_run_id:synthesis.release.route_run_id,baseline:{sections:synthesis.sections,context_constraints:synthesis.context_constraints},compass_status:'DRAFT',goal_text:null,planned_action:null,requires_human_goal_setting:true};
}
