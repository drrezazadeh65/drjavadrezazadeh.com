import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyPaths} from '../scripts/bertina-auto-release-policy.mjs';
import {decideAutomaticRelease,verifyOneTimeOwnerBootstrap} from '../scripts/bertina-release-eligibility.mjs';

test('full-scope release permits backend and public changes to enter mandatory preflight',()=>{
  const delta=classifyPaths(['api/auth.php','fa/index.html','assets/js/site.js']);
  assert.equal(delta.canAutomaticallyDeploy,false);
  assert.deepEqual(decideAutomaticRelease(delta,'full'),{
    allowed:true,reason:'Full automatic release eligible for mandatory production preflight'
  });
});

test('full scope also permits backend-only changes but not documentation-only changes',()=>{
  assert.equal(decideAutomaticRelease(classifyPaths(['api/commerce/health.php']),'full').allowed,true);
  assert.equal(decideAutomaticRelease(classifyPaths(['docs/notes.md']),'full').allowed,false);
});

test('standing FULL development default permits API/runtime under existing gates',()=>{
  assert.equal(decideAutomaticRelease(classifyPaths(['api/auth.php'])).allowed,true);
  assert.equal(decideAutomaticRelease(classifyPaths(['fa/index.html','api/auth.php'])).allowed,true);
  assert.equal(decideAutomaticRelease(classifyPaths(['assets/js/customer-dashboard.js'])).allowed,true);
  assert.equal(decideAutomaticRelease(classifyPaths(['fa/index.html'])).allowed,true);
  assert.equal(decideAutomaticRelease(classifyPaths(['docs/notes.md'])).allowed,false);
  assert.equal(decideAutomaticRelease(classifyPaths(['api/config.local.php'])).allowed,false);
  assert.equal(decideAutomaticRelease(classifyPaths(['database/schema.sql'])).allowed,false);
  assert.equal(decideAutomaticRelease(classifyPaths(['.github/workflows/deploy-bertina.yml'])).allowed,false);
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
    'api/internal/.htaccess',
    'journal/.user.ini',
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


test('owner-bound single-use activation permits only the known bootstrap authority set',()=>{
  const base='a'.repeat(40), parent='b'.repeat(40), head='c'.repeat(40);
  const paths=[
    '.github/workflows/deploy-bertina.yml',
    '.github/workflows/bertina-deployment-readiness.yml',
    'scripts/bertina-release-eligibility.mjs',
    'scripts/build-public-site.mjs',
    '.bertina-bootstrap-authorization.json',
    '.bertina-deploy-trigger',
    'fa/index.html'
  ];
  const delta={...classifyPaths(paths),base,head};
  const context={
    event:'push',actor:'drrezazadeh65',ref:'refs/heads/migration/bertina-linux6',
    base,head,parent,
    authorizationExistedInParent:false,
    finalFiles:['.bertina-deploy-trigger','.bertina-bootstrap-authorization.json'],
    authorization:{
      schema:'bertina-one-time-owner-bootstrap-v1',
      owner:'drrezazadeh65',expectedLiveSha:base,approvedParentSha:parent,
      acknowledgement:'ACCEPT_UNTESTED_RESTORE_RISK_V5'
    }
  };
  assert.equal(verifyOneTimeOwnerBootstrap(delta,context),true);
  assert.equal(decideAutomaticRelease(delta,'full',context).allowed,true);
  assert.equal(decideAutomaticRelease(delta,'public_only',context).allowed,false);
  for(const changes of [
    {actor:'attacker'}, {event:'pull_request'}, {parent:'d'.repeat(40)},
    {authorizationExistedInParent:true},
    {finalFiles:['.bertina-deploy-trigger','.bertina-bootstrap-authorization.json','api/auth.php']},
    {authorization:{...context.authorization,expectedLiveSha:'d'.repeat(40)}},
    {authorization:{...context.authorization,acknowledgement:''}}
  ]) {
    const modified={...context,...changes};
    assert.equal(verifyOneTimeOwnerBootstrap(delta,modified),false);
    assert.equal(decideAutomaticRelease(delta,'full',modified).allowed,false);
  }
  const sql={...classifyPaths([...paths,'database/ddl.sql']),base,head};
  assert.equal(decideAutomaticRelease(sql,'full',context).allowed,false);
  const secrets={...classifyPaths([...paths,'api/config.local.php']),base,head};
  assert.equal(decideAutomaticRelease(secrets,'full',context).allowed,false);
});

test('the single-use owner manifest cannot authorize normal production changes in future commits',()=>{
  const base='a'.repeat(40), head='c'.repeat(40);
  const normal={...classifyPaths(['fa/index.html','api/commerce/health.php']),base,head};
  assert.equal(decideAutomaticRelease(normal,'full').allowed,true);
  const guarded={...classifyPaths(['fa/index.html','scripts/bertina-release-eligibility.mjs']),base,head};
  assert.equal(decideAutomaticRelease(guarded,'full').allowed,false);
});
