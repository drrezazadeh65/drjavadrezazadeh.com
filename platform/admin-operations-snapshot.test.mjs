import test from 'node:test';
import assert from 'node:assert/strict';
import {buildAdminOperationsSnapshot} from './admin-operations-snapshot.mjs';
const authorization={server_authorized:true,email_verified:true,role:'ADMIN',mfa_verified:true};
test('cannot probe infrastructure without verified admin access',async()=>{
 let calls=0;
 await assert.rejects(()=>buildAdminOperationsSnapshot({fetcher:async()=>{calls++}}),/MFA admin/);
 assert.equal(calls,0);
});
test('edge healthy cannot make unverified domain engines active',async()=>{
 const snapshot=await buildAdminOperationsSnapshot({authorization,now:()=>new Date('2026-10-09T20:00:00Z'),
  fetcher:async url=>({ok:true,url,async json(){return {status:'ok',service:url.includes('assistant.')?'site-assistant':'payments'}}})});
 assert.equal(snapshot.edge.filter(x=>x.healthy).length,2);
 assert.equal(snapshot.domain.engines.length,13);
 assert.ok(snapshot.domain.engines.every(x=>x.status==='UNVERIFIED'));
});
