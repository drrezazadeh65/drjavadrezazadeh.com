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
