// BAHAR longitudinal development engine — book-grounded formative evidence.
// Never interpret missing evidence as weakness or let software issue an
// occupational/clinical diagnosis. Personal records must remain in an
// authorised backend; this module only makes pure, testable decisions.
const DECISIONS=new Set(['CONTINUE','CHANGE','PAUSE','STOP','INVESTIGATE']);
const EVIDENCE_TYPES=new Set(['RETRIEVAL_GAP','ERROR','PERFORMANCE_SAMPLE','FEEDBACK','OBSERVATION','OTHER']);
const REVIEW_TYPES=new Set(['FOUR_WEEK','EIGHT_WEEK','THIRTY_DAY_STARTER','AD_HOC']);
const safeText=(value,max=2000)=>typeof value==='string'&&value.trim().length>0&&value.trim().length<=max;
function isoDate(value){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const date=new Date(value+'T00:00:00Z');
 return !Number.isNaN(date.getTime())&&date.toISOString().slice(0,10)===value;
}
function evidenceRows(cycle){
 return Array.isArray(cycle?.observed_evidence)?cycle.observed_evidence:[];
}
// This is a book-derived scaffold, never a personalised assessment.
export const BAHAR_MODEL=Object.freeze({
 status:'PREVALIDATION',diagnostic_scoring:false,automatic_golden_path_update:false,
 study_method:Object.freeze(['RETRIEVAL','GAP_DETECTION','REMEDIATION','CONSOLIDATION']),
 action_cycle:Object.freeze(['RECOGNISE_CONTEXT','CHOOSE_ACTION','ACT','MONITOR_EVIDENCE','INTERPRET_GAP','REVISE','RETURN_TO_ACTION']),
 portfolio:Object.freeze(['BASELINE_SNAPSHOT','EIGHT_WEEK_COMPASS','WEEKLY_BAHAR_CYCLE','LEARNING_EVIDENCE_LOG','FOUR_WEEK_REVIEW','THIRTY_DAY_STARTER'])
});
export function createEightWeekCompass({goal,success_evidence,context_constraints='',baseline_reference=null,author_user_id=null}={}){
 if(!safeText(goal)||!safeText(success_evidence))throw new Error('Human-authored goal and observable success evidence required');
 if(context_constraints!==''&&!safeText(context_constraints))throw new Error('Context must be explicit and bounded');
 return {period_weeks:8,goal,success_evidence,context_constraints,
  baseline_reference:baseline_reference||null,author_user_id:author_user_id||null,
  interpretation_status:'UNREVIEWED',automatic_plan_adoption:false,
  requires_contextual_human_review:true};
}
export function createThirtyDayStarter(){
 return {
  status:'EDUCATIONAL_TEMPLATE_ONLY',not_personalised:true,not_auto_saved:true,
  weeks:[
   {week:1,focus:'BASELINE_AND_OBSERVATION',activity:'Notice context, present practices and available evidence'},
   {week:2,focus:'ACTION_AND_ENVIRONMENT',activity:'Choose a small, observable action and document access or support barriers'},
   {week:3,focus:'RETRIEVAL_FEEDBACK_ERROR',activity:'Collect retrieval, feedback or performance evidence without a global score'},
   {week:4,focus:'REVIEW_AND_REVISION',activity:'Review what changed, what remains uncertain and whether to revise the plan'}
  ]
 };
}
export function createWeeklyCycle({week_start,goal_text,planned_action}={}){
 if(!isoDate(week_start)||!safeText(goal_text)||!safeText(planned_action))
  throw new Error('Valid dated human-authored weekly plan required');
 return {week_start,goal_text,planned_action,observed_evidence:[],
  interpretation:null,adaptation:null,status:'OPEN'};
}
export function addWeeklyEvidence(cycle,evidence){
 if(!cycle||cycle.status!=='OPEN')throw new Error('Open weekly cycle required');
 const rows=evidenceRows(cycle);
 if(rows.length>=100)throw new Error('Evidence cap reached; close and review the cycle');
 if(!safeText(evidence?.id,128)||!safeText(evidence?.description))
  throw new Error('Traceable evidence required');
 const type=evidence.evidence_type||evidence.type||'OTHER';
 if(!EVIDENCE_TYPES.has(type))throw new Error('Unsupported evidence type');
 if(rows.some(row=>row.id===evidence.id))throw new Error('Duplicate evidence identity');
 if(evidence.observed_at!==undefined&&evidence.observed_at!==null &&
   (typeof evidence.observed_at!=='string'||Number.isNaN(Date.parse(evidence.observed_at))))
  throw new Error('Evidence observation date is invalid');
 // Missing provenance stays visible as UNKNOWN. It is never silently
 // promoted to an independently verified performance observation.
 const provenance=evidence.source_evidence_event_id||null;
 if(provenance!==null&&!safeText(provenance,128))throw new Error('Invalid provenance');
 const entry={id:evidence.id,type,description:evidence.description,
  observed_at:evidence.observed_at||null,
  source_evidence_event_id:provenance,
  provenance_status:provenance?'LINKED_UNVERIFIED':'UNSPECIFIED'};
 return {...cycle,observed_evidence:[...rows.map(row=>({...row})),entry]};
}
export function summariseBaharEvidence(cycles=[]){
 if(!Array.isArray(cycles)||cycles.length>52)throw new Error('Bounded weekly evidence history required');
 const reviewed=cycles.filter(c=>c?.status==='REVIEWED');
 const observations=reviewed.flatMap(c=>evidenceRows(c).map(e=>({week_start:c.week_start,...e})));
 const types={};
 for(const e of observations)types[e.type||'OTHER']=(types[e.type||'OTHER']||0)+1;
 const distinctWeeks=new Set(reviewed.filter(c=>isoDate(c.week_start)).map(c=>c.week_start));
 const missingProvenance=observations.filter(e=>!e.source_evidence_event_id).length;
 // A linked source can be observed in several weeks. Repetition provides
 // chronology, NOT independent corroboration, a causal effect or a score.
 const sourceWeeks=new Map();
 for(const e of observations){
  if(typeof e.source_evidence_event_id!=='string'||!e.source_evidence_event_id)continue;
  if(!sourceWeeks.has(e.source_evidence_event_id))sourceWeeks.set(e.source_evidence_event_id,new Set());
  if(isoDate(e.week_start))sourceWeeks.get(e.source_evidence_event_id).add(e.week_start);
 }
 const repeatedSourceReferences=[...sourceWeeks.values()].filter(weeks=>weeks.size>1).length;
 return {
  cycle_count:cycles.length,reviewed_cycle_count:reviewed.length,
  observed_event_count:observations.length,distinct_reviewed_weeks:distinctWeeks.size,
  evidence_types:types,events_without_source_link:missingProvenance,
  distinct_linked_source_count:sourceWeeks.size,
  source_references_repeated_across_weeks:repeatedSourceReferences,
  independent_source_corroboration_established:false,
  context_and_opportunity_equivalence_established:false,
  causal_intervention_effect:null,
  observation_quality:observations.length===0?'INSUFFICIENT':missingProvenance>0?'PROVENANCE_REVIEW_REQUIRED':'SOURCE_LINKED_NOT_INDEPENDENTLY_VERIFIED',
  longitudinal_trend_ready:false, // Comparability, context and independent review are not established by counts.
  normative_score:null,statistical_confidence:null,
  human_interpretation_required:true,
  limitation:'Descriptive longitudinal coverage only: repeated source references are not independent, and no causal trend, percentile or talent label is inferred.'
 };
}
export function interpretWeeklyCycle(cycle,{interpretation,adaptation,reviewer_user_id}={}){
 if(cycle?.status!=='OPEN'||!evidenceRows(cycle).length)
  throw new Error('Open cycle with evidence required before interpretation');
 if(!safeText(interpretation)||!safeText(adaptation)||!safeText(reviewer_user_id,128))
  throw new Error('Human interpretation and adaptation required');
 return {...cycle,observed_evidence:evidenceRows(cycle).map(x=>({...x})),
  interpretation,adaptation,reviewer_user_id,status:'REVIEWED'};
}
export function createPeriodReview({review_type,cycles=[],decision,rationale,next_step,reviewer_user_id}={}){
 if(!REVIEW_TYPES.has(review_type))throw new Error('Valid review type required');
 if(!Array.isArray(cycles)||cycles.length>52)throw new Error('Bounded review history required');
 if(!DECISIONS.has(decision)||!safeText(rationale)||!safeText(reviewer_user_id,128))
  throw new Error('Human review decision required');
 const coverage=summariseBaharEvidence(cycles);
 if(coverage.reviewed_cycle_count===0||coverage.observed_event_count===0)
  throw new Error('No reviewed traceable evidence available; retain draft status');
 const reviewed=cycles.filter(c=>c?.status==='REVIEWED');
 const ids=reviewed.flatMap(c=>evidenceRows(c).map(e=>e.id));
 if(ids.some(id=>!safeText(id,128))||new Set(ids).size!==ids.length)
  throw new Error('Review requires unique, traceable evidence identities');
 return {review_type,decision,rationale,next_step:safeText(next_step)?next_step:null,
  reviewer_user_id,reviewed_cycle_count:reviewed.length,evidence_ids:ids,
  evidence_coverage:coverage,observed_week_count:coverage.distinct_reviewed_weeks,
  incomplete_period_warning:(review_type==='FOUR_WEEK'&&coverage.distinct_reviewed_weeks<4)||
    (review_type==='EIGHT_WEEK'&&coverage.distinct_reviewed_weeks<8)||
    (review_type==='THIRTY_DAY_STARTER'&&coverage.distinct_reviewed_weeks<4),
  golden_path_update_required:decision==='CHANGE'||decision==='INVESTIGATE',
  automatic_golden_path_update:false,decision_is_human_authored:true,
  prediction:null,global_talent_score:null};
}
export function goldenPathReassessmentRequest(periodReview){
 if(!periodReview?.golden_path_update_required)return null;
 if(!periodReview?.decision_is_human_authored||!Array.isArray(periodReview.evidence_ids)||
    periodReview.evidence_ids.length===0)
  throw new Error('Auditable human reviewed evidence required for reassessment');
 return {reason:periodReview.decision,evidence_ids:[...periodReview.evidence_ids],
  requires_new_route_run:true,requires_human_review:true,automatic_release:false};
}
