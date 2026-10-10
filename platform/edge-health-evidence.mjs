// Server-only health evidence for existing Cloudflare edge services.
// Edge health is NOT evidence that any of the 13 domain engines is operational.
const PROBES=Object.freeze([
 {id:'assistant-edge',url:'https://assistant.drjavadrezazadeh.com/health',service:'site-assistant'},
 {id:'payments-edge',url:'https://payments.drjavadrezazadeh.com/health',service:'payments'}
]);
export async function collectEdgeHealthEvidence({fetcher,now=()=>new Date(),timeout_ms=5000}={}){
 if(typeof fetcher!=='function')throw new Error('Server fetch transport required');
 if(!Number.isSafeInteger(timeout_ms)||timeout_ms<100||timeout_ms>10000)throw new Error('Invalid timeout');
 const checked_at=now().toISOString();
 return Promise.all(PROBES.map(async probe=>{
  try{
   const response=await fetcher(probe.url,{method:'GET',redirect:'error',cache:'no-store',
    headers:{Accept:'application/json'},signal:AbortSignal.timeout(timeout_ms)});
   if(!response.ok)return {id:probe.id,healthy:false,checked_at};
   if(response.url&&response.url!==probe.url)return {id:probe.id,healthy:false,checked_at};
   const body=await response.json();
   return {id:probe.id,healthy:body?.status==='ok'&&body?.service===probe.service,checked_at};
  }catch{return {id:probe.id,healthy:false,checked_at}}
 }));
}
