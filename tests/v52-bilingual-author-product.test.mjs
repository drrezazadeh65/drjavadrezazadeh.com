import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const en=read('en/shop/authors/mehrab-mirkarimi/index.html');
const fa=read('fa/shop/authors/mehrab-mirkarimi/index.html');
const FA='https://drjavadrezazadeh.com/fa/shop/authors/mehrab-mirkarimi/';
const EN='https://drjavadrezazadeh.com/en/shop/authors/mehrab-mirkarimi/';
test('bilingual author and educational product use reciprocal canonicals and stable shared entities',()=>{
 for(const [source,url,alternate] of [[en,EN,FA],[fa,FA,EN]]){
  assert.ok(source.includes('<link rel="canonical" href="'+url+'">'));
  assert.ok(source.includes('<link rel="alternate" hreflang="fa" href="'+FA+'">'));
  assert.ok(source.includes('<link rel="alternate" hreflang="en" href="'+EN+'">'));
  assert.ok(source.includes('<link rel="alternate" hreflang="x-default" href="'+EN+'">'));
 }
 assert.ok(en.includes(FA+'#person'));
 assert.ok(en.includes(FA+'#digital-collection'));
 assert.match(en,/lang="en" dir="ltr"/);
 assert.match(fa,/lang="fa" dir="rtl"/);
});
test('English publication stays source-honest, sale-gated and responsive',()=>{
 assert.match(en,/425 pages/);
 assert.match(en,/572 pages/);
 assert.match(en,/997 pages/);
 assert.match(en,/1,000,000 tomans/);
 assert.match(en,/600,000 tomans/);
 assert.match(en,/400,000 tomans/);
 assert.match(en,/independent scholarly review/);
 assert.match(en,/currently being prepared for lawful digital distribution/);
 assert.doesNotMatch(en,/<a[^>]+href="[^"]+\.pdf/i);
 assert.doesNotMatch(en,/type="submit"|<form\b/i);
 assert.match(en,/@media\(max-width:800px\)/);
 assert.match(en,/:focus-visible/);
 assert.match(en,/prefers-reduced-motion/);
 assert.match(en,/fetchpriority="high"/);
 assert.ok(read('sitemap-en.xml').includes(EN));
 assert.ok(read('platform/hreflang-pairs.json').includes('author-mehrab-mirkarimi'));
 assert.ok(read('scripts/build-public-site.mjs').includes("approvedEnglishAuthorPage='en/shop/authors/mehrab-mirkarimi/index.html'"));
});
