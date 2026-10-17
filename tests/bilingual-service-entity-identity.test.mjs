import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const services=JSON.parse(read('assets/data/service-catalog.json')).services;
const graph=html=>[...html.matchAll(/<script\s+type="application\/ld\+json"\s*>([\s\S]*?)<\/script>/gi)]
 .flatMap(x=>{const json=JSON.parse(x[1]);return json['@graph']||[json]});
const service=(page)=>graph(page).filter(x=>x['@type']==='Service');
const personId='https://drjavadrezazadeh.com/#person';

test('every existing priced service has one bilingual semantic identity, with zero page redirects',()=>{
 assert.equal(services.length,21);
 for(const {id} of services){
  const fa=read('fa/services/'+id+'/index.html');
  const en=read('en/services/'+id+'/index.html');
  const f=service(fa),e=service(en);
  assert.equal(f.length,1,'FA service '+id);
  assert.equal(e.length,1,'EN service '+id);
  assert.equal(f[0]['@id'],e[0]['@id'],'entity identity drift '+id);
  assert.equal(f[0]['@id'],'https://drjavadrezazadeh.com/fa/services/'+id+'/#service');
  assert.equal(f[0].provider?.['@id'],personId);
  assert.equal(e[0].provider?.['@id'],personId);
  assert.ok(fa.includes('rel="canonical" href="https://drjavadrezazadeh.com/fa/services/'+id+'/'));
  assert.ok(en.includes('rel="canonical" href="https://drjavadrezazadeh.com/en/services/'+id+'/'));
  assert.ok(fa.includes('hreflang="en" href="https://drjavadrezazadeh.com/en/services/'+id+'/'));
  assert.ok(en.includes('hreflang="fa" href="https://drjavadrezazadeh.com/fa/services/'+id+'/'));
  assert.doesNotMatch(fa,/<meta[^>]*http-equiv="refresh"/i);
  assert.doesNotMatch(en,/<meta[^>]*http-equiv="refresh"/i);
 }
});
test('service URLs and identities remain distinct from WebPage identity and products',()=>{
 for(const {id} of services){
  for(const lang of ['fa','en']){
   const entity=service(read(lang+'/services/'+id+'/index.html'))[0];
   assert.ok(!entity['@id'].includes('/en/services/'),'entity should use preexisting Persian anchor');
   assert.equal(entity['@type'],'Service');
   assert.notEqual(entity['@id'],personId);
   assert.ok(entity.name);
  }
 }
});
