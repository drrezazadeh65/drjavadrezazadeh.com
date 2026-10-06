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

const routeFor=file=>{
  const rel=path.relative(root,file).replaceAll(path.sep,'/');
  if(rel==='index.html') return '/';
  if(rel.endsWith('/index.html')) return '/'+rel.slice(0,-'index.html'.length);
  return '/'+rel;
};
const getAttr=(tag,name)=>{
  const m=tag.match(new RegExp('\\b'+name+'\\s*=\\s*(["\\\'])(.*?)\\1','i'));
  return m?m[2]:null;
};
const strip=(s='')=>s
  .replace(/<script[\s\S]*?<\/script>/gi,' ')
  .replace(/<style[\s\S]*?<\/style>/gi,' ')
  .replace(/<[^>]+>/g,' ')
  .replace(/&nbsp;/gi,' ')
  .replace(/&amp;/gi,'&')
  .replace(/\s+/g,' ')
  .trim();

const failures=[];
const warnings=[];
const titles=new Map();
const descriptions=new Map();
const canonicals=new Map();
let indexableCount=0;

const bannedPlaceholder=/\b(?:lorem ipsum|coming soon|placeholder|todo|tbd|example content|sample text)\b/i;

for(const file of htmlFiles){
  const html=fs.readFileSync(file,'utf8');
  const route=routeFor(file);
  const robotsTag=(html.match(/<meta\b[^>]*name=["']robots["'][^>]*>/i)||[''])[0];
  const robotContent=getAttr(robotsTag,'content')||'';
  const isIndexable=!/\bnoindex\b/i.test(robotContent);
  if(!isIndexable) continue;
  indexableCount++;

  const title=strip((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)||[])[1]||'');
  const descTag=(html.match(/<meta\b[^>]*name=["']description["'][^>]*>/i)||[''])[0];
  const description=(getAttr(descTag,'content')||'').replace(/\s+/g,' ').trim();
  const canonicalTag=(html.match(/<link\b[^>]*rel=["']canonical["'][^>]*>/i)||[''])[0];
  const canonical=(getAttr(canonicalTag,'href')||'').trim();
  const h1Matches=[...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)];
  const h1=h1Matches.length===1?strip(h1Matches[0][1]):'';

  if(!title) failures.push(route+': missing title');
  if(!description) failures.push(route+': missing meta description');
  if(!canonical) failures.push(route+': missing canonical');
  if(!h1) failures.push(route+': missing substantive H1');

  if(bannedPlaceholder.test(title)) failures.push(route+': placeholder language found in title');
  if(bannedPlaceholder.test(description)) failures.push(route+': placeholder language found in meta description');
  if(bannedPlaceholder.test(h1)) failures.push(route+': placeholder language found in H1');

  if(title){
    const key=title.toLocaleLowerCase();
    if(titles.has(key)) failures.push(route+': duplicate indexable title also used by '+titles.get(key)+' -> '+title);
    else titles.set(key,route);
  }
  if(description){
    const key=description.toLocaleLowerCase();
    if(descriptions.has(key)) failures.push(route+': duplicate indexable meta description also used by '+descriptions.get(key));
    else descriptions.set(key,route);
  }
  if(canonical){
    if(canonicals.has(canonical)) failures.push(route+': duplicate canonical also used by '+canonicals.get(canonical));
    else canonicals.set(canonical,route);
    if(!canonical.startsWith('https://drjavadrezazadeh.com/')){
      failures.push(route+': canonical must use the production HTTPS apex');
    }
  }

  const ogUrlTag=(html.match(/<meta\b[^>]*property=["']og:url["'][^>]*>/i)||[''])[0];
  const ogUrl=(getAttr(ogUrlTag,'content')||'').trim();
  if(ogUrl && canonical && ogUrl!==canonical) failures.push(route+': og:url differs from canonical');

  const ogTitleTag=(html.match(/<meta\b[^>]*property=["']og:title["'][^>]*>/i)||[''])[0];
  const ogDescTag=(html.match(/<meta\b[^>]*property=["']og:description["'][^>]*>/i)||[''])[0];
  const ogImageTag=(html.match(/<meta\b[^>]*property=["']og:image["'][^>]*>/i)||[''])[0];
  const twitterCardTag=(html.match(/<meta\b[^>]*name=["']twitter:card["'][^>]*>/i)||[''])[0];
  if(!ogTitleTag) failures.push(route+': missing og:title');
  if(!ogDescTag) failures.push(route+': missing og:description');
  if(!ogUrlTag) failures.push(route+': missing og:url');
  if(!ogImageTag) failures.push(route+': missing og:image');
  if(!twitterCardTag) failures.push(route+': missing twitter:card');

  const visibleText=strip((html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)||[])[1]||'');
  if(visibleText.length<180){
    warnings.push(route+': very little visible main-content text; manually review intent completeness');
  }
}

if(failures.length){
  console.error('\nMetadata/content-identity failures ('+failures.length+')');
  failures.forEach(x=>console.error('✗ '+x));
}
if(warnings.length){
  console.warn('\nMetadata/content-identity warnings ('+warnings.length+')');
  warnings.forEach(x=>console.warn('! '+x));
}
console.log('\nMetadata uniqueness audit: '+indexableCount+' indexable pages, '+titles.size+' unique titles, '+descriptions.size+' unique descriptions.');
if(failures.length) process.exit(1);
