import test from 'node:test';
import assert from 'node:assert/strict';
import {validateCanaryJob,runPythonLocalCanary,CANARY}
  from '../platform/jrei-v5/windows-worker/jrei-python-canary-worker.mjs';
const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const lease='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const job=()=>({jobId:id,leaseId:lease,expression:'12*7',
  taskType:'EXACT_ARITHMETIC_CANARY',expiresAt:Math.floor(Date.now()/1000)+60});
test('accepts only server-typed exact job',()=>{
  assert.equal(validateCanaryJob(job()),true);
  assert.equal(validateCanaryJob({...job(),expression:'rm -rf .'}),false);
  assert.equal(validateCanaryJob({...job(),expression:'13*7'}),false);
  assert.equal(validateCanaryJob({...job(),extra:'tool'}),false);
  assert.equal(validateCanaryJob({...job(),expiresAt:0}),false);
});
test('genuine local Python arithmetic result becomes immutable completion contract',async()=>{
  let target='';
  const fetchLocal=async(url,opts)=>{
    target=url;
    assert.equal(opts.redirect,'error');
    assert.deepEqual(JSON.parse(opts.body),{schema_version:'jr.jrei.arithmetic-request.v1',expression:'12*7'});
    return {status:200,headers:new Headers({'content-type':'application/json'}),
      text:async()=>JSON.stringify({schema_version:'jr.jrei.arithmetic-result.v1',
        expression_normalized:'12*7',numerator:84,denominator:1,exact_fraction:'84',
        skill_id:'jrei.math.exact_arithmetic.v1',performed_without_model:true,
        any_model_weights_changed:false})};
  };
  const answer=await runPythonLocalCanary(job(),{fetchLocal});
  assert.equal(target,'http://127.0.0.1:8091/internal/v1/worker/arithmetic');
  assert.deepEqual(answer,{schema:CANARY,jobId:id,leaseId:lease,
    numerator:84,denominator:1,exactFraction:'84',
    skillId:'jrei.math.exact_arithmetic.v1',performedWithoutModel:true});
});
test('does not accept fake Python responses',async()=>{
  const fetchLocal=async()=>({status:200,headers:new Headers({'content-type':'application/json'}),
    text:async()=>JSON.stringify({schema_version:'jr.jrei.arithmetic-result.v1',expression_normalized:'12*7',
      numerator:48,denominator:1,exact_fraction:'48',skill_id:'jrei.math.exact_arithmetic.v1',
      performed_without_model:true,any_model_weights_changed:false})});
  await assert.rejects(()=>runPythonLocalCanary(job(),{fetchLocal}),/UNTRUSTED/);
});
test('only one fixed PHP queue and no platform privilege claim',async()=>{
  const {readFile}=await import('node:fs/promises');
  const s=await readFile(new URL('../api/jrei-python-canary-bridge.php',import.meta.url),'utf8');
  const route=await readFile(new URL('../api/index.php',import.meta.url),'utf8');
  const op=await readFile(new URL('../api/operations.php',import.meta.url),'utf8');
  assert.match(s,/expression'=>'12\*7'/);
  assert.match(s,/state='COMPLETED'/);
  assert.match(route,/jrHybridAuthenticate\(/);
  assert.match(route,/jrei_python_canary_enabled/);
  assert.match(op,/operationsMutationAllowed\(/);
  assert.match(op,/jrei-python-canary/);
});
