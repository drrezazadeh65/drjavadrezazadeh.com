/* JR verified owner BAHAR privacy request queue. Source-only.
 * Explicitly requested, fresh MFA, no workbook contents, no new site URLs,
 * and never a mechanism for lifting legal holds or deleting other services.
 */
(() => {
  'use strict';
  const root=document.querySelector('[data-jr-education-erasure-queue]');
  const workspace=document.getElementById('ops-workspace');
  const parent=document.getElementById('ops-education-readiness');
  if(!root||!workspace||!parent)return;
  const fa=document.documentElement.lang==='fa';
  const T=(a,b)=>fa?a:b;
  const refresh=root.querySelector('[data-erasure-queue-refresh]');
  const status=root.querySelector('[data-erasure-queue-status]');
  const list=root.querySelector('[data-erasure-queue-list]');
  const select=root.querySelector('[data-erasure-queue-selection]');
  const button=root.querySelector('[data-erasure-queue-complete]');
  const form=root.querySelector('[data-erasure-queue-form]');
  if(!refresh||!status||!list||!select||!button||!form)return;
  const formatter=new Intl.NumberFormat(fa?'fa-IR':'en-US');
  const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const allowed=new Set(['RECEIVED','PENDING','IN_REVIEW','BLOCKED']);
  let controller=null,generation=0,busy=false,items=[];
  const visible=()=>!workspace.hidden&&parent.open&&!document.hidden;
  const note=s=>{status.textContent=s;};
  const element=(tag,textValue,cls)=>{
    const el=document.createElement(tag);
    if(cls)el.className=cls;
    if(textValue!==undefined)el.textContent=String(textValue);
    return el;
  };
  function buttons(){
    const chosen=items.find(item=>item.id===select.value);
    button.disabled=busy||!visible()||!chosen;
    select.disabled=busy||!visible()||items.length===0;
  }
  function clear(){
    generation++;controller?.abort();controller=null;
    items=[];busy=false;refresh.disabled=false;
    list.replaceChildren();select.replaceChildren();buttons();
    note(T('درخواست‌های خصوصی فقط با اقدام مدیر خوانده می‌شوند.',
      'Private requests load only when the owner asks.'));
  }
  function present(data){
    items=data.requests;list.replaceChildren();select.replaceChildren();
    const totals=data.totalCounts||{};
    const blocked=Number.isSafeInteger(totals.BLOCKED)?totals.BLOCKED:0;
    const count=Object.values(totals).reduce((n,v)=>
      n+(Number.isSafeInteger(v)&&v>=0?v:0),0);
    note(T('درخواست‌های ثبت‌شده: ','Recorded requests: ')+
      formatter.format(count)+T(' · در انتظار رفع محدودیت: ',' · on legal hold: ')+
      formatter.format(blocked)+(data.truncated
        ?T(' · فهرست خلاصه‌شده است.',' · list is limited.'):''));
    if(!items.length){
      list.append(element('p',T('درخواستی در صف بررسی وجود ندارد.',
        'No outstanding requests are visible in this owner queue.')));
    }
    for(const item of items){
      if(!item||!uuid.test(item.id)||
        !uuid.test(item.requesterAccountId)||
        !allowed.has(item.status)||
        item.containsPersonalWorkbookContent!==false)continue;
      const option=element('option',
        item.id.slice(0,8)+' · '+item.status);
      option.value=item.id;
      select.append(option);
      const card=element('article',undefined,'jr-edu-offers__card');
      card.append(element('strong',
        T('درخواست حذف ','Erasure request ')+item.id.slice(0,8),
        'jr-edu-offers__title'));
      card.append(element('p',T('وضعیت قانونی: ','Current state: ')+
        item.status,'jr-edu-offers__warning'));
      if(item.requestedAt)card.append(element('small',
        T('تاریخ ثبت: ','Submitted: ')+item.requestedAt));
      list.append(card);
    }
    buttons();
  }
  async function read(){
    if(!visible()||busy)return false;
    const token=++generation;
    controller?.abort();controller=new AbortController();
    busy=true;refresh.disabled=true;buttons();
    note(T('در حال خواندن صف درخواست‌های ثبت‌شده…',
      'Reading the actual mother-database privacy queue…'));
    try{
      const response=await fetch('/api/admin/operations/education-erasure-requests',{
        method:'GET',credentials:'same-origin',cache:'no-store',
        headers:{Accept:'application/json'},signal:controller.signal
      });
      if(!response.ok)throw Error('MFA');
      const data=await response.json();
      if(token!==generation||!visible())return false;
      if(data?.ok!==true||
        data.schema!=='jr.bahar-owner-erasure-queue.v1'||
        data.legalHoldOverrideAvailable!==false||
        !Array.isArray(data.requests)||data.requests.length>100||
        (data.totalCounts!==null &&
          (typeof data.totalCounts!=='object'||Array.isArray(data.totalCounts)))||
        typeof data.truncated!=='boolean')throw Error('BAD_QUEUE');
      if(data.state==='MOTHER_DATABASE_UNAVAILABLE'){
        items=[];list.replaceChildren();select.replaceChildren();
        note(T('جدول درخواست‌های حریم خصوصی در دیتابیس مادر آماده نیست. هیچ نتیجه‌ای فرض نمی‌شود.',
          'The mother-database request ledger is unavailable; no privacy action can be assumed.'));
        return false;
      }
      if(data.state!=='LIVE_MOTHER_DATABASE_REQUEST_QUEUE'||
        data.canCompleteOnlyAfterLegalHoldClear!==true)
        throw Error('UNTRUSTED_QUEUE');
      present(data);return true;
    }catch(error){
      if(token!==generation||error?.name==='AbortError')return false;
      items=[];select.replaceChildren();list.replaceChildren();
      note(T('وضعیت درخواست‌ها قابل دریافت نیست. حذف یا رفع محدودیت انجام نشده است.',
        'Cannot retrieve this owner queue. No deletion or hold release occurred.'));
      return false;
    }finally{
      if(token===generation){busy=false;controller=null;
        refresh.disabled=false;buttons();}
    }
  }
  refresh.addEventListener('click',read);
  select.addEventListener('change',buttons);
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    if(!visible()||busy||button.disabled)return;
    const request=items.find(item=>item.id===select.value);
    if(!request||!uuid.test(request.id))return;
    const question=T(
      'درخواست حذف این کاربرگ را فقط پس از اطمینان از رفع موانع قانونی تکمیل می‌کنید؟ سوابق ممیزی و پشتیبان مستقل می‌مانند.',
      'Complete this requested workbook erasure only after confirming lawful holds are clear? Audit and backup obligations remain separate.'
    );
    if(!window.confirm(question))return;
    const token=++generation;
    controller?.abort();controller=new AbortController();
    busy=true;refresh.disabled=true;buttons();
    note(T('در حال احراز دومرحله‌ای و بازبینی محدودیت قانونی…',
      'Rechecking owner MFA and current legal retention obligations…'));
    try{
      const session=await fetch('/api/admin/operations/session',{
        credentials:'same-origin',cache:'no-store',
        headers:{Accept:'application/json'},signal:controller.signal
      });
      if(!session.ok)throw Error('MFA');
      const auth=await session.json();
      if(token!==generation||!visible())return;
      if(auth?.ok!==true||auth.mfaRequired!==false||
        !/^[a-f0-9]{64}$/i.test(auth.csrfToken||''))
        throw Error('MFA');
      const response=await fetch('/api/admin/operations/education-erasure-requests',{
        method:'POST',credentials:'same-origin',cache:'no-store',
        headers:{Accept:'application/json','Content-Type':'application/json',
          'X-CSRF-Token':auth.csrfToken},
        body:JSON.stringify({
          requestId:request.id,
          confirmation:'COMPLETE REQUESTED BAHAR WORKBOOK ERASURE AFTER HOLD REVIEW'
        }),signal:controller.signal
      });
      if(response.status===409)throw Error('HOLD');
      if(!response.ok)throw Error('NOT_CONFIRMED');
      const result=await response.json();
      if(token!==generation||!visible())return;
      if(result?.ok!==true||
        result.schema!=='jr.bahar-owner-erasure-decision.v1'||
        result.requestId!==request.id||result.state!=='COMPLETED'||
        result.backupErasureCertified!==false||
        result.legalHoldOverridePerformed!==false||
        result.otherAccountsAffected!==false)
        throw Error('NOT_CONFIRMED');
      // The authoritative queue must be read again after mutation; do not
      // infer that a dropped card alone proves removal of the stored record.
      items=[];list.replaceChildren();select.replaceChildren();
      note(T('سرور تکمیل درخواست حذف جاری را ثبت کرد. وضعیت صف را دوباره دریافت کنید.',
        'The server recorded completion of this scoped erasure. Reload the request queue to reconcile.'));
    }catch(error){
      if(token!==generation||error?.name==='AbortError')return;
      note(error.message==='HOLD'
        ?T('محدودیت قانونی هنوز فعال است یا وضعیت درخواست تغییر کرده؛ هیچ حذف غیرمجاز انجام نشد.',
          'A lawful hold remains or the request changed. No unauthorized deletion was performed.')
        :T('تکمیل درخواست تأیید نشد؛ لطفاً وضعیت و احراز دومرحله‌ای را دوباره بررسی کنید.',
          'Erasure completion was not confirmed. Recheck current MFA and the queue.'));
    }finally{
      if(token===generation){busy=false;controller=null;
        refresh.disabled=false;buttons();}
    }
  });
  parent.addEventListener('toggle',()=>{if(!parent.open)clear();});
  const observer=new MutationObserver(()=>{if(workspace.hidden)clear();});
  observer.observe(workspace,{attributes:true,attributeFilter:['hidden']});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)clear();});
  window.addEventListener('pagehide',()=>{clear();observer.disconnect();},{once:true});
  clear();
})();
