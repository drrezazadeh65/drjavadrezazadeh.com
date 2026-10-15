import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>JSON.parse(readFileSync(path,'utf8'));
const catalogue=read('assets/data/service-catalog.json');
const locale=read('assets/data/service-descriptions-en.json');
const order=Array.isArray(catalogue.services)?catalogue.services:[];
const translations=locale.services||{};

test('English service descriptions match every canonical service SKU exactly',()=>{
 assert.equal(locale.schema_version,'1.0');
 assert.equal(locale.language,'en');
 assert.equal(order.length,21,'The agreed 21-service programme must remain explicit');
 assert.deepEqual(Object.keys(translations).sort(),order.map(x=>x.id).sort(),
   'A changed canonical catalogue must not silently expose untranslated services');
 for(const [id,value] of Object.entries(translations)){
  assert.deepEqual(Object.keys(value).sort(),['boundary','fit','outcome','title']);
  for(const [key,text] of Object.entries(value)){
   assert.equal(typeof text,'string',id+'.'+key);
   assert.ok(text.trim().length>=10&&text.length<=1200,id+'.'+key+' is incomplete');
   assert.doesNotMatch(text,/[<>\x00-\x1f]/,id+'.'+key+' should remain plain, safe copy');
  }
 }
});

test('English translation file cannot redefine offers, prices, status or entitlements',()=>{
 for(const forbidden of ['price','currency','sellable','availability','booked',
                           'entitlement','paymentStatus','sku','orderId']){
  assert.ok(!Object.hasOwn(locale,forbidden),forbidden);
  for(const service of Object.values(translations))assert.ok(
   !Object.hasOwn(service,forbidden),'A localized description must not carry '+forbidden
  );
 }
 const page=readFileSync('en/account/index.html','utf8');
 const client=readFileSync('assets/js/customer-dashboard.js','utf8');
 assert.match(page,/id="service-market"[^>]+data-dashboard-panel="ecosystem"/);
 assert.match(page,/data-dashboard-service-search/);
 assert.match(page,/data-dashboard-services/);
 assert.match(page,/customer-dashboard\.js\?v=20261015-bilingual-market-v51/);
 assert.match(client,/service-descriptions-en\.json/);
 assert.match(client,/Checkout \(Persian\)/);
 assert.match(client,/en\/request-consultation\/\?service=/);
});

test('Persian source catalogue cannot leak a fake English checkout',()=>{
 const en=readFileSync('en/account/index.html','utf8');
 assert.doesNotMatch(en,/href="\/en\/services\/checkout\/"/);
 assert.doesNotMatch(en,/href="\/en\/shop\/payment-start\/"/);
 const fa=readFileSync('fa/customer-dashboard/index.html','utf8');
 assert.match(fa,/data-dashboard-services/);
});

test('VIP English labels match six canonical offers and cannot redefine fees or booking',()=>{
 const vip=read('assets/data/vip-catalog.json');
 const names=read('assets/data/vip-descriptions-en.json');
 assert.equal(names.schema_version,'1.0');
 assert.equal(names.language,'en');
 assert.equal(vip.services.length,6);
 assert.deepEqual(Object.keys(names.services).sort(),vip.services.map(x=>x.id).sort());
 for(const [id,title] of Object.entries(names.services)){
  assert.equal(typeof title,'string',id);
  assert.ok(title.trim().length>=10&&title.trim().length<=120,id);
  assert.doesNotMatch(title,/[<>\x00-\x1f]/,id+' must remain plain text');
 }
 const consent=readFileSync('assets/js/consented-lead-intake.js','utf8');
 const customer=readFileSync('assets/js/customer-consultation-leads.js','utf8');
 const admin=readFileSync('assets/js/operations-growth.js','utf8');
 for(const source of [consent,customer,admin]){
  assert.match(source,/vip-descriptions-en\.json/);
  assert.doesNotMatch(source,/paymentVerified\s*[:=]\s*true/);
 }
});
