import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const PROD='https://drjavadrezazadeh.com';
const registryPath=path.join(root,'platform','ecosystem-registry.json');
const failures=[];
const warnings=[];

if(!fs.existsSync(registryPath)){
  console.error('Missing platform/ecosystem-registry.json');
  process.exit(1);
}
const registry=JSON.parse(fs.readFileSync(registryPath,'utf8'));
const legacy=(registry.exact_routes||[]).filter(x=>String(x.id||'').startsWith('legacy-'));

function routeToFile(route){
  if(route==='/') return path.join(root,'index.html');
  return path.join(root,route.replace(/^\/+/,'').replace(/\/$/,'')+'/index.html');
}
function attr(html,rel,name){
  const tag=(html.match(new RegExp('<'+rel+'\\b[^>]*>','i'))||[''])[0];
  const m=tag.match(new RegExp('\\b'+name+'\\s*=\\s*(["\\\'])(.*?)\\1','i'));
  return m?m[2]:null;
}
function canonical(html){
  const tag=(html.match(/<link\b[^>]*rel=["']canonical["'][^>]*>/i)||[''])[0];
  const m=tag.match(/\bhref\s*=\s*(["'])(.*?)\1/i);
  return m?m[2]:null;
}
function refreshTarget(html){
  const tag=(html.match(/<meta\b[^>]*http-equiv=["']refresh["'][^>]*>/i)||[''])[0];
  const m=tag.match(/\bcontent\s*=\s*(["'])(.*?)\1/i);
  if(!m) return null;
  const value=m[2];
  const u=value.match(/url\s*=\s*(.+)$/i);
  return u?u[1].trim().replace(/^["']|["']$/g,''):null;
}
function jsReplaceTarget(html){
  const m=html.match(/location\.replace\(\s*["']([^"']+)["']\s*\)/i);
  return m?m[1]:null;
}
function destinationExists(url){
  let u;
  try{u=new URL(url)}catch{return false}
  if(u.origin!==PROD) return false;
  return fs.existsSync(routeToFile(u.pathname));
}

for(const rec of legacy){
  const file=routeToFile(rec.route);
  if(!fs.existsSync(file)){failures.push(rec.route+': legacy route file missing');continue}
  const html=fs.readFileSync(file,'utf8');
  const robotsTag=(html.match(/<meta\b[^>]*name=["']robots["'][^>]*>/i)||[''])[0];
  const robotsMatch=robotsTag.match(/\bcontent\s*=\s*(["'])(.*?)\1/i);
  const robots=robotsMatch?robotsMatch[2]:'';
  if(!/\bnoindex\b/i.test(robots)) failures.push(rec.route+': legacy transition must remain noindex');
  const can=canonical(html);
  if(!can) failures.push(rec.route+': missing canonical destination');
  else if(!destinationExists(can)) failures.push(rec.route+': canonical destination missing/non-production '+can);

  const refresh=refreshTarget(html);
  const js=jsReplaceTarget(html);
  if(!refresh) failures.push(rec.route+': missing meta-refresh compatibility handoff');
  if(!js) failures.push(rec.route+': missing location.replace compatibility handoff');
  if(can&&refresh&&can!==refresh) failures.push(rec.route+': canonical/meta-refresh target drift '+can+' <> '+refresh);
  if(can&&js&&can!==js) failures.push(rec.route+': canonical/JS target drift '+can+' <> '+js);
  if(can&&can===PROD+rec.route) failures.push(rec.route+': legacy transition canonical points to itself');
  if(!/<a\b[^>]*href=["']https:\/\/drjavadrezazadeh\.com\//i.test(html)) warnings.push(rec.route+': no visible production-domain recovery link');
}

console.log('Legacy URL continuity audit: '+legacy.length+' preserved transition routes checked.');
if(warnings.length){
  console.warn('\nLegacy URL warnings ('+warnings.length+')');
  warnings.forEach(x=>console.warn('! '+x));
}
if(failures.length){
  console.error('\nLegacy URL continuity failures ('+failures.length+')');
  failures.forEach(x=>console.error('✗ '+x));
  process.exit(1);
}
console.log('All frozen legacy transition routes remain present, noindex and aligned to live canonical destinations.');
