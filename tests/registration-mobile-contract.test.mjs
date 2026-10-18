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
const finish=auth.indexOf('\nasync function call(',begin);
assert.ok(begin>0&&finish>begin,'mobile normalizer must be a dedicated pure function');
const normalise=vm.runInNewContext('('+auth.slice(begin,finish).trim()+')');

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
  assert.ok(html.includes('customer-auth.js?v=20261019-mobile-feedback-v52'),'fresh signup behavior');
  assert.ok(html.includes('noindex,follow,noarchive'),'privacy noindex');
 }
 assert.ok(auth.includes('for(const el of [statusEl,actionStatus])'),'dual accessible status');
 assert.ok(auth.includes('const mobile=normalizedSignupMobile(fd.get(\'mobile\'))'));
 assert.ok(auth.includes('mobile,password,locale:lang'));
 assert.ok(auth.includes("call('/auth/register'"));
 assert.ok(auth.includes("call('/auth/retry-verification'"));
 assert.ok(api.includes('verification_email_failed'));
 assert.ok(api.includes('function mailReady(): bool'));
});
