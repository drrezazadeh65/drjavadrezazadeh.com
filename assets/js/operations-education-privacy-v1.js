/* JR owner education privacy governance snapshot — explicitly requested.
 * No PII, no personal-record reads, no arbitrary table SQL or deletion.
 * Admin existing session + recent MFA are checked by the PHP API.
 */
(() => {
  'use strict';
  const root=document.querySelector('[data-jr-education-privacy]');
  const workspace=document.getElementById('ops-workspace');
  const host=document.getElementById('ops-education-readiness');
  if(!root||!workspace||!host)return;
  const fa=document.documentElement.lang==='fa';
  const T=(a,b)=>fa?a:b;
  const summary=root.querySelector('[data-education-privacy-summary]');
  const button=root.querySelector('[data-education-privacy-refresh]');
  const status=root.querySelector('[data-education-privacy-status]');
  const tables=root.querySelector('[data-education-privacy-tables]');
  const requests=root.querySelector('[data-education-privacy-requests]');
  if(!summary||!button||!status||!tables||!requests)return;
  const formatter=new Intl.NumberFormat(fa?'fa-IR':'en-US');
  let current=0,controller=null,busy=false;
  const visible=()=>host.open&&!workspace.hidden&&!document.hidden&&navigator.onLine;
  const el=(tag,cls,value)=>{
    const item=document.createElement(tag);
    if(cls)item.className=cls;
    if(value!==undefined)item.textContent=String(value);
    return item;
  };
  function clear(){
    current++;controller?.abort();controller=null;busy=false;
    button.disabled=false;summary.textContent='';
    tables.replaceChildren();requests.replaceChildren();
    status.textContent=T('این بخش تنها با درخواست مدیر خوانده می‌شود.',
      'This section loads only on explicit administrator request.');
  }
  async function load(){
    if(!visible()||busy)return;
    const token=++current;
    controller?.abort();controller=new AbortController();
    const activeController=controller;
    let timedOut=false;
    const timeout=setTimeout(()=>{timedOut=true;activeController.abort();},15000);
    busy=true;button.disabled=true;
    // Stale source metadata must not be displayed while a new read is
    // pending; the next result may have fewer tables or revoked access.
    summary.textContent='';tables.replaceChildren();requests.replaceChildren();
    status.textContent=T('در حال بررسی محرمانه وضعیت منابع و نگهداری داده…',
      'Reading private privacy-governance metadata…');
    try{
      const res=await fetch('/api/admin/operations/education-privacy',{
        method:'GET',credentials:'same-origin',cache:'no-store',
        headers:{Accept:'application/json'},signal:controller.signal
      });
      if(!res.ok)throw Error('NO_ACCESS');
      const data=await res.json();
      if(token!==current||!visible())return;
      if(!data||data.ok!==true||
        data.schema!=='jr.educational-privacy-admin-snapshot.v1'||
        data.readOnly!==true||data.canDelete!==false||
        data.safeDeletionAuthorized!==false||
        data.retentionValidated!==false||
        !(data.activeLegalHolds===null||
          (Number.isSafeInteger(data.activeLegalHolds)&&data.activeLegalHolds>=0))||
        !Array.isArray(data.dependencyTables)||
        data.dependencyTables.length>25||
        !['UNAVAILABLE','OBSERVED'].includes(data.openRequestsState)||
        (data.openRequestsState==='OBSERVED' &&
           (!Array.isArray(data.openRequestCounts)||data.openRequestCounts.length>40))||
        (data.openRequestsState==='UNAVAILABLE' && data.openRequestCounts!==null))
        throw Error('UNTRUSTED');
      summary.textContent=T('این نمای مدیریتی فقط خواندنی است؛ هیچ اختیار حذف یا گواهی حقوقی صادر نمی‌کند.',
        'This owner overview is read-only and does not grant deletion authority or certify legal compliance.');
      tables.replaceChildren();requests.replaceChildren();
      for(const row of data.dependencyTables){
        if(!row||typeof row.table!=='string'||row.table.length>100||
          typeof row.sourceTableExists!=='boolean')continue;
        const card=el('article','jr-edu-offers__card');
        card.append(el('strong','jr-edu-offers__title',row.table));
        card.append(el('p','jr-edu-offers__warning',row.sourceTableExists
          ?T('جدول موجود است؛ صحت فرآیند حقوقی هنوز مشخص نیست.',
            'Table present; lawful erasure workflow remains unverified.')
          :T('جدول در پایگاه داده تأیید نشد.','Table not found in the mother database.')));
        tables.append(card);
      }
      if(data.openRequestsState==='UNAVAILABLE'){
        requests.append(el('p',T('تعداد درخواست‌های باز نامشخص است؛ گزارش پایگاه داده در دسترس نیست.',
          'Open privacy-request counts are UNKNOWN because the database report is unavailable.')));
      } else if(data.openRequestCounts.length===0){
        requests.append(el('p',T('هیچ درخواست بازی در جدول موجود ثبت نشده است؛ این فقط مشاهده همان جدول است.',
          'No open requests observed in the available table; this does not certify privacy compliance.')));
      }
      for(const row of data.openRequestCounts||[]){
        if(!row||typeof row.type!=='string'||typeof row.state!=='string'||
          !Number.isSafeInteger(row.count)||row.count<0)continue;
        const entry=el('article','jr-edu-offers__card');
        entry.append(el('strong','jr-edu-offers__title',row.type+' · '+row.state));
        entry.append(el('p','jr-edu-offers__price',
          T('تعداد درخواست ثبت‌شده: ','Recorded requests: ')+formatter.format(row.count)));
        requests.append(entry);
      }
      status.textContent=data.activeLegalHolds===null
        ?T('تعداد محدودیت‌های قانونی قابل تأیید نیست. هیچ حذفی مجاز نشده است.',
          'Active legal-hold count is unknown; no deletion is authorized.')
        :T('تعداد محدودیت‌های قانونی در پایگاه داده: ',
            'Recorded active legal holds: ')+formatter.format(data.activeLegalHolds)+
            T('؛ هیچ حذفی اجرا نشده است.','; no deletion was performed.');
    }catch(e){
      if(token!==current||!visible())return;
      summary.textContent='';
      tables.replaceChildren();requests.replaceChildren();
      status.textContent=timedOut
        ?T('مهلت ۱۵ثانیه‌ای دریافت وضعیت پایان یافت؛ داده‌های پیشین پاک شدند. دوباره درخواست کنید.',
          'The 15-second owner read expired. Prior data was cleared; retry explicitly.')
        :T('شواهد قانونی و نگهداری داده قابل تأیید نیست؛ نمای مدیریتی هیچ اجازه حذفی صادر نمی‌کند.',
          'Privacy and retention evidence is unavailable. The overview does not authorize erasure.');
    }finally{
      clearTimeout(timeout);
      if(token===current){controller=null;busy=false;button.disabled=false;}
    }
  }
  button.addEventListener('click',load);
  host.addEventListener('toggle',()=>{if(!host.open)clear();});
  const observer=new MutationObserver(()=>{if(workspace.hidden)clear();});
  observer.observe(workspace,{attributes:true,attributeFilter:['hidden']});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)clear();});
  window.addEventListener('offline',clear);
  window.addEventListener('jr:account-logout',clear);
  window.addEventListener('pagehide',()=>{clear();observer.disconnect();},{once:true});
})();