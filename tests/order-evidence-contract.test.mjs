import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';

const read=path=>readFileSync(path,'utf8');
const script=read('assets/js/account-order-history.js');
const css=read('assets/css/jr-order-evidence-v1.css');
const api=read('api/index.php');
const pages=[
 ['fa','fa/app/account/orders/index.html'],
 ['en','en/account/orders/index.html']
];

test('one authenticated history drives evidence-only overview; bank settlement is never inferred',()=>{
 assert.match(script,/function updateEvidenceOverview\(orders\)/);
 assert.match(script,/const count=orders\.length/);
 assert.match(script,/o\?\.state==='paid'&&o\.paymentVerified===true/);
 assert.match(script,/\['created','pending','paid'\]\.includes\(o\.state\)/);
 assert.match(script,/summary\.dataset\.evidenceSource='owner-scoped-history'/);
 assert.match(script,/updateEvidenceOverview\(data\.orders\)/);
 assert.match(script,/if\(res\.status===401\)/);
 assert.match(script,/if\(data\?\.ok!==true\|\|!Array\.isArray\(data\.orders\)\)/);
 assert.match(script,/No verifiable fulfilment event was returned/);
 assert.match(script,/not bank settlement|not bank settlement|Bank settlement|bank settlement/i);
 assert.doesNotMatch(script,/localStorage\.setItem\(|sessionStorage\.setItem\(/);
 assert.match(api,/if\(\$path==='\/commerce\/history'&&\$verb==='GET'\)/);
 assert.match(api,/LIMIT 50/);
 assert.match(api,/commerce_payment_claims/);
 assert.match(api,/sessionAccount\(\$pdo\)/);
});

test('per-order stages never assert delivery or receipt from a gateway return',()=>{
 assert.match(script,/function createOrderEvidence\(order\)/);
 assert.match(script,/aria-label/);
 assert.match(script,/jr-order-evidence-list/);
 assert.match(script,/jr-order-evidence-step/);
 assert.match(script,/const safeSku=new Set/);
 assert.match(script,/safeSku\.has\(c\.sku\)/);
 assert.match(script,/paymentRecord!=='provider_verified_not_bank_settlement'/);
 assert.match(script,/data\.parcel\?\.state/);
 assert.match(script,/independent buyer acknowledgement|buyer receipt|buyer acknowledgement/i);
 assert.match(script,/evidence\.update\(data\)/);
 assert.match(script,/detail\.hidden=true/);
 assert.match(script,/track\.setAttribute\('aria-controls',detail\.id\)/);
 assert.match(script,/track\.setAttribute\('aria-expanded','false'\)/);
 assert.match(script,/section\.querySelectorAll\('\.jr-order-detail'\)/);
 assert.match(script,/status==='delivered'/);
 const check=spawnSync(process.execPath,['--check','assets/js/account-order-history.js'],{encoding:'utf8'});
 assert.equal(check.status,0,check.stderr);
});

test('both original private order pages keep existing API UX, routes, mobile navigation and noindex',()=>{
 for(const [lang,path] of pages){
  const page=read(path);
  assert.match(page,/name="robots" content="noindex,nofollow,noarchive/);
  assert.match(page,/name="referrer" content="same-origin"/);
  assert.match(page,/data-resource="orders"/);
  assert.match(page,/class="appointment-summary"/);
  assert.match(page,/data-jr-account-journey/);
  assert.match(page,/account-order-history[.]js[?]v=20261019-evidence-v1/);
  assert.match(page,/jr-order-evidence-v1[.]css[?]v=20261019-evidence-v1/);
  assert.match(page,/jr-order-flow-disclosure/);
  assert.match(page,/Illustrative order lifecycle|چرخه نمونه سفارش/);
  assert.ok(existsSync(path));
 }
 assert.match(css,/grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
 assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/min-width:0/);
 assert.match(css,/focus-visible/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.doesNotMatch(css,/url\(https?:/);
});
