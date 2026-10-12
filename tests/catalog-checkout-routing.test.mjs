// Canonical catalog-to-checkout contract. No payment is initiated here.
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';

const source=(path)=>readFileSync(path,'utf8');
const services=JSON.parse(source('assets/data/service-catalog.json')).services;
const vip=JSON.parse(source('assets/data/vip-catalog.json')).services;

test('every sellable standard service detail retains its unique selection',()=>{
  assert.equal(services.length,21);
  for(const service of services){
    assert.equal(service.sellable,true,service.id);
    const page=source('fa/services/'+service.id+'/index.html');
    assert.ok(page.includes('href="/fa/services/checkout/?service='+service.id+'"'),service.id);
    assert.ok(!page.includes('href="/fa/services/checkout/"'),service.id);
    assert.ok(page.includes('<link rel="canonical"'),service.id);
  }
});

test('each VIP detail resolves to its own existing selectable catalogue checkout',()=>{
  assert.equal(vip.length,6);
  const index=source('fa/vip/index.html');
  assert.ok(index.includes('data-commerce-vip'));
  assert.ok(index.includes('id="vip-checkout-heading"'));
  for(const packageItem of vip){
    assert.equal(packageItem.sellable,true,packageItem.id);
    const page=source('fa/vip/'+packageItem.id+'/index.html');
    assert.ok(page.includes('href="/fa/vip/?vip='+packageItem.id+'#vip-checkout-heading"'),packageItem.id);
    assert.ok(page.includes('data-vip-selected-checkout'),packageItem.id);
    assert.ok(page.includes('<link rel="canonical"'),packageItem.id);
  }
});

test('selection and checkout share the same SKU and enforce live readiness',()=>{
  const client=source('assets/js/commerce-checkout.js');
  assert.match(client,/new URLSearchParams\(location\.search\)\.get\(kind==='service'\?'service':'vip'\)/);
  assert.match(client,/if\(selected && item\.id!==selected\)continue/);
  assert.match(client,/sku:kind\+':'\+item\.id/);
  assert.match(client,/health\?\.checkout===true && channel===true/);
  assert.match(client,/button\.disabled=!ready/);
  assert.match(source('fa/services/checkout/index.html'),/data-commerce-services/);
});

test('checkout copy must reflect current gated capability without promising a booking',()=>{
  for(const service of services){
    const page=source('fa/services/'+service.id+'/index.html');
    assert.ok(page.includes('وضعیت لحظه‌ای درگاه')&&page.includes('رزرو قطعی زمان نیست'),service.id);
    assert.ok(!page.includes('رزرو و دریافت وجه آنلاین تا تأیید ظرفیت'),service.id);
  }
  const client=source('assets/js/commerce-checkout.js');
  assert.ok(!client.includes('D1 remain authoritative'));
  assert.ok(!client.includes('تا زمان رفع مشکل ایمیل خودکار'));
  assert.match(client,/health\?\.checkout===true && channel===true/);
});
