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

for(const locale of locales){
 test(locale+' cart trust links are full touch targets with approved site imagery',()=>{
  const html=read(locale+'/shop/cart/index.html');
  for(const marker of ['jr-cart-redesign','jr-cart-hero__visual','class="cart-trust-links"','data-book-cart','data-store-error','noindex'])assert.ok(html.includes(marker),marker);
  for(const target of [...requiredLinks,'checkout'])assert.ok(html.includes('../'+target+'/'),target);
  const src=(html.split('<figure class="jr-cart-hero__visual"><img src="')[1]||'').split('"')[0];
  assert.ok(src.startsWith('/') && existsSync(path.join(root,src.slice(1))));
 });
}
test('premium CSS styles cart actions in RTL and LTR',()=>{
 assert.ok(css.includes('.jr-cart-redesign .cart-trust-links'));
 assert.ok(css.includes('html[lang="en"] .jr-cart-redesign'));
});

test('mobile app icon shells never render oversized on desktop standalone help pages',()=>{
 const mobile=read('assets/css/mobile-app-v431.css');
 const boot=read('assets/js/mobile-app-v431.js');
 for(const marker of ['.app-dock{display:none}','@media(min-width:901px)',".app-dock,.mobile-menu-trigger{display:none!important}",'fill:none','max-width:22px','.mobile-app-sheet[hidden]{display:none!important}','@media(max-width:900px)']){
  assert.ok(mobile.includes(marker),'missing app-shell invariant: '+marker);
 }
 assert.ok(boot.includes('mobile-app-v431.css?v=431c'),'shell fallback cache version');
 for(const locale of locales){
  for(const slug of informational){
   const html=read(locale+'/shop/'+slug+'/index.html');
   assert.ok(html.includes('mobile-app-v431.css?v=431c'),locale+'/'+slug+' missing corrected mobile stylesheet cache key');
  }
 }
});
test('author intro contains a real approved editorial visual instead of unexplained initials',()=>{
 const html=read('fa/shop/authors/mehrab-mirkarimi/index.html');
 const stylesheet=read('assets/css/jr-future-publishing-author-v1.css');
 assert.ok(html.includes('jp-author-visual'));
 assert.ok(!html.includes('>م.م</div>'));
 assert.ok(stylesheet.includes('.jp-author-card .jp-author-visual img'));
 const src=(html.split('class="jp-avatar jp-author-visual"><img src="')[1]||'').split('"')[0];
 assert.ok(src.startsWith('/') && existsSync(path.join(root,src.slice(1))));
});

test('social preview image matches visible licensed hero on bilingual customer pages',()=>{
 for(const locale of locales){
  for(const slug of informational){
   const html=read(locale+'/shop/'+slug+'/index.html');
   const pathFromHero=(html.match(/<figure class="jr-help-hero__image"><img src="([^"]+)/)||[])[1];
   const expected='https://drjavadrezazadeh.com'+pathFromHero;
   assert.ok(pathFromHero?.startsWith('/assets/images/editorial-launch/'),locale+'/'+slug+' approved media');
   assert.ok(html.includes('<meta property="og:image" content="'+expected+'">'),locale+'/'+slug+' OG preview');
   assert.ok(html.includes('<meta name="twitter:image" content="'+expected+'">'),locale+'/'+slug+' social preview');
   assert.match(html,/<meta property="og:image:alt" content="[^"]{10,}">/);
  }
 }
});
