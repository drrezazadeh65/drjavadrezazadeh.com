import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';

const auth=fs.readFileSync('assets/js/customer-auth.js','utf8');
const api=fs.readFileSync('api/index.php','utf8');
const fa=fs.readFileSync('fa/register/index.html','utf8');
const en=fs.readFileSync('en/register/index.html','utf8');

const begin=auth.indexOf('function normalizedSignupMobile(raw){');
const validatorStart=auth.indexOf('function validSignupMobile(value){',begin);
const finish=auth.indexOf('\nasync function call(',validatorStart);
assert.ok(begin>0&&validatorStart>begin&&finish>validatorStart,
 'normalizer and phone validator must remain separate pure functions');
const normalise=vm.runInNewContext('('+auth.slice(begin,validatorStart).trim()+')');
const validMobile=vm.runInNewContext('('+auth.slice(validatorStart,finish).trim()+')');

function phpNormalise(value){
 const program='define("BERTINA_MAIL_SMOKE_CONTEXT",true); require "api/index.php"; echo json_encode(normalizedRegistrationMobile($argv[1] ?? null));';
 const args=['-r',program];
 if(value!==undefined)args.push(value);
 const result=spawnSync('php',args,{cwd:process.cwd(),encoding:'utf8',timeout:8000});
 if(result.error)throw result.error;
 assert.equal(result.status,0,'PHP normalizer executable: '+result.stderr);
 return JSON.parse(result.stdout);
}

test('registration normalizes Iranian national, Persian/Arabic digits and international mobile numbers consistently',()=>{
 const cases=[
  ['09123456789','+989123456789'],
  ['09912345678','+989912345678'],
  ['۰۹۱۲ ۳۴۵ ۶۷۸۹','+989123456789'],
  ['٠٩١٢-٣٤٥-٦٧٨٩','+989123456789'],
  ['00989123456789','+989123456789'],
  ['+989123456789','+989123456789'],
  ['+4915112345678','+4915112345678'],
  ['','']
 ];
 for(const [given,expected] of cases){
  assert.equal(normalise(given),expected,'browser normalization of '+given);
  assert.equal(phpNormalise(given),expected||null,'API normalization of '+given);
 }
 assert.equal(phpNormalise(undefined),null);
});

test('browser E.164 gate accepts valid normalized phones, rejects malformed input and leaves optional blank',()=>{
 for(const raw of ['09123456789','۰۹۱۲ ۳۴۵ ۶۷۸۹','٠٩١٢-٣٤٥-٦٧٨٩',
   '00989123456789','+989123456789','+4915112345678','']){
  assert.equal(validMobile(normalise(raw)),true,
    'valid international or optional Iranian number must pass signup: '+raw);
 }
 for(const raw of ['09123','12345678901','+0','+98912abc456','+9891234567899999']){
  assert.equal(validMobile(normalise(raw)),false,
    'malformed mobile must not reach registration API: '+raw);
 }
 assert.ok(auth.includes('if(!validSignupMobile(mobile))'),
  'form must execute tested validator, not an independently escaped regex');
});

test('server rejects malformed or non-E.164 mobile numbers without inventing a country',()=>{
 for(const invalid of ['09123','12345678901','+0','+98912abc456','+9891234567899999']){
  const result=phpNormalise(invalid);
  assert.deepEqual(result,{ok:false,error:'invalid_registration'},'invalid: '+invalid);
 }
 assert.match(api,/\$mobile=normalizedRegistrationMobile\(\$b\['mobile'\]\?\?null\)/);
 assert.match(api,/\$mobile,'pending',\$now,\$now/);
});

test('registration reports errors beside mobile submit and leaves one server-owned email verification process',()=>{
 for(const html of [fa,en]){
  assert.ok(html.includes('data-auth-action-status'),'mobile-visible submit feedback');
  assert.match(html,/customer-auth\.js\?v=20\d{6}-[a-z0-9-]+/,'versioned signup runtime');
  assert.ok(html.includes('noindex,follow,noarchive'),'privacy noindex');
 }
 const faAsset=fa.match(/customer-auth\.js\?v=(20\d{6}-[a-z0-9-]+)/)?.[1];
 const enAsset=en.match(/customer-auth\.js\?v=(20\d{6}-[a-z0-9-]+)/)?.[1];
 assert.ok(faAsset && faAsset===enAsset,'Persian and English signups use one cache-busted auth runtime');
 assert.ok(auth.includes('for(const el of [statusEl,actionStatus])'),'dual accessible status');
 assert.ok(auth.includes('const mobile=normalizedSignupMobile(fd.get(\'mobile\'))'));
 assert.ok(auth.includes('mobile,password,locale:lang'));
 assert.ok(auth.includes("call('/auth/register'"));
 assert.ok(auth.includes('Registration request processed. If email verification is needed,'));
 assert.ok(auth.includes('درخواست ثبت‌نام پردازش شد.'));
 assert.ok(!auth.includes('Account created. Open your email'));
 assert.ok(!auth.includes('حساب ثبت شد. ایمیل خود را باز کنید'));
 // The API deliberately sends a generic successful response for registered or
 // existing addresses; the UI must not claim an account was newly created.
 assert.ok(api.includes("'message'=>'verification_if_applicable_sent'"));
 assert.ok(auth.includes("const {r,d}=await call('/auth/retry-verification'"));
 assert.ok(auth.includes("reason==='verification_email_unavailable'?text.emailTransportUnavailable"));
 assert.ok(auth.includes("if(!r.ok){"),'retry transport failures must not be presented as delivered email');
 assert.ok(api.includes('verification_email_failed'));
 assert.ok(api.includes('function mailReady(): bool'));
});
