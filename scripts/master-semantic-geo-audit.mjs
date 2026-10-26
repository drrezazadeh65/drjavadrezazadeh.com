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
import {classifyRoute} from '../platform/ecosystem-governance.mjs';
import {isOwnershipVerificationArtifact} from './site-ownership-verification.mjs';

const root = process.cwd();
const origin = 'https://drjavadrezazadeh.com';
// Frozen released URLs are release-blocking. New public candidate URLs are not
// automatically obligated to appear in a sitemap until editorial release.
const frozenRoutes = new Set(JSON.parse(fs.readFileSync(
  path.join(root,'platform/public-url-stability-manifest.json'),'utf8'
)).frozen_indexable_routes||[]);
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
// One lightweight parsed record per URL; reciprocal hreflang is checked against
// the same source snapshot without repeatedly reading whole HTML documents.
const pageEvidence = new Map();
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
  if (isOwnershipVerificationArtifact(path.relative(root,file))) continue;
  stats.pages++;
  const rootTag=tags(html,'html')[0]||'';
  const htmlAttrs=attributes(rootTag);
  const language=htmlAttrs.lang||'';
  const direction=htmlAttrs.dir||'';
  const robots=meta(html,'robots').toLowerCase();
  const routePolicy=classifyRoute(route);
  const noindex=/(?:^|[\s,])noindex(?:$|[\s,])/.test(robots);
  if(noindex)stats.noindex++;else{stats.indexable++;indexableRoutes.set(route,file);}
  if(frozenRoutes.has(route)&&noindex)
    issue('P1',route,'FROZEN_NOINDEX','Frozen indexable route may not become noindex without approved migration');
  if(routePolicy.indexing==='NOINDEX'&&!noindex)
    issue('P1',route,'PRIVATE_INDEXING','Private/controlled route requires noindex under '+routePolicy.policy);
  if(!['fa','en'].includes(language)) issue('P1',route,'HTML_LANG','Missing/unsupported page language');
  if(language==='fa'&&direction!=='rtl')issue('P1',route,'RTL','Persian page lacks dir=rtl');
  if(language==='en'&&direction&&direction!=='ltr')issue('P2',route,'LTR','English page has non-LTR direction');
  const mainCount=tags(html,'main').length;
  if(mainCount!==1)issue(noindex?'P2':'P1',route,'MAIN','Expected one main landmark; found '+mainCount);
  if(!meta(html,'viewport'))issue('P1',route,'VIEWPORT','Missing mobile viewport');
  const headings=extractHeadings(html);
  const h1=headings.filter(h=>h.level===1);
  if(h1.length!==1)issue(noindex?'P2':'P1',route,'H1_COUNT','Expected one H1 in main; found '+h1.length);
  if(h1.some(h=>!h.title))issue(noindex?'P2':'P1',route,'H1_EMPTY','Empty main heading');
  if(headings.length&&headings[0].level!==1)
    issue('P2',route,'HEADING_ORDER','First heading in the main region is not H1');
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
  const ogUrl=tags(html,'meta').map(attributes).find(a=>a.property==='og:url')?.content||'';
  if(!noindex&&canonical.length===1&&ogUrl&&ogUrl!==canonical[0].href)
    issue('P1',route,'OG_CANONICAL_MISMATCH','og:url and the declared canonical differ');
  if(!noindex&&canonical.length!==1)
    issue('P1',route,'CANONICAL_COUNT','Expected exactly one canonical, found '+canonical.length);
  if(canonical.length){
    const url=canonical[0].href||'';
    if(!url.startsWith(origin+'/'))issue('P1',route,'CANONICAL_ORIGIN',url);
    if(!noindex){
      if(url!==origin+route)issue('P2',route,'CANONICAL_NON_SELF','Review intentional alias against frozen URL registry: '+url);
      const old=canonicalRoutes.get(url);
      if(old)issue('P1',route,'CANONICAL_DUPLICATE','Also used by '+old);
      else canonicalRoutes.set(url,route);
    }
  }
  const alternates=links(html,'alternate').filter(x=>x.hreflang);
  // The multilingual root is the language chooser, not the English home.
  // Its own variant is x-default=/; en=/en/ and fa=/fa/. Requiring
  // en=/ here would incorrectly replace this user-facing gateway policy.
  const xDefaultGateway=route==='/'&&alternates.some(a=>
    a.hreflang==='x-default'&&a.href===origin+'/')&&
    alternates.some(a=>a.hreflang==='en'&&a.href===origin+'/en/')&&
    alternates.some(a=>a.hreflang==='fa'&&a.href===origin+'/fa/');
  pageEvidence.set(route,{language,alternates});
  if(noindex&&alternates.length)
    issue('P2',route,'PRIVATE_HREFLANG','Private or noindex pages should not be promoted as public hreflang alternates');
  if(alternates.length){
    stats.withHreflang++;
    for(const a of alternates)hreflangLinks.push({route,language:a.hreflang,url:a.href});
    const declaredLanguages=new Set();
    for(const a of alternates){
      if(declaredLanguages.has(a.hreflang))
        issue('P2',route,'HREFLANG_DUPLICATE','Duplicate hreflang entry for '+a.hreflang);
      declaredLanguages.add(a.hreflang);
    }
    if(!noindex&&!xDefaultGateway&&!alternates.some(a=>a.hreflang===language&&a.href===origin+route))
      issue('P2',route,'HREFLANG_SELF_MISSING','Localised alternates should include the current public page');
  }
  for(const a of alternates) {
    if(!['fa','en','x-default'].includes(a.hreflang))issue('P2',route,'HREFLANG_LOCALE',a.hreflang);
    if(!xDefaultGateway&&a.hreflang===language&&a.href!==origin+route)
      issue('P1',route,'HREFLANG_SELF','Declared self-language alternate is not this page');
    if(!a.href?.startsWith(origin+'/'))issue('P1',route,'HREFLANG_ORIGIN',a.href||'missing href');
  }
  for(const img of tags(html,'img')){
    const attrs=attributes(img);
    if(!('alt' in attrs))issue('P2',route,'IMAGE_ALT','Image missing alt: '+(attrs.src||'unknown').slice(0,120));
    if(attrs.loading==='lazy'&&attrs.fetchpriority==='high')issue('P1',route,'LCP_CONFLICT',attrs.src||'unknown');
  }
  const scripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
    .filter(match=>attributes('<script'+match[1]+'>').type?.toLowerCase()==='application/ld+json')
    .map(match=>match[2]);
  if(scripts.length)stats.withJsonLd++;
  for(const script of scripts){
    let parsed;
    try{parsed=JSON.parse(script);}
    catch(_){issue('P1',route,'JSONLD_PARSE','Invalid JSON-LD script');continue;}
    for(const node of schemaNodes(parsed)) {
      const types=Array.isArray(node['@type'])?node['@type']:[node['@type']];
      if(types.includes('AggregateRating')||types.includes('Review')){
        issue('P2',route,'REVIEW_SCHEMA_EVIDENCE','Review/rating markup needs human evidence and current rich-result eligibility review');
      }
      if(typeof node.url==='string' && /drjavadrezazadeh\.com/.test(node.url) &&
          !node.url.startsWith(origin+'/'))issue('P2',route,'SCHEMA_URL_ORIGIN',node.url);
    }
  }
  if(!noindex){
    const main=(html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)||[])[1]||'';
    if(textOnly(main).length<250)issue('P2',route,'THIN_CONTENT','Review whether the public landing page satisfies a real search intent; no prescribed word count');
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
for(const route of frozenRoutes){
  if(!sitemapRoutes.has(route))
    issue('P1',route,'FROZEN_SITEMAP_OMISSION',
      'Permanent indexable URL missing from all approved child sitemaps');
  if(!indexableRoutes.has(route))
    issue('P1',route,'FROZEN_NOT_INDEXABLE',
      'Permanent published route missing or not indexable in the source; inspect approved redirect exception');
}
for(const route of indexableRoutes.keys()){
  if(sitemapRoutes.has(route)||frozenRoutes.has(route))continue;
  issue('P2',route,'UNREGISTERED_PUBLIC_ROUTE',
    'New public candidate omitted from listed sitemaps; decide editorial release and registry state');
}
for(const route of sitemapRoutes){
  if(indexableRoutes.has(route))continue;
  const relative=route==='/'?'index.html':route.replace(/^\//,'')+'index.html';
  const file=path.join(root,relative);
  const exists=fs.existsSync(file);
  issue(exists?'P1':'P2',route,'SITEMAP_NONINDEXABLE',
    exists?'Sitemap includes a nonindex HTML source':'Sitemap points to a route without local HTML; inspect alias or generated route');
}
for(const entry of hreflangLinks){
  if(entry.language==='x-default'){
    const target=entry.url?.startsWith(origin)?entry.url.slice(origin.length):null;
    if(!target||!indexableRoutes.has(target))
      issue('P2',entry.route,'XDEFAULT_TARGET','x-default must resolve to a released indexable public route');
    continue;
  }
  // Invalid or external alternates have already been diagnosed above.
  // Never slice an untrusted href into a plausible local route by accident.
  if(typeof entry.url!=='string'||!entry.url.startsWith(origin+'/')){
    continue;
  }
  const target=entry.url.slice(origin.length);
  if(!target.startsWith('/')||target.includes('?')||target.includes('#')){
    issue('P1',entry.route,'HREFLANG_TARGET_FORM','Alternate target must be a clean canonical public route');
    continue;
  }
  const targetFile=indexableRoutes.get(target);
  const evidence=pageEvidence.get(target);
  if(!targetFile||!evidence){
    issue('P2',entry.route,'HREFLANG_TARGET','Target lacks indexable source: '+target);
  }else{
    if(evidence.language!==entry.language)
      issue('P1',entry.route,'HREFLANG_MISMATCH',
        entry.language+' alternate points to '+target+' with html[lang]='+String(evidence.language));
    if(target!==entry.route){
      const reverse=evidence.alternates.some(a=>a.hreflang&&a.href===origin+entry.route);
      if(!reverse)issue('P2',entry.route,'HREFLANG_RECIPROCITY','No reciprocal alternate on '+target);
    }
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
