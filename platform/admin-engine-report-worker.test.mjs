import test from 'node:test';
import assert from 'node:assert/strict';
import {createAdminEngineReportWorker} from './admin-engine-report-worker.mjs';
const endpoint='https://drjavadrezazadeh.com/api/v1/admin/engine-status';
test('requires trusted session verification and signal collector at construction',()=>{
 assert.throws(()=>createAdminEngineReportWorker(),/mandatory/);
});
test('anonymous request never reaches private collector',async()=>{
 let calls=0;
 const worker=createAdminEngineReportWorker({verifySession:async()=>null,collectSignals:async()=>{calls++;return {}}});
 const response=await worker.fetch(new Request(endpoint));
 assert.equal(response.status,403);assert.equal(calls,0);
 assert.equal(response.headers.get('Cache-Control'),'private, no-store, max-age=0');
});
test('private worker responds with verified report and safe headers',async()=>{
 const worker=createAdminEngineReportWorker({
  verifySession:async()=>({server_authorized:true,email_verified:true,role:'ADMIN',mfa_verified:true}),
  collectSignals:async()=>({}),clock:()=>new Date('2026-10-09T20:05:00Z')
 });
 const response=await worker.fetch(new Request(endpoint));
 assert.equal(response.status,200);
 assert.equal((await response.json()).engines.length,13);
 assert.match(response.headers.get('X-Robots-Tag'),/noindex/);
 assert.equal(response.headers.get('X-Content-Type-Options'),'nosniff');
});
test('unrelated routes are not exposed by the admin worker',async()=>{
 const worker=createAdminEngineReportWorker({verifySession:async()=>null,collectSignals:async()=>({})});
 assert.equal((await worker.fetch(new Request('https://drjavadrezazadeh.com/'))).status,404);
});

test('rejects cross-origin requests before identity or telemetry access',async()=>{
 let verified=0,probed=0;
 const worker=createAdminEngineReportWorker({verifySession:async()=>{verified++;return null},collectSignals:async()=>{probed++;return {}}});
 const response=await worker.fetch(new Request(endpoint,{headers:{Origin:'https://malicious.example'}}));
 assert.equal(response.status,403);assert.equal(verified,0);assert.equal(probed,0);
 assert.equal(response.headers.get('Cache-Control'),'private, no-store, max-age=0');
});

test('rejects cross-site fetch metadata without calling authentication',async()=>{
 let calls=0;
 const worker=createAdminEngineReportWorker({verifySession:async()=>{calls++;return null},collectSignals:async()=>({})});
 const response=await worker.fetch(new Request(endpoint,{headers:{'Sec-Fetch-Site':'cross-site'}}));
 assert.equal(response.status,403);assert.equal(calls,0);
});
