/* Production PageSpeed reporting core for the EXISTING free-performance-observer.
 * Read-only: outputs bounded, sanitized lab + CrUX observations to CI artifacts.
 * No website mutation, deployment, public report publication, or user identifiers.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

export const ORIGIN='https://drjavadrezazadeh.com';
export const POST_RELEASE_ROUTES=[
 '/', '/fa/', '/en/', '/fa/shop/', '/en/shop/', '/journal/',
 '/fa/golden-talent/', '/en/golden-talent/'
];
export const PRIVATE_FEATURE_GATES=[
 {feature:'BAHAR',example:'/fa/app/student/bahar/',status:'not_a_public_url',reason:'noindex_private_student_portfolio'},
 {feature:'RCAS',example:'/fa/assessments/golden-talent/start/',status:'not_a_public_url',reason:'noindex_private_assessment'}
];
const forbidden=new Set([
 'api','app','admin','account','dashboard','customer-dashboard','student','guardian',
 'assessments','assessment','observer','checkout','cart','order','orders','receipt',
 'payment','payment-start','payment-return','payment-result','login','logout','register',
 'profile','privacy','consents','documents','inbox','recover','submission','settings',
 'bazyabi-hesab','rcas','bahar','callback'
]);
const CATEGORY=['performance','accessibility','best-practices','seo'];
const AUDITS={'largest-contentful-paint':'lcpMs','total-blocking-time':'tbtMs','cumulative-layout-shift':'cls'};
const number=(n,max=1e10)=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=max?n:null;
const attr=(tag,key)=>{
 const match=tag.match(new RegExp('(?:^|\\s)'+key+'\\s*=\\s*(?:"([^"]*)"|\\x27([^\\x27]*)\\x27)','i'));
 return match?(match[1]??match[2]):null;
};
export function validatedPublicUrl(value){
 if(typeof value!=='string'||value.length>350)throw Error('invalid_public_url');
 let url;try{url=new URL(value);}catch{throw Error('invalid_public_url');}
 if(url.origin!==ORIGIN||url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.port)throw Error('foreign_or_parameterized_url');
 const path=url.pathname;
 if(path.length>200||path.includes('//')||/%(?:2f|5c|00)/i.test(path))throw Error('invalid_public_path');
 let decoded;try{decoded=decodeURIComponent(path).normalize('NFC');}catch{throw Error('invalid_public_path');}
 if(decoded.includes('//')||decoded.includes('\\')||decoded.includes('<')||decoded.includes('>'))throw Error('invalid_public_path');
 if(decoded!=='/'&&!/^\/(?:[a-z]{2}\/)?(?:[\p{L}0-9-]+\/){0,7}$/u.test(decoded))throw Error('invalid_public_path');
 const parts=decoded.toLowerCase().split('/').filter(Boolean);
 if(parts.some(x=>forbidden.has(x)||/[0-9]{6,}/.test(x)))throw Error('private_or_unbounded_path');
 return ORIGIN+path;
}
export function classifyPublicResponse(html,url,status,headers={}){
 if(status!==200)return 'not_http_200';
 if(typeof html!=='string'||html.length>400000)return 'invalid_html';
 const robotsHeader=headers['x-robots-tag']||'';
 if(/\bnoindex\b/i.test(robotsHeader))return 'noindex_header';
 for(const tag of html.match(/<meta\b[^>]*>/gi)||[]){
  if(/^(?:robots|googlebot|bingbot)$/i.test(attr(tag,'name')||'')
    &&/\bnoindex\b/i.test(attr(tag,'content')||''))return 'noindex_meta';
 }
 const links=(html.match(/<link\b[^>]*>/gi)||[]).filter(x=>(attr(x,'rel')||'').toLowerCase().split(/\s+/).includes('canonical'));
 if(links.length!==1)return 'missing_or_multiple_canonical';
 const canonical=attr(links[0],'href');
 if(!canonical)return 'missing_canonical';
 let target;
 try{target=validatedPublicUrl(new URL(canonical,url).href);}catch{return 'unsafe_canonical';}
 if(target!==url)return 'canonicalized_elsewhere';
 return 'eligible';
}
async function boundedRead(response,max=6_000_000){
 if(Number(response.headers.get('content-length'))>max)throw Error('upstream_oversize');
 const reader=response.body?.getReader();if(!reader)throw Error('missing_response_body');
 let total=0;const chunks=[];
 try{
  while(true){
   const {done,value}=await reader.read();if(done)break;
   total+=value.length;if(total>max){await reader.cancel();throw Error('upstream_oversize');}
   chunks.push(Buffer.from(value));
  }
 }finally{reader.releaseLock();}
 return Buffer.concat(chunks).toString('utf8');
}
export async function publicGate(url,request=fetch){
 const safe=validatedPublicUrl(url);
 const started=performance.now();
 try{
  const resp=await request(safe,{redirect:'manual',cache:'no-store',signal:AbortSignal.timeout(18000),
   headers:{Accept:'text/html','User-Agent':'JR-ReadOnlyPerformanceAudit/1.0'}});
  const headersAt=performance.now();
  if(resp.status!==200)return {ok:false,reason:'http_'+resp.status};
  if(!(resp.headers.get('content-type')||'').toLowerCase().includes('text/html'))
   return {ok:false,reason:'non_html'};
  const html=await boundedRead(resp,400000);
  const completeAt=performance.now();
  const verdict=classifyPublicResponse(html,safe,resp.status,{'x-robots-tag':resp.headers.get('x-robots-tag')||''});
  if(verdict!=='eligible')return {ok:false,reason:verdict};
  return {ok:true,reason:'eligible',transport:{
    source:'read_only_public_html_fetch',
    responseHeadersMs:Math.round(Math.max(0,headersAt-started)),
    completeHtmlMs:Math.round(Math.max(0,completeAt-started)),
    decodedHtmlBytes:Buffer.byteLength(html,'utf8'),
    notLighthouseOrFieldVitals:true
  }};
 }catch(err){
  return {ok:false,reason:err.message==='upstream_oversize'?'oversize_or_private':'public_gate_unavailable'};
 }
}
export function normalizePsi(payload,url,strategy,time){
 const lhr=payload?.lighthouseResult;
 if(!lhr||typeof lhr!=='object')return {url,strategy,status:'unavailable',reason:'no_lighthouse_result'};
 let observedUrl;
 try{observedUrl=validatedPublicUrl(lhr.finalUrl);}catch{return {url,strategy,status:'unavailable',reason:'unsafe_lighthouse_final_url'};}
 if(observedUrl!==url)return {url,strategy,status:'unavailable',reason:'redirect_or_canonical_change'};
 const scores={};
 for(const k of CATEGORY){
  const score=number(lhr.categories?.[k]?.score,1);
  scores[k]=score===null?null:Math.round(score*100);
 }
 if(Object.values(scores).every(s=>s===null))return {url,strategy,status:'unavailable',reason:'no_lab_scores'};
 const lab={};
 for(const [k,v] of Object.entries(AUDITS))lab[v]=number(lhr.audits?.[k]?.numericValue,1e6);
 // INP is a FIELD metric only, never a Lighthouse TBT proxy.
 const fieldScope=payload.loadingExperience?.overall_category&&payload.loadingExperience?.metrics
  ?'url':payload.originLoadingExperience?.overall_category&&payload.originLoadingExperience?.metrics?'origin':null;
 const field=fieldScope==='url'?payload.loadingExperience?.metrics:
  fieldScope==='origin'?payload.originLoadingExperience?.metrics:null;
 const percentile=(key)=>number(field?.[key]?.percentile,1000000);
 const inp=percentile('INTERACTION_TO_NEXT_PAINT');
 const lcp=percentile('LARGEST_CONTENTFUL_PAINT_MS');
 const clsRaw=percentile('CUMULATIVE_LAYOUT_SHIFT_SCORE');
 const fieldVitals={source:fieldScope,
  inpMs:inp,lcpMs:lcp,cls:clsRaw===null?null:clsRaw/100,
  measurement:'CrUX field 75th percentiles; only present if independently supplied by PSI'};
 return {url,strategy,status:'observed',checkedAt:time,
  categories:scores,lab,fieldVitals,
  source:'Google PageSpeed Insights API Lighthouse lab',productionPage:true,
  noSyntheticCrux:true};
}
function action(rec){
 if(rec.status!=='observed')return [];
 const fixes=[];
 if(rec.lab?.lcpMs!==null&&rec.lab.lcpMs>2500)fixes.push({priority:'P1',metric:'LCP',action:'Optimize the measured largest element, priority image and render-blocking CSS',value:rec.lab.lcpMs});
 if(rec.lab?.cls!==null&&rec.lab.cls>0.1)fixes.push({priority:'P1',metric:'CLS',action:'Reserve image and dynamic-widget dimensions; avoid layout shifts',value:rec.lab.cls});
 if(rec.lab?.tbtMs!==null&&rec.lab.tbtMs>200)fixes.push({priority:'P1',metric:'TBT',action:'Reduce long JavaScript tasks and third-party tag work',value:rec.lab.tbtMs});
 for(const k of ['accessibility','best-practices','seo'])if(rec.categories?.[k]!==null&&rec.categories[k]<90)
  fixes.push({priority:'P2',metric:k,action:'Review the matching Lighthouse audit opportunities and source markup',value:rec.categories[k]});
 return fixes;
}
function compare(records,prev){
 const old=new Map((prev?.records||[]).filter(r=>r?.status==='observed'&&r.productionPage).map(r=>[r.url+'|'+r.strategy,r]));
 const changes=[];
 for(const r of records){
  if(r.status!=='observed')continue;
  const p=old.get(r.url+'|'+r.strategy);
  if(!p)continue;
  const prevPerf=p.categories?.performance,nowPerf=r.categories?.performance;
  if(typeof prevPerf==='number'&&typeof nowPerf==='number'){
   const delta=nowPerf-prevPerf;
   changes.push({url:r.url,strategy:r.strategy,metric:'performance',delta,
    classification:delta<=-10?'potential_regression_requires_repeat':'directional_change'});
  }
 }
 return changes;
}
const htmlEscape=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
export function renderHtml(report){
 const rows=report.records.map(r=>'<tr><td>'+htmlEscape(r.url)+'</td><td>'+htmlEscape(r.strategy)+'</td><td>'+
  htmlEscape(r.status)+'</td><td>'+htmlEscape(r.categories?.performance??'—')+'</td><td>'+
  htmlEscape(r.categories?.accessibility??'—')+'</td><td>'+htmlEscape(r.categories?.['best-practices']??'—')+
  '</td><td>'+htmlEscape(r.categories?.seo??'—')+'</td><td>'+htmlEscape(r.lab?.lcpMs??'—')+
  '</td><td>'+htmlEscape(r.lab?.cls??'—')+'</td><td>'+htmlEscape(r.lab?.tbtMs??'—')+
  '</td><td>'+htmlEscape(r.fieldVitals?.inpMs??'—')+'</td><td>'+htmlEscape(r.publicHtmlTransport?.responseHeadersMs??'—')+'</td><td>'+htmlEscape(r.publicHtmlTransport?.completeHtmlMs??'—')+'</td><td>'+htmlEscape(r.publicHtmlTransport?.decodedHtmlBytes??'—')+'</td><td>'+htmlEscape(r.reason||'')+'</td></tr>').join('\n');
 const fixes=report.priorities.map(f=>'<li>'+htmlEscape(f.priority)+' · '+htmlEscape(f.url)+
  ' '+htmlEscape(f.strategy)+' · '+htmlEscape(f.metric)+': '+htmlEscape(f.action)+'</li>').join('');
 const notes=report.exclusions.map(x=>'<li>'+htmlEscape(x.feature)+': '+htmlEscape(x.reason)+'</li>').join('');
 return '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="robots" content="noindex,nofollow">'+
  '<meta name="viewport" content="width=device-width,initial-scale=1"><title>Private performance CI evidence</title>'+
  '<style>body{font:16px system-ui;margin:2rem;color:#222}table{border-collapse:collapse;display:block;overflow-x:auto}td,th{padding:8px;border:1px solid #aaa}h1{font-size:1.7rem}</style>'+
  '<h1>Private performance CI report</h1><p>Release: '+htmlEscape(report.releaseSha||'manual')+
  ' · Time: '+htmlEscape(report.observedAt)+'</p><p><strong>Laboratory scores are NOT real-user Core Web Vitals.</strong> INP is field-only and may be unavailable. This file is a private CI artifact, not a public site page or deploy gate.</p>'+
  '<table><thead><tr>'+['URL','Device','Status','Performance','Accessibility','Best Practices','SEO','Lab LCP ms','Lab CLS','Lab TBT ms','Field INP ms','Public HTML headers ms','Public HTML complete ms','Decoded HTML bytes','Reason'].map(x=>'<th>'+x+'</th>').join('')+
  '</tr></thead><tbody>'+rows+'</tbody></table><h2>Priorities (review and repeat before changing production)</h2><ul>'+fixes+
  '</ul><h2>Private or noindex features deliberately not measured</h2><ul>'+notes+'</ul>'+
  '<p>Missing metrics are not zeros. Observations compare only same-target, same-device production data.</p></html>';
}
function arg(name){const flag='--'+name+'=';return process.argv.find(x=>x.startsWith(flag))?.slice(flag.length)||'';}
export async function runProductionAudit(){
 const now=new Date().toISOString();
 const mode=process.env.PSI_MODE||'manual';
 const release=process.env.PSI_RELEASE_SHA||'';
 if(!['manual','post_deploy'].includes(mode))throw Error('invalid_audit_mode');
 if(mode==='post_deploy'&&(!/^[a-f0-9]{40}$/.test(release)||process.env.PSI_RELEASE_VERIFIED!=='1'))
  throw Error('post_deploy_requires_verified_production_sha');
 const selected=process.env.PSI_TARGET_URL||arg('url');
 const strategies=process.env.PSI_STRATEGY||arg('strategy')||'both';
 if(!['mobile','desktop','both'].includes(strategies))throw Error('invalid_strategy');
 const targets=selected?[validatedPublicUrl(selected)]:POST_RELEASE_ROUTES.map(x=>validatedPublicUrl(ORIGIN+x));
 if(targets.length>8)throw Error('audit_quota_exceeded');
 const devices=strategies==='both'?['mobile','desktop']:[strategies];
 const priorFile='.performanceci/baseline.json';
 let prior=null;
 try{if(fs.statSync(priorFile).size<=350000)prior=JSON.parse(fs.readFileSync(priorFile,'utf8'));}catch{}
 if(prior?.schema!=='jr-performance-production-v1')prior=null;
 const records=[];const htmlTransport=new Map();let calls=0,quota=false;
 for(const target of targets){
  const gate=await publicGate(target);
  if(!gate.ok){
   for(const strategy of devices)records.push({url:target,strategy,status:'excluded',reason:gate.reason});
   continue;
  }
  if(gate.transport)htmlTransport.set(target,gate.transport);
  for(const strategy of devices){
   if(quota){records.push({url:target,strategy,status:'unavailable',reason:'provider_quota_limited'});continue;}
   if(calls>=16){records.push({url:target,strategy,status:'unavailable',reason:'call_budget_exhausted'});continue;}
   const cacheDir='.performanceci/psi-cache';
   const cacheKey=createHash('sha256').update(target+'|'+strategy).digest('hex');
   const cacheFile=path.join(cacheDir,cacheKey+'.json');
   try{
    if(fs.statSync(cacheFile).size<6000){
     const cached=JSON.parse(fs.readFileSync(cacheFile,'utf8'));
     const age=Date.now()-Date.parse(cached?.checkedAt);
     if(cached?.url===target&&cached.strategy===strategy&&cached.status==='observed'
       &&age>=0&&age<12*3600000&&cached.productionPage===true){
       records.push({...cached,reusedLabFromCache:true});continue;
     }
    }
   }catch{}
   calls++;if(calls>1)await new Promise(resolve=>setTimeout(resolve,1800));
   const api=new URL('https://www.googleapis.com/pagespeedonline/v5/runPagespeed');
   api.searchParams.set('url',target);api.searchParams.set('strategy',strategy);
   for(const category of CATEGORY)api.searchParams.append('category',category==='best-practices'?'BEST_PRACTICES':category.toUpperCase());
   if(process.env.PAGESPEED_API_KEY)api.searchParams.set('key',process.env.PAGESPEED_API_KEY);
   try{
    const response=await fetch(api,{redirect:'error',signal:AbortSignal.timeout(90000),headers:{Accept:'application/json'}});
    if(response.status===429){quota=true;records.push({url:target,strategy,status:'unavailable',reason:'provider_quota_limited'});continue;}
    if(!response.ok){records.push({url:target,strategy,status:'unavailable',reason:'provider_http_'+response.status});continue;}
    const json=JSON.parse(await boundedRead(response));
    const measured=normalizePsi(json,target,strategy,now);
    records.push(measured);
    if(measured.status==='observed'){
     fs.mkdirSync(cacheDir,{recursive:true});
     fs.writeFileSync(cacheFile,JSON.stringify(measured));
    }
   }catch(e){
    records.push({url:target,strategy,status:'unavailable',reason:e?.name==='TimeoutError'?'provider_timeout':'provider_request_failed'});
   }
  }
 }
 // Transport measurements survive missing PSI results or provider quota.
 // They describe the CI runner's single public HTTP fetch, not end-user CWV.
 for(const entry of records){
  if(entry.status!=='excluded'&&htmlTransport.has(entry.url))
   entry.publicHtmlTransport=htmlTransport.get(entry.url);
 }
 const report={schema:'jr-performance-production-v1',observedAt:now,
  mode,releaseSha:mode==='post_deploy'?release:null,origin:ORIGIN,
  scope:'read_only_verified_public_html_only',notADeploymentGate:true,
  records,exclusions:selected?[]:PRIVATE_FEATURE_GATES,comparisons:compare(records,prior),
  priorities:records.flatMap(r=>action(r).map(f=>({...f,url:r.url,strategy:r.strategy}))).slice(0,35),
  summary:{eligibleRequested:targets.length,strategies:devices,apiCalls:calls,
   publicHtmlTransportObserved:htmlTransport.size,
   observed:records.filter(x=>x.status==='observed').length,
   unavailable:records.filter(x=>x.status==='unavailable').length,
   excluded:records.filter(x=>x.status==='excluded').length},
  limitation:'PSI Lighthouse results are lab measurements. The separate HTML transport measurements are CI runner response-header and complete-decoded-HTML durations, not TTFB, LCP, INP or real-user Core Web Vitals. Missing PSI is not zero. Single-run changes need repetition. No protected pages were tested.'};
 const folder='.performanceci';
 fs.mkdirSync(folder,{recursive:true});
 fs.writeFileSync(path.join(folder,'report.json'),JSON.stringify(report,null,2)+'\n');
 fs.writeFileSync(path.join(folder,'report.html'),renderHtml(report));
 // For next release, retain only evidence that contains observed production measurements.
 if(report.summary.observed>0)fs.writeFileSync(path.join(folder,'latest-baseline.json'),JSON.stringify(report,null,2)+'\n');
 console.log('PSI_AUDIT_RESULT='+JSON.stringify({mode,releaseSha:report.releaseSha,summary:report.summary,notAReleaseGate:true}));
 if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,
  '### Read-only post-release performance CI\n- Lab runs: '+report.summary.observed+
  '; API attempts: '+calls+'; skipped private or canonicalized pages: '+report.summary.excluded+
  '\n- CrUX/INP absent is reported as unknown. CI artifacts contain redacted JSON and HTML. Single lab scores cannot block production.\n');
 return report;
}
export function sourceSelfTest(){
 for(const url of [ORIGIN+'/fa/',ORIGIN+'/en/shop/',ORIGIN+'/journal/'])validatedPublicUrl(url);
 for(const url of [
  ORIGIN+'/fa/app/student/bahar/',ORIGIN+'/fa/assessments/golden-talent/start/',
  ORIGIN+'/en/account/',ORIGIN+'/fa/checkout/',ORIGIN+'/fa/?token=secret',
  ORIGIN+'/fa/#abc','https://evil.example/fa/','http://drjavadrezazadeh.com/fa/'
 ]){
  let blocked=false;try{validatedPublicUrl(url);}catch{blocked=true;}
  if(!blocked)throw Error('source_self_test_failed_to_block_private');
 }
 const sample=ORIGIN+'/fa/';
 const eligible='<link rel="canonical" href="'+sample+'"><meta name="robots" content="index,follow">';
 if(classifyPublicResponse(eligible,sample,200)!=='eligible')throw Error('valid_canonical_rejected');
 if(classifyPublicResponse(eligible+'<meta name="robots" content="noindex">',sample,200)!=='noindex_meta')
  throw Error('noindex_not_rejected');
 const synthetic={lighthouseResult:{finalUrl:sample,categories:{
  performance:{score:.89},accessibility:{score:1},'best-practices':{score:.96},seo:{score:1}},
  audits:{'largest-contentful-paint':{numericValue:2400},'cumulative-layout-shift':{numericValue:.05},'total-blocking-time':{numericValue:150}}}};
 const normalized=normalizePsi(synthetic,sample,'mobile',new Date().toISOString());
 if(normalized.categories.performance!==89||normalized.fieldVitals.inpMs!==null||normalized.lab.cls!==.05)
  throw Error('source_self_test_metric_discrepancy');
 console.log('PASS production PageSpeed observer: origin, canonical, noindex, private exclusions, lab/field separation');
}
