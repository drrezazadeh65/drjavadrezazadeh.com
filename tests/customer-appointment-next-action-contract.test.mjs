import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';

const source=readFileSync('assets/js/customer-dashboard.js','utf8');
const api=readFileSync('api/index.php','utf8');
test('one owner-scoped service fulfilment lookup follows provider-verified order history',()=>{
 assert.match(source,/const appointmentOrder=providerMatched\.find/);
 assert.match(source,/o\.state==='paid'/);
 assert.match(source,/\/\^\(service\|vip\):\[a-z0-9_-\]\+\$\//);
 assert.match(source,/jsonRequest\(API\+'\/commerce\/fulfilment\?order='/);
 assert.match(source,/stamp!==nextActionRequest \|\| document\.hidden/);
 assert.match(source,/paymentRecord==='provider_verified_not_bank_settlement'/);
 assert.match(source,/purchased\.has\(c\.sku\)/);
 assert.match(source,/customerChoiceEnabled===true/);
 assert.match(source,/bookingStart && c\.bookingEnd/);
 assert.match(api,/if\(\$path==='\/commerce\/fulfilment'&&\$verb==='GET'\)/);
 assert.match(api,/sessionAccount\(\$pdo\)/);
 assert.match(api,/commerce_payment_claims/);
 assert.doesNotMatch(source,/localStorage\.setItem\(['"]appointment/i);
 assert.equal(spawnSync(process.execPath,['--check','assets/js/customer-dashboard.js'],{encoding:'utf8'}).status,0);
});
test('existing bilingual dashboards link only to private same-origin appointment destinations',()=>{
 for(const [htmlPath,appointmentPath] of [
   ['en/account/index.html','en/account/appointments/index.html'],
   ['fa/customer-dashboard/index.html','fa/app/account/appointments/index.html']
 ]){
  const html=readFileSync(htmlPath,'utf8');
  assert.match(html,/name="robots" content="noindex,nofollow,noarchive/);
  assert.match(html,/data-home-heading/);
  assert.match(html,/data-home-action/);
  assert.ok(existsSync(appointmentPath),appointmentPath+' must be a real route');
 }
 assert.match(source,/\/en\/account\/appointments\//);
 assert.match(source,/\/fa\/app\/account\/appointments\//);
});