// Golden Talent professional evidence review.
// Persisted evidence events remain immutable; routing consumes a derived projection of one ACTIVE review.
const quality=new Set(['USABLE','LIMITED','CONFLICTING','WITHDRAWN']);
const direction=new Set(['SUPPORTS','CONTRADICTS','CONTEXTUALISES']);

function normalizeReview(review={}){
 const qualityDecision=review.quality_decision??review.quality_state;
 const reviewStatus=review.review_status??'ACTIVE';
 if(!review.id||!review.reviewer_user_id||!quality.has(qualityDecision)||!direction.has(review.direction)||!String(review.rationale||'').trim()) throw new Error('Persisted review decision required');
 if(reviewStatus!=='ACTIVE') throw new Error('Only ACTIVE review may project routing evidence');
 return {...review,quality_decision:qualityDecision,review_status:reviewStatus};
}

export function reviewedEvidence(event,review){
 if(!event?.id) throw new Error('Evidence required');
 const r=normalizeReview(review);
 if(r.evidence_event_id&&r.evidence_event_id!==event.id) throw new Error('Review/evidence mismatch');
 return {
  ...event,
  quality_state:r.quality_decision,
  provenance:{...(event.provenance||{}),direction:r.direction,reviewer_user_id:r.reviewer_user_id,review_id:r.id},
  review_projection:{active:true,review_id:r.id,reviewed_at:r.reviewed_at||null,rationale:r.rationale}
 };
}

export function effectiveEvidenceView(event,reviews=[]){
 if(!event?.id) throw new Error('Evidence required');
 const active=reviews.filter(r=>(!r.evidence_event_id||r.evidence_event_id===event.id)&&(r.review_status??'ACTIVE')==='ACTIVE');
 if(active.length>1) throw new Error('Multiple ACTIVE reviews for one evidence event');
 if(!active.length) return {...event,review_projection:{active:false},quality_state:event.quality_state==='WITHDRAWN'?'WITHDRAWN':'UNREVIEWED'};
 return reviewedEvidence(event,active[0]);
}

export function projectEvidenceLedger(events=[],reviews=[]){
 return events.map(event=>effectiveEvidenceView(event,reviews));
}

export function goldenPathEligibility(routeResult,reviewAccepted=false){
 const unresolved=(routeResult?.routes||[]).filter(r=>r.evidence_state==='DISCREPANT'||r.human_review_required);
 return {eligible_for_synthesis:reviewAccepted===true&&unresolved.length===0,requires_human_approval:true,unresolved_domains:unresolved.map(r=>r.route_code),total_score:null};
}
