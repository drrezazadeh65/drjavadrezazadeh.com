// OAuth callback state and PKCE helpers for independent admin identity.
// This module does not grant admin access; server-side token verification is mandatory.
const encoder=new TextEncoder();
function base64url(bytes){let s='';for(const b of bytes)s+=String.fromCharCode(b);return btoa(s).replace(/\\+/g,'-').replace(/\\//g,'_').replace(/=+$/,'')}
export function createOAuthChallenge(){
 const state=base64url(crypto.getRandomValues(new Uint8Array(32)));
 const verifier=base64url(crypto.getRandomValues(new Uint8Array(32)));
 return {state,verifier};
}
export async function pkceChallenge(verifier){
 if(typeof verifier!=='string'||verifier.length<43||verifier.length>128)throw new Error('Invalid PKCE verifier');
 return base64url(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(verifier))));
}
export function buildAdminAuthorizationUrl({authorizationEndpoint,clientId,redirectUri,state,challenge}){
 const url=new URL(authorizationEndpoint);
 if(url.protocol!=='https:'||!clientId||!redirectUri.startsWith('https://')||!state||!challenge)throw new Error('Invalid OIDC authorization config');
 url.searchParams.set('response_type','code');url.searchParams.set('client_id',clientId);
 url.searchParams.set('redirect_uri',redirectUri);url.searchParams.set('scope','openid email');
 url.searchParams.set('state',state);url.searchParams.set('code_challenge',challenge);
 url.searchParams.set('code_challenge_method','S256');
 return url.toString();
}
