import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('unified customer account routes use one same-origin auth client and fail closed before health readiness',()=>{
 for(const path of ['fa/register/index.html','en/register/index.html','fa/login/index.html','en/login/index.html']){
  const html=read(path);
  assert.match(html,/noindex/,path);
  assert.match(html,/customer-auth\.js/,path);
  assert.match(html,/data-auth-live-control/,path);
  assert.match(html,/disabled/,path);
 }
 const client=read('assets/js/customer-auth.js');
 assert.match(client,/const API='\/api'/);
 assert.match(client,/\/auth\/health/);
 assert.match(client,/\/auth\/register/);
 assert.match(client,/\/auth\/login/);
 assert.match(client,/\/auth\/forgot-password/);
 assert.match(client,/\/auth\/reset-password/);
 assert.match(client,/credentials:'include'/);
});

test('English shop uses official domain email for customer support',()=>{
 const html=read('en/shop/index.html');
 assert.match(html,/mailto:info@drjavadrezazadeh\.com/);
 assert.doesNotMatch(html,/mailto:dr\.rezazadeh65@gmail\.com/);
});

test('legacy routes redirect to canonical account paths',()=>{
 assert.match(read('register/index.html'),/\.\.\/en\/register\//);
 assert.match(read('login/index.html'),/\.\.\/en\/login\//);
});

test('book cart enquiries use the official support mailbox',()=>{
 const js=read('assets/js/book-store.js');
 assert.match(js,/mailto:info@drjavadrezazadeh\.com/);
 assert.doesNotMatch(js,/mailto:dr\.rezazadeh65@gmail\.com/);
});

test('Bertina PHP auth backend remains fail-closed and uses local mail plus MySQL',()=>{
 const auth=read('api/index.php');
 assert.match(auth,/mailReady\(\)/);
 assert.match(auth,/sendLocalMail/);
 assert.match(auth,/auth_pepper/);
 assert.match(auth,/customer_auth_sessions/);
 assert.match(auth,/invalid_credentials/);
 assert.match(auth,/recovery_if_account_exists_sent/);
 const retiredPattern=new RegExp(['workers','\\.dev|api\\.','resend','\\.com|RESEND','_API_KEY'].join(''),'i');
 assert.doesNotMatch(auth,retiredPattern);
 const schema=read('docs/BERTINA_MYSQL_SCHEMA.sql');
 assert.match(schema,/CREATE TABLE IF NOT EXISTS customer_accounts/);
 assert.match(schema,/CREATE TABLE IF NOT EXISTS customer_auth_tokens/);
 assert.match(schema,/CREATE TABLE IF NOT EXISTS customer_auth_sessions/);
});
