import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';

const read=path=>readFileSync(path,'utf8');
const catalog=JSON.parse(read('assets/data/service-catalog.json'));
const script=read('assets/js/jr-service-navigator-v1.js');
const css=read('assets/css/jr-service-navigator-v1.css');
const fa=read('fa/khadamat/index.html');
const en=read('en/services/index.html');

test('navigator augments rather than replaces bilingual commercial service hubs',()=>{
 for(const [label,html,locale,canonical] of [
  ['Persian',fa,'fa','https://drjavadrezazadeh.com/fa/khadamat/'],
  ['English',en,'en','https://drjavadrezazadeh.com/en/services/']
 ]){
  assert.ok(html.includes('rel="canonical" href="'+canonical+'"'),label+' existing canonical preserved');
  assert.ok(html.includes('data-jr-service-navigator data-locale="'+locale+'"'),label+' interactive mount');
  assert.ok(html.includes('/assets/css/jr-service-navigator-v1.css?v=20261019-v1'));
  assert.ok(html.includes('/assets/js/jr-service-navigator-v1.js?v=20261019-v1'));
  assert.match(html,/<noscript>/);
 }
 assert.match(fa,/data-service-pricing/,'preserve original Persian catalogue pricing');
 assert.match(fa,/data-service-comparison/,'preserve original Persian comparison');
 assert.match(en,/data-jr-en-service-atlas/,'preserve crawlable English directory');
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
