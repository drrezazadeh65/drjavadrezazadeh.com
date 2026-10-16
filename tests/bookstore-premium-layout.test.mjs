import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd(),read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('premium bookstore stylesheet is present, scoped and touch/responsive safe',()=>{
 const css=read('assets/css/store-premium-editorial-2026.css');
 assert.match(css,/\.book-store-shell \.book-store-grid/);
 assert.match(css,/\.book-store-shell \.book-product-card/);
 assert.match(css,/\.book-store-shell\s+\.book-product-card\s+\.book-cover/);
 assert.match(css,/@media\(max-width:1040px\)/);
 assert.match(css,/@media\(max-width:690px\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/:focus-visible/);
 assert.doesNotMatch(css,/display\s*:\s*none\s*!important/i);
 assert.doesNotMatch(css,/position\s*:\s*fixed/i);
});
test('Persian and English catalogues retain their verified public identity and commerce contracts',()=>{
 for(const lang of ['fa','en']){
  const source=read(lang+'/shop/index.html');
  assert.match(source,new RegExp('<html lang="'+lang+'"'));
  assert.match(source,new RegExp('rel="canonical" href="https://drjavadrezazadeh.com/'+lang+'/shop/"'));
  assert.match(source,/hreflang="fa"/);assert.match(source,/hreflang="en"/);
  assert.match(source,/<div class="book-store-grid" data-book-catalog><\/div>/);
  assert.match(source,/data-cart-count/);
  assert.match(source,/data-support-form/);
  assert.match(source,/assets\/js\/book-store\.js/);
  assert.match(source,/assets\/js\/donation-payment\.js/);
  assert.match(source,/assets\/css\/store-premium-editorial-2026\.css/);
  assert.ok(source.indexOf('store-premium-editorial-2026.css')>source.indexOf('jr-ecosystem-design-v2.css'));
 }
});
test('approved hero images and their meaningful text alternatives are unchanged',()=>{
 const fa=read('fa/shop/index.html'),en=read('en/shop/index.html');
 assert.match(fa,/bookstore-talent-cinematic-approved-original-20261011\.png/);
 assert.match(en,/bookstore-talent-approved-scene-20261011\.webp/);
 assert.match(fa,/alt="بنر سینمایی تأییدشده فروشگاه کتاب/);
 assert.match(en,/alt="The approved cinematic image:/);
});
