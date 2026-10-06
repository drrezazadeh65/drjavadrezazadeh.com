// BAHAR longitudinal development engine.
// Keeps observation, interpretation and adaptation separate and never rewrites Golden Path automatically.
const DECISIONS=new Set(['CONTINUE','CHANGE','PAUSE','STOP','INVESTIGATE']);
export function createWeeklyCycle({week_start,goal_text,planned_action}={}){
 if(!week_start||!String(goal_text||'').trim()||!String(planned_action||'').trim()) throw new Error('Human-authored weekly plan required');
 return {week_start,goal_text,planned_action,observed_evidence:[],interpretation:null,adaptation:null,status:'OPEN'};
}
export function addWeeklyEvidence(cycle,evidence){
 if(!cycle||cycle.status!=='OPEN') throw new Error('Open weekly cycle required');
 if(!evidence?.id||!String(evidence.description||'').trim()) throw new Error('Traceable evidence required');
 return {...cycle,observed_evidence:[...(cycle.observed_evidence||[]),{id:evidence.id,type:evidence.evidence_type||'OTHER',description:evidence.description,observed_at:evidence.observed_at||null}]};
}
export function interpretWeeklyCycle(cycle,{interpretation,adaptation,reviewer_user_id}={}){
 if(!cycle?.observed_evidence?.length) throw new Error('Evidence required before interpretation');
 if(!String(interpretation||'').trim()||!String(adaptation||'').trim()||!reviewer_user_id) throw new Error('Human interpretation and adaptation required');
 return {...cycle,interpretation,adaptation,reviewer_user_id,status:'REVIEWED'};
}
export function createPeriodReview({review_type,cycles=[],decision,rationale,next_step,reviewer_user_id}={}){
 if(!['FOUR_WEEK','EIGHT_WEEK','THIRTY_DAY_STARTER','AD_HOC'].includes(review_type)) throw new Error('Valid review type required');
 if(!DECISIONS.has(decision)||!String(rationale||'').trim()||!reviewer_user_id) throw new Error('Human review decision required');
 const reviewed=cycles.filter(c=>c.status==='REVIEWED');
 return {review_type,decision,rationale,next_step:next_step||null,reviewer_user_id,reviewed_cycle_count:reviewed.length,evidence_ids:reviewed.flatMap(c=>c.observed_evidence.map(e=>e.id)),golden_path_update_required:decision==='CHANGE'||decision==='INVESTIGATE',automatic_golden_path_update:false};
}
export function goldenPathReassessmentRequest(periodReview){
 if(!periodReview?.golden_path_update_required) return null;
 return {reason:periodReview.decision,evidence_ids:periodReview.evidence_ids,requires_new_route_run:true,requires_human_review:true,automatic_release:false};
}
