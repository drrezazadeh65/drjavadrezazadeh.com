/** Prioritize verified indexing gaps without claiming live search data. */
const weights=Object.freeze({service:5,product:5,research:4,book:4,homepage:4,article:3,other:1});
export function prioritizeDiscoveryRepairs({pages=[],indexation}={}){
 if(!Array.isArray(pages)||!indexation||!Array.isArray(indexation.findings))throw new TypeError('Page inventory and evidence audit required');
 const issues=indexation.findings.filter(f=>['not-indexed','indexation-unverified'].includes(f.code));
 const pageMap=new Map(pages.filter(p=>typeof p?.path==='string').map(p=>[p.path,p]));
 const actions=issues.map(issue=>{
  const page=pageMap.get(issue.path),kind=page?.kind??'other';
  const verifiedGap=issue.code==='not-indexed';
  const impact=weights[kind]??weights.other;
  return {path:issue.path,source:issue.source,kind,priorityScore:impact*(verifiedGap?2:1),priority:verifiedGap?'investigate-indexing':'obtain-indexing-evidence',evidenceLevel:verifiedGap?'provider-observation':'unknown',nextAction:verifiedGap?'inspect coverage, canonical, robots and page quality':'obtain verified Search Console or Bing Webmaster evidence',automatedIndexingClaim:false};
 }).sort((a,b)=>b.priorityScore-a.priorityScore||a.path.localeCompare(b.path)||a.source.localeCompare(b.source));
 return {actions,readyForAutomaticSubmission:false,liveSearchConnected:false,productionTouched:false};
}
