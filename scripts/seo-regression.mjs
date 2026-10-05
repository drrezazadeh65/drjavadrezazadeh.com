import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const ignoreDirs=new Set(['.git','node_modules']);
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
  const isPrivate =
    /^\/(?:fa|en)\/(?:app|login|register|recover|account|shop|assessments)(?:\/|$)/.test(route) ||
    /^\/(?:app|login|register|shop|assessments|student|parent|teacher|research-lab)(?:\/|$)/.test(route) ||
    /^\/fa\/(?:bazyabi-hesab|darkhast-moshavere|harim-khosusi|siasat-moshavere|sharayet-estefade)(?:\/|$)/.test(route) ||
    /^\/en\/request-consultation(?:\/|$)/.test(route) ||
    /^\/en\/golden-talent\/(?:assessment|checkout|dashboard|observer|plans|roles|student)(?:\/|$)/.test(route) ||
    /^\/(?:privacy|terms|consultation-policy)(?:\/|$)/.test(route);

  if(!lang) failures.push(route+': missing html[lang]');
  if(lang==='fa' && dir!=='rtl') failures.push(route+': Persian page must use dir="rtl"');
  if(lang==='en' && dir && dir!=='ltr') failures.push(route+': English page must use dir="ltr"');
  if(!/<meta\b[^>]*name=["']viewport["']/i.test(html)) failures.push(route+': missing viewport meta');

  const h1=(html.match(/<h1\b/gi)||[]).length;
  if(h1!==1) failures.push(route+': expected exactly one H1, found '+h1);

  const title=strip((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)||[])[1]||'');
  if(!title) failures.push(route+': missing title');

  if(isPrivate && isIndexable) failures.push(route+': private/transactional route must be noindex');

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
    if(alt===null) failures.push(route+': image missing alt attribute: '+img.slice(0,120));
    const width=getAttr(img,'width'),height=getAttr(img,'height');
    if(!width||!height) warnings.push(route+': image missing explicit width/height: '+(getAttr(img,'src')||'unknown'));
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
const sitemapChildren=['sitemap-core.xml','sitemap-fa.xml','sitemap-en.xml','sitemap-news.xml'];
const sitemapUrls=new Set();
const sitemapIndexPath=path.join(root,'sitemap.xml');
let sitePrefix='';
if(fs.existsSync(sitemapIndexPath)){
  const indexXml=fs.readFileSync(sitemapIndexPath,'utf8');
  const firstLoc=(indexXml.match(/<loc>([^<]+)<\/loc>/i)||[])[1]||'';
  sitePrefix=firstLoc.replace(/\/sitemap-(?:core|fa|en|news)\.xml$/,'');
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
    '/fa/assessments/','/assessments/','/fa/shop/','/shop/',
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
  if(!/const isCode\s*=\s*\/\\\.\(\?:css\|js\)\$\/i/.test(swSource) && !swSource.includes("const isCode=/\\.(?:css|js)$/i")){
    failures.push('/sw.js: CSS/JS asset classifier missing');
  }
}
if(failures.length){
  console.error('\nPrivate PWA cache-firewall failures ('+failures.length+')');
  failures.forEach(x=>console.error('✗ '+x));
  process.exit(1);
}


// CLOUDFLARE RESPONSE-HEADER FIREWALL — prepared now, enforced after Pages cutover.
const headersPath=path.join(root,'_headers');
if(!fs.existsSync(headersPath)) failures.push('/_headers: missing Cloudflare Pages response-header policy');
else{
  const headersSource=fs.readFileSync(headersPath,'utf8');
  const requiredGlobalHeaders=[
    'X-Frame-Options: DENY',
    'X-Content-Type-Options: nosniff',
    'Referrer-Policy: strict-origin-when-cross-origin',
    'Permissions-Policy:'
  ];
  for(const header of requiredGlobalHeaders){
    if(!headersSource.includes(header)) failures.push('/_headers: missing global security header '+header);
  }
  if(!headersSource.includes('https://:project.pages.dev/*') || !headersSource.includes('X-Robots-Tag: noindex, noarchive')){
    failures.push('/_headers: Cloudflare Pages preview hosts must be noindex');
  }
  const requiredNoStoreRoutes=[
    '/fa/app/*','/app/*','/fa/login/*','/login/*','/fa/register/*','/register/*','/fa/bazyabi-hesab/*',
    '/en/login/*','/en/register/*','/en/recover/*','/en/account/*',
    '/fa/assessments/*','/assessments/*','/fa/shop/*','/shop/*',
    '/en/golden-talent/assessment/*','/en/golden-talent/dashboard/*','/en/golden-talent/observer/*',
    '/en/golden-talent/roles/*','/en/golden-talent/student/*','/en/golden-talent/checkout/*','/en/golden-talent/plans/*',
    '/fa/darkhast-moshavere/*','/en/request-consultation/*'
  ];
  for(const route of requiredNoStoreRoutes){
    const i=headersSource.indexOf('\n'+route+'\n');
    if(i<0){
      failures.push('/_headers: missing private route rule '+route);
      continue;
    }
    const next=headersSource.indexOf('\n/',i+2);
    const section=headersSource.slice(i,next<0?headersSource.length:next);
    if(!/Cache-Control:\s*no-store/i.test(section)) failures.push('/_headers: private route missing no-store '+route);
    if(!/X-Robots-Tag:\s*noindex/i.test(section)) failures.push('/_headers: private route missing X-Robots-Tag noindex '+route);
  }
}
if(failures.length){
  console.error('\nCloudflare header-firewall failures ('+failures.length+')');
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
  if(!/html,body\{[^}]*overflow-x:(?:hidden|clip)/i.test(css)){
    failures.push('/assets/css/style.css: missing global horizontal-overflow guard');
  }
  if(!css.includes('env(safe-area-inset-bottom)')) failures.push('/assets/css/style.css: missing bottom safe-area handling');
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
      if(rasterAny.length) warnings.push('/site.webmanifest: raster icon declares sizes="any"; add explicit 192x192 and 512x512 production icons');
      const has192=manifest.icons.some(i=>/(^|\s)192x192(\s|$)/.test(i?.sizes||''));
      const has512=manifest.icons.some(i=>/(^|\s)512x512(\s|$)/.test(i?.sizes||''));
      if(!has192||!has512) warnings.push('/site.webmanifest: Chromium-grade 192x192 and 512x512 icon set is still pending');
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


// MOBILE UX RELEASE GATE
const cssFile=path.join(root,'assets','css','style.css');
if(fs.existsSync(cssFile)){
  const css=fs.readFileSync(cssFile,'utf8');
  const requiredMobileRules=[
    ['global horizontal containment','html,body{max-width:100%;overflow-x:clip}'],
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


// PUBLIC SEARCH GOVERNANCE — search index must contain public/indexable pages only.
const searchIndexPath=path.join(root,'assets','search-index.json');
if(!fs.existsSync(searchIndexPath)){
  failures.push('/assets/search-index.json: public search index missing');
}else{
  let items=[];
  try{items=JSON.parse(fs.readFileSync(searchIndexPath,'utf8'));}catch(e){failures.push('/assets/search-index.json: invalid JSON');}
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
  if(!/html,body\{[^}]*overflow-x\s*:\s*hidden!important/i.test(css)){
    failures.push('/assets/css/style.css: iOS horizontal overflow hardening missing');
  }
  if(!/\.site-header\{[^}]*padding-inline:max\(20px,calc\(\(100% - var\(--max\)\)\/2\)\)/i.test(css)){
    failures.push('/assets/css/style.css: site header must avoid viewport-width based horizontal sizing');
  }
}
if(failures.length){
  console.error('\nHorizontal overflow failures ('+failures.length+')');
  failures.forEach(x=>console.error('✗ '+x));
  process.exit(1);
}
