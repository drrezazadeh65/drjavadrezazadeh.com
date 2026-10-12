import test from 'node:test';
import assert from 'node:assert/strict';
import {assessAdminEngineDeployment} from './admin-engine-deployment-gate.mjs';
test('no claims of production readiness without evidence',()=>{
 const result=assessAdminEngineDeployment();
 assert.equal(result.ready,false);assert.equal(result.verified,0);assert.equal(result.total,7);
});
test('partial technical implementation cannot imply live deployment',()=>{
 const result=assessAdminEngineDeployment({protected_route:true,admin_ui:true});
 assert.equal(result.ready,false);assert.equal(result.verified,2);
});
test('only all explicitly verified gates qualify',()=>{
 const keys=['session_verifier','admin_mfa','protected_route','real_collectors','admin_ui','audit_logging','production_smoke'];
 assert.equal(assessAdminEngineDeployment(Object.fromEntries(keys.map(k=>[k,true]))).ready,true);
 assert.equal(assessAdminEngineDeployment(Object.fromEntries(keys.map(k=>[k,'yes']))).ready,false);
});
