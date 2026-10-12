// Authenticated admin console table renderer. No HTML injection; text nodes only.
// This module does not fetch or store credentials. Use the protected report client.
import {buildEngineDashboardView} from './admin-engine-dashboard-view.mjs';
const labels={ACTIVE:'فعال',DEGRADED:'نیازمند بررسی',BLOCKED:'مسدود',UNVERIFIED:'تأییدنشده'};
export function renderEngineStatusTable({document,container,payload,now=new Date()}={}){
 if(!document||!container) throw new Error('Admin view container required');
 const view=buildEngineDashboardView(payload,{now});
 const table=document.createElement('table');
 table.setAttribute('aria-label','وضعیت موتورهای اکوسیستم');
 const head=document.createElement('thead'),heading=document.createElement('tr');
 for(const title of ['موتور','حوزه','وضعیت','آخرین تأیید','درخواست‌های ۲۴ ساعت','خطاهای ۲۴ ساعت']){
  const th=document.createElement('th');th.textContent=title;heading.append(th);
 }
 head.append(heading);table.append(head);
 const body=document.createElement('tbody');
 for(const engine of view.engines){
  const row=document.createElement('tr');row.dataset.engineStatus=engine.status;
  for(const value of [engine.id,engine.owner_module||'—',labels[engine.status],engine.last_verified_at||'—',
   engine.requests_24h===null?'—':String(engine.requests_24h),
   engine.errors_24h===null?'—':String(engine.errors_24h)]){
   const td=document.createElement('td');td.textContent=value;row.append(td);
  }
  body.append(row);
 }
 table.append(body);container.replaceChildren(table);
 return {engine_count:view.engine_count,totals:view.totals,as_of:view.as_of};
}
