import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const json=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const read=p=>fs.readFileSync(p,'utf8');
const scope=json('docs/governance/MASTERPLAN_NONMANUSCRIPT_SCOPE_20261018.json');
const official=json(scope.officialManifest);
const catalog=json('assets/data/service-catalog.json');
test('the explicit owner exception is exactly OJS installation and manuscript intake, not commerce, academic or reviewer work',()=>{
 assert.equal(scope.schema,'owner-nonmanuscript-masterplan-scope-v1');
 assert.equal(scope.hold.workstream,'scientific_journal_ojs');
 assert.equal(scope.hold.noAutomaticResumption,true);
 assert.equal(scope.hold.manuscriptIntakeClosedUntilExplicitApproval,true);
 assert.equal(scope.hold.ojsOperationsProhibitedThrough,'2026-10-27');
 assert.equal(scope.productionOperationPermitted,false);
 assert.equal(scope.releaseCertificate,'NOT_ISSUED_INDEPENDENT_LIVE_EVIDENCE_REQUIRED');
 assert.equal(scope.inScopeNonJournalGateIds.length,40);
 const all=official.verifiedGates.map(x=>x.id);
 assert.equal(all.length,41);
 assert.deepEqual(scope.inScopeNonJournalGateIds,all.filter(x=>x!=='scientific_journal_ojs'));
 assert.equal(new Set(scope.inScopeNonJournalGateIds).size,40);
 assert.ok(scope.inScopeNonJournalGateIds.includes('bookstore_and_receipts'));
 assert.ok(scope.inScopeNonJournalGateIds.includes('bilingual_architecture'));
 assert.ok(scope.inScopeNonJournalGateIds.includes('assessment_psychometrics'));
});
test('the 21 services remain in the source-scoped execution inventory without manufacturing approvals',()=>{
 assert.equal(scope.inScopePaidServiceIds.length,21);
 assert.deepEqual(scope.inScopePaidServiceIds,catalog.services.map(x=>x.id));
 assert.equal(official.verifiedServices.length,21);
 assert.equal(official.releaseState,'BLOCKED_PENDING_FULL_ACCEPTANCE');
 assert.equal(official.ownerFinalAuthorization,false);
 assert.ok(official.verifiedGates.find(x=>x.id==='scientific_journal_ojs').status!=='VERIFIED');
 for(const s of catalog.services){
  assert.equal(s.sellable,true);
  for(const locale of ['fa','en'])assert.ok(fs.existsSync(locale+'/services/'+s.id+'/index.html'),locale+' missing '+s.id);
 }
});
test('staged website releases keep the separate manuscript suspension',()=>{
 const php=read('api/jhela-intake.php');
 assert.ok(php.includes('const JHELA_MANUSCRIPT_SUBMISSIONS_SUSPENDED = true;'));
 assert.ok(php.includes("fail('manuscript_submissions_paused',503);"));
 assert.ok(php.includes("'/journal/reviewer/apply'"));
 const decision=read('docs/governance/V5.2_EVOLUTION_OWNER_DIRECTIVE_20261018.md');
 assert.match(decision,/earlier requirement to await 100% completion[^.]*RETIRED/i);
 assert.match(decision,/manuscript metadata creation, confidential PDF upload and formal submission/);
 assert.equal(scope.latestOwnerSupersession.ownerAuthorizedNativePreliminaryManuscriptIntake,false);
 assert.equal(json('platform/jhela-native-intake-activation-v1.json').ownerAuthorizesPreliminaryManuscriptSubmission,false);
 for(const p of ['journal/submission/index.html','journal/fa/submission/index.html'])assert.ok(read(p).includes('data-jhela-article-open hidden'));
 assert.ok(fs.existsSync('journal/dashboard/index.html'));
 assert.ok(fs.existsSync('journal/fa/dashboard/index.html'));
});
