import test from 'node:test';
import assert from 'node:assert/strict';
import {validateCart, constantTimeTokenEqual} from '../lib/checkout-validation.js';
import {createRequest} from '../lib/bitpay-sandbox.js';
import createHandler from '../api/payments/create.js';
import verifyHandler from '../api/payments/verify.js';
import healthHandler from '../api/health.js';

function mockResponse(){
  return {headers:{},statusCode:200,body:null,setHeader(k,v){this.headers[k]=v;return this;},status(n){this.statusCode=n;return this;},json(v){this.body=v;return this;}};
}
test('server-side catalog price and rial conversion',()=>{
 const cart=validateCart([{id:'bonbast',quantity:2}]);
 assert.equal(cart.totalToman,4000000);
 assert.equal(cart.totalRial,40000000);
 assert.equal(cart.lines[0].unitPrice,2000000);
});
test('rejects tampered cart and invalid quantities',()=>{
 for(const items of [[{id:'unknown',quantity:1}],[{id:'bonbast',quantity:0}],[{id:'bonbast',quantity:1},{id:'bonbast',quantity:1}],[{id:'bonbast',quantity:1,price:-1}]]){
  if(items[0]?.price===-1){assert.equal(validateCart(items).totalRial,20000000);continue;}
  assert.throws(()=>validateCart(items));
 }
});
test('sandbox adapter validates identifiers and HTTPS',()=>{
 assert.throws(()=>createRequest({api:'test',amountRial:1,factorId:'1',redirect:'https://example.com'}));
 assert.throws(()=>createRequest({api:'test',amountRial:5000,factorId:'1',redirect:'http://example.com'}));
 const req=createRequest({api:'test',amountRial:5000,factorId:'123',redirect:'https://example.com/callback'});
 assert.equal(req.body.get('amount'),'5000');
});
test('constant-time token comparison',()=>{
 assert.equal(constantTimeTokenEqual('a','a'),true);
 assert.equal(constantTimeTokenEqual('a','b'),false);
});
test('health endpoint stays in non-live mode',()=>{
 const res=mockResponse();healthHandler({method:'GET'},res);
 assert.equal(res.statusCode,200);assert.equal(res.body.livePayments,false);
});
test('create endpoint fails closed without sandbox configuration',async()=>{
 const old=process.env.BITPAY_SANDBOX_ENABLED;process.env.BITPAY_SANDBOX_ENABLED='false';
 try{const res=mockResponse();await createHandler({method:'POST',headers:{origin:'https://drjavadrezazadeh.com','content-type':'application/json'},body:{items:[{id:'bonbast',quantity:1}]}},res);
 assert.equal(res.statusCode,503);assert.equal(res.body.error,'sandbox_not_configured');}
 finally{if(old===undefined)delete process.env.BITPAY_SANDBOX_ENABLED;else process.env.BITPAY_SANDBOX_ENABLED=old;}
});
test('verify endpoint rejects unconfigured payment',()=>{
 const res=mockResponse();verifyHandler({method:'POST'},res);
 assert.equal(res.statusCode,503);
});
