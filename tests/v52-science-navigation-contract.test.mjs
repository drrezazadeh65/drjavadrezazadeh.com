import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';

// This is an offline source gate. It never calls Bertina or uses real learner data.
const source=fs.readFileSync('assets/js/jr-science-unified-nav-v52.js','utf8');
const captures=source.match(/const fa = (\{[\s\S]*?\});\s*const en = (\{[\s\S]*?\});/);
assert.ok(captures,'bilingual route definitions must remain explicit');
const fa=vm.runInNewContext('('+captures[1]+')');
const en=vm.runInNewContext('('+captures[2]+')');
const locales={fa,en};
const allPaths=[
 'fa/golden-talent/index.html',
 'fa/assessments/golden-talent/index.html',
 'fa/assessments/golden-talent/start/index.html',
 ...['','bahar/','context/','records/','progress/','appointments/','golden-path/','integrated-profile/'].map(v=>'fa/app/student/'+v+'index.html'),
 'en/golden-talent/index.html','en/golden-talent/assessment/index.html','en/golden-talent/student/index.html',
 ...['','bahar/','context/','records/','progress/','appointments/','golden-path/','profile/'].map(v=>'en/golden-talent/dashboard/'+v+'index.html')
];
test('all bilingual menu URLs resolve to existing committed pages',()=>{
 for(const [lang,urls] of Object.entries(locales)){
  assert.equal(Object.keys(urls).length,12,lang+' navigation inventory changed unexpectedly');
  for(const [key,uri] of Object.entries(urls)){
   assert.ok(uri.startsWith('/'+lang+'/'),lang+' '+key+' is cross-language');
   assert.ok(uri.endsWith('/'),lang+' '+key+' is not a directory URL');
   assert.ok(fs.existsSync(path.join(process.cwd(),uri.slice(1),'index.html')),lang+' '+key+' missing '+uri);
  }
 }
 assert.equal(en.dashboard,'/en/golden-talent/dashboard/');
 assert.equal(en.rcas,'/en/golden-talent/assessment/');
 assert.equal(en.bahar,'/en/golden-talent/dashboard/bahar/');
 assert.equal(en.plans,'/en/golden-talent/plans/');
 assert.equal(en.account,'/en/account/');
 assert.equal(fa.dashboard,'/fa/app/student/');
 assert.equal(fa.rcas,'/fa/assessments/golden-talent/start/');
 assert.equal(fa.bahar,'/fa/app/student/bahar/');
 assert.equal(fa.account,'/fa/app/account/');
});
test('all 22 existing science pages include the same cache-busted shared menu once',()=>{
 for(const file of allPaths){
  const html=fs.readFileSync(file,'utf8');
  const scripts=html.match(/jr-science-unified-nav-v52\.js\?v=20261019-v2/g)||[];
  assert.equal(scripts.length,1,file+' does not mount exactly one shared menu');
  assert.match(html,/<meta name="robots" content="(?:noindex|index)/,file+' indexing intent missing');
 }
});
test('shared navigation makes no purchases, writes or entitlement decisions',()=>{
 assert.match(source,/server-side authorization/);
 assert.match(source,/const types = \{/);
 assert.match(source,/paid: 'paid'/);
 assert.match(source,/types\[key\]/);
 assert.doesNotMatch(source,/\b(?:fetch|XMLHttpRequest|WebSocket)\s*\(/);
 assert.doesNotMatch(source,/\b(?:localStorage|sessionStorage|document\.cookie)\b/);
 assert.doesNotMatch(source,/\b(?:paymentVerified|entitlementGranted)\s*=\s*true/);
 assert.match(source,/setAttribute\('aria-expanded'/);
 assert.match(source,/event\.key === 'Escape'/);
 assert.match(source,/event\.key !== 'Tab'/);
});
test('free scientific worksheets and server-side fail-closed boundary are unchanged',()=>{
 for(const file of [
  'fa/assessments/golden-talent/start/index.html',
  'en/golden-talent/assessment/index.html'
 ])assert.match(fs.readFileSync(file,'utf8'),/rcas-start(?:-en)?\.js/);
 for(const file of [
  'fa/app/student/bahar/index.html',
  'en/golden-talent/dashboard/bahar/index.html'
 ])assert.match(fs.readFileSync(file,'utf8'),/bahar-formative-workspace-v1\.js/);
 const api=fs.readFileSync('api/golden-talent.php','utf8');
 assert.match(api,/'privateAssessmentApiActive'=>false/);
 assert.match(api,/'automaticDigitalEntitlement'=>false/);
 const states=fs.readFileSync('platform/payment-state-machine.json','utf8');
 assert.match(states,/Entitlement can be granted only from persisted PAYMENT_VERIFIED state/);
});
