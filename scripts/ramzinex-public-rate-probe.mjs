#!/usr/bin/env node
/**
 * Read-only Ramzinex PUBLIC market discovery; no credentials, no orders or funds.
 * This is deliberately a reachability/schema probe, NOT a money quote or live FX feed.
 * Raw API data and public price values are not copied into the repository or UI.
 */
const base='https://publicapi.ramzinex.com';
const endpoints=[
  '/exchange/api/v1.0/exchange/pairs',
  '/exchange/api/exchange/prices'
];
const summarize=v=>{
  if(Array.isArray(v))return {kind:'array',length:v.length};
  if(v&&typeof v==='object')return {kind:'object',keys:Object.keys(v).slice(0,15)};
  return {kind:typeof v};
};
const entries=[];
async function probe(path){
  const url=base+path;
  let status=0, contentType='',size=0,details=null,error=null;
  try{
    const res=await fetch(url,{method:'GET',redirect:'error',
      signal:AbortSignal.timeout(9000),
      headers:{'Accept':'application/json','User-Agent':'JR-Ramzinex-PublicMarket-Discovery/1.0'}});
    status=res.status;
    contentType=res.headers.get('content-type')||'';
    const raw=await res.text();
    size=Buffer.byteLength(raw,'utf8');
    if(size>1_500_000)throw new Error('oversized_public_response');
    if(!res.ok)throw new Error('HTTP_'+status);
    if(!contentType.toLowerCase().includes('json'))throw new Error('unexpected_mime');
    const payload=JSON.parse(raw);
    details=summarize(payload);
    // Strictly print structural evidence, never trust unlabeled numbers as tomans.
    if(payload&&typeof payload==='object'&&!Array.isArray(payload)){
      for(const k of ['data','result','results','pairs','markets'])
        if(Object.hasOwn(payload,k))details[k]=summarize(payload[k]);
    }
  }catch(e){error=String(e?.message||e).slice(0,180);}
  entries.push({path,httpStatus:status,contentType:contentType.slice(0,80),bytes:size,structure:details,error});
}
for(const path of endpoints)await probe(path);
const output={source:'Ramzinex PUBLIC API only',checkedAt:new Date().toISOString(),
  noCredentials:true,rateSourceVerified:false,
  symbolAndCurrencyUnitVerified:false,merchantExecutableQuoteAllowed:false,results:entries};
console.log(JSON.stringify(output,null,2));
if(!entries.some(e=>e.httpStatus===200&&e.structure))process.exitCode=1;
