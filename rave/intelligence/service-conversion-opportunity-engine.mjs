/** Offline conversion opportunity planner for 27 services. No invented traffic, pricing or sales. */
const validPath=p=>typeof p==='string'&&/^\/(fa|en)\/[a-z0-9/_-]*$/.test(p)&&!p.includes('//');
const nonempty=s=>typeof s==='string'&&s.trim().length>0;
export function planServiceConversionOpportunities({services=[],attribution}={}){
 if(!Array.isArray(services))throw new TypeError('Services must be an array');
 const issues=[],actions=[],ids=new Set();
 for(const service of services){
  const id=service?.id;
  if(!nonempty(id)||ids.has(id)){issues.push({code:'invalid-or-duplicate-service-id',id:id??null});continue}
  ids.add(id);
  const paths=service.paths??{},problems=[];
  if(!validPath(paths.fa)||!paths.fa.startsWith('/fa/')||!validPath(paths.en)||!paths.en.startsWith('/en/'))problems.push('missing-bilingual-landing-pages');
  if(!nonempty(service.titleFa)||!nonempty(service.titleEn)||!nonempty(service.descriptionFa)||!nonempty(service.descriptionEn))problems.push('incomplete-bilingual-copy');
  if(!nonempty(service.imageUrl))problems.push('missing-dedicated-image');
  if(!Number.isSafeInteger(service.priceMinor)||service.priceMinor<0||!['IRR','USD'].includes(service.currency))problems.push('unverified-pricing');
  if(service.editorialApproved!==true)problems.push('pending-academic-editorial-review');
  if(service.checkoutEnabled!==true)problems.push('checkout-not-ready');
  const economicPriority=problems.includes('checkout-not-ready')?3:problems.length?2:1;
  actions.push({serviceId:id,problems,priority:economicPriority,readyToPromote:problems.length===0,attributionEvidence:'not-linked-to-service',nextAction:problems[0]??'review-source-attribution-and-conversion'});
 }
 actions.sort((a,b)=>b.priority-a.priority||b.problems.length-a.problems.length||a.serviceId.localeCompare(b.serviceId));
 if(services.length!==27)issues.push({code:'service-count-mismatch',expected:27,actual:services.length});
 return {servicesReviewed:services.length,actions,issues,conversionDataLinked:false,attributionSummaryAvailable:Boolean(attribution?.summary),liveTrafficVerified:false,productionTouched:false};
}
