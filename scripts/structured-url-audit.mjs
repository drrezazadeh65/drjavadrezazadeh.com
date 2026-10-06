import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const PROD='https://drjavadrezazadeh.com';
const ignored=new Set(['.git','node_modules']);
const files=[];
function walk(dir){
  for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
    if(ignored.has(ent.name)) continue;
    const full=path.join(dir,ent.name);
    if(ent.isDirectory()) walk(full);
    else if(ent.isFile()) files.push(path.relative(root,full).replaceAll(path.sep,'/'));
  }
}
walk(root);
const fileSet=new Set(files);
const htmlFiles=files.filter(f=>f.endsWith('.html'));
const failures=[];
const warnings=[];

function routeForFile(file){
  if(file==='index.html') return '/';
  if(file.endsWith('/index.html')) return '/'+file.slice(0,-'index.html'.length);
  return '/'+file;
}
function targetFileFromUrl(u){
  let p=u.pathname.replace(/^\/+/,'');
  if(!p) return 'index.html';
  if(fileSet.has(p)) return p;
  if(p.endsWith('/')) return p+'index.html';
  if(fileSet.has(p+'/index.html')) return p+'/index.html';
  return p;
}
function isIndexable(html){
  const m=html.match(/<meta\b[^>]*name=["']robots["'][^>]*content=["']([^"']*)["'][^>]*>/i) ||
          html.match(/<meta\b[^>]*content=["']([^"']*)["'][^>]*name=["']robots["'][^>]*>/i);
  return !m||!/\bnoindex\b/i.test(m[1]||'');
}
function validateOwnUrl(raw,context,{requireProd=true}={}){
  if(typeof raw!=='string'||!/^https?:\/\//i.test(raw)) return;
  let u;
  try{u=new URL(raw)}catch{failures.push(context+': invalid URL '+raw);return}
  if(u.hostname==='drrezazadeh65.github.io'){
    failures.push(context+': legacy GitHub Pages URL remains '+raw);
    return;
  }
  if(u.hostname==='www.drjavadrezazadeh.com'){
    failures.push(context+': noncanonical www URL remains '+raw);
    return;
  }
  if(u.hostname!=='drjavadrezazadeh.com') return;
  if(requireProd&&u.protocol!=='https:') failures.push(context+': production URL must use HTTPS '+raw);
  const target=targetFileFromUrl(u);
  if(!fileSet.has(target)) failures.push(context+': own-domain structured/social URL has no local target '+raw+' -> /'+target);
}
function visit(node,fn,key='root'){
  if(Array.isArray(node)){node.forEach((v,i)=>visit(v,fn,key+'['+i+']'));return}
  if(node&&typeof node==='object'){
    for(const [k,v] of Object.entries(node)){
      if(typeof v==='string') fn(v,k);
      else visit(v,fn,k);
    }
  }
}

for(const file of htmlFiles){
  const html=fs.readFileSync(path.join(root,file),'utf8');
  if(!isIndexable(html)) continue;
  const route=routeForFile(file);

  for(const prop of ['og:image','og:url']){
    const re=new RegExp('<meta\\b[^>]*property=["\\\']'+prop.replace(':','\\:')+'["\\\'][^>]*content=["\\\']([^"\\\']+)["\\\'][^>]*>','i');
    const reverse=new RegExp('<meta\\b[^>]*content=["\\\']([^"\\\']+)["\\\'][^>]*property=["\\\']'+prop.replace(':','\\:')+'["\\\'][^>]*>','i');
    const m=html.match(re)||html.match(reverse);
    if(m) validateOwnUrl(m[1],route+' '+prop);
  }

  for(const m of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){
    let data;
    try{data=JSON.parse(m[1])}
    catch(e){failures.push(route+': invalid JSON-LD '+e.message);continue}
    visit(data,(value,key)=>{
      // Only URL-bearing schema fields and absolute own-domain URLs are relevant here.
      const urlField=['@id','url','item','contentUrl','thumbnailUrl','embedUrl','mainEntityOfPage'].includes(key);
      if(urlField||/^https?:\/\/(?:www\.)?drjavadrezazadeh\.com/i.test(value)||value.includes('drrezazadeh65.github.io')){
        validateOwnUrl(value,route+' JSON-LD '+key);
      }
    });
  }

  // BreadcrumbList items on the production domain must be real routes.
  for(const m of html.matchAll(/"@type"\s*:\s*"BreadcrumbList"[\s\S]*?"itemListElement"\s*:\s*(\[[\s\S]*?\])/g)){
    let arr;
    try{arr=JSON.parse(m[1])}catch{continue}
    let expected=1;
    for(const crumb of arr){
      if(crumb?.position!==expected) warnings.push(route+': BreadcrumbList position sequence is non-contiguous at '+String(crumb?.position));
      expected++;
      if(typeof crumb?.item==='string') validateOwnUrl(crumb.item,route+' BreadcrumbList item');
    }
  }
}

console.log('Structured/social URL integrity audit: '+htmlFiles.length+' HTML files scanned.');
if(warnings.length){
  console.warn('\nStructured/social URL warnings ('+warnings.length+')');
  warnings.forEach(x=>console.warn('! '+x));
}
if(failures.length){
  console.error('\nStructured/social URL failures ('+failures.length+')');
  failures.forEach(x=>console.error('✗ '+x));
  process.exit(1);
}
console.log('No broken own-domain URLs found in released JSON-LD or Open Graph metadata.');
