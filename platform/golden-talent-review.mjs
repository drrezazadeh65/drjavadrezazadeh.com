// Golden Talent professional evidence review.
const quality=new Set(['USABLE','LIMITED','CONFLICTING','WITHDRAWN']);
const direction=new Set(['SUPPORTS','CONTRADICTS','CONTEXTUALISES']);
export function reviewedEvidence(event,review){
 if(!event?.id) throw new Error('Evidence required');
 if(!review?.reviewer_user_id||!quality.has(review.quality_decision)||!direction.has(review.direction)||!String(review.rationale||'').trim()) throw new Error('Review decision required');
 return {...event,quality_state:review.quality_decision,provenance:{...(event.provenance||{}),direction:review.direction,reviewer_user_id:review.reviewer_user_id,review_id:review.id||null}};
}
export function goldenPathEligibility(routeResult,reviewAccepted=false){
 const unresolved=(routeResult?.routes||[]).filter(r=>r.evidence_state==='DISCREPANT'||r.human_review_required);
 return {eligible_for_synthesis:reviewAccepted===true&&unresolved.length===0,requires_human_approval:true,unresolved_domains:unresolved.map(r=>r.route_code),total_score:null};
}
