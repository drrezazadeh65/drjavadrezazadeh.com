import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

// Offline browser-contract simulation: no payments, private PDFs, bank keys,
// live customer details, or network calls. Real bank/SMTP QA is a separate gate.
const script=readFileSync('assets/js/jr-publishing-checkout-v1.js','utf8');
const sleep=()=>new Promise(resolve=>setImmediate(resolve));
function scenario({lang='en',offer=null,order=null,failOffer=false}={}){
 const events={};const calls=[];const redirects=[];
 const element=()=>({
  hidden:false,disabled:false,value:'',textContent:'',listeners:{},
  addEventListener(type,handler){this.listeners[type]=handler;}
 });
 const controls=new Map([
  ['#jp-digital-checkout-form',element()],['#jp-checkout-state',element()],
  ['#jp-pay-now',element()],['#jp-buyer-name',element()],
  ['#jp-buyer-email',element()],['#jp-offer-badge',element()],
  ['#jp-purchase-readiness',element()],['#jp-recheck-offer',element()]
 ]);
 const form=controls.get('#jp-digital-checkout-form');form.hidden=true;
 form.reportValidity=()=>true;
 controls.get('#jp-pay-now').disabled=true;
 const document={
  documentElement:{lang},visibilityState:'visible',
  querySelector(selector){return controls.get(selector)||null;},
  addEventListener(type,handler){events[type]=handler;}
 };
 async function fetch(url,options){
  calls.push({url,options});
  if(url==='/api/publishing/offer'){
   if(failOffer)throw Error('offline');
   return {ok:true,json:async()=>offer||{ok:true,available:false,checkoutEnabled:false,
    sku:'digital:tefl-ma-exams-1370-1405',priceToman:1000000}};
  }
  if(url==='/api/commerce/create'){
   if(!order)throw Error('uncertain');
   return {ok:true,json:async()=>order};
  }
  throw Error('unexpected_url');
 }
 const location={origin:'https://drjavadrezazadeh.com'};
 const window={location:{assign(url){redirects.push(url);}}};
 runInNewContext(script,{document,fetch,location,window,URL,Error,JSON},
  {filename:'jr-publishing-checkout-v1.js',timeout:1500});
 return {
  controls,calls,redirects,events,settle:sleep,
  async submit(){
   const event={preventDefault(){}};
   return form.listeners.submit(event);
  }
 };
}
const available={ok:true,available:true,checkoutEnabled:true,
 sku:'digital:tefl-ma-exams-1370-1405',priceToman:1000000};
const order={ok:true,currency:'IRT',totalToman:1000000,
 paymentUrl:'/fa/shop/payment-start/?gateway=expected-provider-token'};

test('English and Persian checkout remain unavailable on missing or unverifiable offer',async()=>{
 for(const lang of ['fa','en']){
  for(const failOffer of [false,true]){
   const s=scenario({lang,failOffer});
   await s.settle();
   assert.equal(s.controls.get('#jp-digital-checkout-form').hidden,true);
   assert.equal(s.controls.get('#jp-pay-now').disabled,true);
   assert.equal(s.calls.length,1);
   assert.equal(s.calls[0].options.cache,'no-store');
   assert.equal(s.calls[0].options.credentials,'same-origin');
   await s.submit();
   assert.equal(s.calls.length,1,'no order creation without a valid server offer');
   assert.equal(s.redirects.length,0);
  }
 }
});
test('strict product identity and price are required before accepting a payment',async()=>{
 for(const incorrect of [
  {...available,priceToman:999999},
  {...available,sku:'digital:some-other-work'},
  {...available,checkoutEnabled:false},
  {...available,available:false}
 ]){
  const s=scenario({offer:incorrect});
  await s.settle();
  assert.equal(s.controls.get('#jp-digital-checkout-form').hidden,true);
  assert.equal(s.controls.get('#jp-pay-now').disabled,true);
 }
});
test('available bilingual checkout uses one server-authoritative order and same-origin relay',async()=>{
 for(const lang of ['fa','en']){
  const s=scenario({lang,offer:available,order});
  await s.settle();
  assert.equal(s.controls.get('#jp-digital-checkout-form').hidden,false);
  assert.equal(s.controls.get('#jp-pay-now').disabled,false);
  s.controls.get('#jp-buyer-name').value='Sample Buyer';
  s.controls.get('#jp-buyer-email').value='buyer@example.invalid';
  await s.submit();
  assert.equal(s.calls.length,2);
  const request=s.calls[1];
  assert.equal(request.url,'/api/commerce/create');
  assert.equal(request.options.method,'POST');
  assert.deepEqual(JSON.parse(request.options.body).items,
   [{sku:'digital:tefl-ma-exams-1370-1405',quantity:1}]);
  assert.equal(s.redirects.length,1);
  assert.equal(s.redirects[0],
   'https://drjavadrezazadeh.com/fa/shop/payment-start/?gateway=expected-provider-token');
  assert.equal(s.controls.get('#jp-pay-now').disabled,true);
 }
});
test('unsafe payment redirect and uncertain order result never permit automatic retry',async()=>{
 const invalid=[
  {...order,paymentUrl:'https://evil.example/collect'},
  {...order,paymentUrl:'/fa/shop/payment-start/?gateway=a&extra=1'},
  {...order,paymentUrl:'/fa/shop/receipt/?gateway=a'},
  {...order,totalToman:999999}
 ];
 for(const response of invalid){
  const s=scenario({offer:available,order:response});
  await s.settle();
  s.controls.get('#jp-buyer-name').value='Sample Buyer';
  s.controls.get('#jp-buyer-email').value='buyer@example.invalid';
  await s.submit();await s.submit();
  assert.equal(s.redirects.length,0);
  assert.equal(s.calls.filter(x=>x.url==='/api/commerce/create').length,1,
    'an uncertain order cannot be submitted twice automatically');
  assert.equal(s.controls.get('#jp-pay-now').disabled,true);
 }
});
test('visibility recheck immediately hides stale checkout before awaiting server',async()=>{
 const s=scenario({offer:available});
 await s.settle();
 assert.equal(s.controls.get('#jp-digital-checkout-form').hidden,false);
 s.events.visibilitychange();
 assert.equal(s.controls.get('#jp-digital-checkout-form').hidden,true);
 assert.equal(s.controls.get('#jp-pay-now').disabled,true);
 await s.settle();
 assert.equal(s.controls.get('#jp-digital-checkout-form').hidden,false);
});
