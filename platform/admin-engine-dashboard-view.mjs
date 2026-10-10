// A bounded, privacy-safe view model for authenticated admin consoles.
// No raw signals, payment details, user records, or error stack traces are exposed.
import {normalizeEngineReport} from './admin-engine-report-client.mjs';
const ORDER=['BLOCKED','DEGRADED','UNVERIFIED','ACTIVE'];
export function buildEngineDashboardView(payload,{now=new Date(),stale_after_minutes=15}={}){
 const report=normalizeEngineReport(payload);
 if(!Number.isFinite(stale_after_minutes)||stale_after_minutes<=0) throw new Error('Valid staleness window required');
 const current=now.getTime();
 if(!Number.isFinite(current)) throw new Error('Valid current time required');
 const engines=report.engines.map(row=>{
  const stamp=row.last_verified_at?Date.parse(row.last_verified_at):NaN;
  const fresh=Number.isFinite(stamp)&&stamp<=current&&(current-stamp)<=stale_after_minutes*60000;
  const status=row.status==='ACTIVE'&&!fresh?'UNVERIFIED':row.status;
  return {...row,status,stale:!fresh,
   requests_24h:fresh&&status!=='UNVERIFIED'?row.requests_24h:null,
   errors_24h:fresh&&status!=='UNVERIFIED'?row.errors_24h:null};
 }).sort((a,b)=>ORDER.indexOf(a.status)-ORDER.indexOf(b.status)||a.id.localeCompare(b.id));
 const totals=Object.fromEntries(ORDER.map(status=>[status,engines.filter(e=>e.status===status).length]));
 return {as_of:report.as_of,engines,totals,engine_count:engines.length,live_verified:engines.filter(e=>e.status==='ACTIVE'&&!e.stale).length};
}
