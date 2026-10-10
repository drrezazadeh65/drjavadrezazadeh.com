// Published Knowledge Articles — structural release gate
import fs from 'node:fs';
import {stylesheetSources,checkStylesheetBundles} from '../scripts/stylesheet-bundles.mjs';

checkStylesheetBundles();
import path from 'node:path';

const root=process.cwd();
const domain='https://drjavadrezazadeh.com';
const xml=fs.readFileSync(path.join(root,'sitemap-fa.xml'),'utf8');
const slugs=[...xml.matchAll(/<loc>https:\/\/drjavadrezazadeh\.com\/fa\/rahnamaha\/([a-z0-9-]+)\/<\/loc>/g)].map(m=>m[1]);
if(slugs.length!==45||new Set(slugs).size!==45)throw new Error('Missing or repeated article sitemap entries');
const fail=[];
const get=p=>fs.readFileSync(path.join(root,p),'utf8');
for(const slug of slugs){
  const p='fa/rahnamaha/'+slug+'/index.html';
  const html=get(p);
  const canonical=domain+'/fa/rahnamaha/'+slug+'/';
  if(!html.includes('<body class="rtl content-page public-content-page knowledge-article-page"'))fail.push(slug+': missing article body class');
  if(!stylesheetSources(html).includes('knowledge-article.css')||!html.includes('assets/js/knowledge-article.js'))fail.push(slug+': premium CSS/JS missing');
  if(!html.includes('class="knowledge-article-layout"')||!html.includes('class="knowledge-article-content"'))fail.push(slug+': semantic editorial layout missing');
  if(!html.includes('class="knowledge-article-toc"')||!html.includes('class="knowledge-article-mobiletoc"'))fail.push(slug+': desktop/tablet/mobile navigation missing');
  if(!html.includes('data-article-copy')||!html.includes('data-article-share'))fail.push(slug+': no accessible sharing');
  if(!html.includes('class="knowledge-article-progress"'))fail.push(slug+': no reading progress UI');
  if(!html.includes('rel="canonical" href="'+canonical+'"'))fail.push(slug+': canonical changed');
  const headings=[...html.matchAll(/<h2\b[^>]*id="([^"]+)"[^>]*>[\s\S]*?<\/h2>/g)].map(x=>x[1]);
  if(headings.length<5||new Set(headings).size!==headings.length)fail.push(slug+': heading anchor coverage');
  for(const id of headings)if(!html.includes('href="#'+id+'"'))fail.push(slug+': broken TOC anchor #'+id);
  if(/class="knowledge-related-thumbnail"[^>]*alt=""/.test(html))fail.push(slug+': related image ALT missing');
  const firstImg='assets/images/knowledge/'+slug+'-featured.webp';
  if(!fs.existsSync(path.join(root,firstImg))||!html.includes(firstImg))fail.push(slug+': missing article photo');
  for(const img of html.matchAll(/src="\.\.\/\.\.\/\.\.\/(assets\/images\/knowledge\/[^"]+\.webp)"/g)){
    if(!fs.existsSync(path.join(root,img[1])))fail.push(slug+': missing related photo '+img[1]);
  }
  const ld=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  const nodes=[];
  for(const m of ld)try{let parsed=JSON.parse(m[1]);nodes.push(...(parsed['@graph']||[parsed]));}
  catch(e){fail.push(slug+': JSON-LD parse failed: '+e.message)}
  const articles=nodes.filter(x=>x['@type']==='Article');
  if(articles.length!==1){fail.push(slug+': expected one Article node');continue}
  const art=articles[0];
  const renderedH1=html.match(/<h1\b[^>]*>(.*?)<\/h1>/s)?.[1]?.replace(/<[^>]*>/g,'').trim();
  if(!renderedH1||art.headline!==renderedH1)fail.push(slug+': H1/schema headline differs');
  if(art.publisher?.['@type']!=='Person'||!art.publisher.name||!art.publisher.url)fail.push(slug+': self-publisher is not identified');
  if(art.isAccessibleForFree!==true)fail.push(slug+': public article incorrectly restricted');
  if(art.thumbnailUrl!==domain+'/'+firstImg)fail.push(slug+': wrong Article thumbnailUrl');
  if(art.mainEntityOfPage!==canonical)fail.push(slug+': bad mainEntityOfPage');
  if(!art.datePublished||!art.dateModified||!art.author?.name||!art.image?.length)fail.push(slug+': Article schema missing required attribution');
  const crumbs=nodes.find(x=>x['@type']==='BreadcrumbList')?.itemListElement;
  if(!Array.isArray(crumbs)||crumbs.at(-1)?.item!==canonical)fail.push(slug+': breadcrumbs mismatch');
}
for(const file of ['assets/css/knowledge-article.css','assets/js/knowledge-article.js']){
  if(!fs.existsSync(path.join(root,file)))fail.push('Missing global article dependency: '+file);
}
if(fail.length){console.error('ARTICLE RELEASE QA FAILED:',fail.length,fail.slice(0,40).join('\n'));process.exit(1)}
console.log('PASS: '+slugs.length+'/45 premium articles, static TOC and heading links, local images, canonical and full JSON-LD, attribution, metadata and assets.');
