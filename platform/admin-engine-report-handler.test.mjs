import test from 'node:test';
import assert from 'node:assert/strict';
import {handleAdminEngineReport} from './admin-engine-report-handler.mjs';
const identity={server_authorized:true,email_verified:true,role:'ADMIN',mfa_verified:true,admin_id:'a1'};
test('rejects anonymous and non-MFA requests before querying signals',async()=>{
 let called=0;const collectSignals=()=>{called++;return {}};
 const anonymous=await handleAdminEngineReport({request:{method:'GET'},authenticate:async()=>null,collectSignals});
 assert.equal(anonymous.status,403);
 const nonMfa=await handleAdminEngineReport({request:{method:'GET'},authenticate:async()=>({...identity,mfa_verified:false}),collectSignals});
 assert.equal(nonMfa.status,403);assert.equal(called,0);
});
test('allows authenticated admin and sets private nonindex headers',async()=>{
 const result=await handleAdminEngineReport({request:{method:'GET'},authenticate:async()=>identity,collectSignals:async()=>({}),clock:()=>new Date('2026-10-09T20:00:00Z')});
 assert.equal(result.status,200);assert.equal(result.body.engines.length,13);
 assert.match(result.headers['Cache-Control'],/no-store/);
 assert.match(result.headers['X-Robots-Tag'],/noindex/);
});
test('signal provider errors never leak private exception details',async()=>{
 const result=await handleAdminEngineReport({request:{method:'GET'},authenticate:async()=>identity,collectSignals:async()=>{throw Error('secret provider token')}});
 assert.equal(result.status,503);assert.equal(JSON.stringify(result).includes('secret provider token'),false);
});
test('unsafe HTTP methods do not run authorization or collection',async()=>{
 const result=await handleAdminEngineReport({request:{method:'POST'},authenticate:async()=>{throw Error('should not run')},collectSignals:async()=>({})});
 assert.equal(result.status,405);
});
