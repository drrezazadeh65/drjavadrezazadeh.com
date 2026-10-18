import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {assessPhasedRelease,PHASED_APPROVAL_PHRASE} from '../scripts/bertina-phased-release-gate.mjs';

const approve=Object.freeze({
 scope:'phased_live_audit',event:'workflow_dispatch',actor:'drrezazadeh65',
 ref:'refs/heads/migration/bertina-linux6',
 targetSha:'a'.repeat(40),approvedCommit:'a'.repeat(40),expectedLiveSha:'b'.repeat(40),
 recoveryMode:'owner_cpanel_custody',ownerAcknowledgement:'ACCEPT_UNTESTED_RESTORE_RISK_V5',
 confirmation:PHASED_APPROVAL_PHRASE
});
const decide=overrides=>assessPhasedRelease({...approve,...overrides});
test('phased mode can only proceed to standard preflight, never claim entire masterplan finished',()=>{
 const r=decide({});
 assert.deepEqual(r.errors,[]);
 assert.equal(r.allowed,true);
 assert.equal(r.publicationIsFullMasterplanAcceptance,false);
 assert.equal(r.hostAndPaymentProofProvidedByThisGate,false);
});
test('explicit owner dispatch and exact immutable SHAs are mandatory',()=>{
 for(const wrong of [
  {scope:'full_masterplan'},{event:'push'},{actor:'anyone'},
  {ref:'refs/heads/main'},{approvedCommit:'c'.repeat(40)},
  {approvedCommit:'latest'},{targetSha:'short'},{expectedLiveSha:'a'.repeat(40)},
  {expectedLiveSha:'unverified'},{confirmation:''},{confirmation:'yes'}
 ]) assert.equal(decide(wrong).allowed,false,JSON.stringify(wrong));
});
test('hosting-managed release requires explicit owner risk acknowledgement and immutable SHAs',()=>{
 assert.equal(decide({recoveryMode:'hosting_managed'}).allowed,true,
   'owner acknowledgement already recorded in approved manual workflow input');
 for(const wrong of [
  {recoveryMode:'hosting_managed',ownerAcknowledgement:''},
  {recoveryMode:'hosting_managed',ownerAcknowledgement:'yes'},
  {recoveryMode:'none'},
  {ownerAcknowledgement:''}
 ]) assert.equal(decide(wrong).allowed,false,JSON.stringify(wrong));
 assert.equal(decide({recoveryMode:'signed_restore',ownerAcknowledgement:''}).allowed,true,
   'signed restore has its own existing stricter host verification');
});
test('full masterplan gate, owner identity, exact SHA, SQL and protected host checks remain intact',()=>{
 const wf=fs.readFileSync('.github/workflows/deploy-bertina.yml','utf8');
 const old=wf.indexOf('BLOCK PRODUCTION until full 100 percent masterplan acceptance');
 const phased=wf.indexOf('BLOCK unsafe guarded phased release unless owner authorizes exact scope');
 const preflight=wf.indexOf('Authorize the exact recovery policy before any deploy activity');
 assert.ok(old>=0&&phased>old&&preflight>phased);
 const scopeGate=wf.indexOf('Reject missing or unrecognized release scopes before all gates');
 assert.ok(scopeGate>=0&&scopeGate<old,'unknown scopes must fail before either conditional guard');
 assert.match(wf,/full_masterplan\|phased_live_audit/);
 assert.match(wf,/\*\) echo "Unrecognized release scope; production remains blocked\."/);
 assert.match(wf,/if: inputs.release_scope == 'full_masterplan'/);
 assert.match(wf,/if: inputs.release_scope == 'phased_live_audit'/);
 assert.match(wf,/node scripts\/masterplan-100-release-gate\.mjs/);
 assert.match(wf,/node scripts\/bertina-phased-release-gate\.mjs/);
 assert.match(wf,/node --test tests\/bertina-phased-release-gate\.test\.mjs/);
 assert.match(wf,/github\.actor == 'drrezazadeh65'/);
 assert.match(wf,/github\.ref == 'refs\/heads\/migration\/bertina-linux6'/);
 assert.match(wf,/test "\$APPROVED_COMMIT_SHA_INPUT" = "\$GITHUB_SHA"/);
 assert.match(wf,/drjrCpanelBackupCheck/);
 assert.match(wf,/drjrRecoveryCheck/);
 assert.match(wf,/stage09_schema_preflight_required/);
 assert.match(wf,/git ls-remote origin refs\/heads\/migration\/bertina-linux6/);
 assert.match(wf,/test "\$current" = "\$GITHUB_SHA"/);
 assert.doesNotMatch(wf,/on:\s*\n\s*push:/);
});
test('full masterplan certification status and digital-rights limitations are still actually pending',()=>{
 const gate=JSON.parse(fs.readFileSync('docs/governance/MASTERPLAN_100_RELEASE_ACCEPTANCE.json','utf8'));
 const pre=JSON.parse(fs.readFileSync('assets/data/jr-publishing-prelaunch.json','utf8'));
 assert.equal(gate.releaseState,'BLOCKED_PENDING_FULL_ACCEPTANCE');
 assert.equal(gate.ownerFinalAuthorization,false);
 assert.equal(gate.verifiedGates.length,41);
 assert.equal(gate.verifiedServices.length,21);
 assert.equal(pre.works[0].quote.checkout_enabled,false);
 assert.equal(pre.works[0].rights_confirmed,false);
});


// The full-release flow may install approved schema; phase-1 explicitly defers
// all new DB tables, so its deployment must only use already-installed tables.
test('phased production path checks installed operations schema before extraction and never runs CREATE TABLE',()=>{
 const wf=fs.readFileSync('.github/workflows/deploy-bertina.yml','utf8');
 const readOnlyCheck=wf.indexOf("if ('$RELEASE_SCOPE'==='phased_live_audit') {");
 const extraction=wf.indexOf("if (!\\$zip->extractTo(__DIR__))");
 const conditionalInstall=wf.indexOf("if ('$RELEASE_SCOPE'!=='phased_live_audit') operationsInstall(\\$pdo);");
 assert.ok(readOnlyCheck>=0 && extraction>readOnlyCheck,
   'absence of existing operations schema must block before any file extraction');
 assert.ok(conditionalInstall>extraction,
   'phased release must bypass CREATE TABLE/seed routine after extraction');
 assert.match(wf,/RELEASE_SCOPE: \$\{\{ inputs\.release_scope \}\}/);
 const section=wf.slice(readOnlyCheck,extraction);
 for(const table of [
   'operations_admin_memberships','operations_session_mfa','operations_mfa_counters',
   'operations_evidence','operations_audit','operations_release',
   'operations_action_runs','operations_collection_policies','operations_collection_cache'
 ]) assert.ok(section.includes("'"+table+"'"),'required pre-existing table: '+table);
 assert.ok(section.includes("SELECT 1 FROM "),
   'phased schema preflight must be read-only');
});

test('owner one-click deployment auto-resolves source/live SHA while retaining guarded custody',()=>{
 const wf=fs.readFileSync('.github/workflows/deploy-bertina.yml','utf8');
 for(const required of [
  'default: phased_live_audit',
  'default: hosting_managed',
  'default: ACCEPT_UNTESTED_RESTORE_RISK_V5',
  'default: I_APPROVE_GUARDED_LIVE_AUDIT_RELEASE_WITH_PDF_AND_SQL_DEFERRED',
  'id: owner_release',
  'git ls-remote origin refs/heads/migration/bertina-linux6',
  'test "$current" = "$GITHUB_SHA"',
  'curl --fail --silent --show-error --location --max-time 25',
  'APPROVED_COMMIT_SHA_INPUT: ${{ steps.owner_release.outputs.target_sha }}',
  'EXPECTED_LIVE_SHA_INPUT: ${{ steps.owner_release.outputs.live_sha }}',
  'drjrCpanelBackupCheck',
  'Reject a stale production commit before uploading',
 ]) assert.ok(wf.includes(required),'one-click contract missing: '+required);
 assert.ok(!wf.includes('on:\\n  push:'),'manual owner authorization must remain required');
});

/**
 * FROZEN OWNER DEPLOYMENT CONTRACT — successful production run #395.
 * Fail closed before any release if any part of the approved deployment
 * machinery is modified, even if a change appears harmless.
 * Never automatically rewrite these fingerprints.
 */
const FROZEN_DEPLOYMENT_BLOBS=Object.freeze({
 '.github/workflows/deploy-bertina.yml':'280c6ac95d534ef6db9b292ddbe7467053f0ba76',
 'scripts/bertina-phased-release-gate.mjs':'14a3641a43bf441ff56dcead5154dbc8bdd80237',
 'scripts/bertina-hosting-managed-release.php':'0839f9e244da6eead0bac4526919f4b1dd7e4f40',
 'scripts/bertina-controlled-cpanel-gate.php':'43f2a4eb28790baa4e657262e4ccb60aca99317e',
 'scripts/bertina-private-recovery-gate.php':'23f01c3720c243efa6f56cfa2d196cae6660dee0'
});
test('PERMANENT FREEZE: deployment workflow and release gate source match successful run #395',()=>{
 for(const [path,expected] of Object.entries(FROZEN_DEPLOYMENT_BLOBS)){
  const contents=fs.readFileSync(path);
  const gitBlob=createHash('sha1')
   .update(Buffer.from('blob '+contents.length+'\0'))
   .update(contents).digest('hex');
  assert.equal(gitBlob,expected,
   'FROZEN DEPLOYMENT CONTRACT VIOLATED: '+path+' differs from successful run #395');
 }
});
