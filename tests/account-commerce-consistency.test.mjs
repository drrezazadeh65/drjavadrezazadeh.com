import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
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
 const schema=read('docs/BERTINA_MYSQL_SCHEMA.sql');
 assert.match(schema,/CREATE TABLE IF NOT EXISTS customer_accounts/);
 assert.match(schema,/CREATE TABLE IF NOT EXISTS customer_auth_tokens/);
 assert.match(schema,/CREATE TABLE IF NOT EXISTS customer_auth_sessions/);
});

test('book delivery policies remain consistent in both languages',()=>{
 for(const path of ['fa/shop/checkout/index.html','fa/shop/customer-policy/index.html','fa/shop/purchase-guide/index.html']){
  const html=read(path);
  assert.match(html,/رایگان/,path);
  assert.match(html,/۱۰ تا ۱۴ روز کاری/,path);
  assert.match(html,/موجودی/,path);
 }
 for(const path of ['en/shop/checkout/index.html','en/shop/customer-policy/index.html','en/shop/purchase-guide/index.html']){
  const html=read(path);
  assert.match(html,/shipping is free/i,path);
  assert.match(html,/10–14 working days/,path);
  assert.match(html,/stock/i,path);
 }
 assert.match(read('fa/shop/checkout/index.html'),/data-book-delivery-terms/);
 assert.match(read('en/shop/checkout/index.html'),/data-book-delivery-terms/);
});

test('buyer order history renders complete UTC appointment intervals in local time without false bookings',()=>{
 const source=read('assets/js/account-order-history.js');
 const start=source.indexOf('function formatBookingWindow(');
 const end=source.indexOf('\nfunction showInfo(',start);
 assert.ok(start>0&&end>start,'timezone formatter must exist in the buyer-order module');
 const body='('+source.slice(start,end).trim()+')';
 const en=runInNewContext(body,{Intl,Date,isEn:true});
 const fa=runInNewContext(body,{Intl,Date,isEn:false});
 const summer=en('2026-06-01 12:00:00','2026-06-01 13:00:00','Europe/London');
 assert.equal(summer.timeZone,'Europe/London');
 assert.match(summer.start,/13:00/,'summer UTC is British Summer Time');
 assert.match(summer.end,/14:00/);
 const winter=en('2026-12-01 12:00:00','2026-12-01 13:00:00','Europe/London');
 assert.match(winter.start,/12:00/,'winter UTC is GMT');
 const iran=fa('2026-06-01 12:00:00','2026-06-01 13:00:00','Asia/Tehran');
 assert.equal(iran.timeZone,'Asia/Tehran');
 assert.ok(iran.start&&iran.end&&iran.start!==iran.end);
 for(const [a,b] of [
  [null,'2026-06-01 13:00:00'],
  ['2026-06-01 12:00:00',null],
  ['2026-02-30 12:00:00','2026-03-01 12:00:00'],
  ['2026-06-01 13:00:00','2026-06-01 12:00:00'],
  ['2026-06-01 12:00:00','2026-06-01 12:00:00'],
  ['2026-06-01T12:00:00Z','2026-06-01 13:00:00']
 ])assert.equal(en(a,b,'UTC'),null,'unsafe or partial booking interval must fail closed');
 assert.match(source,/formatBookingWindow\(c\.bookingStart,c\.bookingEnd\)/);
 assert.match(source,/Time zone: /);
 assert.match(source,/بازه زمان جلسه نیازمند بررسی مجدد/);
 assert.doesNotMatch(source,/Recorded slot: '\)\+c\.bookingStart/);
});
