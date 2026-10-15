import fs from 'node:fs';
import crypto from 'node:crypto';
// Strict public HTTPS, GET only, anonymous. Never reads credentials or provisions an administrator.
const origin='https://drjavadrezazadeh.com';
const checks=[];
async function get(path){return fetch(origin+path,{redirect:'manual',cache:'no-store',signal:AbortSignal.timeout(15000)});}
for(const path of ['/api/internal/operations-registry.json','/api/internal/operations-action-identities-v1.json','/api/internal/keyword-master-map-v1.json','/api/operations-reporting.php','/api/config.local.php']){
 const response=await get(path);await response.arrayBuffer();
 if(![403,404].includes(response.status))throw Error('Private artifact is not denied: '+path+' HTTP '+response.status);
 checks.push({path,status:response.status,passed:true});
}
for(const path of ['/api/admin/operations','/api/admin/operations/session','/api/admin/operations/keyword-map']){
 const response=await get(path),body=await response.json();
 if(response.status!==401||body.ok!==false||body.error!=='unauthorized'||!/no-store/i.test(response.headers.get('cache-control')||''))throw Error('Anonymous privileged route boundary failed: '+path);
 checks.push({path,status:response.status,passed:true});
}
for(const path of ['/fa/app/admin/','/en/account/admin/']){
 const response=await get(path),body=await response.text();
 if(response.status!==200||!/no-store/i.test(response.headers.get('cache-control')||'')||!/noindex/i.test(response.headers.get('x-robots-tag')||'')||!body.includes('id="ops-workspace" hidden')||!body.includes('operations-control.js'))throw Error('Private administrative shell contract failed: '+path);
 checks.push({path,status:response.status,passed:true});
}
for(const path of ['/assets/js/operations-control.js','/assets/css/operations-control.css']){
 const response=await get(path+'?release='+encodeURIComponent(process.env.GITHUB_SHA||'current')),bytes=Buffer.from(await response.arrayBuffer()),expected=fs.readFileSync('.'+path);
 const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
 if(response.status!==200||hash(bytes)!==hash(expected))throw Error('Current operations asset mismatch: '+path);
 checks.push({path,status:response.status,sha256:hash(bytes),passed:true});
}
const proof={schema:'operations-live-private-v1',checkedAt:new Date().toISOString(),commit:process.env.GITHUB_SHA||null,checks,
 limitation:'Anonymous route isolation and exact public asset checks only. Internal file presence is certified separately by managed checksums; actual owner MFA, money, durable jobs and learning remain independently unverified.'};
if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(proof,null,2)+'\n');
console.log('Canonical operations live privacy and exact asset verification: '+checks.length+'/'+checks.length+' passed; no session, mail or payment created.');
