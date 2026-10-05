import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const ignoreDirs=new Set(['.git','node_modules']);
const htmlFiles=[];
function walk(dir){
  for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
    if(ignoreDirs.has(ent.name)) continue;
    const p=path.join(dir,ent.name);
    if(ent.isDirectory()) walk(p);
    else if(ent.isFile() && ent.name.endsWith('.html')) htmlFiles.push(p);
  }
}
walk(root);

const failures=[];
const warnings=[];
const canonicals=new Map();
const routeFor=file=>{
  const rel=path.relative(root,file).replaceAll(path.sep,'/');
  if(rel==='index.html') return '/';
  if(rel.endsWith('/index.html')) return '/'+rel.slice(0,-'index.html'.length);
  return '/'+rel;
};
const getAttr=(tag,name)=>{
  const m=tag.match(new RegExp('\\b'+name+'\\s*=\\s*["\']([^"\']*)["\']','i'));
  return m?m[1]:null;
};
const strip=(s='')=>s.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
const existsTarget=(file,href)=>{
  if(!href || /^(?:https?:|mailto:|tel:|javascript:|#)/i.test(href)) return true;
  const noHash=href.split('#')[0].split('?')[0];
  if(!noHash) return true;
  const baseDir=path.dirname(file);
  let target=noHash.startsWith('/')?path.join(root,noHash):path.resolve(baseDir,noHash);
  if(fs.existsSync(target) && fs.statSync(target).isDirectory()) target=path.join(target,'index.html');
  else if(!path.extname(target)) target=path.join(target,'index.html');
  return fs.existsSync(target);
};

for(const file of htmlFiles){
  const html=fs.readFileSync(file,'utf8');
  const route=routeFor(file);
  const htmlTag=(html.match(/<html\b[^>]*>/i)||[''])[0];
  const lang=getAttr(htmlTag,'lang');
  const dir=getAttr(htmlTag,'dir');
  const robots=((html.match(/<meta\b[^>]*name=["']robots["'][^>]*>/i)||[''])[0]);
  const robotContent=getAttr(robots,'content')||'';
  const isIndexable=!/\bnoindex\b/i.test(robotContent);
  const isPrivate=/^\/(?:fa\/)?(?:app|login|register|shop|assessments)(?:\/|$)/.test(route) ||
    /^\/fa\/(?:darkhast-moshavere|harim-khosusi|siasat-moshavere)(?:\/|$)/.test(route) ||
    /^\/(?:privacy|consultation-policy)(?:\/|$)/.test(route);

  if(!lang) failures.push(route+': missing html[lang]');
  if(lang==='fa' && dir!=='rtl') failures.push(route+': Persian page must use dir="rtl"');
  if(lang==='en' && dir && dir!=='ltr') failures.push(route+': English page must use dir="ltr"');
  if(!/<meta\b[^>]*name=["']viewport["']/i.test(html)) failures.push(route+': missing viewport meta');

  const h1=(html.match(/<h1\b/gi)||[]).length;
  if(h1!==1) failures.push(route+': expected exactly one H1, found '+h1);

  const title=strip((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)||[])[1]||'');
  if(!title) failures.push(route+': missing title');

  if(isPrivate && isIndexable) failures.push(route+': private/transactional route must be noindex');

  if(isIndexable){
    const descTag=(html.match(/<meta\b[^>]*name=["']description["'][^>]*>/i)||[''])[0];
    const desc=getAttr(descTag,'content');
    if(!desc || desc.length<40) failures.push(route+': indexable page missing substantive meta description');
    const canonicalTag=(html.match(/<link\b[^>]*rel=["']canonical["'][^>]*>/i)||[''])[0];
    const canonical=getAttr(canonicalTag,'href');
    if(!canonical) failures.push(route+': indexable page missing canonical');
    else{
      if(canonicals.has(canonical)) failures.push(route+': duplicate canonical also used by '+canonicals.get(canonical));
      canonicals.set(canonical,route);
    }
  }

  for(const img of html.match(/<img\b[^>]*>/gi)||[]){
    const alt=getAttr(img,'alt');
    if(alt===null) failures.push(route+': image missing alt attribute: '+img.slice(0,120));
    const width=getAttr(img,'width'),height=getAttr(img,'height');
    if(!width||!height) warnings.push(route+': image missing explicit width/height: '+(getAttr(img,'src')||'unknown'));
  }

  for(const a of html.match(/<a\b[^>]*>/gi)||[]){
    const href=getAttr(a,'href');
    if(href && !existsTarget(file,href)) failures.push(route+': broken internal href '+href);
  }

  if(isIndexable && /<script\b[^>]+src=["']https?:\/\//i.test(html)){
    warnings.push(route+': indexable page loads third-party script; review performance/privacy impact');
  }
}

if(failures.length){
  console.error('\nSEO regression failures ('+failures.length+')');
  failures.forEach(x=>console.error('✗ '+x));
}
if(warnings.length){
  console.warn('\nSEO regression warnings ('+warnings.length+')');
  warnings.forEach(x=>console.warn('! '+x));
}
console.log('\nAudited '+htmlFiles.length+' HTML files; '+canonicals.size+' indexable canonical URLs.');
if(failures.length) process.exit(1);
