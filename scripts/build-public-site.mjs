import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const out=path.join(root,'.public-site');
const excludedTop=new Set(['.git','.github','docs','edge','foundation','node_modules','platform','scripts','tests','test-results','.public-site']);
const excludedRoot=new Set(['README.md','CACHE_STANDARD.md']);
const excludedExact=new Set(['assets/media-registry.json']);

fs.rmSync(out,{recursive:true,force:true});
fs.mkdirSync(out,{recursive:true});

function copy(rel=''){
  const src=path.join(root,rel);
  for(const ent of fs.readdirSync(src,{withFileTypes:true})){
    const child=rel?rel+'/'+ent.name:ent.name;
    if(!rel&&excludedTop.has(ent.name)) continue;
    if(!rel&&excludedRoot.has(ent.name)) continue;
    if(excludedExact.has(child)) continue;
    const from=path.join(root,child);
    const to=path.join(out,child);
    if(ent.isDirectory()){
      fs.mkdirSync(to,{recursive:true});
      copy(child);
    }else if(ent.isFile()){
      fs.mkdirSync(path.dirname(to),{recursive:true});
      fs.copyFileSync(from,to);
    }
  }
}
copy();

const failures=[];
const required=[
  'index.html','404.html','offline.html','CNAME','robots.txt','llms.txt','site.webmanifest','sw.js',
  'sitemap.xml','sitemap-core.xml','sitemap-fa.xml','sitemap-en.xml','sitemap-news.xml',
  'assets/data/book-catalog.json','assets/data/service-catalog.json','assets/data/analytics-config.json'
];
for(const rel of required) if(!fs.existsSync(path.join(out,rel))) failures.push('Missing required public artifact: '+rel);

for(const blocked of [...excludedTop]){
  if(fs.existsSync(path.join(out,blocked))) failures.push('Internal top-level directory leaked into artifact: '+blocked);
}
if(fs.existsSync(path.join(out,'assets/media-registry.json'))) failures.push('Internal media registry leaked into artifact');

const all=[];
function walk(dir){
  for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
    const p=path.join(dir,ent.name);
    if(ent.isDirectory()) walk(p); else if(ent.isFile()) all.push(p);
  }
}
walk(out);
const html=all.filter(p=>p.endsWith('.html'));
if(html.length!==246) failures.push('Expected 246 public HTML routes in sanitized artifact, found '+html.length);

const textExt=/\.(?:html|js|css|json|xml|txt|webmanifest)$/i;
for(const file of all.filter(p=>textExt.test(p))){
  const content=fs.readFileSync(file,'utf8');
  if(/(?:["'(=]|url\()\s*\/?(?:platform|foundation|scripts|tests|edge|docs)\//i.test(content)){
    const rel=path.relative(out,file).replaceAll(path.sep,'/');
    failures.push('Public artifact still references excluded engineering path: '+rel);
  }
}
const cname=fs.readFileSync(path.join(out,'CNAME'),'utf8').trim();
if(cname!=='drjavadrezazadeh.com') failures.push('CNAME drift: '+cname);

if(failures.length){
  console.error('Sanitized public-site build failed ('+failures.length+')');
  failures.forEach(x=>console.error('✗ '+x));
  process.exit(1);
}
console.log('Sanitized public-site artifact built:',all.length,'files;',html.length,'HTML routes; internal engineering directories excluded.');
