import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const publicData=[
  'assets/data/book-catalog.json',
  'assets/data/service-catalog.json',
  'assets/data/analytics-config.json',
  'assets/search-index.json',
  'site.webmanifest'
].filter(p=>fs.existsSync(path.join(root,p)));

const forbidden=[
  [/\bbackend pending\b/i,'backend pending'],
  [/\bprovider pending\b/i,'provider pending'],
  [/\bserver-authoritative\b/i,'server-authoritative'],
  [/\bproduction authentication\b/i,'production authentication'],
  [/\barchitecture only\b/i,'architecture only'],
  [/\bpreview only\b/i,'preview only'],
  [/\breadiness\b/i,'internal readiness jargon'],
  [/\bprevalidation\b/i,'prevalidation jargon'],
  [/\bTODO\b/i,'TODO'],
  [/\bFIXME\b/i,'FIXME'],
  [/\bChatGPT\b/i,'ChatGPT internal reference'],
  [/\bDurable Object\b/i,'infrastructure jargon'],
  [/\bruntime secret\b/i,'secret-management jargon'],
  [/\bCloudflare Worker\b/i,'infrastructure jargon'],
  [/\bGitHub Pages\b/i,'hosting implementation jargon'],
  [/بک[\u200c\- ]?اند/i,'Persian backend jargon']
];

const failures=[];
for(const rel of publicData){
  const raw=fs.readFileSync(path.join(root,rel),'utf8');
  let parsed;
  try{ parsed=JSON.parse(raw); }
  catch(error){ failures.push(rel+': invalid JSON'); continue; }
  const flattened=JSON.stringify(parsed);
  for(const [re,label] of forbidden){
    const match=flattened.match(re);
    if(!match) continue;
    const at=match.index||0;
    const snippet=flattened.slice(Math.max(0,at-70),Math.min(flattened.length,at+140));
    failures.push(rel+': '+label+' leaked into client-readable data — '+snippet);
  }
}

if(failures.length){
  console.error('\nPublic data hygiene failures ('+failures.length+')');
  failures.forEach(x=>console.error('✗ '+x));
  process.exit(1);
}
console.log('Public data hygiene passed: '+publicData.length+' client-readable JSON/manifest surfaces checked.');
