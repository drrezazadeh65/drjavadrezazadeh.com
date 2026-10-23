import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync,execFileSync} from 'node:child_process';

const read=path=>fs.readFileSync(path,'utf8');
const legacy=[
 '.github/workflows/indexnow-submit.yml',
 '.github/workflows/indexnow-activation.yml'
];
const post=()=>read('.github/workflows/post-release-observations.yml');

// QA 2026-10-23: the previously frozen deploy-bertina.yml blob
// 280c6ac95d534ef6db9b292ddbe7467053f0ba76 differs from the reviewed
// 7acfdb2a7cd81feadbd46d4c58de38de02915aa3 by ONE additive action:
//   - name: Enforce immutable existing public URL contract
//     run: node scripts/jr-immutable-url-guard.mjs
// All preexisting text and deployment gates are byte-identical.
// This digest remains pinned; future mutations require a new explicit review.
test('the immutable one-click Bertina release and four recovery gates preserve approved Git blobs',()=>{
 const immutable={
  '.github/workflows/deploy-bertina.yml':'7acfdb2a7cd81feadbd46d4c58de38de02915aa3',
  'scripts/bertina-phased-release-gate.mjs':'14a3641a43bf441ff56dcead5154dbc8bdd80237',
  'scripts/bertina-hosting-managed-release.php':'0839f9e244da6eead0bac4526919f4b1dd7e4f40',
  'scripts/bertina-controlled-cpanel-gate.php':'43f2a4eb28790baa4e657262e4ccb60aca99317e',
  'scripts/bertina-private-recovery-gate.php':'23f01c3720c243efa6f56cfa2d196cae6660dee0'
 };
 assert.match(read('.github/workflows/deploy-bertina.yml'),
  /- name: Enforce immutable existing public URL contract[\s\S]*?node scripts\/jr-immutable-url-guard\.mjs/);
 for(const [file,blob] of Object.entries(immutable)){
  const actual=execFileSync('git',['hash-object',file],{encoding:'utf8'}).trim();
  assert.equal(actual,blob,'frozen Bertina source must not change: '+file);
 }
});
test('retained manual IndexNow workflows cannot send or bulk-resubmit',()=>{
 for(const file of legacy){
  const contents=read(file);
  assert.match(contents,/workflow_dispatch:/,'existing manual preview remains');
  assert.doesNotMatch(contents,/INDEXNOW_ENABLED:\s*['"]1['"]/,'manual live sending prohibited');
  assert.match(contents,/INDEXNOW_ENABLED:\s*['"]0['"]/,'manual preview explicitly disabled');
  assert.match(contents,/indexnow-submit\.mjs/,'original selection mechanism reused');
 }
});
test('only owner-approved SHA-verified post-release changes reach original sender',()=>{
 const workflow=post();
 assert.match(workflow,/workflow_run:/);
 assert.match(workflow,/github\.event\.workflow_run\.conclusion == 'success'/);
 assert.match(workflow,/github\.event\.workflow_run\.actor\.login == 'drrezazadeh65'/);
 assert.match(workflow,/scripts\/performance-release-verify\.mjs/);
 assert.match(workflow,/scripts\/indexnow-release-delta\.mjs/);
 assert.match(workflow,/vars\.INDEXNOW_POSTRELEASE_ENABLED == '1'/);
 assert.match(workflow,/INDEXNOW_POSTRELEASE_APPROVED: '1'/);
 assert.match(workflow,/PSI_RELEASE_VERIFIED:/);
 assert.doesNotMatch(workflow,/node scripts\/indexnow-submit\.mjs --all/);
 assert.match(workflow,/steps\.indexnow_submission\.outcome == 'success'/);
 assert.match(workflow,/indexnow-release-\$\{\{ github\.event\.workflow_run\.head_sha \}\}/);
 const sender=read('scripts/indexnow-submit.mjs');
 assert.match(sender,/IndexNow live submission requires approved, SHA-verified changed-only release/);
 assert.match(sender,/5bea74dc73880cd2b2a1a35a649e62de/,'original public key intact');
 const delta=read('scripts/indexnow-release-delta.mjs');
 assert.match(delta,/indexnow_replay_attempt_blocked/);
 assert.match(delta,/indexnow_release_too_old_or_unknown_to_replay/);
 assert.match(delta,/previously_deployed_same_sha/);
 assert.match(delta,/already_completed_release/);
});
test('live bulk or unapproved sender is stopped before any network activity',()=>{
 const script='scripts/indexnow-submit.mjs';
 for(const args of [
  {argv:['--all'],env:{INDEXNOW_ENABLED:'1',GITHUB_EVENT_NAME:'workflow_run'}},
  {argv:[],env:{INDEXNOW_ENABLED:'1',GITHUB_EVENT_NAME:'push'}},
  {argv:[],env:{INDEXNOW_ENABLED:'1',GITHUB_EVENT_NAME:'workflow_run',INDEXNOW_CHANGED_FILES:'fa/index.html'}}
 ]){
  const {argv,env}=args;
  const run=spawnSync(process.execPath,[script,...argv],{encoding:'utf8',
   env:{...process.env,INDEXNOW_ENABLED:'1',INDEXNOW_POSTRELEASE_APPROVED:'0',
    PSI_RELEASE_VERIFIED:'0',GITHUB_EVENT_NAME:'push',...env},
   timeout:4000});
  assert.notEqual(run.status,0,'unauthorized invocation must not succeed');
  assert.match(run.stderr,/IndexNow live submission requires approved, SHA-verified changed-only release/);
 }
});
test('existing Lighthouse plus PSI remain complementary lab measurement engines',()=>{
 assert.match(read('.github/workflows/free-local-lighthouse.yml'),/lhci collect/);
 assert.match(read('scripts/free-performance-observer.mjs'),/--audit/);
 const psi=read('scripts/lib/performance-production.mjs');
 assert.match(psi,/INTERACTION_TO_NEXT_PAINT/);
 assert.match(psi,/canonicalized_elsewhere/);
 assert.match(psi,/PRIVATE_FEATURE_GATES/);
 assert.match(post(),/PAGESPEED_API_KEY/);
 assert.match(post(),/performance-production-baseline/);
 assert.match(post(),/report\.html/);
});
