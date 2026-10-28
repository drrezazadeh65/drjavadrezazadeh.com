import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';

const read=path=>readFileSync(path,'utf8');
const catalog=JSON.parse(read('assets/data/service-catalog.json'));
const script=read('assets/js/jr-service-navigator-v1.js');
const css=read('assets/css/jr-service-navigator-v1.css');
const pricing=read('assets/js/service-pricing.js');
const fa=read('fa/khadamat/index.html');
const en=read('en/services/index.html');

test('navigator augments rather than replaces bilingual commercial service hubs',()=>{
 for(const [label,html,locale,canonical] of [
  ['Persian',fa,'fa','https://drjavadrezazadeh.com/fa/khadamat/'],
  ['English',en,'en','https://drjavadrezazadeh.com/en/services/']
 ]){
  assert.ok(html.includes('rel="canonical" href="'+canonical+'"'),label+' existing canonical preserved');
  assert.ok(html.includes('data-jr-service-navigator data-locale="'+locale+'"'),label+' interactive mount');
  assert.ok(html.includes('/assets/css/jr-service-navigator-v1.css?v=20261028-journey-v2'));
  assert.ok(html.includes('/assets/js/jr-service-navigator-v1.js?v=20261028-journey-v2'));
  assert.match(html,/<noscript>/);
 }
 assert.match(fa,/data-service-pricing/,'preserve original Persian catalogue pricing');
 assert.match(fa,/data-service-comparison/,'preserve original Persian comparison');
 assert.doesNotMatch(fa,/پرداخت آنلاین فعلاً غیرفعال است|رزرو و پرداخت آنلاین در این مرحله فعال نیستند|نمایش زمان‌های آزاد وجود ندارد/,'Persian services must not display retired launch-blocker messaging');
 assert.match(fa,/href="\.\.\/darkhast-moshavere\/#cw-title"/,'Existing owner-published consultation calendar is discoverable');
 assert.match(fa,/<section class="service-hero">[\s\S]*?href="\.\.\/services\/"[^>]*>مشاهده ۲۱ خدمت و تعرفه‌ها<\/a>/,'Persian editorial hub exposes real priced catalogue without JavaScript');
 assert.match(fa,/<section class="service-hero">[\s\S]*?href="\.\.\/vip\/"[^>]*>شش بسته VIP<\/a>/,'Persian editorial hub exposes existing VIP offers');
 assert.match(en,/data-jr-en-service-atlas/,'preserve crawlable English directory');
 assert.match(en,/href="\.\.\/request-consultation\/#cw-title"/,'English service hub exposes the existing seven-day owner-published request calendar');
 assert.match(en,/a preferred hour is not a held or confirmed appointment/i,'English calendar link never promises a booking');
});

test('all and only the 21 approved service IDs have both real language routes',()=>{
 assert.equal(catalog.currency,'IRT');
 const sellable=catalog.services.filter(s=>s.sellable===true);
 assert.equal(sellable.length,21);
 assert.equal(new Set(sellable.map(s=>s.id)).size,21);
 const enIds=[...en.matchAll(/href="\/en\/services\/([a-z0-9_]+)\/"/g)].map(m=>m[1]);
 const enNames=new Set(enIds);
 assert.equal(enNames.size,21,'English atlas covers all canonical services');
 for(const s of sellable){
  assert.ok(enNames.has(s.id),'English atlas missing '+s.id);
  assert.match(script,new RegExp("['\"]"+s.id+"['\"]"),'navigator taxonomy missing '+s.id);
  for(const lang of ['fa','en']){
   const file=lang+'/services/'+s.id+'/index.html';
   const html=read(file);
   assert.match(html,new RegExp('https://drjavadrezazadeh\\.com/'+lang+'/services/'+s.id+'/'),
    'frozen service route '+file);
  }
 }
});

test('the existing 21-offer pricing cards expose selected secure checkout and separate scope review',()=>{
 assert.match(pricing,/href="\/fa\/services\/checkout\/\?service='\+id\+'/,'Every service uses its own selected guarded checkout route');
 assert.match(pricing,/href="\/fa\/services\/'\+id\+'/,'Every service also retains its full details route');
 assert.match(pricing,/encodeURIComponent\(service\.id\)/,'Service keys must be encoded');
 assert.match(pricing,/x\.sellable===true&&Number\.isInteger\(x\.price\)/,'Only approved priced catalogue services may be displayed');
 assert.doesNotMatch(pricing,/\/api\/commerce\/create|gateway-send|paymentVerified\s*=\s*true/,'Editorial catalogue never performs or asserts a payment');
});
test('English 21-offer catalogue is searchable and price-sortable without replacing indexed links',()=>{
 const englishHub=read('en/services/index.html');
 const canonicalIds=catalog.services.filter(s=>s.sellable===true).map(s=>s.id);
 const atlas=englishHub.slice(englishHub.indexOf('class="jr-en-services-atlas"'));
 assert.ok(atlas.includes('data-jr-en-service-atlas'));
 for(const id of canonicalIds){
  assert.ok(atlas.includes('href="/en/services/'+id+'/"'),id+' must retain a server-rendered canonical link');
 }
 assert.match(script,/function enhanceEnglishAtlas\(map,english\)/);
 assert.match(script,/rows\.length!==canonical\.length\|\|rows\.some/);
 assert.match(script,/new Intl\.NumberFormat\('en-US'\)\.format\(service\.price\)/);
 assert.match(script,/list\.replaceChildren\(\.\.\.arranged\.map/);
 assert.match(script,/row\.li\.hidden=!match/);
 assert.match(script,/search\.addEventListener\('input',apply\)/);
 assert.match(script,/sort\.addEventListener\('change',apply\)/);
 assert.match(script,/if\(english\)enhanceEnglishAtlas\(map,english\)/);
 assert.doesNotMatch(script,/localStorage|sessionStorage|indexedDB|sendBeacon|XMLHttpRequest/);
 assert.match(css,/\.jr-en-services-atlas \.cards>li\[hidden\]/);
 assert.match(css,/@media\(max-width:650px\)/);
});
test('navigator reads source catalogue, validates IRT, and fails closed on incomplete metadata',()=>{
 assert.match(script,/fetch\('\/assets\/data\/service-catalog\.json'/);
 assert.match(script,/credentials:'omit',cache:'no-store'/);
 assert.match(script,/data\?\.currency!=='IRT'/);
 assert.match(script,/map\.size!==canonical\.length/);
 assert.match(script,/canonical\.some\(id=>!map\.has\(id\)\)/);
 assert.match(script,/english&&canonical\.some\(id=>!english\.has\(id\)\)/);
 assert.match(script,/Number\.isSafeInteger\(s\.price\)/);
 assert.match(script,/new Intl\.NumberFormat/);
 assert.match(script,/link\.href=\(isFa\?'\/fa\/services\/':'\/en\/services\/'\)\+item\.id\+'\/'/);
 assert.match(script,/encodeURIComponent\(item\.id\)/,'selected catalogue service must be safely carried into enquiry');
 assert.match(script,/dataSet|dataset\.conversionEvent|dataset\['conversionEvent'\]/i,
  'secondary service enquiry must use the established conversion intent contract');
 assert.match(css,/\.jr-service-navigator \.jr-sn-inquire/,'secondary action must have accessible styling');
 assert.doesNotMatch(script,/localStorage|sessionStorage|indexedDB|sendBeacon|XMLHttpRequest/);
 assert.doesNotMatch(script,/method:'POST'|paymentVerified\s*=\s*true|order\.state\s*=/);
 assert.match(script,/not a professional assessment/);
 assert.match(script,/not.*confirmed booking/);
});

test('premium mobile identity and accessible behaviour are implemented',()=>{
 const check=spawnSync(process.execPath,['--check','assets/js/jr-service-navigator-v1.js'],{encoding:'utf8'});
 assert.equal(check.status,0,check.stderr);
 assert.match(script,/setAttribute\('aria-live','polite'\)/);
 assert.match(script,/form\.addEventListener\('reset'/);
 assert.match(script,/cards\.replaceChildren\(\)/);
 assert.match(css,/@media\(max-width:400px\)/);
 assert.match(css,/@media\(max-width:650px\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/:focus-visible/);
 assert.match(css,/min-height:48px/);
 assert.match(css,/\.jr-service-navigator/);
});
