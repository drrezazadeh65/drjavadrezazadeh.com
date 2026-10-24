import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const models=read('../api/jrei-hybrid-owner-models.php');
const owner=read('../api/jrei-hybrid-owner.php');
const local=read('../api/jrei-local-chat.php');
const admin=read('../assets/js/operations-jrei-hybrid-nodes-v1.js');
const worker=read('../platform/jrei-v5/windows-worker/jrei-worker.mjs');

test('runtime cannot be accepted from rights-only model metadata',()=>{
  assert.match(models,/action===\x27attest_local_model_runtime\x27/);
  assert.match(models,/realLocalGGUFHashChecked/);
  assert.match(models,/independentLanguageQualityReviewed/);
  assert.match(models,/ownerReviewedNoCloudExecution/);
  assert.match(models,/model_artifact_sha256/);
  assert.match(models,/weights_installed_verified=1,runtime_verified=1/);
  assert.match(models,/operationsAudit/);
  assert.match(owner,/attest_local_model_runtime/);
  assert.match(admin,/measuredTokensPerSecond/);
  assert.match(admin,/runEvidenceSha256/);
  assert.match(admin,/evaluationFixtureSha256/);
  assert.match(admin,/OWNER_ACCEPTS_MEASURED_LOCAL_MODEL_NOT_CLOUD/);
});

test('first node authorization is independent of prior chat heartbeat',()=>{
  const section=admin.slice(admin.indexOf('const verifiedModels='));
  assert.ok(section.length>600);
  assert.doesNotMatch(section.slice(0,520),/m\.modelId===n\.modelId/);
  assert.match(section,/set_local_chat_node/);
  assert.match(local,/function jrLocalChatOwnerSetNode/);
  assert.match(local,/jrLocalChatNodeApproved/);
  assert.match(local,/independent_quality_accepted=1/);
});

test('Windows worker starts independently with owned local model',()=>{
  assert.match(worker,/cmd===\x27start-chat\x27/);
  assert.match(worker,/jrei-local-chat-worker\.mjs/);
  assert.doesNotThrow(()=>new vm.Script(admin,{filename:'operations-jrei-hybrid-nodes-v1.js'}));
});

test('OpenAI is optional, never a prerequisite for the JREI-LM route',()=>{
  const api=read('../api/index.php');
  assert.match(api,/jrei_allow_optional_cloud_public_fallback/);
  assert.match(api,/if\(\$local\)respond\(jrLocalChatEnqueue/);
  assert.match(api,/if\(\$optionalCloud\)respond\(jrAiPublicChat/);
  assert.match(api,/JREI_LM_LOCAL_WINDOWS/);
});
