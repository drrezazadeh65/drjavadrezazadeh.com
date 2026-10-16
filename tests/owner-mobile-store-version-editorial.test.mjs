import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=p=>readFileSync(p,'utf8');

test('the public footer exposes the owner-facing 5.1.0 version, never internal cache SHA',()=>{
 const s=source('assets/js/site-footer-meta-2026.js');
 assert.ok(s.includes("version.dataset.jrPublicVersion='5.1.0'"));
 assert.match(s,/نسخه وب‌سایت: ۵\.۱\.۰/);
 assert.match(s,/Website version: 5\.1\.0/);
 assert.doesNotMatch(s,/fetch\('\/sw\.js'/);
 assert.doesNotMatch(s,/CACHE_VERSION\s*=/);
 assert.doesNotMatch(s,/Technical build ID:/);
});

test('permanent bottom-dock install control retains five other tabs in each locale',()=>{
 const s=source('assets/js/mobile-app-v431.js');
 assert.match(s,/data-jr-dock-install/);
 assert.match(s,/jrPwaRequest/);
 assert.match(s,/appinstalled/);
 assert.match(s,/repeat\(6,minmax\(0,1fr\)\)/);
 assert.match(s,/prefers-reduced-motion/);
 assert.match(s,/safe-area-inset-bottom/);
 assert.match(s,/Share, then Add to Home Screen/);
 assert.match(s,/Install app or Add to Home Screen/);
 assert.match(s,/if\(installControl\)/);
 assert.match(s,/const installControl=isInstalled\?/);
 const area=s.slice(s.indexOf('const tabs=isFa?['),s.indexOf('const sheet=isFa?['));
 assert.equal((area.match(/\[u\('fa\//g)||[]).length,5);
 assert.equal((area.match(/\[u\('en\//g)||[]).length,5);
});

test('official bookstore styles are mobile-first without synthetic covers or extra payment promises',()=>{
 const css=source('assets/css/store-premium-editorial-2026.css');
 assert.match(css,/JR Store mobile-first couture finishing pass/);
 assert.match(css,/\.cinema-original-hero \.cinema-hero-picture/);
 assert.match(css,/\.cinema-original-hero \.cinema-hero-copy/);
 assert.match(css,/\.cinema-original-hero \.cinema-hero-nav/);
 assert.match(css,/\.bookstore-hero-stage/);
 assert.match(css,/\.bookstore-hero-art/);
 assert.match(css,/\.book-product-card \.book-cover img/);
 assert.match(css,/@media\(max-width:350px\)/);
 assert.doesNotMatch(css,/overflow-x\s*:\s*hidden/);
 for(const locale of ['fa','en']){
  const html=source(locale+'/shop/index.html');
  assert.match(html,/store-premium-editorial-2026\.css\?v=20261016-mobile-v2/);
  assert.match(html,/data-book-catalog/);
  if(locale==='fa'){
    assert.match(html,/class="book-store-hero talent-hero cinema-original-hero"/);
    for(const cls of ['cinema-hero-picture','cinema-hero-copy','cinema-hero-nav'])
      assert.ok(html.includes(cls),cls);
  }else{
    assert.match(html,/class="book-store-hero talent-hero"/);
    for(const cls of ['bookstore-hero-stage','bookstore-hero-art','store-nav'])
      assert.ok(html.includes(cls),cls);
  }
 }
});

test('institutional biography and academic pages use editorial third person',()=>{
 const cases=[
 ['fa/darbare-man/index.html',/مسیر حرفه‌ای دکتر جواد رضازاده یزدلی/],
 ['fa/index.html',/در رویکرد حرفه‌ای دکتر رضازاده یزدلی/],
 ['fa/faaliat-haye-elmi/index.html',/در تجربه علمی دکتر رضازاده یزدلی/],
 ['fa/amoozesh-zaban/index.html',/رویکرد دکتر رضازاده یزدلی به آموزش زبان/],
 ['fa/tadris/index.html',/در نگاه آموزشی او/],
 ['fa/pajouhesh/index.html',/پژوهش‌های دکتر رضازاده یزدلی/],
 ['en/academic-profile/index.html',/in Dr\. Rezazadeh Yazdeli’s work/]
 ];
 for(const [p,pattern] of cases)assert.match(source(p),pattern,p);
 for(const route of ['fa/index.html','fa/darbare-man/index.html']){
  const html=source(route);
  assert.doesNotMatch(html,/درباره من/);
  assert.match(html,/درباره دکتر رضازاده/);
  assert.match(html,/darbare-man\//);
 }
 for(const asset of ['assets/js/site.js','assets/js/mobile-app-v431.js']){
  const script=source(asset);
  assert.doesNotMatch(script,/درباره من/);
  assert.match(script,/درباره دکتر رضازاده/);
 }
 // The personal philosophy/poetry and private user-facing prompts are NOT rewritten.
});

test('three book bibliographic fields remain truthful until imprint evidence',()=>{
 const c=JSON.parse(source('platform/book-catalog.json'));
 assert.equal(c.books.length,3);
 for(const b of c.books){
   assert.equal(b.publication_status,'PUBLISHED');
   for(const key of ['publisher','isbn','publication_year','edition'])
     assert.equal(b.bibliography[key],null,'Unverified '+b.id+':'+key+' must not be fabricated');
 }
});

test('bilingual published-book identity follows the canonical catalogue and third-person author copy',()=>{
 const books=JSON.parse(source('platform/book-catalog.json')).books;
 const first=books.find(b=>b.id==='roshanaei');
 assert.equal(first?.title_fa,'سپید');
 assert.equal(first?.english_reference_title,'Sepid');
 const fa=source('fa/ketab-ha/index.html'),en=source('en/books/index.html');
 assert.match(fa,/سه کتابی که پیش از پروژه‌های فعلی منتشر شده‌اند/);
 assert.match(fa,/<h3>سپید<\/h3>/);
 assert.match(en,/<h3 lang="fa" dir="rtl">سپید<\/h3>/);
 assert.match(en,/<em>Sepid<\/em>/);
 for(const book of books){
  const faTitle='<h3>'+book.title_fa+'</h3>';
  const enTitle='<h3 lang="fa" dir="rtl">'+book.title_fa+'</h3>';
  assert.ok(fa.includes(faTitle),'Persian public books must agree with catalogue: '+book.id);
  assert.ok(en.includes(enTitle),'English public books must agree with catalogue: '+book.id);
 }
 assert.doesNotMatch(fa,/<h3>سپیدی<\/h3>|نوشتن برای من|نوشتار شخصی من|این سه را یکی نمی‌کنم|درباره من/);
 assert.doesNotMatch(en,/<h3 lang="fa" dir="rtl">سپیدی<\/h3>|<em>Sepidi<\/em>|My writing|my writing|I keep these/);
 // Book projects under preparation remain distinct from published books.
 assert.match(fa,/ما در رخ او تو را می‌جستیم/);
 assert.match(en,/ما در رخ او تو را می‌جستیم/);
});
