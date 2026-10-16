import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const php=readFileSync('api/newsletter-preferences.php','utf8');
const ui=readFileSync('assets/js/newsletter-preferences.js','utf8');
const consent=readFileSync('database/unified/001_core_governance.sql','utf8');
const comms=readFileSync('database/unified/005a_communications_support.sql','utf8');
test('one existing account and consent schema; never invent a parallel mailing-list table',()=>{
 for(const q of ['eco_notification_preferences','eco_consent_records','eco_consent_notices']){
  assert.match(php,new RegExp(q));
  assert.match(consent+comms,new RegExp('CREATE TABLE IF NOT EXISTS '+q));
 }
 assert.doesNotMatch(php,/CREATE TABLE|CREATE DATABASE|DROP TABLE|ALTER TABLE/);
});
test('only confirmed adult topics may opt in; token and origin required; opt out remains possible',()=>{
 for(const str of ['email_verified_at','consentGiven','adultConfirmed','jrNewsletterChosen',
  'hash_equals(jrNewsletterCsrf($actor)','HTTP_ORIGIN','HTTP_X_JR_NEWSLETTER_CSRF','rateAllowed',
  "'WITHDRAWN'","'GRANTED'"]){
  assert.ok(php.includes(str),'Missing '+str);
 }
 assert.ok(ui.includes("selected.length>0&&consent.checked"));
 assert.ok(ui.includes("selected.length>0&&adult.checked"));
 assert.ok(ui.includes("selected.length?words.done:words.off"));
 assert.doesNotMatch(ui,/localStorage|sessionStorage|document\.cookie|mail\(/);
});
test('mail is never falsely presented as operational before verified worker exists',()=>{
 assert.match(php,/deliveryVerified'=>false/);
 assert.match(php,/deliveryActive'=>false/);
 assert.match(php,/subscribedEmailDeliveryVerified'=>false/);
 assert.match(ui,/actual email delivery is not yet verified/);
 assert.doesNotMatch(php,/sendLocalMail|mail\(|INSERT INTO eco_notifications/);
});
test('both account dashboards have reusable private preference region and separate stylesheet',()=>{
 for(const p of ['fa/customer-dashboard/index.html','en/account/index.html']){
  const html=readFileSync(p,'utf8');
  assert.match(html,/data-jr-newsletter hidden/);
  assert.match(html,/newsletter-preferences\.js\?v=/);
  assert.match(html,/newsletter-preferences\.css\?v=/);
  assert.match(html,/noindex,nofollow/);
 }
});
