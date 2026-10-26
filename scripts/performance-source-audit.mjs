import fs from 'node:fs';
import path from 'node:path';
import {isOwnershipVerificationArtifact} from './site-ownership-verification.mjs';

const root=process.cwd();
const ignored=new Set(['.git','.github','node_modules','.public-site','identity','proposals','work','test-results','docs','platform','foundation','scripts','tests','database','migrations','payment-api']);
const htmlFiles=[];

function walk(dir){
  for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
    if(ignored.has(ent.name)) continue;
    const full=path.join(dir,ent.name);
    if(ent.isDirectory()) walk(full);
    else if(ent.isFile()&&ent.name.endsWith('.html') &&
      !isOwnershipVerificationArtifact(path.relative(root,full))) htmlFiles.push(full);
  }
}
walk(root);

const failures=[];
const warnings=[];
let indexableCount=0;
let imageCount=0;

function attr(tag,name){
  const re=new RegExp('\\b'+name+'\\s*=\\s*["\\\']([^"\\\']*)["\\\']','i');
  const m=tag.match(re);
  return m?m[1]:null;
}

function isAbsoluteHttp(value){
  return value.startsWith('http://')||value.startsWith('https://');
}

function isOwnOrigin(value){
  if(!isAbsoluteHttp(value)) return false;
  try{
    const u=new URL(value);
    return u.protocol==='https:' && (u.hostname==='drjavadrezazadeh.com'||u.hostname==='www.drjavadrezazadeh.com');
  }catch{
    return false;
  }
}

// Inspect EVERY HTML surface, including private dashboards, without requesting
// a single production URL. No field CWV or Lighthouse score is inferred here.
const routeInventory=[];
function routeFor(rel){
  return rel==='index.html'?'/':'/'+rel.replace(/index\.html$/,'');
}
function localResourceSize(raw,route){
  if(!raw||raw.startsWith('data:'))return null;
  let parsed;
  try{parsed=new URL(raw,'https://drjavadrezazadeh.com'+route);}catch{return null;}
  if(parsed.origin!=='https://drjavadrezazadeh.com')return null;
  let relative;
  try{relative=decodeURIComponent(parsed.pathname).replace(/^\/+/,'');}
  catch{return null;}
  if(!relative||relative.split('/').includes('..'))return null;
  const resolved=path.resolve(root,relative);
  if(!resolved.startsWith(root+path.sep))return null;
  try{return fs.statSync(resolved).isFile()?fs.statSync(resolved).size:null;}catch{return null;}
}
function mediaBytes(html,tags,route,attribute){
  const resources=[...html.matchAll(tags)].map(m=>attr(m[0],attribute)).filter(Boolean);
  const seen=new Set();
  let bytes=0;
  let missing=0;
  for(const src of resources){
    if(seen.has(src))continue;
    seen.add(src);
    const size=localResourceSize(src,route);
    if(size===null){missing++;continue;}
    bytes+=size;
  }
  return {references:resources.length,unique:seen.size,rawLocalBytes:bytes,unresolved:missing};
}
for(const file of htmlFiles){
  const rel=path.relative(root,file).replaceAll(path.sep,'/');
  const html=fs.readFileSync(file,'utf8');
  const noindex=/<meta\b[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html);
  const route=routeFor(rel);
  const css=mediaBytes(html,/<link\b[^>]*rel=["']stylesheet["'][^>]*>/gi,route,'href');
  const js=mediaBytes(html,/<script\b[^>]*src=["'][^"']+["'][^>]*>/gi,route,'src');
  const imageTags=[...html.matchAll(/<img\b[^>]*>/gi)].map(m=>m[0]);
  const eagerImages=imageTags.filter(tag=>!(/loading=["']lazy["']/i).test(tag)).length;
  routeInventory.push({
    route,scope:noindex?'PRIVATE_OR_NONINDEX':'PUBLIC_INDEXABLE',
    documentBytes:Buffer.byteLength(html,'utf8'),
    css,js,imageTags:imageTags.length,eagerImages
  });
  // Budget for every page, including private dashboards. Byte counts are raw
  // source approximations; Brotli transfer and actual browser requests differ.
  if(css.rawLocalBytes>300000)
    warnings.push(rel+': CSS source budget >300KB ('+css.rawLocalBytes+' bytes)');
  if(js.rawLocalBytes>180000)
    warnings.push(rel+': static JavaScript source budget >180KB ('+js.rawLocalBytes+' bytes)');
  if(eagerImages>7)
    warnings.push(rel+': '+eagerImages+' eager images may compete with the first-screen LCP');
  if(noindex) continue;
  indexableCount++;

  if(!/<meta\b[^>]*name=["']viewport["'][^>]*content=["'][^"']*width=device-width/i.test(html)){
    failures.push(rel+': missing responsive viewport meta');
  }

  if(/fonts\.googleapis\.com|fonts\.gstatic\.com/i.test(html)){
    failures.push(rel+': third-party Google webfont dependency detected');
  }

  const styleLinks=[...html.matchAll(/<link\b[^>]*rel=["']stylesheet["'][^>]*>/gi)].map(m=>m[0]);
  for(const tag of styleLinks){
    const href=attr(tag,'href')||'';
    if(isAbsoluteHttp(href)&&!isOwnOrigin(href)){
      failures.push(rel+': third-party render-blocking stylesheet '+href);
    }
  }

  const images=[...html.matchAll(/<img\b[^>]*>/gi)].map(m=>m[0]);
  imageCount+=images.length;
  let highPriority=0;
  for(const tag of images){
    const src=attr(tag,'src')||'';
    const width=attr(tag,'width');
    const height=attr(tag,'height');
    const officialEnamad=/^https:\/\/trustseal\.enamad\.ir\/logo\.aspx\?id=8075712&Code=sealMJydDpzqNid1Ty82Y90Ef6SZLah1$/.test(src);
    if((!width||!height)&&!officialEnamad) failures.push(rel+': image lacks explicit width/height '+src);
    if(/fetchpriority=["']high["']/i.test(tag)) highPriority++;
  }
  if(highPriority>1) warnings.push(rel+': more than one fetchpriority=high image ('+highPriority+')');

  const scripts=[...html.matchAll(/<script\b[^>]*src=["'][^"']+["'][^>]*>/gi)].map(m=>m[0]);
  for(const tag of scripts){
    const src=attr(tag,'src')||'';
    if(isAbsoluteHttp(src)&&!isOwnOrigin(src)){
      failures.push(rel+': third-party executable script '+src);
      continue;
    }
    if(!/\bdefer\b/i.test(tag)&&!/\basync\b/i.test(tag)&&!/type=["']module["']/i.test(tag)){
      failures.push(rel+': local script can block parsing '+src);
    }
  }

  const inlineStyles=[...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)];
  const inlineBytes=inlineStyles.reduce((n,m)=>n+Buffer.byteLength(m[1]||'','utf8'),0);
  if(inlineBytes>32768) warnings.push(rel+': large inline CSS payload '+inlineBytes+' bytes');

  const htmlBytes=Buffer.byteLength(html,'utf8');
  if(htmlBytes>350000) warnings.push(rel+': large HTML document '+htmlBytes+' bytes');
}

// Per-route inventory makes it impossible to hide poor inner-page budgets
// behind a fast language selector or homepage sample.
const routesByCss=[...routeInventory].sort((a,b)=>b.css.rawLocalBytes-a.css.rawLocalBytes);
const routesByJs=[...routeInventory].sort((a,b)=>b.js.rawLocalBytes-a.js.rawLocalBytes);
if(process.argv.includes('--json')){
 console.log(JSON.stringify({
  schema:'jr.iran-first.per-route-source.v1',
  caveat:'Local raw source inventory only; not Lighthouse or real Iranian field CWV',
  allHtmlRoutes:routeInventory.length,
  publicIndexableRoutes:indexableCount,
  topCssRoutes:routesByCss.slice(0,30),
  topJsRoutes:routesByJs.slice(0,30),
  routes:routeInventory.sort((a,b)=>a.route.localeCompare(b.route)),
  failures,warnings
 },null,2));
}else{
 console.log('Performance source audit: '+indexableCount+' indexable HTML pages, '+imageCount+' image tags checked; '+routeInventory.length+' TOTAL HTML routes inventoried.');
 console.log('Highest CSS source: '+JSON.stringify(routesByCss.slice(0,8).map(x=>[x.route,x.css.rawLocalBytes])));
 console.log('Highest JS source: '+JSON.stringify(routesByJs.slice(0,8).map(x=>[x.route,x.js.rawLocalBytes])));
}
if(!process.argv.includes('--json')&&warnings.length){
  console.warn('Warnings ('+warnings.length+')');
  warnings.forEach(x=>console.warn('! '+x));
}
if(failures.length){
  if(!process.argv.includes('--json')){
    console.error('Performance failures ('+failures.length+')');
    failures.forEach(x=>console.error('✗ '+x));
  }
  process.exitCode=1;
}else if(!process.argv.includes('--json')){
  console.log('No release-blocking source performance regressions detected.');
}
