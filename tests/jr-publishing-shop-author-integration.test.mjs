import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');

test('four products remain available in the integrated bookstore without a second physical cart SKU',()=>{
 const catalog=JSON.parse(read('assets/data/book-catalog.json'));
 assert.equal(catalog.books.length,3,'Keep all three existing print books');
 const script=read('assets/js/book-store.js');
 assert.match(script,/host\.appendChild\(digitalProductCard\(\)\)/);
 assert.match(script,/digital:tefl-ma-exams-1370-1405/);
 assert.match(script,/\/api\/publishing\/offer/);
 assert.match(script,/\/shop\/authors\/mehrab-mirkarimi\/#purchase/);
 assert.doesNotMatch(script,/book_id\s*:\s*['"]digital:tefl-ma-exams-1370-1405/);
});

test('both bookstore languages expose product filters and the live digital checkout link',()=>{
 for(const lang of ['fa','en']){
  const page=read(lang+'/shop/index.html');
  assert.match(page,/data-book-catalog/);
  assert.match(page,/data-shop-filter="all"/);
  assert.match(page,/data-shop-filter="print"/);
  assert.match(page,/data-shop-filter="digital"/);
  assert.match(page,/jr-publishing-store-catalog-v1\.css/);
  assert.match(page,/book-store\.js\?v=20261020-digital-v2/);
  assert.ok(page.includes('/'+lang+'/shop/authors/mehrab-mirkarimi/'));
 }
 const css=read('assets/css/jr-publishing-store-catalog-v1.css');
 assert.match(css,/\.jr-digital-product-card/);
 assert.match(css,/\[hidden\]\{display:none!important\}/);
});

test('both indexed Mirkarimi pages publish correct Iranian rial offer data and canonical locations',()=>{
 for(const lang of ['fa','en']){
  const url='https://drjavadrezazadeh.com/'+lang+'/shop/authors/mehrab-mirkarimi/';
  const html=read(lang+'/shop/authors/mehrab-mirkarimi/index.html');
  assert.ok(html.includes('<link rel="canonical" href="'+url+'">'));
  assert.match(html,/hreflang="fa"/);
  assert.match(html,/hreflang="en"/);
  const match=html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(match);
  const graph=JSON.parse(match[1])['@graph'];
  const product=graph.find(item=>item['@type']==='Product');
  assert.equal(product.url,url);
  assert.equal(product.offers.price,'10000000','1,000,000 toman = 10,000,000 IRR');
  assert.equal(product.offers.priceCurrency,'IRR');
  assert.equal(product.sku,'digital:tefl-ma-exams-1370-1405');
  assert.ok(!('availability' in product.offers),'No static availability claim: live server controls checkout');
 }
});

test('private author dashboard remains noindex and keeps its authenticated server-backed, non-persistent reports',()=>{
 const html=read('fa/app/author/index.html');
 assert.match(html,/noindex,nofollow/);
 assert.match(html,/jr-author-workspace-v1\.js\?v=20261020-v53-authenticated-tabs/);
 const script=read('assets/js/jr-author-workspace-v1.js');
 assert.match(script,/\/api\/publishing\/author\/overview/);
 assert.match(script,/credentials:'same-origin',cache:'no-store'/);
 assert.match(script,/role','tablist/);
 assert.match(script,/downloadRecentSalesCsv/);
 assert.match(script,/data\.replaceChildren\(\);status\.hidden=false/);
 assert.doesNotMatch(script,/localStorage|sessionStorage/);
});

test('academic record pages clearly separate contributing author resource from scholarship',()=>{
 assert.ok(read('fa/entesharat-elmi/index.html').includes('مجموعه دیجیتال سؤالات ارشد آموزش زبان انگلیسی'));
 assert.ok(read('en/publications/index.html').includes('Seyyed Mehrab Mirkarimi'));
});

test('next deployment preserves the already activated production PDF workflow',()=>{
 const cli=read('api/internal/jr-publishing-activate-existing-cli.php');
 const digital=read('api/internal/jr-publishing-digital.php');
 assert.match(cli,/jr-publishing-existing-offer-activation-v2/);
 assert.match(cli,/two_private_pdfs_owner_approved/);
 assert.match(cli,/two_private_pdfs_readable/);
 assert.match(cli,/original_pdf_hashes/);
 assert.doesNotMatch(cli,/getenv\('JR_PUBLISHING_ANTIVIRUS_COMPLETE'\)/);
 assert.match(digital,/JR_PUB_ORIGINAL_ASSETS/);
 assert.match(digital,/AND approved_at IS NOT NULL/);
 assert.doesNotMatch(digital,/AND approved_at IS NOT NULL AND malware_scanned_at IS NOT NULL/);
 assert.match(digital,/hash_file\('sha256',\$file\)/);
 assert.match(digital,/jrPubCommitVerifiedDigitalOrder/);
 assert.match(digital,/jrPubDownloadRoute/);
});
