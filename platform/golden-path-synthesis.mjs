// Golden Path synthesis core: evidence-traceable, reviewed, then explicitly released.
const DOMAINS=['D1','D2','D3','D4','D5','D6'];
// Golden Path remains the same mandatory human-release contract: do not
// project uncited raw RCAS inputs or unreviewed BAHAR records into a claim.
export function synthesizeGoldenPath({route_result,evidence_events=[],review_accepted=false}={}){
 if(!Array.isArray(route_result?.routes)||route_result.routes.length!==DOMAINS.length||
   new Set(route_result.routes.map(r=>r?.route_code)).size!==DOMAINS.length||
   route_result.routes.some(r=>!DOMAINS.includes(r?.route_code))||
   route_result.total_score!==null||route_result.normative_label!==null)
   throw new Error('Valid complete non-normative route result required');
 if(review_accepted!==true) throw new Error('Human review approval required');
 const unresolved=route_result.routes.filter(r=>r.evidence_state==='DISCREPANT'||r.human_review_required);
 if(unresolved.length) throw new Error('Unresolved evidence requires review');
 const sections=DOMAINS.map(domain=>{
  const route=route_result.routes.find(r=>r.route_code===domain);
  const cited=new Set(Array.isArray(route?.evidence_event_ids)?route.evidence_event_ids:[]);
  // Only exact IDs used in this reviewed route revision can enter synthesis.
  // An incoming unreviewed, withdrawn or fabricated record is never evidence.
  const evidence=evidence_events.filter(e=>cited.has(e?.id)&&e.domain_code===domain&&
   e.quality_state==='USABLE'&&e.review_projection?.active===true&&
   typeof e.provenance?.review_id==='string'&&e.provenance.review_id.trim()!==''&&
   ['SUPPORTS','CONTRADICTS'].includes(e.provenance?.direction));
  if(route_result.engine_version==='1.1.0'&&evidence.length!==cited.size)
   throw new Error('Golden Path route evidence/review projection mismatch');
  return {domain,evidence_state:route?.evidence_state||'INSUFFICIENT',strengths:evidence.filter(e=>e.provenance.direction==='SUPPORTS').map(e=>e.id).filter(Boolean),counterevidence:evidence.filter(e=>e.provenance.direction==='CONTRADICTS').map(e=>e.id).filter(Boolean),uncertainty:route?.requires_more_evidence===true,next_evidence_needed:route?.requires_more_evidence===true,evidence_ids:evidence.map(e=>e.id).filter(Boolean)};
 });
 return {synthesis_version:route_result.engine_version==='1.1.0'?'1.1.0':'0.2-prevalidation',engine_version:route_result.engine_version,route_run_id:route_result.id||null,total_score:null,normative_label:null,automatic_career_prescription:null,sections,context_constraints:evidence_events.filter(e=>e.source_type==='CONTEXT'&&e.quality_state!=='WITHDRAWN').map(e=>e.id).filter(Boolean),release_status:'PENDING_PROFESSIONAL_RELEASE',requires_professional_release:true};
}
export function releaseGoldenPath(synthesis,{release_id,reviewer_user_id,released_at,route_run_id}={}){
 if(synthesis?.release_status!=='PENDING_PROFESSIONAL_RELEASE') throw new Error('Pending synthesis required');
 if(!release_id||!reviewer_user_id||!released_at||!route_run_id) throw new Error('Professional release record required');
 if(synthesis.route_run_id&&synthesis.route_run_id!==route_run_id) throw new Error('Release route mismatch');
 return {...synthesis,release_status:'RELEASED',requires_professional_release:false,release:{id:release_id,reviewer_user_id,released_at,route_run_id,synthesis_version:synthesis.synthesis_version}};
}
export function createBaharHandoff(synthesis){
 if(synthesis?.release_status!=='RELEASED'||synthesis?.requires_professional_release!==false||!synthesis?.release?.reviewer_user_id) throw new Error('Explicitly released Golden Path required');
 return {source:'GOLDEN_PATH',source_version:synthesis.synthesis_version,source_release_id:synthesis.release.id,source_route_run_id:synthesis.release.route_run_id,baseline:{sections:synthesis.sections,context_constraints:synthesis.context_constraints,scientific_status:'PREVALIDATION',causal_intervention_effect:null,requires_independent_human_review:true},compass_status:'DRAFT',goal_text:null,planned_action:null,requires_human_goal_setting:true};
}
