import {DOMAINS,classifyDomain} from './golden-talent-engine.mjs';

const DIRECTIONS=new Set(['SUPPORTS','CONTRADICTS','CONTEXTUALISES']);
const REVIEWED=e=>Boolean(e?.provenance?.review_id)&&e?.review_projection?.active===true;

function eventTime(e){
 const raw=e?.observed_at||e?.recorded_at||e?.review_projection?.reviewed_at||null;
 const t=raw?Date.parse(raw):NaN;
 return Number.isFinite(t)?t:null;
}

export function analyseEvidence(events=[],{now=new Date(),stale_after_days=365}={}){
 if(!(now instanceof Date)||Number.isNaN(now.getTime())) throw new Error('Valid analysis time required');
 if(!Number.isInteger(stale_after_days)||stale_after_days<1) throw new Error('Operational freshness window must be a positive integer');
 const active=(events||[]).filter(e=>e&&e.quality_state!=='WITHDRAWN');
 const reviewed=active.filter(REVIEWED);
 const cutoff=now.getTime()-stale_after_days*86400000;
 const domains=DOMAINS.map(domain=>{
   const allDomain=active.filter(e=>e.domain_code===domain);
   const domainReviewed=reviewed.filter(e=>e.domain_code===domain);
   const route=classifyDomain(domain,domainReviewed);
   const source_classes=[...new Set(domainReviewed.map(e=>String(e.source_type||'').trim()).filter(Boolean))];
   const directions={SUPPORTS:0,CONTRADICTS:0,CONTEXTUALISES:0};
   for(const e of domainReviewed){const d=e.provenance?.direction;if(DIRECTIONS.has(d)) directions[d]++;}
   const stale_event_ids=domainReviewed.filter(e=>{const t=eventTime(e);return t!==null&&t<cutoff;}).map(e=>e.id).filter(Boolean);
   const undated_event_ids=domainReviewed.filter(e=>eventTime(e)===null).map(e=>e.id).filter(Boolean);
   const limited_event_ids=domainReviewed.filter(e=>e.quality_state==='LIMITED').map(e=>e.id).filter(Boolean);
   const conflicting_event_ids=domainReviewed.filter(e=>e.quality_state==='CONFLICTING').map(e=>e.id).filter(Boolean);
   const provenance_gap_event_ids=domainReviewed.filter(e=>!e.source_type||!e.provenance?.review_id||(!e.source_reference_id&&!e.instrument_code)).map(e=>e.id).filter(Boolean);
   const context_event_ids=allDomain.filter(e=>e.source_type==='CONTEXT'||e.provenance?.direction==='CONTEXTUALISES').map(e=>e.id).filter(Boolean);
   const flags=[];
   if(route.evidence_state==='DISCREPANT') flags.push('EVIDENCE_DISCREPANCY');
   if(route.evidence_state==='SINGLE_SOURCE') flags.push('SOURCE_DIVERSITY_GAP');
   if(route.evidence_state==='INSUFFICIENT') flags.push('EVIDENCE_GAP');
   if(stale_event_ids.length) flags.push('STALE_EVIDENCE_PRESENT');
   if(undated_event_ids.length) flags.push('UNDATED_EVIDENCE_PRESENT');
   if(limited_event_ids.length) flags.push('LIMITED_EVIDENCE_PRESENT');
   if(conflicting_event_ids.length) flags.push('CONFLICTING_QUALITY_PRESENT');
   if(provenance_gap_event_ids.length) flags.push('PROVENANCE_GAP');
   if(context_event_ids.length) flags.push('CONTEXT_PRESENT');
   return {
     domain,evidence_state:route.evidence_state,reviewed_event_count:domainReviewed.length,unreviewed_event_count:allDomain.length-domainReviewed.length,
     source_classes,directions,stale_event_ids,undated_event_ids,limited_event_ids,conflicting_event_ids,provenance_gap_event_ids,context_event_ids,
     requires_more_evidence:route.requires_more_evidence,human_review_required:route.human_review_required||flags.includes('PROVENANCE_GAP'),flags
   };
 });
 const review_queue=domains.filter(d=>d.human_review_required||d.flags.includes('PROVENANCE_GAP')).sort((a,b)=>{
   const rank=x=>x.flags.includes('EVIDENCE_DISCREPANCY')?0:x.flags.includes('CONFLICTING_QUALITY_PRESENT')?1:x.flags.includes('PROVENANCE_GAP')?2:x.flags.includes('LIMITED_EVIDENCE_PRESENT')?3:4;
   return rank(a)-rank(b)||DOMAINS.indexOf(a.domain)-DOMAINS.indexOf(b.domain);
 }).map(d=>({domain:d.domain,reason_codes:d.flags.filter(x=>['EVIDENCE_DISCREPANCY','CONFLICTING_QUALITY_PRESENT','PROVENANCE_GAP','LIMITED_EVIDENCE_PRESENT'].includes(x))}));
 return {
   analysis_kind:'WORKFLOW_EVIDENCE_ANALYTICS',operational_freshness_window_days:stale_after_days,domains,review_queue,
   total_score:null,talent_rank:null,normative_label:null,career_fit_score:null,automatic_career_prescription:false
 };
}

export function nextEvidencePlan(analysis={}){
 const items=[];
 for(const d of analysis.domains||[]){
   const reasons=[]; let action='NO_AUTOMATIC_ACTION'; let priority='ROUTINE';
   if(d.flags?.includes('EVIDENCE_DISCREPANCY')){action='HUMAN_DISCREPANCY_REVIEW';priority='REVIEW_FIRST';reasons.push('EVIDENCE_DISCREPANCY');}
   else if(d.flags?.includes('PROVENANCE_GAP')){action='REPAIR_PROVENANCE_BEFORE_INTERPRETATION';priority='REVIEW_FIRST';reasons.push('PROVENANCE_GAP');}
   else if(d.evidence_state==='INSUFFICIENT'){action='COLLECT_TRACEABLE_EVIDENCE';priority='EVIDENCE_NEXT';reasons.push('EVIDENCE_GAP');}
   else if(d.evidence_state==='SINGLE_SOURCE'){action='SEEK_INDEPENDENT_SOURCE';priority='EVIDENCE_NEXT';reasons.push('SOURCE_DIVERSITY_GAP');}
   else if(d.stale_event_ids?.length){action='CONSIDER_CURRENT_EVIDENCE_UPDATE';priority='MAINTENANCE';reasons.push('STALE_EVIDENCE_PRESENT');}
   else if(d.context_event_ids?.length){action='PRESERVE_CONTEXT_IN_INTERPRETATION';priority='ROUTINE';reasons.push('CONTEXT_PRESENT');}
   if(action!=='NO_AUTOMATIC_ACTION') items.push({domain:d.domain,action,workflow_priority:priority,reason_codes:reasons,not_a_talent_rank:true});
 }
 return {items,total_score:null,automatic_module_unlock:false,automatic_career_prescription:false,human_judgement_preserved:true};
}
