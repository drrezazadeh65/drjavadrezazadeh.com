#!/usr/bin/env node
/**
 * Read-only, local Lighthouse CI evidence for two public-language homepages.
 * This measures a sanitized *local build*, not the deployed Bertina server,
 * origin CrUX field data, search rankings or revenue.
 */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const targets=['/fa/','/en/'];
const folder=process.env.LHCI_DATA_DIR||'.lighthouseci';
const out='api/internal/free-local-lighthouse-observation.json';
const categories=['performance','accessibility','seo','best-practices'];
const audits={'first-contentful-paint':'fcpMs','largest-contentful-paint':'lcpMs','total-blocking-time':'tbtMs','cumulative-layout-shift':'cls'};
function boundedNumber(value,min,max){
 return typeof value==='number'&&Number.isFinite(value)&&value>=min&&value<=max?value:null;
}
export function normalizeLhr(lhr,route,observedAt){
 const final=lhr?.finalUrl||lhr?.requestedUrl;
 let actual;
 try{actual=new URL(final);}catch{return {route,status:'unavailable',reason:'invalid-final-url'};}
 if(actual.protocol!=='http:'||!['localhost','127.0.0.1'].includes(actual.hostname)||actual.pathname!==route)
   return {route,status:'unavailable',reason:'unexpected-local-origin-or-route'};
 const score={};
 for(const name of categories){
  const n=boundedNumber(lhr?.categories?.[name]?.score,0,1);
  score[name]=n===null?null:Math.round(n*100);
 }
 const lab={};
 for(const [audit,name] of Object.entries(audits))lab[name]=boundedNumber(lhr?.audits?.[audit]?.numericValue,0,250000);
 if(score.performance===null)return {route,status:'unavailable',reason:'missing-lab-performance'};
 return {route,status:'observed',checkedAt:observedAt,score,lab,
  source:'Lighthouse CI local sanitized build',mobile:!lhr?.configSettings?.formFactor||lhr.configSettings.formFactor==='mobile',
  isDeployedSite:false,realUserFieldDataClaimed:false};
}
export function validateReport(doc){
 assert.equal(doc.schema,'free-local-lighthouse-observation-v1');
 assert.equal(doc.origin,'local_sanitized_public_build');
 assert.equal(doc.sourceEngine,'ENG-10');
 assert.equal(doc.records.length,2);
 assert.deepEqual(doc.records.map(x=>x.route),targets);
 assert.equal(doc.summary.attempted,2);
 assert.equal(doc.summary.observed,doc.records.filter(x=>x.status==='observed').length);
 for(const rec of doc.records){
  assert(['observed','unavailable'].includes(rec.status));
  if(rec.status==='observed'){
   assert.equal(rec.isDeployedSite,false);assert.equal(rec.realUserFieldDataClaimed,false);
   assert.equal(rec.mobile,true);
   for(const value of Object.values(rec.score))assert(value===null||(value>=0&&value<=100));
  }
 }
 return doc;
}
function safeParse(file){
 try{
  if(fs.statSync(file).size>12_000_000)return null;
  const parsed=JSON.parse(fs.readFileSync(file,'utf8'));
  return parsed?.lighthouseVersion&&parsed?.categories?parsed:null;
 }catch{return null;}
}
function findLhrs(dir){
 if(!fs.existsSync(dir))return [];
 return fs.readdirSync(dir).filter(x=>/\.json$/i.test(x)&&x!=='manifest.json')
   .slice(0,40).map(x=>safeParse(path.join(dir,x))).filter(Boolean);
}
function collect(){
 const lhrs=findLhrs(folder),seen=new Map();
 for(const lhr of lhrs){
  let route;try{route=new URL(lhr.finalUrl||lhr.requestedUrl).pathname;}catch{continue;}
  if(targets.includes(route)&&!seen.has(route))seen.set(route,lhr);
 }
 const time=new Date().toISOString();
 const records=targets.map(route=>seen.has(route)?normalizeLhr(seen.get(route),route,time):{route,status:'unavailable',reason:'missing-lighthouse-report'});
 const report=validateReport({schema:'free-local-lighthouse-observation-v1',observedAt:time,
  sourceEngine:'ENG-10',reportingEngine:'ENG-13',origin:'local_sanitized_public_build',
  sourceCommit:process.env.GITHUB_SHA||null,sourceBranch:'migration/bertina-linux6',
  records,summary:{attempted:2,observed:records.filter(x=>x.status==='observed').length},
  scope:'Mobile Lighthouse lab metrics from the static source artifact, not live Bertina, CrUX or SEO rankings',
  limitation:'A localhost Lighthouse result cannot certify production/Core Web Vitals, search ranking, conversions or revenue.'});
 fs.mkdirSync(path.dirname(out),{recursive:true});
 fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({schema:report.schema,at:time,summary:report.summary,source:'local_sanitized_public_build'}));
 if(report.summary.observed!==2)process.exitCode=1;
}
function selfTest(){
 const at='2026-10-12T10:00:00Z',lhr={lighthouseVersion:'12.0',finalUrl:'http://localhost:12345/fa/',
  configSettings:{formFactor:'mobile'},categories:{performance:{score:0.83},accessibility:{score:0.98},
   seo:{score:1},'best-practices':{score:0.91}},audits:{'largest-contentful-paint':{numericValue:1700}}};
 const norm=normalizeLhr(lhr,'/fa/',at);assert.equal(norm.score.performance,83);
 assert.equal(norm.lab.lcpMs,1700);assert.equal(norm.realUserFieldDataClaimed,false);
 assert.equal(normalizeLhr({...lhr,finalUrl:'https://drjavadrezazadeh.com/fa/'},'/fa/',at).status,'unavailable');
 assert.equal(normalizeLhr({...lhr,finalUrl:'http://localhost:12345/api/private'},'/fa/',at).status,'unavailable');
 validateReport({schema:'free-local-lighthouse-observation-v1',origin:'local_sanitized_public_build',sourceEngine:'ENG-10',
  records:[norm,{route:'/en/',status:'unavailable',reason:'missing'}],summary:{attempted:2,observed:1}});
 console.log('PASS: Lighthouse localhost-only mobile metrics, no live-domain inference and two-route contract');
}
if(process.argv.includes('--self-test'))selfTest();
else if(process.argv.includes('--collect'))collect();
else if(process.argv.includes('--check')){
 const report=validateReport(JSON.parse(fs.readFileSync(out,'utf8')));
 console.log('PASS: '+report.summary.observed+' valid local Lighthouse reports of 2 targets');
}else{console.error('Use --self-test, --collect, or --check');process.exitCode=2;}
