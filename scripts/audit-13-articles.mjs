#!/usr/bin/env node
// Release guard for the 13 published Persian academic-launch articles.
// Run: node scripts/audit-13-articles.mjs
import fs from 'node:fs';
import path from 'node:path';
const slugs = [
  "academic-research-editing-services-2026",
  "ai-search-and-scientific-content-2026",
  "bookstore-books-and-student-support-2026",
  "customer-dashboard-one-account-2026",
  "ecosystem-education-research-2026",
  "educational-guidance-evidence-based-2026",
  "golden-talent-developmental-framework-2026",
  "how-to-use-educational-services-2026",
  "humanability-language-assessment-framework-2026",
  "international-research-collaboration-2026",
  "professional-services-public-guide-2026",
  "support-talented-students-opportunity-2026",
  "teacher-schools-professional-learning-2026"
];
const root = process.cwd();
const host = 'https://drjavadrezazadeh.com';
let fails = 0;
const warnings = [];
for (const slug of slugs) {
 const file = path.join(root,'fa','akhbar',slug,'index.html');
 if (!fs.existsSync(file)) {console.error('MISSING',file); fails++;continue;}
 const html = fs.readFileSync(file,'utf8');
 const expected = host+'/fa/akhbar/'+slug+'/';
 const extract = (re) => html.match(re)?.[1] || '';
 const canonical = extract(/<link\s+rel="canonical"\s+href="([^"]+)"/);
 const ogUrl = extract(/<meta\s+property="og:url"\s+content="([^"]+)"/);
 const image = extract(/<img\b[^>]*\bsrc="([^"]+)"/);
 const ogImage = extract(/<meta\s+property="og:image"\s+content="([^"]+)"/);
 const description = extract(/<meta\s+name="description"\s+content="([^"]+)"/);
 const title = extract(/<title>([^<]+)<\/title>/);
 const schemas = [...html.matchAll(/<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
 function check(test, msg) {if(!test){console.error('FAIL',slug,msg);fails++;}}
 check(canonical===expected,'canonical mismatch');
 check(ogUrl===expected,'og:url mismatch');
 check(title.length>=25,'missing/short title');
 check(description.length>=55,'missing/short description');
 check(/<html\s+lang="fa"/.test(html),'missing fa language');
 check(/<h1\b[^>]*>/.test(html),'no H1');
 check(/name="robots"\s+content="[^"]*index,follow/.test(html),'indexable robots missing');
 check(schemas.length>0,'missing JSON-LD');
 for(const m of schemas){try{const j=JSON.parse(m[1]);check(JSON.stringify(j).includes(expected),'JSON-LD URL missing')}catch{check(false,'invalid JSON-LD')}}
 check(image.startsWith('/assets/'),'missing/local featured image');
 if(image.startsWith('/')) check(fs.existsSync(path.join(root,image.slice(1))),'featured image absent');
 check(ogImage===host+image,'OG and displayed image mismatch');
 check(/\.webp$/i.test(image),'featured image must be an approved WebP asset');
 check(/\.webp$/i.test(ogImage),'Open Graph article image must be WebP');
 check(html.includes('og:image:alt'),'missing OG image alt');
 if(!/\balt="[^"]{10,}"/.test(html))warnings.push(slug+': image alt needs review');
 const rail = html.match(/<aside class="launch-service-sidebar"[\s\S]*?<\/aside>/)?.[0] || '';
 check(rail.length>200,'missing scholarly-commerce sidebar');
 check((rail.match(/<section\b/g)||[]).length===3,'sidebar must contain service, bookstore and related reading');
 check(rail.includes('launch-offer') && rail.includes('launch-shop-unit') && rail.includes('launch-related-reading'),'sidebar missing structured offer/shop/reading cards');
 check(html.includes('editorial-launch-2026.css?v=20261011-commerce-v3'),'stylesheet cache key not updated');
 for(const [,href] of rail.matchAll(/href="([^"]+)"/g)){
   if(!href.startsWith('/')) {check(false,'unexpected sidebar URL: '+href);continue;}
   const local = path.join(root,href.slice(1));
   check(fs.existsSync(local) || fs.existsSync(path.join(local,'index.html')),'unresolved contextual link: '+href);
   check(href!=='/fa/akhbar/'+slug+'/','self-reference in contextual recommendations');
 }
 for(const [,src] of rail.matchAll(/<img[^>]+src="([^"]+)"/g)){
   check(src.startsWith('/assets/images/'),'non-local sidebar media');
   if(src.startsWith('/')) check(fs.existsSync(path.join(root,src.slice(1))),'missing sidebar asset: '+src);
 }
 console.log('CHECKED',slug);
}
 const indexHtml=fs.readFileSync(path.join(root,'fa','akhbar','index.html'),'utf8');
for(const slug of slugs){
 const card=indexHtml.match(new RegExp('<a class="news-card" href="\\./'+slug+'/">([\\s\\S]*?)<\\/a>'))?.[1]||'';
 if(!card) {console.error('FAIL news index missing card',slug);fails++;continue;}
 if(!/\.webp"/.test(card)){console.error('FAIL news card not WebP',slug);fails++;}
}
console.log('ARTICLE COUNT',slugs.length,'ERRORS',fails,'WARNINGS',warnings.length);
for(const w of warnings)console.warn('REVIEW',w);
if(fails)process.exitCode=1;
