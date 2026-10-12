#!/usr/bin/env node
/**
 * Read-only, zero-key PageSpeed Insights mobile lab observations.
 * The website origin and routes are immutable, the run is bounded, and field CrUX
 * metrics are deliberately excluded; PSI field data may be discontinued.
 * No Google API billing, tracking, publication or source mutation.
 */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const targets=['https://drjavadrezazadeh.com/fa/','https://drjavadrezazadeh.com/en/'];
const api='https://www.googleapis.com/pagespeedonline/v5/runPagespeed';
const output='api/internal/free-performance-observation.json';
const scores=['performance','accessibility','seo'];
const metrics={'first-contentful-paint':'fcpMs','largest-contentful-paint':'lcpMs','total-blocking-time':'tbtMs','cumulative-layout-shift':'cls'};
const safeNumber=(n,min,max)=>typeof n==='number'&&Number.isFinite(n)&&n>=min&&n<=max?n:null;
export function normalizeLighthouse(artifact,url,checkedAt){
 if(!artifact||artifact.finalUrl && !artifact.finalUrl.startsWith('https://drjavadrezazadeh.com/'))return {target:url,status:'unavailable',checkedAt,reason:'foreign-or-missing-artifact'};
 const categories={};
 for(const category of scores)categories[category]=safeNumber(artifact.categories?.[category]?.score,0,1)===null?null:Math.round(artifact.categories[category].score*100);
 const labMetrics={};
 for(const [field,key] of Object.entries(metrics))labMetrics[key]=safeNumber(artifact.audits?.[field]?.numericValue,0,200000);
 if(!Object.values(categories).some(n=>n!==null))return {target:url,status:'unavailable',checkedAt,reason:'no-lab-categories'};
 return {target:url,status:'observed',checkedAt,strategy:'mobile',categories,labMetrics,
  source:'Google PageSpeed Insights API (Lighthouse lab)','realUserFieldDataClaimed':false};
}
export function validate(report){
 assert.equal(report.schema,'free-performance-observation-v1');
 assert.equal(report.provider,'Google PageSpeed Insights');
 assert.equal(report.records.length,targets.length);
 assert.deepEqual(report.records.map(r=>r.target),targets);
 for(const r of report.records){
  assert(['observed','unavailable'].includes(r.status));
  if(r.status==='observed'){
   assert.equal(r.strategy,'mobile');assert.equal(r.realUserFieldDataClaimed,false);
   for(const x of Object.values(r.categories))assert(x===null||(x>=0&&x<=100));
  }
 }
 assert.equal(report.summary.attempted,targets.length);
 assert.equal(report.summary.observed,report.records.filter(r=>r.status==='observed').length);
 return report;
}
async function fetchBounded(url){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),85000);
 try{
  const res=await fetch(url,{signal:controller.signal,redirect:'error',headers:{Accept:'application/json','User-Agent':'DrRezazadehFreeMobileAudit/1.0 (+https://drjavadrezazadeh.com)'}});
  if(!res.ok)return {error:'http-'+res.status};
  if(Number(res.headers.get('content-length'))>6_000_000)return {error:'oversize'};
  const reader=res.body?.getReader();if(!reader)return {error:'missing-body'};
  const chunks=[];let size=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>6_000_000){await reader.cancel();return {error:'oversize'};}chunks.push(Buffer.from(value));}}
  finally{reader.releaseLock();}
  const response=JSON.parse(Buffer.concat(chunks).toString('utf8'));
  if(!response.lighthouseResult)return {error:'lighthouse-result-missing'};
  return {lhr:response.lighthouseResult};
 }catch(e){return {error:e.name==='AbortError'?'timeout':'request-failed'};}
 finally{clearTimeout(timer);}
}
async function collect(){
 const timestamp=new Date().toISOString(),records=[];
 for(const target of targets){
  const query=new URL(api);query.searchParams.set('url',target);query.searchParams.set('strategy','mobile');
  for(const c of scores)query.searchParams.append('category',c);
  const data=await fetchBounded(query.href);
  if(data.lhr)records.push(normalizeLighthouse(data.lhr,target,timestamp));
  else records.push({target,status:'unavailable',checkedAt:timestamp,reason:data.error});
 }
 const report=validate({schema:'free-performance-observation-v1',provider:'Google PageSpeed Insights',
  observedAt:timestamp,strategy:'mobile',origin:'https://drjavadrezazadeh.com',sourceCommit:process.env.GITHUB_SHA||null,
  source:'Public PSI mobile Lighthouse lab API without API key',records,
  summary:{attempted:records.length,observed:records.filter(x=>x.status==='observed').length,unavailable:records.filter(x=>x.status==='unavailable').length},
  limitation:'Lab performance is not real-user Core Web Vitals or a guarantee of search rank. No key, quota workaround or paid API used.'});
 fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({schema:report.schema,at:report.observedAt,summary:report.summary,status:report.summary.observed?'lab_measurements_available':'provider_unavailable'}));
}
function selfTest(){
 const sample={finalUrl:targets[0],categories:{performance:{score:0.71},accessibility:{score:0.94},seo:{score:1}},audits:{'largest-contentful-paint':{numericValue:1234}}};
 const record=normalizeLighthouse(sample,targets[0],'2026-10-12T00:00:00Z');
 assert.equal(record.categories.performance,71);assert.equal(record.labMetrics.lcpMs,1234);assert.equal(record.realUserFieldDataClaimed,false);
 assert.equal(normalizeLighthouse({finalUrl:'https://evil.example/',categories:sample.categories},targets[0],'2026-10-12T00:00:00Z').status,'unavailable');
 validate({schema:'free-performance-observation-v1',provider:'Google PageSpeed Insights',records:[record,{target:targets[1],status:'unavailable'}],summary:{attempted:2,observed:1}});
 console.log('PASS zero-key mobile lab source schema and foreign result exclusion');
}
if(process.argv.includes('--self-test'))selfTest();
else if(process.argv.includes('--collect'))await collect();
else if(process.argv.includes('--check')){let result=validate(JSON.parse(fs.readFileSync(output,'utf8')));console.log('PASS dated mobile observation: '+result.summary.observed+' measured pages / '+result.summary.attempted);}
else{console.error('Use --self-test, --collect or --check');process.exitCode=2;}
