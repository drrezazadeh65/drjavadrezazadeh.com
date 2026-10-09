/** Offline bilingual service SEO and checkout journey readiness. */
export function auditServiceJourney(services=[]){
 if(!Array.isArray(services))throw new TypeError('Expected services');
 const findings=[],paths=new Set();
 for(const s of services){
  const id=s?.id??null;
  for(const lang of ['fa','en']){
   const path=s?.paths?.[lang];
   if(typeof path!=='string'||!new RegExp('^/'+lang+'/services/[a-z0-9-]+/$').test(path)||paths.has(path)){
    findings.push({id,locale:lang,code:'missing-invalid-or-duplicate-path'});continue;
   }
   paths.add(path);
   if(s?.canonical?.[lang]!==path)findings.push({id,locale:lang,code:'canonical-mismatch'});
   if(s?.hreflang?.[lang]!==path)findings.push({id,locale:lang,code:'self-hreflang-missing'});
   if(typeof s?.seo?.[lang]?.title!=='string'||!s.seo[lang].title.trim())findings.push({id,locale:lang,code:'missing-seo-title'});
   if(typeof s?.seo?.[lang]?.description!=='string'||!s.seo[lang].description.trim())findings.push({id,locale:lang,code:'missing-meta-description'});
  }
  if(s?.hreflang?.fa!==s?.paths?.fa||s?.hreflang?.en!==s?.paths?.en)findings.push({id,code:'translation-linkage-incomplete'});
  if(!s?.checkout?.enabled||typeof s.checkout.productId!=='string'||!s.checkout.productId.trim())findings.push({id,code:'checkout-not-configured'});
  if(!s?.checkout?.emailRequired||s.checkout.phoneVerification===true)findings.push({id,code:'email-only-identity-policy-violation'});
 }
 return {valid:services.length>0&&findings.length===0,serviceCount:services.length,findings,networkCalled:false,productionTouched:false};
}
