import test from 'node:test';
import assert from 'node:assert/strict';
import {assessRevenueLaunch} from './revenue-launch-gate.mjs';
test('prevents commercial launch when no 27-service catalog or checkout exists',()=>{
 const result=assessRevenueLaunch();
 assert.equal(result.readyForPayments,false);
 assert.ok(result.issues.some(i=>i.code==='service-count-mismatch'));
 assert.equal(result.productionTouched,false);
});
test('detects missing product and inconsistent service price',()=>{
 const service={id:'s1',checkout:{enabled:true,productId:'sku-1',emailRequired:true,phoneVerification:false},priceMinor:1000,currency:'IRR'};
 const missing=assessRevenueLaunch({services:[service]});
 assert.ok(missing.issues.some(i=>i.code==='missing-linked-product'));
 const mismatch=assessRevenueLaunch({services:[service],products:[{sku:'sku-1',titleFa:'خدمت',titleEn:'Service',priceMinor:2000,currency:'IRR'}]});
 assert.ok(mismatch.issues.some(i=>i.code==='service-product-price-mismatch'));
 assert.equal(mismatch.readyForPayments,false);
});
