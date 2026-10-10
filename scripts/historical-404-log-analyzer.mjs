import fs from 'node:fs';
import {loadHistoricalAuthorityRegistry, classifyHistoricalTarget, authorityScore, priorityFromScore, normalizeHistoricalPath} from '../platform/historical-authority.mjs';

const input=process.argv[2];
if(!input){
  console.error('Usage: node scripts/historical-404-log-analyzer.mjs <apache-access.log> [output.json]');
  process.exit(2);
}
const out=process.argv[3]||'';
const registry=loadHistoricalAuthorityRegistry();
const siteHost=new URL(registry.production_origin).hostname.toLowerCase().replace(/\.$/,'');
const lines=fs.readFileSync(input,'utf8').split(/\r?\n/).filter(Boolean);
const groups=new Map();
let parsed=0,matched=0;

for(const line of lines){
  const m=line.match(/^(\S+)\s+\S+\s+\S+\s+\[[^\]]+\]\s+"(\S+)\s+([^"]+?)\s+HTTP\/[0-9.]+"\s+(\d{3})\s+\S+\s+"([^"]*)"\s+"([^"]*)"/);
  if(!m) continue;
  parsed++;
  const [,remote,method,rawTarget,statusText,referrer,ua]=m;
  const status=Number(statusText);
  if(![404,410].includes(status)||!['GET','HEAD'].includes(method)) continue;
  matched++;
  let rawPath=rawTarget;
  try{rawPath=new URL(rawTarget,registry.production_origin).pathname}catch{}
  const p=normalizeHistoricalPath(rawPath,registry.production_origin);
  if(!groups.has(p)) groups.set(p,{path:p,hits:0,ips:new Set(),referrers:new Set(),referringDomains:new Set(),bots:0,humanLike:0,statuses:new Set()});
  const g=groups.get(p);
  g.hits++;g.ips.add(remote);g.statuses.add(status);
  if(referrer&&referrer!=='-'){
    try{
      const u=new URL(referrer);
      const h=u.hostname.toLowerCase().replace(/\.$/,'');
      if(['http:','https:'].includes(u.protocol)&&h&&h!==siteHost&&!h.endsWith('.'+siteHost)){
        g.referrers.add(referrer);
        g.referringDomains.add(h);
      }
    }catch{}
  }
  if(/bot|crawler|spider|slurp|bingpreview|googleother|googlebot|ahrefs|semrush|yandex/i.test(ua)) g.bots++;
  else g.humanLike++;
}

const rows=[...groups.values()].map(g=>{
  const classification=classifyHistoricalTarget(g.path,registry);
  const score=authorityScore({referringDomains:g.referringDomains.size,impressions:g.hits});
  return {
    path:g.path,
    hits:g.hits,
    uniqueIps:g.ips.size,
    externalReferringDomains:g.referringDomains.size,
    externalReferrers:g.referrers.size,
    botHits:g.bots,
    humanLikeHits:g.humanLike,
    statuses:[...g.statuses].sort(),
    score,
    priority:priorityFromScore(score),
    action:classification.action,
    target:classification.target||null,
    reason:classification.reason||null
  };
}).sort((a,b)=>b.score-a.score||b.hits-a.hits||a.path.localeCompare(b.path));

const result={
  schema_version:'1.0',
  generated_at:new Date().toISOString(),
  source:input,
  parsed_log_lines:parsed,
  matched_404_410_lines:matched,
  url_count:rows.length,
  rows
};
const rendered=JSON.stringify(result,null,2)+'\n';
if(out){fs.writeFileSync(out,rendered);console.log('Historical 404 analysis written to '+out)}
else process.stdout.write(rendered);
