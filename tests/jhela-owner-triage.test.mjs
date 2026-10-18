import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
test('owner-only manuscript queue and triage are gated by existing MFA session and CSRF',()=>{
 const php=read('api/operations.php');
 const a=php.indexOf("if (!$fresh) fail('admin_mfa_required',403);");
 const b=php.indexOf("if ($path === '/admin/operations/jhela/manuscripts' && $verb === 'GET')");
 const c=php.indexOf("if ($path === '/admin/operations/jhela/manuscripts/triage' && $verb === 'POST')");
 assert.ok(a>=0&&b>a&&c>b);
 const section=php.slice(b,c+2800);
 assert.ok(section.includes("operationsMutationAllowed($_SERVER"));
 assert.ok(section.includes("jhelaSchemaReady($pdo)"));
 assert.ok(section.includes("rateAllowed($pdo"));
 assert.ok(section.includes("FOR UPDATE"));
 assert.ok(section.includes("jhelaEvent($pdo,$id,$next,$message)"));
 assert.ok(section.includes("operationsAudit($pdo,$accountId"));
 assert.ok(section.includes("'formalPeerReviewStarted'=>false"));
 assert.ok(!section.includes("private_file_rel"));
 assert.ok(!section.includes("abstract_text"));
 assert.ok(!section.includes("declarations"));
});
test('only permitted preliminary state transitions exist; no acceptance or peer-review simulation',()=>{
 const php=read('api/operations.php');
 const s=php.slice(php.indexOf("if ($path === '/admin/operations/jhela/manuscripts/triage'"),php.indexOf('// Owner-approved reviewer screening'));
 assert.ok(s.includes("['UNDER_SCREENING','NEEDS_INFORMATION']"));
 assert.ok(s.includes("['PRELIMINARY_RECEIVED','NEEDS_INFORMATION']"));
 assert.ok(s.includes("&&$old==='UNDER_SCREENING'"));
 assert.ok(s.includes("!$allowed||empty($record['uploaded_at'])"));
 assert.ok(!s.includes("ACCEPTED"));
 assert.ok(!s.includes("PUBLISHED"));
});
test('bilingual owner UI uses safe DOM text and does not leak into public dashboards',()=>{
 const js=read('assets/js/operations-jhela-manuscripts.js');
 assert.ok(js.includes("document.getElementById('ops-workspace')"));
 assert.ok(js.includes('textContent'));
 assert.ok(!js.includes('innerHTML'));
 assert.ok(js.includes('/api/admin/operations/jhela/manuscripts/triage'));
 for(const p of ['fa/app/admin/index.html','en/account/admin/index.html']){
  const s=read(p);assert.ok(s.includes('data-jhela-manuscript-owner'));
  assert.ok(s.includes('operations-jhela-manuscripts.js'));
 }
 for(const p of ['journal/dashboard/index.html','journal/fa/dashboard/index.html'])
  assert.ok(!read(p).includes('operations-jhela-manuscripts.js'));
});
