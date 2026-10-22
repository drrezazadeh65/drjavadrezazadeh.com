/* JR private BAHAR: user-initiated, encrypted adult-only account drafts.
 * Nothing in this module activates the private storage switch. The server
 * must independently verify adulthood, live consent, owner opt-in, encryption
 * and optimistic revision. The PUBLIC BAHAR pages remain in-memory only.
 */
(() => {
  'use strict';
  const root=document.querySelector('[data-jr-bahar-adult-account]');
  if(!root)return;
  const en=document.documentElement.lang==='en';
  const T=(fa,eng)=>en?eng:fa;
  const locale=en?'en':'fa';
  const $=key=>root.querySelector('[data-jr-account-bahar-'+key+']');
  const notice=$('notice'),state=$('state'),refresh=$('refresh');
  const consent=$('consent');
  const file=$('file'),preview=$('preview');
  const save=$('save'),download=$('download'),withdraw=$('withdraw'),erase=$('erase');
  if(!notice||!state||!refresh||!consent||!file||
    !preview||!save||!download||!withdraw||!erase)return;
  let identity=null,localDraft=null,readEpoch=0,busy=false,controller=null;
  const active=()=>root.open&&!document.hidden;
  const setState=value=>{state.textContent=value;};
  const short=value=>String(value||'').slice(0,145);
  function restrict(){
    const eligible=identity?.ok===true &&
      identity.schema==='jr.bahar-adult-account-status.v1' &&
      identity.storageEnabled===true &&
      identity.independentlyVerifiedAdult===true &&
      identity.currentNoticeConfigured===true &&
      identity.schemaProvisioned===true;
    const allowed=eligible&&identity.currentConsent===true&&
      identity.canStore===true;
    const csrf=/^[a-f0-9]{64}$/i.test(identity?.csrfToken||'');
    consent.disabled=!eligible||allowed||busy||!csrf;
    file.disabled=!allowed||busy;
    save.disabled=!allowed||!localDraft||busy||!csrf||
      !Number.isSafeInteger(identity?.workbookRevision);
    download.disabled=!allowed||busy||!csrf||
      !Number.isSafeInteger(identity?.workbookRevision)||
      identity.workbookRevision<1;
    withdraw.disabled=!identity?.currentConsent||!csrf||busy;
    // Erasure and withdrawal MUST remain separately accessible even after
    // the owner turns off new writes, provided the session is authenticated.
    erase.disabled=!csrf||!identity?.schemaProvisioned||busy;
  }
  function clear(note){
    readEpoch++;controller?.abort();controller=null;
    busy=false;identity=null;localDraft=null;
    file.value='';
    notice.replaceChildren();preview.replaceChildren();
    setState(note||T('تا زمانی که خودتان درخواست نکنید، هیچ داده حسابی خوانده نمی‌شود.',
      'No account data is requested until you explicitly choose to inspect it.'));
    restrict();
  }
  const get=async(path,opts={})=>{
    const response=await fetch('/api/bahar/account/'+path,{
      method:'GET',credentials:'same-origin',cache:'no-store',
      headers:{'Accept':'application/json'},...opts
    });
    if(!response.ok){
      const error=new Error(response.status===401?'LOGIN':
        response.status===403?'PERMISSION':
        response.status===409?'CONFLICT':'UNAVAILABLE');
      throw error;
    }
    return response.json();
  };
  async function updateStatus({quiet=false}={}){
    if(!active()||busy)return false;
    const stamp=++readEpoch;
    controller?.abort();controller=new AbortController();
    busy=true;refresh.disabled=true;restrict();
    if(!quiet)setState(T('در حال بررسی مجوز حساب و متن رضایت…',
      'Checking independent adulthood authorization and privacy consent…'));
    try {
      const result=await get('status?locale='+locale,{signal:controller.signal});
      if(stamp!==readEpoch||!active())return false;
      if(!result||result.ok!==true||
        result.schema!=='jr.bahar-adult-account-status.v1'||
        typeof result.storageEnabled!=='boolean'||
        typeof result.independentlyVerifiedAdult!=='boolean'||
        typeof result.currentConsent!=='boolean'||
        result.contentReturned!==false||
        (result.workbookRevision!==null &&
          (!Number.isSafeInteger(result.workbookRevision)||
            result.workbookRevision<0)))
        throw Error('INCOMPATIBLE');
      identity=result;
      notice.replaceChildren();
      const n=result.privacyNotice;
      if(n&&typeof n.text==='string'&&typeof n.sha256==='string'&&
        /^[a-f0-9]{64}$/.test(n.sha256)){
        const text=document.createElement('p');
        text.lang=n.locale==='en'?'en':'fa';
        text.dir=n.locale==='en'?'ltr':'rtl';
        text.textContent=n.text;
        notice.append(text);
      }
      if(!result.schemaProvisioned){
        setState(T('جداول تکمیلی پایگاه داده هنوز نصب نشده‌اند؛ ذخیره‌سازی خصوصی خاموش است.',
          'The additive mother-database schema is not provisioned; private storage remains off.'));
      }else if(!result.storageEnabled){
        setState(T('کلید اصلی مدیر یا رمزگذاری و بررسی علمی هنوز آماده نیست. امکان ذخیره خصوصی فعال نشده است.',
          'Owner activation, encryption or independent review is pending. Private account storage is not enabled.'));
      }else if(!result.independentlyVerifiedAdult){
        setState(T('تأیید مستقل بزرگسالی حساب ثبت نشده است. اطلاعات کودک را اینجا وارد نکنید.',
          'Independent adult verification is absent. Do not submit child information.'));
      }else if(!result.currentNoticeConfigured){
        setState(T('متن حقوقیِ نسخه‌دار هنوز تصویب نشده است. رضایت یا داده‌ای دریافت نمی‌شود.',
          'A current approved versioned privacy notice is unavailable; no content is accepted.'));
      }else if(!result.currentConsent){
        setState(T('متن رضایت را مطالعه کنید؛ دریافت رضایت صرفاً با اقدام صریح شما انجام می‌شود.',
          'Read the notice. Consent is recorded only when you explicitly approve it.'));
      }else{
        setState(T('دسترسی رمزگذاری‌شدهٔ این حساب مجاز است؛ فایل تنها پس از انتخاب و تأیید شما ذخیره می‌شود.',
          'Encrypted account storage is authorized. Only an explicitly selected, confirmed file may be saved.'));
      }
      return true;
    }catch(error){
      if(stamp!==readEpoch||error?.name==='AbortError')return false;
      identity=null;notice.replaceChildren();
      setState(error.message==='LOGIN'
        ?T('ابتدا وارد حساب تأییدشده خود شوید.','Sign in to your verified account first.')
        :T('وضعیت امن قابل تأیید نیست؛ هیچ محتوایی ارسال یا بازیابی نشد.',
          'Private storage status could not be verified. No workbook content was transmitted or retrieved.'));
      return false;
    }finally{
      if(stamp===readEpoch){busy=false;controller=null;refresh.disabled=false;restrict();}
    }
  }
  const PENDING_TRANSFER_KEY='jr.bahar.pending-account-transfer.v1';
  function pendingHandoff(){
    let raw=null;
    try { raw=sessionStorage.getItem(PENDING_TRANSFER_KEY); }catch(_) {}
    if(!raw)return null;
    try{
      if(raw.length>32000)throw Error('size');
      const transfer=JSON.parse(raw);
      if(!transfer||transfer.schema!=='jr.bahar.same-tab-continuation.v1'||
        typeof transfer.issuedAt!=='number'||
        typeof transfer.expiresAt!=='number'||
        transfer.expiresAt<Date.now()||
        transfer.issuedAt>Date.now()+30000||
        transfer.expiresAt-transfer.issuedAt>5*60*1000)
        throw Error('expired');
      // The same whitelist as manual JSON file selection applies.
      return parseOwnWorkbook(transfer.workbook);
    }catch(_){
      try{sessionStorage.removeItem(PENDING_TRANSFER_KEY);}catch(_) {}
      return null;
    }
  }
  async function continuePendingHandoff(){
    if(!active()||!identity)return;
    const prepared=pendingHandoff();
    if(!prepared)return;
    localDraft=prepared;
    preview.replaceChildren();
    const p=document.createElement('p');
    p.textContent=T('برنامه‌ای که ساختی آماده است: ','Your study plan is ready: ')+
      short(prepared.compass?.goal||prepared.weeklyPlan?.goal||'—');
    preview.append(p);
    restrict();
    if(!identity.storageEnabled||!identity.independentlyVerifiedAdult||
      !identity.currentNoticeConfigured){
      setState(T('برنامه محفوظ است، اما ذخیره در حساب فعلاً فعال نیست. می‌توانی از صفحه رایگان، نسخه فایل خودت را دریافت کنی.',
        'Your plan is ready in this tab, but account saving is not available yet. You can keep your own private file from the free BAHAR page.'));
      return;
    }
    if(!identity.currentConsent){
      // Only the person's earlier deliberate "save in my account" action
      // may open one purpose-limited confirmation popup here.
      requestConsentInOnePopup();
      return;
    }
    if(identity.workbookRevision===0){
      // The user previously clicked "continue and save" on the public page
      // and already granted this exact purpose; no duplicate prompt.
      await storeSelectedDraft(true);
      return;
    }
    setState(T('در حسابت قبلاً کاربرگ ذخیره شده است. برای حفظ نسخه قبلی، جایگزینی فقط با انتخاب «ذخیره امن برنامه من» انجام می‌شود.',
      'A workbook already exists in this account. To avoid overwriting it, choose Save explicitly if you want to replace that version.'));
  }
  function validDay(value){
    if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
    const parts=value.split('-').map(Number);
    const asDate=new Date(Date.UTC(parts[0],parts[1]-1,parts[2]));
    return asDate.getUTCFullYear()===parts[0]&&
      asDate.getUTCMonth()===parts[1]-1&&
      asDate.getUTCDate()===parts[2];
  }
  const goodText=value=>typeof value==='string'&&
    value.trim().length>0&&new TextEncoder().encode(value).length<=1200;
  function parseOwnWorkbook(raw){
    if(!raw||typeof raw!=='object'||Array.isArray(raw)||
      raw.schema!=='jr.bahar.private-workbook.v1'||raw.version!=='1.0.0'||
      !Array.isArray(raw.reflections)||raw.reflections.length>8)return null;
    const obj={
      schema:raw.schema,version:raw.version,
      status:'SELF_REPORTED_RESEARCH_STAGE',
      compass:null,weeklyPlan:null,reflections:[]
    };
    if(raw.compass!==undefined&&raw.compass!==null){
      if(typeof raw.compass!=='object'||Array.isArray(raw.compass)||
        !goodText(raw.compass.goal)||!goodText(raw.compass.successEvidence)||
        typeof (raw.compass.context??'')!=='string'||
        new TextEncoder().encode(raw.compass.context??'').length>1200)return null;
      obj.compass={goal:raw.compass.goal,
        successEvidence:raw.compass.successEvidence,
        context:raw.compass.context??''};
    }
    if(raw.weeklyPlan!==undefined&&raw.weeklyPlan!==null){
      const p=raw.weeklyPlan;
      if(typeof p!=='object'||Array.isArray(p)||
        !validDay(p.weekStart)||!goodText(p.goal)||
        !goodText(p.action)||!goodText(p.evidence))return null;
      obj.weeklyPlan={weekStart:p.weekStart,goal:p.goal,action:p.action,
        evidence:p.evidence};
    }
    for(const x of raw.reflections){
      if(!x||typeof x!=='object'||Array.isArray(x)||
        !validDay(x.date)||!goodText(x.note)||
        !['CONTINUE','CHANGE','PAUSE','STOP','INVESTIGATE'].includes(x.decision))
        return null;
      obj.reflections.push({date:x.date,note:x.note,decision:x.decision});
    }
    return obj.compass||obj.weeklyPlan||obj.reflections.length?obj:null;
  }
  async function userMutation(endpoint,payload,verb='POST'){
    const token=identity?.csrfToken;
    if(!/^[a-f0-9]{64}$/i.test(token||''))throw Error('PERMISSION');
    return get(endpoint,{method:verb,
      headers:{Accept:'application/json','Content-Type':'application/json',
        'X-CSRF-Token':token},
      body:JSON.stringify(payload)});
  }
  async function command(label,task){
    if(!active()||busy||!identity)return;
    const stamp=++readEpoch;
    controller?.abort();controller=new AbortController();
    busy=true;refresh.disabled=true;restrict();
    setState(label);
    try{
      const confirmation=await task();
      if(stamp!==readEpoch||!active())return;
      return confirmation;
    }catch(error){
      if(stamp!==readEpoch||error?.name==='AbortError')return;
      setState(error.message==='CONFLICT'
        ?T('نسخهٔ موجود تغییر کرده است؛ قبل از ذخیره دوباره وضعیت را بخوانید.',
          'The stored workbook revision changed. Refresh before saving.')
        :T('عملیات تأیید نشد؛ هیچ موفقیت ثبت‌شده‌ای فرض نمی‌شود.',
          'The requested operation was not confirmed. No success is assumed.'));
    }finally{
      if(stamp===readEpoch){busy=false;refresh.disabled=false;restrict();}
    }
  }
  refresh.addEventListener('click',()=>updateStatus());
  // Single just-in-time consent dialog. This is only for PRIVATE WORKBOOK
  // STORAGE, never for advertising, admissions or unspecified reuse.
  // The complete approved purpose notice remains available on this page.
  function requestConsentInOnePopup(){
    if(!identity?.privacyNotice||!identity.storageEnabled||
       identity.currentConsent||busy)return;
    const dialog=document.createElement('dialog');
    dialog.className='jr-bahar-consent-dialog';
    dialog.setAttribute('aria-labelledby','jr-bahar-consent-dialog-title');
    dialog.setAttribute('aria-describedby','jr-bahar-consent-dialog-purpose');
    const title=document.createElement('h3');
    title.id='jr-bahar-consent-dialog-title';
    title.textContent=T('برنامه‌ات را برای دفعه بعد نگه دار ✨',
      'Keep your study plan for next time ✨');
    const content=document.createElement('p');
    content.id='jr-bahar-consent-dialog-purpose';
    content.textContent=T(
      'با موافقت تو، فقط کاربرگ و یادداشت‌هایی را که خودت برای ذخیره انتخاب می‌کنی، به‌صورت رمزگذاری‌شده در حسابت نگه می‌داریم تا بعداً بتوانی ادامه بدهی. از این اطلاعات برای تبلیغات، فروش داده، نمره‌گذاری استعداد یا پیش‌بینی قبولی استفاده نمی‌کنیم. هر زمان بخواهی می‌توانی رضایتت را مدیریت کنی.',
      'With your permission, we will encrypt and keep only the study workbook you choose to save, so you can continue later. We will not use it for advertising, selling data, aptitude scores or admission predictions. You can manage your permission later.'
    );
    const details=document.createElement('details');
    const detailsLabel=document.createElement('summary');
    detailsLabel.textContent=T('مشاهده متن کامل حریم خصوصی','Read the full privacy notice');
    const terms=document.createElement('p');
    terms.textContent=identity.privacyNotice.text;
    terms.lang=identity.privacyNotice.locale==='en'?'en':'fa';
    terms.dir=terms.lang==='fa'?'rtl':'ltr';
    details.append(detailsLabel,terms);
    const controls=document.createElement('div');
    controls.className='jr-bahar-consent-dialog__actions';
    const agree=document.createElement('button');
    agree.type='button';
    agree.textContent=T('موافقم، ادامه بده','I agree — continue');
    const skip=document.createElement('button');
    skip.type='button';skip.className='secondary';
    skip.textContent=T('فعلاً بدون ذخیره ادامه می‌دهم','Continue without saving');
    controls.append(agree,skip);
    dialog.append(title,content,details,controls);
    const dismiss=()=>dialog.close();
    skip.addEventListener('click',dismiss);
    dialog.addEventListener('close',()=>dialog.remove(),{once:true});
    agree.addEventListener('click',async()=>{
      agree.disabled=true;skip.disabled=true;
      dialog.close();
      // Consent is recorded only after this explicit affirmative click.
      const result=await command(T('در حال ثبت رضایت…','Recording your choice…'),
        async()=>{
          const response=await userMutation('consent',{
            confirmation:'I CONSENT TO PRIVATE BAHAR STORAGE',
            noticeSha256:identity.privacyNotice.sha256
          });
          if(response?.ok!==true||response.consentRecorded!==true)
            throw Error('CONSENT_NOT_CONFIRMED');
          return true;
        });
      // No second popup or separate status-refresh click.
      if(result===true){
        const refreshed=await updateStatus({quiet:true});
        if(refreshed)await continuePendingHandoff();
      }
    });
    document.body.append(dialog);
    if(typeof dialog.showModal==='function')dialog.showModal();
    else{dialog.setAttribute('open','');dialog.setAttribute('role','dialog');}
    agree.focus();
  }
  consent.addEventListener('click',requestConsentInOnePopup);
  file.addEventListener('change',async()=>{
    const selected=file.files?.[0];file.value='';
    const stamp=++readEpoch;localDraft=null;
    preview.replaceChildren();restrict();
    if(!selected||!identity?.canStore)return;
    if(selected.size<1||selected.size>30000){
      setState(T('حجم فایل کاربرگ مجاز نیست.','Workbook file size is not supported.'));
      return;
    }
    try{
      const raw=JSON.parse(await selected.text());
      if(stamp!==readEpoch||!active()||!identity?.canStore)return;
      localDraft=parseOwnWorkbook(raw);
      if(!localDraft)throw Error('INCOMPATIBLE');
      const p=document.createElement('p');
      p.textContent=T('کاربرگ انتخاب شد. هدف: ','Selected workbook. Goal: ')+
        short(localDraft.compass?.goal||localDraft.weeklyPlan?.goal||'—')+
        T(' · شمار بازاندیشی‌ها: ',' · Reflection notes: ')+
        String(localDraft.reflections.length);
      preview.append(p);
      setState(T('فایل فقط در حافظه این تب آماده است؛ هیچ آپلودی انجام نشده است.',
        'The file is in this browser tab only. Nothing has been uploaded.'));
      restrict();
    }catch{
      if(stamp===readEpoch){
        localDraft=null;restrict();
        setState(T('فایل با قالب خصوصی BAHAR سازگار نیست؛ چیزی ارسال نشد.',
          'Selected file does not match the private BAHAR workbook format. Nothing was transmitted.'));
      }
    }
  });
  async function storeSelectedDraft(autoFromUserHandoff=false){
    if(!identity?.canStore||!localDraft||
      !Number.isSafeInteger(identity.workbookRevision))return false;
    if(autoFromUserHandoff && identity.workbookRevision!==0)return false;
    const expected=identity.workbookRevision;
    const draft=localDraft;
    await command(T('در حال ذخیره نسخهٔ رمزگذاری‌شده…','Saving encrypted workbook…'),
      async()=>{
        const result=await userMutation('workbook',{
          expectedRevision:expected,workbook:draft
        },'PUT');
        if(!result||result.ok!==true||
          result.schema!=='jr.bahar-workbook-save.v1'||
          result.encryptedAtRest!==true||result.revision!==expected+1)
          throw Error('UNCONFIRMED');
        identity.workbookRevision=result.revision;
        localDraft=null;preview.replaceChildren();
        restrict();
        try {sessionStorage.removeItem('jr.bahar.pending-account-transfer.v1');}catch(_){}
        setState(T('برنامه‌ات با رمزگذاری در حسابت ذخیره شد و دفعه بعد آماده است.',
          'Your workbook was encrypted and saved in your account for next time.'));
        return true;
      });
  }
  save.addEventListener('click',()=>storeSelectedDraft(false));
  download.addEventListener('click',async()=>{
    if(!identity?.canStore)return;
    await command(T('در حال دریافت فایل خصوصی…','Retrieving your private workbook…'),
      async()=>{
        const result=await get('workbook');
        if(result?.ok!==true||
          result.schema!=='jr.bahar-encrypted-account-workbook.v1'||
          result.private!==true||result.cacheable!==false||
          !Number.isSafeInteger(result.revision))
          throw Error('INVALID_RESULT');
        if(result.workbook===null){
          setState(T('هنوز کاربرگ ذخیره‌شده‌ای در این حساب وجود ندارد.',
            'No saved workbook is available in this account.'));
          return;
        }
        const safe=parseOwnWorkbook(result.workbook);
        if(!safe)throw Error('INVALID_WORKBOOK');
        const blob=new Blob([JSON.stringify(safe,null,2)],
          {type:'application/json;charset=utf-8'});
        const uri=URL.createObjectURL(blob);
        const link=document.createElement('a');link.href=uri;
        link.download='bahar-adult-account-personal-export.json';
        link.hidden=true;document.body.append(link);link.click();link.remove();
        window.setTimeout(()=>URL.revokeObjectURL(uri),10000);
        setState(T('فایل شخصی با اقدام خودتان آماده دریافت شد؛ از نگهداری امن آن اطمینان حاصل کنید.',
          'Your private workbook was exported on request. Keep the downloaded file secure.'));
      });
  });
  withdraw.addEventListener('click',async()=>{
    if(!identity?.currentConsent||!window.confirm(T(
      'رضایت ذخیره‌سازی خصوصی را پس می‌گیرید. دادهٔ قبلی خودکار حذف نمی‌شود؛ تأیید می‌کنید؟',
      'Withdraw private-workbook consent? Existing stored data will not be automatically erased.'
    )))return;
    await command(T('در حال پس‌گرفتن رضایت…','Withdrawing privacy consent…'),
      async()=>{
        const result=await userMutation('withdraw-consent',{
          confirmation:'WITHDRAW BAHAR PRIVATE CONSENT'
        });
        if(result?.ok!==true||result.consentWithdrawn!==true||
          result.furtherReadsAndWritesBlocked!==true)
          throw Error('NOT_CONFIRMED');
        localDraft=null;preview.replaceChildren();
        identity.currentConsent=false;identity.canStore=false;
        restrict();
        setState(T('لغو رضایت ثبت شد. بازیابی و ذخیره جدید قفل هستند؛ حذف رکورد اقدامی جداگانه است.',
          'Consent withdrawal recorded; reads and writes are blocked. Deleting an existing record is a separate action.'));
      });
  });
  erase.addEventListener('click',async()=>{
    if(!identity?.schemaProvisioned||!window.confirm(T(
      'درخواست حذف نسخه جاری BAHAR از دیتابیس را تأیید می‌کنید؟ حذف نسخه‌های پشتیبان و سوابق قانونی جداگانه بررسی می‌شود.',
      'Request deletion of your current BAHAR database record? Legal retention, backups and audit history are handled separately.'
    )))return;
    await command(T('در حال بررسی محدودیت قانونی و حذف رکورد…',
      'Checking legal holds and deleting the current database record…'),async()=>{
        const result=await userMutation('workbook',{
          confirmation:'DELETE MY BAHAR WORKBOOK'
        },'DELETE');
        if(result?.ok!==true||result.databaseRowDeleted!==true||
          result.backupErasureNotCertified!==true)throw Error('UNCONFIRMED');
        localDraft=null;identity.workbookRevision=0;
        preview.replaceChildren();restrict();
        setState(T('سرور حذف رکورد جاری را تأیید کرد؛ سوابق ممیزی و وضعیت نسخه‌های پشتیبان جداگانه باقی می‌مانند.',
          'The server confirmed deletion of the current database row. Audit and backup obligations remain separate.'));
      });
  });
  root.addEventListener('toggle',async()=>{
    if(!root.open){clear();return;}
    const ready=await updateStatus();
    if(ready)await continuePendingHandoff();
  });
  // A same-tab transfer was initiated by the user on the PUBLIC learning
  // page. Only an ephemeral fragment selects the already published route.
  if(location.hash==='#jr-bahar-account'&&pendingHandoff()){
    root.id='jr-bahar-account';
    root.open=true;
    root.scrollIntoView({block:'start',behavior:'instant'});
  }
  document.addEventListener('visibilitychange',()=>{if(document.hidden)clear();});
  window.addEventListener('pagehide',()=>clear(),{once:true});
  clear();
})();