/**
 * Read-only GSC coverage evidence reconciliation. Does not fetch Google data,
 * index pages, change routes, write files or request a production deployment.
 * Stage only; run at the one owner-authorised final acceptance window.
 *
 * Examples (AFTER final owner authorisation only):
 *   node scripts/gsc-coverage-reconcile.mjs --input /private/path/Pages.csv --json
 *   node scripts/gsc-coverage-reconcile.mjs --input /private/path/Examples.csv --reason "Crawled - currently not indexed"
 *
 * Treat private Search Console exports as sensitive: keep them out of Git.
 */
import fs from 'node:fs';
import path from 'node:path';
import {classifyRoute} from '../platform/ecosystem-governance.mjs';

const ORIGIN='https://drjavadrezazadeh.com';
const root=process.cwd();
const args=process.argv.slice(2);
const flag=name=>{
 const at=args.indexOf(name);
 return at<0?null:args[at+1]??null;
};
const input=flag('--input');
const fallbackReason=flag('--reason')||'unspecified';
const json=args.includes('--json');
const maxRecords=5000;
function csvRows(value){
 const rows=[];let row=[],field='',quoted=false;
 const source=value.replace(/^\uFEFF/,'').replace(/\r\n/g,'\n');
 for(let i=0;i<source.length;i++){
  const char=source[i];
  if(char==='"'){
   if(quoted&&source[i+1]==='"'){field+='"';i++;}else quoted=!quoted;
   continue;
  }
  if(!quoted&&char===','){row.push(field);field='';continue;}
  if(!quoted&&(char==='\n'||char==='\r')){
   row.push(field);rows.push(row);field='';row=[];continue;
  }
  field+=char;
 }
 if(quoted)throw new Error('CSV contains an unterminated quoted field');
 if(field.length||row.length){row.push(field);rows.push(row);}
 return rows.filter(r=>r.some(c=>c.trim()));
}
function cleanHeader(value){
 return String(value||'').replace(/^\uFEFF/,'').trim().toLowerCase().replace(/\s+/g,' ');
}
function fieldIndex(header,choices){
 return header.findIndex(h=>choices.includes(cleanHeader(h)));
}
function category(value){
 const lower=String(value).toLowerCase();
 if(/crawled.{0,80}not indexed|خزش.{0,50}(?:ایندکس نشده|نمایه نشده)/i.test(lower))return 'CRAWLED_NOT_INDEXED';
 if(/discovered.{0,80}not indexed|کشف.{0,50}(?:ایندکس نشده|نمایه نشده)/i.test(lower))return 'DISCOVERED_NOT_INDEXED';
 if(/noindex/i.test(lower))return 'NOINDEX';
 if(/alternate page.{0,100}canonical|جایگزین.{0,80}کانونی/i.test(lower))return 'ALTERNATE_CANONICAL';
 if(/404|not found|یافت نشد/i.test(lower))return 'NOT_FOUND';
 if(/page with redirect|دارای تغییر مسیر/i.test(lower))return 'REDIRECT';
 if(/indexed|نمایه شده|ایندکس شده/i.test(lower))return 'INDEXED';
 return 'OTHER_OR_UNSPECIFIED';
}
function publicSource(route){
 if(!route.startsWith('/')||route.includes('\0'))return null;
 const relative=route==='/'?'index.html':route.endsWith('/')?route.slice(1)+'index.html':route.slice(1);
 const absolute=path.resolve(root,relative);
 if(!absolute.startsWith(root+path.sep)&&absolute!==path.join(root,'index.html'))return null;
 if(!fs.existsSync(absolute)||!fs.statSync(absolute).isFile())return null;
 return absolute;
}
function firstTag(html,tag,attr,value){
 const pattern=new RegExp('<'+tag+'\\b[^>]*>','gi');
 for(const match of html.matchAll(pattern)){
  if((attribute(match[0],attr)||'').toLowerCase()===value.toLowerCase())
   return match[0];
 }
 return '';
}
function attribute(tag,key){
 for(const match of String(tag).matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)){
  if(match[1].toLowerCase()===key.toLowerCase())return match[2]??match[3];
 }
 return null;
}
function details(route){
 const p=publicSource(route);
 if(!p)return {exists:false,indexableSource:false,canonical:null,title:false,h1:false};
 const html=fs.readFileSync(p,'utf8');
 const robots=attribute(firstTag(html,'meta','name','robots'),'content')||'';
 const noindex=/\bnoindex\b/i.test(robots);
 const canonical=attribute(firstTag(html,'link','rel','canonical'),'href');
 const title=/<title\b[^>]*>\s*[^<\s]/i.test(html);
 const h1=(html.match(/<h1\b/gi)||[]).length===1;
 return {exists:true,indexableSource:!noindex,canonical,title,h1};
}
function safeReportRoute(route,policy){
 // CSV URLs can embed recovery tokens or personal data in path segments.
 // Keep such data in memory only; public reports receive a category label.
 if(policy.cache==='NO_STORE')return '[private route: '+policy.policy+']';
 if(/(?:%40|@|token|secret|password|session|auth-key)/i.test(route))
  return '[redacted sensitive path]';
 if(route.split('/').some(segment=>segment.length>72))
  return '[redacted unusually long path]';
 return route;
}
function recommend(reason,policy,meta,route){
 if(policy.indexing==='NOINDEX')
  return 'Expected private/noindex policy: preserve noindex and no-store; review only if the URL was mistakenly published as public.';
 if(reason==='NOINDEX')
  return 'Compare this public route to source and live robots headers before changing any index policy.';
 if(reason==='ALTERNATE_CANONICAL')
  return 'Inspect Google-selected vs declared canonical and the historical URL registry. Proper alternate canonicals are not necessarily defects.';
 if(reason==='CRAWLED_NOT_INDEXED'||reason==='DISCOVERED_NOT_INDEXED')
  return 'Review content uniqueness, search intent, internal links and crawlable HTTP response; indexing is a Google decision.';
 if(reason==='NOT_FOUND')return 'Verify historical URL evidence and a valid destination before considering an explicitly approved one-hop redirect.';
 if(reason==='REDIRECT')return 'Confirm intentional 301/302 target and single-hop chain; do not force the old alias into the sitemap.';
 if(!meta.exists)return 'Check whether this is a released URL, a safe alias or an intentionally absent route.';
 if(meta.canonical&&meta.canonical!==ORIGIN+route)
  return 'Review a non-self canonical using the frozen URL registry; do not rewrite it automatically.';
 return 'Preserve the current route and request dated, live URL Inspection evidence at final acceptance.';
}
if(!input){
 console.error('Usage: node scripts/gsc-coverage-reconcile.mjs --input /private/export.csv [--reason "GSC reason"] [--json]');
 process.exitCode=2;
}else{
 try{
  const stat=fs.statSync(input);
  if(!stat.isFile()||stat.size>2_000_000)throw new Error('Expected a local CSV export no larger than 2 MB');
  const rows=csvRows(fs.readFileSync(input,'utf8'));
  if(rows.length<2)throw new Error('CSV export does not contain data rows');
  const headers=rows.shift();
  const urlIndex=fieldIndex(headers,['url','page','address','url address','آدرس','صفحه','نشانی','url صفحه']);
  const reasonIndex=fieldIndex(headers,['reason','status','page indexing','indexing status','type','دلیل','علت','وضعیت','نوع']);
  if(urlIndex<0)throw new Error('No URL/Page column found; export the URL examples table from Search Console');
  const records=[];let skipped=0;
  for(const row of rows.slice(0,maxRecords)){
   const raw=(row[urlIndex]||'').trim();
   let u;
   try{u=new URL(raw);}catch{skipped++;continue;}
   if(u.origin!==ORIGIN){skipped++;continue;}
   // Never echo query parameters or fragments from a private GSC export.
   const route=u.pathname;
   const reason=category(reasonIndex>=0?row[reasonIndex]||fallbackReason:fallbackReason);
   const policy=classifyRoute(route);
   const meta=details(route);
   records.push({
    route:safeReportRoute(route,policy),
    reason,
    sourcePresent:meta.exists,
    sourceIndexable:meta.indexableSource,
    declaredCanonical:policy.cache==='NO_STORE'?null:meta.canonical,
    titlePresent:meta.title,
    oneH1:meta.h1,
    routeIndexPolicy:policy.indexing,
    nextStep:recommend(reason,policy,meta,route)
   });
  }
  const report={
   schema:'jr.gsc.coverage.source-reconciliation.v1',
   evidence:'CSV export supplied by owner; no live Google or Bertina probes',
   fileRecords:rows.length,
   examined:records.length,
   skipped,
   truncated:rows.length>maxRecords,
   groupCounts:Object.fromEntries([...new Set(records.map(x=>x.reason))].sort()
      .map(key=>[key,records.filter(x=>x.reason===key).length])),
   records
  };
  if(json)console.log(JSON.stringify(report,null,2));
  else{
   console.log('GSC source reconciliation:',JSON.stringify({
    examined:report.examined,skipped:report.skipped,truncated:report.truncated,groups:report.groupCounts
   }));
   for(const x of records)console.log(x.route,'|',x.reason,'|',x.nextStep);
  }
 }catch(error){
  console.error('Cannot reconcile GSC export:',error.message);
  process.exitCode=2;
 }
}
