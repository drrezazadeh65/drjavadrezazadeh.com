import test from 'node:test';
import assert from 'node:assert/strict';
import {pythonObservation,probePythonHealth,runPythonHealthWorker}
  from '../platform/jrei-v5/windows-worker/jrei-python-health-worker.mjs';
const HEALTH={
  schema:'jr.jrei.python-health.v1',
  service:'jrei-private-python',
  service_process:'RESPONDING',production_ready:false
};
test('genuine local contract is described ONLY as signed liveness',()=>{
  const x=pythonObservation(HEALTH,1761436800);
  assert.deepEqual(x,{
    schema:'jr.jrei.python-node-observation.v1',pythonProcess:'RESPONDING',
    pythonHealthSchema:'jr.jrei.python-health.v1',nodeObservedAt:1761436800
  });
  assert.equal(Object.hasOwn(x,'model_state'),false);
});
test('spoofed ready or wrong schema is not deemed healthy',()=>{
  assert.equal(pythonObservation({...HEALTH,production_ready:true}).pythonProcess,'UNAVAILABLE');
  assert.equal(pythonObservation({...HEALTH,schema:'something-else'}).pythonProcess,'UNAVAILABLE');
  assert.equal(pythonObservation({}).pythonProcess,'UNAVAILABLE');
});
test('loopback failure cannot forge availability',async()=>{
  const data=await probePythonHealth({fetchLocal:()=>{throw Error('offline')}});
  assert.equal(data.pythonProcess,'UNAVAILABLE');
});
test('fixed loopback target and normal local HTTP only',async()=>{
  let observed='';
  const fetchLocal=async(url,opts)=>{
    observed=url;
    assert.equal(opts.method,'GET');
    assert.equal(opts.redirect,'error');
    return {ok:true,headers:new Headers({'content-type':'application/json'}),
      text:async()=>JSON.stringify(HEALTH)};
  };
  const data=await probePythonHealth({fetchLocal});
  assert.equal(observed,'http://127.0.0.1:8091/internal/v1/health');
  assert.equal(data.pythonProcess,'RESPONDING');
});
test('signed transport required; never asks model to run shell',async()=>{
  await assert.rejects(()=>runPythonHealthWorker({},null,{log:()=>{}}),
    /SIGNED_WORKER_REQUIRED/);
});
test('PHP server source is guarded with existing signed identity and feature flag',async()=>{
  const {readFile}=await import('node:fs/promises');
  const p=await readFile(new URL('../api/index.php',import.meta.url),'utf8');
  const h=await readFile(new URL('../api/jrei-python-node-health.php',import.meta.url),'utf8');
  const w=await readFile(new URL('../platform/jrei-v5/windows-worker/jrei-worker.mjs',import.meta.url),'utf8');
  assert.match(p,/jrHybridAuthenticate\(/);
  assert.match(p,/python-node\/heartbeat/);
  assert.match(p,/jrei_python_node_heartbeat_enabled/);
  assert.match(h,/SIGNED_EXISTING_NODE_REPORT/);
  assert.match(w,/start-python-health/);
  assert.match(w,/python-node\/heartbeat/);
});
