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
 const hubEntry='<loc>'+base+'/en/services/</loc><lastmod>';
 const indexOfHub=xml.indexOf(hubEntry);
 assert.ok(indexOfHub>=0,'English service hub must appear in international sitemap');
 const hubDate=xml.slice(indexOfHub+hubEntry.length,indexOfHub+hubEntry.length+10);
 assert.match(hubDate,/^\\d{4}-\\d{2}-\\d{2}$/,'service hub lastmod must be a real ISO calendar date');
 assert.ok(hubDate>='2026-10-16','service hub lastmod must never regress before its published baseline');
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
 assert.match(page,/commerce-checkout-en\.js\?v=20261017-redirect-lock-v2/);
 assert.match(logic,/\/api\/commerce\/create|API\+'\/commerce\/create'/);
 assert.match(logic,/\/commerce\/health/);
 assert.match(logic,/health\?\.checkout===true/);
 assert.match(logic,/health\?\.capabilities\?\.services===true/);
 assert.match(logic,/items:\[\{sku:'service:'\+id,quantity:1\}\]/);
 assert.match(logic,/url\.origin!==location\.origin/);
 assert.ok(logic.includes('redirecting=true'),'redirect must keep checkout locked');
 assert.ok(logic.includes('if(!redirecting){busy=false;buttonState();}'),'only failed redirects may unlock');
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
 const version=html.match(/account-order-history[.]js[?]v=(20[0-9]{6}-[a-z0-9-]+)/);
 assert.ok(version,'existing English account orders must use a versioned private history script');
 for(const route of ['en/account/orders/index.html','fa/app/account/orders/index.html']){
  assert.ok(read(route).includes('account-order-history.js?v='+version[1]),
    'all order views must share the same authenticated history controller: '+route);
 }
 assert.match(dashboard,/href="\/en\/app\/account\/orders\/"/);
 assert.match(js,/\/api\/commerce\/history/);
 assert.match(js,/\/api\/commerce\/fulfilment\?order=/);
 assert.match(js,/credentials:'same-origin'/);
 assert.match(js,/res\.status===401/);
 assert.doesNotMatch(js,/localStorage\.setItem/);
});


test('service hubs have 21 real canonical structured-data destinations and a single true bilingual pair',()=>{
 const english=read('en/services/index.html');
 const persian=read('fa/khadamat/index.html');
 const faCatalog=read('fa/services/index.html');
 const matchJson=html=>html.split('<script type="application/ld+json">').slice(1)
   .map(block=>JSON.parse(block.split('</script>')[0]))
   .find(json=>json['@type']==='ItemList');
 const enList=matchJson(english),faList=matchJson(persian);
 assert.equal(enList?.itemListElement?.length,21);
 assert.equal(faList?.itemListElement?.length,21);
 const ids=catalog.services.map(s=>s.id);
 for(const id of ids){
  assert.equal(enList.itemListElement.filter(row=>row.url===base+'/en/services/'+id+'/').length,1,'EN schema destination '+id);
  assert.equal(faList.itemListElement.filter(row=>row.url===base+'/fa/services/'+id+'/').length,1,'FA schema destination '+id);
 }
 const registry=JSON.parse(read('platform/hreflang-pairs.json'));
 const detailed=registry.pairs.filter(entry=>entry.id.startsWith('service-'));
 assert.equal(detailed.length,21,'21 distinct canonical service pairs must be protected by SEO regression');
 assert.equal(new Set(detailed.map(p=>p.en)).size,21);
 assert.equal(new Set(detailed.map(p=>p.fa)).size,21);
 for(const id of ids){
  assert.deepEqual(detailed.filter(p=>p.en==='/en/services/'+id+'/').map(p=>p.fa),['/fa/services/'+id+'/']);
 }
 const pair=registry.pairs.find(entry=>entry.id==='services');
 assert.deepEqual([pair.en,pair.fa],['/en/services/','/fa/services/']);
 assert.match(faCatalog,/hreflang="en" href="https:\/\/drjavadrezazadeh\.com\/en\/services\/"/);
 assert.match(english,/hreflang="fa" href="https:\/\/drjavadrezazadeh\.com\/fa\/services\/"/);
 assert.doesNotMatch(persian,/hreflang="en" href="https:\/\/drjavadrezazadeh\.com\/en\/services\/"/);
 assert.match(read('scripts/seo-regression.mjs'),/\['\/en\/services\/','\/fa\/services\/'\]/);
});

test('shared checkout remains bilingual while keeping authoritative payments and Persian customer support',()=>{
 const js=read('assets/js/commerce-checkout.js');
 const fa=read('fa/services/checkout/index.html');
 assert.match(js,/const IS_EN=document\.documentElement\.lang==='en'/);
 assert.match(js,/const tr=fa=>IS_EN/);
 assert.match(js,/translations\[item\.id\]\?\.title/);
 assert.match(js,/\/assets\/data\/service-descriptions-en\.json/);
 assert.match(js,/\/commerce\/create/);
 assert.match(js,/link\.origin!==location\.origin/);
 assert.match(js,/link\.pathname!=='\/fa\/shop\/payment-start\/'/);
 assert.match(fa,/lang="fa" dir="rtl"/);
 assert.match(fa,/commerce-checkout\.js/);
 assert.doesNotMatch(js,/localStorage\.setItem|sessionStorage\.setItem/);
});


test('user dashboards share the approved repository Persian-first visual symbol, never obsolete Latin JR logo',()=>{
 const english=read('en/account/index.html'),persian=read('fa/customer-dashboard/index.html');
 const visual=read('assets/css/jr-ecosystem-design-v2.css');
 for(const [name,html] of [['English',english],['Persian',persian]]){
  assert.ok(html.includes('class="cd-monogram jr-sci-client-mark"'),name+' should use shared mark');
  assert.ok(html.includes('class="cd-mobile-logo jr-sci-client-mark"'),name+' mobile mark');
  assert.ok(html.includes('/assets/images/persian-brand-symbol.png'),name+' approved repository asset');
  assert.ok(!html.includes('class="cd-mobile-logo">JR</span>'),name+' obsolete JR mobile logo');
  assert.ok(html.includes('jr-ecosystem-design-v2.css?v=20261017-brand-unified-r2'));
 }
 assert.ok(exists('assets/images/persian-brand-symbol.png'),'brand symbol must physically exist');
 assert.match(visual,/\.cd-mobile-logo\.jr-sci-client-mark img/);
});


test('English account service cards use the genuine English checkout, without creating another payment gateway', () => {
 const buyer=read('assets/js/customer-dashboard.js');
 const enAccount=read('en/account/index.html');
 const faAccount=read('fa/customer-dashboard/index.html');
 const enCheckout=read('en/services/checkout/index.html');
 const faCheckout=read('fa/services/checkout/index.html');
 assert.ok(buyer.includes("purchaseReady?'/en/services/checkout/?service='+id"),
    'English paid-service cards must not fall back to Persian checkout');
 assert.ok(buyer.includes("purchaseReady?'Secure service checkout'"),
    'English purchase call-to-action must accurately describe the page');
 // The reviewed dashboard is shared between both locales; version tokens
 // must advance when JS changes without invalidating commerce parity.
 const accountAsset=enAccount.match(/customer-dashboard[.]js[?]v=(20[0-9]{6}-[a-z0-9-]+)/);
 assert.ok(accountAsset,'English account must use cache-versioned canonical JS');
 assert.ok(faAccount.includes('customer-dashboard.js?v='+accountAsset[1]),
   'Both locales must use the same JS revision and commerce contract');
 assert.ok(read('assets/js/commerce-checkout-en.js').includes("API+'/commerce/health"), 'English checkout must check the real API status');
 assert.ok(read('assets/js/commerce-checkout-en.js').includes("API+'/commerce/create"), 'English checkout must call the original service checkout API');
 assert.ok(enCheckout.includes('commerce-checkout-en.js'));
 assert.ok(faCheckout.includes('commerce-checkout.js'));
 assert.doesNotMatch(buyer,/Checkout \\(Persian\\)/);
});

test('unified dashboards offer verified bilingual service checkout to guest buyers without inventing payment success',()=>{
 const buyer=read('assets/js/customer-dashboard.js');
 // The same server-owned capability governs guest and signed-in purchase links.
 assert.ok(buyer.includes('r?.ok&&r.data?.ok===true&&r.data?.checkout===true&&r.data?.capabilities?.services===true'));
 assert.ok(buyer.includes("purchaseReady?'/en/services/checkout/?service='+id"));
 assert.ok(buyer.includes("purchaseReady?'/fa/services/checkout/?service='+id"));
 assert.ok(buyer.includes(":'/fa/services/'+id+'/'"),'when not ready, browse public terms instead of sending buyers to a blocked checkout');
 assert.doesNotMatch(buyer,/purchaseReady=runtime\?\.commerceReady===true&&[\s\S]{0,110}authenticated===true/);
 assert.ok(buyer.includes('Secure checkout is available in English.'));
 assert.ok(buyer.includes("const infoHref=(isEnglish?'/en/services/':'/fa/services/')+id+'/'"),'every language-specific dashboard card must open its own canonical service description');
 assert.ok(!buyer.includes('Secure checkout can start in the Persian interface.'));
 // Payments and fulfilment remain authoritative in the existing PHP gateway.
 const api=read('api/index.php');
 assert.match(api,/function commerceReady\(\): bool/);
 assert.match(api,/gatewayPost\('gateway-send'/);
 assert.ok(buyer.includes('Appointment confirmation and service delivery require separate verification.'));
});
