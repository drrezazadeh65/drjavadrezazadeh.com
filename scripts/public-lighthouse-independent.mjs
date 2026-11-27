// Read-only public Chrome lab. Independent of Google PSI API quotas.
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {publicGate,normalizePsi,validatedPublicUrl} from './lib/performance-production.mjs';
const origin='https://drjavadrezazadeh.com';
const routes={'fa-home':'/fa/','fa-jrei':'/fa/jrei/','en-jrei':'/en/jrei/','ar-jrei':'/ar/jrei/'};
const route=routes[process.env.LAB_ROUTE];
if(!route)throw Error('INVALID_LAB_ROUTE');
const url=validatedPublicUrl(origin+route),dir='independent-lighthouse-results';
fs.mkdirSync(dir,{recursive:true});
async function fingerprint(){
 // Separate CA-verified connection avoids reusing the host's closed
 // keep-alive socket after the Chrome measurements. No TLS bypass.
 const result=spawnSync('curl',['--http1.1','--fail','--silent','--show-error','--retry','2','--retry-all-errors','--connect-timeout','5','--max-time','15','--max-filesize','512000','--proto','=https','--header','Cache-Control: no-cache','--header','Connection: close','--write-out','\n%{http_code}',origin+'/sw.js'],{encoding:'utf8',timeout:55000,maxBuffer:600000});
 if(result.status!==0||!result.stdout.endsWith('\n200'))throw Error('LIVE_FINGERPRINT_TRANSPORT_UNAVAILABLE');
 const s=result.stdout.slice(0,-4),sha=s.match(/^const CACHE_VERSION='jr-site-bertina-([a-f0-9]{40})';$/m)?.[1];
 if(!sha)throw Error('LIVE_FINGERPRINT_MISSING');
 return sha;
}
const sha=await fingerprint(),expected=process.env.EXPECTED_DEPLOYED_SHA;
if(expected&&sha!==expected)throw Error('LIVE_RELEASE_MISMATCH');
const gate=await publicGate(url);
if(!gate.ok)throw Error('PUBLIC_ROUTE_GATE_'+gate.reason);
const records=[];
for(const [strategy,sample] of [['mobile',1],['mobile',2],['mobile',3],['desktop',1]]){
 const file=dir+'/'+strategy+'-'+sample+'.json';
 const result=spawnSync(process.execPath,['node_modules/lighthouse/cli/index.js',url,'--quiet','--output=json','--output-path='+file,'--chrome-flags=--headless=new --no-sandbox','--only-categories=performance,accessibility,best-practices,seo','--max-wait-for-load=45000','--port=0',...(strategy==='desktop'?['--preset=desktop']:[])],{encoding:'utf8',timeout:120000,maxBuffer:1000000});
 if(result.status!==0||!fs.existsSync(file)){records.push({strategy,status:'unavailable',reason:'local_chrome_audit_failed',exit:result.status});continue;}
 try{
  const lhr=JSON.parse(fs.readFileSync(file,'utf8'));
  const record=normalizePsi({lighthouseResult:{...lhr,finalUrl:lhr.finalDisplayedUrl||lhr.finalUrl}},url,strategy,new Date().toISOString());
  const failedAudits=(lhr.categories?.accessibility?.auditRefs||[]).filter(x=>x.weight>0&&lhr.audits?.[x.id]?.score!==null&&lhr.audits?.[x.id]?.score<1).map(x=>({id:x.id,score:lhr.audits[x.id].score,targets:(lhr.audits[x.id].details?.items||[]).slice(0,12).map(n=>String(n.node?.selector||'').slice(0,200)).filter(Boolean)}));
  const performanceDiagnostics=Object.fromEntries(['long-tasks','mainthread-work-breakdown','bootup-time','total-byte-weight','dom-size','unused-javascript','unused-css-rules'].map(id=>[id,{score:lhr.audits?.[id]?.score??null,numericValue:lhr.audits?.[id]?.numericValue??null}]));
  const cpuGroups=(lhr.audits?.['mainthread-work-breakdown']?.details?.items||[]).slice(0,16).map(x=>({group:String(x.group||x.groupLabel||'').slice(0,80),durationMs:Number.isFinite(x.duration)?Math.round(x.duration):null}));
  const bootup=(lhr.audits?.['bootup-time']?.details?.items||[]).filter(x=>typeof x.url==='string'&&x.url.startsWith(origin+'/')).slice(0,12).map(x=>({path:new URL(x.url).pathname,totalMs:Number.isFinite(x.total)?Math.round(x.total):null}));
  records.push({...record,sample,benchmarkIndex:lhr.environment?.benchmarkIndex??null,cpuGroups,bootup,failedAccessibilityAudits:failedAudits,performanceDiagnostics,source:'Independent Chrome Lighthouse laboratory; not Google PSI API or real-user field data'});
 }catch{records.push({strategy,status:'unavailable',reason:'invalid_lighthouse_report'});}
 finally{fs.rmSync(file,{force:true});}
}
const final=await fingerprint();
if(final!==sha)throw Error('PRODUCTION_CHANGED_DURING_AUDIT');
const median=values=>{const a=values.filter(Number.isFinite).sort((a,b)=>a-b);return a.length===3?a[1]:null;};
const mobile=records.filter(x=>x.strategy==='mobile'&&x.status==='observed');
const mobileSummary={samples:mobile.length,medianPerformance:median(mobile.map(x=>x.categories?.performance)),medianTbtMs:median(mobile.map(x=>x.lab?.tbtMs)),medianCls:median(mobile.map(x=>x.lab?.cls)),targetPerformance:95,targetTbtMs:200};
mobileSummary.meetsTarget=mobileSummary.samples===3&&mobileSummary.medianPerformance>=95&&mobileSummary.medianTbtMs<=200&&mobileSummary.medianCls<=.1;
const report={mobileSummary,schema:'jr.independent-lighthouse.v1',liveSha:sha,sourceCommit:process.env.GITHUB_SHA||null,url,checkedAt:new Date().toISOString(),scope:'PUBLIC_READ_ONLY_LOCAL_LAB_NOT_PSI_API_OR_CRUX',records};
fs.writeFileSync(dir+'/report.json',JSON.stringify(report,null,2)+'\n');
console.log('INDEPENDENT_LIGHTHOUSE_RESULT='+JSON.stringify(report));
if(records.some(r=>r.status!=='observed'))process.exitCode=1;
