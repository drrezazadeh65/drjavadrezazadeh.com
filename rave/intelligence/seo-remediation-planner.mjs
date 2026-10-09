/** Offline SEO remediation planner: proposes safe patches but never changes production. */
const AUTO=new Set(['missing_title','missing_description','self_hreflang_missing','noindex_in_sitemap']);
const REVIEW=new Set(['canonical_mismatch','hreflang_not_reciprocal','missing_hreflang_target','duplicate_path','invalid_path','locale_mismatch']);
export function planSeoRemediation(audit,{titles={},descriptions={}}={}){
 if(!audit||!Array.isArray(audit.findings))throw new TypeError('Invalid SEO audit');
 return audit.findings.map((finding,index)=>{
  const {code,path}=finding;
  let proposal=null;
  if(code==='missing_title'&&typeof titles[path]==='string'&&titles[path].trim())proposal={operation:'set-title',value:titles[path].trim()};
  if(code==='missing_description'&&typeof descriptions[path]==='string'&&descriptions[path].trim())proposal={operation:'set-description',value:descriptions[path].trim()};
  if(code==='self_hreflang_missing'&&/^\/(fa|en)\//.test(path))proposal={operation:'set-self-hreflang',locale:path.split('/')[1],value:path};
  if(code==='noindex_in_sitemap')proposal={operation:'remove-from-sitemap',path};
  return {id:index+1,code,path,mode:AUTO.has(code)&&proposal?'candidate':REVIEW.has(code)?'manual-review':'needs-evidence',proposal,applied:false};
 });
}
export function remediationSummary(plan){
 if(!Array.isArray(plan))throw new TypeError('Expected plan');
 return {total:plan.length,candidates:plan.filter(x=>x.mode==='candidate').length,review:plan.filter(x=>x.mode==='manual-review').length,applied:0,productionTouched:false};
}
