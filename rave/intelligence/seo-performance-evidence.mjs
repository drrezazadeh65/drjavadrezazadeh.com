/** Offline-only SEO evidence aggregation. No network access or production writes. */
const ALLOWED=new Set(['pagespeed','gtmetrix']);
export function normalizePerformanceEvidence(entries=[]){
 if(!Array.isArray(entries))throw new TypeError('Expected evidence array');
 return entries.map((entry,index)=>{
  if(!entry||!ALLOWED.has(entry.source))throw new Error('Unsupported evidence source at '+index);
  if(typeof entry.url!=='string'||!/^https?:\/\//.test(entry.url))throw new Error('Invalid inspected URL');
  const date=entry.collectedAt;
  if(typeof date!=='string'||!Number.isFinite(Date.parse(date)))throw new Error('Missing evidence timestamp');
  const metrics={};
  for(const name of ['lcpMs','inpMs','cls','ttfbMs']){
   const value=entry.metrics?.[name];
   if(value!=null){
    if(typeof value!=='number'||!Number.isFinite(value)||value<0)throw new Error('Invalid '+name);
    metrics[name]=value;
   }
  }
  return {source:entry.source,url:entry.url,collectedAt:new Date(date).toISOString(),device:entry.device==='desktop'?'desktop':'mobile',metrics,verified:Boolean(entry.verified)};
 });
}
export function assessCoreWebVitals(evidence=[]){
 return normalizePerformanceEvidence(evidence).map(row=>{
  const {lcpMs,inpMs,cls}=row.metrics;
  const classify=(value,good,poor)=>value==null?'unknown':value<=good?'good':value>poor?'poor':'needs-improvement';
  return {...row,assessment:{lcp:classify(lcpMs,2500,4000),inp:classify(inpMs,200,500),cls:classify(cls,0.1,0.25)}};
 });
}
