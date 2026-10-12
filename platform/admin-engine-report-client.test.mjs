import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeEngineReport,loadAdminEngineReport} from './admin-engine-report-client.mjs';
test('requires a transport supplied by protected admin runtime',async()=>{
 await assert.rejects(loadAdminEngineReport(),/Authorized admin transport/);
});
test('renders only allowlisted fields and rejects malformed payloads',()=>{
 assert.throws(()=>normalizeEngineReport({engines:[]}),/Invalid engine report/);
 const output=normalizeEngineReport({as_of:'2026-10-09T20:00:00Z',engines:[{id:'commerce',owner_module:'commerce',status:'ACTIVE',last_verified_at:'2026-10-09T19:00:00Z',metrics:{requests_24h:12,errors_24h:0},private_email:'secret@example.com'}]});
 assert.equal(output.engines[0].status,'ACTIVE');
 assert.equal(JSON.stringify(output).includes('secret@example.com'),false);
});
test('unrecognized state is never represented as active',()=>{
 const output=normalizeEngineReport({as_of:'2026-10-09T20:00:00Z',engines:[{id:'crm',status:'UNKNOWN',metrics:{requests_24h:-2}}]});
 assert.equal(output.engines[0].status,'UNVERIFIED');
 assert.equal(output.engines[0].requests_24h,null);
});
