#!/usr/bin/env node
/* Read-only release proof: source SHA must equal public stamped production SHA.
 * Used by post-release observers; NEVER uploads, deploys or mutates production.
 */
import fs from 'node:fs';
const ORIGIN='https://drjavadrezazadeh.com';
const expected=process.env.PSI_RELEASE_SHA||'';
if(!/^[a-f0-9]{40}$/.test(expected))throw Error('invalid_expected_release_sha');
async function readBounded(route,limit){
 const response=await fetch(ORIGIN+route,{redirect:'manual',cache:'no-store',
  signal:AbortSignal.timeout(25000),headers:{Accept:'text/plain, text/html','Cache-Control':'no-cache'}});
 if(response.status!==200)throw Error('release_probe_http_'+response.status);
 const n=Number(response.headers.get('content-length'));
 if(n>limit)throw Error('release_probe_oversize');
 const text=await response.text();
 if(text.length>limit)throw Error('release_probe_oversize');
 return text;
}
const sw=await readBounded('/sw.js',500000);
const stamp=sw.match(/^const CACHE_VERSION='jr-site-bertina-([a-f0-9]{40})';/m)?.[1];
if(stamp!==expected)throw Error('live_service_worker_sha_does_not_match_successful_release');
for(const route of ['/fa/shop/','/en/shop/']){
 const page=await readBounded(route,1500000);
 const pattern=new RegExp('<meta\\s+name=["\\x27]jr-deploy-revision["\\x27]\\s+content=["\\x27]'+expected+'["\\x27]');
 if(!pattern.test(page))throw Error('live_storefront_sha_mismatch_'+route.replaceAll('/','_'));
}
const result={schema:'jr-production-release-proof-v1',expectedSha:expected,
 observedAt:new Date().toISOString(),status:'verified',mechanism:'public_https_service_worker_and_bilingual_storefront_stamps',
 caveat:'Matches owner frozen release stamps; no independent server credentials or database changes.'};
if(process.env.PERFORMANCE_RELEASE_PROOF_PATH){
 fs.writeFileSync(process.env.PERFORMANCE_RELEASE_PROOF_PATH,JSON.stringify(result,null,2)+'\n');
}
if(process.env.GITHUB_OUTPUT)fs.appendFileSync(process.env.GITHUB_OUTPUT,'verified=true\nsha='+expected+'\n');
console.log('PRODUCTION_SHA_VERIFIED sha='+expected+' method=stamped_sw_and_bilingual_storefront');
