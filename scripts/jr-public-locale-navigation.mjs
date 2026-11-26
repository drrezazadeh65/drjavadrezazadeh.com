import fs from 'node:fs';
import path from 'node:path';

const origin='https://drjavadrezazadeh.com';
const languages=['fa','en','ar'];
const names={fa:'فارسی',en:'English',ar:'العربية'};
const navLabel={fa:'انتخاب زبان',en:'Choose language',ar:'اختيار اللغة'};
const homeLabel={fa:'صفحهٔ اصلی',en:'home',ar:'الصفحة الرئيسية'};
const approvedArabicPaths=Object.freeze(["/ar/","/ar/about/","/ar/research/","/ar/publications/","/ar/teaching/","/ar/educational-philosophy/","/ar/contact/","/ar/language-education/","/ar/academic-engagements/","/ar/books/","/ar/academic-services/","/ar/services/","/ar/golden-talent/methodology/"]);
const publicMaps=['sitemap-fa.xml','sitemap-en.xml','sitemap-services.xml','sitemap-jrei.xml','sitemap-ar.xml','sitemap-core.xml'];
const sheet='<link rel="stylesheet" href="/assets/css/jr-arabic-public-v1.css">';
const frozenOrPrivate=/(?:^|\/)(?:akhbar|news-insights|news-intelligence|app|account|dashboard|checkout|cart|login|register|recover|workspace|admin|payment-start|payment-return|payment-result|assessments|assessment|observer|roles|student)(?:\/|$)/i;
function attrs(tag){return Object.fromEntries([...tag.matchAll(/([a-z][\w:-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)].map(m=>[m[1].toLowerCase(),m[2]??m[3]]));}
function head(html){return html.match(/<head\b[^>]*>([\s\S]*?)<\/head\s*>/i)?.[1]||'';}
function meta(html,name){return [...head(html).matchAll(/<meta\b[^>]*>/gi)].map(m=>attrs(m[0])).find(a=>a.name?.toLowerCase()===name)?.content||'';}
function links(html){return [...head(html).matchAll(/<link\b[^>]*>/gi)].map(m=>attrs(m[0]));}
function canonical(html){return links(html).find(a=>a.rel==='canonical')?.href||'';}
function alternates(html){return Object.fromEntries(links(html).filter(a=>a.rel==='alternate'&&a.hreflang&&a.href).map(a=>[a.hreflang,a.href]));}
function localRoute(value){if(typeof value!=='string'||!value.startsWith(origin+'/'))return '';const p=value.slice(origin.length);return /^\/(?:[a-zA-Z0-9_-]+\/)*$/.test(p)?p:'';}
function fileFor(out,p){return path.join(out,p.slice(1),'index.html');}
function indexable(html){return !/\bnoindex\b/i.test(meta(html,'robots'));}
function readRoute(out,p){const file=fileFor(out,p);return fs.existsSync(file)?fs.readFileSync(file,'utf8'):null;}
function isPublicLocale(p){return /^\/(?:fa|en|ar)\//.test(p)&&(!frozenOrPrivate.test(p)||/^\/(?:fa|en|ar)\/jrei\/catalog\/(?:assessment|news)\/$/.test(p));}
function readSitemapLocations(out){const result=new Set();for(const file of publicMaps){const full=path.join(out,file);if(!fs.existsSync(full))continue;for(const m of fs.readFileSync(full,'utf8').matchAll(/<loc>\s*([^<]+)\s*<\/loc>/g)){const p=localRoute(m[1].trim());if(p)result.add(p);}}return result;}
export function localeNavigationMarkup(current,targets){
 if(!languages.includes(current))throw Error('Unknown locale');
 return '<nav class="jr-language-choices" data-jr-locale-nav="v1" aria-label="'+navLabel[current]+'">'+languages.map(l=>{
  if(l===current)return '<span lang="'+l+'" aria-current="page">'+names[l]+'</span>';
  const p=targets[l],fallback=!p;
  return '<a lang="'+l+'" href="'+(p||'/'+l+'/')+'"'+(fallback?' class="jr-language-fallback"':' hreflang="'+l+'"')+'>'+names[l]+(fallback?' <small>('+homeLabel[current]+')</small>':'')+'</a>';
 }).join('')+'</nav>';
}
export function validateArabicPublicRoutes(out,routes,failures){
 const got=routes.map(x=>x.ar).sort(),expected=[...approvedArabicPaths].sort();
 if(JSON.stringify(got)!==JSON.stringify(expected)||new Set(got).size!==got.length){failures.push('Arabic editorial route allowlist mismatch');return 0;}
 const sitemap=fs.readFileSync(path.join(out,'sitemap-ar.xml'),'utf8');
 const actual=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>localRoute(m[1])).sort();
 if(JSON.stringify(actual)!==JSON.stringify(expected))failures.push('Arabic sitemap has missing, duplicate or unapproved routes');
 const index=fs.readFileSync(path.join(out,'sitemap.xml'),'utf8');
 if(!index.includes('<loc>'+origin+'/sitemap-ar.xml</loc>'))failures.push('Arabic sitemap absent from index');
 for(const row of routes){
  const cluster={fa:row.fa,en:row.en,ar:row.ar,'x-default':row.xDefault};
  for(const l of languages){
   const p=row[l],source=readRoute(out,p);
   if(!source){failures.push('Missing locale counterpart: '+p);continue;}
   if(canonical(source)!==origin+p||!indexable(source))failures.push('Invalid canonical/indexability: '+p);
   const a=alternates(source);
   for(const [lang,target] of Object.entries(cluster))if(a[lang]!==origin+target)failures.push('Nonreciprocal hreflang '+p+' '+lang);
   if(l==='ar'){
    const tag=attrs(source.match(/<html\b[^>]*>/i)?.[0]||'');
    if(tag.lang!=='ar'||tag.dir!=='rtl'||!source.includes('data-jr-arabic-edition="v1"')||/<form\b/i.test(source)||!meta(source,'description')||[...source.matchAll(/<h1\b/gi)].length!==1)failures.push('Arabic editorial contract invalid: '+p);
    const main=source.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1]||'';
    if((main.replace(/<[^>]+>/g,'').match(/[\u0600-\u06ff]/g)||[]).length<250)failures.push('Insufficient real Arabic editorial content: '+p);
    for(const m of source.matchAll(/\bhref="(\/[^"#?]*)(?:[?#][^"]*)?"/g)){
     if(m[1].startsWith('//'))continue;
     const target=m[1].endsWith('/')?fileFor(out,m[1]):path.join(out,m[1].slice(1));
     if(!fs.existsSync(target))failures.push('Arabic page broken local link '+p+' -> '+m[1]);
    }
   }
  }
 }
 const gateway=fs.readFileSync(path.join(out,'index.html'),'utf8'),a=alternates(gateway);
 for(const [l,p] of Object.entries({fa:'/fa/',en:'/en/',ar:'/ar/','x-default':'/'}))if(a[l]!==origin+p)failures.push('Root language gateway missing '+l);
 for(const l of languages)if(!gateway.includes('data-language-choice="'+l+'"'))failures.push('Root language choice missing '+l);
 return approvedArabicPaths.length;
}
export function applyPublicLocaleNavigation(out,htmlFiles){
 const sitemap=readSitemapLocations(out);
 let enhanced=0,existing=0,fallback=0,excluded=0;
 const cache=new Map();
 const load=p=>{if(!cache.has(p))cache.set(p,readRoute(out,p));return cache.get(p);};
 for(const file of htmlFiles){
  const rel=path.relative(out,file).replaceAll(path.sep,'/');
  if(!/^(?:fa|en|ar)\/(?:[a-zA-Z0-9_-]+\/)*index\.html$/.test(rel))continue;
  const p='/'+rel.replace(/index\.html$/,'');
  if(!isPublicLocale(p)||!sitemap.has(p)){excluded++;continue;}
  const source=fs.readFileSync(file,'utf8'),current=rel.split('/')[0];
  if(!indexable(source)||canonical(source)!==origin+p){excluded++;continue;}
  if(source.includes('class="jr-language-choices"')||(/^\/(?:fa|en|ar)\/$/.test(p))||/^\/(?:fa|en|ar)\/(?:jrei(?:\/|$)|jrei-academic\/|forge\/)/.test(p)){existing++;continue;}
  if(!/<main\b[^>]*>/i.test(source)||!/<\/head>/i.test(source)){excluded++;continue;}
  const target={},a=alternates(source);
  for(const l of languages.filter(x=>x!==current)){
   const q=localRoute(a[l]),other=q&&sitemap.has(q)&&isPublicLocale(q)?load(q):null;
   if(other&&indexable(other)&&canonical(other)===origin+q&&alternates(other)[current]===origin+p)target[l]=q;
  }
  if(languages.some(l=>l!==current&&!target[l]))fallback++;
  let next=source.replace(/<main\b[^>]*>/i,m=>m+localeNavigationMarkup(current,target));
  if(!next.includes('/assets/css/jr-arabic-public-v1.css'))next=next.replace(/<\/head>/i,sheet+'</head>');
  fs.writeFileSync(file,next,'utf8');enhanced++;
 }
 return {enhanced,existing,fallback,excluded};
}
