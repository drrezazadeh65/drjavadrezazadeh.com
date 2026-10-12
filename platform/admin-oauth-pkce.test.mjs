import test from 'node:test';
import assert from 'node:assert/strict';
import {createOAuthChallenge,pkceChallenge,buildAdminAuthorizationUrl} from './admin-oauth-pkce.mjs';
test('generates unique PKCE verifier and state',async()=>{
 const a=createOAuthChallenge(),b=createOAuthChallenge();
 assert.notEqual(a.state,b.state);assert.notEqual(a.verifier,b.verifier);
 assert.equal((await pkceChallenge(a.verifier)).length,43);
});
test('authorization URL uses code flow with S256',async()=>{
 const {state,verifier}=createOAuthChallenge();
 const u=new URL(buildAdminAuthorizationUrl({authorizationEndpoint:'https://accounts.google.com/o/oauth2/v2/auth',clientId:'client',redirectUri:'https://admin.example.org/callback',state,challenge:await pkceChallenge(verifier)}));
 assert.equal(u.searchParams.get('response_type'),'code');assert.equal(u.searchParams.get('code_challenge_method'),'S256');
 assert.equal(u.searchParams.get('state'),state);
});
