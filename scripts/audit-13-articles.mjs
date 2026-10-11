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
 if(/\.svg(?:$|\?)/.test(image)) warnings.push(slug+': SVG featured image; use original photographic WebP for social previews');
 if(!/\balt="[^"]{10,}"/.test(html))warnings.push(slug+': image alt needs review');
 console.log('CHECKED',slug);
}
console.log('ARTICLE COUNT',slugs.length,'ERRORS',fails,'WARNINGS',warnings.length);
for(const w of warnings)console.warn('REVIEW',w);
if(fails)process.exitCode=1;
