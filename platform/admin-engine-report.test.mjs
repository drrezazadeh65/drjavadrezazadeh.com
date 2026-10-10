import test from 'node:test';
import assert from 'node:assert/strict';
import {buildAdminEngineReport} from './admin-engine-report.mjs';
const admin={server_authorized:true,email_verified:true,role:'ADMIN',mfa_verified:true};
test('report is fail-closed for unauthorized or non-MFA sessions',()=>{
 for(const field of ['server_authorized','email_verified','mfa_verified']){
  assert.throws(()=>buildAdminEngineReport({authorization:{...admin,[field]:false}}),/MFA admin/);
 }
 assert.throws(()=>buildAdminEngineReport({authorization:{...admin,role:'STUDENT'}}),/MFA admin/);
});
test('no signal means unverified rather than fabricated production health',()=>{
 const report=buildAdminEngineReport({authorization:admin});
 assert.equal(report.engine_count,13);
 assert.ok(report.engines.every(x=>x.status==='UNVERIFIED'&&x.metrics.requests_24h===null));
});
test('only explicitly server-verified signal can be shown as active',()=>{
 const report=buildAdminEngineReport({authorization:admin,as_of:'2026-10-09T20:05:00Z',signals:{
  commerce:{server_verified:true,status:'ACTIVE',last_verified_at:'2026-10-09T20:00:00Z',requests_24h:25,errors_24h:0},
  crm:{server_verified:false,status:'ACTIVE',last_verified_at:'2026-10-09T20:00:00Z',requests_24h:900}
 }});
 assert.equal(report.engines.find(x=>x.id==='commerce').status,'ACTIVE');
 assert.equal(report.engines.find(x=>x.id==='crm').status,'UNVERIFIED');
});
test('untrusted metrics and raw signal payload are never copied to report',()=>{
 const report=buildAdminEngineReport({authorization:admin,as_of:'2026-10-09T20:05:00Z',signals:{
  commerce:{server_verified:true,status:'DEGRADED',last_verified_at:'2026-10-09T20:00:00Z',requests_24h:-1,errors_24h:2,secret:'do-not-leak',email:'private@example.com'}
 }});
 const item=report.engines.find(x=>x.id==='commerce');
 assert.equal(item.metrics.requests_24h,null);
 assert.equal(JSON.stringify(item).includes('do-not-leak'),false);
 assert.equal(JSON.stringify(item).includes('private@example.com'),false);
});
