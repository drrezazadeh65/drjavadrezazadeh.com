/* Persian homepage only: reduce render-blocking request fan-out without
 * changing the authoring CSS, order, relative asset base or public routes. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const groups=[
 ['home-experience-v1','jr-public-identity-v1','jr-ecosystem-design-v2','home-campaigns-v1'],
 ['jr-home-install-menu-v1','jr-service-decision-guides-20261028','jr-question-journeys-v1','jr-search-growth-20261122','jr-contextual-links-v1','jr-search-pathways-v1']
];
export function bundleFaHomeStyles(root){
 const file=path.join(root,'fa/index.html'),dir=path.join(root,'assets/css');
 const original=fs.readFileSync(file,'utf8');
 let html=original;const reports=[];
 for(const [i,names] of groups.entries()){
  const matches=names.map(name=>{
   const tags=[...html.matchAll(/<link\b[^>]*>/gi)].filter(m=>/\brel=["']stylesheet["']/i.test(m[0])&&m[0].includes('/assets/css/'+name+'.css'));
   if(tags.length!==1)throw Error('Unexpected Persian home stylesheet: '+name);
   return tags[0];
  });
  const first=matches[0].index,last=matches.at(-1).index+matches.at(-1)[0].length;
  const block=html.slice(first,last);
  const actual=[...block.matchAll(/<link\b[^>]*>/gi)].filter(m=>/\brel=["']stylesheet["']/i.test(m[0]));
  if(actual.length!==names.length||actual.some((m,n)=>m[0]!==matches[n][0])||/<style\b/i.test(block))
   throw Error('Persian home stylesheet cascade changed');
  const content=names.map(name=>{
   const css=fs.readFileSync(path.join(dir,name+'.css'),'utf8');
   if(/@(?:import|charset)\b/i.test(css))throw Error('Unsupported CSS bundle import: '+name);
   return '/* '+name+' */\n'+css+'\n';
  }).join('\n');
  const digest=crypto.createHash('sha256').update(content).digest('hex').slice(0,12);
  const alias='fa-home-'+(i+1)+'.'+digest+'.css';
  const destination=path.join(dir,alias);
  if(fs.existsSync(destination)&&fs.readFileSync(destination,'utf8')!==content)throw Error('Immutable home CSS collision');
  if(!fs.existsSync(destination))fs.writeFileSync(destination,content,{flag:'wx'});
  for(const [n,m] of matches.entries())html=html.replace(m[0],n===0?'<link rel="stylesheet" href="/assets/css/'+alias+'">':'');
  reports.push({alias,sources:names.length,bytes:Buffer.byteLength(content)});
 }
 // The packaged assistant is already present; the legacy deferred loader
 // must not request the same script under a second cache key.
 const assistant=/<script\b[^>]*src=["']\/assets\/js\/assistant\.js(?:\?[^"']*)?["'][^>]*>/gi;
 const assistantTags=[...html.matchAll(assistant)];
 if(assistantTags.length!==1)throw Error('Expected exactly one Persian home assistant script');
 html=html.replace(assistantTags[0][0],assistantTags[0][0].replace('<script','<script data-jr-assistant="1"'));
 const assistantStyle=/<link\b[^>]*href=["']\/assets\/css\/assistant\.css(?:\?[^"']*)?["'][^>]*>/gi;
 const styleTags=[...html.matchAll(assistantStyle)];
 if(styleTags.length!==1)throw Error('Expected exactly one Persian home assistant stylesheet');
 html=html.replace(styleTags[0][0],styleTags[0][0].replace('<link','<link data-jr-assistant-style="1"'));
 // The whole main body is byte-for-byte preserved except for the loader marker.
 if(html.slice(html.indexOf('<main '),html.indexOf('</main>'))!==original.slice(original.indexOf('<main '),original.indexOf('</main>')))throw Error('Home content changed while bundling');
 fs.writeFileSync(file,html,'utf8');
 return {groups:reports,reducedRequests:8};
}
