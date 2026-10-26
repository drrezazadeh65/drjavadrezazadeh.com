/**
 * Outbound-only, signed Python 8091 process observation. Source-staged.
 * Explicitly uses existing Node B Ed25519/DPAPI identity, never new keys,
 * secrets, port forwarding, remote shell, or model/tool execution.
 * No live deployment implied by this file.
 */
const URL='http://127.0.0.1:8091/internal/v1/health';
const ENDPOINT='/api/jrei/v1/python-node/heartbeat';
export const PYTHON_REPORT_SCHEMA='jr.jrei.python-node-observation.v1';
export function pythonObservation(payload, now=Math.floor(Date.now()/1000)) {
  const good=payload!==null && typeof payload==='object' &&
    !Array.isArray(payload) &&
    payload.schema==='jr.jrei.python-health.v1' &&
    payload.service==='jrei-private-python' &&
    payload.service_process==='RESPONDING' &&
    payload.production_ready===false;
  return Object.freeze({
    schema:PYTHON_REPORT_SCHEMA,
    pythonProcess:good?'RESPONDING':'UNAVAILABLE',
    pythonHealthSchema:good?'jr.jrei.python-health.v1':'NOT_OBSERVED',
    nodeObservedAt:now
  });
}
export async function probePythonHealth({fetchLocal=fetch,signal}={}) {
  const abort=new AbortController();
  const timeout=setTimeout(()=>abort.abort(),3000);
  const onAbort=()=>abort.abort();
  signal?.addEventListener('abort',onAbort,{once:true});
  try {
    const response=await fetchLocal(URL,{
      method:'GET',cache:'no-store',redirect:'error',signal:abort.signal
    });
    if(!response.ok || !/^application\/json\b/i.test(
        response.headers.get('content-type')||''))return pythonObservation(null);
    const size=Number(response.headers.get('content-length')||0);
    if(size>2048)return pythonObservation(null);
    const raw=await response.text();
    if(raw.length>2048)return pythonObservation(null);
    return pythonObservation(JSON.parse(raw));
  }catch{
    return pythonObservation(null);
  }finally{
    clearTimeout(timeout);
    signal?.removeEventListener('abort',onAbort);
  }
}
export async function runPythonHealthWorker(config,key,{post,log,signal,
  fetchLocal=fetch,intervalMs=30000}={}) {
  if(typeof post!=='function'||typeof log!=='function'||
      !Number.isInteger(intervalMs)||intervalMs<20000)
    throw Error('PYTHON_HEALTH_SIGNED_WORKER_REQUIRED');
  log('PYTHON_HEALTH_OUTBOUND_PROBE_STARTED');
  let failures=0;
  while(!signal?.aborted){
    const observation=await probePythonHealth({fetchLocal,signal});
    try {
      const receipt=await post(config,key,ENDPOINT,observation);
      if(receipt?.ok!==true ||
         receipt?.schema!=='jr.jrei.python-node-receipt.v1' ||
         receipt.accepted!==true ||
         receipt.productionReady!==false)
        throw Error('PYTHON_HEALTH_RECEIPT_INVALID');
      failures=0;
      log(observation.pythonProcess==='RESPONDING'?
        'PYTHON_NODE_SIGNED_LIVENESS_RECORDED':'PYTHON_NODE_UNAVAILABLE_RECORDED');
    }catch{
      failures=Math.min(5,failures+1);
      log('PYTHON_HEALTH_SIGNED_REPORT_UNCONFIRMED');
    }
    const pause=Math.max(intervalMs,Math.min(120000,intervalMs*2**failures));
    await new Promise(resolve=>{
      if(signal?.aborted)return resolve();
      const onStop=()=>{clearTimeout(t);resolve();};
      const t=setTimeout(()=>{signal?.removeEventListener('abort',onStop);resolve();},pause);
      signal?.addEventListener('abort',onStop,{once:true});
    });
  }
  log('PYTHON_HEALTH_OUTBOUND_PROBE_STOPPED');
}
