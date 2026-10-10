import fs from 'node:fs';
import path from 'node:path';
import {loadHistoricalAuthorityRegistry, historicalAuthorityMaps} from '../platform/historical-authority.mjs';

const root=process.cwd();
const registry=loadHistoricalAuthorityRegistry();
const failures=[];
const warnings=[];
const htaccess=fs.readFileSync(path.join(root,'.htaccess'),'utf8');

function routeToFile(route){
  if(route==='/') return path.join(root,'index.html');
  const p=route.replace(/^\\/+|\\/+$/g,'');
  return path.join(root,p,'index.html');
}
function robotsFor(route){
  const file=routeToFile(route);
  if(!fs.existsSync(file)) return null;
  const html=fs.readFileSync(file,'utf8');
  const m=html.match(/<meta\\b[^>]*name=["']robots["'][^>]*content=["']([^"']+)["']/i)||
          html.match(/<meta\\b[^>]*content=["']([^"']+)["'][^>]*name=["']robots["']/i);
  return m?m[1]:'';
}
function sourceToRewritePattern(source){
  const s=source.replace(/^\\/+|\\/+$/g,'');
  return '^'+s.replace(/[.*+?^$(){}|[\\]\\\\]/g,'\\\\$&')+'/?$';
}

if(registry.production_origin!=='https://drjavadrezazadeh.com') failures.push('Production origin drift');
if(registry.policy?.catch_all_to_homepage_forbidden!==true) failures.push('Catch-all homepage redirects must remain forbidden');
if(registry.policy?.one_hop_only!==true) failures.push('Historical redirects must remain one-hop');
if(registry.host_consolidation?.http_to_https!=='DEFER_UNTIL_TRUSTED_PUBLIC_TLS') failures.push('HTTP→HTTPS consolidation must remain deferred until trusted TLS');
if(registry.host_consolidation?.www_to_apex!=='DEFER_UNTIL_TRUSTED_PUBLIC_TLS') failures.push('www→apex consolidation must remain deferred until trusted TLS');

const {redirects,candidates}=historicalAuthorityMaps(registry);
const sources=new Set(redirects.keys());
for(const [source,rec] of redirects){
  if(source==='/'||source===rec.target) failures.push('Invalid authority redirect '+source+' -> '+rec.target);
  if(rec.status!==301) failures.push('Authority redirect must use 301 '+source);
  if(sources.has(rec.target)) failures.push('Redirect chain forbidden '+source+' -> '+rec.target);
  const targetFile=routeToFile(rec.target);
  if(!fs.existsSync(targetFile)) failures.push('Historical redirect target missing '+source+' -> '+rec.target);
  const robots=robotsFor(rec.target);
  if(robots&&/\\bnoindex\\b/i.test(robots)) failures.push('Historical authority cannot redirect to noindex '+source+' -> '+rec.target);
  const pattern=sourceToRewritePattern(source);
  const target=registry.production_origin+rec.target;
  const expected='RewriteRule '+pattern+' '+target+' [R=301,L,NE]';
  if(!htaccess.includes(expected)) failures.push('Missing exact production redirect: '+expected);
}

if(/RewriteRule\\s+\\^(?:\\.\\*|\\(\\.\\*\\))\\$\\s+https:\\/\\/drjavadrezazadeh\\.com\\/?\\s+\\[R=30[18]/i.test(htaccess)){
  failures.push('Catch-all redirect to homepage detected');
}

for(const [p,rec] of candidates){
  if(rec.decision==='GONE'&&rec.http_status!==410) failures.push('GONE candidate must use 410 policy '+p);
  if(rec.decision==='GONE'&&redirects.has(p)) failures.push('Quarantined historical URL must not redirect '+p);
  if(rec.decision==='REVIEW'&&redirects.has(p)) failures.push('Unverified historical URL must not redirect '+p);
}

const shop=redirects.get('/shop/');
if(!shop||shop.target!=='/fa/shop/') failures.push('Historical /shop/ authority must consolidate to /fa/shop/');
if(!fs.existsSync(path.join(root,'index.html'))) failures.push('Canonical homepage missing');

const gscCarpet=[...candidates.values()].filter(x=>x.decision==='GONE'&&/فرش|گبه/.test(x.path||''));
if(gscCarpet.length!==6) warnings.push('Expected six historical unrelated product URLs in quarantine; found '+gscCarpet.length);

console.log('Historical authority recovery audit: '+redirects.size+' one-hop authority redirects; '+candidates.size+' evidence-backed historical candidates.');
if(warnings.length){warnings.forEach(x=>console.warn('! '+x))}
if(failures.length){
  console.error('Historical authority failures ('+failures.length+')');
  failures.forEach(x=>console.error('✗ '+x));
  process.exit(1);
}
console.log('Historical authority policy PASS: homepage/shop preserved, semantic redirects are one-hop, unknown URLs remain reviewable, and no catch-all homepage redirect exists.');
