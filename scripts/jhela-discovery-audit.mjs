import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd(), failures=[];
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const exists=p=>fs.existsSync(path.join(root,p));
const base='https://drjavadrezazadeh.com';
const faJournalRoutes=[
 '/journal/fa/',
 '/journal/fa/dashboard/',
 '/journal/fa/roadmap/',
 '/journal/fa/aims-scope/',
 '/journal/fa/call-for-reviewers/',
 '/journal/fa/founding-collaborators/',
 '/journal/fa/reviewer-registration/',
 '/journal/fa/editorial-board/',
 '/journal/fa/peer-review/',
 '/journal/fa/ethics/',
 '/journal/fa/author-guidelines/',
 '/journal/fa/fees/',
 '/journal/fa/contact/'
];
const journalRoutes=[
 '/journal/','/journal/dashboard/','/journal/roadmap/','/journal/aims-scope/',
 '/journal/author-guidelines/','/journal/contact/','/journal/editorial-board/',
 '/journal/ethics/','/journal/fees/','/journal/peer-review/',
 '/journal/reviewer-registration/','/journal/call-for-reviewers/',
 '/journal/founding-collaborators/',
 ...faJournalRoutes
];
const explicitlyUnreleased=['/journal/submission/','/journal/current/','/journal/archive/','/journal/founding-checklist/','/journal/fa/submission/','/journal/fa/current/','/journal/fa/archive/'];
const pathOf=url=>new URL(url).pathname;
const sitemap=read('journal/sitemap.xml');
const rootIndex=read('sitemap.xml');
const core=read('sitemap-core.xml');
const robots=read('robots.txt');
const llms=read('llms.txt');
const manifest=JSON.parse(read('platform/public-url-stability-manifest.json'));
const registry=JSON.parse(read('platform/ecosystem-registry.json'));
const search=JSON.parse(read('assets/search-index.json'));
const locs=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
const locSet=new Set(locs);

if(locSet.size!==locs.length)failures.push('JHELA sitemap has duplicated loc values');
if(locs.length!==journalRoutes.length)failures.push('JHELA sitemap count differs from approved founding-stage URL inventory');
if(!rootIndex.includes('<loc>'+base+'/journal/sitemap.xml</loc>'))failures.push('Main sitemap index does not include the independent JHELA child');
if(!robots.includes('Sitemap: '+base+'/journal/sitemap.xml'))failures.push('Root robots.txt does not advertise independent journal sitemap');
if(!llms.includes('('+base+'/journal/dashboard/)'))failures.push('AI discovery misses the journal dashboard');
for(const loc of locs){
 let url;try{url=new URL(loc);}catch{failures.push('Malformed journal sitemap URL: '+loc);continue;}
 if(url.origin!==base) failures.push('Journal sitemap contains an unverified host: '+loc);
 if(!url.pathname.startsWith('/journal/')) failures.push('Journal sitemap contains a non-JHELA URL: '+loc);
 if(!journalRoutes.includes(url.pathname))failures.push('Unapproved or premature journal sitemap URL: '+loc);
 if(core.includes(loc))failures.push('Duplicate JHELA URL in root core sitemap: '+loc);
}
for(const route of journalRoutes){
 const url=base+route,file=route.slice(1)+'index.html';
 if(!locSet.has(url))failures.push('Released JHELA page missing from its own sitemap: '+route);
 if(route.startsWith('/journal/fa/')){
   if(!read(file).includes('<html lang="fa" dir="rtl">')) failures.push('Persian JHELA document missing semantic RTL '+route);
   const counterpart=base+route.replace('/journal/fa/','/journal/');
   if(!read(file).includes('hreflang="en" href="'+counterpart+'"'))failures.push('Persian JHELA language alternate absent '+route);
 }
 if(!exists(file)){failures.push('JHELA released page missing HTML: '+file);continue;}
 const html=read(file);
 if(/<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(html))failures.push('JHELA released page is noindex: '+route);
 if(!html.includes('rel="canonical" href="'+url+'"')) failures.push('Released page missing exact self-canonical: '+route);
 if(!html.includes('<meta property="og:description"'))failures.push('Missing social description: '+route);
 if(!html.includes('<script type="application/ld+json">'))failures.push('Missing factual structured metadata: '+route);
 if(!manifest.frozen_indexable_routes.includes(route))failures.push('JHELA released path absent from URL stability manifest: '+route);
 const entry=registry.exact_routes.find(x=>x.route===route);
 if(entry && entry.policy!=='PUBLIC_CANDIDATE')failures.push('JHELA released route blocked by registry: '+route);
 if(!search.some(x=>x.path===route.slice(1)))failures.push('JHELA released route absent from public search: '+route);
}
for(const route of explicitlyUnreleased){
 const url=base+route,file=route.slice(1)+'index.html';
 if(locSet.has(url))failures.push('Non-operational JHELA route in public sitemap: '+route);
 if(exists(file)&&!/<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(read(file)))failures.push('Non-operational JHELA route became indexable: '+route);
}
const d=read('journal/dashboard/index.html');
for(const role of ['reviewers','editors','authors','readers']){
 if(!d.includes('id="jhela-tab-'+role+'"')||!d.includes('id="jhela-panel-'+role+'"'))
   failures.push('Dashboard role tab/panel is missing: '+role);
}
if(!d.includes('Formal submissions closed')||!d.includes('No published articles'))failures.push('Dashboard founding transparency disclosure changed');
if(!exists('assets/js/jhela-portal.js'))failures.push('Accessible journal dashboard tab script is missing');
const governance=registry.origin_states||{};
if(governance.journal_subdomain!=='RESERVED_NOT_LIVE')failures.push('Journal origin state must be deliberately reviewed before release');
if(locs.some(s=>s.includes('journal.drjavadrezazadeh.com')))failures.push('Reserved subdomain is leaked into production journal locs');
// Founding interest collection is deliberately local until the authorised OJS server exists.
for(const [page,role] of [['journal/call-for-reviewers/index.html','reviewer'],['journal/founding-collaborators/index.html','editorial']]){
 const html=read(page);
 if(!html.includes('data-jhela-interest="'+role+'"'))failures.push('Founding interest form missing on '+page);
 if(!html.includes('href="mailto:dr.rezazadeh65@gmail.com'))failures.push('Non-JavaScript email fallback missing on '+page);
 if(!html.includes('jhela-intake.js'))failures.push('Interest form JS missing on '+page);
 if(/<form[^>]+action=["']https?:/i.test(html))failures.push('Unapproved external intake endpoint on '+page);
}
if(!exists('assets/js/jhela-intake.js'))failures.push('Founding interest email-draft script missing');
else{
 const intake=read('assets/js/jhela-intake.js');
 if(/\\b(?:fetch|XMLHttpRequest|localStorage|sessionStorage|indexedDB)\\b/.test(intake)) failures.push('Founding reviewer data may not be transmitted or persisted by script');
 if(!intake.includes('mailto:'))failures.push('Interim reviewer interest must use explicit email draft');
}
// Atom distribution is independent from the main site's RSS and only represents verified public calls.
const atom=read('journal/announcements.atom');
if(!atom.includes('xmlns="http://www.w3.org/2005/Atom"'))failures.push('JHELA scholarly feed is not Atom XML');
if(!atom.includes('<link rel="self" type="application/atom+xml" href="'+base+'/journal/announcements.atom"/>'))failures.push('JHELA feed self-discovery missing');
for(const route of ['/journal/call-for-reviewers/','/journal/founding-collaborators/']){
 if(!atom.includes('<id>'+base+route+'</id>'))failures.push('JHELA feed omits released scholarly invitation '+route);
}
for(const page of ['journal/index.html','journal/dashboard/index.html']){
 if(!read(page).includes('rel="alternate" type="application/atom+xml"'))failures.push('JHELA scholarly feed is undiscoverable from '+page);
}
if(atom.includes('journal.drjavadrezazadeh.com')||atom.includes('<title>Call for Papers'))failures.push('JHELA feed claims an unlaunched origin or manuscript call');

// Persian-language scholarly announcements: independently discoverable Atom, no manuscript acceptance claims.
const faFeed=read('journal/fa/announcements.atom');
if(!faFeed.includes('xmlns="http://www.w3.org/2005/Atom"')||!faFeed.includes('xml:lang="fa"'))failures.push('JHELA Persian feed must be valid-language Atom XML');
for(const route of ['/journal/fa/call-for-reviewers/','/journal/fa/founding-collaborators/']){
 if(!faFeed.includes('<id>'+base+route+'</id>'))failures.push('Persian JHELA feed lacks live founding invitation '+route);
}
for(const page of ['journal/fa/index.html','journal/fa/dashboard/index.html']){
 if(!read(page).includes('href="'+base+'/journal/fa/announcements.atom"')) failures.push('Persian JHELA Atom discovery absent from '+page);
}
if(faFeed.includes('journal.drjavadrezazadeh.com')||faFeed.includes('Call for Papers'))failures.push('Persian JHELA feed falsely claims a mature journal release');

// Persian reviewer/editorial recruitment must remain client-initiated, accessible and non-persistent.
for(const [route,role] of [['journal/fa/call-for-reviewers/index.html','reviewer'],['journal/fa/founding-collaborators/index.html','editorial']]){
 const html=read(route);
 if(!html.includes('data-jhela-interest="'+role+'"')||!html.includes('data-jhela-locale="fa"'))failures.push('Persian reviewer-interest form missing '+route);
 if(!html.includes('jhela-intake.js')||!html.includes('data-jhela-copy')||!html.includes('type="submit"'))failures.push('Persian intake lacks accessible progressive enhancement '+route);
 if(!html.includes('name="consent" required'))failures.push('Persian intake consent required '+route);
 if(!html.includes('href="mailto:dr.rezazadeh65@gmail.com'))failures.push('Persian intake has no direct email fallback '+route);
 if(/<form[^>]*\\baction=[\"']https?:/i.test(html))failures.push('Persian intake may not post to an external endpoint '+route);
}
if(!read('assets/js/jhela-intake.js').includes("dataset.jhelaLocale==='fa'"))failures.push('Persian intake locale feedback missing');

if(failures.length){
 console.error('JHELA independent publishing/discovery failures ('+failures.length+')');
 for(const failure of failures)console.error('✗ '+failure);
 process.exit(1);
}
console.log('JHELA independent journal sitemap: '+locs.length+' unique released English/Persian pages; founding disclosures, roadmap, public dashboard and reserved-host boundary PASS.');
