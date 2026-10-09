/** Deterministic in-memory SEO patch sandbox; never performs I/O. */
const SUPPORTED=new Set(['set-title','set-description','set-self-hreflang','remove-from-sitemap']);
const own=o=>JSON.parse(JSON.stringify(o));
export function applySeoPlanInSandbox(pages,plan){
 if(!Array.isArray(pages)||!Array.isArray(plan))throw new TypeError('Expected pages and plan arrays');
 const before=own(pages),after=own(pages),log=[];
 for(const step of plan){
  if(step?.mode!=='candidate'||!step.proposal||!SUPPORTED.has(step.proposal.operation)){log.push({id:step?.id??null,status:'skipped'});continue}
  const matches=after.filter(p=>p.path===step.path);
  if(matches.length!==1){log.push({id:step.id,status:'skipped',reason:'ambiguous-or-missing-path'});continue}
  const page=matches[0],p=step.proposal;
  if(p.operation==='set-title'&&typeof p.value==='string'&&p.value.trim())page.title=p.value.trim();
  else if(p.operation==='set-description'&&typeof p.value==='string'&&p.value.trim())page.description=p.value.trim();
  else if(p.operation==='set-self-hreflang'&&p.value===page.path&&p.locale===page.locale&&['fa','en'].includes(p.locale))page.hreflang={...page.hreflang,[p.locale]:page.path};
  else if(p.operation==='remove-from-sitemap'&&page.indexable===false)page.inSitemap=false;
  else {log.push({id:step.id,status:'skipped',reason:'failed-precondition'});continue}
  log.push({id:step.id,status:'simulated'});
 }
 return {before,after,log,productionTouched:false,rollbackSnapshot:before};
}
export function rollbackSeoSandbox(result){
 if(!result||!Array.isArray(result.rollbackSnapshot))throw new TypeError('Invalid sandbox result');
 return own(result.rollbackSnapshot);
}
