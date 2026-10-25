/**
 * Master public semantic/SEO/GEO source inventory.
 *
 * Read-only. Do not run until the owner's single end-of-development QA window.
 * Never auto-edit canonical, noindex, published URLs or search-engine decisions.
 * Usage after owner authorizes tests:
 *   node scripts/master-semantic-geo-audit.mjs --json
 *   node scripts/master-semantic-geo-audit.mjs --strict
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const origin = 'https://drjavadrezazadeh.com';
const ignored = new Set(['.git', 'node_modules', '.public-site', 'work', 'proposals',
  'test-results', 'identity', '.next', 'dist', 'docs', 'foundation', 'scripts',
  'tests', 'platform', '.github', 'database', 'migrations', 'payment-api']);
const findings = [];
const stats = {pages:0, indexable:0, noindex:0, withHreflang:0, withJsonLd:0};
const indexableRoutes = new Map();
const canonicalRoutes = new Map();
const hreflangLinks = [];
const sitemapRoutes = new Set();
const htmlFiles = [];
const issue = (severity, route, code, detail) =>
  findings.push({severity, route, code, detail});

function visit(directory) {
  for (const entry of fs.readdirSync(directory, {withFileTypes:true})) {
    if (ignored.has(entry.name)) continue;
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) visit(file);
    else if (entry.isFile() && entry.name.endsWith('.html')) htmlFiles.push(file);
  }
}
function routeFor(file) {
  const relative = path.relative(root,file).split(path.sep).join('/');
  if (relative === 'index.html') return '/';
  return relative.endsWith('/index.html')
    ? '/' + relative.slice(0,-10)
    : '/' + relative;
}
function attributes(tag) {
  const attrs = {};
  for (const m of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
    attrs[m[1].toLowerCase()] = m[2] ?? m[3];
  }
  return attrs;
}
function tags(html, tag) {
  return [...html.matchAll(new RegExp('<'+tag+'\\b[^>]*>', 'gi'))].map(m=>m[0]);
}
function meta(html, name) {
  const match = tags(html,'meta').map(attributes)
    .find(a=>(a.name||'').toLowerCase()===name.toLowerCase());
  return match?.content||'';
}
function links(html, rel) {
  return tags(html,'link').map(attributes)
    .filter(a=>(a.rel||'').toLowerCase().split(/\s+/).includes(rel));
}
function textOnly(html) {
  return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ')
    .replace(/<[^>]*>/g,' ').replace(/&(?:[a-z]+|#\d+);/gi,' ')
    .replace(/\s+/g,' ').trim();
}
function extractHeadings(html) {
  const mainMatch=html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
  const source=mainMatch?.[1]||html;
  return [...source.matchAll(/<h([1-6])\b([^>]*)>([\s\S]*?)<\/h\1>/gi)]
    .map(m=>({level:Number(m[1]), title:textOnly(m[3]), attributes:attributes('<h'+m[1]+m[2]+'>')}));
}
function schemaNodes(value, out=[]) {
  if (Array.isArray(value)) { for(const v of value) schemaNodes(v,out);return out; }
  if (!value || typeof value!=='object') return out;
  if (typeof value['@type']==='string' || Array.isArray(value['@type'])) out.push(value);
  for(const [key,child] of Object.entries(value)) {
    if(key==='@context')continue;
    if(child&&typeof child==='object') schemaNodes(child,out);
  }
  return out;
}
for (const file of (visit(root),htmlFiles.sort())) {
  const route=routeFor(file);
  const html=fs.readFileSync(file,'utf8');
  if (/^google[a-f0-9]+\.html$/i.test(path.basename(file))) continue;
  stats.pages++;
  const rootTag=tags(html,'html')[0]||'';
  const htmlAttrs=attributes(rootTag);
  const language=htmlAttrs.lang||'';
  const direction=htmlAttrs.dir||'';
  const robots=meta(html,'robots').toLowerCase();
  const noindex=/(?:^|[\s,])noindex(?:$|[\s,])/.test(robots);
  if(noindex)stats.noindex++;else{stats.indexable++;indexableRoutes.set(route,file);}
  if(!['fa','en'].includes(language)) issue('P1',route,'HTML_LANG','Missing/unsupported page language');
  if(language==='fa'&&direction!=='rtl')issue('P1',route,'RTL','Persian page lacks dir=rtl');
  if(language==='en'&&direction&&direction!=='ltr')issue('P2',route,'LTR','English page has non-LTR direction');
  const mainCount=tags(html,'main').length;
  if(mainCount!==1)issue('P1',route,'MAIN','Expected one main landmark; found '+mainCount);
  if(!meta(html,'viewport'))issue('P1',route,'VIEWPORT','Missing mobile viewport');
  const headings=extractHeadings(html);
  const h1=headings.filter(h=>h.level===1);
  if(h1.length!==1)issue('P1',route,'H1_COUNT','Expected one H1 in main; found '+h1.length);
  if(h1.some(h=>!h.title))issue('P1',route,'H1_EMPTY','Empty main heading');
  let previous=0;
  for(const h of headings) {
    if(previous && h.level>previous+1)
      issue('P2',route,'HEADING_SKIP','Heading level H'+previous+' followed by H'+h.level+' ('+h.title.slice(0,70)+')');
    previous=h.level;
  }
  const title=textOnly((html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)||[])[1]||'');
  const description=meta(html,'description').trim();
  if(!noindex){
    if(title.length<15)issue('P1',route,'TITLE','Missing or unusually short title');
    if(description.length<40)issue('P1',route,'DESCRIPTION','Missing/substantively short meta description');
    if(description.length>320)issue('P3',route,'DESCRIPTION_LONG','Excessively long meta description');
  }
  const canonical=links(html,'canonical');
  if(!noindex&&canonical.length!==1) issue('P1',route,'CANONICAL_COUNT','Expected exactly one canonical, found '+canonical.length);
  if(canonical.length){
    const url=canonical[0].href||'';
    if(!url.startsWith(origin+'/'))issue('P1',route,'CANONICAL_ORIGIN',url);
    if(!noindex){
      if(url!==origin+route)issue('P1',route,'CANONICAL_NON_SELF','Review; never silently rewrite frozen URL: '+url);
      const old=canonicalRoutes.get(url);
      if(old)issue('P1',route,'CANONICAL_DUPLICATE','Also used by '+old);
      else canonicalRoutes.set(url,route);
    }
  }
  const alternates=links(html,'alternate').filter(x=>x.hreflang);
  if(alternates.length){stats.withHreflang++;for(const a of alternates)
    hreflangLinks.push({route,language:a.hreflang,url:a.href});}
  for(const a of alternates) {
    if(!['fa','en','x-default'].includes(a.hreflang))issue('P2',route,'HREFLANG_LOCALE',a.hreflang);
    if(!a.href?.startsWith(origin+'/'))issue('P1',route,'HREFLANG_ORIGIN',a.href||'missing href');
  }
  for(const img of tags(html,'img')){
    const attrs=attributes(img);
    if(!('alt' in attrs))issue('P2',route,'IMAGE_ALT','Image missing alt: '+(attrs.src||'unknown').slice(0,120));
    if(attrs.loading==='lazy'&&attrs.fetchpriority==='high')issue('P1',route,'LCP_CONFLICT',attrs.src||'unknown');
  }
  const scripts=[...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  if(scripts.length)stats.withJsonLd++;
  for(const script of scripts){
    let parsed;
    try{parsed=JSON.parse(script[1]);}
    catch(_){issue('P1',route,'JSONLD_PARSE','Invalid JSON-LD script');continue;}
    for(const node of schemaNodes(parsed)) {
      const types=Array.isArray(node['@type'])?node['@type']:[node['@type']];
      if(types.includes('AggregateRating')||types.includes('Review')){
        issue('P1',route,'REVIEW_SCHEMA_EVIDENCE','Review/rating markup requires an independently verified eligibility and data audit');
      }
      if(typeof node.url==='string' && /drjavadrezazadeh\.com/.test(node.url) &&
          !node.url.startsWith(origin+'/'))issue('P2',route,'SCHEMA_URL_ORIGIN',node.url);
    }
  }
  if(!noindex){
    const main=(html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)||[])[1]||'';
    if(textOnly(main).length<250)issue('P2',route,'THIN_CONTENT','Review if page serves a substantive search intent');
  }
}
for(const file of ['sitemap-core.xml','sitemap-fa.xml','sitemap-en.xml','sitemap-news.xml','sitemap-services.xml','journal/sitemap.xml']){
  const absolute=path.join(root,file);
  if(!fs.existsSync(absolute))continue;
  const xml=fs.readFileSync(absolute,'utf8');
  for(const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    if(m[1].startsWith(origin+'/'))sitemapRoutes.add(m[1].slice(origin.length));
  }
}
for(const route of indexableRoutes.keys())if(!sitemapRoutes.has(route))
  issue('P1',route,'SITEMAP_OMISSION','Indexable route absent from child sitemaps');
for(const route of sitemapRoutes)if(!indexableRoutes.has(route))
  issue('P1',route,'SITEMAP_NONINDEXABLE','Sitemap path has no indexable HTML source');
for(const entry of hreflangLinks){
  if(entry.language==='x-default')continue;
  const target=entry.url.slice(origin.length);
  const targetFile=indexableRoutes.get(target);
  if(!targetFile)issue('P2',entry.route,'HREFLANG_TARGET','Target lacks indexable source: '+target);
  else if(target!==entry.route){
    const targetHtml=fs.readFileSync(targetFile,'utf8');
    const reverse=links(targetHtml,'alternate').some(a=>a.hreflang&&a.href===origin+entry.route);
    if(!reverse)issue('P2',entry.route,'HREFLANG_RECIPROCITY','No reciprocal alternate on '+target);
  }
}
const report={
  schema:'jr-master-semantic-geo-audit-v1',
  scope:'source-only, not a live Google Search Console decision or ranking report',
  stats:{...stats, sitemapUrls:sitemapRoutes.size},
  summary:Object.fromEntries(['P0','P1','P2','P3'].map(p=>[p,findings.filter(f=>f.severity===p).length])),
  findings:findings.sort((a,b)=>a.severity.localeCompare(b.severity)||a.route.localeCompare(b.route))
};
if(process.argv.includes('--json'))console.log(JSON.stringify(report,null,2));
else{
  console.log('JR master semantic / SEO / GEO source audit',JSON.stringify(report.stats));
  console.log('Severity totals',JSON.stringify(report.summary));
  for(const f of report.findings)console.log(f.severity+' '+f.route+' '+f.code+' '+f.detail);
}
if(process.argv.includes('--strict')&&findings.some(f=>['P0','P1'].includes(f.severity)))process.exitCode=1;
