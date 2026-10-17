import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {APPROVAL_PHRASE,assessMasterplanRelease} from '../scripts/masterplan-100-release-gate.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const manifest=JSON.parse(fs.readFileSync(
  path.join(root,'docs/governance/MASTERPLAN_100_RELEASE_ACCEPTANCE.json'),'utf8'));
const hash='a'.repeat(40);
function check(candidate,code=APPROVAL_PHRASE){
  return assessMasterplanRelease(candidate,{
    root,targetSha:hash,ownerConfirmation:code,requireGit:false
  });
}
test('release is always denied without explicit owner confirmation',()=>{
  const r=check(manifest,'');
  assert.equal(r.allowed,false);
  assert.ok(r.errors.some(e=>e.includes('owner release confirmation')));
});
test('manifests with missing or fabricated approval never pass',()=>{
  assert.equal(check(null).allowed,false);
  const fake={...manifest,releaseState:'FULLY_VERIFIED_FOR_SINGLE_OWNER_RELEASE',
    ownerFinalAuthorization:true,reviewedSourceCommit:hash};
  const verdict=check(fake);
  assert.equal(verdict.allowed,false);
  assert.ok(verdict.errors.some(e=>e.includes('independently reviewable')));
  assert.ok(verdict.errors.some(e=>e.includes('source+acceptance')));
});
test('every one of 41 domains and 21 currently sold services must be present',()=>{
  const x={...manifest,verifiedGates:manifest.verifiedGates.slice(1)};
  assert.equal(check(x).allowed,false);
  assert.ok(check(x).errors.some(e=>e.includes('expected 41')));
  const y={...manifest,verifiedServices:manifest.verifiedServices.slice(1)};
  assert.ok(check(y).errors.some(e=>e.includes('expected 21')));
});
test('forty genuine existing approved distinct internal destinations are mandatory',()=>{
  const verdict=check({...manifest,verifiedInternalDestinations:[]});
  assert.equal(verdict.allowed,false);
  assert.ok(verdict.errors.some(e=>e.includes('Fewer than 40')));
});
test('manifest and workflow use the same source, and a production push is not an authorization',()=>{
  const github=fs.readFileSync(path.join(root,'.github/workflows/deploy-bertina.yml'),'utf8');
  assert.match(github,/if: github\.event_name == 'workflow_dispatch'/);
  assert.match(github,/owner_masterplan_final_confirmation:/);
  const guard=github.indexOf('BLOCK PRODUCTION until full 100 percent masterplan acceptance');
  const release=github.indexOf('Authorize the exact recovery policy before any deploy activity');
  assert.ok(guard>0&&release>guard,'masterplan gate must run first');
  assert.match(github,/node scripts\/masterplan-100-release-gate\.mjs/);
  assert.equal(manifest.canonicalBranch,'migration/bertina-linux6');
  assert.equal(manifest.verifiedGates.length,41);
  assert.equal(manifest.verifiedServices.length,21);
});
test('missing target SHA and wrong final statement fail closed',()=>{
  const result=assessMasterplanRelease(manifest,{
    root,targetSha:'latest',ownerConfirmation:'yes',requireGit:false
  });
  assert.equal(result.allowed,false);
  assert.ok(result.errors.some(e=>e.includes('target commit')));
});
