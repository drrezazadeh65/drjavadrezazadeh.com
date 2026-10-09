/** Offline crawl-policy checks; does not claim to have fetched robots.txt or indexed pages. */
const bots=['Googlebot','Bingbot','OAI-SearchBot','GPTBot','ChatGPT-User','PerplexityBot'];
const safePath=p=>typeof p==='string'&&p.startsWith('/')&&!p.startsWith('//');
function matchingGroups(text,agent){
 const lines=text.split(/\r?\n/),groups=[];let agents=[],rules=[],active=false;
 const flush=()=>{if(agents.length)groups.push({agents:[...agents],rules:[...rules]});agents=[];rules=[];active=false};
 for(const raw of lines){const line=raw.split('#')[0].trim();if(!line)continue;const m=/^(user-agent|allow|disallow)\s*:\s*(.*)$/i.exec(line);if(!m)continue;
 const key=m[1].toLowerCase(),value=m[2].trim();
 if(key==='user-agent'){if(active)flush();agents.push(value.toLowerCase());}
 else if(agents.length){active=true;if(safePath(value))rules.push({type:key,path:value});}
 }
 flush();const exact=groups.filter(g=>g.agents.includes(agent.toLowerCase()));return exact.length?exact:groups.filter(g=>g.agents.includes('*'));
}
export function auditCrawlerAccess({robotsTxt='',publicPaths=[],sitemapUrls=[]}={}){
 if(typeof robotsTxt!=='string'||!Array.isArray(publicPaths)||!Array.isArray(sitemapUrls))throw new TypeError('Invalid crawl policy input');
 const findings=[],coverage={};
 for(const bot of bots){
  const groups=matchingGroups(robotsTxt,bot),rules=groups.flatMap(g=>g.rules);
  coverage[bot]={};
  for(const path of publicPaths){
   if(!safePath(path)){findings.push({code:'invalid-public-path',path});continue}
   const matches=rules.filter(r=>path.startsWith(r.path)).sort((a,b)=>b.path.length-a.path.length||(a.type==='allow'?-1:1));
   const allowed=matches[0]?.type!=='disallow';
   coverage[bot][path]=allowed;
   if(!allowed)findings.push({code:'crawler-blocked',bot,path});
  }
 }
 if(!sitemapUrls.length)findings.push({code:'no-sitemap-evidence'});
 for(const url of sitemapUrls){try{if(new URL(url).protocol!=='https:')throw Error()}catch{findings.push({code:'invalid-sitemap-url',url})}}
 return {findings,coverage,robotsInputProvided:robotsTxt.length>0,liveRobotsFetched:false,liveIndexationVerified:false,rankingsGuaranteed:false,productionTouched:false};
}
