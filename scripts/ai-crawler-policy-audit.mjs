import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const failures=[];
const robots=fs.readFileSync(path.join(root,'robots.txt'),'utf8');
const llms=fs.readFileSync(path.join(root,'llms.txt'),'utf8');

const parseGroups=source=>{
  const groups=[];
  let current=null;
  for(const raw of source.split(/\r?\n/)){
    const line=raw.trim();
    if(!line||line.startsWith('#')) continue;
    const i=line.indexOf(':');
    if(i<0) continue;
    const key=line.slice(0,i).trim().toLowerCase();
    const value=line.slice(i+1).trim();
    if(key==='user-agent'){
      if(!current||current.rules.length) { current={agents:[],rules:[]}; groups.push(current); }
      current.agents.push(value.toLowerCase());
    }else if(current&&(key==='allow'||key==='disallow')){
      current.rules.push({type:key,path:value});
    }
  }
  return groups;
};
const groups=parseGroups(robots);
const effectiveRules=agent=>{
  const a=agent.toLowerCase();
  const exact=groups.filter(g=>g.agents.includes(a));
  if(exact.length) return exact.flatMap(g=>g.rules);
  return groups.filter(g=>g.agents.includes('*')).flatMap(g=>g.rules);
};
const allowedRoot=agent=>{
  const rules=effectiveRules(agent);
  const rootDisallow=rules.some(r=>r.type==='disallow'&&(r.path==='/'||r.path===''));
  const explicitAllow=rules.some(r=>r.type==='allow'&&r.path==='/');
  return explicitAllow&&!rootDisallow;
};

for(const agent of ['OAI-SearchBot','ChatGPT-User','bingbot','YandexBot']){
  if(!allowedRoot(agent)) failures.push('robots.txt must explicitly allow public discovery for '+agent);
}
if(!robots.includes('Sitemap: https://drjavadrezazadeh.com/sitemap.xml')) failures.push('robots.txt canonical sitemap directive missing');

const privatePaths=[
  "/api/",
  "/fa/app/",
  "/fa/customer-dashboard/",
  "/app/",
  "/en/account/",
  "/fa/login/",
  "/login/",
  "/en/login/",
  "/fa/register/",
  "/register/",
  "/en/register/",
  "/en/recover/",
  "/fa/bazyabi-hesab/",
  "/fa/assessments/",
  "/assessments/",
  "/en/golden-talent/assessment/",
  "/en/golden-talent/dashboard/",
  "/en/golden-talent/observer/",
  "/en/golden-talent/roles/",
  "/en/golden-talent/student/",
  "/fa/shop/cart/",
  "/fa/shop/checkout/",
  "/fa/shop/payment-start/",
  "/fa/shop/payment-return/",
  "/fa/shop/payment-result/",
  "/en/shop/cart/",
  "/en/shop/checkout/",
  "/en/golden-talent/checkout/",
  "/en/golden-talent/plans/",
  "/fa/darkhast-moshavere/",
  "/en/request-consultation/",
  "/fa/services/checkout/"
];

// Named robots groups replace wildcard rules; check each effective policy.
for(const agent of ['UnlistedCrawler','OAI-SearchBot','ChatGPT-User','bingbot','YandexBot']){
  const rules=effectiveRules(agent);
  for(const privatePath of privatePaths){
    if(!rules.some(r=>r.type==='disallow'&&r.path&&privatePath.startsWith(r.path))){
      failures.push('robots.txt '+agent+' policy must disallow private route '+privatePath);
    }
    if(rules.some(r=>r.type==='allow'&&r.path!=='/'&&r.path.startsWith(privatePath))){
      failures.push('robots.txt '+agent+' policy overrides private exclusion '+privatePath);
    }
  }
}

for(const match of llms.matchAll(/https:\/\/drjavadrezazadeh\.com[^\s)<>]*/g)){
  const pathname=new URL(match[0]).pathname;
  if(privatePaths.some(prefix=>pathname===prefix.slice(0,-1)||pathname.startsWith(prefix))){
    failures.push('llms.txt exposes private/transactional route '+pathname);
  }
}
if(llms.includes('(https://drjavadrezazadeh.com/journal/)')) failures.push('llms.txt exposes noindex journal root');

console.log('AI/search crawler audit: OAI Search, ChatGPT retrieval, Bing and Yandex discovery policies checked.');
if(failures.length){
  console.error('AI/search crawler failures ('+failures.length+')');
  for(const f of failures) console.error('✗ '+f);
  process.exit(1);
}
console.log('Public crawler discovery remains open while private routes stay outside llms.txt discovery.');
