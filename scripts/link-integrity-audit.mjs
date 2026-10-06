import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const PROD='https://drjavadrezazadeh.com';
const PROD_WWW='https://www.drjavadrezazadeh.com';
const LEGACY='https://drrezazadeh65.github.io/drjavadrezazadeh.com';
const ignoredDirs=new Set(['.git','node_modules']);
const files=[];
function walk(dir){
  for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
    if(ignoredDirs.has(ent.name)) continue;
    const full=path.join(dir,ent.name);
    if(ent.isDirectory()) walk(full);
    else if(ent.isFile()) files.push(path.relative(root,full).replaceAll(path.sep,'/'));
  }
}
walk(root);
const fileSet=new Set(files);
const htmlFiles=files.filter(f=>f.endsWith('.html'));
const htmlCache=new Map(htmlFiles.map(f=>[f,fs.readFileSync(path.join(root,f),'utf8')]));
const failures=[];
const warnings=[];

function routeForFile(file){
  if(file==='index.html') return '/';
  if(file.endsWith('/index.html')) return '/'+file.slice(0,-'index.html'.length);
  return '/'+file;
}
function normalizeRoutePathname(pathname){
  let p=decodeURIComponent(pathname||'/');
  if(!p.startsWith('/')) p='/'+p;
  if(p.startsWith('/drjavadrezazadeh.com/')) p=p.slice('/drjavadrezazadeh.com'.length);
  return p.replace(/\/+/g,'/');
}
function routeToFile(pathname){
  let p=normalizeRoutePathname(pathname).replace(/^\/+/,'');
  if(!p) return 'index.html';
  if(fileSet.has(p)) return p;
  if(p.endsWith('/')) return p+'index.html';
  if(fileSet.has(p+'/index.html')) return p+'/index.html';
  return p;
}
function isIgnoredScheme(raw){
  return /^(mailto:|tel:|sms:|whatsapp:|data:|blob:)/i.test(raw);
}
function resolveInternal(fromFile,raw){
  const value=(raw||'').trim();
  if(!value) return {kind:'placeholder',value};
  if(value==='#'||/^javascript:/i.test(value)) return {kind:'placeholder',value};
  if(isIgnoredScheme(value)) return {kind:'external'};
  try{
    const base=new URL(routeForFile(fromFile),PROD);
    const u=new URL(value,base);
    if(!['http:','https:'].includes(u.protocol)) return {kind:'external'};
    const isLegacy=u.href.startsWith(LEGACY);
    const isProd=u.origin===PROD;
    const isWww=u.origin===PROD_WWW;
    if(!isLegacy&&!isProd&&!isWww) return {kind:'external'};
    let pathname=u.pathname;
    if(isLegacy&&pathname.startsWith('/drjavadrezazadeh.com/')) pathname=pathname.slice('/drjavadrezazadeh.com'.length);
    return {kind:'internal',file:routeToFile(pathname),hash:u.hash,legacy:isLegacy,www:isWww,url:u.href};
  }catch{
    return {kind:'invalid',value};
  }
}
function hasFragment(file,hash){
  if(!hash||hash==='#') return true;
  const html=htmlCache.get(file);
  if(!html) return false;
  let id='';
  try{id=decodeURIComponent(hash.slice(1));}catch{id=hash.slice(1)}
  if(!id) return true;
  const esc=id.replace(/[.*+?^\${}()|[\]\\]/g,'\\$&');
  return new RegExp('(?:id|name)=["\\\']'+esc+'["\\\']','i').test(html);
}

// 404 depth-safety: GitHub Pages serves the same 404 document at arbitrary missing paths, so local recovery/assets must be root-absolute.
const error404=htmlCache.get('404.html');
if(error404){
  if(!/<meta\s+name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(error404)) failures.push('/404.html: missing noindex robots directive');
  for(const m of error404.matchAll(/\b(href|src)=["']([^"']+)["']/gi)){
    const value=m[2].trim();
    if(value.startsWith('./')||value.startsWith('../')) failures.push('/404.html: depth-unsafe relative '+m[1].toLowerCase()+' '+JSON.stringify(value));
  }
}
// 404 depth-safety

let checkedRefs=0;
for(const [from,html] of htmlCache.entries()){
  const refs=[];
  for(const m of html.matchAll(/\b(href|src|poster|action)=["']([^"']*)["']/gi)) refs.push({attr:m[1].toLowerCase(),raw:m[2]});
  for(const ref of refs){
    checkedRefs++;
    const r=resolveInternal(from,ref.raw);
    if(r.kind==='external') continue;
    if(r.kind==='placeholder'){
      failures.push('/'+from+': '+ref.attr+' contains empty/hash/javascript placeholder '+JSON.stringify(ref.raw));
      continue;
    }
    if(r.kind==='invalid'){
      failures.push('/'+from+': invalid '+ref.attr+' URL '+JSON.stringify(ref.raw));
      continue;
    }
    if(r.legacy){
      failures.push('/'+from+': legacy GitHub Pages URL remains in '+ref.attr+' '+r.url);
    }
    if(r.www){
      warnings.push('/'+from+': www absolute URL used; apex is canonical '+r.url);
    }
    if(!fileSet.has(r.file)){
      failures.push('/'+from+': broken internal '+ref.attr+' '+JSON.stringify(ref.raw)+' -> /'+r.file);
      continue;
    }
    if(r.hash&&r.file.endsWith('.html')&&!hasFragment(r.file,r.hash)){
      failures.push('/'+from+': missing fragment target '+JSON.stringify(ref.raw)+' -> /'+r.file+r.hash);
    }
  }
}

for(const sm of files.filter(f=>/^sitemap.*\.xml$/.test(path.basename(f)))){
  const xml=fs.readFileSync(path.join(root,sm),'utf8');
  for(const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)){
    const loc=m[1].trim();
    let u;
    try{u=new URL(loc)}catch{failures.push('/'+sm+': invalid sitemap URL '+loc);continue}
    if(u.origin!==PROD) failures.push('/'+sm+': sitemap URL outside production origin '+loc);
    const target=routeToFile(u.pathname);
    if(!fileSet.has(target)) failures.push('/'+sm+': sitemap URL has no local page '+loc+' -> /'+target);
  }
}

const redirectsFile=path.join(root,'_redirects');
if(fs.existsSync(redirectsFile)){
  const lines=fs.readFileSync(redirectsFile,'utf8').split(/\r?\n/).map(x=>x.trim()).filter(x=>x&&!x.startsWith('#'));
  const redirects=[];
  const sourceMap=new Map();
  for(const line of lines){
    const parts=line.split(/\s+/);
    if(parts.length<2) continue;
    const [source,destination,status='301']=parts;
    if(!source.startsWith('/')){warnings.push('/_redirects: non-path source '+source);continue}
    if(sourceMap.has(source)&&sourceMap.get(source)!==destination) failures.push('/_redirects: conflicting redirect source '+source);
    sourceMap.set(source,destination);
    redirects.push({source,destination,status});
    if(destination.startsWith('/')){
      const target=routeToFile(destination.split(/[?#]/)[0]);
      if(!fileSet.has(target)) failures.push('/_redirects: destination missing '+source+' -> '+destination);
    }
    if(source===destination) failures.push('/_redirects: redirect loop '+source);
    if(!['301','302','307','308','200'].includes(String(status))) warnings.push('/_redirects: unusual status '+status+' for '+source);
  }
  const sources=new Set(redirects.map(r=>r.source));
  for(const r of redirects){
    const dest=r.destination.split(/[?#]/)[0];
    if(dest.startsWith('/')&&sources.has(dest)) failures.push('/_redirects: redirect chain '+r.source+' -> '+r.destination+' -> '+sourceMap.get(dest));
  }
}

console.log('Link integrity audit: '+htmlFiles.length+' HTML files, '+checkedRefs+' href/src/poster/action references.');
if(warnings.length){
  console.warn('\nWarnings ('+warnings.length+')');
  warnings.slice(0,100).forEach(x=>console.warn('! '+x));
}
if(failures.length){
  console.error('\nLink integrity failures ('+failures.length+')');
  failures.slice(0,250).forEach(x=>console.error('✗ '+x));
  if(failures.length>250) console.error('... '+(failures.length-250)+' more');
  process.exit(1);
}
console.log('Zero broken internal references, missing local fragment targets, redirect chains or invalid sitemap destinations detected.');
