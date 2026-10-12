import test from 'node:test';
import assert from 'node:assert/strict';
import {beginOAuth,validateOAuthCallback} from './oauth-connect.mjs';
import {CONNECTORS,validateHandle,connectorPublicView} from './connections.mjs';
import {planPost,planCampaign} from './composer.mjs';
const callback='https://drjavadrezazadeh.com/api/admin/social/oauth/callback';
const fixture={title:'روایی آزمون در بستر آموزشی',description:'پیوند میان شواهد، تفسیر و تصمیم‌گیری آموزشی در مدرسه.',
 url:'https://drjavadrezazadeh.com/fa/rahnamaha/azmoon-khoob-vijegiha/'};
test('social account catalog supports at least 16 networks without password collection',()=>{
 assert.ok(Object.keys(CONNECTORS).length>=16);
 assert.ok(Object.values(CONNECTORS).every(x=>x.kind&&x.how&&x.official));
 assert.equal(connectorPublicView('instagram').connected,false);
 assert.equal('password' in connectorPublicView('instagram'),false);
});
test('OAuth uses cryptographic state, PKCE where required, exact first-party callback',()=>{
 const r=beginOAuth({network:'x',clientId:'development-id',redirectUri:callback,adminSessionId:'session-1234'});
 const u=new URL(r.url);
 assert.equal(u.origin,'https://x.com');
 assert.equal(u.searchParams.get('code_challenge_method'),'S256');
 assert.equal(u.searchParams.get('code_challenge')?.length,43);
 assert.notEqual(u.searchParams.get('state'),r.transaction.verifier);
 const validated=validateOAuthCallback({network:'x',
  callbackParams:new URLSearchParams({state:r.transaction.state,code:'sample-nonsecret-code'}),
  transaction:r.transaction,adminSessionId:'session-1234'});
 assert.equal(validated.code,'sample-nonsecret-code');
 assert.equal(validated.mustExchangeServerSide,true);
});
test('OAuth rejects mismatched state, wrong admin, expired or changed provider',()=>{
 const r=beginOAuth({network:'youtube',clientId:'id',redirectUri:callback,adminSessionId:'owner',now:1000});
 const base={network:'youtube',callbackParams:{state:r.transaction.state,code:'abc'},
  transaction:r.transaction,adminSessionId:'owner',now:1001};
 assert.throws(()=>validateOAuthCallback({...base,callbackParams:{state:'forged',code:'abc'}}));
 assert.throws(()=>validateOAuthCallback({...base,adminSessionId:'wrong'}));
 assert.throws(()=>validateOAuthCallback({...base,now:1000+11*60*1000}));
 assert.throws(()=>validateOAuthCallback({...base,network:'x'}));
 assert.throws(()=>beginOAuth({network:'youtube',clientId:'id',redirectUri:'https://evil.example/callback',adminSessionId:'owner'}));
});
test('Meta requires a pinned API version and dedicated app permissions',()=>{
 assert.throws(()=>beginOAuth({network:'instagram',clientId:'id',redirectUri:callback,adminSessionId:'owner'}));
 const r=beginOAuth({network:'instagram',clientId:'id',redirectUri:callback,adminSessionId:'owner',metaGraphVersion:'v24.0'});
 assert.match(r.url,/instagram_content_publish/);
});
test('account identifier is public handle only; reject misleading characters',()=>{
 assert.equal(validateHandle('x','@J_Rezazadeh'),'J_Rezazadeh');
 assert.throws(()=>validateHandle('x','@user pass'));
});
test('Persian topic hashtags are drawn from article content',()=>{
 const p=planPost(fixture,'telegram');
 assert.ok(p.hashtags.includes('#سنجش_آموزشی'));
 assert.match(p.body,/utm_source=telegram/);
 assert.equal(p.status,'draft');
 assert.equal(p.published,false);
});
test('X copies stay under conservative 240-char target with URL and tags',()=>{
 const p=planPost({...fixture,description:'توضیح '.repeat(1000)},'x');
 assert.ok(p.characterCount<=240);
 assert.match(p.body,/utm_source=x/);
 assert.ok(p.hashtags.length<=2);
});
test('Video-only platforms and WhatsApp never become eligible from text alone',()=>{
 for(const net of ['aparat','youtube','tiktok','whatsapp']){
  assert.equal(planPost(fixture,net).readyForApproval,false,net);
 }
});
test('Instagram caption warns about unclickable URLs and needs approved media',()=>{
 const p=planPost(fixture,'instagram');
 assert.equal(p.readyForApproval,false);
 assert.ok(p.warnings.some(x=>x.includes('not clickable')));
 assert.match(p.body,/utm_source=instagram/);
});
test('multi-account queue supports two pages per platform and rejects duplicates',()=>{
 const p=planCampaign(fixture,[
 {network:'instagram',handle:'page_one'},{network:'instagram',handle:'page_two'},
 {network:'telegram',handle:'channel1'}]);
 assert.equal(p.length,3);
 assert.notEqual(p[0].idempotencyKey,p[1].idempotencyKey);
 assert.ok(p.every(x=>x.providerConnectionRequired));
 assert.throws(()=>planCampaign(fixture,[{network:'x',handle:'@demo'},{network:'x',handle:'demo'}]));
});
test('foreign website is rejected',()=>{
 assert.throws(()=>planPost({...fixture,url:'https://other.example/fa/test/removed'},'x'));
});

test('source canonical excludes checkout, account and tracking-query lookalikes',()=>{
 for(const uri of [
   'https://drjavadrezazadeh.com/en/account/admin/',
   'https://drjavadrezazadeh.com/fa/customer-dashboard/',
   'https://drjavadrezazadeh.com/fa/akhbar/example/?utm_campaign=forge',
   'https://drjavadrezazadeh.com/fa/akhbar/example/#fragment'
 ]) assert.throws(()=>planPost({...fixture,url:uri},'telegram'),uri);
});
