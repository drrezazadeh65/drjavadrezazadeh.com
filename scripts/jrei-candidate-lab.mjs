// Read-only pre-release browser measurements on the sanitized local artifact.
// No traffic to private production routes, no real-user metrics or score guarantee.
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
const locale=process.env.CANDIDATE_LOCALE;
if(!['fa','en','ar','fa-home'].includes(locale))throw Error('INVALID_CANDIDATE_LOCALE');
const url='http://127.0.0.1:4173/'+(locale==='fa-home'?'fa/':locale+'/jrei/'),dir='jrei-candidate-lab-results';
fs.mkdirSync(dir,{recursive:true});
const res=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(5000)});
if(!res.ok||!(await res.text()).includes(locale==='fa-home'?'jr-mobile-first-runtime-v1.css':'data-jx-rule-output'))throw Error('CANDIDATE_BUILD_NOT_CURRENT');
const records=[];
for(const [strategy,sample] of [['mobile',1],['mobile',2],['mobile',3],['desktop',1]]){
 const file=dir+'/'+strategy+'-'+sample+'.json';
 const run=spawnSync(process.execPath,['node_modules/lighthouse/cli/index.js',url,'--quiet','--output=json','--output-path='+file,'--chrome-flags=--headless=new --no-sandbox','--only-categories=performance,accessibility,best-practices,seo','--max-wait-for-load=45000','--port=0',...(strategy==='desktop'?['--preset=desktop']:[])],{encoding:'utf8',timeout:120000,maxBuffer:1000000});
 try{
  if(run.status!==0||!fs.existsSync(file))throw Error('LOCAL_CHROME_AUDIT_FAILED');
  const lhr=JSON.parse(fs.readFileSync(file,'utf8'));
  if((lhr.finalDisplayedUrl||lhr.finalUrl)!==url||lhr.runtimeError)throw Error('INVALID_LOCAL_LAB_RESULT');
  const scores=Object.fromEntries(['performance','accessibility','best-practices','seo'].map(k=>[k,typeof lhr.categories?.[k]?.score==='number'?Math.round(100*lhr.categories[k].score):null]));
  if(Object.values(scores).some(s=>s===null))throw Error('MISSING_CATEGORIES');
  const failedAccessibility=(lhr.categories.accessibility.auditRefs||[]).filter(x=>x.weight>0&&lhr.audits?.[x.id]?.score!==null&&lhr.audits?.[x.id]?.score<1).map(x=>({id:x.id,targets:(lhr.audits[x.id].details?.items||[]).slice(0,12).map(n=>String(n.node?.selector||'').slice(0,200)).filter(Boolean)}));
  const insights={};
  for(const id of ['cls-culprits-insight','layout-shifts','lcp-breakdown-insight','lcp-discovery-insight','render-blocking-insight','largest-contentful-paint-element','mainthread-work-breakdown','total-byte-weight']){const audit=lhr.audits?.[id];if(audit)insights[id]={score:audit.score??null,numericValue:audit.numericValue??null,details:audit.details??null};}
  fs.writeFileSync(dir+'/'+strategy+'-'+sample+'-diagnostics.json',JSON.stringify(insights,null,2)+'\n');
  records.push({strategy,sample,status:'observed',scores,failedAccessibility,lcpMs:lhr.audits?.['largest-contentful-paint']?.numericValue??null,tbtMs:lhr.audits?.['total-blocking-time']?.numericValue??null,cls:lhr.audits?.['cumulative-layout-shift']?.numericValue??null});
 }catch(e){records.push({strategy,sample,status:'unavailable',reason:String(e.message).slice(0,120)});}
 finally{fs.rmSync(file,{force:true});}
}
const samples=records.filter(r=>r.strategy==='mobile'&&r.status==='observed');
const median=values=>{const a=values.filter(Number.isFinite).sort((a,b)=>a-b);return a.length===3?a[1]:null;};
const mobileSummary={samples:samples.length,medianPerformance:median(samples.map(r=>r.scores.performance)),medianTbtMs:median(samples.map(r=>r.tbtMs)),medianCls:median(samples.map(r=>r.cls)),targetPerformance:95,targetTbtMs:200};
mobileSummary.meetsTarget=mobileSummary.samples===3&&mobileSummary.medianPerformance>=95&&mobileSummary.medianTbtMs<=200&&mobileSummary.medianCls<=.1;
const report={mobileSummary,schema:'jr.jrei.candidate-lab.v1',sourceCommit:process.env.GITHUB_SHA||null,url,scope:'SANITIZED_LOCAL_CANDIDATE_NOT_PRODUCTION_OR_CRUX',transport:'loopback_static_http_gzip_when_accepted',records};
fs.writeFileSync(dir+'/report.json',JSON.stringify(report,null,2)+'\n');
console.log('JREI_CANDIDATE_LAB='+JSON.stringify(report));
if(records.some(r=>r.status!=='observed')||!mobileSummary.meetsTarget){console.error('MOBILE_CANDIDATE_TARGET_NOT_MET');process.exitCode=1;}
