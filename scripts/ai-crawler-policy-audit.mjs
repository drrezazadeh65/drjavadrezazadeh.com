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

for(const token of ['/login/','/register/','/account/','/assessment/','/checkout/','/darkhast-moshavere/','/request-consultation/']){
  if(llms.includes('https://drjavadrezazadeh.com'+token)) failures.push('llms.txt exposes private/transactional route '+token);
}
if(llms.includes('(https://drjavadrezazadeh.com/journal/)')) failures.push('llms.txt exposes noindex journal root');

console.log('AI/search crawler audit: OAI Search, ChatGPT retrieval, Bing and Yandex discovery policies checked.');
if(failures.length){
  console.error('AI/search crawler failures ('+failures.length+')');
  for(const f of failures) console.error('✗ '+f);
  process.exit(1);
}
console.log('Public crawler discovery remains open while private routes stay outside llms.txt discovery.');
