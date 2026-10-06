// Golden Talent evidence router — deterministic prevalidation core.
// This module classifies evidence sufficiency/agreement; it never computes a total talent score.
export const ENGINE_VERSION='0.2-prevalidation';
export const DOMAINS=Object.freeze(['D1','D2','D3','D4','D5','D6']);
const usable=new Set(['USABLE','CONFLICTING']);
const independentSource=e=>String(e.source_type||'').trim();
const routeEligible=e=>e.domain_code&&['SUPPORTS','CONTRADICTS'].includes(e.provenance?.direction ?? e.evidence_value?.direction);
const polarity=e=>{
  const p=e.provenance?.direction ?? e.evidence_value?.direction ?? null;
  return ['SUPPORTS','CONTRADICTS','CONTEXTUALISES'].includes(p)?p:null;
};
export function classifyDomain(domain,events=[]){
  if(!DOMAINS.includes(domain)) throw new Error('Unknown Golden Talent domain: '+domain);
  const relevant=events.filter(e=>e&&e.domain_code===domain&&e.quality_state!=='WITHDRAWN');
  const routeUsable=relevant.filter(e=>usable.has(e.quality_state)&&routeEligible(e));
  const sourceClasses=[...new Set(routeUsable.map(independentSource).filter(Boolean))];
  const directions=new Set(routeUsable.map(polarity).filter(x=>x==='SUPPORTS'||x==='CONTRADICTS'));
  let evidence_state='INSUFFICIENT';
  if(sourceClasses.length===1) evidence_state='SINGLE_SOURCE';
  if(sourceClasses.length>=2) evidence_state=directions.size>1?'DISCREPANT':'CONVERGENT';
  if(routeUsable.some(e=>e.quality_state==='CONFLICTING')) evidence_state='DISCREPANT';
  const requires_more_evidence=evidence_state==='INSUFFICIENT'||evidence_state==='SINGLE_SOURCE'||evidence_state==='DISCREPANT';
  return {
    route_code:domain,
    evidence_state,
    source_count:sourceClasses.length,
    usable_event_count:routeUsable.length,
    contextual_event_count:relevant.filter(e=>!routeEligible(e)).length,
    evidence_event_ids:routeUsable.map(e=>e.id).filter(Boolean),
    requires_more_evidence,
    human_review_required:evidence_state==='DISCREPANT'||relevant.some(e=>e.quality_state==='LIMITED'||e.quality_state==='CONFLICTING'),
    rationale_codes:[
      evidence_state,
      ...(relevant.some(e=>e.quality_state==='LIMITED')?['LIMITED_EVIDENCE_PRESENT']:[]),
      ...(relevant.some(e=>e.quality_state==='CONFLICTING')?['CONFLICT_FLAG_PRESENT']:[])
    ]
  };
}
export function routeEvidence(events=[]){
  const routes=DOMAINS.map(d=>classifyDomain(d,events));
  const priority=routes
    .filter(r=>r.requires_more_evidence)
    .sort((a,b)=>{
      const rank={DISCREPANT:0,SINGLE_SOURCE:1,INSUFFICIENT:2,CONVERGENT:3};
      return rank[a.evidence_state]-rank[b.evidence_state]||DOMAINS.indexOf(a.route_code)-DOMAINS.indexOf(b.route_code);
    })
    .map(r=>r.route_code);
  return {
    engine_version:ENGINE_VERSION,
    total_score:null,
    normative_label:null,
    routes,
    next_evidence_priority:priority,
    human_review_required:routes.some(r=>r.human_review_required)
  };
}
