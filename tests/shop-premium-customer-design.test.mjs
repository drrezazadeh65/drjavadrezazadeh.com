import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const read=relative=>readFileSync(path.join(root,relative),'utf8');
const cssPath='assets/css/shop-customer-premium-20261017.css';
const css=read(cssPath);
const locales=['fa','en'];
const informational=['purchase-guide','customer-policy','receipt'];
const requiredLinks=informational;

test('isolated bilingual visual layer has mobile, keyboard and print safeguards',()=>{
 for(const marker of ['.jr-commerce-info','.jr-help-hero','.jr-help-nav__item','.jr-checkout-redesign','.checkout-links','max-width:550px','prefers-reduced-motion','@media print',':focus-visible']){
  assert.ok(css.includes(marker),marker);
 }
});

for(const locale of locales){
 for(const slug of informational){
  test(`${locale}/shop/${slug}: visual upgrade retains identity, accessibility, policy and real media`,()=>{
   const relative=`${locale}/shop/${slug}/index.html`;
   const html=read(relative);
   assert.match(html,new RegExp(`<html[^>]*lang=["']${locale}["']`));
   assert.match(html,/<meta name="viewport"/);
   assert.match(html,/<link rel="canonical"/);
   assert.match(html,/<body class="jr-commerce-info">/);
   assert.match(html,/shop-customer-premium-20261017\.css/);
   assert.equal((html.match(/<h1\b/g)||[]).length,1);
   assert.match(html,/jr-help-hero__image/);
   assert.match(html,/jr-help-nav__items/);
   assert.match(html,/<img[^>]+alt="[^"]{15,}"/);
   for(const link of requiredLinks)assert.ok(html.includes(`/${locale}/shop/${link}/`),link);
   const src=(html.match(/<figure class="jr-help-hero__image"><img src="([^"]+)/)||[])[1];
   assert.ok(src && existsSync(path.join(root,src.replace(/^\//,''))),`${relative} missing image ${src}`);
   if(slug==='receipt'){
    assert.match(html,/noindex/);
    assert.match(html,/id="receipt-form"/);
   }else{
    assert.match(html,/index,follow/);
   }
  });
 }
 test(`${locale} checkout: original client/server hooks, safeguards and visual layer survive`,()=>{
  const html=read(`${locale}/shop/checkout/index.html`);
  assert.match(html,/noindex/);
  assert.match(html,/jr-checkout-redesign/);
  assert.match(html,/jr-checkout-head__image/);
  assert.match(html,/shop-customer-premium-20261017\.css/);
  assert.match(html,/id="shipping-details"/);
  assert.match(html,/data-book-checkout/);
  assert.match(html,/data-store-error/);
  assert.equal((html.match(/<h1\b/g)||[]).length,1);
  for(const link of requiredLinks)assert.ok(html.includes(`../${link}/`),link);
  const src=(html.match(/<figure class="jr-checkout-head__image"><img src="([^"]+)/)||[])[1];
  assert.ok(src && existsSync(path.join(root,src.replace(/^\//,''))));
 });
}

test('Mirkarimi offer preserves 60/40, status gate and genuine published media',()=>{
 const html=read('fa/shop/authors/mehrab-mirkarimi/index.html');
 const stylesheet=read('assets/css/jr-future-publishing-author-v1.css');
 assert.match(html,/۴۰۰٬۰۰۰ تومان/);
 assert.match(html,/۶۰۰٬۰۰۰ تومان/);
 assert.match(html,/id="jp-digital-checkout-form"/);
 assert.match(html,/id="jp-checkout-state"/);
 assert.match(html,/jp-commercial-image/);
 assert.match(stylesheet,/\.jp-commercial-image/);
 assert.ok(!html.includes('مجوز تجاری مالک سایت صادر شده است'));
 const src=(html.match(/<figure class="jp-commercial-image"><img src="([^"]+)/)||[])[1];
 assert.ok(src && existsSync(path.join(root,src.replace(/^\//,''))));
});
