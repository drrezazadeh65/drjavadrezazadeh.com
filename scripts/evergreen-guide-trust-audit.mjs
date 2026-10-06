import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const guidesRoot=path.join(root,'fa','rahnamaha');
const failures=[];
let checked=0;
let currentRel='';

function getAttr(tag,name){
  const m=tag.match(new RegExp('\\b'+name+'\\s*=\\s*["\\\']([^"\\\']*)["\\\']','i'));
  return m?m[1]:null;
}
function flatten(data){
  if(Array.isArray(data)) return data.flatMap(flatten);
  if(!data||typeof data!=='object') return [];
  if(Array.isArray(data['@graph'])) return data['@graph'].flatMap(flatten);
  return [data];
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

for(const ent of fs.readdirSync(guidesRoot,{withFileTypes:true})){
  if(!ent.isDirectory()) continue;
  const file=path.join(guidesRoot,ent.name,'index.html');
  if(!fs.existsSync(file)) continue;
  currentRel=path.relative(root,file).replaceAll(path.sep,'/');
  const html=fs.readFileSync(file,'utf8');
  if(/<meta\b[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html)) continue;
  checked++;

  const canonicalTag=[...html.matchAll(/<link\b[^>]*>/gi)].map(m=>m[0]).find(t=>(getAttr(t,'rel')||'').toLowerCase()==='canonical');
  const canonical=canonicalTag?getAttr(canonicalTag,'href'):null;
  if(!canonical||!ownUrl(canonical)) failures.push(currentRel+': missing valid production canonical');

  const objs=[];
  for(const m of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){
    try{objs.push(...flatten(JSON.parse(m[1])));}
    catch{failures.push(currentRel+': invalid JSON-LD');}
  }

  const article=objs.find(x=>hasType(x,'Article'));
  if(!article){failures.push(currentRel+': missing Article JSON-LD'); continue;}
  if(!validIsoDate(article.datePublished)) failures.push(currentRel+': datePublished must be YYYY-MM-DD');
  if(!validIsoDate(article.dateModified)) failures.push(currentRel+': dateModified must be YYYY-MM-DD');
  if(validIsoDate(article.datePublished)&&validIsoDate(article.dateModified)&&article.dateModified<article.datePublished){
    failures.push(currentRel+': dateModified precedes datePublished');
  }
  if(article.inLanguage!=='fa') failures.push(currentRel+': Article inLanguage must be fa');
  if(!article.author||!hasType(article.author,'Person')||!article.author.name) failures.push(currentRel+': named Person author required');
  if(!article.author?.url||!ownUrl(article.author.url)) failures.push(currentRel+': author URL must use production origin');
  if(article.mainEntityOfPage!==canonical) failures.push(currentRel+': mainEntityOfPage must equal canonical');
  if(!objs.some(x=>hasType(x,'BreadcrumbList'))) failures.push(currentRel+': BreadcrumbList JSON-LD required');

  if(!/<article\b/i.test(html)) failures.push(currentRel+': semantic article element required');
  if(!/<div\b[^>]*class=["'][^"']*article-meta[^"']*["'][^>]*>[\s\S]*?نویسنده:/i.test(html)) failures.push(currentRel+': visible author metadata required');
  if(!/انتشار:/i.test(html)) failures.push(currentRel+': visible publication date required');
  if(!/آخرین بازبینی محتوایی:/i.test(html)) failures.push(currentRel+': visible review date required');

  const bodyText=html
    .replace(/<script[\s\S]*?<\/script>/gi,' ')
    .replace(/<style[\s\S]*?<\/style>/gi,' ')
    .replace(/<[^>]+>/g,' ')
    .replace(/\s+/g,' ')
    .trim();
  if(bodyText.length<1800) failures.push(currentRel+': guide is too thin for released evergreen status');
}

console.log('Evergreen guide trust audit: '+checked+' indexable Persian guide articles checked.');
if(failures.length){
  console.error('Evergreen guide trust failures ('+failures.length+')');
  failures.forEach(x=>console.error('✗ '+x));
  process.exit(1);
}
console.log('All released Persian guides have consistent authorship, review, schema and substantive-content signals.');
