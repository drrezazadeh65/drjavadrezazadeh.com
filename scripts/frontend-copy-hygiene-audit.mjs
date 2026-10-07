import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const failures=[];
const ruleGroups={
  core:[
  {re:/\bbackend\b/i,label:'backend'},
  {re:/\bserver-authoritative\b/i,label:'server-authoritative'},
  {re:/\barchitecture only\b/i,label:'architecture only'},
  {re:/\bbackend pending\b/i,label:'backend pending'},
  {re:/\bprovider pending\b/i,label:'provider pending'},
  {re:/\bproduction authentication\b/i,label:'production authentication'},
  {re:/\bno payment processing\b/i,label:'no payment processing'},
  {re:/\bpreview only\b/i,label:'preview only'},
  {re:/\bnoindex\b/i,label:'visible noindex'},
  ],
  editorial:[
  {re:/\bTODO\b/i,label:'TODO'},
  {re:/\bFIXME\b/i,label:'FIXME'},
  {re:/\bChatGPT\b/i,label:'ChatGPT internal reference'},
  {re:/\bstaging\b/i,label:'staging jargon'},
  {re:/\breadiness\b/i,label:'internal readiness jargon'},
  {re:/\bprevalidation\b/i,label:'prevalidation jargon'},
  {re:/\b(?:internal|developer) note\b/i,label:'internal/developer note'},
  {re:/\bplaceholder copy\b/i,label:'placeholder copy'},
  ],
  implementation:[
  {re:/\bbrowser state\b/i,label:'browser implementation jargon'},
  {re:/\bserver-side\b/i,label:'server implementation jargon'},
  {re:/\bprovider verification\b/i,label:'payment implementation jargon'},
  {re:/\bDurable Object\b/i,label:'infrastructure jargon'},
  {re:/\bruntime secret\b/i,label:'secret-management jargon'},
  {re:/\bCloudflare Worker\b/i,label:'infrastructure jargon'},
  {re:/\bGitHub Pages\b/i,label:'hosting implementation jargon'},
  {re:/\bAPI\b/i,label:'API implementation jargon'},
  ],
  persian:[
  {re:/بک[\u200c\- ]?اند/i,label:'visible Persian backend jargon'}
  ]
};
const requestedGroup=String(process.env.COPY_HYGIENE_GROUP||'').trim();
if(requestedGroup && !ruleGroups[requestedGroup]) throw new Error('Unknown COPY_HYGIENE_GROUP '+requestedGroup);
const forbidden=requestedGroup?ruleGroups[requestedGroup]:Object.values(ruleGroups).flat();

const files=[];
function walk(dir){
  for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
    if(['.git','node_modules'].includes(ent.name)) continue;
    const full=path.join(dir,ent.name);
    if(ent.isDirectory()) walk(full);
    else if(ent.isFile()&&ent.name.endsWith('.html')) files.push(full);
  }
}
walk(root);

function visibleText(html){
  const body=(html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)||[])[1]||'';
  return body
    .replace(/<script\b[\s\S]*?<\/script>/gi,' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi,' ')
    .replace(/<!--([\s\S]*?)-->/g,' ')
    .replace(/<[^>]+>/g,' ')
    .replace(/&nbsp;|&#160;/gi,' ')
    .replace(/&(?:amp|lt|gt|quot|apos);/gi,' ')
    .replace(/\s+/g,' ')
    .trim();
}

for(const file of files){
  const html=fs.readFileSync(file,'utf8');
  const text=visibleText(html);
  for(const rule of forbidden){
    const m=text.match(rule.re);
    if(m){
      const at=m.index||0;
      const snippet=text.slice(Math.max(0,at-65),Math.min(text.length,at+125));
      failures.push(path.relative(root,file).replaceAll(path.sep,'/')+': '+rule.label+' leaked into visible UI — '+snippet);
    }
  }
}

const jsFiles=[];
function walkJs(dir){
  if(!fs.existsSync(dir)) return;
  for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
    const full=path.join(dir,ent.name);
    if(ent.isDirectory()) walkJs(full);
    else if(ent.isFile()&&ent.name.endsWith('.js')) jsFiles.push(full);
  }
}
walkJs(path.join(root,'assets','js'));

for(const file of jsFiles){
  const source=fs.readFileSync(file,'utf8');
  const strings=[];
  for(const m of source.matchAll(/(['"`])((?:\\.|(?!\\1)[\\s\\S])*?)\\1/g)){
    if((m[2]||'').length<=500) strings.push(m[2]);
  }
  const visible=strings.join(' ');
  for(const rule of forbidden){
    const m=visible.match(rule.re);
    if(m){
      const at=m.index||0;
      const snippet=visible.slice(Math.max(0,at-65),Math.min(visible.length,at+125));
      failures.push(path.relative(root,file).replaceAll(path.sep,'/')+': '+rule.label+' leaked into a client-rendered string — '+snippet);
    }
  }
}

if(failures.length){
  console.error('\nFrontend copy-hygiene failures ('+failures.length+')');
  failures.forEach(x=>console.error('✗ '+x));
  console.error('\nMove implementation notes to docs/code comments, or rewrite them in user-facing language.');
  process.exit(1);
}
console.log('Frontend copy hygiene passed'+(requestedGroup?' ['+requestedGroup+']':'')+': '+files.length+' HTML files + '+jsFiles.length+' client JS files checked; no internal implementation jargon leaked into visible UI.');
