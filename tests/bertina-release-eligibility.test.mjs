import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyPaths} from '../scripts/bertina-auto-release-policy.mjs';
import {decideAutomaticRelease} from '../scripts/bertina-release-eligibility.mjs';

test('full-scope release permits backend and public changes to enter mandatory preflight',()=>{
  const delta=classifyPaths(['api/auth.php','fa/index.html','assets/js/site.js']);
  assert.equal(delta.canAutomaticallyDeploy,false);
  assert.deepEqual(decideAutomaticRelease(delta,'full'),{
    allowed:true,reason:'Full automatic release eligible for mandatory production preflight'
  });
});

test('full scope also permits backend-only changes but not documentation-only changes',()=>{
  assert.equal(decideAutomaticRelease(classifyPaths(['api/commerce/health.php'])).allowed,true);
  assert.equal(decideAutomaticRelease(classifyPaths(['docs/notes.md'])).allowed,false);
});

test('public_only preserves old protection and supports public changes',()=>{
  const mixed=classifyPaths(['fa/index.html','api/auth.php']);
  assert.equal(decideAutomaticRelease(mixed,'public_only').allowed,false);
  assert.equal(decideAutomaticRelease(classifyPaths(['fa/index.html']),'public_only').allowed,true);
  assert.equal(decideAutomaticRelease(classifyPaths(['docs/notes.md','fa/index.html']),'public_only').allowed,true);
});

test('unrecognized mode and malformed source classification always fail closed',()=>{
  const delta=classifyPaths(['fa/index.html']);
  assert.throws(()=>decideAutomaticRelease(delta,'unsafe'),/Unknown automatic release scope/);
  assert.throws(()=>decideAutomaticRelease(null,'full'),/Invalid release classification/);
  assert.throws(()=>decideAutomaticRelease({groups:{public:[],controlled:[]},canAutomaticallyDeploy:false},'full'),/Incomplete release classification/);
});

test('full mode refuses deployment-authority, migration and credential changes',()=>{
  const guarded=[
    '.github/workflows/deploy-bertina.yml',
    '.github/workflows/new-check.yml',
    'scripts/bertina-release-eligibility.mjs',
    'scripts/bertina-private-recovery-gate.php',
    'scripts/build-public-site.mjs',
    'database/schema.sql',
    'migrations/2026_10_add.sql',
    '.bertina-backup-trigger',
    '.htaccess',
    'api/config.local.php',
    'docs/governance/RELEASE_POLICY.md'
  ];
  for(const path of guarded){
    const result=decideAutomaticRelease(classifyPaths(['fa/index.html',path]),'full');
    assert.equal(result.allowed,false,path);
    assert.ok(result.manual.includes(path),path);
  }
});
test('other backend, JavaScript and public changes remain eligible in full mode',()=>{
  for(const path of ['api/commerce/health.php','assets/js/customer-dashboard.js','platform/service-registry.json']){
    const result=decideAutomaticRelease(classifyPaths([path]),'full');
    assert.equal(result.allowed,true,path);
  }
});
