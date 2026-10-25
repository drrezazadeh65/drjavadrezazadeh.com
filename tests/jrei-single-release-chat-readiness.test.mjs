import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {parsePeakWorkingSetBytes,readPinnedWindowsPeakWorkingSetMb}
 from '../platform/jrei-v5/windows-worker/jrei-local-ram-observer.mjs';
import {triageLocalQualityEvidence}
 from '../platform/jrei-v5/windows-worker/jrei-local-quality-triage.mjs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const runner=read('platform/jrei-v5/windows-worker/jrei-local-quality-evidence.mjs');
const admin=read('assets/js/operations-jrei-hybrid-nodes-v1.js');
const assistant=read('assets/js/assistant.js');

test('pinned Windows process lifetime peak is parsed with bounded units, never invented',()=>{
  assert.equal(parsePeakWorkingSetBytes('4294967296'),4096);
  assert.equal(parsePeakWorkingSetBytes('104857600'),100);
  assert.equal(parsePeakWorkingSetBytes('0'),null);
  assert.equal(parsePeakWorkingSetBytes('invalid'),null);
  assert.equal(parsePeakWorkingSetBytes('123; exit 0'),null);
  if(process.platform!=='win32')
    assert.equal(readPinnedWindowsPeakWorkingSetMb('C:\\Windows\\llama-server.exe'),null);
});

test('synthetic evidence does not silently approve a flawed model',()=>{
  assert.match(runner,/triageLocalQualityEvidence\(report\)/);
  assert.match(runner,/readPinnedWindowsPeakWorkingSetMb\(c\.backendExe\)/);
  assert.match(runner,/const QUALITY_MAX_TOKENS=256/);
  assert.match(runner,/max_tokens:QUALITY_MAX_TOKENS/);
  assert.match(runner,/suite:QUALITY_SUITE_VERSION,systemPrompt:QUALITY_SYSTEM_PROMPT/);
  assert.match(runner,/NEGATIVE_QUALITY_TRIAGE=/);
  assert.match(runner,/BLOCKED_REMEDIATION_REQUIRED/);
  assert.match(runner,/independentLanguageQualityAccepted:false/);
  assert.match(runner,/publicActivationAuthorized:false/);
  assert.match(runner,/peakRamMeasurementNotIndependentAcceptance:true/);
  assert.doesNotMatch(runner,/independentLanguageQualityAccepted:true/);
});

test('original four-stage backend permissions and public no-fake-inference rule remain unchanged',()=>{
  const php=read('api/jrei-local-chat.php');
  assert.match(php,/m\.independent_quality_accepted=1/);
  assert.match(php,/jrLocalChatRetentionReady\(\$pdo,\$cfg\)/);
  assert.match(php,/a\.last_signed_chat_seen_at>\?/);
  assert.match(php,/\(\$cfg\['jrei_local_public_release_accepted'\]\?\?false\)!==true/);
  assert.match(assistant,/policy\.live!==true/);
  assert.match(assistant,/providerConsent\.checked\?approvedLiveEndpoint/);
});

test('operator guidance uses existing read-only gates without touching credentials or database',()=>{
  assert.doesNotThrow(()=>new vm.Script(admin));
  assert.match(admin,/gateStatus=Object\.fromEntries\(readiness\.gates/);
  assert.match(admin,/مسیر کوتاه فعال‌سازی JREI/);
  assert.match(admin,/فقط بعد از موفقیت مکالمه واقعی/);
  assert.doesNotMatch(admin,/fetch\(['"]https:\/\/api\.openai\.com/);
});

test('negative evidence is still unable to grant deployment',()=>{
  const fake={
    schema:'jr.jrei.owner-local-evidence.v1',modelArtifactSha256:'a'.repeat(64),
    sampleCount:2,requestedSampleCount:16,allFixturesCompleted:false,failures:[],
    fixtures:[
      {fixtureId:'fa-02',lang:'fa',answer:'48',finishReason:'stop'},
      {fixtureId:'en-02',lang:'en',answer:'6',finishReason:'stop'}
    ]
  };
  const r=triageLocalQualityEvidence(fake);
  assert.equal(r.result,'BLOCKED_REMEDIATION_REQUIRED');
  assert.equal(r.publicActivationAuthorized,false);
  assert.equal(r.scientificQualityAccepted,false);
});
