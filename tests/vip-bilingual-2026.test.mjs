import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const vip=JSON.parse(read('assets/data/vip-catalog.json')).services;
const pairs=JSON.parse(read('platform/hreflang-pairs.json')).pairs;
const enSitemap=read('sitemap-en.xml');
const base='https://drjavadrezazadeh.com';
const nodes=p=>[...p.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].flatMap(x=>{const r=JSON.parse(x[1]);return r['@graph']||[r]});
test('all 6 approved VIP packages have safe equivalent English pages and unchanged Persian URLs',()=>{
 assert.equal(vip.length,6);
 assert.equal(pairs.filter(x=>x.id.startsWith('vip-')).length,6);
 for(const s of vip){
  const id=s.id,en='/en/vip/'+id+'/',fa='/fa/vip/'+id+'/';
  const english=read('.'+en+'index.html'),persian=read('.'+fa+'index.html');
  const expected='https://drjavadrezazadeh.com';
  for(const page of [english,persian]){
   for(const [lng,url] of [['en',en],['fa',fa],['x-default',en]])
    assert.ok(page.includes('hreflang="'+lng+'" href="'+expected+url+'"'),id+' reciprocity '+lng);
   assert.ok(page.includes('name="robots" content="index,follow,max-image-preview:large"'));
   assert.ok(!page.includes('<meta http-equiv="refresh"'));
  }
  assert.ok(english.includes('rel="canonical" href="'+expected+en+'"'));
  assert.ok(persian.includes('rel="canonical" href="'+expected+fa+'"'));
  assert.ok(english.includes('/assets/images/vip-'+id+'.svg'));
  assert.ok(english.includes(new Intl.NumberFormat('en-US').format(s.price)+' toman'));
  assert.ok(english.includes('href="/fa/vip/?vip='+id+'#vip-checkout-heading"'));
  assert.ok(english.includes('may refuse payment')||english.includes('Payment and booking are conditional'));
  assert.ok(!english.includes('href="/en/services/checkout/?vip='));
  const service=nodes(english).find(x=>x['@type']==='Service');
  assert.ok(service,id+' JSON-LD Service');
  assert.equal(service['@id'],expected+fa+'#service');
  assert.equal(service.url,expected+en);
  assert.equal(service.provider['@id'],expected+'/#person');
  assert.ok(!Object.hasOwn(service,'offers'),'No unsupported offers or instant checkout in structured data');
  const languagePair=pairs.find(x=>x.id==='vip-'+id);
  assert.deepEqual([languagePair.en,languagePair.fa,languagePair.x_default],[en,fa,en]);
  assert.equal(enSitemap.split('<loc>'+expected+en+'</loc>').length-1,1,'EN sitemap '+id);
 }
});
test('6-offer English VIP hub has distinct list schema, canonical and reciprocal pair without modifying standard services',()=>{
 const en=read('en/vip/index.html'),fa=read('fa/vip/index.html'),index=read('en/services/index.html');
 for(const doc of [en,fa]){
  assert.ok(doc.includes('hreflang="en" href="'+base+'/en/vip/"'));
  assert.ok(doc.includes('hreflang="fa" href="'+base+'/fa/vip/"'));
 }
 assert.ok(en.includes('rel="canonical" href="'+base+'/en/vip/"'));
 const list=nodes(en).find(x=>x['@type']==='ItemList');
 assert.equal(list?.itemListElement?.length,6);
 assert.ok(vip.every(s=>list.itemListElement.some(x=>x.url===base+'/en/vip/'+s.id+'/')));
 assert.equal(enSitemap.split('<loc>'+base+'/en/vip/</loc>').length-1,1);
 assert.ok(index.includes('href="/en/vip/"'));
 assert.deepEqual([pairs.find(x=>x.id==='vip').en,pairs.find(x=>x.id==='vip').fa],['/en/vip/','/fa/vip/']);
 assert.equal(JSON.parse(read('assets/data/service-catalog.json')).services.length,21);
});
