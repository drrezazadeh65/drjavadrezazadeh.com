/** Offline AI-search discoverability audit for bilingual academic pages. */
const has=v=>typeof v==='string'&&v.trim().length>0;
const allowedTypes=new Set(['Person','Organization','EducationalOrganization','Article','ScholarlyArticle','Service','Book','WebPage']);
export function auditAiDiscoverability(pages=[]){
 if(!Array.isArray(pages))throw new TypeError('Expected pages');
 const findings=[],seen=new Set();
 for(const page of pages){
  const path=page?.path??null,locale=page?.locale;
  if(!has(path)||!/^\/(fa|en)\//.test(path)||!['fa','en'].includes(locale)||!path.startsWith('/'+locale+'/')){findings.push({path,code:'invalid-localized-path'});continue}
  if(seen.has(path))findings.push({path,code:'duplicate-path'});seen.add(path);
  if(page.indexable!==true)continue;
  if(page.canonical!==path)findings.push({path,code:'canonical-mismatch'});
  if(!has(page.title)||!has(page.description))findings.push({path,code:'missing-extractable-summary'});
  if(!has(page.primaryEntityId))findings.push({path,code:'missing-stable-entity-id'});
  if(!has(page.authoritySource))findings.push({path,code:'missing-verifiable-source'});
  if(!Array.isArray(page.structuredDataTypes)||!page.structuredDataTypes.some(t=>allowedTypes.has(t)))findings.push({path,code:'missing-relevant-schema-type'});
  if(!page.hreflang||page.hreflang[locale]!==path)findings.push({path,code:'missing-self-hreflang'});
  if(page.requiresLogin===true)findings.push({path,code:'public-content-login-gated'});
  if(page.claimsVerified!==true)findings.push({path,code:'claims-need-editorial-verification'});
 }
 return {pagesReviewed:pages.length,findings,readyForPublication:pages.length>0&&findings.length===0,rankingsGuaranteed:false,aiCitationsGuaranteed:false,networkCalled:false,productionTouched:false};
}
