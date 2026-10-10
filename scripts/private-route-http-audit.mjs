import fs from 'node:fs';

// Explicit origin required. Use local Apache for PR evidence; trusted HTTPS for production certification.
if(!process.env.PRIVATE_AUDIT_ORIGIN) throw Error('Set PRIVATE_AUDIT_ORIGIN to the local Apache or trusted public origin');
const origin=new URL(process.env.PRIVATE_AUDIT_ORIGIN);
if(origin.protocol!=='https:'&&!['127.0.0.1','localhost'].includes(origin.hostname)) throw Error('Remote verification requires trusted HTTPS');
const ecosystem=JSON.parse(fs.readFileSync('platform/ecosystem-registry.json','utf8'));
const families=ecosystem.route_families.filter(route=>ecosystem.policies[route.policy]?.cache==='NO_STORE');
let checked=0;
for(const {prefix} of families){
  for(const path of [prefix.slice(0,-1),prefix,prefix+'index.html',prefix+'__private-missing__/']){
    const response=await fetch(new URL(path,origin),{redirect:'manual',signal:AbortSignal.timeout(10000)});
    const cache=response.headers.get('cache-control')||'';
    const robots=response.headers.get('x-robots-tag')||'';
    if(!/no-store/i.test(cache)||!/private/i.test(cache)||!/noindex/i.test(robots)) throw Error(path+' HTTP '+response.status+' lost private headers: '+cache+'; '+robots);
    await response.arrayBuffer();checked++;
  }
}
for(const path of ['/fa/services/','/fa/shop/','/fa/shop/golden-talent/','/en/golden-talent/','/fa/services/checkout-help/']){
  const response=await fetch(new URL(path,origin),{redirect:'manual',signal:AbortSignal.timeout(10000)});
  if(/no-store|private/i.test(response.headers.get('cache-control')||'')) throw Error('Public route was captured: '+path);
  await response.arrayBuffer();checked++;
}
const missing=await fetch(new URL('/__public-intentional-404__/',origin),{redirect:'manual'});
if(missing.status!==404) throw Error('Public 404 policy changed');
console.log('Private HTTP audit PASS: '+checked+' private/public route variants; public 404 preserved. Origin: '+origin.origin);
