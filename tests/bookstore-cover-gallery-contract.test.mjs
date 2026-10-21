import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const read=p=>readFileSync(p,'utf8');
const source=read('assets/js/book-store.js');
const css=read('assets/css/jr-book-cover-gallery-v1.css');
const catalog=JSON.parse(read('assets/data/book-catalog.json'));

test('front and back artwork is authentic and available for all published titles',()=>{
 assert.equal(catalog.books.length,3,'respect the existing three genuine published works');
 for(const book of catalog.books){
  assert.equal(book.publication_status,'PUBLISHED',book.id);
  assert.deepEqual(book.commerce.formats_confirmed,['PRINT'],'never invent an ebook');
  for(const key of ['cover_image','back_cover_image']){
   const path=book.bibliography[key];
   assert.match(path,/^\/assets\/images\/books\/[a-z0-9][a-z0-9._-]*\.(?:avif|webp|png|jpe?g)$/i);
   assert.ok(existsSync(path.slice(1)),book.id+' missing approved '+key);
  }
  assert.match(book.bibliography.isbn,/^\d{13}$/);
  assert.ok(Number.isInteger(book.bibliography.publication_year));
  assert.ok(Number.isInteger(book.commerce.price)&&book.commerce.price>0);
 }
});

test('gallery augments original book cards, and does not replace checkout or payment authority',()=>{
 const start=source.indexOf(' function card(book){');
 const end=source.indexOf(' function renderDetail(data){',start);
 assert.ok(start>0&&end>start,'existing card rendering remains');
 const card=source.slice(start,end);
 for(const feature of ['bookCoverUrl(book)','bookBackUrl(book)','jr-book-card-gallery',
  'data-book-gallery-image','data-book-gallery-view="front"','data-book-gallery-view="back"',
  'aria-pressed="true"','aria-pressed="false"',".querySelector('[data-book-gallery-image]')",
  "button.setAttribute('aria-pressed',String(button===toggle))"])
  assert.ok(card.includes(feature),feature);
 assert.match(card,/cardBibliography\(book\)/);
 assert.match(card,/data-add-book/);
 assert.match(card,/book\.description_fa:book\.description_en/);
 assert.match(source,/function verifyBookPaymentCapability/);
 assert.match(source,/capabilities\?\.books===true/);
 assert.match(source,/method:'POST'/);
 assert.match(source,/function readCart/);
 const check=spawnSync(process.execPath,['--check','assets/js/book-store.js'],{encoding:'utf8'});
 assert.equal(check.status,0,check.stderr);
});

test('both bilingual shop pages use the gallery without URL and metadata regressions',()=>{
 for(const [lang,file] of [['fa','fa/shop/index.html'],['en','en/shop/index.html']]){
  const html=read(file);
  assert.ok(html.includes('href="https://drjavadrezazadeh.com/'+lang+'/shop/"'),'existing self-canonical '+lang);
  assert.ok(html.includes('/assets/css/jr-book-cover-gallery-v1.css?v=20261019-cover-gallery-v1'));
  assert.ok(html.includes('book-store.js?v=20261020-digital-v2'));
  assert.ok(html.includes('data-book-catalog'),'existing book catalogue');
  assert.match(html,/id="book-catalog"/);
  assert.match(html,/href="(?:\.\/)?cart\/"/);
 }
 for(const marker of ['.jr-book-card-gallery','.jr-book-gallery-footer','.jr-book-gallery-actions',
  'aria-pressed="true"','max-width:400px','prefers-reduced-motion:reduce',':focus-visible','@media print'])
  assert.ok(css.includes(marker),marker);
 assert.match(css,/min-height:48px/);
});
