// Persistence boundary for BAHAR longitudinal cycles.
// Structured observations live in bahar_learning_evidence; bahar_weekly_cycle.observed_evidence is legacy display text only.

const EVIDENCE_TYPES=new Set(['RETRIEVAL_GAP','ERROR','PERFORMANCE_SAMPLE','FEEDBACK','OBSERVATION','OTHER']);

export function planWeeklyCycleInsert({cycle_id,portfolio_id,cycle}={}){
 if(!cycle_id||!portfolio_id||!cycle?.week_start||!String(cycle.goal_text||'').trim()||!String(cycle.planned_action||'').trim()) throw new Error('Versioned BAHAR cycle identity and human plan required');
 if(cycle.status!=='OPEN') throw new Error('New persisted cycle must be OPEN');
 return {
  weekly_cycle:{
   id:cycle_id,portfolio_id,week_start:cycle.week_start,goal_text:cycle.goal_text,
   planned_action:cycle.planned_action,status:'OPEN',interpretation:null,adaptation:null,
   reviewer_user_id:null,reviewed_at:null
  },
  observed_evidence_legacy_write:false,
  evidence_source_of_truth:'bahar_learning_evidence'
 };
}

export function planWeeklyEvidenceInsert({portfolio_id,weekly_cycle_id,evidence}={}){
 if(!portfolio_id||!weekly_cycle_id||!evidence?.id||!String(evidence.description||'').trim()) throw new Error('Traceable BAHAR evidence identity required');
 const evidence_type=evidence.evidence_type||evidence.type||'OTHER';
 if(!EVIDENCE_TYPES.has(evidence_type)) throw new Error('Unsupported BAHAR evidence type');
 return {
  id:evidence.id,
  portfolio_id,
  weekly_cycle_id,
  evidence_type,
  description:evidence.description,
  interpretation:evidence.interpretation||null,
  next_action:evidence.next_action||null,
  observed_at:evidence.observed_at||null,
  source_evidence_event_id:evidence.source_evidence_event_id||null
 };
}

export function planWeeklyCycleReview({cycle_id,interpretation,adaptation,reviewer_user_id,reviewed_at,evidence_count}={}){
 if(!cycle_id||!String(interpretation||'').trim()||!String(adaptation||'').trim()||!reviewer_user_id||!reviewed_at) throw new Error('Human review persistence context required');
 if(!Number.isInteger(evidence_count)||evidence_count<1) throw new Error('Persisted linked evidence required before BAHAR review');
 return {id:cycle_id,status:'REVIEWED',interpretation,adaptation,reviewer_user_id,reviewed_at};
}

export function hydrateWeeklyCycle(row={},evidenceRows=[]){
 if(!row.id||!row.portfolio_id) throw new Error('Persisted BAHAR cycle row required');
 const observed_evidence=evidenceRows
  .filter(e=>e.weekly_cycle_id===row.id&&e.portfolio_id===row.portfolio_id)
  .map(e=>({id:e.id,type:e.evidence_type,description:e.description,observed_at:e.observed_at||null,source_evidence_event_id:e.source_evidence_event_id||null}));
 return {
  week_start:row.week_start,
  goal_text:row.goal_text,
  planned_action:row.planned_action,
  observed_evidence,
  interpretation:row.interpretation||null,
  adaptation:row.adaptation||null,
  reviewer_user_id:row.reviewer_user_id||null,
  status:row.status
 };
}
