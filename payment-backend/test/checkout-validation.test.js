import test from 'node:test';
import assert from 'node:assert/strict';
import {validateCart,constantTimeTokenEqual} from '../lib/checkout-validation.js';
test('catalog prices and toman to rial conversion are server authoritative',()=>{
 const result=validateCart([{id:'roshanaei',quantity:2,price:1}]);
 assert.equal(result.totalToman,4000000);
 assert.equal(result.totalRial,40000000);
});
test('reject invalid quantities, duplicate products, and unknown products',()=>{
 for(const items of [[{id:'roshanaei',quantity:0}],[{id:'other',quantity:1}],[{id:'roshanaei',quantity:1},{id:'roshanaei',quantity:1}],[]]){
  assert.throws(()=>validateCart(items));
 }
});
test('constant-time token comparison',()=>{
 assert.equal(constantTimeTokenEqual('secret','secret'),true);
 assert.equal(constantTimeTokenEqual('secret','wrong'),false);
});
