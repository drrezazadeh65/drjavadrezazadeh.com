import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const manifestPath=path.join(root,'platform','public-url-stability-manifest.json');
const redirectsPath=path.join(root,'_redirects');
const failures=[];

if(!fs.existsSync(manifestPath)){
  console.error('Missing platform/public-url-stability-manifest.json');
  process.exit(1);
}

const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
const origin=manifest.production_origin;
if(origin!=='https://drjavadrezazadeh.com') failures.push('production_origin must remain https://drjavadrezazadeh.com');
if(manifest.policy?.route_identity_is_stable!==true) failures.push('route_identity_is_stable must be true');
if(manifest.policy?.rename_requires_permanent_redirect!==true) failures.push('rename_requires_permanent_redirect must be true');
if(manifest.policy?.deletion_without_redirect!==false) failures.push('deletion_without_redirect must be false');
if(manifest.policy?.redirect_chain_allowed!==false) failures.push('redirect_chain_allowed must be false');

const files=[];
function walk(dir){
  for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
    if(['.git','node_modules'].includes(ent.name)) continue;
    const full=path.join(dir,ent.name);
    if(ent.isDirectory()) walk(full);
    else if(ent.isFile()) files.push(path.relative(root,full).replaceAll(path.sep,'/'));
  }
}
walk(root);
const fileSet=new Set(files);

function routeToFile(route){
  let p=(route||'/').split(/[?#]/)[0];
  if(!p.startsWith('/')) p='/'+p;
  p=p.replace(/^\/+/,'');
  if(!p) return 'index.html';
  if(fileSet.has(p)) return p;
  if(p.endsWith('/')) return p+'index.html';
  if(fileSet.has(p+'/index.html')) return p+'/index.html';
  return p;
}
function fileForRouteExists(route){
  return fileSet.has(routeToFile(route));
}

const redirectMap=new Map();
if(fs.existsSync(redirectsPath)){
  for(const raw of fs.readFileSync(redirectsPath,'utf8').split(/\r?\n/)){
    const line=raw.trim();
    if(!line||line.startsWith('#')) continue;
    const [source,destination,status='301']=line.split(/\s+/);
    if(!source||!destination) continue;
    if(['301','308'].includes(String(status))) redirectMap.set(source,destination);
  }
}

const frozen=Array.isArray(manifest.frozen_indexable_routes)?manifest.frozen_indexable_routes:[];
if(!frozen.length) failures.push('frozen_indexable_routes must not be empty');
const seen=new Set();
for(const route of frozen){
  if(seen.has(route)) failures.push('duplicate frozen route '+route);
  seen.add(route);
  if(!route.startsWith('/')||!route.endsWith('/')) failures.push('frozen route must use slash-normalized path '+route);
  if(fileForRouteExists(route)) continue;
  const dest=redirectMap.get(route);
  if(!dest) failures.push('frozen route disappeared without permanent redirect '+route);
  else if(!fileForRouteExists(dest)) failures.push('frozen route redirects to missing destination '+route+' -> '+dest);
}

// Every currently indexed sitemap URL must already be part of the frozen stability registry.
const sitemapRoutes=new Set();
for(const sm of files.filter(f=>/^sitemap-(?:core|fa|en|news)\.xml$/.test(path.basename(f)))){
  const xml=fs.readFileSync(path.join(root,sm),'utf8');
  for(const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)){
    const loc=m[1].trim();
    let u;
    try{u=new URL(loc)}catch{failures.push(sm+': invalid loc '+loc);continue}
    if(u.origin!==origin) failures.push(sm+': non-production origin '+loc);
    const route=u.pathname.endsWith('/')?u.pathname:u.pathname+'/';
    sitemapRoutes.add(route);
    if(!seen.has(route)) failures.push(sm+': indexable URL not registered in frozen stability manifest '+route);
  }
}
for(const route of frozen){
  if(!sitemapRoutes.has(route)) failures.push('frozen indexable route missing from all child sitemaps '+route);
}

// Canonical of every frozen route must self-reference the production origin when the page still exists.
for(const route of frozen){
  const file=routeToFile(route);
  if(!fileSet.has(file)) continue;
  const html=fs.readFileSync(path.join(root,file),'utf8');
  const m=html.match(/<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i) ||
          html.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["'][^>]*>/i);
  if(!m){failures.push(route+': missing canonical');continue}
  const expected=origin+route;
  if(m[1]!==expected) failures.push(route+': canonical drift '+m[1]+' expected '+expected);
}

if(failures.length){
  console.error('\nURL stability failures ('+failures.length+')');
  failures.forEach(x=>console.error('✗ '+x));
  process.exit(1);
}
console.log('URL stability audit: '+frozen.length+' frozen indexable routes preserved with self-canonicals and sitemap continuity.');
