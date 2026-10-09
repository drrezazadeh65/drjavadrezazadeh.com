import test from 'node:test';
import assert from 'node:assert/strict';
import {createAdminSessionVerifier} from './admin-session-verifier.mjs';
const req={headers:new Headers()};
test('requires trusted identity and role sources',()=>{
 assert.throws(()=>createAdminSessionVerifier(),/required/);
});
test('rejects browser claims and does not look up unverified identities',async()=>{
 let lookups=0;
 const verify=createAdminSessionVerifier({introspectSession:async()=>({subject:'a',verified:false,email_verified:true,mfa_verified:true}),
 lookupAdmin:async()=>{lookups++;return {enabled:true,role:'ADMIN'}}});
 assert.equal(await verify({request:req}),null);assert.equal(lookups,0);
});
test('requires server-side enabled admin role',async()=>{
 const verify=createAdminSessionVerifier({introspectSession:async()=>({subject:'a',verified:true,email_verified:true,mfa_verified:true}),
 lookupAdmin:async()=>({enabled:false,role:'ADMIN'})});
 assert.equal(await verify({request:req}),null);
});
test('verified identity and enabled admin yield narrow authorization projection',async()=>{
 const verify=createAdminSessionVerifier({introspectSession:async()=>({subject:'a',verified:true,email_verified:true,mfa_verified:true,token:'secret'}),
 lookupAdmin:async()=>({enabled:true,role:'ADMIN',id:'admin-1',email:'private@example.com'})});
 assert.deepEqual(await verify({request:req}),{server_authorized:true,email_verified:true,mfa_verified:true,role:'ADMIN',admin_id:'admin-1'});
});
