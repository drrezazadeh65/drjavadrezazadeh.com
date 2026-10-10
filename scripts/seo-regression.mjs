import fs from 'node:fs';
import path from 'node:path';
import {classifyRoute} from '../platform/ecosystem-governance.mjs';

const root=process.cwd();
const ignoreDirs=new Set(['.git','node_modules','.public-site','proposals','work','test-results']);
const htmlFiles=[];
function walk(dir){
  for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
    if(ignoreDirs.has(ent.name)) continue;
    const p=path.join(dir,ent.name);
    if(ent.isDirectory()) walk(p);
    else if(ent.isFile() && ent.name.endsWith('.html')) htmlFiles.push(p);
  }
}
walk(root);

const failures=[];
const warnings=[];
const canonicals=new Map();
const routeFor=file=>{
  const rel=path.relative(root,file).replaceAll(path.sep,'/');
  if(rel==='index.html') return '/';
  if(rel.endsWith('/index.html')) return '/'+rel.slice(0,-'index.html'.length);
  return '/'+rel;
};
const getAttr=(tag,name)=>{
  const m=tag.match(new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`,'i'));
  return m?m[2]:null;
};
const strip=(s='')=>s.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
const existsTarget=(file,href)=>{
  if(!href || /^(?:https?:|mailto:|tel:|javascript:|#)/i.test(href)) return true;
  const noHash=href.split('#')[0].split('?')[0];
  if(!noHash) return true;
  const baseDir=path.dirname(file);
  let target=noHash.startsWith('/')?path.join(root,noHash):path.resolve(baseDir,noHash);
  if(fs.existsSync(target) && fs.statSync(target).isDirectory()) target=path.join(target,'index.html');
  else if(!path.extname(target)) target=path.join(target,'index.html');
  return fs.existsSync(target);
};

for(const file of htmlFiles){
  const html=fs.readFileSync(file,'utf8');
  const route=routeFor(file);
  const htmlTag=(html.match(/<html\b[^>]*>/i)||[''])[0];
  const lang=getAttr(htmlTag,'lang');
  const dir=getAttr(htmlTag,'dir');
  const robots=((html.match(/<meta\b[^>]*name=["']robots["'][^>]*>/i)||[''])[0]);
  const robotContent=getAttr(robots,'content')||'';
  const isIndexable=!/\bnoindex\b/i.test(robotContent);
  const routePolicy=classifyRoute(route);
  const mustNoindex=routePolicy.indexing==='NOINDEX';

  if(!lang) failures.push(route+': missing html[lang]');
  if(lang==='fa' && dir!=='rtl') failures.push(route+': Persian page must use dir="rtl"');
  if(lang==='en' && dir && dir!=='ltr') failures.push(route+': English page must use dir="ltr"');
  if(!/<meta\b[^>]*name=["']viewport["']/i.test(html)) failures.push(route+': missing viewport meta');

  const h1=(html.match(/<h1\b/gi)||[]).length;
  if(h1!==1) failures.push(route+': expected exactly one H1, found '+h1);

  const title=strip((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)||[])[1]||'');
  if(!title) failures.push(route+': missing title');

  if(mustNoindex && isIndexable) failures.push(route+': route policy requires noindex ('+routePolicy.policy+')');

  if(isIndexable){
    const descTag=(html.match(/<meta\b[^>]*name=["']description["'][^>]*>/i)||[''])[0];
    const desc=getAttr(descTag,'content');
    if(!desc || desc.length<40) failures.push(route+': indexable page missing substantive meta description');
    const canonicalTag=(html.match(/<link\b[^>]*rel=["']canonical["'][^>]*>/i)||[''])[0];
    const canonical=getAttr(canonicalTag,'href');
    if(!canonical) failures.push(route+': indexable page missing canonical');
    else{
      if(canonicals.has(canonical)) failures.push(route+': duplicate canonical also used by '+canonicals.get(canonical));
      canonicals.set(canonical,route);
    }
  }

  for(const img of html.match(/<img\b[^>]*>/gi)||[]){
    const alt=getAttr(img,'alt');
    const src=getAttr(img,'src')||'unknown';
    const isOfficialEnamadSeal=/^https:\/\/trustseal\.enamad\.ir\/logo\.aspx\?/i.test(src);
    if(alt===null) failures.push(route+': image missing alt attribute: '+img.slice(0,120));
    const width=getAttr(img,'width'),height=getAttr(img,'height');
    // The official eNamad snippet must remain byte-faithful; its image tag omits
    // width/height/loading and the provider warns against editing the supplied code.
    if((!width||!height) && !isOfficialEnamadSeal) warnings.push(route+': image missing explicit width/height: '+src);
    if(isIndexable && !isOfficialEnamadSeal){
      const loading=(getAttr(img,'loading')||'').toLowerCase();
      const priority=(getAttr(img,'fetchpriority')||'').toLowerCase();
      if(loading==='lazy' && priority==='high') failures.push(route+': image cannot be both lazy and fetchpriority=high: '+src);
      if(loading!=='lazy' && priority!=='high') failures.push(route+': indexable-page image must be classified as lazy or fetchpriority=high: '+src);
    }
  }

  for(const a of html.match(/<a\b[^>]*>/gi)||[]){
    const href=getAttr(a,'href');
    if(href && !existsTarget(file,href)) failures.push(route+': broken internal href '+href);
  }

  if(isIndexable && /<script\b[^>]+src=["']https?:\/\//i.test(html)){
    warnings.push(route+': indexable page loads third-party script; review performance/privacy impact');
  }
}

if(failures.length){
  console.error('\nSEO regression failures ('+failures.length+')');
  failures.forEach(x=>console.error('✗ '+x));
}
if(warnings.length){
  console.warn('\nSEO regression warnings ('+warnings.length+')');
  warnings.forEach(x=>console.warn('! '+x));
}
console.log('\nAudited '+htmlFiles.length+' HTML files; '+canonicals.size+' indexable canonical URLs.');
if(failures.length) process.exit(1);


// SITEMAP GOVERNANCE — Frozen SEO baseline
const sitemapChildren=['sitemap-core.xml','sitemap-fa.xml','sitemap-en.xml','sitemap-news.xml','sitemap-services.xml'];
const sitemapUrls=new Set();
const sitemapIndexPath=path.join(root,'sitemap.xml');
let sitePrefix='';
if(fs.existsSync(sitemapIndexPath)){
  const indexXml=fs.readFileSync(sitemapIndexPath,'utf8');
  const firstLoc=(indexXml.match(/<loc>([^<]+)<\/loc>/i)||[])[1]||'';
  sitePrefix=firstLoc.replace(/\/sitemap-(?:core|fa|en|news|services)\.xml$/,'');
}
if(!sitePrefix) failures.push('/sitemap.xml: could not derive canonical site prefix from sitemap index');
for(const sm of sitemapChildren){
  const file=path.join(root,sm);
  if(!fs.existsSync(file)){failures.push('/'+sm+': missing child sitemap');continue;}
  const xml=fs.readFileSync(file,'utf8');
  for(const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)){
    const url=m[1].trim();
    if(sitemapUrls.has(url)) failures.push('/'+sm+': duplicate sitemap URL '+url);
    sitemapUrls.add(url);
    if(!url.startsWith(sitePrefix+'/') && url!==sitePrefix+'/'){
      failures.push('/'+sm+': URL outside current canonical host '+url);
      continue;
    }
    let route=url.slice(sitePrefix.length)||'/';
    if(!route.startsWith('/')) route='/'+route;
    let target=route==='/'?path.join(root,'index.html'):path.join(root,route,'index.html');
    if(!fs.existsSync(target)){
      failures.push('/'+sm+': sitemap URL has no local HTML target '+route);
      continue;
    }
    const html=fs.readFileSync(target,'utf8');
    const robots=((html.match(/<meta\b[^>]*name=["']robots["'][^>]*>/i)||[''])[0]);
    const rc=getAttr(robots,'content')||'';
    if(/\bnoindex\b/i.test(rc)) failures.push('/'+sm+': NOINDEX URL present in sitemap '+route);
    const canonicalTag=(html.match(/<link\b[^>]*rel=["']canonical["'][^>]*>/i)||[''])[0];
    const canonical=getAttr(canonicalTag,'href');
    if(canonical!==url) failures.push('/'+sm+': sitemap/canonical mismatch '+route+' -> '+(canonical||'missing canonical'));
  }
}

// Every indexable canonical must be represented in a child sitemap.
for(const [canonical,route] of canonicals.entries()){
  if(!sitemapUrls.has(canonical)) failures.push(route+': indexable canonical missing from sitemap system');
}

// Root sitemap must be a sitemap index containing every required child sitemap.
const rootSitemap=path.join(root,'sitemap.xml');
if(!fs.existsSync(rootSitemap)) failures.push('/sitemap.xml: missing sitemap index');
else{
  const xml=fs.readFileSync(rootSitemap,'utf8');
  if(!/<sitemapindex\b/i.test(xml)) failures.push('/sitemap.xml: root sitemap must be a sitemapindex');
  for(const sm of sitemapChildren){
    const expected=sitePrefix+'/'+sm;
    if(!xml.includes(expected)) failures.push('/sitemap.xml: missing child sitemap '+sm);
  }
}

if(failures.length){
  console.error('\nPost-sitemap SEO failures ('+failures.length+')');
  failures.forEach(x=>console.error('✗ '+x));
  process.exit(1);
}


// PUBLIC SEARCH INDEX — must mirror released public discovery surface without exposing private routes.
const searchIndexPath=path.join(root,'assets','search-index.json');
if(!fs.existsSync(searchIndexPath)) failures.push('/assets/search-index.json: missing public search index');
else{
  try{
    const searchEntries=JSON.parse(fs.readFileSync(searchIndexPath,'utf8'));
    const searchPaths=new Set();
    for(const entry of searchEntries){
      if(!['en','fa'].includes(entry.lang)||!entry.path||!entry.title||!entry.summary) failures.push('/assets/search-index.json: incomplete search entry '+(entry.path||'unknown'));
      const route='/'+String(entry.path).replace(/^\/+|\/+$/g,'')+'/';
      if(searchPaths.has(route)) failures.push('/assets/search-index.json: duplicate search path '+route);
      searchPaths.add(route);
      const policy=classifyRoute(route);
      if(policy.indexing==='NOINDEX') failures.push('/assets/search-index.json: noindex/private route leaked into public search '+route);
      if(!sitemapUrls.has(sitePrefix+route)) failures.push('/assets/search-index.json: search route is not released in sitemap '+route);
    }
    for(const url of sitemapUrls){
      let route=url.slice(sitePrefix.length)||'/';
      if(route==='/'||!/^\/(?:en|fa|publisher|journal)\//.test(route)) continue;
      if(!searchPaths.has(route)) failures.push('/assets/search-index.json: released public route missing from search index '+route);
    }
  }catch(e){
    failures.push('/assets/search-index.json: invalid search index '+e.message);
  }
}
if(failures.length){
  console.error('\nPublic-search index failures ('+failures.length+')');
  failures.forEach(x=>console.error('✗ '+x));
  process.exit(1);
}


// STRATEGIC INTERNAL-LINK CONTRACT — intent clusters must remain connected.
const internalLinkContractPath=path.join(root,'platform','internal-link-contract.json');
if(!fs.existsSync(internalLinkContractPath)) failures.push('/platform/internal-link-contract.json: missing strategic link contract');
else{
  try{
    const contract=JSON.parse(fs.readFileSync(internalLinkContractPath,'utf8'));
    const normaliseHref=(sourceRoute,href)=>{
      if(!href||href.startsWith('#')||/^(?:mailto:|tel:|javascript:)/i.test(href)) return null;
      let pathname;
      try{
        if(/^https?:\/\//i.test(href)){
          const u=new URL(href);
          pathname=u.pathname;
          const repoPrefix='/drjavadrezazadeh.com/';
          if(pathname.startsWith(repoPrefix)) pathname='/'+pathname.slice(repoPrefix.length);
        }else{
          const baseUrl='https://example.invalid'+sourceRoute;
          pathname=new URL(href,baseUrl).pathname;
        }
      }catch{return null;}
      if(!pathname.endsWith('/')&&!path.extname(pathname)) pathname+='/';
      return pathname.replace(/\/+/g,'/');
    };
    for(const page of contract.pages||[]){
      const file=page.route==='/'?path.join(root,'index.html'):path.join(root,page.route,'index.html');
      if(!fs.existsSync(file)){failures.push('/platform/internal-link-contract.json: source route missing '+page.route);continue;}
      const html=fs.readFileSync(file,'utf8');
      const links=new Set();
      for(const tag of html.match(/<a\b[^>]*>/gi)||[]){
        const href=getAttr(tag,'href');
        const normalized=normaliseHref(page.route,href);
        if(normalized) links.add(normalized);
      }
      for(const target of page.requires||[]){
        if(!links.has(target)) failures.push(page.route+': strategic internal link missing '+target);
      }
    }
  }catch(e){
    failures.push('/platform/internal-link-contract.json: invalid link contract '+e.message);
  }
}
if(failures.length){
  console.error('\nStrategic internal-link failures ('+failures.length+')');
  failures.forEach(x=>console.error('✗ '+x));
  process.exit(1);
}


// HREFLANG EQUIVALENCE REGISTRY — declared bilingual pairs are release contracts.
const hreflangRegistryPath=path.join(root,'platform','hreflang-pairs.json');
if(!fs.existsSync(hreflangRegistryPath)) failures.push('/platform/hreflang-pairs.json: missing bilingual equivalence registry');
else{
  try{
    const registry=JSON.parse(fs.readFileSync(hreflangRegistryPath,'utf8'));
    const pairs=Array.isArray(registry.pairs)?registry.pairs:[];
    const routeToPair=new Map();
    const canonicalHost=sitePrefix;
    const htmlForRoute=route=>{
      const p=route==='/'?path.join(root,'index.html'):path.join(root,route,'index.html');
      return fs.existsSync(p)?fs.readFileSync(p,'utf8'):null;
    };
    const alternateMap=html=>{
      const out=new Map();
      for(const tag of html.match(/<link\b[^>]*rel=["']alternate["'][^>]*>/gi)||[]){
        const lang=getAttr(tag,'hreflang'),href=getAttr(tag,'href');
        if(lang&&href) out.set(lang,href);
      }
      return out;
    };
    for(const pair of pairs){
      if(!pair?.id||!pair?.en||!pair?.fa) { failures.push('/platform/hreflang-pairs.json: invalid pair record'); continue; }
      for(const route of [pair.en,pair.fa]){
        if(routeToPair.has(route)) failures.push('/platform/hreflang-pairs.json: route appears in multiple equivalence pairs '+route);
        routeToPair.set(route,pair.id);
      }
      const enHtml=htmlForRoute(pair.en),faHtml=htmlForRoute(pair.fa);
      if(!enHtml||!faHtml){ failures.push('/platform/hreflang-pairs.json: pair target missing '+pair.id); continue; }
      const enRobots=getAttr((enHtml.match(/<meta\b[^>]*name=["']robots["'][^>]*>/i)||[''])[0],'content')||'';
      const faRobots=getAttr((faHtml.match(/<meta\b[^>]*name=["']robots["'][^>]*>/i)||[''])[0],'content')||'';
      if(/\bnoindex\b/i.test(enRobots)||/\bnoindex\b/i.test(faRobots)) failures.push('/platform/hreflang-pairs.json: localized pair must be indexable '+pair.id);
      const enAlt=alternateMap(enHtml),faAlt=alternateMap(faHtml);
      const enUrl=canonicalHost+pair.en,faUrl=canonicalHost+pair.fa;
      if(enAlt.get('en')!==enUrl||enAlt.get('fa')!==faUrl) failures.push(pair.en+': registered hreflang pair drift '+pair.id);
      if(faAlt.get('en')!==enUrl||faAlt.get('fa')!==faUrl) failures.push(pair.fa+': registered hreflang pair drift '+pair.id);
      const xDefaultUrl=canonicalHost+(pair.x_default||pair.en);
      if(enAlt.get('x-default')!==xDefaultUrl) failures.push(pair.en+': x-default drift '+pair.id);
      if(faAlt.get('x-default')!==xDefaultUrl) failures.push(pair.fa+': x-default drift '+pair.id);
    }
  }catch(e){
    failures.push('/platform/hreflang-pairs.json: invalid registry '+e.message);
  }
}
if(failures.length){
  console.error('\nHreflang equivalence-registry failures ('+failures.length+')');
  failures.forEach(x=>console.error('✗ '+x));
  process.exit(1);
}


// HREFLANG RECIPROCITY — check only genuine local alternates that are actually declared.
const localDocs=new Map();
for(const file of htmlFiles){
  const html=fs.readFileSync(file,'utf8');
  const htmlTag=(html.match(/<html\b[^>]*>/i)||[''])[0];
  const lang=getAttr(htmlTag,'lang')||'';
  const robots=((html.match(/<meta\b[^>]*name=["']robots["'][^>]*>/i)||[''])[0]);
  const rc=getAttr(robots,'content')||'';
  if(/\bnoindex\b/i.test(rc)) continue;
  const canonicalTag=(html.match(/<link\b[^>]*rel=["']canonical["'][^>]*>/i)||[''])[0];
  const canonical=getAttr(canonicalTag,'href');
  if(!canonical) continue;
  const alternates=[];
  for(const tag of html.match(/<link\b[^>]*rel=["']alternate["'][^>]*>/gi)||[]){
    const hreflang=getAttr(tag,'hreflang');
    const href=getAttr(tag,'href');
    if(hreflang&&href) alternates.push({hreflang,href});
  }
  localDocs.set(canonical,{file,lang,alternates,route:routeFor(file)});
}
for(const [canonical,doc] of localDocs.entries()){
  if(doc.route==='/') continue; // neutral x-default language gateway, not a localized counterpart
  for(const alt of doc.alternates){
    if(!['fa','en'].includes(alt.hreflang) || alt.href===canonical) continue;
    const target=localDocs.get(alt.href);
    if(!target) continue; // external/nonlocal alternate is outside this static audit.
    const reciprocal=target.alternates.some(x=>x.href===canonical && x.hreflang===doc.lang);
    if(!reciprocal) failures.push(doc.route+': hreflang not reciprocal with '+target.route);
  }
}
if(failures.length){
  console.error('\nHreflang SEO failures ('+failures.length+')');
  failures.forEach(x=>console.error('✗ '+x));
  process.exit(1);
}


// PRIVATE PWA CACHE FIREWALL — transactional/private routes must never be cached by the service worker.
const swPath=path.join(root,'sw.js');
if(!fs.existsSync(swPath)) failures.push('/sw.js: missing service worker');
else{
  const swSource=fs.readFileSync(swPath,'utf8');
  const requiredPrivatePrefixes=[
    '/fa/app/','/app/','/fa/login/','/login/','/fa/register/','/register/','/fa/bazyabi-hesab/','/en/login/','/en/register/','/en/recover/','/en/account/',
    '/fa/assessments/','/assessments/',
    '/fa/shop/cart/','/fa/shop/checkout/','/fa/shop/payment-start/','/fa/shop/payment-return/','/fa/shop/payment-result/',
    '/en/shop/cart/','/en/shop/checkout/',
    '/en/golden-talent/assessment/','/en/golden-talent/dashboard/','/en/golden-talent/observer/','/en/golden-talent/roles/','/en/golden-talent/student/','/en/golden-talent/checkout/','/en/golden-talent/plans/',
    '/fa/darkhast-moshavere/','/en/request-consultation/'
  ];
  for(const prefix of requiredPrivatePrefixes){
    if(!swSource.includes("'"+prefix+"'") && !swSource.includes('"'+prefix+'"')){
      failures.push('/sw.js: private route missing from cache-bypass firewall '+prefix);
    }
  }
  if(!/fetch\(req,\{cache:['"]no-store['"]\}\)/.test(swSource)){
    failures.push('/sw.js: private-route network fetch must use cache:no-store');
  }
  if(!swSource.includes('CSS/JS: network-first')){
    failures.push('/sw.js: CSS/JS must remain network-first to prevent stale deploy assets');
  }
  for(const iconPath of ['/assets/images/pwa-icon-192.png','/assets/images/pwa-icon-512.png','/assets/images/pwa-icon-maskable-512.png']){
    if(!swSource.includes("'"+iconPath+"'") && !swSource.includes('"'+iconPath+'"')){
      failures.push('/sw.js: PWA launcher icon missing from core app-shell cache '+iconPath);
    }
  }
  if(!/const isCode\s*=\s*\/\\\.\(\?:css\|js\)\$\/i/.test(swSource) && !swSource.includes("const isCode=/\\.(?:css|js)$/i")){
    failures.push('/sw.js: CSS/JS asset classifier missing');
  }
}
if(failures.length){
  console.error('\nPrivate PWA cache-firewall failures ('+failures.length+')');
  failures.forEach(x=>console.error('✗ '+x));
  process.exit(1);
}


// BERTINA APACHE REDIRECT REGISTRY — exact legacy migrations must remain permanent and local.
const htaccessPath=path.join(root,'.htaccess');
if(!fs.existsSync(htaccessPath)) failures.push('/.htaccess: missing Bertina Apache policy');
else{
  const ht=fs.readFileSync(htaccessPath,'utf8');
  const requiredRedirects={
    'about':'/en/about/',
    'academic-engagements':'/en/academic-engagements/',
    'books':'/en/books/',
    'educational-philosophy':'/en/educational-philosophy/',
    'golden-talent':'/en/golden-talent/',
    'publications':'/en/publications/',
    'research':'/en/research/',
    'teaching':'/en/teaching/',
    'login':'/en/login/',
    'register':'/en/register/'
  };
  for(const [source,destination] of Object.entries(requiredRedirects)){
    const escaped=source.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    const destinationPattern='(?:https:\\/\\/drjavadrezazadeh\\.com)?'+destination.replaceAll('/','\\/');
    const rule=new RegExp('RewriteRule \\^'+escaped+'\\/\\?\\$ '+destinationPattern+' \\[R=301,L,NE\\]');
    if(!rule.test(ht)) failures.push('/.htaccess: required permanent migration missing '+source+' -> '+destination);
  }
}
if(failures.length){
  console.error('\nBertina redirect-policy failures ('+failures.length+')');
  failures.forEach(x=>console.error('✗ '+x));
  process.exit(1);
}


// EVIDENCE REVIEW PROJECTION — routing must not trust raw evidence direction.
const reviewRuntimePath=path.join(root,'platform/golden-talent-review.mjs');
const reviewUniquePath=path.join(root,'platform/db/migrations/022_evidence_review_active_uniqueness.sql');
if(!fs.existsSync(reviewRuntimePath)) failures.push('/platform/golden-talent-review.mjs: missing review projection runtime');
else{
  const reviewRuntime=fs.readFileSync(reviewRuntimePath,'utf8');
  for(const token of ['effectiveEvidenceView','projectEvidenceLedger','review_projection','Multiple ACTIVE reviews']){
    if(!reviewRuntime.includes(token)) failures.push('/platform/golden-talent-review.mjs: persisted-review projection control missing '+token);
  }
}
if(!fs.existsSync(reviewUniquePath)) failures.push('/platform/db/migrations/022_evidence_review_active_uniqueness.sql: missing ACTIVE review uniqueness migration');
else{
  const reviewSql=fs.readFileSync(reviewUniquePath,'utf8');
  if(!reviewSql.includes('talent_evidence_review_one_active_uq')||!reviewSql.includes("WHERE review_status='ACTIVE'")) failures.push('/platform/db/migrations/022_evidence_review_active_uniqueness.sql: one-ACTIVE-review invariant missing');
}
const engineReviewGate=fs.readFileSync(path.join(root,'platform/golden-talent-engine.mjs'),'utf8');
if(!engineReviewGate.includes('review_projection?.active===true')||!engineReviewGate.includes('provenance?.review_id')){
  failures.push('/platform/golden-talent-engine.mjs: route eligibility must require persisted ACTIVE review projection');
}
if(failures.length){
  console.error('\nEvidence-review projection failures ('+failures.length+')');
  failures.forEach(x=>console.error('✗ '+x));
  process.exit(1);
}


// DEEP-MODULE COMPLETION SEMANTICS — registry requirements must be executable, not documentation-only.
const deepEnginePath=path.join(root,'platform/golden-talent-deep-module-engine.mjs');
if(!fs.existsSync(deepEnginePath)) failures.push('/platform/golden-talent-deep-module-engine.mjs: missing deep-module engine');
else{
  const deepEngine=fs.readFileSync(deepEnginePath,'utf8');
  for(const token of ['context_preservation','process_evidence','paired_performance','professional_review','external_or_performance']){
    if(!deepEngine.includes(token)) failures.push('/platform/golden-talent-deep-module-engine.mjs: completion requirement not enforced '+token);
  }
  if(!deepEngine.includes("total_score:null")||!deepEngine.includes("normative_label:null")){
    failures.push('/platform/golden-talent-deep-module-engine.mjs: non-psychometric output boundary missing');
  }
}
if(failures.length){
  console.error('\nDeep-module semantic failures ('+failures.length+')');
  failures.forEach(x=>console.error('✗ '+x));
  process.exit(1);
}


// ROUTE RUN SOURCE OF TRUTH — legacy assessment_route must not drive runtime.
const routeSourceMigration=path.join(root,'platform/db/migrations/024_route_run_source_of_truth.sql');
if(!fs.existsSync(routeSourceMigration)) failures.push('/platform/db/migrations/024_route_run_source_of_truth.sql: missing route source migration');
else{
  const sql=fs.readFileSync(routeSourceMigration,'utf8');
  for(const token of ['route_version_key','assessment_route_projection']){
    if(!sql.includes(token)) failures.push('/platform/db/migrations/024_route_run_source_of_truth.sql: source-of-truth control missing '+token);
  }
  if(!/legacy\s+compatibility\s+table\s+only/i.test(sql)) failures.push('/platform/db/migrations/024_route_run_source_of_truth.sql: legacy compatibility boundary missing');
}
const orchestrationPolicyPath=path.join(root,'platform/golden-talent-orchestration-policy.json');
if(fs.existsSync(orchestrationPolicyPath)){
  const p=JSON.parse(fs.readFileSync(orchestrationPolicyPath,'utf8'));
  if(p?.route_source_of_truth?.legacy_assessment_route!=='COMPATIBILITY_ONLY_DO_NOT_WRITE') failures.push('/platform/golden-talent-orchestration-policy.json: legacy route write prohibition missing');
}
for(const file of fs.readdirSync(path.join(root,'platform')).filter(x=>x.endsWith('.mjs'))){
  if(file==='golden-talent-orchestrator.mjs') continue;
  const src=fs.readFileSync(path.join(root,'platform',file),'utf8');
  if(/\bassessment_route\b/.test(src)) failures.push('/platform/'+file+': runtime references legacy assessment_route');
}
if(failures.length){
  console.error('\nRoute source-of-truth failures ('+failures.length+')');
  failures.forEach(x=>console.error('✗ '+x));
  process.exit(1);
}


// GOLDEN PATH RELEASE HISTORY — terminal transitions must be append-only and auditable.
const releaseTransitionPath=path.join(root,'platform/db/migrations/023_golden_path_release_transition_history.sql');
if(!fs.existsSync(releaseTransitionPath)) failures.push('/platform/db/migrations/023_golden_path_release_transition_history.sql: missing release transition migration');
else{
  const sql=fs.readFileSync(releaseTransitionPath,'utf8');
  for(const token of ['golden_path_release_transition','golden_path_release_transition_evidence','golden_path_release_terminal_transition_uq','pending_route_run_id']){
    if(!sql.includes(token)) failures.push('/platform/db/migrations/023_golden_path_release_transition_history.sql: release lifecycle persistence missing '+token);
  }
}
const releaseLifecyclePath=path.join(root,'platform/golden-path-lifecycle.mjs');
if(!fs.existsSync(releaseLifecyclePath)) failures.push('/platform/golden-path-lifecycle.mjs: missing release lifecycle runtime');
else{
  const runtime=fs.readFileSync(releaseLifecyclePath,'utf8');
  if(!runtime.includes('validateReleaseTransitionForPersistence')||!runtime.includes('audit_origin_required_before_commit')) failures.push('/platform/golden-path-lifecycle.mjs: auditable transition persistence gate missing');
}
if(failures.length){
  console.error('\nGolden Path release-history failures ('+failures.length+')');
  failures.forEach(x=>console.error('✗ '+x));
  process.exit(1);
}


// BAHAR STRUCTURED PERSISTENCE — weekly text must not be the evidence source of truth.
const baharPersistencePath=path.join(root,'platform/bahar-persistence.mjs');
const baharPersistenceMigration=path.join(root,'platform/db/migrations/025_bahar_weekly_structured_persistence.sql');
if(!fs.existsSync(baharPersistencePath)) failures.push('/platform/bahar-persistence.mjs: missing BAHAR persistence adapter');
else{
  const runtime=fs.readFileSync(baharPersistencePath,'utf8');
  for(const token of ['bahar_learning_evidence','observed_evidence_legacy_write:false','hydrateWeeklyCycle','planWeeklyCycleReview']){
    if(!runtime.includes(token)) failures.push('/platform/bahar-persistence.mjs: structured persistence invariant missing '+token);
  }
}
if(!fs.existsSync(baharPersistenceMigration)) failures.push('/platform/db/migrations/025_bahar_weekly_structured_persistence.sql: missing BAHAR persistence migration');
else{
  const sql=fs.readFileSync(baharPersistenceMigration,'utf8');
  if(!sql.includes('bahar_weekly_cycle_status_check')||!sql.includes('Structured observation source of truth is bahar_learning_evidence')) failures.push('/platform/db/migrations/025_bahar_weekly_structured_persistence.sql: BAHAR source-of-truth declaration missing');
}
if(failures.length){
  console.error('\nBAHAR structured-persistence failures ('+failures.length+')');
  failures.forEach(x=>console.error('✗ '+x));
  process.exit(1);
}


// BAHAR BASELINE HISTORY — longitudinal baselines are versioned and never silently overwritten.
const baharHistoryPath=path.join(root,'platform/db/migrations/021_bahar_baseline_history.sql');
if(!fs.existsSync(baharHistoryPath)) failures.push('/platform/db/migrations/021_bahar_baseline_history.sql: missing BAHAR baseline history migration');
else{
  const baharHistory=fs.readFileSync(baharHistoryPath,'utf8');
  for(const token of ['version_number','source_golden_path_release_id','supersedes_snapshot_id','bahar_baseline_snapshot_one_active_uq','weekly_cycle_id']){
    if(!baharHistory.includes(token)) failures.push('/platform/db/migrations/021_bahar_baseline_history.sql: required lineage control missing '+token);
  }
}
const gtApiPath=path.join(root,'foundation/GOLDEN-TALENT-API-CONTRACT-v1.yaml');
if(fs.existsSync(gtApiPath)){
  const gtApi=fs.readFileSync(gtApiPath,'utf8');
  if(!gtApi.includes('/release/{releaseId}/revoke:')) failures.push('/foundation/GOLDEN-TALENT-API-CONTRACT-v1.yaml: release revocation contract missing');
  if(!gtApi.includes('/baseline-transitions:')) failures.push('/foundation/GOLDEN-TALENT-API-CONTRACT-v1.yaml: BAHAR baseline transition contract missing');
  if(!gtApi.includes('never overwritten')) failures.push('/foundation/GOLDEN-TALENT-API-CONTRACT-v1.yaml: immutable baseline-history boundary missing');
}
if(failures.length){
  console.error('\nBAHAR lineage failures ('+failures.length+')');
  failures.forEach(x=>console.error('✗ '+x));
  process.exit(1);
}


// BERTINA APACHE RESPONSE-HEADER FIREWALL — production policy lives in .htaccess.
if(!fs.existsSync(htaccessPath)) failures.push('/.htaccess: missing Bertina Apache security policy');
else{
  const ht=fs.readFileSync(htaccessPath,'utf8');
  const requiredGlobalHeaders=[
    'X-Frame-Options "DENY"',
    'X-Content-Type-Options "nosniff"',
    'Referrer-Policy "strict-origin-when-cross-origin"',
    'Permissions-Policy "camera=(), microphone=(), geolocation=()"'
  ];
  for(const header of requiredGlobalHeaders){
    if(!ht.includes(header)) failures.push('/.htaccess: missing global security header '+header);
  }
  if(!/Header always set Cache-Control "no-store(?:,[^"]*)?" env=PRIVATE_ROUTE/.test(ht)) failures.push('/.htaccess: private routes must be no-store');
  if(!ht.includes('Header always set X-Robots-Tag "noindex, noarchive" env=PRIVATE_ROUTE')) failures.push('/.htaccess: private routes must be noindex');
  if(!/SetEnvIf Request_URI "\^\/\(api\|/.test(ht)) failures.push('/.htaccess: /api must be included in private no-store/noindex routing');
}
if(failures.length){
  console.error('\nBertina header-firewall failures ('+failures.length+')');
  failures.forEach(x=>console.error('✗ '+x));
  process.exit(1);
}


// SEO INTENT REGISTRY — canonical keyword ownership and anti-cannibalisation contract.
const seoIntentRegistryPath=path.join(root,'platform','seo-intent-registry.json');
if(!fs.existsSync(seoIntentRegistryPath)) failures.push('/platform/seo-intent-registry.json: missing keyword ownership registry');
else{
  try{
    const intentRegistry=JSON.parse(fs.readFileSync(seoIntentRegistryPath,'utf8'));
    const clusters=Array.isArray(intentRegistry.clusters)?intentRegistry.clusters:[];
    const intentOwners=new Map();
    for(const c of clusters){
      if(!c.id||!c.locale||!c.owner||!c.intent_key||c.status!=='INDEX') failures.push('/platform/seo-intent-registry.json: incomplete INDEX cluster '+(c.id||'unknown'));
      if(intentOwners.has(c.intent_key)) failures.push('/platform/seo-intent-registry.json: duplicate primary intent owner '+c.intent_key);
      intentOwners.set(c.intent_key,c.owner);
      if(c.locale==='en'&&!c.owner.startsWith('/en/')) failures.push('/platform/seo-intent-registry.json: English owner must live under /en/ '+c.id);
      if(c.locale==='fa'&&!c.owner.startsWith('/fa/')) failures.push('/platform/seo-intent-registry.json: Persian owner must live under /fa/ '+c.id);
      const absolute=sitePrefix+c.owner;
      if(c.status==='INDEX'&&!sitemapUrls.has(absolute)) failures.push('/platform/seo-intent-registry.json: INDEX owner missing from sitemap '+c.owner);
      if(!Array.isArray(c.primary_terms)||!c.primary_terms.length) failures.push('/platform/seo-intent-registry.json: primary terms missing '+c.id);
    }
  }catch(e){
    failures.push('/platform/seo-intent-registry.json: invalid registry '+e.message);
  }
}
if(failures.length){
  console.error('\nSEO-intent registry failures ('+failures.length+')');
  failures.forEach(x=>console.error('✗ '+x));
  process.exit(1);
}


// ORIGIN STATE FIREWALL — reserved subdomains must not leak before live cutover.
{
  const registry=JSON.parse(fs.readFileSync(path.join(root,'platform','ecosystem-registry.json'),'utf8'));
  const states=registry.origin_states||{};
  const reserved=[
    ['main_custom_domain','production_target'],
    ['private_app_subdomain','app_target'],
    ['api_subdomain','api_target'],
    ['journal_subdomain','journal_target'],
    ['press_subdomain','press_target']
  ];
  for(const [stateKey,originKey] of reserved){
    const origin=registry.origins?.[originKey];
    if(!origin||states[stateKey]==='LIVE') continue;
    for(const [canonical,route] of canonicals.entries()){
      if(canonical.startsWith(origin+'/')||canonical===origin) failures.push(route+': reserved non-live origin leaked into canonical '+origin);
    }
  }
  const cutoverSource=fs.readFileSync(path.join(root,'scripts','domain-cutover.mjs'),'utf8');
  if(!cutoverSource.includes('--confirm-https-ready')) failures.push('/scripts/domain-cutover.mjs: write-mode HTTPS confirmation gate missing');
  if(!cutoverSource.includes("main_custom_domain='LIVE'")) failures.push('/scripts/domain-cutover.mjs: atomic main-origin state transition missing');
}
if(failures.length){
  console.error('\nOrigin-state firewall failures ('+failures.length+')');
  failures.forEach(x=>console.error('✗ '+x));
  process.exit(1);
}


// MODULE ARCHITECTURE GRAPH — future capabilities must remain bounded and acyclic.
const moduleRegistryPath=path.join(root,'platform','module-registry.json');
if(!fs.existsSync(moduleRegistryPath)) failures.push('/platform/module-registry.json: missing bounded-module registry');
else{
  try{
    const mr=JSON.parse(fs.readFileSync(moduleRegistryPath,'utf8'));
    const mods=Array.isArray(mr.modules)?mr.modules:[];
    const ids=new Set(mods.map(m=>m.id));
    if(ids.size!==mods.length) failures.push('/platform/module-registry.json: duplicate module id');
    for(const m of mods){
      for(const d of m.depends_on||[]) if(!ids.has(d)) failures.push('/platform/module-registry.json: '+m.id+' has unknown dependency '+d);
      if(m.authority==='BROWSER'&&!['PUBLIC','PUBLIC_REFERENCE'].includes(m.data_class)) failures.push('/platform/module-registry.json: private browser authority prohibited '+m.id);
    }
    const by=new Map(mods.map(m=>[m.id,m])),visiting=new Set(),done=new Set();
    const visit=id=>{
      if(done.has(id)) return;
      if(visiting.has(id)){failures.push('/platform/module-registry.json: dependency cycle '+id);return;}
      visiting.add(id);
      for(const d of by.get(id)?.depends_on||[]) visit(d);
      visiting.delete(id);done.add(id);
    };
    for(const id of ids) visit(id);
  }catch(e){failures.push('/platform/module-registry.json: invalid module registry '+e.message);}
}
if(failures.length){
  console.error('\nModule architecture failures ('+failures.length+')');
  failures.forEach(x=>console.error('✗ '+x));
  process.exit(1);
}


// ECOSYSTEM REGISTRY — extensibility contract and fail-closed route governance.
const ecosystemRegistryPath=path.join(root,'platform','ecosystem-registry.json');
if(!fs.existsSync(ecosystemRegistryPath)) failures.push('/platform/ecosystem-registry.json: missing extensibility registry');
else{
  try{
    const registry=JSON.parse(fs.readFileSync(ecosystemRegistryPath,'utf8'));
    if(registry?.origins?.production_target!=='https://drjavadrezazadeh.com') failures.push('/platform/ecosystem-registry.json: production origin drift');
    if(JSON.stringify(registry?.locales?.supported)!==JSON.stringify(['fa','en'])) failures.push('/platform/ecosystem-registry.json: bilingual locale contract drift');
    if(registry?.locales?.automatic_ip_language_redirect!==false) failures.push('/platform/ecosystem-registry.json: automatic IP language redirect is prohibited');
    if(registry?.confidentiality?.unpublished_project_names_in_public_registry!==false) failures.push('/platform/ecosystem-registry.json: confidential project names must stay out of public registry');
    const policies=registry?.policies||{};
    const families=Array.isArray(registry?.route_families)?registry.route_families:[];
    const exactRoutes=Array.isArray(registry?.exact_routes)?registry.exact_routes:[];
    const seenExact=new Set();
    for(const item of exactRoutes){
      if(!item?.id||!item?.route||!policies[item.policy]) failures.push('/platform/ecosystem-registry.json: invalid exact route policy '+(item?.id||'unknown'));
      if(seenExact.has(item.route)) failures.push('/platform/ecosystem-registry.json: duplicate exact route '+item.route);
      seenExact.add(item.route);
      if(policies[item.policy]?.indexing==='NOINDEX'&&policies[item.policy]?.sitemap!=='EXCLUDE') failures.push('/platform/ecosystem-registry.json: NOINDEX exact route must be sitemap EXCLUDE '+item.route);
    }
    const noStorePrefixes=families.filter(x=>policies[x.policy]?.cache==='NO_STORE').map(x=>x.prefix);
    if(!noStorePrefixes.length) failures.push('/platform/ecosystem-registry.json: no private/no-store route families declared');
    const swSource=fs.existsSync(swPath)?fs.readFileSync(swPath,'utf8'):'';
    const siteJsPath=path.join(root,'assets','js','site.js');
    const siteJsSource=fs.existsSync(siteJsPath)?fs.readFileSync(siteJsPath,'utf8'):'';
    for(const prefix of noStorePrefixes){
      if(!swSource.includes("'"+prefix+"'")&&!swSource.includes('"'+prefix+'"')) failures.push('/sw.js: ecosystem private prefix missing from cache firewall '+prefix);
      if(!siteJsSource.includes("'"+prefix+"'")&&!siteJsSource.includes('"'+prefix+'"')) failures.push('/assets/js/site.js: private/no-store route missing from browser route policy '+prefix);
    }
    const extension=registry?.extension_contract||{};
    for(const field of ['stable_urls','stable_database_identifiers','backward_compatible_api_by_default','feature_flags_default_off','no_client_side_entitlement_authority','no_client_side_payment_success']){
      if(extension[field]!==true) failures.push('/platform/ecosystem-registry.json: required extensibility invariant disabled '+field);
    }
  }catch(e){
    failures.push('/platform/ecosystem-registry.json: invalid registry '+e.message);
  }
}
if(failures.length){
  console.error('\nEcosystem-registry failures ('+failures.length+')');
  failures.forEach(x=>console.error('✗ '+x));
  process.exit(1);
}


// MEDIA REGISTRY — every repository image asset must carry provenance, rights and bilingual accessibility metadata.
const mediaRegistryPath=path.join(root,'assets','media-registry.json');
if(!fs.existsSync(mediaRegistryPath)) failures.push('/assets/media-registry.json: missing media provenance registry');
else{
  try{
    const mediaRegistry=JSON.parse(fs.readFileSync(mediaRegistryPath,'utf8'));
    const entries=Array.isArray(mediaRegistry.assets)?mediaRegistry.assets:[];
    if(!entries.length) failures.push('/assets/media-registry.json: assets array must not be empty');
    const byPath=new Map();
    const requiredFields=['kind','role','provenance','rights','alt_en','alt_fa','caption_en','caption_fa'];
    for(const item of entries){
      const p=item?.path;
      if(!p || typeof p!=='string'){
        failures.push('/assets/media-registry.json: every media record needs a path');
        continue;
      }
      if(byPath.has(p)) failures.push('/assets/media-registry.json: duplicate media path '+p);
      byPath.set(p,item);
      const managedRoot=p.startsWith('assets/images/') || ['favicon.svg','favicon.png','favicon.ico'].includes(p);
      if(!managedRoot) failures.push('/assets/media-registry.json: media path is outside managed roots '+p);
      const abs=path.join(root,p);
      if(!fs.existsSync(abs)) failures.push('/assets/media-registry.json: registered file missing '+p);
      for(const field of requiredFields){
        if(typeof item[field]!=='string' || item[field].trim().length<2){
          failures.push('/assets/media-registry.json: '+p+' missing '+field);
        }
      }
    }

    const imageFiles=[];
    const collectImages=dir=>{
      for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
        const full=path.join(dir,ent.name);
        if(ent.isDirectory()) collectImages(full);
        else if(ent.isFile() && /\.(?:png|jpe?g|webp|gif|svg|avif|ico)$/i.test(ent.name)){
          imageFiles.push(path.relative(root,full).replaceAll(path.sep,'/'));
        }
      }
    };
    const imagesDir=path.join(root,'assets','images');
    collectImages(imagesDir);
    for(const fav of ['favicon.svg','favicon.png','favicon.ico']){
      if(fs.existsSync(path.join(root,fav))) imageFiles.push(fav);
    }
    for(const p of imageFiles){
      if(!byPath.has(p)) failures.push('/assets/media-registry.json: image asset is unregistered '+p);
    }
    for(const p of byPath.keys()){
      if(!imageFiles.includes(p)) failures.push('/assets/media-registry.json: registry path is not a current image asset '+p);
    }

    for(const file of htmlFiles){
      const html=fs.readFileSync(file,'utf8');
      for(const img of html.match(/<img\b[^>]*>/gi)||[]){
        const src=getAttr(img,'src');
        if(!src || /^(?:https?:|data:|blob:|\/\/)/i.test(src)) continue;
        const local=path.resolve(path.dirname(file),src.split('?')[0].split('#')[0]);
        const rel=path.relative(root,local).replaceAll(path.sep,'/');
        if(rel.startsWith('assets/images/') && !byPath.has(rel)){
          failures.push(routeFor(file)+': image source missing media-registry record '+rel);
        }
      }
    }
  }catch(e){
    failures.push('/assets/media-registry.json: invalid JSON or media-registry audit failure '+e.message);
  }
}
if(failures.length){
  console.error('\nMedia-registry failures ('+failures.length+')');
  failures.forEach(x=>console.error('✗ '+x));
  process.exit(1);
}


// MOBILE DOCK ACTIVE STATE — only the most specific route is current.
{
  const js=fs.readFileSync(path.join(root,'assets','js','site.js'),'utf8');
  if(!js.includes('function markActiveDockItem()')||!js.includes('const bestMatch=candidates[0].a')) failures.push('/assets/js/site.js: most-specific mobile dock active-state logic missing');
  if(!js.includes("removeAttribute('aria-current')")) failures.push('/assets/js/site.js: stale aria-current cleanup missing');
}
if(failures.length){
  console.error('\nMobile dock active-state failures ('+failures.length+')');
  failures.forEach(x=>console.error('✗ '+x));
  process.exit(1);
}


// PROGRESSIVE MOBILE NAVIGATION — app-like enhancement must not erase navigation without JavaScript.
const siteJsProgressivePath=path.join(root,'assets','js','site.js');
const siteCssProgressivePath=path.join(root,'assets','css','style.css');
if(fs.existsSync(siteJsProgressivePath)&&fs.existsSync(siteCssProgressivePath)){
  const js=fs.readFileSync(siteJsProgressivePath,'utf8');
  const css=fs.readFileSync(siteCssProgressivePath,'utf8');
  if(!js.includes("document.documentElement.classList.add('js')")) failures.push('/assets/js/site.js: progressive enhancement js marker missing');
  if(/(?<!\.js )\.site-header nav\{display:none\}/.test(css)) failures.push('/assets/css/style.css: mobile header navigation must not be hidden unconditionally');
  if(!css.includes('html:not(.js) .site-header nav{')) failures.push('/assets/css/style.css: progressive mobile navigation fallback missing');
}else failures.push('progressive mobile navigation assets missing');
if(failures.length){
  console.error('\nProgressive mobile navigation failures ('+failures.length+')');
  failures.forEach(x=>console.error('✗ '+x));
  process.exit(1);
}


// PWA HEAD METADATA — every site.js surface can acquire install metadata without duplicating 179 page heads.
{
  const js=fs.readFileSync(path.join(root,'assets','js','site.js'),'utf8');
  const rootHtml=fs.readFileSync(path.join(root,'index.html'),'utf8');
  for(const token of ['function ensurePwaHead()','site.webmanifest','pwa-icon-192.png','mobile-web-app-capable','color-scheme']){
    if(!js.includes(token)) failures.push('/assets/js/site.js: shared PWA head metadata missing '+token);
  }
  if(!rootHtml.includes('href="./assets/images/pwa-icon-192.png"')) failures.push('/: Apple touch icon must use square PWA artwork');
  if(!rootHtml.includes('name="color-scheme" content="dark"')) failures.push('/: root gateway color-scheme metadata missing');
}
if(failures.length){
  console.error('\nPWA head-metadata failures ('+failures.length+')');
  failures.forEach(x=>console.error('✗ '+x));
  process.exit(1);
}


// MOBILE + PWA SOURCE GUARDRAILS — prevents known overflow/safe-area regressions.
const cssPath=path.join(root,'assets','css','style.css');
if(!fs.existsSync(cssPath)) failures.push('/assets/css/style.css: missing global stylesheet');
else{
  const css=fs.readFileSync(cssPath,'utf8');
  if(/(?:^|[;{])\s*(?:width|min-width)\s*:\s*100vw\b/i.test(css)){
    failures.push('/assets/css/style.css: width/min-width:100vw is prohibited because it can reintroduce mobile horizontal overflow');
  }
  if(/html,body\{[^}]*overflow-x\s*:\s*(?:hidden|clip)/i.test(css)){
    failures.push('/assets/css/style.css: global overflow-x hiding is prohibited; fix the overflowing component instead');
  }
  if(!css.includes('env(safe-area-inset-bottom)')) failures.push('/assets/css/style.css: missing bottom safe-area handling');
  if(!css.includes('@media(max-width:320px)')) failures.push('/assets/css/style.css: explicit 320px hard-floor QA rules missing');
  if(!css.includes('env(safe-area-inset-top)')) warnings.push('/assets/css/style.css: top safe-area handling not detected');
}
const manifestPath=path.join(root,'site.webmanifest');
if(!fs.existsSync(manifestPath)) failures.push('/site.webmanifest: missing PWA manifest');
else{
  try{
    const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
    if(!manifest.name&&!manifest.short_name) failures.push('/site.webmanifest: name or short_name required');
    if(!manifest.start_url) failures.push('/site.webmanifest: start_url required');
    if(!manifest.display&&!manifest.display_override) failures.push('/site.webmanifest: display/display_override required');
    if(manifest.prefer_related_applications===true) failures.push('/site.webmanifest: prefer_related_applications must not be true');
    if(!Array.isArray(manifest.icons)||!manifest.icons.length) failures.push('/site.webmanifest: at least one icon required');
    else{
      const rasterAny=manifest.icons.filter(i=>i?.sizes==='any' && i?.type && !/svg\+xml/i.test(i.type));
      if(rasterAny.length) failures.push('/site.webmanifest: raster icon must declare exact pixel dimensions, not sizes="any"');
      const icon192=manifest.icons.find(i=>/(^|\s)192x192(\s|$)/.test(i?.sizes||''));
      const icon512=manifest.icons.find(i=>/(^|\s)512x512(\s|$)/.test(i?.sizes||''));
      if(!icon192||!icon512) failures.push('/site.webmanifest: exact 192x192 and 512x512 production icons are required');
      const verifyPngIcon=(icon,expected)=>{
        if(!icon?.src) return;
        const rel=icon.src.replace(/^\.\//,'').split('?')[0].split('#')[0];
        const filePath=path.join(root,rel);
        if(!fs.existsSync(filePath)){
          failures.push('/site.webmanifest: icon file missing '+icon.src);
          return;
        }
        if(icon.type!=='image/png') failures.push('/site.webmanifest: production launcher icon must declare image/png '+icon.src);
        const buf=fs.readFileSync(filePath);
        const pngSig=buf.length>=24 && buf[0]===0x89 && buf.slice(1,4).toString('ascii')==='PNG';
        if(!pngSig){
          failures.push('/site.webmanifest: launcher icon is not a valid PNG '+icon.src);
          return;
        }
        const width=buf.readUInt32BE(16),height=buf.readUInt32BE(20);
        if(width!==expected||height!==expected){
          failures.push('/site.webmanifest: '+icon.src+' must be exactly '+expected+'x'+expected+' but is '+width+'x'+height);
        }
      };
      verifyPngIcon(icon192,192);
      verifyPngIcon(icon512,512);
      const maskable512=manifest.icons.find(i=>/(^|\s)maskable(\s|$)/.test(i?.purpose||'') && /(^|\s)512x512(\s|$)/.test(i?.sizes||''));
      if(!maskable512) failures.push('/site.webmanifest: dedicated 512x512 maskable launcher icon is required');
      else verifyPngIcon(maskable512,512);
    }
  }catch(e){
    failures.push('/site.webmanifest: invalid JSON');
  }
}
if(failures.length){
  console.error('\nMobile/PWA guardrail failures ('+failures.length+')');
  failures.forEach(x=>console.error('✗ '+x));
  process.exit(1);
}


// PERFORMANCE BUDGET — guardrails, not synthetic CWV claims.
const budgets=[
  ['assets/css/style.css',120*1024],
  ['assets/js/site.js',25*1024],
  ['assets/js/rcas-start.js',30*1024],
  ['assets/js/student-dashboard.js',15*1024],
  ['assets/js/integrated-profile.js',25*1024]
];
for(const [rel,max] of budgets){
  const p=path.join(root,rel);
  if(fs.existsSync(p)){
    const size=fs.statSync(p).size;
    if(size>max) failures.push('/'+rel+': performance budget exceeded ('+size+' > '+max+' bytes)');
  }
}
const imageRoot=path.join(root,'assets','images');
if(fs.existsSync(imageRoot)){
  for(const ent of fs.readdirSync(imageRoot,{withFileTypes:true})){
    if(!ent.isFile()) continue;
    const p=path.join(imageRoot,ent.name);
    const size=fs.statSync(p).size;
    if(size>350*1024) warnings.push('/assets/images/'+ent.name+': large image asset '+size+' bytes; review compression/responsiveness');
  }
}
if(failures.length){
  console.error('\nPerformance-budget failures ('+failures.length+')');
  failures.forEach(x=>console.error('✗ '+x));
  process.exit(1);
}


// ACCESSIBILITY BASELINE — static release guardrails, not a full WCAG conformance audit.
for(const file of htmlFiles){
  const html=fs.readFileSync(file,'utf8');
  const route=routeFor(file);
  const robots=((html.match(/<meta\b[^>]*name=["']robots["'][^>]*>/i)||[''])[0]);
  const rc=getAttr(robots,'content')||'';
  const indexable=!/\bnoindex\b/i.test(rc);

  if(indexable && !/<main\b/i.test(html)) failures.push(route+': indexable page missing <main> landmark');

  for(const tag of html.match(/<(?:a|button)\b[^>]*>[\s\S]*?<\/(?:a|button)>/gi)||[]){
    const isOfficialEnamadSeal=/trustseal\.enamad\.ir\/(?:\?|logo\.aspx\?)/i.test(tag) && /sealMJydDpzqNid1Ty82Y90Ef6SZLah1/.test(tag);
    if(isOfficialEnamadSeal) continue; // Provider-supplied trust-seal snippet must remain unmodified.
    const inner=strip(tag.replace(/^<[^>]+>/,'').replace(/<\/[^>]+>$/,''));
    const aria=getAttr(tag,'aria-label');
    const title=getAttr(tag,'title');
    const hasImgAlt=/<img\b[^>]*alt=["'][^"']+["']/i.test(tag);
    const hasTextSvg=/<svg\b[^>]*>[\s\S]*?<title\b/i.test(tag);
    if(!inner&&!aria&&!title&&!hasImgAlt&&!hasTextSvg) failures.push(route+': empty interactive control without accessible name');
  }

  const controls=html.match(/<(?:input|select|textarea)\b[^>]*>/gi)||[];
  for(const ctl of controls){
    if(/type=["']hidden["']/i.test(ctl)) continue;
    const aria=getAttr(ctl,'aria-label')||getAttr(ctl,'aria-labelledby');
    if(aria) continue;
    const idx=html.indexOf(ctl);
    const before=html.slice(Math.max(0,idx-700),idx);
    const after=html.slice(idx,Math.min(html.length,idx+700));
    const wrapped=/<label\b[^>]*>[\s\S]*$/i.test(before)&&/<\/label>/i.test(after);
    const id=getAttr(ctl,'id');
    const explicit=id ? html.includes('for="'+id+'"') || html.includes("for='"+id+"'") : false;
    if(!wrapped&&!explicit) warnings.push(route+': form control may lack an accessible label: '+ctl.slice(0,110));
  }
}
if(failures.length){
  console.error('\nAccessibility baseline failures ('+failures.length+')');
  failures.forEach(x=>console.error('✗ '+x));
  process.exit(1);
}


// NEWS SITEMAP TAXONOMY — evergreen guides must never leak back into news.
const newsMapFile=path.join(root,'sitemap-news.xml');
if(fs.existsSync(newsMapFile)){
  const newsXml=fs.readFileSync(newsMapFile,'utf8');
  for(const m of newsXml.matchAll(/<loc>([^<]+)<\/loc>/g)){
    const url=m[1].trim();
    if(url.includes('/fa/rahnamaha/')) failures.push('/sitemap-news.xml: evergreen guide found in news sitemap '+url);
    if(!url.includes('/fa/akhbar/')) warnings.push('/sitemap-news.xml: review non-news URL '+url);
  }
}
if(failures.length){
  console.error('\nNews taxonomy failures ('+failures.length+')');
  failures.forEach(x=>console.error('✗ '+x));
  process.exit(1);
}


// STRATEGIC METADATA COVERAGE — warnings feed the pre-domain audit.
for(const file of htmlFiles){
  const html=fs.readFileSync(file,'utf8');
  const route=routeFor(file);
  const robots=((html.match(/<meta\b[^>]*name=["']robots["'][^>]*>/i)||[''])[0]);
  const rc=getAttr(robots,'content')||'';
  if(/\bnoindex\b/i.test(rc)) continue;

  if(!/<meta\b[^>]*property=["']og:title["']/i.test(html)) warnings.push(route+': indexable page missing og:title');
  if(!/<meta\b[^>]*property=["']og:description["']/i.test(html)) warnings.push(route+': indexable page missing og:description');
  if(!/<meta\b[^>]*property=["']og:image["']/i.test(html)) warnings.push(route+': indexable page missing og:image');
  if(!/<script\b[^>]*type=["']application\/ld\+json["']/i.test(html)) warnings.push(route+': indexable page missing JSON-LD');

  const looksArticle=/<meta\b[^>]*property=["']og:type["'][^>]*content=["']article["']/i.test(html) || /"@type"\s*:\s*"(?:Article|NewsArticle|BlogPosting)"/i.test(html);
  if(looksArticle){
    if(!/"author"\s*:/i.test(html)) failures.push(route+': article-like page missing structured author');
    if(!/"datePublished"\s*:/i.test(html)) warnings.push(route+': article-like page missing datePublished');
  }
}


// FINAL WARNING REPORT — includes warnings generated by late audit gates.
if(warnings.length){
  console.warn('\nFinal SEO audit warnings ('+warnings.length+')');
  [...new Set(warnings)].forEach(x=>console.warn('! '+x));
}


// PUBLIC ENTITY REGISTRY — structured identity must be stable and verified.
const publicEntityPath=path.join(root,'platform','public-entity-registry.json');
if(!fs.existsSync(publicEntityPath)) failures.push('/platform/public-entity-registry.json: missing machine-readable entity registry');
else{
  try{
    const entityRegistry=JSON.parse(fs.readFileSync(publicEntityPath,'utf8'));
    const person=entityRegistry.person||{};
    const expectedPersonId=sitePrefix+(person.entity_id_path||'/#person');
    const approvedSameAs=new Set(person.approved_same_as||[]);
    const visit=(node,fn)=>{
      if(Array.isArray(node)){for(const x of node) visit(x,fn);return;}
      if(node&&typeof node==='object'){fn(node);for(const v of Object.values(node)) visit(v,fn);}
    };
    for(const file of htmlFiles){
      const html=fs.readFileSync(file,'utf8');
      const route=routeFor(file);
      const robots=getAttr((html.match(/<meta\b[^>]*name=["']robots["'][^>]*>/i)||[''])[0],'content')||'';
      if(/\bnoindex\b/i.test(robots)) continue;
      for(const m of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){
        let data;try{data=JSON.parse(m[1]);}catch{continue;}
        visit(data,obj=>{
          const types=Array.isArray(obj['@type'])?obj['@type']:[obj['@type']];
          if(types.includes('Person')){
            if(obj.name&&obj.name!==person.structured_name) failures.push(route+': Person schema name drifts from public entity registry');
            if(obj['@id']&&obj['@id']!==expectedPersonId) failures.push(route+': Person schema @id drifts from canonical entity id');
            for(const url of obj.sameAs||[]) if(!approvedSameAs.has(url)) failures.push(route+': unverified Person sameAs URL '+url);
          }
          if(types.includes('ProfilePage')){
            const main=obj.mainEntity;
            const mainTypes=Array.isArray(main?.['@type'])?main['@type']:[main?.['@type']];
            if(!main||!mainTypes.some(type=>type==='Person'||type==='Organization'))
              failures.push(route+': ProfilePage mainEntity must directly declare Person or Organization type (Google eligibility)');
            if(!main?.name&&!main?.alternateName)
              failures.push(route+': ProfilePage mainEntity missing required person/organization name');
            if(main?.['@id']!==expectedPersonId)
              failures.push(route+': ProfilePage mainEntity drifts from canonical person id');
          }
        });
      }
    }
    if(person.structured_name!=='Javad Rezazadeh Yazdeli'||person.persian_public_name!=='دکتر جواد رضازاده یزدلی') failures.push('/platform/public-entity-registry.json: canonical public names drift');
    const phd=(person.education||[]).find(x=>x.degree==='PhD');
    if(!phd||phd.field!=='Education'||phd.institution!=='Arak University'||phd.completed_year!==2026) failures.push('/platform/public-entity-registry.json: frozen PhD fact drift');
  }catch(e){
    failures.push('/platform/public-entity-registry.json: invalid entity registry '+e.message);
  }
}
if(failures.length){
  console.error('\nPublic-entity registry failures ('+failures.length+')');
  failures.forEach(x=>console.error('✗ '+x));
  process.exit(1);
}


// PUBLIC FACT CONSISTENCY — narrow guardrails for recurrent degree claims.
const publicFactChecks=[
  {
    file:'en/about/index.html',
    required:['2026','PhD in Education · Arak University','M.A. · University of Tehran'],
    forbidden:['<b>2020</b><span>Doctoral studies · Arak University</span>','PhD in English Language Education','I currently teach at Tehran University of Medical Sciences']
  },
  {
    file:'fa/darbare-man/index.html',
    required:['۲۰۲۶','دکتری آموزش · دانشگاه اراک','کارشناسی ارشد · دانشگاه تهران'],
    forbidden:['<b>۲۰۲۰</b><span>تحصیلات دکتری · دانشگاه اراک</span>','دکتری آموزش زبان انگلیسی','در حال حاضر در دانشگاه علوم پزشکی تهران تدریس می‌کنم']
  }
];
for(const check of publicFactChecks){
  const p=path.join(root,check.file);
  if(!fs.existsSync(p)){failures.push('/'+check.file+': public fact source page missing');continue;}
  const html=fs.readFileSync(p,'utf8');
  for(const phrase of check.required) if(!html.includes(phrase)) failures.push('/'+check.file+': required public fact missing: '+phrase);
  for(const phrase of check.forbidden) if(html.includes(phrase)) failures.push('/'+check.file+': obsolete/conflicting public fact returned: '+phrase);
}
if(failures.length){
  console.error('\nPublic-fact consistency failures ('+failures.length+')');
  failures.forEach(x=>console.error('✗ '+x));
  process.exit(1);
}


// JOURNAL RELEASE FIREWALL — only explicitly approved JHELA routes may be indexed before journal launch.
const journalIndexAllowlist=new Set([
  '/journal/call-for-reviewers/',
  '/journal/founding-collaborators/'
]);
for(const file of htmlFiles){
  const route=routeFor(file);
  if(!route.startsWith('/journal/')) continue;
  const html=fs.readFileSync(file,'utf8');
  const robots=((html.match(/<meta\b[^>]*name=["']robots["'][^>]*>/i)||[''])[0]);
  const rc=getAttr(robots,'content')||'';
  const indexable=!/\bnoindex\b/i.test(rc);
  if(indexable && !journalIndexAllowlist.has(route)){
    failures.push(route+': JHELA route is indexable before explicit journal release approval');
  }
}

// UNRELEASED RESEARCH FIREWALL — confidential project names are assembled at runtime
// so current public source does not publish the protected names as literal strings.
const protectedResearchPatterns=[
  new RegExp('\\b'+'human'+'ability'+'\\b','i'),
  new RegExp('\\b'+'test'+'ly'+'\\b','i'),
  new RegExp('\\b'+'teacher'+'\\s+'+'human'+'ization'+'\\b','i')
];
for(const file of htmlFiles){
  const html=fs.readFileSync(file,'utf8');
  const route=routeFor(file);
  const robots=((html.match(/<meta\b[^>]*name=["']robots["'][^>]*>/i)||[''])[0]);
  const rc=getAttr(robots,'content')||'';
  const publicSurface=!/\bnoindex\b/i.test(rc);
  if(!publicSurface) continue;
  for(const re of protectedResearchPatterns){
    if(re.test(html)){
      failures.push(route+': protected/unreleased research term leaked to indexable HTML');
    }
  }
}
if(failures.length){
  console.error('\nRelease-firewall failures ('+failures.length+')');
  failures.forEach(x=>console.error('✗ '+x));
  process.exit(1);
}


// CURRENT-TREE CONFIDENTIALITY FIREWALL — NOINDEX is not security.
// Scan all text-like repository files, not only public HTML, for protected literal project names.
const protectedTextExtensions=/\.(?:html?|md|txt|json|ya?ml|csv|js|mjs|css|xml|sql|webmanifest)$/i;
const protectedTextFiles=[];
function collectProtectedTextFiles(dir){
  for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
    if(ignoreDirs.has(ent.name)) continue;
    const p=path.join(dir,ent.name);
    if(ent.isDirectory()) collectProtectedTextFiles(p);
    else if(ent.isFile()&&protectedTextExtensions.test(ent.name)) protectedTextFiles.push(p);
  }
}
collectProtectedTextFiles(root);
for(const file of protectedTextFiles){
  const rel=path.relative(root,file).replaceAll(path.sep,'/');
  for(const re of protectedResearchPatterns){
    re.lastIndex=0;
    if(re.test(rel)){
      failures.push('/'+rel+': protected/unreleased research term exposed in repository path');
      break;
    }
    re.lastIndex=0;
    const source=fs.readFileSync(file,'utf8');
    if(re.test(source)){
      failures.push('/'+rel+': protected/unreleased research term exposed in current repository source');
      break;
    }
  }
}
if(failures.length){
  console.error('\nCurrent-tree confidentiality failures ('+failures.length+')');
  failures.forEach(x=>console.error('✗ '+x));
  process.exit(1);
}


// GLOBAL PUBLIC FACT GUARDRAILS — prevent known obsolete degree claims on any indexable page.
const globallyForbiddenPublicClaims=[
  'PhD in English Language Education',
  'Doctoral studies · Arak University</span>',
  'دکتری آموزش زبان انگلیسی',
  'تحصیلات دکتری · دانشگاه اراک</span>'
];
for(const file of htmlFiles){
  const html=fs.readFileSync(file,'utf8');
  const route=routeFor(file);
  const robots=((html.match(/<meta\b[^>]*name=["']robots["'][^>]*>/i)||[''])[0]);
  const rc=getAttr(robots,'content')||'';
  if(/\bnoindex\b/i.test(rc)) continue;
  for(const claim of globallyForbiddenPublicClaims){
    if(html.includes(claim)) failures.push(route+': obsolete/conflicting degree claim detected: '+claim);
  }
}
if(failures.length){
  console.error('\nGlobal public-fact failures ('+failures.length+')');
  failures.forEach(x=>console.error('✗ '+x));
  process.exit(1);
}


// ENTITY NAME TITLE CONSISTENCY — personal title references use the frozen public name.
for(const file of htmlFiles){
  const html=fs.readFileSync(file,'utf8');
  const route=routeFor(file);
  const robots=((html.match(/<meta\b[^>]*name=["']robots["'][^>]*>/i)||[''])[0]);
  const rc=getAttr(robots,'content')||'';
  if(/\bnoindex\b/i.test(rc)) continue;
  const title=strip((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)||[])[1]||'');
  if(title.includes('دکتر جواد رضازاده') && !title.includes('دکتر جواد رضازاده یزدلی')){
    failures.push(route+': Persian personal title uses shortened public name');
  }
}
if(failures.length){
  console.error('\nEntity-title consistency failures ('+failures.length+')');
  failures.forEach(x=>console.error('✗ '+x));
  process.exit(1);
}


// JHELA ENTITY NAME CONSISTENCY — freeze the public journal title used across journal pages.
const jhelaWrongVariants=[
  'Journal of Human-centred Education & Language Advancement',
  'Journal of Human-Centred Education & Language Advancement',
  'Journal of Human-Centred Education, Language and Assessment'
];
for(const file of htmlFiles){
  const route=routeFor(file);
  if(!route.startsWith('/journal/')) continue;
  const html=fs.readFileSync(file,'utf8');
  for(const wrong of jhelaWrongVariants){
    if(html.includes(wrong)) failures.push(route+': inconsistent JHELA title variant: '+wrong);
  }
}
if(failures.length){
  console.error('\nJHELA entity-name failures ('+failures.length+')');
  failures.forEach(x=>console.error('✗ '+x));
  process.exit(1);
}


// HIGH-STAKES GUIDANCE TRUST METADATA — visible authorship/review date, not schema-only.
const highStakesGuidanceRoutes=new Set([
  '/fa/rahnamaha/che-reshteyi-baraye-man-monaseb-ast/',
  '/fa/rahnamaha/moshavere-tahsili-baraye-tasmim/',
  '/fa/akhbar/entekhab-reshteh-1405/'
]);
for(const file of htmlFiles){
  const route=routeFor(file);
  if(!highStakesGuidanceRoutes.has(route)) continue;
  const html=fs.readFileSync(file,'utf8');
  if(!/class=["'][^"']*article-meta/i.test(html)) failures.push(route+': high-stakes guidance missing visible article trust metadata');
  if(!html.includes('دکتر جواد رضازاده یزدلی')) failures.push(route+': high-stakes guidance missing full visible author name');
  if(!html.includes('آخرین بازبینی محتوایی')) failures.push(route+': high-stakes guidance missing visible last-reviewed label');
}
if(failures.length){
  console.error('\nHigh-stakes guidance trust failures ('+failures.length+')');
  failures.forEach(x=>console.error('✗ '+x));
  process.exit(1);
}


// RCAS-O1 OBSERVER GUARDRAIL — descriptive O evidence only, never public/scored by accident.
{
  const observerPath=path.join(root,'fa','assessments','golden-talent','observer','index.html');
  const definitionPath=path.join(root,'platform','golden-talent-instruments.json');
  if(!fs.existsSync(observerPath)) failures.push('/fa/assessments/golden-talent/observer/: RCAS-O1 page missing');
  else{
    const html=fs.readFileSync(observerPath,'utf8');
    const robots=((html.match(/<meta\b[^>]*name=["']robots["'][^>]*>/i)||[''])[0]);
    const rc=getAttr(robots,'content')||'';
    if(!/\bnoindex\b/i.test(rc)) failures.push('/fa/assessments/golden-talent/observer/: RCAS-O1 must remain NOINDEX');
    if(!html.includes('RCAS-O1')) failures.push('/fa/assessments/golden-talent/observer/: RCAS-O1 identifier missing');
    if(!html.includes('O · Observation Evidence')) failures.push('/fa/assessments/golden-talent/observer/: O evidence identity missing');
  }
  if(!fs.existsSync(definitionPath)) failures.push('/platform/golden-talent-instruments.json: instrument registry missing');
  else{
    const def=JSON.parse(fs.readFileSync(definitionPath,'utf8'));
    if(def.instrument_id!=='RCAS-O1') failures.push('/platform/golden-talent-instruments.json: wrong observer instrument id');
    if(def.evidence_code!=='O') failures.push('/platform/golden-talent-instruments.json: RCAS-O1 must be O-source evidence');
    if(def.scoring?.enabled!==false || def.scoring?.total_score!==false) failures.push('/platform/golden-talent-instruments.json: RCAS-O1 scoring must remain disabled');
    const roles=def.production_mapping?.assessment_session_respondent_roles||{};
    if(roles.PARENT!=='PARENT'||roles.TEACHER!=='TEACHER') failures.push('/platform/golden-talent-instruments.json: verified parent/teacher production mappings missing');
  }
}
if(failures.length){
  console.error('\nRCAS-O1 observer failures ('+failures.length+')');
  failures.forEach(x=>console.error('✗ '+x));
  process.exit(1);
}


// PRIVATE RECORD EVIDENCE GUARDRAIL — R evidence is private and no upload before secure storage.
{
  const p=path.join(root,'fa','app','student','records','index.html');
  if(!fs.existsSync(p)) failures.push('/fa/app/student/records/: R evidence workspace missing');
  else{
    const html=fs.readFileSync(p,'utf8');
    const robots=((html.match(/<meta\b[^>]*name=["']robots["'][^>]*>/i)||[''])[0]);
    const rc=getAttr(robots,'content')||'';
    if(!/\bnoindex\b/i.test(rc)) failures.push('/fa/app/student/records/: private record workspace must remain NOINDEX');
    if(/<input\b[^>]*type=["']file["']/i.test(html)) failures.push('/fa/app/student/records/: real file input must remain disabled until secure private storage is live');
    if(!html.includes('R · Record / History Evidence')) failures.push('/fa/app/student/records/: R evidence identity missing');
  }
}
if(failures.length){
  console.error('\nPrivate record evidence failures ('+failures.length+')');
  failures.forEach(x=>console.error('✗ '+x));
  process.exit(1);
}


// GT-011 CONTEXT EVIDENCE GUARDRAIL — private R/C evidence with E7; never scored/indexed.
{
 const p=path.join(root,'fa','app','student','context','index.html');
 if(!fs.existsSync(p)) failures.push('/fa/app/student/context/: GT-011 context intake missing');
 else{
  const html=fs.readFileSync(p,'utf8');
  const robots=((html.match(/<meta\b[^>]*name=["']robots["'][^>]*>/i)||[''])[0]);
  if(!/\bnoindex\b/i.test(getAttr(robots,'content')||'')) failures.push('/fa/app/student/context/: context evidence must remain NOINDEX');
  for(const required of ['RCAS-E7','مانع واقعی','شاهد','نوع مانع','بخش قابل‌کنترل','حمایت موردنیاز','مسئول اقدام','زمان بازبینی']){
   if(!html.includes(required)) failures.push('/fa/app/student/context/: missing E7 field '+required);
  }
 }
}
if(failures.length){
 console.error('\nGT-011 context evidence failures ('+failures.length+')');
 failures.forEach(x=>console.error('✗ '+x));
 process.exit(1);
}

// INTEGRATED PROFILE GUARDRAIL — evidence states, not total-score theatre.
{
 const p=path.join(root,'fa','app','student','integrated-profile','index.html');
 if(!fs.existsSync(p)) failures.push('/fa/app/student/integrated-profile/: integrated profile missing');
 else{
  const html=fs.readFileSync(p,'utf8');
  const robots=((html.match(/<meta\b[^>]*name=["']robots["'][^>]*>/i)||[''])[0]);
  if(!/\bnoindex\b/i.test(getAttr(robots,'content')||'')) failures.push('/fa/app/student/integrated-profile/: integrated profile must remain NOINDEX');
  for(const required of ['همسو','متناقض','تک‌منبعی','ناکافی','S/P/R/O/C/T']){
   if(!html.includes(required)) failures.push('/fa/app/student/integrated-profile/: missing evidence-profile concept '+required);
  }
  if(/(?:نمره|امتیاز)\s*(?:کل)?\s*(?:استعداد)?\s*[:=]\s*\d/i.test(html)) failures.push('/fa/app/student/integrated-profile/: total talent score pattern detected');
 }
}
if(failures.length){
 console.error('\nIntegrated profile failures ('+failures.length+')');
 failures.forEach(x=>console.error('✗ '+x));
 process.exit(1);
}


// GENERATED NAVIGATION ROUTES — validate local routes emitted by site.js
const siteJsPath=path.join(root,'assets','js','site.js');
if(fs.existsSync(siteJsPath)){
  const js=fs.readFileSync(siteJsPath,'utf8');
  const routes=[...js.matchAll(/u\('([^']+)'\)/g)].map(m=>m[1]).filter(Boolean);
  for(const rel of new Set(routes)){
    if(/^(?:https?:|mailto:|tel:|#)/i.test(rel)) continue;
    let target=path.join(root,rel);
    if(fs.existsSync(target) && fs.statSync(target).isDirectory()) target=path.join(target,'index.html');
    else if(!path.extname(target)) target=path.join(target,'index.html');
    if(!fs.existsSync(target)) failures.push('/assets/js/site.js: generated navigation route missing '+rel);
  }
}

// ACCESSIBILITY BASELINE — source-level checks for public HTML.
for(const file of htmlFiles){
  const html=fs.readFileSync(file,'utf8');
  const route=routeFor(file);
  if(!/<main\b/i.test(html)) warnings.push(route+': missing main landmark');
  for(const a of html.match(/<a\b[^>]*>[\s\S]*?<\/a>/gi)||[]){
    const isOfficialEnamadSeal=/trustseal\.enamad\.ir\/\?id=8075712&Code=sealMJydDpzqNid1Ty82Y90Ef6SZLah1/i.test(a);
    if(isOfficialEnamadSeal) continue; // Official provider snippet must remain unmodified.
    const text=strip(a);
    const aria=getAttr(a.match(/<a\b[^>]*>/i)?.[0]||'','aria-label');
    if(!text && !aria) failures.push(route+': link has no accessible name');
  }
  for(const b of html.match(/<button\b[^>]*>[\s\S]*?<\/button>/gi)||[]){
    const open=(b.match(/<button\b[^>]*>/i)||[''])[0];
    const text=strip(b),aria=getAttr(open,'aria-label');
    if(!text && !aria) failures.push(route+': button has no accessible name');
  }
}
if(failures.length){
  console.error('\nNavigation/accessibility failures ('+failures.length+')');
  failures.forEach(x=>console.error('✗ '+x));
  process.exit(1);
}


// 404 RELEASE RULE
const error404=path.join(root,'404.html');
if(!fs.existsSync(error404)) failures.push('/404.html: custom 404 page missing');
else{
  const html=fs.readFileSync(error404,'utf8');
  const robots=((html.match(/<meta\b[^>]*name=["']robots["'][^>]*>/i)||[''])[0]);
  const rc=getAttr(robots,'content')||'';
  if(!/\bnoindex\b/i.test(rc)) failures.push('/404.html: custom error page must be noindex');
}
if(failures.length){
  console.error('\n404 release failures ('+failures.length+')');
  failures.forEach(x=>console.error('✗ '+x));
  process.exit(1);
}


// SOCIAL + STRUCTURED DATA RELEASE GATE
for(const file of htmlFiles){
  const html=fs.readFileSync(file,'utf8');
  const route=routeFor(file);
  const robots=((html.match(/<meta\b[^>]*name=["']robots["'][^>]*>/i)||[''])[0]);
  const rc=getAttr(robots,'content')||'';
  if(/\bnoindex\b/i.test(rc)) continue;

  const canonicalTag=(html.match(/<link\b[^>]*rel=["']canonical["'][^>]*>/i)||[''])[0];
  const canonical=getAttr(canonicalTag,'href');

  const ogUrlTag=(html.match(/<meta\b[^>]*property=["']og:url["'][^>]*>/i)||[''])[0];
  const ogUrl=getAttr(ogUrlTag,'content');
  if(!ogUrl) failures.push(route+': indexable page missing og:url');
  else if(canonical && ogUrl!==canonical) failures.push(route+': og:url must match canonical');

  if(!/<meta\b[^>]*property=["']og:image["'][^>]*>/i.test(html)) failures.push(route+': indexable page missing og:image');
  if(!/<meta\b[^>]*name=["']twitter:card["'][^>]*>/i.test(html)) failures.push(route+': indexable page missing twitter:card');
  if(!/<script\b[^>]*type=["']application\/ld\+json["']/i.test(html)) failures.push(route+': indexable page missing JSON-LD structured data');

  if(/"@type"\s*:\s*"NewsArticle"/.test(html)){
    if(!/"datePublished"\s*:/.test(html)) failures.push(route+': NewsArticle missing datePublished');
    if(!/"author"\s*:/.test(html)) failures.push(route+': NewsArticle missing author');
    if(!/"mainEntityOfPage"\s*:/.test(html)) failures.push(route+': NewsArticle missing mainEntityOfPage');
  }
}
if(failures.length){
  console.error('\nSocial/structured-data failures ('+failures.length+')');
  failures.forEach(x=>console.error('✗ '+x));
  process.exit(1);
}


// FORM ACCESSIBILITY RELEASE GATE
for(const file of htmlFiles){
  const html=fs.readFileSync(file,'utf8');
  const route=routeFor(file);
  for(const m of html.matchAll(/<(input|select|textarea)\b[^>]*>/gi)){
    const tag=m[0],kind=m[1].toLowerCase();
    if(kind==='input' && /\btype=["'](?:hidden|submit|button|reset|checkbox|radio)["']/i.test(tag)) continue;
    const id=getAttr(tag,'id');
    const aria=getAttr(tag,'aria-label')||getAttr(tag,'aria-labelledby');
    const before=html.slice(0,m.index);
    const lastOpen=before.lastIndexOf('<label');
    const lastClose=before.lastIndexOf('</label>');
    const nested=lastOpen>lastClose;
    const linked=id ? (html.includes('for="'+id+'"') || html.includes("for='"+id+"'")) : false;
    if(!nested && !linked && !aria) failures.push(route+': form control missing accessible label: '+tag.slice(0,120));
  }
}
if(failures.length){
  console.error('\nForm accessibility failures ('+failures.length+')');
  failures.forEach(x=>console.error('✗ '+x));
  process.exit(1);
}


// REQUIRED BILINGUAL PAIRS — genuine equivalents only.
const requiredPairs=[
  ['/en/about/','/fa/darbare-man/'],
  ['/en/research/','/fa/pajouhesh/'],
  ['/en/publications/','/fa/entesharat-elmi/'],
  ['/en/books/','/fa/ketab-ha/'],
  ['/en/teaching/','/fa/tadris/'],
  ['/en/academic-engagements/','/fa/faaliat-haye-elmi/'],
  ['/en/golden-talent/','/fa/golden-talent/'],
  ['/en/golden-talent/methodology/','/fa/golden-talent/ravesh-shenasi/'],
  ['/en/educational-philosophy/','/fa/falsafe-amoozeshi/'],
  ['/en/language-education/','/fa/amoozesh-zaban/'],
  ['/en/contact/','/fa/tamas/'],
  ['/en/services/','/fa/khadamat/']
];
const canonicalForRoute=route=>sitePrefix+route;
for(const [enRoute,faRoute] of requiredPairs){
  const enDoc=localDocs.get(canonicalForRoute(enRoute));
  const faDoc=localDocs.get(canonicalForRoute(faRoute));
  if(!enDoc){failures.push(enRoute+': required bilingual English page missing/indexability mismatch');continue;}
  if(!faDoc){failures.push(faRoute+': required bilingual Persian page missing/indexability mismatch');continue;}
  const enHasFa=enDoc.alternates.some(x=>x.hreflang==='fa'&&x.href===canonicalForRoute(faRoute));
  const faHasEn=faDoc.alternates.some(x=>x.hreflang==='en'&&x.href===canonicalForRoute(enRoute));
  const enSelf=enDoc.alternates.some(x=>x.hreflang==='en'&&x.href===canonicalForRoute(enRoute));
  const faSelf=faDoc.alternates.some(x=>x.hreflang==='fa'&&x.href===canonicalForRoute(faRoute));
  if(!enHasFa||!faHasEn||!enSelf||!faSelf) failures.push(enRoute+' ↔ '+faRoute+': required hreflang pair/self-reference incomplete');
}
if(failures.length){
  console.error('\nRequired bilingual-pair failures ('+failures.length+')');
  failures.forEach(x=>console.error('✗ '+x));
  process.exit(1);
}


// PRIVATE MOBILE NAV CONTRACT — five stable tabs with role-scoped destinations.
{
  const navPath=path.join(root,'platform','mobile-navigation-contract.json');
  if(!fs.existsSync(navPath)) failures.push('/platform/mobile-navigation-contract.json: missing private mobile navigation contract');
  else{
    const nav=JSON.parse(fs.readFileSync(navPath,'utf8'));
    if(JSON.stringify(nav.stable_tabs)!==JSON.stringify(['HOME','DISCOVER','TESTS','MY_PATH','ACCOUNT'])) failures.push('/platform/mobile-navigation-contract.json: stable five-tab contract drift');
    for(const [key,cfg] of Object.entries(nav.routes||{})){
      const tabs=cfg.tabs||{};
      if(Object.keys(tabs).length!==5) failures.push('/platform/mobile-navigation-contract.json: '+key+' must define five tabs');
      for(const [tab,raw] of Object.entries(tabs)){
        const route=String(raw).split('?')[0];
        const target=route==='/'?path.join(root,'index.html'):path.join(root,route,'index.html');
        if(!fs.existsSync(target)) failures.push('/platform/mobile-navigation-contract.json: '+key+' '+tab+' target missing '+route);
        if(tab!=='DISCOVER'){
          const html=fs.existsSync(target)?fs.readFileSync(target,'utf8'):'';
          const robots=((html.match(/<meta\b[^>]*name=["']robots["'][^>]*>/i)||[''])[0]);
          const rc=getAttr(robots,'content')||'';
          if(!/\bnoindex\b/i.test(rc)&&!route.startsWith('/fa/golden-talent/')&&!route.startsWith('/en/golden-talent/')) failures.push('/platform/mobile-navigation-contract.json: private tab target must remain noindex '+route);
        }
      }
    }
    const js=fs.readFileSync(path.join(root,'assets','js','site.js'),'utf8');
    for(const token of ['/fa/app/valed/my-path/','/fa/app/moallem/my-path/','/fa/app/moshaver/my-path/','/en/golden-talent/roles/parent/my-path/','/en/golden-talent/roles/teacher/my-path/','/en/golden-talent/roles/adviser/my-path/']){
      if(!js.includes(token.slice(1))) failures.push('/assets/js/site.js: role-aware mobile path missing '+token);
    }
  }
}
if(failures.length){
  console.error('\nPrivate mobile navigation failures ('+failures.length+')');
  failures.forEach(x=>console.error('✗ '+x));
  process.exit(1);
}


// MOBILE UX RELEASE GATE
const cssFile=path.join(root,'assets','css','style.css');
if(fs.existsSync(cssFile)){
  const css=fs.readFileSync(cssFile,'utf8');
  const requiredMobileRules=[
    ['root width containment','html,body{width:100%;max-width:100%}'],
    ['grid/flex child containment','min-width:0'],
    ['responsive media','img,svg,video,canvas,iframe{max-width:100%;height:auto}'],
    ['iOS focus zoom prevention','input,select,textarea{font-size:16px}'],
    ['dynamic viewport support','100dvh']
  ];
  for(const [label,needle] of requiredMobileRules){
    if(!css.includes(needle)) failures.push('/assets/css/style.css: missing '+label);
  }
}
for(const file of htmlFiles){
  const html=fs.readFileSync(file,'utf8');
  const route=routeFor(file);
  if(!/<meta\b[^>]*name=["']viewport["'][^>]*content=["'][^"']*width=device-width/i.test(html)){
    failures.push(route+': missing mobile viewport metadata');
  }
  if(/style=["'][^"']*(?:min-width\s*:\s*[4-9]\d{2}px|white-space\s*:\s*nowrap)/i.test(html)){
    failures.push(route+': risky inline mobile overflow rule');
  }
}
if(failures.length){
  console.error('\nMobile UX failures ('+failures.length+')');
  failures.forEach(x=>console.error('✗ '+x));
  process.exit(1);
}


// REVENUE CONVERSION SAFETY — high-intent routes need a real but privacy-safe lead path.
{
  const requiredLeadRoutes=[
    ['fa/moshavere-tahsili/index.html','../darkhast-moshavere/'],
    ['fa/entekhab-reshteh/index.html','../darkhast-moshavere/'],
    ['fa/moshavere-konkur/index.html','../darkhast-moshavere/'],
    ['fa/estedaadyabi/index.html','../darkhast-moshavere/'],
    ['en/student-guidance/index.html','../request-consultation/'],
    ['en/services/index.html','../request-consultation/'],
    ['en/golden-talent/index.html','../request-consultation/']
  ];
  for(const [rel,target] of requiredLeadRoutes){
    const p=path.join(root,rel);
    if(!fs.existsSync(p)){failures.push('/'+rel+': high-intent conversion page missing');continue;}
    const html=fs.readFileSync(p,'utf8');
    if(!html.includes(target)) failures.push('/'+rel+': privacy-safe consultation path missing');
  }
  for(const rel of ['fa/darkhast-moshavere/index.html','en/request-consultation/index.html']){
    const p=path.join(root,rel);
    if(!fs.existsSync(p)){failures.push('/'+rel+': consultation gateway missing');continue;}
    const html=fs.readFileSync(p,'utf8');
    const robots=((html.match(/<meta\b[^>]*name=["']robots["'][^>]*>/i)||[''])[0]);
    const rc=getAttr(robots,'content')||'';
    if(!/\bnoindex\b/i.test(rc)) failures.push('/'+rel+': consultation gateway must remain noindex');
    if(!/mailto:dr\.rezazadeh65@gmail\.com/i.test(html)) failures.push('/'+rel+': interim safe email lead fallback missing');
  }
  const conversionContract=path.join(root,'platform','conversion-event-contract.json');
  if(!fs.existsSync(conversionContract)) failures.push('/platform/conversion-event-contract.json: conversion privacy contract missing');
  else{
    const c=JSON.parse(fs.readFileSync(conversionContract,'utf8'));
    if(c.transport!=='NO_NETWORK_BY_DEFAULT'||c.rules?.no_raw_form_values!==true||c.rules?.no_sensitive_student_data!==true) failures.push('/platform/conversion-event-contract.json: privacy-safe conversion defaults drift');
  }
}
if(failures.length){
  console.error('\nRevenue conversion safety failures ('+failures.length+')');
  failures.forEach(x=>console.error('✗ '+x));
  process.exit(1);
}


// PUBLIC SEARCH GOVERNANCE — search index must contain public/indexable pages only.
const searchGovernanceIndexPath=path.join(root,'assets','search-index.json');
if(!fs.existsSync(searchGovernanceIndexPath)){
  failures.push('/assets/search-index.json: public search index missing');
}else{
  let items=[];
  try{items=JSON.parse(fs.readFileSync(searchGovernanceIndexPath,'utf8'));}catch(e){failures.push('/assets/search-index.json: invalid JSON');}
  const seen=new Set();
  for(const item of Array.isArray(items)?items:[]){
    if(!item||!item.path||!item.lang){failures.push('/assets/search-index.json: entry missing path/lang');continue;}
    if(seen.has(item.path)) failures.push('/assets/search-index.json: duplicate path '+item.path);
    seen.add(item.path);
    const file=path.join(root,item.path,'index.html');
    if(!fs.existsSync(file)){failures.push('/assets/search-index.json: missing target '+item.path);continue;}
    const html=fs.readFileSync(file,'utf8');
    const htmlTag=(html.match(/<html\b[^>]*>/i)||[''])[0];
    const lang=getAttr(htmlTag,'lang')||'';
    const robots=((html.match(/<meta\b[^>]*name=["']robots["'][^>]*>/i)||[''])[0]);
    const rc=getAttr(robots,'content')||'';
    if(/\bnoindex\b/i.test(rc)) failures.push('/assets/search-index.json: private/noindex target '+item.path);
    if(lang && lang!==item.lang) failures.push('/assets/search-index.json: language mismatch '+item.path+' index='+item.lang+' html='+lang);
  }
}
if(failures.length){
  console.error('\nPublic-search governance failures ('+failures.length+')');
  failures.forEach(x=>console.error('✗ '+x));
  process.exit(1);
}


// HORIZONTAL OVERFLOW REGRESSION GATE v2
const layoutCssFile=path.join(root,'assets','css','style.css');
if(fs.existsSync(layoutCssFile)){
  const css=fs.readFileSync(layoutCssFile,'utf8');
  if(/\.skip\s*\{[^}]*left\s*:\s*-\d{3,}px/i.test(css)){
    failures.push('/assets/css/style.css: skip link must not be positioned thousands of pixels off-screen');
  }
  if(/\.rcas-privacy\s+strong\s*\{[^}]*white-space\s*:\s*nowrap/i.test(css) &&
     !/@media\(max-width:800px\)[\s\S]*?\.rcas-privacy\s+strong\s*\{[^}]*white-space\s*:\s*normal/i.test(css)){
    failures.push('/assets/css/style.css: RCAS privacy label nowrap lacks mobile override');
  }
  if(/html,body\{[^}]*overflow-x\s*:\s*(?:hidden|clip)/i.test(css)){
    failures.push('/assets/css/style.css: root horizontal clipping is a prohibited overflow band-aid');
  }
  if(/100d?vw\s*-\s*16px/i.test(css)) failures.push('/assets/css/style.css: fixed mobile UI must not rely on viewport-width subtraction');
  if(!/\.pwa-install\{[^}]*left:8px!important;[^}]*right:8px!important;[^}]*transform:none!important/i.test(css)) failures.push('/assets/css/style.css: narrow PWA prompt must be inset without horizontal transform');
  if(!/\.network-status\{[^}]*left:8px!important;[^}]*right:8px!important;[^}]*transform:translateY\(-140%\)/i.test(css)) failures.push('/assets/css/style.css: narrow network status must use vertical-only transform');
  if(!/\.site-header\{[^}]*padding-inline:max\(20px,calc\(\(100% - var\(--max\)\)\/2\)\)/i.test(css)){
    failures.push('/assets/css/style.css: site header must avoid viewport-width based horizontal sizing');
  }
}
if(failures.length){
  console.error('\nHorizontal overflow failures ('+failures.length+')');
  failures.forEach(x=>console.error('✗ '+x));
  process.exit(1);
}


// ONBOARDING LIFECYCLE GUARDRAILS — role/relationship/consent gates must remain explicit.
const onboardingPath=path.join(root,'platform','onboarding-state-machine.json');
if(!fs.existsSync(onboardingPath)) failures.push('/platform/onboarding-state-machine.json: missing onboarding state machine');
else{
  try{
    const model=JSON.parse(fs.readFileSync(onboardingPath,'utf8'));
    const states=new Set((model.states||[]).map(x=>x.key));
    for(const state of ['AUTHENTICATED','ROLE_PENDING','CONSENT_PENDING','READY']){
      if(!states.has(state)) failures.push('/platform/onboarding-state-machine.json: missing lifecycle state '+state);
    }
    const transitions=(model.transition_rules||[]).join('\n');
    if(!transitions.includes('ROLE_PENDING -> CONSENT_PENDING only after server-side role/relationship verification')){
      failures.push('/platform/onboarding-state-machine.json: relationship verification must remain server-side before consent readiness');
    }
    if(!transitions.includes('CONSENT_PENDING -> READY only after required service/privacy decisions are recorded')){
      failures.push('/platform/onboarding-state-machine.json: required consent/privacy decisions must gate READY');
    }
    const invariants=(model.invariant_rules||[]).join('\n');
    if(!invariants.includes('Browser state never grants a role')) failures.push('/platform/onboarding-state-machine.json: browser role-grant prohibition missing');
    if(!invariants.includes('Browser redirect never grants a paid entitlement')) failures.push('/platform/onboarding-state-machine.json: browser entitlement-grant prohibition missing');
  }catch(e){ failures.push('/platform/onboarding-state-machine.json: invalid JSON'); }
}
for(const rel of ['fa/app/account/setup/index.html','en/account/setup/index.html']){
  const file=path.join(root,rel);
  if(!fs.existsSync(file)){ failures.push('/'+rel+': missing onboarding page'); continue; }
  const html=fs.readFileSync(file,'utf8');
  if(!html.includes('../relationships/')) failures.push('/'+rel+': onboarding must link relationship verification');
  if(!html.includes('../consents/')) failures.push('/'+rel+': onboarding must link consent center');
}
if(failures.length){
  console.error('\nOnboarding lifecycle failures ('+failures.length+')');
  failures.forEach(x=>console.error('✗ '+x));
  process.exit(1);
}


// PAYMENT LIFECYCLE GUARDRAILS — client return can never create payment truth or entitlement.
const paymentStatePath=path.join(root,'platform','payment-state-machine.json');
const paymentPolicyPath=path.join(root,'platform','payment-provider-policy.json');
if(!fs.existsSync(paymentStatePath)) failures.push('/platform/payment-state-machine.json: missing payment lifecycle');
else{
  try{
    const model=JSON.parse(fs.readFileSync(paymentStatePath,'utf8'));
    const states=new Set((model.states||[]).map(x=>x.key));
    for(const state of ['AWAITING_PAYMENT','VERIFICATION_PENDING','PAYMENT_VERIFIED','FULFILLING','COMPLETED']){
      if(!states.has(state)) failures.push('/platform/payment-state-machine.json: missing payment state '+state);
    }
    const transitions=(model.transition_rules||[]).join('\n');
    if(!transitions.includes('VERIFICATION_PENDING -> PAYMENT_VERIFIED only after server independently verifies provider authenticity, reference, amount, currency and final payment status')){
      failures.push('/platform/payment-state-machine.json: server verification gate missing');
    }
    if(!transitions.includes('PAYMENT_VERIFIED -> FULFILLING only from persisted verified payment state')){
      failures.push('/platform/payment-state-machine.json: fulfillment must originate from persisted verified payment');
    }
    const invariants=(model.invariant_rules||[]).join('\n');
    for(const rule of [
      'Browser redirect, query string, local storage and client JavaScript never establish payment truth',
      'Entitlement can be granted only from persisted PAYMENT_VERIFIED state',
      'Provider secrets and webhook secrets never enter Git or browser code'
    ]) if(!invariants.includes(rule)) failures.push('/platform/payment-state-machine.json: missing invariant '+rule);
  }catch(e){ failures.push('/platform/payment-state-machine.json: invalid JSON'); }
}
if(!fs.existsSync(paymentPolicyPath)) failures.push('/platform/payment-provider-policy.json: missing provider policy');
else{
  try{
    const policy=JSON.parse(fs.readFileSync(paymentPolicyPath,'utf8'));
    if(policy.selection_rule!=='SERVER_SIDE_ONLY') failures.push('/platform/payment-provider-policy.json: provider selection must be SERVER_SIDE_ONLY');
    if(policy.checkout_contract?.payment_truth!=='server_verified_callback_or_webhook_only') failures.push('/platform/payment-provider-policy.json: payment truth must require verified callback/webhook');
    for(const market of ['IR','INTERNATIONAL']){
      if(policy.markets?.[market]?.enabled!==false) warnings.push('/platform/payment-provider-policy.json: '+market+' provider is enabled; confirm production credentials/KYB before release');
    }
  }catch(e){ failures.push('/platform/payment-provider-policy.json: invalid JSON'); }
}
if(failures.length){
  console.error('\nPayment lifecycle failures ('+failures.length+')');
  failures.forEach(x=>console.error('✗ '+x));
  process.exit(1);
}


// GOLDEN TALENT ENGINE GUARDRAILS — evidence-led, auditable, no fabricated total score.
const gtPolicyPath=path.join(root,'platform','golden-talent-engine-policy.json');
const gtMigrationPath=path.join(root,'platform','db','migrations','012_golden_talent_engine.sql');
if(!fs.existsSync(gtPolicyPath)) failures.push('/platform/golden-talent-engine-policy.json: missing engine policy');
else{
  try{
    const p=JSON.parse(fs.readFileSync(gtPolicyPath,'utf8'));
    if(p.status!=='PREVALIDATION') failures.push('/platform/golden-talent-engine-policy.json: engine must remain PREVALIDATION until empirical validation');
    if(p.routing_policy?.total_score!==false) failures.push('/platform/golden-talent-engine-policy.json: total talent score must remain disabled');
    if(p.routing_policy?.normative_cut_score!==false) failures.push('/platform/golden-talent-engine-policy.json: normative cut score must remain disabled');
    if(p.routing_policy?.automatic_gifted_label!==false) failures.push('/platform/golden-talent-engine-policy.json: automatic gifted label prohibited');
    if(p.routing_policy?.missing_evidence_is_not_negative_evidence!==true) failures.push('/platform/golden-talent-engine-policy.json: missing evidence cannot be treated as negative evidence');
    if(p.routing_policy?.discrepancy_triggers_review!==true) failures.push('/platform/golden-talent-engine-policy.json: discrepancy must trigger review');
    if(p.release_gate?.empirical_validation_required_before_norms_or_cut_scores!==true) failures.push('/platform/golden-talent-engine-policy.json: empirical validation release gate missing');
  }catch(e){failures.push('/platform/golden-talent-engine-policy.json: invalid JSON');}
}
if(!fs.existsSync(gtMigrationPath)) failures.push('/platform/db/migrations/012_golden_talent_engine.sql: missing engine schema');
else{
  const sql=fs.readFileSync(gtMigrationPath,'utf8');
  for(const table of ['talent_evidence_event','talent_route_run','talent_route_evidence','talent_route_evidence_link','talent_engine_review']){
    if(!sql.includes('CREATE TABLE IF NOT EXISTS '+table)) failures.push('/platform/db/migrations/012_golden_talent_engine.sql: missing '+table);
  }
}
if(failures.length){
  console.error('\nGolden Talent engine failures ('+failures.length+')');
  failures.forEach(x=>console.error('✗ '+x));
  process.exit(1);
}

// Golden Path must remain human-review gated.
for(const p of ['platform/golden-talent-review.mjs','platform/rcas-observer-evidence-bridge.mjs']){
 if(!fs.existsSync(path.join(root,p))) failures.push('/'+p+': missing Golden Talent review component');
}
const reviewSource=fs.readFileSync(path.join(root,'platform','golden-talent-review.mjs'),'utf8');
if(!reviewSource.includes('requires_human_approval:true')) failures.push('/platform/golden-talent-review.mjs: human approval invariant missing');
if(!reviewSource.includes("evidence_state==='DISCREPANT'")) failures.push('/platform/golden-talent-review.mjs: discrepancy gate missing');

// Golden Path synthesis and BAHAR handoff guardrails.
const gpPath=path.join(root,'platform','golden-path-synthesis.mjs');
if(!fs.existsSync(gpPath)) failures.push('/platform/golden-path-synthesis.mjs: missing synthesis engine');
else{
 const gp=fs.readFileSync(gpPath,'utf8');
 for(const invariant of ["review_accepted!==true","evidence_state==='DISCREPANT'","total_score:null","automatic_career_prescription:null","requires_human_goal_setting:true"]){
  if(!gp.includes(invariant)) failures.push('/platform/golden-path-synthesis.mjs: missing invariant '+invariant);
 }
}

// BAHAR longitudinal engine guardrails.
const baharPath=path.join(root,'platform','bahar-engine.mjs');
if(!fs.existsSync(baharPath)) failures.push('/platform/bahar-engine.mjs: missing longitudinal engine');
else{
 const b=fs.readFileSync(baharPath,'utf8');
 for(const invariant of ['automatic_golden_path_update:false','requires_new_route_run:true','requires_human_review:true','automatic_release:false']){
  if(!b.includes(invariant)) failures.push('/platform/bahar-engine.mjs: missing invariant '+invariant);
 }
 for(const decision of ['CONTINUE','CHANGE','PAUSE','STOP','INVESTIGATE']){
  if(!b.includes(decision)) failures.push('/platform/bahar-engine.mjs: missing review decision '+decision);
 }
}

// Golden Talent D1-D6 deep-module contract guardrails.
const dmPath=path.join(root,'platform','golden-talent-deep-modules.json');
const dmEnginePath=path.join(root,'platform','golden-talent-deep-module-engine.mjs');
if(!fs.existsSync(dmPath)||!fs.existsSync(dmEnginePath)) failures.push('/platform: missing D1-D6 deep-module engine files');
else{
 const dm=JSON.parse(fs.readFileSync(dmPath,'utf8'));
 for(const d of ['D1','D2','D3','D4','D5','D6']) if(!dm.modules?.[d]) failures.push('/platform/golden-talent-deep-modules.json: missing '+d);
 if(dm.total_score!==false||dm.normative_cut_score!==false) failures.push('/platform/golden-talent-deep-modules.json: score/cut-score prohibition missing');
 const src=fs.readFileSync(dmEnginePath,'utf8');
 for(const invariant of ["quality_state:'UNREVIEWED'","direction:'CONTEXTUALISES'","total_score:null","normative_label:null","entitlement_verified"]){
  if(!src.includes(invariant)) failures.push('/platform/golden-talent-deep-module-engine.mjs: missing invariant '+invariant);
 }
}

// Golden Talent orchestration/idempotency guardrails.
for(const p of ['platform/golden-talent-orchestrator.mjs','platform/golden-talent-orchestration-policy.json']){
 if(!fs.existsSync(path.join(root,p))) failures.push('/'+p+': missing production orchestration component');
}
const orch=fs.readFileSync(path.join(root,'platform','golden-talent-orchestrator.mjs'),'utf8');
for(const invariant of ["response_revision","idempotency_key","client_authoritative:false","history_preserved:true","status:'SUPERSEDED'"]){
 if(!orch.includes(invariant)) failures.push('/platform/golden-talent-orchestrator.mjs: missing invariant '+invariant);
}
const op=JSON.parse(fs.readFileSync(path.join(root,'platform','golden-talent-orchestration-policy.json'),'utf8'));
if(op.server_authoritative!==true||op.idempotency?.duplicate_policy!=='RETURN_EXISTING_RESULT'||op.immutability?.released_route_run!==true) failures.push('/platform/golden-talent-orchestration-policy.json: unsafe orchestration policy');

// Golden Talent deny-by-default authorisation guardrails.
const authPath=path.join(root,'platform','golden-talent-authorization.mjs');
const accessPath=path.join(root,'platform','golden-talent-access-policy.json');
if(!fs.existsSync(authPath)||!fs.existsSync(accessPath)) failures.push('/platform: missing Golden Talent authorization layer');
else{
 const auth=fs.readFileSync(authPath,'utf8');
 for(const invariant of ["DENY_BY_DEFAULT","VISIBILITY_SCOPE_DENIED","ACTIVE_CASE_REVIEW_ASSIGNMENT_REQUIRED","assignment?.scope","consent?.allows===true"]){
  if(!auth.includes(invariant)) failures.push('/platform/golden-talent-authorization.mjs: missing invariant '+invariant);
 }
 const ap=JSON.parse(fs.readFileSync(accessPath,'utf8'));
 if(ap.default!=='DENY'||ap.ui_hiding_is_authorization!==false||ap.rules?.researcher?.direct_identity_access!==false) failures.push('/platform/golden-talent-access-policy.json: unsafe access policy');
}

// Golden Talent privacy lifecycle guardrails.
const gtpPath=path.join(root,'platform','golden-talent-privacy.mjs');
const gtppPath=path.join(root,'platform','golden-talent-privacy-policy.json');
if(!fs.existsSync(gtpPath)||!fs.existsSync(gtppPath)) failures.push('/platform: missing Golden Talent privacy lifecycle');
else{
 const ps=fs.readFileSync(gtpPath,'utf8');
 for(const invariant of ["quality_state:'WITHDRAWN'","withdrawal_propagated:true","direct_identity_removed:true"]){
  if(!ps.includes(invariant)) failures.push('/platform/golden-talent-privacy.mjs: missing invariant '+invariant);
 }
 const pp=JSON.parse(fs.readFileSync(gtppPath,'utf8'));
 if(pp.consent?.versioned!==true||pp.consent?.purpose_specific!==true||pp.consent?.bundling_prohibited!==true||pp.withdrawal?.future_routing_excludes_withdrawn_evidence!==true||pp.retention?.hardcoded_durations!==false) failures.push('/platform/golden-talent-privacy-policy.json: unsafe privacy policy');
}

// Golden Talent audit/observability guardrails.
const auditPath=path.join(root,'platform','golden-talent-audit.mjs');
const obsPath=path.join(root,'platform','golden-talent-observability-policy.json');
if(!fs.existsSync(auditPath)||!fs.existsSync(obsPath)) failures.push('/platform: missing Golden Talent audit/observability layer');
else{
 const a=fs.readFileSync(auditPath,'utf8');
 for(const invariant of ["ACCESS_DENIED","correlation_id","resource_id:null","evidence_value","consultation_notes","token"]){
  if(!a.includes(invariant)) failures.push('/platform/golden-talent-audit.mjs: missing audit invariant '+invariant);
 }
 const o=JSON.parse(fs.readFileSync(obsPath,'utf8'));
 if(o.append_only!==true||o.server_generated!==true||o.sensitive_payload_prohibited!==true||o.client_supplied_audit_event_accepted!==false||o.audit_log_is_not_analytics_dataset!==true) failures.push('/platform/golden-talent-observability-policy.json: unsafe observability policy');
}

// Golden Talent resilience/failure-recovery guardrails.
const recPath=path.join(root,'platform','golden-talent-recovery.mjs');
const resPath=path.join(root,'platform','golden-talent-resilience-policy.json');
if(!fs.existsSync(recPath)||!fs.existsSync(resPath)) failures.push('/platform: missing Golden Talent resilience layer');
else{
 const rec=fs.readFileSync(recPath,'utf8');
 for(const invariant of ['grant_entitlement:false','release_golden_path:false','delete_evidence:false','create_duplicate:false','FAIL_CLOSED_OR_REVERIFY']){
  if(!rec.includes(invariant)) failures.push('/platform/golden-talent-recovery.mjs: missing recovery invariant '+invariant);
 }
 const rp=JSON.parse(fs.readFileSync(resPath,'utf8'));
 if(!rp.principles?.includes('FAIL_CLOSED')||rp.backup_restore?.restore_test_required!==true||rp.production_readiness?.status!=='BLOCKED_UNTIL_BACKEND_INFRASTRUCTURE_AND_RESTORE_DRILL_EXIST') failures.push('/platform/golden-talent-resilience-policy.json: unsafe resilience policy');
}

// Backend deployment/secrets/RLS guardrails.
const bdPath=path.join(root,'platform','backend-deployment-policy.json');
const rlsPath=path.join(root,'platform','db','rls','001_talent_evidence_subject.sql');
const bpPath=path.join(root,'foundation','GOLDEN-TALENT-BACKEND-BLUEPRINT.md');
if(!fs.existsSync(bdPath)||!fs.existsSync(rlsPath)||!fs.existsSync(bpPath)) failures.push('/platform: missing backend deployment or RLS baseline');
else{
 const bd=JSON.parse(fs.readFileSync(bdPath,'utf8'));
 if(bd.rules?.secrets_in_git!==false||bd.rules?.secrets_in_browser_bundle!==false||bd.runtime_superuser_prohibited!==true) failures.push('/platform/backend-deployment-policy.json: unsafe secret/runtime policy');
 const rls=fs.readFileSync(rlsPath,'utf8');
 for(const invariant of ['ENABLE ROW LEVEL SECURITY','FORCE ROW LEVEL SECURITY',"current_setting('app.user_id', true)","source_type = 'STUDENT_SELF'"]){
  if(!rls.includes(invariant)) failures.push('/platform/db/rls/001_talent_evidence_subject.sql: missing RLS invariant '+invariant);
 }
}

// Cross-subject RLS negative-security guardrails.
const rls2Path=path.join(root,'platform','db','rls','002_talent_evidence_relationships.sql');
const negPath=path.join(root,'platform','security-negative-test-matrix.json');
if(!fs.existsSync(rls2Path)||!fs.existsSync(negPath)) failures.push('/platform: missing relationship RLS or negative security matrix');
else{
 const r2=fs.readFileSync(rls2Path,'utf8');
 for(const invariant of ["r.status='ACTIVE'","a.status='ACTIVE'","VIEW_EVIDENCE","c.status IN ('OPEN','FOLLOW_UP')","visibility_scope='PARENT_ALLOWED'","visibility_scope='TEACHER_ALLOWED'"]){
  if(!r2.includes(invariant)) failures.push('/platform/db/rls/002_talent_evidence_relationships.sql: missing scoped RLS invariant '+invariant);
 }
 const nm=JSON.parse(fs.readFileSync(negPath,'utf8'));
 const denyIds=['SELF_OTHER','PARENT_REVOKED','PARENT_OTHER_CHILD','TEACHER_NO_SCOPE','TEACHER_ENDED','CONSULTANT_CLOSED_CASE','CONSULTANT_OTHER_CASE','ANONYMOUS'];
 for(const id of denyIds) if(nm.cases?.find(x=>x.id===id)?.expected!=='DENY') failures.push('/platform/security-negative-test-matrix.json: missing DENY '+id);
}

// Purpose-specific consent persistence/RLS guardrails.
for(const p of ['platform/db/migrations/013_service_consent_decisions.sql','platform/db/rls/003_talent_evidence_consent.sql','platform/consent-withdrawal-orchestrator.mjs']) if(!fs.existsSync(path.join(root,p))) failures.push('/'+p+': missing consent enforcement component');
const cm=fs.readFileSync(path.join(root,'platform','db','migrations','013_service_consent_decisions.sql'),'utf8');
for(const x of ['service_consent_decision','supersedes_id','gt_has_active_consent','ORDER BY d.decided_at DESC']) if(!cm.includes(x)) failures.push('/platform/db/migrations/013_service_consent_decisions.sql: missing '+x);
const cr=fs.readFileSync(path.join(root,'platform','db','rls','003_talent_evidence_consent.sql'),'utf8');
for(const x of ["PARENT_VISIBILITY","TEACHER_OBSERVATION","CONSULTANT_REVIEW","subject_user_id=gt_actor_id()"]) if(!cr.includes(x)) failures.push('/platform/db/rls/003_talent_evidence_consent.sql: missing '+x);
const cw=fs.readFileSync(path.join(root,'platform','consent-withdrawal-orchestrator.mjs'),'utf8');
for(const x of ['append_WITHDRAWN_consent_decision','mark_dependent_evidence_WITHDRAWN','delete_historical_evidence:false','automatically_release_replacement:false']) if(!cw.includes(x)) failures.push('/platform/consent-withdrawal-orchestrator.mjs: missing '+x);

// Explicit Golden Path release guardrails.
const gps=fs.readFileSync(path.join(root,'platform','golden-path-synthesis.mjs'),'utf8');
for(const x of ["release_status:'PENDING_PROFESSIONAL_RELEASE'","release_status:'RELEASED'","requires_professional_release:false","Explicitly released Golden Path required","source_release_id"]){
 if(!gps.includes(x)) failures.push('/platform/golden-path-synthesis.mjs: missing release invariant '+x);
}
const gprPath=path.join(root,'platform','db','migrations','014_golden_path_release.sql');
if(!fs.existsSync(gprPath)) failures.push('/platform/db/migrations/014_golden_path_release.sql: missing explicit release persistence');
else{
 const gpr=fs.readFileSync(gprPath,'utf8');
 for(const x of ['golden_path_release','reviewer_user_id','route_run_id','synthesis_version',"RELEASED','REVOKED','SUPERSEDED"]) if(!gpr.includes(x)) failures.push('/platform/db/migrations/014_golden_path_release.sql: missing '+x);
}

// Golden Path lifecycle and persistence-alignment guardrails.
for(const p of ['platform/golden-path-lifecycle.mjs','platform/db/migrations/015_orchestration_alignment.sql','platform/db/migrations/016_evidence_review_history.sql']) if(!fs.existsSync(path.join(root,p))) failures.push('/'+p+': missing lifecycle persistence component');
const gl=fs.readFileSync(path.join(root,'platform','golden-path-lifecycle.mjs'),'utf8');
for(const x of ['PAUSE_FOR_REASSESSMENT','automatically_release_replacement:false','REASSESSMENT_REQUIRED','Explicit replacement release required','automatic_baseline_replacement:false']) if(!gl.includes(x)) failures.push('/platform/golden-path-lifecycle.mjs: missing '+x);
const oa=fs.readFileSync(path.join(root,'platform','db','migrations','015_orchestration_alignment.sql'),'utf8');
for(const x of ["'ROUTING'","'REVIEW_REQUIRED'",'response_revision','submitted_snapshot','submission_idempotency_key','source_golden_path_release_id','reconciliation_status']) if(!oa.includes(x)) failures.push('/platform/db/migrations/015_orchestration_alignment.sql: missing '+x);
const er=fs.readFileSync(path.join(root,'platform','db','migrations','016_evidence_review_history.sql'),'utf8');
for(const x of ['talent_evidence_review','supersedes_review_id',"ACTIVE','SUPERSEDED','VOID",'reviewer_user_id']) if(!er.includes(x)) failures.push('/platform/db/migrations/016_evidence_review_history.sql: missing '+x);

// Roadmap low-maturity engine guardrails.
for(const p of ['platform/assessment-engine.mjs','platform/assessment-engine-policy.json','platform/consultation-engine.mjs','platform/research-export-engine.mjs']) if(!fs.existsSync(path.join(root,p))) failures.push('/'+p+': missing roadmap engine');
const ae=fs.readFileSync(path.join(root,'platform','assessment-engine.mjs'),'utf8');
for(const x of ['Frozen response snapshot required','Published explicit scoring rules required','Published explicit interpretation rules required']) if(!ae.includes(x)) failures.push('/platform/assessment-engine.mjs: missing '+x);
const ap=JSON.parse(fs.readFileSync(path.join(root,'platform','assessment-engine-policy.json'),'utf8'));
if(ap.golden_talent_scoring_status!=='DISABLED_PENDING_EMPIRICAL_VALIDATION'||!ap.prohibited?.includes('invented_norm')||!ap.prohibited?.includes('automatic_gifted_label')) failures.push('/platform/assessment-engine-policy.json: unsafe Golden Talent scoring policy');
const ce=fs.readFileSync(path.join(root,'platform','consultation-engine.mjs'),'utf8');
for(const x of ['TRIAGED','AWAITING_BOOKING','Verified completed payment required']) if(!ce.includes(x)) failures.push('/platform/consultation-engine.mjs: incomplete consultation workflow');
const re=fs.readFileSync(path.join(root,'platform','research-export-engine.mjs'),'utf8');
for(const x of ['Approved research study required','Frozen dataset required','direct_identity:false','codebook_required:true']) if(!re.includes(x)) failures.push('/platform/research-export-engine.mjs: unsafe research export');

// Assessment/report provenance guardrails.
const arp=path.join(root,'platform','db','migrations','017_assessment_report_provenance.sql');
if(!fs.existsSync(arp)) failures.push('/platform/db/migrations/017_assessment_report_provenance.sql: missing provenance alignment');
else{
 const a=fs.readFileSync(arp,'utf8');
 for(const x of ['frozen_at','response_revision','scoring_version_id','interpretation_version_id','source_response_revision','supersedes_report_id']) if(!a.includes(x)) failures.push('/platform/db/migrations/017_assessment_report_provenance.sql: missing '+x);
}

// Commerce integrity guardrails.
const commercePath=path.join(root,'platform','commerce-engine.mjs');
const commerceMig=path.join(root,'platform','db','migrations','018_commerce_integrity.sql');
if(!fs.existsSync(commercePath)||!fs.existsSync(commerceMig)) failures.push('/platform: missing commerce integrity implementation');
else{
 const ce=fs.readFileSync(commercePath,'utf8');
 for(const x of ['client_amount_ignored:true','Persisted verified matching payment required','REFUND_RECONCILIATION']) if(!ce.includes(x)) failures.push('/platform/commerce-engine.mjs: missing '+x);
 const cm=fs.readFileSync(commerceMig,'utf8');
 for(const x of ['customer_order_idempotency_uq','pricing_snapshot','granted_from_payment_id','refund_idempotency_uq','customer_order_totals_valid']) if(!cm.includes(x)) failures.push('/platform/db/migrations/018_commerce_integrity.sql: missing '+x);
}

// Communication/admin governance guardrails.
for(const p of ['platform/communication-engine.mjs','platform/content-lifecycle.mjs','platform/db/migrations/019_admin_content_governance.sql']) if(!fs.existsSync(path.join(root,p))) failures.push('/'+p+': missing governance implementation');
const comm=fs.readFileSync(path.join(root,'platform','communication-engine.mjs'),'utf8');
for(const x of ['MARKETING_OPT_IN_REQUIRED','marketing_consent_inferred:false','NOT_ACTIVE_PARTICIPANT','sensitive_payload:false']) if(!comm.includes(x)) failures.push('/platform/communication-engine.mjs: missing '+x);
const life=fs.readFileSync(path.join(root,'platform','content-lifecycle.mjs'),'utf8');
for(const x of ['Reviewed revision required','Indexable publication metadata required']) if(!life.includes(x)) failures.push('/platform/content-lifecycle.mjs: missing '+x);
const ag=fs.readFileSync(path.join(root,'platform','db','migrations','019_admin_content_governance.sql'),'utf8');
for(const x of ['admin_audit_event','content_revision','supersedes_revision_id','content_hash']) if(!ag.includes(x)) failures.push('/platform/db/migrations/019_admin_content_governance.sql: missing '+x);

// Identity/session security guardrails.
for(const p of ['platform/identity-security.mjs','platform/db/migrations/020_identity_session_security.sql','platform/db/rls/004_identity_security.sql']) if(!fs.existsSync(path.join(root,p))) failures.push('/'+p+': missing identity security implementation');
const ids=fs.readFileSync(path.join(root,'platform','identity-security.mjs'),'utf8');
for(const x of ['EMAIL_NOT_VERIFIED','SESSION_EXPIRED','client_role_claims_ignored:true','revoke_existing_sessions_on_success:true','Only SUPER_ADMIN may change SUPER_ADMIN','client_authoritative:false']) if(!ids.includes(x)) failures.push('/platform/identity-security.mjs: missing '+x);
const ism=fs.readFileSync(path.join(root,'platform','db','migrations','020_identity_session_security.sql'),'utf8');
for(const x of ['secret_hash','token_hash','EMAIL_VERIFICATION','PASSWORD_RECOVERY','role_change_event']) if(!ism.includes(x)) failures.push('/platform/db/migrations/020_identity_session_security.sql: missing '+x);
const isr=fs.readFileSync(path.join(root,'platform','db','rls','004_identity_security.sql'),'utf8');
for(const x of ['FORCE ROW LEVEL SECURITY','auth_session_own_read','account_token','role_change_event']) if(!isr.includes(x)) failures.push('/platform/db/rls/004_identity_security.sql: missing '+x);

// Research/report execution guardrails.
for(const p of ['platform/research-execution-policy.json','platform/report-engine.mjs']) if(!fs.existsSync(path.join(root,p))) failures.push('/'+p+': missing research/report execution component');
const rp=JSON.parse(fs.readFileSync(path.join(root,'platform','research-execution-policy.json'),'utf8')).research_dataset_execution;
if(rp.direct_identity_in_export!==false||rp.requires_deidentification_run!==true||rp.requires_frozen_codebook!==true||rp.withdrawn_case_future_use_prohibited!==true) failures.push('/platform/research-execution-policy.json: unsafe research execution policy');
const rep=fs.readFileSync(path.join(root,'platform','report-engine.mjs'),'utf8');
for(const x of ['immutable_source_provenance:true','Human report review required','SUPERSEDED','history_preserved:true']) if(!rep.includes(x)) failures.push('/platform/report-engine.mjs: missing '+x);

// Golden Talent authorization/completion drift guards.
const gta=fs.readFileSync(path.join(root,'platform','golden-talent-authorization.mjs'),'utf8');
for(const x of ["explicitConsent(consent,'PARENT_VISIBILITY')","explicitConsent(consent,'TEACHER_OBSERVATION')","explicitConsent(consent,'CONSULTANT_REVIEW')","typeof scope==='object'"]) if(!gta.includes(x)) failures.push('/platform/golden-talent-authorization.mjs: missing '+x);
const gtd=JSON.parse(fs.readFileSync(path.join(root,'platform','golden-talent-deep-modules.json'),'utf8'));
for(const d of ['D1','D2','D3','D4','D5','D6']) if(!gtd.modules[d]?.completion_requirements) failures.push('/platform/golden-talent-deep-modules.json: '+d+' lacks machine-readable completion');
const gte=fs.readFileSync(path.join(root,'platform','golden-talent-deep-module-engine.mjs'),'utf8');
for(const x of ['completion_requirements','required_task_codes','professional_review','completed_for_workflow:completed','requires_route_rerun:completed']) if(!gte.includes(x)) failures.push('/platform/golden-talent-deep-module-engine.mjs: missing '+x);

// Security, observability, publishing and media governance guards.
for(const p of ['platform/security-production-policy.json','foundation/SECURITY-OPERATIONS-RUNBOOK.md','platform/observability-policy.json','platform/publishing-journal-governance.json','platform/media-library-policy.json']) if(!fs.existsSync(path.join(root,p))) failures.push('/'+p+': missing governance contract');
const sp=JSON.parse(fs.readFileSync(path.join(root,'platform','security-production-policy.json'),'utf8'));
if(sp.admin_mfa?.required!==true||sp.uploads?.quarantine_until_scan!==true||sp.backup?.restore_test_required!==true||sp.incident_response?.post_incident_review!==true) failures.push('/platform/security-production-policy.json: incomplete production security controls');
const observabilityPolicy=JSON.parse(fs.readFileSync(path.join(root,'platform','observability-policy.json'),'utf8'));
if(observabilityPolicy.rules?.no_raw_assessment_answers_in_analytics!==true||observabilityPolicy.rules?.no_research_identity_links!==true||observabilityPolicy.rules?.journal_metrics_must_not_claim_impact_factor_or_indexing_without_verification!==true) failures.push('/platform/observability-policy.json: unsafe observability policy');
const mp=JSON.parse(fs.readFileSync(path.join(root,'platform','media-library-policy.json'),'utf8'));
const mediaRequired=Array.isArray(mp.record_required)?mp.record_required:(mp.media_asset?.required||[]);
const hasRights=mediaRequired.includes('rights')||mediaRequired.includes('licence_status');
if(!hasRights||!mediaRequired.includes('provenance')) failures.push('/platform/media-library-policy.json: missing rights provenance');


// Consultation, research access and scientific reference guards.
for(const p of ['platform/consultation-record-engine.mjs','platform/research-access-retention.mjs','platform/norm-reference-policy.json']) if(!fs.existsSync(path.join(root,p))) failures.push('/'+p+': missing roadmap implementation');
const consultationRecordSource=fs.readFileSync(path.join(root,'platform','consultation-record-engine.mjs'),'utf8');
for(const x of ['append_only:true',"visibility:'ASSIGNED_PROFESSIONALS'",'automatic_release:false']) if(!consultationRecordSource.includes(x)) failures.push('/platform/consultation-record-engine.mjs: missing '+x);
const ra=fs.readFileSync(path.join(root,'platform','research-access-retention.mjs'),'utf8');
for(const x of ['direct_identity:false','Cannot expand requested scope','RETAIN_RESEARCH_ONLY','DELETE_OR_ANONYMISE']) if(!ra.includes(x)) failures.push('/platform/research-access-retention.mjs: missing '+x);
const nr=JSON.parse(fs.readFileSync(path.join(root,'platform','norm-reference-policy.json'),'utf8'));
if(nr.golden_talent?.norms_available!==false||nr.golden_talent?.gifted_cutoff_available!==false||nr.reference_metadata?.fairness_analysis_required!==true) failures.push('/platform/norm-reference-policy.json: unsafe norm/reference policy');

// CRM, commerce operations, institutional consulting and assessment-authoring guards.
for(const p of ['platform/crm-engine.mjs','platform/commerce-operations-policy.json','platform/institutional-consulting-policy.json','platform/assessment-authoring-engine.mjs']) if(!fs.existsSync(path.join(root,p))) failures.push('/'+p+': missing roadmap implementation');
const crmSource=fs.readFileSync(path.join(root,'platform','crm-engine.mjs'),'utf8');
for(const x of ['raw_contact_in_analytics:false','consulting_crm_link:null','public_listing:false']) if(!crmSource.includes(x)) failures.push('/platform/crm-engine.mjs: missing '+x);
const commerceOps=JSON.parse(fs.readFileSync(path.join(root,'platform','commerce-operations-policy.json'),'utf8'));
if(commerceOps.discounts?.server_authoritative!==true||commerceOps.institutional_invoice?.payment_status_server_verified!==true||commerceOps.consultation_payment?.client_redirect_never_proves_payment!==true) failures.push('/platform/commerce-operations-policy.json: unsafe commerce operations');
const institutionPolicy=JSON.parse(fs.readFileSync(path.join(root,'platform','institutional-consulting-policy.json'),'utf8'));
if(institutionPolicy.institutional_consulting?.named_outcomes_are_targets_not_guarantees!==true||institutionPolicy.institutional_consulting?.child_data_requires_role_consent_and_minimisation!==true) failures.push('/platform/institutional-consulting-policy.json: unsafe institutional consulting policy');
const assessmentAuthoring=fs.readFileSync(path.join(root,'platform','assessment-authoring-engine.mjs'),'utf8');
for(const x of ['Reviewer required for publication','Published assessment must be immutable','Unique versioned item metadata required']) if(!assessmentAuthoring.includes(x)) failures.push('/platform/assessment-authoring-engine.mjs: missing '+x);


// PRODUCTION ORIGIN CONSISTENCY — once custom domain is LIVE, legacy GitHub origin must disappear from public SEO-bearing files.
const ecosystemRegistryFile=path.join(root,'platform','ecosystem-registry.json');
if(fs.existsSync(ecosystemRegistryFile)){
  try{
    const registry=JSON.parse(fs.readFileSync(ecosystemRegistryFile,'utf8'));
    const live=registry?.origin_states?.main_custom_domain==='LIVE';
    const expected=registry?.origins?.current_public_origin;
    const legacy='https://drrezazadeh65.github.io/drjavadrezazadeh.com';
    if(live){
      if(expected!=='https://drjavadrezazadeh.com') failures.push('/platform/ecosystem-registry.json: LIVE custom-domain state must use https://drjavadrezazadeh.com as current_public_origin');
      const seoBearing=[];
      function walkSeo(dir){
        for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
          if(ignoreDirs.has(ent.name)) continue;
          const p=path.join(dir,ent.name);
          if(ent.isDirectory()) walkSeo(p);
          else if(ent.isFile()&&(ent.name.endsWith('.html')||ent.name.endsWith('.xml')||['robots.txt','security.txt','site.webmanifest'].includes(ent.name))) seoBearing.push(p);
        }
      }
      walkSeo(root);
      for(const file of seoBearing){
        const src=fs.readFileSync(file,'utf8');
        if(src.includes(legacy)) failures.push('/'+path.relative(root,file).replaceAll(path.sep,'/')+': legacy GitHub Pages origin remains after LIVE custom-domain cutover');
      }
      for(const [canonical,route] of canonicals.entries()){
        if(!canonical.startsWith(expected+'/')&&canonical!==expected+'/') failures.push(route+': canonical is outside LIVE production origin '+canonical);
      }
    }
  }catch(e){
    failures.push('/platform/ecosystem-registry.json: production-origin audit failed '+e.message);
  }
}
if(failures.length){
  console.error('\nProduction-origin SEO failures ('+failures.length+')');
  failures.forEach(x=>console.error('✗ '+x));
  process.exit(1);
}


// METADATA UNIQUENESS — prevent accidental title/description duplication and SERP cannibalisation.
{
  const titleOwners=new Map();
  const descOwners=new Map();
  for(const file of htmlFiles){
    const html=fs.readFileSync(file,'utf8');
    const route=routeFor(file);
    const robots=getAttr((html.match(/<meta\b[^>]*name=["']robots["'][^>]*>/i)||[''])[0],'content')||'';
    if(/\bnoindex\b/i.test(robots)) continue;
    const title=strip((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)||[])[1]||'');
    const desc=getAttr((html.match(/<meta\b[^>]*name=["']description["'][^>]*>/i)||[''])[0],'content')||'';
    const tKey=title.replace(/\s+/g,' ').trim().toLocaleLowerCase();
    const dKey=desc.replace(/\s+/g,' ').trim().toLocaleLowerCase();
    if(tKey){
      if(titleOwners.has(tKey)) failures.push(route+': duplicate indexable title also used by '+titleOwners.get(tKey));
      else titleOwners.set(tKey,route);
      if(title.length<18) warnings.push(route+': unusually short title ('+title.length+' chars)');
      if(title.length>72) warnings.push(route+': long title may truncate in search ('+title.length+' chars)');
    }
    if(dKey){
      if(descOwners.has(dKey)) failures.push(route+': duplicate indexable meta description also used by '+descOwners.get(dKey));
      else descOwners.set(dKey,route);
      if(desc.length>190) warnings.push(route+': long meta description may truncate in search ('+desc.length+' chars)');
    }
  }
}
if(failures.length){
  console.error('\nMetadata uniqueness failures ('+failures.length+')');
  failures.forEach(x=>console.error('✗ '+x));
  process.exit(1);
}
