/**
 * OPTIONAL JREI V5 local model adapter — SOURCE ONLY, NOT WIRED TO PUBLIC API.
 *
 * A separately installed and owner-approved llama.cpp/compatible backend may
 * listen on Windows LOOPBACK ONLY (127.0.0.1). The worker never opens a public
 * inbound socket, installs models, runs arbitrary commands or makes paid calls.
 *
 * Intended future provider integration:
 *   createLocalLlamaAdapter(...).complete({...});
 * Returned text is UNVERIFIED until the existing JREI evidence/verification
 * orchestrator checks individual citations, scientific scope and permissions.
 *
 * No AMD/CUDA/ROCm/Vulkan acceleration claims; CPU-compatible GGUF baseline.
 */
const ALLOWED_ROLES=new Set(['system','user','assistant']);
const MAX_PROMPT=30000, MAX_OUTPUT=1200, MAX_RESPONSE=65536;
const HASH=/^[a-f0-9]{64}$/;
const ID=/^[A-Za-z0-9._:-]{1,100}$/;
const failure=(reason)=>Object.assign(new Error(reason),{retryable:false});
const validLoopback=(url)=>{
  if(typeof url!=='string'||url.length>150)
    throw failure('LOCAL_MODEL_URL_INVALID');
  const u=new URL(url);
  if(u.protocol!=='http:'||u.hostname!=='127.0.0.1'||
     u.pathname!=='/v1/chat/completions'||
     !u.port||Number(u.port)<1024||Number(u.port)>65535||
     u.username||u.password||u.search||u.hash)
    throw failure('MODEL_MUST_USE_EXACT_WINDOWS_LOOPBACK');
  return u.toString();
};
function validateMessages(messages) {
  if(!Array.isArray(messages)||messages.length<1||messages.length>30)
    throw failure('LOCAL_MODEL_MESSAGES_INVALID');
  let size=0;
  for(const item of messages){
    if(!item||typeof item!=='object'||Array.isArray(item)||
       !ALLOWED_ROLES.has(item.role)||
       typeof item.content!=='string'||item.content.length===0||
       item.content.length>12000)
      throw failure('LOCAL_MODEL_MESSAGES_INVALID');
    size+=item.content.length;
    if(size>MAX_PROMPT)throw failure('LOCAL_MODEL_PROMPT_TOO_LARGE');
  }
  return messages.map(m=>({role:m.role,content:m.content}));
}
async function boundedJson(response){
  if(!response.ok){
    const e=failure('LOCAL_MODEL_BACKEND_UNAVAILABLE');
    e.retryable=response.status===429||response.status>=500;
    throw e;
  }
  if(!/^application\/json\b/i.test(response.headers.get('content-type')||'')||
     Number(response.headers.get('content-length')||0)>MAX_RESPONSE||
     !response.body)throw failure('LOCAL_MODEL_RESPONSE_UNTRUSTED');
  const reader=response.body.getReader();
  const chunks=[];let count=0;
  try {
    while(true){
      const {value,done}=await reader.read();
      if(done)break;
      count+=value.byteLength;
      if(count>MAX_RESPONSE)throw failure('LOCAL_MODEL_RESPONSE_TOO_LARGE');
      chunks.push(Buffer.from(value));
    }
  }finally{reader.releaseLock();}
  const content=JSON.parse(Buffer.concat(chunks).toString('utf8'));
  if(!content||typeof content!=='object'||Array.isArray(content))
    throw failure('LOCAL_MODEL_RESPONSE_UNTRUSTED');
  return content;
}
/**
 * Adapter contract matches JREI V5's provider-neutral model registry shape,
 * but does NOT independently approve the model or route website traffic.
 *
 * The approved model identifier/digest/licence are OWNER-ATTESTED metadata,
 * not independently verified by this JS function. Real binary/GGUF hash,
 * inference correctness, RAM, thermal and driver checks are final-only.
 */
export function createLocalLlamaAdapter({
  id='jrei-local-loopback',
  model,
  modelVersion,
  modelArtifactSha256,
  licenceReviewed=false,
  ownerApproved=false,
  endpoint='http://127.0.0.1:8080/v1/chat/completions',
  fetchImpl=globalThis.fetch,
  timeoutMs=45000
}={}) {
  const localUrl=validLoopback(endpoint);
  if(!ID.test(id)||!ID.test(model??'')||!ID.test(modelVersion??'')||
     !HASH.test(modelArtifactSha256??'')||!licenceReviewed||!ownerApproved||
     !Number.isInteger(timeoutMs)||timeoutMs<5000||timeoutMs>90000||
     typeof fetchImpl!=='function')
    throw failure('LOCAL_MODEL_OWNER_APPROVAL_REQUIRED');
  return Object.freeze({
    id,
    modelVersion,
    modelArtifactSha256,
    providerType:'LOCAL_WINDOWS_WORKER',
    actualBackendVerified:false,
    modelWeightsUpdated:false,
    /**
     * This is an inexpensive loopback-only liveness probe, not a licence,
     * weights, process-identity or scientific-quality attestation.
     * The JREI Windows Worker must not advertise a signed chat heartbeat
     * until its previously hash-pinned llama.cpp backend is responsive.
     */
    async probe({signal}={}) {
      const ctl=new AbortController();
      const cancel=()=>ctl.abort();
      signal?.addEventListener?.('abort',cancel,{once:true});
      const timer=setTimeout(cancel,2000);
      try{
        const healthUrl=new URL('/health',localUrl).toString();
        const response=await fetchImpl(healthUrl,{
          method:'GET',redirect:'error',cache:'no-store',
          headers:{'Accept':'application/json'},signal:ctl.signal
        });
        const health=await boundedJson(response);
        if(health.status!=='ok')
          throw failure('LOCAL_MODEL_BACKEND_NOT_READY');
        return {reachable:true,loopbackOnly:true,
          runtimeHealthChecked:true,weightsAndIdentityIndependentlyAttested:false};
      }finally{
        clearTimeout(timer);
        signal?.removeEventListener?.('abort',cancel);
      }
    },
    async complete(request={}) {
      if(request.model!==model)
        throw failure('UNAPPROVED_MODEL_SELECTION');
      if(request.tools?.length)
        throw failure('LOCAL_MODEL_TOOL_CALLS_DISABLED');
      if(request.responseFormat&&
         !['json_schema','json'].includes(request.responseFormat.type))
        throw failure('LOCAL_MODEL_FORMAT_INVALID');
      const messages=validateMessages(request.messages);
      const maxTokens=request.maxOutputTokens;
      if(!Number.isInteger(maxTokens)||maxTokens<1||maxTokens>MAX_OUTPUT)
        throw failure('LOCAL_MODEL_TOKEN_LIMIT');
      const temperature=request.temperature??0;
      if(!Number.isFinite(temperature)||temperature<0||temperature>0.6)
        throw failure('LOCAL_MODEL_TEMPERATURE_UNAPPROVED');
      const ctl=new AbortController();
      const cancel=()=>ctl.abort();
      request.signal?.addEventListener?.('abort',cancel,{once:true});
      const timer=setTimeout(cancel,timeoutMs);
      try {
        const response=await fetchImpl(localUrl,{
          method:'POST',redirect:'error',cache:'no-store',
          headers:{'Content-Type':'application/json','Accept':'application/json'},
          body:JSON.stringify({
            model,messages,max_tokens:maxTokens,
            temperature,stream:false
          }),signal:ctl.signal
        });
        const payload=await boundedJson(response);
        const text=payload.choices?.[0]?.message?.content;
        if(typeof text!=='string'||text.length>16000)
          throw failure('LOCAL_MODEL_OUTPUT_INVALID');
        return {
          text,
          toolCalls:[],
          usage:{
            inputTokens:Number.isSafeInteger(payload.usage?.prompt_tokens)
              ?payload.usage.prompt_tokens:0,
            outputTokens:Number.isSafeInteger(payload.usage?.completion_tokens)
              ?payload.usage.completion_tokens:0
          },
          stopReason:payload.choices?.[0]?.finish_reason??null,
          verified:false,
          requiresEvidenceVerification:true,
          source:'LOCAL_MODEL_DRAFT_UNVERIFIED'
        };
      }finally{
        clearTimeout(timer);
        request.signal?.removeEventListener?.('abort',cancel);
      }
    }
  });
}
