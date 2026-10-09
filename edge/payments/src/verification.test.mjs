import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyProviderResponse} from './verification.mjs';
const intent={amount_rial:100000,factor_id:'202610099999'};
const good={status:1,amount:100000,factorId:intent.factor_id};
const verify=(payload,httpStatus=200)=>verifyProviderResponse(httpStatus,typeof payload==='string'?payload:JSON.stringify(payload),intent);
test('valid matching provider proof succeeds',()=>{
 assert.equal(verify(good).verified,true);
 assert.equal(verify({...good,status:11}).verified,true);
 assert.equal(verify({...good,amount:'100000'}).verified,true);
});
test('raw numeric success and invalid JSON never verify',()=>{
 for(const raw of ['1','11','', '{bad','null','[]'])assert.equal(verify(raw).verified,false);
});
test('missing order proof always fails closed',()=>{
 for(const p of [{status:1},{...good,amount:undefined},{...good,factorId:undefined},{...good,amount:null},{...good,factorId:null}])
   assert.equal(verify(p).verified,false,JSON.stringify(p));
});
test('mismatched amounts, factors and statuses are rejected',()=>{
 for(const p of [{...good,amount:99999},{...good,amount:100001},{...good,factorId:'wrong'},{...good,status:0},{...good,status:2},{...good,status:12},{...good,amount:'100000.00'},{...good,amount:'1e5'}])
   assert.equal(verify(p).verified,false,JSON.stringify(p));
});
test('HTTP failure, overflow and negative amounts fail',()=>{
 assert.equal(verify(good,503).verified,false);
 assert.equal(verify({...good,amount:'9007199254740993'}).verified,false);
 assert.equal(verify({...good,amount:-1}).verified,false);
});
test('incomplete stored order metadata cannot verify',()=>{
 const raw=JSON.stringify(good);
 assert.equal(verifyProviderResponse(200,raw,null).verified,false);
 assert.equal(verifyProviderResponse(200,raw,{factor_id:intent.factor_id}).verified,false);
 assert.equal(verifyProviderResponse(200,raw,{amount_rial:intent.amount_rial}).verified,false);
});
