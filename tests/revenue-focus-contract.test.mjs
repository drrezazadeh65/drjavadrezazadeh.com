import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const read=f=>readFileSync(f,'utf8');
const catalog=JSON.parse(read('platform/service-catalog.json'));
const intended=['manuscript_diagnostic','academic_editing','reviewer_response'];
test('the revenue spotlight uses precisely existing priced products in both languages',()=>{
 const approved=new Map(catalog.services.map(s=>[s.id,s]));
 for(const locale of ['en','fa']){
  const p=read(locale+'/services/index.html');
  const section=p.split('<section class="jr-revenue-focus"')[1]?.split('</section>')[0];
  assert.ok(section,'missing featured academic service section');
  assert.match(p,/name="robots" content="index,follow/);
  assert.match(p,/jr-revenue-focus-v1[.]css[?]v=20261019-revenue-focus-v1/);
  assert.match(p,/jr-revenue-focus-v1[.]js[?]v=20261019-revenue-focus-v1/);
  assert.equal((section.match(/data-jr-revenue-sku=/g)||[]).length,3);
  for(const id of intended){
   const service=approved.get(id);
   assert.ok(service?.sellable===true);
   assert.ok(section.includes('data-jr-revenue-sku="service:'+id+'"'));
   assert.ok(section.includes('/'+locale+'/services/checkout/?service='+id));
   assert.ok(section.includes('/'+locale+'/services/'+id+'/'));
   assert.ok(section.includes(service.price.toLocaleString(locale==='en'?'en-US':'fa-IR').replaceAll('٬',locale==='fa'?'٬':',')),
      'catalogue value must not drift from featured price '+id);
  }
 }
});
test('no guarantee, invented urgency or payment-readiness assertion leaks into the static offer',()=>{
 const en=read('en/services/index.html'),fa=read('fa/services/index.html');
 assert.doesNotMatch(en,/Online payments are not yet enabled/);
 for(const source of [en,fa]){
  assert.match(source,/data-jr-payment-readiness/);
  assert.match(source,/No journal acceptance|پذیرش یا انتشار مقاله تضمین نمی‌شود/);
  assert.doesNotMatch(source,/Only [0-9]+ slots|همین امروز تمام می‌شود|guaranteed acceptance/i);
 }
 const js=read('assets/js/jr-revenue-focus-v1.js');
 assert.match(js,/fetch\('\/api\/commerce\/health'/);
 assert.match(js,/data\.checkout===true&&data\.capabilities\?\.services===true/);
 assert.match(js,/credentials:'omit'/);
 assert.doesNotMatch(js,/localStorage|sessionStorage|document\.cookie|\/commerce\/create|\/donations\/create/);
 const check=spawnSync(process.execPath,['--check','assets/js/jr-revenue-focus-v1.js'],{encoding:'utf8'});
 assert.equal(check.status,0,check.stderr);
});
test('existing routes, all 21 services and phone-first design remain unchanged',()=>{
 const fa=read('fa/services/index.html'),en=read('en/services/index.html');
 assert.equal(catalog.services.length,21);
 for(const s of catalog.services){
  assert.ok(fa.includes('/fa/services/checkout/?service='+s.id));
  assert.ok(en.includes('/en/services/'+s.id+'/'));
 }
 for(const path of ['assets/css/jr-revenue-focus-v1.css','assets/js/jr-revenue-focus-v1.js'])assert.ok(existsSync(path));
 const css=read('assets/css/jr-revenue-focus-v1.css');
 for(const pattern of [/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/,/max-width:600px/,/min-width:0/,/min-height:48px/,/focus-visible/,/prefers-reduced-motion:reduce/])assert.match(css,pattern);
});
