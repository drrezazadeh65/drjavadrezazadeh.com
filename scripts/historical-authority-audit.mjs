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

const archive='/fa/archive/legacy-shop/';
const consolidated=[...candidates.values()].filter(x=>x.decision==='CONSOLIDATED_ARCHIVE');
if(consolidated.length!==6) failures.push('Expected six evidence-backed former product URLs consolidated into the historical archive; found '+consolidated.length);
for(const rec of consolidated){
  if(normalizeHistoricalPath(rec.target,registry.production_origin)!==archive) failures.push('Former product must consolidate to historical archive '+rec.path);
  const mapped=redirects.get(normalizeHistoricalPath(rec.path,registry.production_origin));
  if(!mapped||mapped.target!==archive) failures.push('Former product missing archive 301 '+rec.path);
}
if(!fs.existsSync(routeToFile(archive))) failures.push('Historical shop archive page missing');
else{
  const visible=fs.readFileSync(routeToFile(archive),'utf8').split(/<body\b[^>]*>/i)[1]?.replace(/<script\b[\s\S]*?<\/script>/gi,'').replace(/<[^>]*>/g,'')||'';
  for(const rec of consolidated){
    const code=rec.path.split('-کد-')[1]?.replace(/\/$/,'');
    if(!code||!visible.includes(code)) failures.push('Archive must visibly retain the verified former product identifier '+rec.path);
  }
}
const archiveRobots=robotsFor(archive);
if(!archiveRobots||!/^index,follow/i.test(archiveRobots)) failures.push('Historical archive must remain a public indexable consolidation destination');

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

console.log('Historical authority recovery audit: '+redirects.size+' one-hop authority redirects; '+candidates.size+' evidence-backed historical candidates; '+consolidated.length+' legitimate former products consolidated.');
if(warnings.length) warnings.forEach(x=>console.warn('! '+x));
if(failures.length){
  console.error('Historical authority failures ('+failures.length+')');
  failures.forEach(x=>console.error('✗ '+x));
  process.exit(1);
}
console.log('Historical authority PASS: homepage/shop authority preserved, legitimate former commerce consolidated truthfully, unknown URLs stay reviewable, and irrelevant catch-all redirects are forbidden.');
