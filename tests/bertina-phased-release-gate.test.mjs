import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
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
test('hosting managed without custody/recovery is disallowed in staged releases',()=>{
 for(const wrong of [
  {recoveryMode:'hosting_managed'},
  {recoveryMode:'none'},
  {ownerAcknowledgement:''}
 ]) assert.equal(decide(wrong).allowed,false,JSON.stringify(wrong));
 assert.equal(decide({recoveryMode:'signed_restore',ownerAcknowledgement:''}).allowed,true,
   'signed restore has its own existing stricter host verification, not cPanel risk acknowledgement');
});
test('full masterplan gate, owner identity, exact SHA, SQL and protected host checks remain intact',()=>{
 const wf=fs.readFileSync('.github/workflows/deploy-bertina.yml','utf8');
 const old=wf.indexOf('BLOCK PRODUCTION until full 100 percent masterplan acceptance');
 const phased=wf.indexOf('BLOCK unsafe guarded phased release unless owner authorizes exact scope');
 const preflight=wf.indexOf('Authorize the exact recovery policy before any deploy activity');
 assert.ok(old>=0&&phased>old&&preflight>phased);
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
