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
  const m=tag.match(new RegExp('\\b'+name+'\\s*=\\s*["\']([^"\']*)["\']','i'));
  return m?m[1]:null;
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
  const isPrivate=/^\/(?:fa\/)?(?:app|login|register|shop|assessments)(?:\/|$)/.test(route) ||
    /^\/fa\/(?:darkhast-moshavere|harim-khosusi|siasat-moshavere)(?:\/|$)/.test(route) ||
    /^\/(?:privacy|consultation-policy)(?:\/|$)/.test(route);

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
const sitePrefix='https://drrezazadeh65.github.io/drjavadrezazadeh.com';
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


// PERFORMANCE BUDGET — guardrails, not synthetic CWV claims.
const budgets=[
  ['assets/css/style.css',120*1024],
  ['assets/js/site.js',25*1024],
  ['assets/js/rcas-start.js',30*1024],
  ['assets/js/student-dashboard.js',15*1024]
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
    forbidden:['<b>2020</b><span>Doctoral studies · Arak University</span>','PhD in English Language Education']
  },
  {
    file:'fa/darbare-man/index.html',
    required:['۲۰۲۶','دکتری آموزش · دانشگاه اراک','کارشناسی ارشد · دانشگاه تهران'],
    forbidden:['<b>۲۰۲۰</b><span>تحصیلات دکتری · دانشگاه اراک</span>','دکتری آموزش زبان انگلیسی']
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

// UNRELEASED RESEARCH FIREWALL — protected project names must not appear in public HTML.
const protectedResearchTerms=['Humanability','TESTLY','Teacher Humanization'];
for(const file of htmlFiles){
  const html=fs.readFileSync(file,'utf8');
  const route=routeFor(file);
  const robots=((html.match(/<meta\b[^>]*name=["']robots["'][^>]*>/i)||[''])[0]);
  const rc=getAttr(robots,'content')||'';
  const publicSurface=!/\bnoindex\b/i.test(rc);
  if(!publicSurface) continue;
  for(const term of protectedResearchTerms){
    if(html.toLowerCase().includes(term.toLowerCase())){
      failures.push(route+': protected/unreleased research term leaked to indexable HTML: '+term);
    }
  }
}
if(failures.length){
  console.error('\nRelease-firewall failures ('+failures.length+')');
  failures.forEach(x=>console.error('✗ '+x));
  process.exit(1);
}
