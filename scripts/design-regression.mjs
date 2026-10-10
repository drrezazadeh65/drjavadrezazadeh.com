import fs from 'node:fs';
import path from 'node:path';
import {stylesheetSources,checkStylesheetBundles} from './stylesheet-bundles.mjs';

checkStylesheetBundles();

const root=process.cwd();
const failures=[];
const warnings=[];

const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const exists=rel=>fs.existsSync(path.join(root,rel));
const routeFile=route=>{
  if(route==='/') return 'index.html';
  return route.replace(/^\//,'').replace(/\/$/,'')+'/index.html';
};

for(const asset of ['assets/css/public-v2.css','assets/css/portal-v2.css']){
  if(!exists(asset)) failures.push(asset+': missing shared visual layer');
}
if(exists('assets/css/public-v2.css')){
  const bytes=fs.statSync(path.join(root,'assets/css/public-v2.css')).size;
  if(bytes>90000) failures.push('assets/css/public-v2.css: public visual layer exceeds 90 KB source budget');
  if(!read('assets/css/public-v2.css').includes('@media(max-width:800px)')) failures.push('assets/css/public-v2.css: mobile breakpoint contract missing');
  if(!read('assets/css/public-v2.css').includes('prefers-reduced-motion')) failures.push('assets/css/public-v2.css: reduced-motion contract missing');
}
if(exists('assets/css/portal-v2.css')){
  const bytes=fs.statSync(path.join(root,'assets/css/portal-v2.css')).size;
  if(bytes>120000) failures.push('assets/css/portal-v2.css: private visual layer exceeds 120 KB source budget');
  const src=read('assets/css/portal-v2.css');
  for(const token of ['dashboard-sidebar','dashboard-topbar','@media(max-width:840px)','prefers-reduced-motion']){
    if(!src.includes(token)) failures.push('assets/css/portal-v2.css: shared dashboard contract missing '+token);
  }
}

// Every released Persian/English/core page should use the current public visual language,
// except purpose-built journal surfaces and the Golden Talent student gateway, which uses portal-v2.
const sitemapFiles=['sitemap-core.xml','sitemap-fa.xml','sitemap-en.xml','sitemap-news.xml'];
const publicRoutes=new Set();
for(const sm of sitemapFiles){
  if(!exists(sm)){ failures.push(sm+': missing'); continue; }
  const xml=read(sm);
  for(const m of xml.matchAll(/<loc>https?:\/\/[^/]+(?:\/drjavadrezazadeh\.com)?([^<]*)<\/loc>/g)){
    let route=m[1]||'/';
    if(!route.startsWith('/')) route='/'+route;
    if(!route.endsWith('/')) route+='/';
    publicRoutes.add(route);
  }
}
for(const route of publicRoutes){
  if(route.startsWith('/journal/')) continue; // JHELA owns its scholarly visual system.
  const rel=routeFile(route);
  if(!exists(rel)){ failures.push(route+': released route missing local HTML for design audit'); continue; }
  const html=read(rel);
  if(route==='/fa/danesh-amoozan/'){
    if(!html.includes('portal-v2.css')) failures.push(route+': student gateway must use portal-v2');
  }else if(!html.includes('public-v2.css')){
    failures.push(route+': released public route missing public-v2 visual layer');
  }
}

// Pages declaring the dashboard shell must actually carry the shell structure and stylesheet.
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

for(const file of htmlFiles){
  const html=fs.readFileSync(file,'utf8');
  const rel=path.relative(root,file).replaceAll(path.sep,'/');
  const portalRefs=(html.match(/portal-v2\.css/g)||[]).length;
  const publicRefs=(html.match(/public-v2\.css/g)||[]).length;
  if(portalRefs>1) failures.push('/'+rel+': duplicate portal-v2 reference');
  if(publicRefs>1) failures.push('/'+rel+': duplicate public-v2 reference');

  if(html.includes('dashboard-shell-page')){
    if(portalRefs!==1) failures.push('/'+rel+': dashboard shell must load exactly one portal-v2 stylesheet');
    for(const token of ['dashboard-sidebar','dashboard-workspace','dashboard-topbar']){
      if(!html.includes(token)) failures.push('/'+rel+': dashboard shell missing '+token);
    }
  }
  if(['student-gateway-page','auth-page','assessment-workspace-page','commerce-workspace-page'].some(cls=>html.includes(cls))){
    if(portalRefs!==1) failures.push('/'+rel+': private/product experience must load exactly one portal-v2 stylesheet');
  }
  if(html.includes('book-store-shell')){
    const storeRefs=stylesheetSources(html).filter(source=>source==='store.css').length;
    if(storeRefs!==1) failures.push('/'+rel+': bookstore surface must load exactly one store.css stylesheet');
  }
  if(html.includes('public-home-page')||html.includes('public-content-page')||html.includes('public-gateway-page')){
    if(publicRefs!==1) failures.push('/'+rel+': public v2 page must load exactly one public-v2 stylesheet');
  }
  if(html.includes('service-shell') && !html.includes('commerce-workspace-page')){
    if(publicRefs!==1) failures.push('/'+rel+': service-shell must use public-v2 for the shared consultation/service language');
  }
  if(html.includes('data-site-search')){
    if(publicRefs!==1) failures.push('/'+rel+': search experience must load exactly one public-v2 stylesheet');
    if(!html.includes('data-search-results')) failures.push('/'+rel+': search experience missing result region');
  }
  if(rel==='fa/index.html'||rel==='en/index.html'){
    if(!html.includes('home-focus-strip')) failures.push('/'+rel+': public homepage focus pathways missing');
    for(const token of ['hero-copy','portrait-shell','hero-portrait','audience-gates']){
      if(!html.includes(token)) failures.push('/'+rel+': homepage must retain portrait and audience architecture token '+token);
    }
  }

  const styles=(html.match(/<link\b[^>]*rel=["']stylesheet["'][^>]*>/gi)||[]).length;
  if(styles>3) warnings.push('/'+rel+': more than three stylesheets; review render-blocking cost');
}

if(failures.length){
  console.error('\nDesign regression failures ('+failures.length+')');
  failures.forEach(x=>console.error('✗ '+x));
}
if(warnings.length){
  console.warn('\nDesign regression warnings ('+warnings.length+')');
  warnings.forEach(x=>console.warn('! '+x));
}
console.log('\nDesign audit: '+publicRoutes.size+' released routes and '+htmlFiles.length+' HTML files checked.');
if(failures.length) process.exit(1);
