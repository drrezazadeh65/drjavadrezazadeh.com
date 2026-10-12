import test from 'node:test';
import assert from 'node:assert/strict';
import {validateIndependentAdminIdentity} from './admin-independent-identity.mjs';
test('independent identity fails closed without secrets',()=>assert.equal(validateIndependentAdminIdentity().ready,false));
test('valid configuration requires D1, OAuth client and MFA',()=>{
 const env={ADMIN_DB:{prepare(){}},OIDC_ISSUER:'https://accounts.google.com',OIDC_CLIENT_ID:'client-id-123',
 OIDC_REDIRECT_URI:'https://admin.example.org/callback',OIDC_CLIENT_SECRET:'secret-not-for-git',ADMIN_MFA_REQUIRED:'true'};
 assert.equal(validateIndependentAdminIdentity(env).ready,true);
 assert.equal(validateIndependentAdminIdentity({...env,ADMIN_MFA_REQUIRED:'false'}).ready,false);
});
