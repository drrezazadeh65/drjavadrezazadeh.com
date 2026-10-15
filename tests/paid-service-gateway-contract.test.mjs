import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const api=readFileSync('api/index.php','utf8');
const client=readFileSync('assets/js/commerce-checkout.js','utf8');
const donation=readFileSync('assets/js/donation-payment.js','utf8');
const books=readFileSync('assets/js/book-store.js','utf8');
const service=JSON.parse(readFileSync('assets/data/service-catalog.json','utf8'));
const vip=JSON.parse(readFileSync('assets/data/vip-catalog.json','utf8'));

test('all sellable services and VIP offers are in the canonical checkout catalog',()=>{
  assert.equal(service.services.filter(x=>x.sellable===true).length,21);
  assert.equal(vip.services.filter(x=>x.sellable===true&&x.checkout_enabled===true).length,6);
  assert.match(api,/\$items\['service:'\.\$s\['id'\]\]/);
  assert.match(api,/\$items\['vip:'\.\$v\['id'\]\]/);
});
test('paid service and VIP checkout do not require a preassigned appointment',()=>{
  assert.match(api,/'services'=>\$ready,/);
  assert.match(api,/'vip'=>\$ready,/);
  const create=api.slice(api.indexOf("if(\$path==='/commerce/create'"),api.indexOf("if(\$path==='/commerce/status'"));
  assert.ok(create.length>1000);
  assert.doesNotMatch(create,/service_booking_not_configured|vip_booking_not_configured/);
  assert.match(create,/stage9ReserveBooks\(\$pdo,\$order,\$lines\)/);
  assert.match(create,/gatewayPost\('gateway-send'/);
  assert.match(client,/\{sku:kind\+':'\+item\.id,quantity:1\}/);
  assert.match(client,/هماهنگ/);
});
test('money movement retains authoritative server verification and stock protections',()=>{
  assert.match(api,/function commerceReady\(\): bool/);
  assert.match(api,/stage9SchemaReady\(db\(\)\)/);
  assert.match(api,/if\(\$hasBook&&!stage9BookStockReady\(\$pdo\)\)/);
  assert.match(api,/stage9ReserveBooks\(\$pdo,\$order,\$lines\)/);
  assert.match(api,/gatewayPost\('gateway-send'/);
  assert.match(donation,/\/api\/donations\/create/);
  assert.match(books,/\/api\/commerce\/create/);
  assert.match(api,/provider_trans_id/);
});
