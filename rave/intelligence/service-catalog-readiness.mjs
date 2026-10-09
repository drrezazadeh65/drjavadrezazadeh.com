/** Offline, evidence-gated 27-service catalog completeness audit. */
const REQUIRED=['id','titleFa','titleEn','descriptionFa','descriptionEn','deliverablesFa','deliverablesEn','imageId','priceMinor','currency'];
export function auditServiceCatalog(services,{expectedCount=27}={}){
 if(!Array.isArray(services)||!Number.isSafeInteger(expectedCount)||expectedCount<1)throw new TypeError('Invalid catalog');
 const seen=new Set(),issues=[];
 for(const service of services){
  const id=service?.id??null;
  if(typeof id!=='string'||!id.trim()||seen.has(id))issues.push({id,code:'invalid-or-duplicate-id'});
  else seen.add(id);
  for(const field of REQUIRED){
   const value=service?.[field];
   if(field==='priceMinor'){
    if(!Number.isSafeInteger(value)||value<0)issues.push({id,code:'invalid-price'});
   }else if(field==='currency'){
    if(!['IRR','USD'].includes(value))issues.push({id,code:'invalid-currency'});
   }else if(typeof value!=='string'||!value.trim())issues.push({id,code:'missing-'+field});
  }
  if(service?.published===true&&!service?.approvedByEditor)issues.push({id,code:'publication-without-review'});
 }
 if(services.length!==expectedCount)issues.push({id:null,code:'service-count-mismatch',expected:expectedCount,actual:services.length});
 return {expectedCount,actualCount:services.length,valid:issues.length===0,issues,readyForCheckout:false,networkCalled:false,productionTouched:false};
}
