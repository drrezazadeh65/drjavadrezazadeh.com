import fs from 'node:fs';
import path from 'node:path';
import {loadHistoricalAuthorityRegistry, historicalAuthorityMaps, normalizeHistoricalPath} from '../platform/historical-authority.mjs';

const root=process.cwd();
const registry=loadHistoricalAuthorityRegistry();
const failures=[];
const warnings=[];
const htaccess=fs.readFileSync(path.join(root,'.htaccess'),'utf8');
const transportPosition=htaccess.indexOf('RewriteRule ^ https://drjavadrezazadeh.com%{REQUEST_URI} [R=301,L,NE]');

function routeToFile(route){
  const clean=String(route||'/').split(/[?#]/)[0];
  if(clean==='/') return path.join(root,'index.html');
  return path.join(root,clean.replace(/^\/+|\/+$/g,''),'index.html');
}
function robotsFor(route){
  const file=routeToFile(route);
  if(!fs.existsSync(file)) return null;
  const html=fs.readFileSync(file,'utf8');
  const m=html.match(/<meta\b[^>]*name=["']robots["'][^>]*content=["']([^"']+)["']/i)||
          html.match(/<meta\b[^>]*content=["']([^"']+)["'][^>]*name=["']robots["']/i);
  return m?m[1]:'';
}
function expectedRewrite(source,target){
  const src=source.replace(/^\/+|\/+$/g,'');
  return 'RewriteRule ^'+src+'/?$ '+registry.production_origin+target+' [R=301,L,NE]';
}

if(registry.production_origin!=='https://drjavadrezazadeh.com') failures.push('Production origin drift');
if(registry.policy?.catch_all_to_homepage_forbidden!==true) failures.push('Catch-all homepage redirects must remain forbidden');
if(registry.policy?.one_hop_only!==true) failures.push('Historical redirects must remain one-hop');
if(registry.policy?.semantic_mismatch_redirect_forbidden!==true) failures.push('Semantic mismatch redirects must remain forbidden');
if(registry.host_consolidation?.http_to_https!=='ACTIVE_CANONICAL_301') failures.push('HTTP→HTTPS canonical consolidation must remain active after trusted TLS issuance');
if(registry.host_consolidation?.www_to_apex!=='ACTIVE_CANONICAL_301') failures.push('www→apex canonical consolidation must remain active after trusted TLS issuance');

const {redirects,candidates}=historicalAuthorityMaps(registry);
if(redirects.size!==registry.authority_redirects.length) failures.push('Duplicate normalized historical source URLs');
const ecosystem=JSON.parse(fs.readFileSync(path.join(root,'platform/ecosystem-registry.json'),'utf8'));
const privatePrefixes=ecosystem.route_families.filter(r=>ecosystem.policies[r.policy]?.cache==='NO_STORE').map(r=>r.prefix);
const sources=new Set(redirects.keys());
for(const [source,rec] of redirects){
  if(source==='/'||source===rec.target) failures.push('Invalid authority redirect '+source+' -> '+rec.target);
  if(rec.status!==301) failures.push('Authority redirect must use 301 '+source);
  if(sources.has(rec.target)) failures.push('Redirect chain forbidden '+source+' -> '+rec.target);
  if(privatePrefixes.some(p=>rec.target===p.slice(0,-1)||rec.target.startsWith(p))) failures.push('Private historical destination forbidden '+source+' -> '+rec.target);
  const targetFile=routeToFile(rec.target);
  if(!fs.existsSync(targetFile)) failures.push('Historical redirect target missing '+source+' -> '+rec.target);
  const robots=robotsFor(rec.target);
  if(robots&&/\bnoindex\b/i.test(robots)) failures.push('Historical authority cannot redirect to noindex '+source+' -> '+rec.target);
  const expected=expectedRewrite(source,rec.target);
  if(!htaccess.includes(expected)) failures.push('Missing exact production redirect: '+expected);
  else if(transportPosition<0||htaccess.indexOf(expected)>transportPosition) failures.push('Historical mapping must precede HTTP/www consolidation: '+source);
}

if(/RewriteRule\s+\^(?:\.\*|\(\.\*\))\$\s+https:\/\/drjavadrezazadeh\.com\/?\s+\[R=30[18]/i.test(htaccess)){
  failures.push('Catch-all redirect to homepage detected');
}

// Permanently retired historical product routes intentionally provide no content.
const retired=[...candidates.values()].filter(x=>x.decision==='GONE');
if(retired.length!==6) failures.push('Expected six discontinued products to be retired');
for(const rec of retired){
 if(rec.http_status!==410) failures.push('Incorrect retired product status '+rec.path);
 if(redirects.has(normalizeHistoricalPath(rec.path,registry.production_origin))) failures.push('Retired product still redirected '+rec.path);
 const slug=rec.path.replace(/^\/+|\/+$/g,'');
 if(!htaccess.includes('RewriteRule ^'+slug+'/?$ - [G,L]')) failures.push('Missing 410 rule '+rec.path);
}
const formerArchive='/fa/archive/legacy-shop/';
if(fs.existsSync(routeToFile(formerArchive))) failures.push('Retired public archive must be deleted from source');
if(fs.readFileSync(path.join(root,'sitemap-fa.xml'),'utf8').includes(formerArchive)) failures.push('Retired archive must not appear in sitemap');
if(!htaccess.includes('RewriteRule ^fa/archive/legacy-shop(?:/index\\.html)?/?$ - [G,L]')) failures.push('Retired archive must return 410');
for(const [p,rec] of candidates){
  if(rec.decision==='GONE'){
    if(rec.http_status!==410) failures.push('GONE candidate must use 410 policy '+p);
    if(redirects.has(p)) failures.push('GONE candidate must not redirect '+p);
  }
  if(rec.decision==='REVIEW'&&redirects.has(p)) failures.push('Unverified historical URL must not redirect '+p);
}

const shop=redirects.get('/shop/');
if(!shop||shop.target!=='/fa/shop/') failures.push('Historical /shop/ authority must consolidate to /fa/shop/');
if(!fs.existsSync(path.join(root,'index.html'))) failures.push('Canonical homepage missing');
if(!htaccess.includes('RewriteRule ^shop/?$ https://drjavadrezazadeh.com/fa/shop/ [R=301,L,NE]')) failures.push('Historical /shop/ production redirect missing');

console.log('Historical authority recovery audit: '+redirects.size+' one-hop authority redirects; '+candidates.size+' evidence-backed historical candidates; '+retired.length+' discontinued historical products retired.');
if(warnings.length) warnings.forEach(x=>console.warn('! '+x));
if(failures.length){
  console.error('Historical authority failures ('+failures.length+')');
  failures.forEach(x=>console.error('✗ '+x));
  process.exit(1);
}
console.log('Historical authority PASS: homepage/shop authority preserved, discontinued commerce is no longer publicly served, unknown URLs stay reviewable, and irrelevant catch-all redirects are forbidden.');
