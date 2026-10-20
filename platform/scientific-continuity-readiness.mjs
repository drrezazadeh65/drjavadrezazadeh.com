// Versioned scientific continuity preflight, Node-only. No PHP route, I/O or personal-data persistence.
// This is an evidence-workflow snapshot, NOT consent authorization, scoring or release approval.
import {routeEvidence, DOMAINS, ENGINE_VERSION} from './golden-talent-engine.mjs';
import {rcasToEvidence} from './rcas-evidence-bridge.mjs';
import {summariseBaharEvidence} from './bahar-engine.mjs';

export const SCIENTIFIC_CONTINUITY_VERSION='1.0.0';
const isoDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&
 !Number.isNaN(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
const deepFreeze=value=>{
 if(value&&typeof value==='object'&&!Object.isFrozen(value)){
  Object.values(value).forEach(deepFreeze);
  Object.freeze(value);
 }
 return value;
};
/** Detect longitudinal record ambiguities before a human interprets a BAHAR period.
 * Only anonymous counts and issue codes escape; no notes, references or identifiers.
 */
export function auditBaharTimeline(cycles=[]){
 if(!Array.isArray(cycles)||cycles.length>52)throw new TypeError('Bounded BAHAR history required');
 const issues=new Set(),weeks=new Set(),reviewedIds=new Set();
 let reviewedWeeks=0,openWeeks=0,observed=0,linked=0;
 for(const cycle of cycles){
  if(!cycle||typeof cycle!=='object'||Array.isArray(cycle)||
     !['OPEN','REVIEWED'].includes(cycle.status))throw new TypeError('Invalid BAHAR cycle');
  if(!isoDate(cycle.week_start))issues.add('INVALID_WEEK_DATE');
  else if(weeks.has(cycle.week_start))issues.add('DUPLICATE_WEEK');
  else weeks.add(cycle.week_start);
  const rows=cycle.observed_evidence;
  if(!Array.isArray(rows)||rows.length>100)throw new TypeError('Invalid BAHAR evidence list');
  if(cycle.status==='REVIEWED'){
   reviewedWeeks++;
   if(!cycle.reviewer_user_id||!cycle.interpretation||!cycle.adaptation)
    issues.add('REVIEW_METADATA_INCOMPLETE');
  }else openWeeks++;
  for(const item of rows){
   if(!item||typeof item!=='object'||Array.isArray(item))throw new TypeError('Invalid BAHAR evidence event');
   observed++;
   if(typeof item.id!=='string'||!item.id||item.id.length>128)issues.add('INVALID_EVIDENCE_ID');
   else if(cycle.status==='REVIEWED'){
    if(reviewedIds.has(item.id))issues.add('REUSED_REVIEWED_EVIDENCE_ID');
    reviewedIds.add(item.id);
   }
   if(item.source_evidence_event_id)linked++;
   if(item.observed_at!==undefined&&item.observed_at!==null&&
      (typeof item.observed_at!=='string'||!Number.isFinite(Date.parse(item.observed_at))))
    issues.add('INVALID_OBSERVATION_DATE');
  }
 }
 return deepFreeze({schema:'bahar-timeline-audit-v1',reviewed_week_count:reviewedWeeks,
  open_week_count:openWeeks,observation_count:observed,linked_observation_count:linked,
  issue_codes:[...issues].sort(),requires_human_review:true,
  independent_observations_verified:false,causal_trend_established:false});
}
/** Compose EXISTING RCAS, Golden Talent and BAHAR logic without a second scoring engine.
 * Consent, subject identity, reviewed provenance and reviewer authority MUST be
 * checked by the trusted backend. Untrusted caller flags can never satisfy them.
 */
export function buildScientificContinuitySnapshot({
 rcas_submission=null,bahar_cycles=[],additional_evidence_events=[]
}={}){
 if(!Array.isArray(additional_evidence_events)||additional_evidence_events.length>500)
  throw new TypeError('Bounded evidence event list required');
 const rcas=rcas_submission===null?[]:rcasToEvidence(rcas_submission);
 const timeline=auditBaharTimeline(bahar_cycles);
 const bahar=summariseBaharEvidence(bahar_cycles);
 const route=routeEvidence([...rcas,...additional_evidence_events]);
 const issues=new Set(timeline.issue_codes);
 if(!rcas.length)issues.add('RCAS_DESCRIPTIVE_EVIDENCE_MISSING');
 if(timeline.reviewed_week_count===0)issues.add('BAHAR_REVIEWED_HISTORY_MISSING');
 if(bahar.events_without_source_link>0)issues.add('BAHAR_PROVENANCE_UNVERIFIED');
 if(route.integrity.accounting.rejected>0)issues.add('EVIDENCE_INPUT_REJECTED');
 if(route.routes.some(r=>r.evidence_state==='DISCREPANT'))issues.add('DISCREPANT_EVIDENCE_REVIEW');
 if(route.routes.some(r=>r.evidence_state==='INSUFFICIENT'))issues.add('DOMAIN_EVIDENCE_INSUFFICIENT');
 // Even a CONVERGENT research state does not establish source authenticity,
 // professional consent, psychometric validity, payment eligibility or release.
 issues.add('SERVER_AUTHORIZATION_AND_CONSENT_UNVERIFIED');
 issues.add('PROFESSIONAL_RELEASE_REQUIRED');
 const domains=DOMAINS.map(code=>{
  const d=route.routes.find(r=>r.route_code===code);
  return {domain:code,evidence_state:d.evidence_state,
   reviewed_routable_events:d.usable_event_count,
   pending_contextual_events:d.contextual_event_count,
   human_review_required:d.human_review_required||d.requires_more_evidence};
 });
 return deepFreeze({
  schema:'scientific-continuity-preflight-v1',version:SCIENTIFIC_CONTINUITY_VERSION,
  scientific_status:'PREVALIDATION',golden_talent_engine_version:ENGINE_VERSION,
  rcas:{submitted:rcas_submission!==null,
   supplied_response_count:rcas_submission===null?0:rcas_submission.responses.length,
   descriptive_event_count:rcas.length,all_bridge_events_unreviewed:true},
  bahar:{reviewed_week_count:timeline.reviewed_week_count,
   open_week_count:timeline.open_week_count,
   observation_count:timeline.observation_count,
   linked_observation_count:timeline.linked_observation_count,
   repeated_source_references_across_weeks:bahar.source_references_repeated_across_weeks,
   independent_source_corroboration_established:false,longitudinal_trend_ready:false},
  golden_talent:{domains,contextual_event_count:route.integrity.accounting.contextual,
   rejected_event_count:route.integrity.accounting.rejected,
   balanced_accounting:route.integrity.accounting.balanced},
  issue_codes:[...issues].sort(),privacy:{raw_record_exported:false,
   raw_response_exported:false,no_storage_or_network_io:true,
   backend_identity_verification_required:true,backend_consent_verification_required:true},
  total_score:null,normative_label:null,career_prescription:null,causal_intervention_effect:null,
  automatic_golden_path_release:false,automatic_purchase_eligibility:false,
  release_authorized:false,needs_independent_professional_review:true
 });
}
