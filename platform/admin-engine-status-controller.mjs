// Browser controller: mount only inside a protected admin origin.
// Credentials are same-origin cookies; do not put tokens into URLs or storage.
import {loadAdminEngineReport} from './admin-engine-report-client.mjs';
import {renderEngineStatusTable} from './admin-engine-status-table.mjs';
const ENDPOINT='/api/v1/admin/engine-status';
export function createEngineStatusController({document,container,fetcher,origin,now=()=>new Date()}={}){
 if(!document||!container||typeof fetcher!=='function'||typeof origin!=='string')
  throw new Error('Protected admin context required');
 const expected=new URL(origin);
 if(expected.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(expected.hostname))
  throw new Error('HTTPS required for admin reporting');
 let pending=false;
 const status=document.createElement('p');status.setAttribute('role','status');
 const setStatus=message=>{status.textContent=message;container.replaceChildren(status)};
 async function refresh(){
  if(pending)return false;
  pending=true;setStatus('در حال دریافت گزارش تأییدشده...');
  try{
   const payload=await loadAdminEngineReport({transport:async({signal})=>{
    const url=new URL(ENDPOINT,expected);
    const response=await fetcher(url.href,{method:'GET',credentials:'same-origin',cache:'no-store',redirect:'error',signal,
     headers:{Accept:'application/json'}});
    if(!response.ok)throw new Error('Private report unavailable');
    if(response.url&&new URL(response.url).origin!==expected.origin)throw new Error('Cross-origin response rejected');
    return response.json();
   }});
   renderEngineStatusTable({document,container,payload,now:now()});
   return true;
  }catch{
   setStatus('گزارش خصوصی در دسترس نیست. هیچ وضعیت عملیاتی تأیید نشده است.');
   return false;
  }finally{pending=false}
 }
 return {refresh};
}
