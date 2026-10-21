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
 assert.match(en,/700,000 tomans/);
 assert.match(en,/300,000 tomans/);
 assert.match(en,/independent scholarly review/);
 assert.match(en,/checks the existing payment service, protected PDFs/);
 assert.match(en,/A separate author-licence submission is no longer a technical checkout requirement/);
 assert.match(en,/does not itself establish copyright ownership or certify distribution rights/);
 assert.doesNotMatch(en,/require a verified contributor licence/);
 assert.doesNotMatch(en,/<a[^>]+href="[^"]+\.pdf/i);
 // Both public languages now expose one server-gated form; neither may charge
 // until the authoritative offer endpoint proves delivery and gateway readiness.
 for(const page of [en,fa]){
  assert.match(page,/<form id="jp-digital-checkout-form"[^>]*hidden/);
  assert.match(page,/id="jp-offer-badge"/);
  assert.match(page,/id="jp-checkout-state"[^>]*role="status"/);
  assert.match(page,/id="jp-recheck-offer"/);
  assert.match(page,/jr-publishing-checkout-v1\.js/);
  assert.match(page,/method="post" action="\/api\/commerce\/create"/);
  assert.match(page,/<noscript>/);
  assert.match(page,/aria-describedby="jp-purchase-readiness"/);
 }
 assert.match(en,/id="jp-pay-now"[^>]*type="submit" disabled/);
 assert.match(en,/href="\/en\/shop\/customer-policy\/"/);
 const checkout=read('assets/js/jr-publishing-checkout-v1.js');
 assert.match(checkout,/\/api\/publishing\/offer/);
 assert.match(checkout,/\/api\/commerce\/create/);
 assert.match(checkout,/setOfferReady\(false\)/);
 assert.match(checkout,/j\.checkoutEnabled===true&&j\.available===true/);
 assert.match(checkout,/j\.sku==='digital:tefl-ma-exams-1370-1405'/);
 assert.match(checkout,/j\.priceToman===1000000/);
 assert.match(checkout,/dest\.origin!==location\.origin/);
 assert.match(checkout,/busy=true;pay\.disabled=true/);
 assert.match(en,/@media\(max-width:800px\)/);
 assert.match(en,/:focus-visible/);
 assert.match(en,/prefers-reduced-motion/);
 assert.match(en,/fetchpriority="high"/);
 assert.ok(read('sitemap-en.xml').includes(EN));
 assert.ok(JSON.parse(read('assets/search-index.json')).some(entry=>entry.path==='en/shop/authors/mehrab-mirkarimi/'));
 assert.ok(read('platform/hreflang-pairs.json').includes('author-mehrab-mirkarimi'));
 assert.ok(read('scripts/build-public-site.mjs').includes("approvedEnglishAuthorPage='en/shop/authors/mehrab-mirkarimi/index.html'"));
});

test('author portrait and first rank are contextualized in bilingual public metadata and hero',()=>{
 assert.match(fa,/<title>[^<]*رتبه نخست کنکور ارشد/);
 assert.match(en,/<title>[^<]*First-Place 2026 ELT MA Rank/);
 assert.match(fa,/مطابق رزومه اعلام‌شده مؤلف/);
 assert.match(en,/As stated in the author's CV/);
 assert.match(fa,/class="jr-author-spotlight"/);
 assert.match(en,/class="jr-author-spotlight"/);
 assert.match(fa,/هیچ ادعایی مبنی بر تأیید سازمان سنجش یا تضمین قبولی در آزمون ندارد/);
 assert.match(en,/do not guarantee admission|do not guarantee acceptance|does not guarantee admission/i);
});
// The English author profile must be reachable and eligible for the frozen public URL inventory.
test('v5.2 new English author page has public bookstore entry and approved stable URL',()=>{
 const shop=read('en/shop/index.html');
 const search=read('assets/search-index.json');
 const stable=JSON.parse(read('platform/public-url-stability-manifest.json'));
 const route='/en/shop/authors/mehrab-mirkarimi/';
 assert.ok(shop.includes('href="'+route+'"'));
 assert.ok(stable.frozen_indexable_routes.includes(route));
 assert.ok(stable.approved_addition_20261018_english_author.routes.includes(route));
 assert.ok(!en.includes('server-authoritative'));
 assert.ok(!search.includes('legal sale readiness'));
});


test('owner-directed scoped scientific review is explicit and public author-dashboard entry is removed',()=>{
 assert.match(fa,/مورد ارزیابی و تأیید علمی دکتر جواد رضازاده یزدلی قرار گرفته است/);
 assert.match(fa,/بررسی جزئی همه پاسخ‌های مجموعه در جریان است/);
 assert.match(en,/scientific evaluation and approval by Dr[.] Javad Rezazadeh Yazdeli/);
 assert.match(en,/Independent answer-by-answer verification remains incomplete/);
 for(const source of [fa,en]){
   assert.doesNotMatch(source,/href="\/fa\/app\/author\/"/);
   assert.doesNotMatch(source,/ورود به داشبورد مؤلف|ورود مؤلفان/);
   assert.match(source,/name="robots" content="index,follow/);
 }
 // Removing public CTAs must never disable or expose the actual author workspace.
 const privatePage=read('fa/app/author/index.html');
 assert.match(privatePage,/name="robots" content="noindex,nofollow/);
 assert.match(privatePage,/jr-author-workspace-v1[.]js/);
 assert.match(read('api/publishing.php'),/verified author-only/i);
});
