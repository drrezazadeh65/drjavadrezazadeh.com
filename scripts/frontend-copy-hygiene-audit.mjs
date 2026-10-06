import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const failures=[];
const forbidden=[
  {re:/\bbackend\b/i,label:'backend'},
  {re:/\bserver-authoritative\b/i,label:'server-authoritative'},
  {re:/\barchitecture only\b/i,label:'architecture only'},
  {re:/\bbackend pending\b/i,label:'backend pending'},
  {re:/\bprovider pending\b/i,label:'provider pending'},
  {re:/\bproduction authentication\b/i,label:'production authentication'},
  {re:/\bno payment processing\b/i,label:'no payment processing'},
  {re:/\bpreview only\b/i,label:'preview only'},
  {re:/\bnoindex\b/i,label:'visible noindex'},
  {re:/\bTODO\b/i,label:'TODO'},
  {re:/\bFIXME\b/i,label:'FIXME'},
  {re:/بک[\u200c\- ]?اند/i,label:'visible Persian backend jargon'}
];

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

if(failures.length){
  console.error('\nFrontend copy-hygiene failures ('+failures.length+')');
  failures.forEach(x=>console.error('✗ '+x));
  console.error('\nMove implementation notes to docs/code comments, or rewrite them in user-facing language.');
  process.exit(1);
}
console.log('Frontend copy hygiene passed: '+files.length+' HTML files checked; no internal implementation jargon leaked into visible UI.');
