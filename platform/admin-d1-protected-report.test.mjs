import test from 'node:test';
import assert from 'node:assert/strict';
import {createD1ProtectedEngineReport} from './admin-d1-protected-report.mjs';
const url='https://drjavadrezazadeh.com/api/v1/admin/engine-status';
test('refuses construction without trusted session provider and telemetry',()=>{
 assert.throws(()=>createD1ProtectedEngineReport(),/required/);
});
test('rejects valid identity without active D1 admin grant',async()=>{
 const worker=createD1ProtectedEngineReport({introspectSession:async()=>({verified:true,email_verified:true,mfa_verified:true,subject:'s'}),
 collectSignals:async()=>{throw Error('must not run')}});
 const response=await worker.fetch(new Request(url),{ADMIN_DB:{prepare:()=>({bind:()=>({first:async()=>null})})}});
 assert.equal(response.status,403);
});
test('valid signed identity plus D1 role can read private unverified status',async()=>{
 const worker=createD1ProtectedEngineReport({introspectSession:async()=>({verified:true,email_verified:true,mfa_verified:true,subject:'s'}),
 collectSignals:async()=>({}),clock:()=>new Date('2026-10-09T20:00:00Z')});
 const response=await worker.fetch(new Request(url),{ADMIN_DB:{prepare:()=>({bind:()=>({first:async()=>({admin_id:'a',role:'ADMIN',enabled:1})})})}});
 assert.equal(response.status,200);const report=await response.json();
 assert.equal(report.engines.length,13);assert.ok(report.engines.every(e=>e.status==='UNVERIFIED'));
});
