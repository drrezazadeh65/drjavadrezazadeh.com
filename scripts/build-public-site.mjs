import fs from 'node:fs';
import path from 'node:path';
import {checkStylesheetBundles} from './stylesheet-bundles.mjs';

checkStylesheetBundles();

const root=process.cwd();
const out=path.join(root,'.public-site');
const excludedTop=new Set(['.git','.github','docs','edge','payment-api','foundation','node_modules','platform','scripts','tests','test-results','.public-site']);
const excludedRoot=new Set(['README.md','AGENTS.md','.bertina-deploy-trigger','CACHE_STANDARD.md','CNAME','_headers','_redirects','_config.yml']);
const excludedExact=new Set(['assets/media-registry.json','assets/release-v4.4.json']);

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
  'index.html','404.html','offline.html','robots.txt','llms.txt','site.webmanifest','sw.js',
  'sitemap.xml','sitemap-core.xml','sitemap-fa.xml','sitemap-en.xml','sitemap-news.xml',
  'assets/data/book-catalog.json','assets/data/service-catalog.json','assets/data/analytics-config.json'
];
for(const rel of required) if(!fs.existsSync(path.join(out,rel))) failures.push('Missing required public artifact: '+rel);

for(const blocked of [...excludedTop]){
  if(fs.existsSync(path.join(out,blocked))) failures.push('Internal top-level directory leaked into artifact: '+blocked);
}
for(const blocked of excludedRoot){
  if(fs.existsSync(path.join(out,blocked))) failures.push('Internal root file leaked into artifact: '+blocked);
}
if(fs.existsSync(path.join(out,'assets/media-registry.json'))) failures.push('Internal media registry leaked into artifact');
if(fs.existsSync(path.join(out,'assets/release-v4.4.json'))) failures.push('Internal release manifest leaked into artifact');

const all=[];
function walk(dir){
  for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
    const p=path.join(dir,ent.name);
    if(ent.isDirectory()) walk(p); else if(ent.isFile()) all.push(p);
  }
}
walk(out);
const html=all.filter(p=>p.endsWith('.html'));
// Route count includes the public engine-status page, the approved noindex customer dashboard, and approved noindex commerce relays.
// Keep a fixed route count as a guard against accidentally publishing engineering files.
const approvedPublicHtmlRoutes=289;
if(html.length!==approvedPublicHtmlRoutes) failures.push(
  'Expected '+approvedPublicHtmlRoutes+' public HTML routes in sanitized artifact, found '+html.length
);
const customerDashboard='fa/customer-dashboard/index.html';
if(!fs.existsSync(path.join(out,customerDashboard))) failures.push('Approved noindex customer dashboard missing: '+customerDashboard);
else{
  const dashboard=fs.readFileSync(path.join(out,customerDashboard),'utf8');
  if(!/<meta name="robots" content="[^"]*noindex[^"]*nofollow/i.test(dashboard)) failures.push('Customer dashboard must remain noindex,nofollow');
}
const engineStatus='fa/app/engine-status/index.html';
if(!fs.existsSync(path.join(out,engineStatus))) failures.push('Public engine dashboard missing: '+engineStatus);
const paymentRelay='fa/shop/payment-return/index.html';
const relayPath=path.join(out,paymentRelay);
if(!fs.existsSync(relayPath)) {
  failures.push('Approved noindex payment-return relay missing: '+paymentRelay);
}else{
  const relay=fs.readFileSync(relayPath,'utf8');
  if(!relay.includes('<meta name="robots" content="noindex,nofollow">')){
    failures.push('Payment-return relay must remain noindex,nofollow');
  }
  for(const sitemap of ['sitemap.xml','sitemap-core.xml','sitemap-fa.xml','sitemap-en.xml']){
    if(fs.existsSync(path.join(out,sitemap)) &&
       fs.readFileSync(path.join(out,sitemap),'utf8').includes('/fa/shop/payment-return/')){
      failures.push('Noindex payment-return relay must not enter '+sitemap);
    }
  }
}

const textExt=/\.(?:html|js|css|json|xml|txt|webmanifest)$/i;
for(const file of all.filter(p=>textExt.test(p))){
  const content=fs.readFileSync(file,'utf8');
  if(/(?:["'(=]|url\()\s*\/?(?:platform|foundation|scripts|tests|edge|payment-api|docs)\//i.test(content)){
    const rel=path.relative(out,file).replaceAll(path.sep,'/');
    failures.push('Public artifact still references excluded engineering path: '+rel);
  }
}

if(failures.length){
  console.error('Sanitized public-site build failed ('+failures.length+')');
  failures.forEach(x=>console.error('✗ '+x));
  process.exit(1);
}
console.log('Sanitized public-site artifact built:',all.length,'files;',html.length,'HTML routes; internal engineering directories excluded.');
