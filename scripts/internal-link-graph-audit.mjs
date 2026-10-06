import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const PROD='https://drjavadrezazadeh.com';
const ignore=new Set(['.git','node_modules']);
const files=[];
function walk(dir){
  for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
    if(ignore.has(ent.name)) continue;
    const full=path.join(dir,ent.name);
    if(ent.isDirectory()) walk(full);
    else if(ent.isFile()) files.push(path.relative(root,full).replaceAll(path.sep,'/'));
  }
}
walk(root);
const fileSet=new Set(files);
const htmlFiles=files.filter(f=>f.endsWith('.html'));
const htmlMap=new Map(htmlFiles.map(f=>[f,fs.readFileSync(path.join(root,f),'utf8')]));
const failures=[];
const warnings=[];

function routeForFile(file){
  if(file==='index.html') return '/';
  if(file.endsWith('/index.html')) return '/'+file.slice(0,-'index.html'.length);
  return '/'+file;
}
function routeToFile(route){
  let p=(route||'/').split(/[?#]/)[0].replace(/^\/+/,'');
  if(!p) return 'index.html';
  if(fileSet.has(p)) return p;
  if(p.endsWith('/')) return p+'index.html';
  if(fileSet.has(p+'/index.html')) return p+'/index.html';
  return p;
}
function normalizeLocalHref(fromFile,href){
  if(!href||/^(?:mailto:|tel:|sms:|javascript:|data:|blob:)/i.test(href)) return null;
  try{
    const base=new URL(routeForFile(fromFile),PROD);
    const u=new URL(href,base);
    if(u.hostname!=='drjavadrezazadeh.com'&&u.hostname!=='www.drjavadrezazadeh.com') return null;
    let route=u.pathname;
    if(!route.endsWith('/')&&!path.extname(route)) route+='/';
    return route.replace(/\/+/g,'/');
  }catch{return null}
}
function noindex(html){
  const m=html.match(/<meta\b[^>]*name=["']robots["'][^>]*content=["']([^"']*)["'][^>]*>/i) ||
          html.match(/<meta\b[^>]*content=["']([^"']*)["'][^>]*name=["']robots["'][^>]*>/i);
  return !!(m&&/\bnoindex\b/i.test(m[1]||''));
}

const indexable=new Set();
for(const sm of files.filter(f=>/^sitemap-(?:core|fa|en|news)\.xml$/.test(path.basename(f)))){
  const xml=fs.readFileSync(path.join(root,sm),'utf8');
  for(const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)){
    try{
      const u=new URL(m[1].trim());
      if(u.origin!==PROD) continue;
      const route=u.pathname.endsWith('/')?u.pathname:u.pathname+'/';
      indexable.add(route);
    }catch{}
  }
}

const inboundAny=new Map([...indexable].map(r=>[r,new Set()]));
const inboundIndexable=new Map([...indexable].map(r=>[r,new Set()]));
const edges=new Map();

for(const [file,html] of htmlMap.entries()){
  const source=routeForFile(file);
  const sourceIndexable=indexable.has(source)&&!noindex(html);
  const out=new Set();
  for(const m of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi)){
    const target=normalizeLocalHref(file,m[1]);
    if(!target) continue;
    out.add(target);
    if(indexable.has(target)&&target!==source){
      inboundAny.get(target)?.add(source);
      if(sourceIndexable) inboundIndexable.get(target)?.add(source);
    }
  }
  edges.set(source,out);
}

for(const route of indexable){
  if(route==='/') continue;
  const any=inboundAny.get(route)||new Set();
  const idx=inboundIndexable.get(route)||new Set();
  if(any.size===0) failures.push(route+': indexable URL is orphaned; no internal HTML page links to it');
  else if(idx.size===0) warnings.push(route+': no incoming link from another indexable page; only noindex/utility sources currently discover it');
}

// Crawl depth from root through all local HTML links. No released indexable page should be unreachable.
const depth=new Map([['/',0]]);
const queue=['/'];
while(queue.length){
  const src=queue.shift();
  const d=depth.get(src);
  for(const target of edges.get(src)||[]){
    const targetFile=routeToFile(target);
    if(!fileSet.has(targetFile)) continue;
    const targetRoute=routeForFile(targetFile);
    if(!depth.has(targetRoute)){
      depth.set(targetRoute,d+1);
      queue.push(targetRoute);
    }
  }
}
for(const route of indexable){
  if(!depth.has(route)) failures.push(route+': indexable URL is unreachable from the root internal-link graph');
  else if(depth.get(route)>5) warnings.push(route+': crawl depth is '+depth.get(route)+' clicks from root');
}

console.log('Internal-link graph audit: '+indexable.size+' indexable routes across '+htmlFiles.length+' HTML documents.');
if(warnings.length){
  console.warn('\nInternal-link graph warnings ('+warnings.length+')');
  warnings.forEach(x=>console.warn('! '+x));
}
if(failures.length){
  console.error('\nInternal-link graph failures ('+failures.length+')');
  failures.forEach(x=>console.error('✗ '+x));
  process.exit(1);
}
console.log('No orphaned or root-unreachable indexable routes detected.');
