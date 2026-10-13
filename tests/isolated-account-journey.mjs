import assert from 'node:assert/strict';
import fs from 'node:fs';
import {setTimeout as delay} from 'node:timers/promises';
import {randomUUID} from 'node:crypto';

const origin='https://drjavadrezazadeh.com';
const local='http://127.0.0.1:19237/api';
const mailbox=process.env.JR_QA_MAILBOX;
if(!mailbox || !mailbox.startsWith('/'))throw Error('Isolated SMTP mailbox path required');

async function request(path,payload=null,cookie=''){
  const headers={Accept:'application/json'};
  if(payload!==null){headers.Origin=origin;headers['Content-Type']='application/json'}
  if(cookie)headers.Cookie=cookie;
  const r=await fetch(local+path,{method:payload===null?'GET':'POST',
    headers,body:payload===null?undefined:JSON.stringify(payload),redirect:'manual'});
  return {code:r.status,data:await r.json().catch(()=>({})),setCookie:r.headers.get('set-cookie')||''};
}
async function waitForMail(marker){
  for(let i=0;i<60;i++){
    const messages=fs.readFileSync(mailbox,'utf8').trim().split('\n').filter(Boolean)
      .map(s=>JSON.parse(s).message);
    const hit=messages.find(m=>m.includes(marker));
    if(hit)return hit;
    await delay(200);
  }
  throw Error('Expected isolated mail was not accepted');
}
function extract(message,parameter){
  const regex=new RegExp('[?&]'+parameter+'=([^\\s&]+)');
  const match=message.match(regex);
  assert.ok(match,'Test mail lacked expected one-time link');
  return decodeURIComponent(match[1]);
}
let healthy;
for(let i=0;i<60;i++){
  try{
    const response=await request('/auth/health');
    if(response.code===200){healthy=response.data;break}
  }catch{}
  await delay(200);
}
assert.ok(healthy,'Isolated PHP router did not start');
assert.equal(healthy.ready,true,'Isolated auth MariaDB tables unavailable');
assert.equal(healthy.registrationReady,true,'Isolated TLS SMTP sink unavailable');
console.log('PASS isolated production PHP auth readiness');

const email='qa-'+randomUUID()+'@example.test';
const original='Strong-Initial-QA-Password-2026';
const replacement='Another-Strong-QA-Password-2026';
const invalid=await request('/auth/register',{email:'broken',mobile:'',password:original,locale:'en'});
assert.equal(invalid.code,400,'Malformed registration must be rejected');
const created=await request('/auth/register',{email,mobile:'+12025550137',password:original,locale:'en'});
assert.equal(created.code,202,'Registration did not create pending test account');
assert.equal(created.data.ok,true);
const unverified=await request('/auth/login',{email,password:original});
assert.equal(unverified.code,401,'Pending account logged in without verification');
const verificationMessage=await waitForMail('/en/login/?verify=');
const verifyToken=extract(verificationMessage,'verify');
const verified=await request('/auth/verify-email',{token:verifyToken});
assert.equal(verified.code,200);
assert.equal(verified.data.verified,true);
const replay=await request('/auth/verify-email',{token:verifyToken});
assert.notEqual(replay.code,200,'Verification token was reusable');
console.log('PASS pending account, encrypted test mail, one-time email activation');

const wrong=await request('/auth/login',{email,password:'wrong-password-2026'});
assert.equal(wrong.code,401);
const login=await request('/auth/login',{email,password:original});
assert.equal(login.code,200);
const cookie=login.setCookie.split(';')[0];
assert.match(cookie,/^drjr_session=/);
const me=await request('/auth/me',null,cookie);
assert.equal(me.code,200);
assert.equal(me.data.user.emailVerified,true);
assert.equal(me.data.user.email,email);
const alien=await request('/auth/me');
assert.equal(alien.code,401);
console.log('PASS session access restricted to the authenticated account');

const recoveryUnknown=await request('/auth/forgot-password',{email:'missing@invalid.example',locale:'en'});
assert.equal(recoveryUnknown.code,202,'Unknown account must receive a uniform response');
const requested=await request('/auth/forgot-password',{email,locale:'en'});
assert.equal(requested.code,202);
const recoveryMail=await waitForMail('/en/recover/?token=');
const resetToken=extract(recoveryMail,'token');
const reset=await request('/auth/reset-password',{token:resetToken,password:replacement});
assert.equal(reset.code,200);
const reused=await request('/auth/reset-password',{token:resetToken,password:replacement});
assert.notEqual(reused.code,200,'Password reset token was reusable');
const revoked=await request('/auth/me',null,cookie);
assert.equal(revoked.code,401,'Old session survived password reset');
const oldPassword=await request('/auth/login',{email,password:original});
assert.equal(oldPassword.code,401);
const newPassword=await request('/auth/login',{email,password:replacement});
assert.equal(newPassword.code,200);
console.log('PASS generic recovery, one-time reset, old-session revocation and new credentials');
console.log('ISOLATED_ACCOUNT_E2E_PASS: no production database, actual customer or external mail provider accessed');
