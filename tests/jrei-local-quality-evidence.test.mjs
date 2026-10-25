import test from 'node:test';
import assert from 'node:assert/strict';
import {nearestRankP95,evaluateConfig}
  from '../platform/jrei-v5/windows-worker/jrei-local-quality-evidence.mjs';

test('p95 uses nearest-rank ordering and never mislabels two observations',()=>{
  assert.equal(nearestRankP95(Array.from({length:20},(_,i)=>20-i)),19);
  assert.equal(nearestRankP95([1500,700]),1500);
  assert.throws(()=>nearestRankP95([]),/INVALID_SAMPLES/);
  assert.throws(()=>nearestRankP95([0,NaN]),/INVALID_SAMPLES/);
});
const cfg={
  protocol:'jr.jrei.windows-worker.v1',
  origin:'https://drjavadrezazadeh.com',
  localChat:{
    enabled:false,ownerApproved:true,rightsReviewed:true,
    independentQualityAccepted:false,
    modelId:'jrei-qwen3-4b-q4km',modelVersion:'qwen3-4b-q4km-20261025',
    modelSha256:'a'.repeat(64),backendExeSha256:'b'.repeat(64),
    modelFile:'/tmp/Qwen3-4B-Q4_K_M.gguf',
    backendExe:'/tmp/llama-server.exe',
    endpoint:'http://127.0.0.1:8081/v1/chat/completions',
    disableThinking:true
  }
};
test('readiness evidence can run without prior false public approval',()=>{
  assert.equal(evaluateConfig(cfg).enabled,false);
  assert.equal(evaluateConfig(cfg).independentQualityAccepted,false);
});
test('reject unreviewed rights or any nonlocal endpoint',()=>{
  assert.throws(()=>evaluateConfig({...cfg,localChat:{...cfg.localChat,rightsReviewed:false}}),
    /LOCAL_QUALITY_CONFIG_NOT_APPROVED/);
  assert.throws(()=>evaluateConfig({...cfg,localChat:{...cfg.localChat,endpoint:'https://example.com'}}),
    /LOCAL_QUALITY_CONFIG_NOT_APPROVED/);
  assert.throws(()=>evaluateConfig({...cfg,localChat:{...cfg.localChat,endpoint:'http://127.0.0.1:8082/v1/chat/completions'}}),
    /LOCAL_QUALITY_CONFIG_NOT_APPROVED/);
});
