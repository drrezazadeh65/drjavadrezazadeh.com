/* JR verified-adult BAHAR owner gate: private MFA session, no polling.
 * No study data is retrieved, no pricing/payments/collector are activated.
 */
(() => {
  'use strict';
  const root=document.querySelector('[data-jr-bahar-owner-policy]');
  const workspace=document.getElementById('ops-workspace');
  const container=document.getElementById('ops-education-readiness');
  if(!root||!workspace||!container)return;
  const en=document.documentElement.lang==='en';
  const T=(fa,english)=>en?english:fa;
  const $=part=>root.querySelector('[data-jr-bahar-owner-'+part+']');
  const refresh=$('refresh'),submit=$('save'),toggle=$('enabled');
  const indicators=$('indicators'),status=$('status');
  if(!refresh||!submit||!toggle||!indicators||!status)return;
  let requestId=0,controller=null,loading=false,policy=null;
  const visible=()=>container.open&&!workspace.hidden&&!document.hidden;
  function reset(){
    requestId++;controller?.abort();controller=null;
    loading=false;policy=null;toggle.checked=false;toggle.disabled=true;
    submit.disabled=true;refresh.disabled=false;indicators.replaceChildren();
    status.textContent=T('وضعیت حفاظت‌شده هنوز خوانده نشده است.',
      'Protected configuration has not yet been requested.');
  }
  const label=(name,display)=>{
    const p=document.createElement('p');
    const strong=document.createElement('strong');
    strong.textContent=name+': ';
    p.append(strong,document.createTextNode(display));
    indicators.append(p);
  };
  const yn=v=>v===true?T('بله','Yes'):v===false?T('خیر','No'):
    T('نامشخص','Unknown');
  function render(data){
    policy=data;indicators.replaceChildren();
    label(T('حالت واقعی ذخیره‌سازی خصوصی','Effective private storage'),
      data.effectiveEnabled===true?T('فعال پس از مجوزهای مستقل','Enabled after separate approvals'):
        T('خاموش','Disabled'));
    label(T('کلید اصلی مدیر','Owner master switch'),yn(data.ownerSwitchEnabled));
    label(T('اجازه در تنظیمات خصوصی سرور','Private server opt-in'),yn(data.environmentMasterSwitchEnabled));
    label(T('کلید رمزگذاری سرور','Private encryption key'),yn(data.privateEncryptionKeyConfigured));
    label(T('شواهد مستقل علمی و حقوقی','Independent scientific and privacy review'),
      yn(data.independentScientificAndPrivacyApprovalsRecorded));
    label(T('متن و نسخه رضایت فارسی','Approved Persian privacy notice'),
      yn(data.approvedConsentNoticeFa));
    label(T('متن و نسخه رضایت انگلیسی','Approved English privacy notice'),
      yn(data.approvedConsentNoticeEn));
    const missing=data.additiveDatabaseTablesMissing;
    label(T('جدول‌های ناقص در دیتابیس مادر','Unprovisioned mother-database tables'),
      Array.isArray(missing)?(missing.length?missing.join(' · '):
        T('هیچ کمبودی در فهرست جداول شناسایی نشد','No missing table names identified')):
        T('نامشخص','Unknown'));
    toggle.checked=data.ownerSwitchEnabled===true;
    toggle.disabled=!data.administrativeSwitchAvailable ||
      (!data.canEnable&&data.ownerSwitchEnabled!==true);
    submit.disabled=toggle.disabled;
    status.textContent=T(
      'این کلید صرفاً ذخیرهٔ رمزگذاری‌شدهٔ بزرگسال تأییدشده را کنترل می‌کند؛ مراحل آموزش، پذیرش، فروش و داده‌های کودکان جدا هستند.',
      'Only separately verified adults may use this opt-in encrypted workbook. Admission, learning scores, child records and payments are separate.'
    );
  }
  async function read(){
    if(!visible()||loading)return false;
    const serial=++requestId;
    controller?.abort();controller=new AbortController();loading=true;
    refresh.disabled=true;submit.disabled=true;toggle.disabled=true;
    status.textContent=T('در حال دریافت تنظیمات خصوصی…','Loading private owner settings…');
    try{
      const response=await fetch('/api/admin/operations/education-workbook-policy',{
        credentials:'same-origin',cache:'no-store',
        headers:{Accept:'application/json'},signal:controller.signal
      });
      if(!response.ok)throw Error('RESTRICTED');
      const data=await response.json();
      if(serial!==requestId||!visible())return false;
      if(!data||data.ok!==true||
        data.schema!=='jr.bahar-private-storage-owner-policy.v1'||
        typeof data.ownerSwitchEnabled!=='boolean'||
        typeof data.effectiveEnabled!=='boolean'||
        typeof data.canEnable!=='boolean'||
        data.automaticAdultVerification!==false||
        data.automaticConsentCollection!==false||
        data.paidContentActivation!==false||
        !Array.isArray(data.additiveDatabaseTablesMissing))
        throw Error('INVALID_RESPONSE');
      render(data);return true;
    }catch(error){
      if(serial!==requestId||error?.name==='AbortError')return false;
      policy=null;indicators.replaceChildren();
      status.textContent=T('اطلاعات مدیریتی یا مجوز دومرحله‌ای قابل تأیید نیست؛ سامانه خاموش باقی می‌ماند.',
        'Owner settings or recent MFA cannot be verified; no activation is assumed.');
      return false;
    }finally{
      if(serial===requestId){controller=null;loading=false;refresh.disabled=false;}
    }
  }
  refresh.addEventListener('click',read);
  submit.addEventListener('click',async()=>{
    if(!visible()||loading||!policy?.administrativeSwitchAvailable)return;
    const enable=toggle.checked===true;
    if(enable&&!policy.canEnable){
      status.textContent=T('تأییدهای علمی، رضایت و امنیت کامل نیستند. فعال‌سازی مجاز نیست.',
        'Scientific, consent and encryption release gates are not satisfied.');
      return;
    }
    const question=enable?T(
      'آیا پس از بررسی اسناد علمی و حقوقی واقعاً می‌خواهید ذخیره خصوصی بزرگسالان را فعال کنید؟',
      'Activate private verified-adult storage only after scientific and legal review?'):
      T('ذخیره خصوصی جدید را متوقف می‌کنید. حذف داده‌ها و رضایت‌ها جداگانه مدیریت می‌شوند؛ ادامه؟',
        'Disable new private storage? Existing records and consent remain subject to separate retention controls.');
    if(!window.confirm(question)){toggle.checked=policy.ownerSwitchEnabled;return;}
    const serial=++requestId;
    controller?.abort();controller=new AbortController();loading=true;
    refresh.disabled=true;submit.disabled=true;toggle.disabled=true;
    status.textContent=T('در حال بررسی مجدد مجوز دومرحله‌ای و ثبت تصمیم…',
      'Rechecking owner MFA and recording a deliberate policy change…');
    try{
      const authRes=await fetch('/api/admin/operations/session',{
        credentials:'same-origin',cache:'no-store',
        headers:{Accept:'application/json'},signal:controller.signal
      });
      if(!authRes.ok)throw Error('MFA');
      const auth=await authRes.json();
      if(serial!==requestId||!visible())return;
      if(auth?.ok!==true||auth.mfaRequired!==false||
        !/^[a-f0-9]{64}$/i.test(auth.csrfToken||''))throw Error('MFA');
      const response=await fetch('/api/admin/operations/education-workbook-policy',{
        method:'POST',credentials:'same-origin',cache:'no-store',
        headers:{Accept:'application/json','Content-Type':'application/json',
          'X-CSRF-Token':auth.csrfToken},
        body:JSON.stringify({enabled:enable,
          confirmation:enable?'ENABLE VERIFIED ADULT BAHAR STORAGE':
            'DISABLE VERIFIED ADULT BAHAR STORAGE'}),
        signal:controller.signal
      });
      if(!response.ok)throw Error('GATE');
      const result=await response.json();
      if(serial!==requestId||!visible())return;
      if(result?.ok!==true||
        result.schema!=='jr.bahar-private-storage-owner-policy.v1'||
        result.ownerSwitchEnabled!==enable||result.automaticConsentCollection!==false)
        throw Error('NOT_CONFIRMED');
      render(result);
      status.textContent=enable
        ?T('تصمیم مدیر ثبت شد؛ این نتیجه جایگزین آزمون امنیت و رعایت الزامات علمی نیست.',
          'Owner switch recorded; independent security and scientific acceptance remain mandatory.')
        :T('کلید اصلی ذخیرهٔ خصوصی خاموش شد. داده‌های پیشین خودکار حذف نشدند.',
          'Private storage owner switch disabled. Existing records were not automatically deleted.');
    }catch(error){
      if(serial!==requestId||error?.name==='AbortError')return;
      toggle.checked=policy.ownerSwitchEnabled;
      status.textContent=T('تغییر تأیید نشد؛ مجوز، وضعیت سرور یا شواهد علمی ناقص است.',
        'Change was not confirmed; access, server or independent scientific requirements may be missing.');
    }finally{
      if(serial===requestId){loading=false;refresh.disabled=false;
        toggle.disabled=!policy?.administrativeSwitchAvailable||
          (!policy.canEnable&&!policy.ownerSwitchEnabled);
        submit.disabled=toggle.disabled;}
    }
  });
  container.addEventListener('toggle',()=>{if(container.open)read();else reset();});
  const observer=new MutationObserver(()=>{if(workspace.hidden)reset();});
  observer.observe(workspace,{attributes:true,attributeFilter:['hidden']});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)reset();});
  window.addEventListener('pagehide',()=>{reset();observer.disconnect();},{once:true});
  reset();
})();