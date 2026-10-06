import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const failures=[];
const htmlFiles=[];

function walk(dir){
  for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
    if(['.git','node_modules'].includes(ent.name)) continue;
    const full=path.join(dir,ent.name);
    if(ent.isDirectory()) walk(full);
    else if(ent.isFile()&&ent.name.endsWith('.html')) htmlFiles.push(full);
  }
}
walk(root);

const norm=s=>String(s||'')
  .replace(/&amp;/g,'&')
  .replace(/&quot;/g,'"')
  .replace(/&#39;/g,"'")
  .replace(/<[^>]+>/g,' ')
  .replace(/\s+/g,' ')
  .trim();

let faqPages=0;
let faqQuestions=0;

for(const file of htmlFiles){
  const html=fs.readFileSync(file,'utf8');
  if(/<meta\b[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html)) continue;
  const rel='/'+path.relative(root,file).replaceAll(path.sep,'/');
  const visible=norm(html.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' '));
  const scripts=[...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];

  for(const match of scripts){
    let json;
    try{json=JSON.parse(match[1]);}catch{continue;}
    const nodes=(json&&json['@graph'])||[json];
    for(const node of nodes){
      if(!node||node['@type']!=='FAQPage') continue;
      faqPages++;
      const entities=Array.isArray(node.mainEntity)?node.mainEntity:[];
      if(!entities.length) failures.push(rel+': FAQPage has no mainEntity');

      for(const [i,q] of entities.entries()){
        faqQuestions++;
        const question=norm(q?.name);
        const answer=norm(q?.acceptedAnswer?.text);
        if(q?.['@type']!=='Question') failures.push(rel+': FAQ item '+(i+1)+' is not Question');
        if(!question) failures.push(rel+': FAQ item '+(i+1)+' missing question text');
        if(!answer) failures.push(rel+': FAQ item '+(i+1)+' missing acceptedAnswer text');
        if(question&&!visible.includes(question)) failures.push(rel+': structured FAQ question is not visible: '+question);
        if(answer&&!visible.includes(answer)) failures.push(rel+': structured FAQ answer is not visible for: '+question);
      }
    }
  }
}

console.log('FAQ integrity audit: '+faqPages+' FAQPage nodes and '+faqQuestions+' questions checked against visible indexable content.');
if(failures.length){
  console.error('FAQ integrity failures ('+failures.length+')');
  failures.forEach(x=>console.error('✗ '+x));
  process.exit(1);
}
console.log('Structured FAQ content is visible and source-consistent.');
