/**
 * Server-only OAuth authorization flow preparation/return validation.
 * Requires existing verified owner admin session; this is NOT a public callback server.
 * Never accept usernames/passwords. Never store authorization codes/tokens in logs.
 * Token exchange, verified account lookup, encryption and durable storage are
 * intentionally separate protected server integration tasks.
 */
import {randomBytes,createHash,timingSafeEqual} from 'node:crypto';
import {CONNECTORS} from './connections.mjs';

const ORIGIN='https://drjavadrezazadeh.com';
const STATE_LIFETIME_MS=10*60*1000;
const b64=buffer=>buffer.toString('base64url');
const valid=(s)=>typeof s==='string'&&s.length>0;
const encode=values=>{
 const u=new URLSearchParams();
 for(const [key,val] of Object.entries(values)){if(val!==undefined&&val!==null)u.set(key,String(val));}
 return u;
};
function callbackCheck(redirectUri){
 const u=new URL(redirectUri);
 if(u.protocol!=='https:'||u.origin!==ORIGIN||u.username||u.password||u.search||u.hash)
  throw Error('Callback must use exact HTTPS first-party origin, no query or fragment');
 if(!/^\/api\/admin\/social\/oauth\/callback\/?$/.test(u.pathname))
  throw Error('Invalid callback path');
 return u.toString();
}
function authConfig(network,version){
 switch(network){
 case 'instagram':return {
   authorization:'https://www.facebook.com/'+version+'/dialog/oauth',
   scopes:'pages_show_list pages_read_engagement instagram_basic instagram_content_publish'
 };
 case 'facebook':return {
   authorization:'https://www.facebook.com/'+version+'/dialog/oauth',
   scopes:'pages_show_list pages_read_engagement pages_manage_posts'
 };
 case 'x':return {
   authorization:'https://x.com/i/oauth2/authorize',
   scopes:'tweet.read tweet.write users.read offline.access',pkce:true
 };
 case 'youtube':return {
   authorization:'https://accounts.google.com/o/oauth2/v2/auth',
   scopes:'https://www.googleapis.com/auth/youtube.upload',
   extra:{access_type:'offline',prompt:'consent'},pkce:true
 };
 case 'linkedin':return {
   authorization:'https://www.linkedin.com/oauth/v2/authorization',
   scopes:'openid profile w_member_social'
 };
 default:throw Error('This provider requires a different official authorization process');
 }
}
export function beginOAuth({network,clientId,redirectUri,adminSessionId,metaGraphVersion,
 now=Date.now()}){
 if(!CONNECTORS[network])throw Error('Unknown network');
 if(!valid(clientId)||!valid(adminSessionId))throw Error('Verified owner session and app client ID required');
 const callback=callbackCheck(redirectUri);
 const metaVer=/^v\d+\.\d+$/.test(metaGraphVersion||'')?metaGraphVersion:null;
 if(['instagram','facebook'].includes(network)&&!metaVer)throw Error('Verified Meta Graph version required');
 const conf=authConfig(network,metaVer);
 const state=b64(randomBytes(32));
 const verifier=conf.pkce?b64(randomBytes(64)):null;
 const challenge=verifier?b64(createHash('sha256').update(verifier).digest()):null;
 const params={response_type:'code',client_id:clientId,redirect_uri:callback,
  scope:conf.scopes,state,...conf.extra};
 if(challenge){params.code_challenge_method='S256';params.code_challenge=challenge;}
 const url=conf.authorization+'?'+encode(params);
 // Store this server-side in the authenticated owner session only, never in browser storage.
 const transaction={network,state,verifier,adminSessionId,redirectUri:callback,
  issuedAt:now,consumed:false};
 return {url,transaction};
}
const safeEqual=(a,b)=>{
 if(!valid(a)||!valid(b))return false;
 const aBuf=Buffer.from(a),bBuf=Buffer.from(b);
 return aBuf.length===bBuf.length&&timingSafeEqual(aBuf,bBuf);
};
/**
 * Returns only an authorization code to the trusted backend. Caller MUST mark
 * its persisted transaction consumed atomically, then exchange code server-side.
 */
export function validateOAuthCallback({network,callbackParams,transaction,
 adminSessionId,now=Date.now()}){
 if(!transaction||transaction.consumed||transaction.network!==network)
  throw Error('Authorization session missing, used or network mismatch');
 if(!safeEqual(transaction.adminSessionId,adminSessionId))
  throw Error('Owner admin session changed');
 if(now<transaction.issuedAt||now-transaction.issuedAt>STATE_LIFETIME_MS)
  throw Error('Authorization attempt has expired');
 const params=callbackParams instanceof URLSearchParams?callbackParams:new URLSearchParams(callbackParams);
 if(params.has('error'))throw Error('Authorization was not granted');
 if(!safeEqual(params.get('state'),transaction.state))
  throw Error('Untrusted authorization response');
 const code=params.get('code');
 if(!valid(code)||code.length>4096)throw Error('Authorization code missing');
 return {code,network,verifier:transaction.verifier,
  mustConsumeState:true,mustExchangeServerSide:true};
}
