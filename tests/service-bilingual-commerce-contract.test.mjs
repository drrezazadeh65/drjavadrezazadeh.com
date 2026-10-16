import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const read=(relative)=>fs.readFileSync(path.join(root,relative),'utf8');
const exists=(relative)=>fs.existsSync(path.join(root,relative));
const catalog=JSON.parse(read('assets/data/service-catalog.json'));
const en=JSON.parse(read('assets/data/service-descriptions-en.json')).services;
const base='https://drjavadrezazadeh.com';

test('all approved services have reciprocal Persian and English canonical editorial routes',()=>{
 assert.equal(catalog.services.length,21);
 assert.deepEqual(Object.keys(en).sort(),catalog.services.map(s=>s.id).sort());
 const indexFa=read('fa/services/index.html'),indexEn=read('en/services/index.html');
 assert.match(indexFa,/hreflang="en" href="https:\/\/drjavadrezazadeh\.com\/en\/services\/"/);
 assert.match(indexEn,/hreflang="fa" href="https:\/\/drjavadrezazadeh\.com\/fa\/services\/"/);
 for(const service of catalog.services){
  const id=service.id;
  const faPath=`fa/services/${id}/index.html`,enPath=`en/services/${id}/index.html`;
  assert.ok(exists(faPath),'missing canonical Persian page: '+id);
  assert.ok(exists(enPath),'missing English page: '+id);
  const fa=read(faPath),english=read(enPath);
  const faURL=base+'/fa/services/'+id+'/',enURL=base+'/en/services/'+id+'/';
  for(const [file,body] of [[faPath,fa],[enPath,english]]){
   assert.ok(body.includes('hreflang="fa" href="'+faURL+'"'),file+' Persian reciprocal');
   assert.ok(body.includes('hreflang="en" href="'+enURL+'"'),file+' English reciprocal');
   assert.ok(body.includes('hreflang="x-default" href="'+enURL+'"'),file+' x-default');
   assert.ok(body.includes('name="robots" content="index,follow,max-image-preview:large"'),file+' indexable');
  }
  assert.ok(fa.includes('href="/en/services/'+id+'/"'),'Persian language switch missing: '+id);
  assert.ok(english.includes('href="/en/services/checkout/?service='+id+'"'),'English secure purchase missing: '+id);
  assert.ok(english.includes('href="/en/app/account/orders/"'),'English private tracking missing: '+id);
  assert.ok(english.includes('/assets/images/services/infographics/en/'+id+'-workflow.svg'),id+' English infographic');
  assert.ok(exists('assets/images/services/infographics/en/'+id+'-workflow.svg'),id+' English image not committed');
  assert.ok(english.includes('>'+new Intl.NumberFormat('en-US').format(service.price)+' toman<'),'price drift on '+id);
  assert.ok(english.includes('service-detail-en-brand-2026.css'),'English bespoke branded layout missing: '+id);
  assert.ok(!english.includes('/fa/services/checkout/?service='),'Persian-only checkout link should be replaced: '+id);
 }
});

test('all new English service routes exist in the international sitemap and the index has refreshed date',()=>{
 const xml=read('sitemap-en.xml');
 const index=read('sitemap.xml');
 assert.ok(index.includes('<loc>'+base+'/sitemap-en.xml</loc>'));
 assert.ok(xml.includes('<loc>'+base+'/en/services/</loc><lastmod>2026-10-16</lastmod>'));
 for(const s of catalog.services){
  const marker='<loc>'+base+'/en/services/'+s.id+'/</loc>';
  assert.equal(xml.split(marker).length-1,1,'sitemap EN missing or duplicate: '+s.id);
 }
 assert.ok(!xml.includes('/en/services/checkout/'),'private checkout must not be indexed');
 assert.ok(!xml.includes('/en/app/account/orders/'),'private order history must not be indexed');
});

test('English checkout remains guarded by live capability and the canonical payment server',()=>{
 const page=read('en/services/checkout/index.html');
 const logic=read('assets/js/commerce-checkout-en.js');
 const fa=read('assets/js/commerce-checkout.js');
 const api=read('api/index.php');
 assert.match(page,/name="robots" content="noindex,follow,noarchive"/);
 assert.match(page,/data-commerce-services-en/);
 assert.match(page,/checkout-en-contact/);
 assert.match(page,/commerce-checkout-en\.js\?v=20261016-v1/);
 assert.match(logic,/\/api\/commerce\/create|API\+'\/commerce\/create'/);
 assert.match(logic,/\/commerce\/health/);
 assert.match(logic,/health\?\.checkout===true/);
 assert.match(logic,/health\?\.capabilities\?\.services===true/);
 assert.match(logic,/items:\[\{sku:'service:'\+id,quantity:1\}\]/);
 assert.match(logic,/url\.origin!==location\.origin/);
 assert.match(logic,/url\.pathname!=='\/fa\/shop\/payment-start\/'/);
 assert.match(logic,/!form\.reportValidity\(\)/);
 assert.match(logic,/fetch\('\/assets\/data\/service-catalog\.json'/);
 assert.match(logic,/fetch\('\/assets\/data\/service-descriptions-en\.json'/);
 assert.match(api,/function commerceReady\(\): bool/);
 assert.match(fa,/\/commerce\/create/);
 assert.doesNotMatch(logic,/localStorage|sessionStorage|paymentVerified\s*[:=]\s*true/);
});

test('English order history is real, authenticated, private and discoverable from dashboard',()=>{
 const html=read('en/app/account/orders/index.html'),dashboard=read('en/account/index.html');
 const js=read('assets/js/account-order-history.js');
 assert.match(html,/noindex,nofollow,noarchive/);
 assert.match(html,/data-resource="orders"/);
 assert.match(html,/class="case-section"/);
 assert.match(html,/class="appointment-card empty"/);
 assert.match(html,/account-order-history\.js\?v=20261016-evidence-clarity-en-v3/);
 assert.match(dashboard,/href="\/en\/app\/account\/orders\/"/);
 assert.match(js,/\/api\/commerce\/history/);
 assert.match(js,/\/api\/commerce\/fulfilment\?order=/);
 assert.match(js,/credentials:'same-origin'/);
 assert.match(js,/res\.status===401/);
 assert.doesNotMatch(js,/localStorage\.setItem/);
});
