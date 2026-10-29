/* JREI AI reporting: view only. The engine and results belong to JREI API.
 * Original operations session/MFA owns the browser. Never query a worker,
 * call localhost, read secrets or guess absent measurements.
 */
(()=>{
 'use strict';
 const workspace=document.getElementById('ops-workspace');
 if(!workspace)return;
 const en=document.documentElement.lang==='en';
 const t=(fa,english)=>en?english:fa;
 let generation=0,section=null,detail=null,summary=null;
 function node(tag,text){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;}
 function mount(){
  if(section&&section.isConnected)return;
  section=node('section');section.id='ops-jrei-ai-reports';
  section.className='ops-panel';
  section.setAttribute('aria-label',t('گزارش هوش مصنوعی JREI','JREI AI reports'));
  const title=node('h2',t('گزارش‌های هوش مصنوعی مستقل JREI','Independent JREI AI reports'));
  const desc=node('p',t('منبع انحصاری: API امن JREI. گزارش‌های قدیمی سایت با دادهٔ موتور مستقل تلفیق نمی‌شوند.','Exclusive source: authenticated JREI API. Legacy site snapshots are not mixed into independent AI results.'));
  const refresh=node('button',t('دریافت گزارش از API','Fetch report from API'));
  refresh.type='button';
  summary=node('p');summary.setAttribute('role','status');summary.setAttribute('aria-live','polite');
  detail=node('div');
  refresh.addEventListener('click',()=>read());
  section.append(title,desc,refresh,summary,detail);
  workspace.append(section);
 }
 async function read(){
  if(workspace.hidden)return;
  mount();
  const current=++generation;
  summary.textContent=t('درخواست از API مستقل…','Requesting independent API…');
  detail.replaceChildren();
  try{
   const response=await fetch('/api/admin/operations/jrei-ai-reports',{
    method:'GET',credentials:'same-origin',cache:'no-store',
    headers:{Accept:'application/json'}
   });
   if(current!==generation||workspace.hidden)return;
   if(!response.ok){summary.textContent=t('API مستقل هنوز فعال یا قابل دسترسی نیست؛ گزارش زنده‌ای ارائه نمی‌شود.','Independent API is not enabled or reachable; live results are unavailable.');return;}
   const result=await response.json();
   if(current!==generation||workspace.hidden)return;
   if(!result||result.ok!==true||
      result.schema_version!=='jr.jrei.admin-ai-reporting-snapshot.v1'||
      !Array.isArray(result.engine_reports)||
      !Array.isArray(result.workspaces)){
     summary.textContent=t('قرارداد گزارش API معتبر نیست.','Invalid API report contract.');return;
   }
   summary.textContent=t('فهرست کد منتقل‌شده؛ نه شاهد فعالیت زنده. ','Imported source inventory, not live activity. ')+
      String(result.source_engine_count)+t(' موتور، ',' engines, ')+
      String(result.source_action_count)+t(' اقدام، ',' actions, ')+
      String(result.source_report_count)+t(' گزارش.',' reports.');
   const list=node('ul');
   for(const item of result.workspaces.slice(0,30)){
    if(typeof item.id!=='string'||typeof item.status!=='string')continue;
    const li=node('li');
    const label=en?item.id:String(item.name_fa||item.id);
    li.textContent=label+' — '+(item.status==='NOT_ATTESTED'
      ?t('تأیید عملیاتی نشده','not operationally attested')
      :String(item.status).slice(0,60));
    list.append(li);
   }
   detail.append(list);
  }catch(_){
   if(current===generation&&!workspace.hidden)
    summary.textContent=t('ارتباط API مستقل برقرار نشد؛ هیچ عددی تخمین زده نمی‌شود.','Independent API unreachable; no metrics are estimated.');
  }
 }
 workspace.addEventListener('jr:operations-ready',()=>{mount();read();});
 workspace.addEventListener('jr:operations-locked',()=>{
  ++generation;
  if(detail)detail.replaceChildren();
  if(section)section.remove();
  section=detail=summary=null;
 });
})();
