/* v5.2: scoped, evidence-aware author-page visual identity regression tests. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const css=read('assets/css/jr-author-premium-v52.css');
for(const [language,page] of [['fa','fa/shop/authors/mehrab-mirkarimi/index.html'],['en','en/shop/authors/mehrab-mirkarimi/index.html']]){
 test(language+' author page uses premium 5.2 styling without changing financial or search contracts',()=>{
  const html=read(page);
  assert.match(html,/class="jr-pub jp-pub-v52"/);
  assert.match(html,/jr-author-premium-v52\.css\?v=20261018-editorial-v1/);
  assert.ok(html.indexOf('jr-author-premium-v52.css')>html.indexOf('jr-future-publishing-author-v1.css'));
  assert.match(html,/class="jp-breadcrumb"/);
  assert.match(html,/class="jp-section-index jp-container"/);
  assert.match(html,/class="jp-cover-feature/);
  assert.match(html,/bookstore-talent-cinematic-approved-original-20261011\.png/);
  assert.match(html,/href="\/(?:fa|en)\/shop\/"/);
  assert.doesNotMatch(html,/<a[^>]+href="[^"]+\.pdf/i);
  assert.match(html,/name="robots" content="index,follow/);
  assert.match(html,/hreflang="fa"/);assert.match(html,/hreflang="en"/);
  assert.ok(html.includes('jp-app-dock'));
 });
}
test('owner design palette, genuine mobile breakpoints, reduced motion and accessible navigation',()=>{
 for(const token of ['#0b0b0b','#d4af37','#f8f5e9','--jp52-rule','.jp-cover-feature','.jp-section-index','.jp-app-dock',':focus-visible',
  '@media(max-width:1040px)','@media(max-width:800px)','@media(max-width:700px)','@media(max-width:390px)',
  '@media(prefers-reduced-motion:reduce)'])assert.ok(css.includes(token),'missing '+token);
 assert.match(css,/\.jp-pub-v52/);
 assert.doesNotMatch(css,/\.book-store-shell/);
 assert.doesNotMatch(css,/\.jr-checkout-redesign/);
 const fa=read('fa/shop/authors/mehrab-mirkarimi/index.html');
 assert.doesNotMatch(fa,/class="jp-book-scene"/);
 assert.match(fa,/نه جلد نهایی کتاب یا تصویر مؤلف/);
 const en=read('en/shop/authors/mehrab-mirkarimi/index.html');
 assert.match(en,/approved editorial illustration, not a portrait/i);
 assert.match(en,/aria-label="Mobile publishing navigation"/);
});

test('scoped public release artifact requires the actual premium stylesheet and bilingual author routes',()=>{
 const build=read('scripts/build-public-site.mjs');
 for(const file of ['assets/css/jr-author-premium-v52.css','fa/shop/authors/mehrab-mirkarimi/index.html','en/shop/authors/mehrab-mirkarimi/index.html','assets/images/bookstore-talent-cinematic-approved-original-20261011.png'])
  assert.ok(build.includes("'"+file+"'"),'build missing '+file);
});

test('approved original PNG remains fallback while mobile browsers prefer a smaller WebP variant',()=>{
 for(const path of ['fa/shop/authors/mehrab-mirkarimi/index.html','en/shop/authors/mehrab-mirkarimi/index.html']){
  const html=read(path);
  assert.match(html,/<picture><source type="image\/webp" srcset="\/assets\/images\/bookstore-talent-cinematic-approved-20261011.webp">/);
  assert.match(html,/<img src="\/assets\/images\/bookstore-talent-cinematic-approved-original-20261011.png"/);
 }
 assert.match(css,/\.jp-cover-feature--en>picture img/);
});
