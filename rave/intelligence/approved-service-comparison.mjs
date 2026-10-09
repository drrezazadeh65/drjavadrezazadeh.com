/** Compare approved bilingual services without inferring value, outcomes, or prices. */
const clean=s=>typeof s==='string'&&s.trim().length>0;
export function compareApprovedServices({serviceIds=[],services=[],locale='fa'}={}){
 if(!['fa','en'].includes(locale))throw new TypeError('Unsupported locale');
 if(!Array.isArray(serviceIds)||serviceIds.length<2||serviceIds.length>4||new Set(serviceIds).size!==serviceIds.length||!Array.isArray(services))throw new TypeError('Select two to four distinct services');
 const catalog=new Map(services.filter(s=>s&&clean(s.id)).map(s=>[s.id,s]));
 const rows=[],excluded=[];
 for(const id of serviceIds){
  const s=catalog.get(id);
  if(!s||s.active!==true||s.editorialApproved!==true){excluded.push({serviceId:id,reason:'not-approved-or-inactive'});continue}
  const title=s[locale==='fa'?'titleFa':'titleEn'],description=s[locale==='fa'?'descriptionFa':'descriptionEn'],url=s.paths?.[locale];
  if(!clean(title)||!clean(description)||!clean(url)||!url.startsWith('/'+locale+'/')){excluded.push({serviceId:id,reason:'incomplete-localized-service'});continue}
  const priceApproved=s.priceApproved===true&&Number.isSafeInteger(s.priceMinor)&&s.priceMinor>=0&&['IRR','USD'].includes(s.currency);
  const verifiedList=k=>Array.isArray(s[k]?.[locale])?s[k][locale].filter(clean):[];
  rows.push({serviceId:id,title,description,url,deliverables:verifiedList('deliverables'),suitableFor:verifiedList('suitableFor'),duration:s.durationApproved===true&&clean(s.duration)?s.duration:null,price:priceApproved?{amountMinor:s.priceMinor,currency:s.currency}:null,checkoutAvailable:s.checkoutEnabled===true&&priceApproved});
 }
 return {locale,rows,excluded,comparisonComplete:rows.length===serviceIds.length,priceComparisonPossible:rows.length>1&&rows.every(r=>r.price)&&new Set(rows.map(r=>r.price.currency)).size===1,noServiceRankingWithoutEvidence:true,productionTouched:false};
}
