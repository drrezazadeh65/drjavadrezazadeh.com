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
    if(isIndexable){
      const loading=(getAttr(img,'loading')||'').toLowerCase();
      const priority=(getAttr(img,'fetchpriority')||'').toLowerCase();
      if(loading==='lazy' && priority==='high') failures.push(route+': image cannot be both lazy and fetchpriority=high: '+(getAttr(img,'src')||'unknown'));
      if(loading!=='lazy' && priority!=='high') failures.push(route+': indexable-page image must be classified as lazy or fetchpriority=high: '+(getAttr(img,'src')||'unknown'));
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
  for(const iconPath of ['./assets/images/pwa-icon-192.png','./assets/images/pwa-icon-512.png','./assets/images/pwa-icon-maskable-512.png']){
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


// CLOUDFLARE REDIRECT REGISTRY — exact legacy migrations must remain permanent and target valid local routes.
const redirectsPath=path.join(root,'_redirects');
if(!fs.existsSync(redirectsPath)) failures.push('/_redirects: missing Cloudflare Pages redirect registry');
else{
  const lines=fs.readFileSync(redirectsPath,'utf8').split(/\r?\n/).map(x=>x.trim()).filter(x=>x && !x.startsWith('#'));
  const seen=new Set();
  const map=new Map();
  for(const line of lines){
    const parts=line.split(/\s+/);
    if(parts.length!==3){
      failures.push('/_redirects: malformed rule '+line);
      continue;
    }
    const [source,destination,code]=parts;
    if(seen.has(source)) failures.push('/_redirects: duplicate source '+source);
    seen.add(source);
    map.set(source,{destination,code});
    if(source===destination) failures.push('/_redirects: redirect loop '+source);
    if(code!=='301') failures.push('/_redirects: legacy migration must use 301 '+source);
    if(destination.startsWith('/')){
      const clean=destination.split('?')[0].split('#')[0];
      let target=path.join(root,clean);
      if(fs.existsSync(target) && fs.statSync(target).isDirectory()) target=path.join(target,'index.html');
      else if(!path.extname(target)) target=path.join(target,'index.html');
      if(!fs.existsSync(target)) failures.push('/_redirects: local target missing '+source+' -> '+destination);
    }
  }
  const requiredRedirects={
    '/about/':'/en/about/',
    '/academic-engagements/':'/en/academic-engagements/',
    '/books/':'/en/books/',
    '/educational-philosophy/':'/en/educational-philosophy/',
    '/golden-talent/':'/en/golden-talent/',
    '/publications/':'/en/publications/',
    '/research/':'/en/research/',
    '/teaching/':'/en/teaching/',
    '/login/':'/en/login/',
    '/register/':'/en/register/'
  };
  for(const [source,destination] of Object.entries(requiredRedirects)){
    const rule=map.get(source);
    if(!rule || rule.destination!==destination || rule.code!=='301'){
      failures.push('/_redirects: required permanent migration missing '+source+' -> '+destination);
    }
    const noSlash=source.endsWith('/')?source.slice(0,-1):source;
    const noSlashRule=map.get(noSlash);
    if(!noSlashRule || noSlashRule.destination!==destination || noSlashRule.code!=='301'){
      failures.push('/_redirects: slash-normalized permanent migration missing '+noSlash+' -> '+destination);
    }
  }
}
if(failures.length){
  console.error('\nRedirect-registry failures ('+failures.length+')');
  failures.forEach(x=>console.error('✗ '+x));
  process.exit(1);
}


// CLOUDFLARE RESPONSE-HEADER FIREWALL — prepared now, enforced after Pages cutover.
const headersPath=path.join(root,'_headers');
if(!fs.existsSync(headersPath)) failures.push('/_headers: missing Cloudflare Pages response-header policy');
else{
  const headersSource=fs.readFileSync(headersPath,'utf8');
  if(/Cache-Control:\s*[^\n]*immutable/i.test(headersSource)){
    failures.push('/_headers: immutable browser caching is prohibited until public asset filenames are content-fingerprinted');
  }
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
      if(!p.startsWith('assets/images/')) failures.push('/assets/media-registry.json: media path must stay under assets/images '+p);
      const abs=path.join(root,p);
      if(!fs.existsSync(abs)) failures.push('/assets/media-registry.json: registered file missing '+p);
      for(const field of requiredFields){
        if(typeof item[field]!=='string' || item[field].trim().length<2){
          failures.push('/assets/media-registry.json: '+p+' missing '+field);
        }
      }
    }

    const imagesDir=path.join(root,'assets','images');
    const imageFiles=fs.readdirSync(imagesDir,{withFileTypes:true})
      .filter(ent=>ent.isFile() && /\.(?:png|jpe?g|webp|gif|svg|avif)$/i.test(ent.name))
      .map(ent=>'assets/images/'+ent.name);
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
