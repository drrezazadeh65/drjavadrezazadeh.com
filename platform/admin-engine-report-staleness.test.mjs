import test from 'node:test';
import assert from 'node:assert/strict';
import {buildAdminEngineReport} from './admin-engine-report.mjs';
const authorization={server_authorized:true,email_verified:true,role:'ADMIN',mfa_verified:true};
test('stale and future signals cannot claim active status',()=>{
 const report=buildAdminEngineReport({authorization,as_of:'2026-10-09T20:05:00Z',signals:{
  crm:{server_verified:true,status:'ACTIVE',last_verified_at:'2026-10-09T19:00:00Z'},
  commerce:{server_verified:true,status:'ACTIVE',last_verified_at:'2026-10-09T20:06:00Z'}
 }});
 assert.equal(report.engines.find(e=>e.id==='crm').status,'UNVERIFIED');
 assert.equal(report.engines.find(e=>e.id==='commerce').status,'UNVERIFIED');
});
