import test from 'node:test';
import assert from 'node:assert/strict';
import {validateAdminRuntimeConfig} from './admin-runtime-config.mjs';
test('missing production identity and D1 configuration fails closed',()=>{
 const result=validateAdminRuntimeConfig();assert.equal(result.ready,false);assert.equal(result.failures.length,5);
});
test('all required deployment settings pass structural checks',()=>{
 const result=validateAdminRuntimeConfig({ADMIN_DB:{prepare(){}},IDENTITY_ISSUER:'https://identity.example.org',
 IDENTITY_AUDIENCE:'admin-service',ADMIN_MFA_REQUIRED:'true',ADMIN_REPORT_ENABLED:'true'});
 assert.equal(result.ready,true);
});
test('does not treat a structural configuration check as actual identity verification',()=>{
 const result=validateAdminRuntimeConfig({ADMIN_DB:{prepare(){}},IDENTITY_ISSUER:'http://bad.example',
 IDENTITY_AUDIENCE:'admin-service',ADMIN_MFA_REQUIRED:true,ADMIN_REPORT_ENABLED:'true'});
 assert.equal(result.ready,false);
});
