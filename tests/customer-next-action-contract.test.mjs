import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const dashboard=readFileSync('assets/js/customer-dashboard.js','utf8');
const fa=readFileSync('fa/customer-dashboard/index.html','utf8');
const en=readFileSync('en/account/index.html','utf8');

test('next action is backed by the existing authenticated order history, never browser storage',()=>{
 assert.match(dashboard,/async function verifiedCustomerNextAction\(authenticated\)/);
 assert.match(dashboard,/if\(!heading\|\|!description\|\|!action\|\|!authenticated\)return/);
 assert.match(dashboard,/jsonRequest\(API\+'\/commerce\/history',\{\s*method:'GET',credentials:'include',cache:'no-store',signal:activeController\.signal\s*\}\)/);
 assert.match(dashboard,/response\.data\?\.ok!==true\|\|!Array\.isArray\(response\.data\.orders\)/);
 assert.match(dashboard,/response\.status===401\|\|response\.status===403/);
 assert.match(dashboard,/paymentVerified!==true/);
 assert.match(dashboard,/paymentVerified===true/);
 assert.match(dashboard,/bank settlement and fulfilment|Bank settlement, appointment confirmation and fulfilment/);
 assert.match(dashboard,/nextActionRequest/);
 assert.match(dashboard,/void verifiedCustomerNextAction\(authenticated\)/);
 assert.doesNotMatch(dashboard,/localStorage\.setItem\(['"](?:order|nextAction)/i);
});

test('both existing bilingual private dashboards remain intact and noindexed',()=>{
 for(const html of [fa,en]){
  assert.match(html,/name="robots" content="noindex,nofollow,noarchive/);
  assert.match(html,/data-home-heading/);
  assert.match(html,/data-home-copy/);
  assert.match(html,/data-home-action/);
  assert.match(html,/data-dashboard-panel="overview"/);
  assert.match(html,/data-dashboard-panel="consultations"/);
  assert.match(html,/data-dashboard-sheet/);
  assert.match(html,/customer-dashboard\.js\?v=/);
 }
 assert.match(dashboard,/\/en\/account\/orders\//);
 assert.match(dashboard,/\/fa\/app\/account\/orders\//);
 assert.match(dashboard,/\/en\/services\//);
 assert.match(dashboard,/\/fa\/services\//);
});
