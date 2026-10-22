/* Bilingual client-account BAHAR privacy status bridge.
 * Strictly read-only, on-demand and same-origin; no learner notes, telemetry,
 * localStorage, marketing opt-in, automatic enrollment or duplicated backend.
 * The existing /api/bahar/account/status authority owns all access checks.
 */
(() => {
  'use strict';
  const root=document.querySelector('[data-jr-bahar-account-bridge]');
  if(!root)return;
  const panel=root.closest('[data-dashboard-panel="account"]');
  const button=root.querySelector('[data-jr-bahar-bridge-refresh]');
  const status=root.querySelector('[data-jr-bahar-bridge-status]');
  const output=root.querySelector('[data-jr-bahar-bridge-results]');
  if(!panel||!button||!status||!output)return;
  const en=document.documentElement.lang==='en';
  const T=(fa,enText)=>en?enText:fa;
  const locale=en?'en':'fa';
  let controller=null,epoch=0;
  const active=()=>!panel.hidden&&!document.hidden;
  const make=(tag,text)=>{const item=document.createElement(tag);item.textContent=text;return item;};
  const eraseStates={
    RECEIVED:T('دریافت شده؛ در انتظار بررسی','Received; pending review'),
    PENDING:T('در صف رسیدگی','Pending'),
    IN_REVIEW:T('در حال بررسی','Under review'),
    BLOCKED:T('در انتظار بررسی محدودیت قانونی','Awaiting lawful-retention review'),
    COMPLETED:T('ثبت‌شده به‌عنوان تکمیل‌شده؛ نسخه‌های پشتیبان جدا هستند',
      'Recorded as completed; backups are handled separately')
  };
  const clear=()=>{
    epoch++;
    controller?.abort();controller=null;
    button.disabled=false;output.replaceChildren();
    status.textContent=T('اطلاعات حساب فقط با درخواست خودتان دریافت می‌شود.',
      'Account status is retrieved only when you request it.');
  };
  function render(data){
    output.replaceChildren();
    const list=document.createElement('dl');
    list.className='jr-bahar-privacy-bridge__facts';
    const add=(label,value)=>{
      const pair=document.createElement('div');pair.className='jr-bahar-privacy-bridge__fact';
      pair.append(make('dt',label),make('dd',value));list.append(pair);
    };
    const bool=(value,yes,no)=>value===true?yes:no;
    add(T('آمادگی دیتابیس مادر','Mother database readiness'),
      bool(data.schemaProvisioned,T('ساختار لازم گزارش شده؛ اجرا تأیید نشده',
        'Required schema reported; operation unverified'),
        T('ساختار کامل ثبت نشده','Complete schema not provisioned')));
    add(T('اجازه ذخیره سروری','Server-side storage permission'),
      bool(data.storageEnabled,T('تنظیمات و مجوزهای لازم حاضر گزارش شده‌اند',
        'Required configuration and permissions reported'),
        T('غیرفعال؛ یادگیری رایگان ادامه دارد','Disabled; free learning remains available')));
    add(T('بررسی مستقل بزرگسالی','Independent adult eligibility'),
      bool(data.independentlyVerifiedAdult,T('تأیید معتبر در حساب ثبت شده',
        'Account has a current verified-adult record'),
        T('هنوز تأیید معتبر وجود ندارد','No current independent verification')));
    add(T('رضایت اختصاصی ذخیره','Purpose-specific storage consent'),
      bool(data.currentConsent,T('رضایت جاری در حساب ثبت شده',
        'Current purpose-limited consent recorded'),
        T('رضایت جاری ثبت نشده','No current storage consent')));
    const pending=data.latestErasureRequest;
    add(T('درخواست حذف کاربرگ','Workbook erasure request'),
      data.privacyRequestLedgerAvailable!==true
        ?T('تاریخچه درخواست قابل دریافت نیست','Request history unavailable')
        :pending&&Object.prototype.hasOwnProperty.call(eraseStates,pending.state)
          ?eraseStates[pending.state]
          :T('درخواست فعالی در تاریخچه اخیر نیست','No request shown in recent history'));
    add(T('امکان ذخیره جدید','New account saving'),
      bool(data.canStore,T('فقط با انتخاب صریح فایل و تأیید خودتان',
        'Only after you deliberately select and confirm a workbook'),
        T('فعلاً مجاز نیست','Not currently authorized')));
    output.append(list);
    const note=make('p',T(
      'این گزارش فقط وضعیت مجوز همین حساب را نشان می‌دهد، نه محتوای کاربرگ، تأیید روان‌سنجی یا مجوز خرید. مدیریت رضایت، بررسی درخواست حذف و خروجی شخصی در صفحه BAHAR انجام می‌شود.',
      'These are this account’s authorization states, not workbook content, psychometric validation or purchase approval. Manage consent, review erasure requests and export your own notes from the BAHAR page.'
    ));
    note.className='jr-bahar-privacy-bridge__note';output.append(note);
    status.textContent=T('وضعیت مجاز حساب از سرور دریافت شد؛ صحت عملیاتی سامانه هنوز نیازمند آزمون نهایی است.',
      'Authorized account status was retrieved. End-to-end system acceptance is still pending.');
  }
  button.addEventListener('click',async()=>{
    if(!active()||controller)return;
    const token=++epoch;
    controller=new AbortController();button.disabled=true;output.replaceChildren();
    status.textContent=T('در حال بررسی مجوز همین حساب…',
      'Checking your account-specific permissions…');
    try{
      const response=await fetch('/api/bahar/account/status?locale='+locale,{
        method:'GET',credentials:'same-origin',cache:'no-store',
        headers:{Accept:'application/json'},signal:controller.signal
      });
      if(!response.ok){
        throw new Error(response.status===401?'LOGIN':'UNAVAILABLE');
      }
      const data=await response.json();
      if(token!==epoch||!active())return;
      if(data?.ok!==true||data.schema!=='jr.bahar-adult-account-status.v1'||
        typeof data.schemaProvisioned!=='boolean'||
        typeof data.storageEnabled!=='boolean'||
        typeof data.independentlyVerifiedAdult!=='boolean'||
        typeof data.currentConsent!=='boolean'||
        typeof data.canStore!=='boolean'||
        typeof data.privacyRequestLedgerAvailable!=='boolean'||
        data.contentReturned!==false||
        (data.latestErasureRequest!==null&&(
          !data.latestErasureRequest||
          typeof data.latestErasureRequest.state!=='string'
        )))throw Error('INCOMPATIBLE');
      render(data);
    }catch(error){
      if(token!==epoch||error?.name==='AbortError')return;
      output.replaceChildren();
      status.textContent=error?.message==='LOGIN'
        ?T('برای مشاهده وضعیت خصوصی، ابتدا وارد همین حساب شوید.',
           'Sign in to this account before viewing its private status.')
        :T('وضعیت خصوصی اکنون در دسترس نیست؛ هیچ ذخیره یا تأییدی فرض نمی‌شود.',
           'Private status is unavailable. No saving or approval is assumed.');
    }finally{
      if(token===epoch){controller=null;button.disabled=false;}
    }
  });
  const observer=new MutationObserver(()=>{
    if(panel.hidden)clear();
  });
  observer.observe(panel,{attributes:true,attributeFilter:['hidden']});
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden)clear();
  });
  window.addEventListener('pagehide',()=>{
    clear();observer.disconnect();
  },{once:true});
})();
