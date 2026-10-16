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
      if(path.endsWith('/pairs')&&Array.isArray(payload.data)){
        const whitelist=['id','pair_id','url_name','name','symbol','base_currency_symbol','quote_currency_symbol',
          'base_currency_id','quote_currency_id','buy','sell','status'];
        const pick=item=>Object.fromEntries(whitelist.filter(k=>Object.hasOwn(item,k))
          .map(k=>[k,item[k]]));
        details.firstMarketKeys=Object.keys(payload.data.find(x=>x&&typeof x==='object')||{}).slice(0,26);
        const nameOf=x=>String(x?.url_name||x?.name||x?.symbol||'').toLowerCase();
        // USDT against local currency, NEVER USDT quoted against unrelated crypto.
        const matched=payload.data.filter(x=>x&&typeof x==='object'&&
          /(usdt|tether|تتر)/i.test(JSON.stringify(pick(x)))&&
          /(irr|irt|rial|toman|ریال|تومان|rial|tom|irt)/i.test(JSON.stringify(pick(x))));
        const fallback=payload.data.filter(x=>x&&typeof x==='object'&&/(usdt|tether|تتر)/i.test(nameOf(x)));
        details.potentialUsdtLocalPairs=matched.slice(0,12).map(pick);
        details.marketLabelSample=fallback.slice(0,7).map(pick);
        details.candidateCount=matched.length;
      }
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
