import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=p=>readFileSync(p,'utf8');

test('the public footer exposes the owner-facing 5.1.0 version, never internal cache SHA',()=>{
 const s=source('assets/js/site-footer-meta-2026.js');
 assert.match(s,/data\.jrPublicVersion='5\.1\.0'/);
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
 assert.match(css,/\.bookstore-hero-stage\{order:-1/);
 assert.match(css,/\.book-product-card \.book-cover img/);
 assert.match(css,/@media\(max-width:350px\)/);
 assert.doesNotMatch(css,/overflow-x\s*:\s*hidden/);
 for(const locale of ['fa','en']){
  const html=source(locale+'/shop/index.html');
  assert.match(html,/store-premium-editorial-2026\.css\?v=20261016-mobile-v2/);
  assert.match(html,/data-book-catalog/);
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
