import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const PROD_HOSTS=new Set(['drjavadrezazadeh.com','www.drjavadrezazadeh.com','drrezazadeh65.github.io']);
const ignoredDirs=new Set(['.git','node_modules']);
const htmlFiles=[];
function walk(dir){
  for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
    if(ignoredDirs.has(ent.name)) continue;
    const full=path.join(dir,ent.name);
    if(ent.isDirectory()) walk(full);
    else if(ent.isFile()&&ent.name.endsWith('.html')) htmlFiles.push(full);
  }
}
walk(root);

const sources=new Map();
for(const file of htmlFiles){
  const rel=path.relative(root,file).replaceAll(path.sep,'/');
  const html=fs.readFileSync(file,'utf8');
  for(const m of html.matchAll(/<a\b[^>]*href=["'](https?:\/\/[^"'#\s]+[^"']*)["'][^>]*>/gi)){
    const raw=m[1].replace(/&amp;/g,'&');
    let u;
    try{u=new URL(raw)}catch{continue}
    if(PROD_HOSTS.has(u.hostname)) continue;
    const normalized=u.href;
    if(!sources.has(normalized)) sources.set(normalized,new Set());
    sources.get(normalized).add(rel);
  }
}

const urls=[...sources.keys()];
const hard=[];
const warnings=[];
const ok=[];
const userAgent='Mozilla/5.0 (compatible; DrJavadRezazadehLinkAudit/1.0; +https://drjavadrezazadeh.com/)';

async function probe(url){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),12000);
  try{
    let r;
    try{
      r=await fetch(url,{method:'HEAD',redirect:'follow',headers:{'user-agent':userAgent},signal:controller.signal});
      if([405,501].includes(r.status)) r=await fetch(url,{method:'GET',redirect:'follow',headers:{'user-agent':userAgent,'range':'bytes=0-0'},signal:controller.signal});
    }catch(e){throw e}
    if([404,410].includes(r.status)) hard.push({url,status:r.status,files:[...sources.get(url)]});
    else if(r.status>=500) warnings.push({url,status:r.status,reason:'remote server error',files:[...sources.get(url)]});
    else if([401,403,429].includes(r.status)) warnings.push({url,status:r.status,reason:'restricted/rate-limited; not classified as broken',files:[...sources.get(url)]});
    else if(r.status>=400) warnings.push({url,status:r.status,reason:'non-404 HTTP response requires review',files:[...sources.get(url)]});
    else ok.push({url,status:r.status,final:r.url});
  }catch(e){
    warnings.push({url,status:null,reason:e.name==='AbortError'?'timeout':'network/DNS '+e.message,files:[...sources.get(url)]});
  }finally{
    clearTimeout(timer);
  }
}

for(let i=0;i<urls.length;i+=8){
  await Promise.all(urls.slice(i,i+8).map(probe));
}

console.log('External link monitor: '+urls.length+' unique public external links checked.');
console.log('OK: '+ok.length+' · warnings: '+warnings.length+' · hard 404/410: '+hard.length);
if(warnings.length){
  console.warn('\nExternal link warnings');
  warnings.forEach(x=>console.warn('! '+(x.status??'-')+' '+x.url+' ['+x.reason+'] <- '+x.files.join(', ')));
}
if(hard.length){
  console.error('\nHard broken external links');
  hard.forEach(x=>console.error('✗ '+x.status+' '+x.url+' <- '+x.files.join(', ')));
  process.exit(1);
}
