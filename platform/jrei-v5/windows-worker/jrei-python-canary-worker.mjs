/**
 * First bounded site-to-Python round trip over the ORIGINAL signed worker.
 * Only server-authored fixed expression 12*7; neither general-purpose tool
 * execution nor an arbitrary task interpreter. Separate opt-in process.
 */
import {createHash} from 'node:crypto';

export const CANARY='jr.jrei.python-canary.v1';
export function validateCanaryJob(job){
  return job && Object.getPrototypeOf(job)===Object.prototype &&
    Object.keys(job).join(',')==='jobId,leaseId,expression,taskType,expiresAt' &&
    /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(job.jobId) &&
    /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(job.leaseId) &&
    job.expression==='12*7' &&
    job.taskType==='EXACT_ARITHMETIC_CANARY' &&
    Number.isSafeInteger(job.expiresAt) &&
    job.expiresAt>Math.floor(Date.now()/1000);
}
export async function runPythonLocalCanary(job,{fetchLocal=fetch}={}){
  if(!validateCanaryJob(job))throw Error('PYTHON_CANARY_JOB_INVALID');
  const abort=new AbortController();
  const t=setTimeout(()=>abort.abort(),4500);
  try{
    const response=await fetchLocal('http://127.0.0.1:8091/internal/v1/worker/arithmetic',{
      method:'POST',redirect:'error',cache:'no-store',signal:abort.signal,
      headers:{'Content-Type':'application/json','Accept':'application/json'},
      body:JSON.stringify({schema_version:'jr.jrei.arithmetic-request.v1',expression:'12*7'})
    });
    if(response.status!==200||!/^application\/json\b/i.test(response.headers.get('content-type')||''))
      throw Error('PYTHON_CANARY_LOCAL_RESPONSE_INVALID');
    if(Number(response.headers.get('content-length')||0)>2048)
      throw Error('PYTHON_CANARY_RESPONSE_TOO_LARGE');
    const result=await response.text();
    if(result.length>2048)throw Error('PYTHON_CANARY_RESPONSE_TOO_LARGE');
    const parsed=JSON.parse(result);
    if(parsed.schema_version!=='jr.jrei.arithmetic-result.v1' ||
       parsed.expression_normalized!=='12*7' ||
       parsed.numerator!==84 || parsed.denominator!==1 ||
       parsed.exact_fraction!=='84' ||
       parsed.skill_id!=='jrei.math.exact_arithmetic.v1' ||
       parsed.performed_without_model!==true ||
       parsed.any_model_weights_changed!==false)
      throw Error('PYTHON_CANARY_ARITHMETIC_UNTRUSTED');
    if(job.expiresAt<=Math.floor(Date.now()/1000))
      throw Error('PYTHON_CANARY_LEASE_EXPIRED_LOCALLY');
    return {schema:CANARY,jobId:job.jobId,leaseId:job.leaseId,
      numerator:parsed.numerator,denominator:parsed.denominator,
      exactFraction:parsed.exact_fraction,skillId:parsed.skill_id,
      performedWithoutModel:true};
  }finally{clearTimeout(t);}
}
export async function runPythonCanaryWorker(config,key,{post,log,signal,
  fetchLocal=fetch,intervalMs=10000}={}){
  if(typeof post!=='function'||typeof log!=='function'||
     !Number.isInteger(intervalMs)||intervalMs<5000)
    throw Error('SIGNED_WORKER_REQUIRED');
  log('PYTHON_CANARY_SIGNED_WORKER_STARTED');
  while(!signal?.aborted){
    try {
      const polled=await post(config,key,'/api/jrei/v1/python-canary/poll',{schema:CANARY});
      if(polled?.schema!=='jr.jrei.python-canary-poll.v1'||
         polled.productionReady!==false)
        throw Error('PYTHON_CANARY_POLL_INVALID');
      if(polled.job!==null){
        const result=await runPythonLocalCanary(polled.job,{fetchLocal});
        const receipt=await post(config,key,'/api/jrei/v1/python-canary/complete',result);
        // A generic 200/accepted response is not a mother-DB receipt.
        // Bind the acknowledgement to the exact signed job and lease.
        const expectedDigest=createHash('sha256').update(
          `${CANARY}|${result.jobId}|${result.leaseId}|84/1`,'utf8').digest('hex');
        if(receipt?.accepted!==true ||
           receipt.schema!=='jr.jrei.python-canary-completion.v1'||
           receipt.exactFraction!=='84'||
           receipt.productionReady!==false||
           receipt.modelTrainingStarted!==false||
           receipt.resultSha256!==expectedDigest)
          throw Error('PYTHON_CANARY_RECEIPT_INVALID');
        log('PYTHON_CANARY_REAL_MOTHER_DB_ROUNDTRIP_CONFIRMED');
      }
    }catch(e){
      log(e?.message==='WORKER_NOT_AUTHORIZED'?
          'PYTHON_CANARY_WORKER_DISABLED_OR_REVOKED':
          'PYTHON_CANARY_ROUNDTRIP_UNCONFIRMED');
      if(e?.message==='WORKER_NOT_AUTHORIZED')break;
    }
    await new Promise(resolve=>{
      if(signal?.aborted)return resolve();
      const onStop=()=>{clearTimeout(t);resolve();};
      const t=setTimeout(()=>{signal?.removeEventListener('abort',onStop);resolve();},intervalMs);
      signal?.addEventListener('abort',onStop,{once:true});
    });
  }
  log('PYTHON_CANARY_SIGNED_WORKER_STOPPED');
}
