// Read-only public Chrome lab. Independent of Google PSI API quotas.
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {publicGate,normalizePsi,validatedPublicUrl} from './lib/performance-production.mjs';
const origin='https://drjavadrezazadeh.com';
const routes={'fa-home':'/fa/','fa-jrei':'/fa/jrei/','en-jrei':'/en/jrei/','ar-jrei':'/ar/jrei/'};
const route=routes[process.env.LAB_ROUTE];
if(!route)throw Error('INVALID_LAB_ROUTE');
const url=validatedPublicUrl(origin+route),dir='.independent-lighthouse';
fs.mkdirSync(dir,{recursive:true});
async function fingerprint(){
 const res=await fetch(origin+'/sw.js',{redirect:'error',cache:'no-store',signal:AbortSignal.timeout(18000)});
 if(!res.ok)throw Error('LIVE_FINGERPRINT_HTTP_'+res.status);
 const s=await res.text(),sha=s.match(/^const CACHE_VERSION='jr-site-bertina-([a-f0-9]{40})';$/m)?.[1];
 if(!sha)throw Error('LIVE_FINGERPRINT_MISSING');
 return sha;
}
const sha=await fingerprint(),expected=process.env.EXPECTED_DEPLOYED_SHA;
if(expected&&sha!==expected)throw Error('LIVE_RELEASE_MISMATCH');
const gate=await publicGate(url);
if(!gate.ok)throw Error('PUBLIC_ROUTE_GATE_'+gate.reason);
const records=[];
for(const strategy of ['mobile','desktop']){
 const file=dir+'/'+strategy+'.json';
 const result=spawnSync(process.execPath,['node_modules/lighthouse/cli/index.js',url,'--quiet','--output=json','--output-path='+file,'--chrome-flags=--headless=new --no-sandbox','--only-categories=performance,accessibility,best-practices,seo','--max-wait-for-load=45000','--port=0',...(strategy==='desktop'?['--preset=desktop']:[])],{encoding:'utf8',timeout:120000,maxBuffer:1000000});
 if(result.status!==0||!fs.existsSync(file)){records.push({strategy,status:'unavailable',reason:'local_chrome_audit_failed',exit:result.status});continue;}
 try{
  const lhr=JSON.parse(fs.readFileSync(file,'utf8'));
  const record=normalizePsi({lighthouseResult:lhr},url,strategy,new Date().toISOString());
  records.push({...record,source:'Independent Chrome Lighthouse laboratory; not Google PSI API or real-user field data'});
 }catch{records.push({strategy,status:'unavailable',reason:'invalid_lighthouse_report'});}
 finally{fs.rmSync(file,{force:true});}
}
const final=await fingerprint();
if(final!==sha)throw Error('PRODUCTION_CHANGED_DURING_AUDIT');
const report={schema:'jr.independent-lighthouse.v1',liveSha:sha,sourceCommit:process.env.GITHUB_SHA||null,url,checkedAt:new Date().toISOString(),scope:'PUBLIC_READ_ONLY_LOCAL_LAB_NOT_PSI_API_OR_CRUX',records};
fs.writeFileSync(dir+'/report.json',JSON.stringify(report,null,2)+'\n');
console.log('INDEPENDENT_LIGHTHOUSE_RESULT='+JSON.stringify(report));
if(records.some(r=>r.status!=='observed'))process.exitCode=1;
