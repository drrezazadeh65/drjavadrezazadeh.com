import fs from 'node:fs';

const failures=[];
const site=fs.readFileSync('assets/js/site.js','utf8');
const sw=fs.readFileSync('sw.js','utf8');

function quotedList(source,labelPattern){
  const m=source.match(labelPattern);
  if(!m) return null;
  return [...m[1].matchAll(/'([^']+)'/g)].map(x=>x[1]);
}

const sitePrivate=quotedList(site,/noStore:Object\.freeze\(\[([\s\S]*?)\]\)/);
const swPrivate=quotedList(sw,/const PRIVATE_PREFIXES=\[([\s\S]*?)\];/);
const core=quotedList(sw,/const CORE=\[([\s\S]*?)\];/);

if(!sitePrivate) failures.push('assets/js/site.js: JR_ROUTE_POLICY.noStore not parseable');
if(!swPrivate) failures.push('sw.js: PRIVATE_PREFIXES not parseable');
if(!core) failures.push('sw.js: CORE precache list not parseable');

if(sitePrivate&&swPrivate){
  const a=[...new Set(sitePrivate)].sort();
  const b=[...new Set(swPrivate)].sort();
  const missingInSw=a.filter(x=>!b.includes(x));
  const missingInSite=b.filter(x=>!a.includes(x));
  if(missingInSw.length) failures.push('sw.js missing no-store prefixes: '+missingInSw.join(', '));
  if(missingInSite.length) failures.push('site.js missing SW private prefixes: '+missingInSite.join(', '));
}

if(swPrivate&&core){
  for(const item of core){
    const normalized='/'+item.replace(/^\.\//,'').replace(/^\/+/,'');
    if(swPrivate.some(prefix=>normalized.startsWith(prefix))) failures.push('sw.js CORE precaches private route '+item);
  }
}

const privateBranch=sw.match(/if\(isPrivate\(url\)\)\{([\s\S]*?)\n\s*\}/);
if(!privateBranch){
  failures.push('sw.js: private request branch missing');
}else{
  const branch=privateBranch[1];
  if(!branch.includes("cache:'no-store'")) failures.push('sw.js: private fetch must use cache:no-store');
  if(/cache\.put\s*\(/.test(branch)) failures.push('sw.js: private branch must never write to CacheStorage');
}

const privateIndex=sw.indexOf('if(isPrivate(url))');
const assetIndex=sw.indexOf('const isAsset=');
const navIndex=sw.indexOf("if(req.mode==='navigate')");
if(privateIndex<0||assetIndex<0||navIndex<0) failures.push('sw.js: routing branches not found');
else if(!(privateIndex<assetIndex&&privateIndex<navIndex)) failures.push('sw.js: private-route bypass must run before asset/navigation caching');

if(!/url\.origin!==self\.location\.origin/.test(sw)) failures.push('sw.js: cross-origin requests must bypass service-worker caching');

console.log('PWA privacy audit: '+(sitePrivate?.length||0)+' no-store prefixes compared with '+(swPrivate?.length||0)+' service-worker private prefixes.');
if(failures.length){
  console.error('PWA privacy failures ('+failures.length+')');
  failures.forEach(x=>console.error('✗ '+x));
  process.exit(1);
}
console.log('Private/account/assessment/checkout routes remain network-only and excluded from public cache.');
