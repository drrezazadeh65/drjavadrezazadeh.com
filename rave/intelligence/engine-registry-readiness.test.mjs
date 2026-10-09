import test from 'node:test';
import assert from 'node:assert/strict';
import {engineReadiness} from './engine-registry.mjs';
test('name-only magazine and orchestration engines are not ready or connected',()=>{
 for(const id of ['magazine','admin-orchestration']){
  const result=engineReadiness(id);
  assert.equal(result.ready,false);
  assert.equal(result.connected,false);
  assert.equal(result.capabilities.length,0);
 }
});
test('implemented and verified flags alone do not imply external connection',()=>{
 const evidence={};
 for(const name of ['providerRouting','consent','privacy','taskPlanning','sourceGrounding','humanReview'])evidence[name]={implemented:true,verified:true,connected:false};
 const result=engineReadiness('ai',evidence);
 assert.equal(result.ready,true);
 assert.equal(result.connected,false);
});
