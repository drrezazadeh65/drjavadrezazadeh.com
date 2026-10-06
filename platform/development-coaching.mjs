import fs from 'node:fs';

export const policy=JSON.parse(fs.readFileSync(new URL('./development-coaching-policy.json',import.meta.url),'utf8'));

const nonEmpty=v=>String(v??'').trim();
const unique=a=>[...new Set(a||[])];

export function proposeStudyPlanRevision({
  plan_id,current_version=0,trigger_type,goal_snapshot=[],weekly_capacity_minutes=null,
  rationale,proposed_by,ai_assisted=false
}={}){
  if(!plan_id) throw new Error('Study plan required');
  if(!policy.study_plan.allowed_revision_triggers.includes(trigger_type)) throw new Error('Unsupported study-plan revision trigger');
  if(!nonEmpty(rationale)) throw new Error('Revision rationale required');
  if(!proposed_by) throw new Error('Revision proposer required');
  if(!Number.isInteger(current_version)||current_version<0) throw new Error('Valid current version required');
  if(weekly_capacity_minutes!==null&&(!Number.isInteger(weekly_capacity_minutes)||weekly_capacity_minutes<0)) throw new Error('Weekly capacity must be a non-negative integer');
  return {
    plan_id,
    version_number:current_version+1,
    trigger_type,
    goal_snapshot:Array.isArray(goal_snapshot)?goal_snapshot:[],
    weekly_capacity_minutes,
    rationale:String(rationale).trim(),
    proposed_by,
    ai_assisted:Boolean(ai_assisted),
    status:'DRAFT',
    human_review_required:true,
    automatic_activation:false
  };
}

export function reviewStudyPlanRevision({revision,reviewer_user_id,decision,review_note}={}){
  if(revision?.status!=='DRAFT') throw new Error('Draft study-plan revision required');
  if(!reviewer_user_id) throw new Error('Human reviewer required');
  if(!['APPROVE','RETURN','REJECT'].includes(decision)) throw new Error('Unsupported study-plan review decision');
  if(!nonEmpty(review_note)) throw new Error('Review note required');
  return {
    ...revision,
    status:decision==='APPROVE'?'ACTIVE':decision==='RETURN'?'DRAFT':'CANCELLED',
    review:{reviewer_user_id,decision,review_note:String(review_note).trim()},
    automatic_activation:false,
    human_approved:decision==='APPROVE'
  };
}

export function analyseTrajectory(measurements=[]){
  if(!Array.isArray(measurements)||measurements.length<policy.trajectory.minimum_comparable_observations) throw new Error('At least two comparable observations required');
  const key=nonEmpty(measurements[0]?.comparability_key);
  if(!key||measurements.some(x=>nonEmpty(x?.comparability_key)!==key)) throw new Error('One comparability key required');
  const cleaned=measurements.map(x=>{
    if(typeof x?.value_numeric!=='number'||!Number.isFinite(x.value_numeric)) throw new Error('Numeric comparable observation required');
    if(!x.observed_at||Number.isNaN(Date.parse(x.observed_at))) throw new Error('Observation date required');
    if(!nonEmpty(x.source_type)) throw new Error('Observation source required');
    if(!x.provenance||typeof x.provenance!=='object') throw new Error('Observation provenance required');
    return {...x};
  }).sort((a,b)=>Date.parse(a.observed_at)-Date.parse(b.observed_at));
  const first=cleaned[0],last=cleaned.at(-1);
  const delta=last.value_numeric-first.value_numeric;
  return {
    comparability_key:key,
    observation_count:cleaned.length,
    first:{value_numeric:first.value_numeric,observed_at:first.observed_at,source_type:first.source_type},
    last:{value_numeric:last.value_numeric,observed_at:last.observed_at,source_type:last.source_type},
    numeric_delta:delta,
    direction:delta===0?'STABLE':delta>0?'INCREASE':'DECREASE',
    interpretation:'DESCRIPTIVE_ONLY',
    improving:null,
    worsening:null,
    requires_contextual_interpretation:true,
    source_records:cleaned
  };
}

export function createDecisionExplanation({
  educational_record_id,recommendation_type,recommendation_reference=null,
  supporting_evidence_ids=[],counterevidence_ids=[],contextual_constraints=[],
  explanation_text,uncertainty_text,reviewer_user_id=null,consequential=true
}={}){
  if(!educational_record_id||!nonEmpty(recommendation_type)) throw new Error('Decision context required');
  if(!supporting_evidence_ids.length) throw new Error('Supporting evidence required');
  if(!nonEmpty(explanation_text)||!nonEmpty(uncertainty_text)) throw new Error('Explanation and uncertainty required');
  if(consequential&&!reviewer_user_id) throw new Error('Human reviewer required for consequential recommendation');
  return {
    educational_record_id,
    recommendation_type,
    recommendation_reference,
    supporting_evidence_ids:unique(supporting_evidence_ids),
    counterevidence_ids:unique(counterevidence_ids),
    contextual_constraints:[...contextual_constraints],
    explanation_text:String(explanation_text).trim(),
    uncertainty_text:String(uncertainty_text).trim(),
    reviewer_user_id,
    consequential:Boolean(consequential),
    status:consequential?'REVIEW_REQUIRED':'DRAFT',
    admission_guarantee:false,
    automatic_major_prescription:false,
    automatic_career_prescription:false
  };
}

export function approveDecisionExplanation({explanation,reviewer_user_id,decision,review_note}={}){
  if(explanation?.status!=='REVIEW_REQUIRED') throw new Error('Review-required explanation expected');
  if(!reviewer_user_id||!['APPROVE','RETURN','VOID'].includes(decision)||!nonEmpty(review_note)) throw new Error('Human review decision required');
  return {
    ...explanation,
    reviewer_user_id,
    status:decision==='APPROVE'?'APPROVED':decision==='RETURN'?'DRAFT':'VOID',
    review_note:String(review_note).trim(),
    human_approved:decision==='APPROVE'
  };
}

export function createCoachingReview({
  enrollment,reviewer_user_id,period_start=null,period_end=null,
  evidence_summary,interpretation,decision,next_action,next_review_at=null
}={}){
  if(!['ACTIVE','PAUSED'].includes(enrollment?.status)) throw new Error('Active or paused coaching enrollment required');
  if(!reviewer_user_id) throw new Error('Human coaching reviewer required');
  if(!policy.coaching.review_decisions.includes(decision)) throw new Error('Unsupported coaching decision');
  if(!nonEmpty(evidence_summary)||!nonEmpty(interpretation)||!nonEmpty(next_action)) throw new Error('Evidence, interpretation and next action required');
  return {
    coaching_enrollment_id:enrollment.id,
    reviewer_user_id,
    period_start,
    period_end,
    evidence_summary:String(evidence_summary).trim(),
    interpretation:String(interpretation).trim(),
    decision,
    next_action:String(next_action).trim(),
    next_review_at,
    human_reviewed:true,
    payment_determines_judgement:false
  };
}
