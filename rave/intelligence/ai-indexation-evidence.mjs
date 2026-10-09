/** Evidence-only indexation monitor. Does not call Google, Bing, or the live site. */
const validPath=p=>typeof p==='string'&&/^\/(fa|en)\/[a-z0-9/_-]*$/.test(p)&&!p.includes('//');
const validStatus=s=>['indexed','not-indexed','unknown'].includes(s);
export function assessIndexationEvidence({pages=[],observations=[]}={}){
 if(!Array.isArray(pages)||!Array.isArray(observations))throw new TypeError('Pages and observations must be arrays');
 const findings=[],indexedBySource={},pageMap=new Map();
 for(const page of pages){
  if(!validPath(page?.path)){findings.push({code:'invalid-path',path:page?.path});continue}
  if(pageMap.has(page.path))findings.push({code:'duplicate-page',path:page.path});
  pageMap.set(page.path,page);
 }
 const seen=new Set();
 for(const obs of observations){
  if(!validPath(obs?.path)||!['google','bing'].includes(obs?.source)||!validStatus(obs?.status)||typeof obs?.checkedAt!=='string'||Number.isNaN(Date.parse(obs.checkedAt))){findings.push({code:'invalid-observation',path:obs?.path});continue}
  const key=obs.source+'|'+obs.path;
  if(seen.has(key)){findings.push({code:'duplicate-observation',path:obs.path,source:obs.source});continue}
  seen.add(key);
  if(!pageMap.has(obs.path)){findings.push({code:'observation-without-page',path:obs.path});continue}
  indexedBySource[key]={status:obs.status,checkedAt:obs.checkedAt};
 }
 for(const page of pageMap.values()){
  if(page.indexable!==true)continue;
  for(const source of ['google','bing']){
   const status=indexedBySource[source+'|'+page.path]?.status??'unknown';
   if(status!=='indexed')findings.push({code:status==='unknown'?'indexation-unverified':'not-indexed',path:page.path,source});
  }
 }
 return {pagesReviewed:pageMap.size,observationsReviewed:observations.length,findings,sourceCoverage:indexedBySource,liveIndexationChecked:false,searchConsoleConnected:false,bingWebmasterConnected:false,productionTouched:false};
}
