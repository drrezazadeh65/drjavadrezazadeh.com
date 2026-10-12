import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

test('strict health audit records an unreachable live origin as UNKNOWN, never aligned or successful', () => {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'jr-health-proof-'));
  const artifact=path.join(dir,'public-health.json');
  const knownSource='0123456789abcdef0123456789abcdef01234567';
  try {
    const result=spawnSync(process.execPath,['scripts/production-health-audit.mjs','--strict'],{
      cwd:process.cwd(),encoding:'utf8',timeout:12000,
      env:{...process.env,PROD_ORIGIN:'https://127.0.0.1:1',
        PRODUCTION_HEALTH_TIMEOUT_MS:'750',PRODUCTION_HEALTH_STRICT:'1',
        PRODUCTION_HEALTH_EVIDENCE_PATH:artifact,GITHUB_SHA:knownSource}
    });
    assert.equal(result.error,undefined, String(result.error||''));
    assert.equal(result.status,1,'Strict unreachable production must fail');
    assert.ok(fs.existsSync(artifact),'Failure artifact must be retained');
    const proof=JSON.parse(fs.readFileSync(artifact,'utf8'));
    assert.equal(proof.schema,'bertina-production-public-evidence-v1');
    assert.equal(proof.observedOrigin,'https://127.0.0.1:1');
    assert.equal(proof.sourceCommit,knownSource);
    assert.equal(proof.availability,'unreachable');
    assert.equal(proof.deployedReleaseSha,null);
    assert.equal(proof.sourceLiveSame,null);
    assert.equal(proof.releaseAlignmentStatus,'unavailable');
    assert.equal(proof.checksPassed,false);
    assert.ok(proof.failures.some(message=>message.includes('unreachable')));
    assert.ok(!JSON.stringify(proof).includes('payment_key'));
    if(process.platform!=='win32'){
      assert.equal(fs.statSync(artifact).mode&0o777,0o600);
    }
  } finally {
    fs.rmSync(dir,{recursive:true,force:true});
  }
});
