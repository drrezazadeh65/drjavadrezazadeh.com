import {buildSchemaOpenGraph} from './schema-open-graph-engine.mjs';
/** Offline inventory coverage report for bilingual structured data and social previews.
 * No synthetic claims or live-site modifications.
 */
const sections=['service','book','research','academic-profile','other'];
export function auditSchemaOpenGraphInventory({pages=[],expectedServiceCount=27}={}){
 if(!Array.isArray(pages)||!Number.isSafeInteger(expectedServiceCount)||expectedServiceCount<0)throw new TypeError('Invalid inventory');
 const findings=[],items=[],seen=new Set(),serviceIds=new Map();
 for(const page of pages){
  const key=page?.canonical??page?.path??null;
  if(!key||seen.has(key)){findings.push({code:'duplicate-or-missing-page-key',page:key});continue}
  seen.add(key);
  const result=buildSchemaOpenGraph({page});
  const section=sections.includes(page?.section)?page.section:'other';
  items.push({page:key,section,locale:page?.locale??null,ready:result.ready,issues:result.errors});
  if(!result.ready)findings.push({code:'metadata-not-ready',page:key,issues:result.errors});
  if(section==='service'&&typeof page.serviceId==='string'&&page.serviceId.trim()){
   const locales=serviceIds.get(page.serviceId)??new Set();
   locales.add(page.locale);serviceIds.set(page.serviceId,locales);
  }
 }
 const missingBilingualServices=[...serviceIds].filter(([,langs])=>!langs.has('fa')||!langs.has('en')).map(([id])=>id);
 if(serviceIds.size!==expectedServiceCount)findings.push({code:'service-inventory-count-mismatch',expected:expectedServiceCount,actual:serviceIds.size});
 if(missingBilingualServices.length)findings.push({code:'service-translation-gaps',serviceIds:missingBilingualServices});
 const bySection=Object.fromEntries(sections.map(section=>[section,{total:0,ready:0}]));
 for(const item of items){bySection[item.section].total++;if(item.ready)bySection[item.section].ready++}
 return {totalPages:items.length,readyPages:items.filter(x=>x.ready).length,bySection,serviceCount:serviceIds.size,missingBilingualServices,findings,items,readyForRelease:findings.length===0,productionTouched:false};
}
