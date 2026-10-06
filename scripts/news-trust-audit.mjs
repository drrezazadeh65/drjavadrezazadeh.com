import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const newsRoot=path.join(root,'fa','akhbar');
const failures=[];
let checked=0;
let currentRel='';

function getAttr(tag,name){
  const m=tag.match(new RegExp('\\b'+name+'\\s*=\\s*["\\\']([^"\\\']*)["\\\']','i'));
  return m?m[1]:null;
}
function findTag(html,tag,requiredAttr,requiredValue){
  const tags=[...html.matchAll(new RegExp('<'+tag+'\\b[^>]*>','gi'))].map(m=>m[0]);
  return tags.find(t=>(getAttr(t,requiredAttr)||'').toLowerCase()===requiredValue.toLowerCase())||null;
}
function schemaObjects(html){
  const out=[];
  for(const m of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){
    try{
      const data=JSON.parse(m[1]);
      if(Array.isArray(data)) out.push(...data);
      else if(data&&Array.isArray(data['@graph'])) out.push(...data['@graph']);
      else if(data) out.push(data);
    }catch{
      failures.push(currentRel+': invalid JSON-LD');
    }
  }
  return out;
}
function hasType(obj,type){
  const t=obj?.['@type'];
  return Array.isArray(t)?t.includes(type):t===type;
}
function validIsoDate(v){
  return typeof v==='string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v+'T00:00:00Z'));
}
function ownUrl(v){
  if(typeof v!=='string') return false;
  try{
    const u=new URL(v);
    return u.protocol==='https:'&&u.hostname==='drjavadrezazadeh.com';
  }catch{return false;}
}

if(!fs.existsSync(newsRoot)){
  console.error('Missing fa/akhbar directory');
  process.exit(1);
}

for(const ent of fs.readdirSync(newsRoot,{withFileTypes:true})){
  if(!ent.isDirectory()) continue;
  const file=path.join(newsRoot,ent.name,'index.html');
  if(!fs.existsSync(file)) continue;
  currentRel=path.relative(root,file).replaceAll(path.sep,'/');
  const html=fs.readFileSync(file,'utf8');
  if(/<meta\b[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html)) continue;

  checked++;
  const canonicalTag=findTag(html,'link','rel','canonical');
  const canonical=canonicalTag?getAttr(canonicalTag,'href'):null;
  if(!canonical||!ownUrl(canonical)) failures.push(currentRel+': missing/invalid production canonical');

  const ogTag=[...html.matchAll(/<meta\b[^>]*>/gi)].map(m=>m[0]).find(t=>(getAttr(t,'property')||'').toLowerCase()==='og:type');
  if(!ogTag||getAttr(ogTag,'content')!=='article') failures.push(currentRel+': og:type must be article');

  const objs=schemaObjects(html);
  const article=objs.find(x=>hasType(x,'NewsArticle'));
  if(!article){
    failures.push(currentRel+': missing NewsArticle JSON-LD');
    continue;
  }
  if(!validIsoDate(article.datePublished)) failures.push(currentRel+': datePublished must be YYYY-MM-DD');
  if(!validIsoDate(article.dateModified)) failures.push(currentRel+': dateModified must be YYYY-MM-DD');
  if(validIsoDate(article.datePublished)&&validIsoDate(article.dateModified)&&article.dateModified<article.datePublished){
    failures.push(currentRel+': dateModified precedes datePublished');
  }
  if(article.inLanguage!=='fa') failures.push(currentRel+': NewsArticle inLanguage must be fa');
  if(!article.author||!hasType(article.author,'Person')||!article.author.name) failures.push(currentRel+': named Person author required');
  if(!article.author?.url||!ownUrl(article.author.url)) failures.push(currentRel+': author URL must use production origin');
  if(article.mainEntityOfPage!==canonical) failures.push(currentRel+': mainEntityOfPage must equal canonical');
  const images=Array.isArray(article.image)?article.image:[article.image].filter(Boolean);
  if(!images.length||images.some(x=>!ownUrl(x))) failures.push(currentRel+': NewsArticle images must use production origin');
  if(!objs.some(x=>hasType(x,'BreadcrumbList'))) failures.push(currentRel+': BreadcrumbList JSON-LD required');
  if(!/<article\b/i.test(html)) failures.push(currentRel+': semantic article element required');
  if(!/<div\b[^>]*class=["'][^"']*article-meta[^"']*["'][^>]*>[\s\S]*?انتشار:/i.test(html)) failures.push(currentRel+': visible publication metadata required');
  if(!/آخرین بازبینی محتوایی:/i.test(html)) failures.push(currentRel+': visible content-review date required');
}

console.log('News trust audit: '+checked+' indexable Persian news articles checked.');
if(failures.length){
  console.error('News trust failures ('+failures.length+')');
  failures.forEach(x=>console.error('✗ '+x));
  process.exit(1);
}
console.log('All indexable Persian news articles have consistent trust and freshness signals.');
