import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {inspectPublicServiceRoute,serviceRoutesFromCatalog} from '../scripts/lib/public-service-route-contract.mjs';

const catalog=JSON.parse(fs.readFileSync('assets/data/service-catalog.json','utf8'));
const routes=serviceRoutesFromCatalog(catalog);
test('21 sellable services produce exactly 42 bilingual public routes',()=>{
 assert.equal(routes.length,42);
 assert.equal(new Set(routes.map(x=>x.path)).size,42);
 assert.equal(routes.filter(x=>x.locale==='fa').length,21);
 assert.equal(routes.filter(x=>x.locale==='en').length,21);
});
test('all 42 existing source HTML pages satisfy route-level canonical, hreflang, index and checkout invariants',()=>{
 for(const route of routes){
  const content=fs.readFileSync('.'+route.path+'index.html','utf8');
  const review=inspectPublicServiceRoute(content,route);
  assert.deepEqual(review.failures,[],route.path+': '+review.failures.join(','));
 }
});
test('missing checkout, noindex and swapped canonical cause a failed public-route observation',()=>{
 const item=routes[0];
 const clean=fs.readFileSync('.'+item.path+'index.html','utf8');
 assert.equal(inspectPublicServiceRoute(clean,item).ok,true);
 const brokenCheckout=clean.replace('/'+item.locale+'/services/checkout/?service='+item.id,'/unused-checkout/');
 assert.ok(inspectPublicServiceRoute(brokenCheckout,item).failures.includes('service_checkout_link'));
 const canonical='https://drjavadrezazadeh.com/'+item.locale+'/services/'+item.id+'/';
 const brokenCanonical=clean.replace('<link rel="canonical" href="'+canonical+'"','<link rel="canonical" href="https://elsewhere.invalid/"');
 assert.ok(inspectPublicServiceRoute(brokenCanonical,item).failures.includes('canonical'));
 const brokenIndex=clean.replace('content="index,follow,max-image-preview:large"','content="noindex,follow"');
 assert.ok(inspectPublicServiceRoute(brokenIndex,item).failures.includes('unexpected_noindex'));
});
test('observer is anonymous, fail-contained, and explicitly not a 21-service payment certification',()=>{
 const script=fs.readFileSync('scripts/bertina-postrelease-check.mjs','utf8');
 assert.match(script,/observeHostGate\('bilingual-public-service-pages-21x2'/);
 assert.match(script,/for\(let i=0;i<routes.length;i\+=6\)/);
 assert.match(script,/failedRoutes:failed\.map/);
 assert.match(script,/verifiedEndToEndPurchase:false/);
 assert.match(script,/verifiedDelivery:false/);
 assert.doesNotMatch(script,/\/api\/commerce\/create/);
});
