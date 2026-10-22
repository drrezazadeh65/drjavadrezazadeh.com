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
  const consent=$('consent'),requestAdult=$('request-adult'),cancelAdult=$('cancel-adult');
  const file=$('file'),preview=$('preview'),localExport=$('local-export');
  const save=$('save'),download=$('download'),withdraw=$('withdraw'),erase=$('erase');
  if(!notice||!state||!refresh||!consent||!requestAdult||!cancelAdult||!file||
    !preview||!localExport||!save||!download||!withdraw||!erase)return;
  let identity=null,localDraft=null,readEpoch=0,busy=false,controller=null;
  const active=()=>root.open&&!document.hidden;
  const hasOpenErasure=()=>['RECEIVED','PENDING','IN_REVIEW','BLOCKED']
    .includes(identity?.latestErasureRequest?.state);
  const setState=value=>{state.textContent=value;};
  const erasureNote=document.createElement('p');
  erasureNote.className='jr-adult-bahar-account__privacy-request';
  erasureNote.setAttribute('aria-live','polite');
  erasureNote.hidden=true;
  state.insertAdjacentElement('afterend',erasureNote);
  function showErasureProgress(request,available){
    erasureNote.hidden=true;erasureNote.textContent='';
    if(available!==true){
      erasureNote.textContent=T(
        'وضعیت پیگیری درخواست‌های حریم خصوصی فعلاً قابل دریافت نیست.',
        'Your privacy-request history is temporarily unavailable.'
      );
      erasureNote.hidden=false;return;
    }
    if(!request)return;
    if(!/^[0-9a-f-]{36}$/i.test(request.id||'')||
      !['RECEIVED','PENDING','IN_REVIEW','BLOCKED','COMPLETED'].includes(request.state))
      return;
    const stateLabel=request.state==='COMPLETED'
      ?T('درخواست قبلی تکمیل شده است؛ پشتیبان و سوابق قانونی جداگانه مدیریت می‌شوند.',
          'Your latest request is complete. Backup and legal retention remain separate.')
      :request.state==='BLOCKED'
        ?T('درخواست شما در صف رسیدگی است و تا رفع محدودیت قانونی بررسی می‌شود.',
            'Your request is awaiting owner review while a legal hold remains.')
        :T('درخواست شما ثبت شده و در دست پیگیری است.',
            'Your privacy request is recorded and being reviewed.');
    erasureNote.textContent=stateLabel+
      T(' · کد پیگیری: ',' · Reference: ')+request.id;
    erasureNote.hidden=false;
  }

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
    // Never invite a new storage grant while the person's deletion request
    // is still unresolved, even if the server correctly rejects the POST.
    consent.disabled=!eligible||allowed||busy||!csrf||hasOpenErasure();
    const canRequest=identity?.schemaProvisioned===true &&
      identity?.canRequestIndependentAdultReview===true &&
      identity?.independentlyVerifiedAdult===false && csrf;
    requestAdult.hidden=!canRequest;
    requestAdult.disabled=!canRequest||busy;
    const canCancel=identity?.schemaProvisioned===true&&
      identity?.canCancelPendingAdultReview===true&&csrf;
    cancelAdult.hidden=!canCancel;
    cancelAdult.disabled=!canCancel||busy;
    file.disabled=!allowed||busy;
    // Local backup never requires a login, verified age, payment or
    // permission to transmit notes. It does require a draft in this tab.
    localExport.disabled=!localDraft||busy;
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
    file.value='';localExport.disabled=true;requestAdult.hidden=true;
    requestAdult.disabled=true;
    cancelAdult.hidden=true;cancelAdult.disabled=true;
    notice.replaceChildren();preview.replaceChildren();
    showErasureProgress(null,true);
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
        typeof result.eligibilityRequestState!=='string'||
        typeof result.canRequestIndependentAdultReview!=='boolean'||
        typeof result.canCancelPendingAdultReview!=='boolean'||
        typeof result.privacyRequestLedgerAvailable!=='boolean'||
        (result.latestErasureRequest!==null &&
           (typeof result.latestErasureRequest!=='object'||
             typeof result.latestErasureRequest.id!=='string'))||
        result.contentReturned!==false||
        (result.workbookRevision!==null &&
          (!Number.isSafeInteger(result.workbookRevision)||
            result.workbookRevision<0)))
        throw Error('INCOMPATIBLE');
      identity=result;
      showErasureProgress(result.latestErasureRequest,
        result.privacyRequestLedgerAvailable);
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
      }else if(result.eligibilityRequestState==='PENDING'){
        setState(T('درخواست بررسی حساب ثبت شده است. در این فاصله می‌توانی آزادانه یادگیری را ادامه بدهی و فایل برنامه‌ات را نگه داری.',
          'Your account review is pending. You can continue learning freely and keep your private study plan.'));
      }else if(result.eligibilityRequestState==='DECLINED'||
        result.eligibilityRequestState==='REVOKED'){
        setState(T('درخواست قبلی تأیید نشده یا تأیید لغو شده است. نسخه شخصی برنامه همچنان در اختیار توست.',
          'Your eligibility is not currently approved. Your personal offline plan remains available.'));
      }else if(!result.independentlyVerifiedAdult){
        setState(T('اگر بزرگسال هستی، با یک کلیک درخواست بررسی حساب بده؛ تا آن زمان می‌توانی بدون ثبت‌نام آموزش ببینی.',
          'If you are an adult, request account review with one click. Free learning remains available without account storage.'));
      }else if(!result.currentNoticeConfigured){
        setState(T('متن حقوقیِ نسخه‌دار هنوز تصویب نشده است. رضایت یا داده‌ای دریافت نمی‌شود.',
          'A current approved versioned privacy notice is unavailable; no content is accepted.'));
      }else if(hasOpenErasure()){
        setState(T('درخواست حذف قبلی هنوز باز است. برای احترام به انتخاب شما، ذخیره جدید و درخواست رضایت تا پایان رسیدگی غیرفعال‌اند؛ نسخه محلی همچنان در اختیار شماست.',
          'Your earlier erasure request remains open. New saving and consent are paused while it is reviewed; your local copy remains available.'));
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
        ?T('برای ادامه و ذخیره برنامه، وارد حساب کاربری شوید.',
          'Sign in to your account to continue and save your plan.')
        :T('ذخیره امن در حساب هنوز آماده نیست؛ می‌توانید نسخه شخصی برنامه را روی دستگاه نگه دارید.',
          'Account saving is not available yet; you can keep a private copy on your device.'));
      if(error.message==='LOGIN'){
        const link=document.createElement('a');
        link.href=en?'/en/login/':'/fa/login/';
        link.textContent=T('ورود یا ثبت‌نام','Sign in or register');
        link.style.cssText='display:inline-flex;min-height:44px;align-items:center;margin-inline-start:12px;color:#f4d99e;font-weight:750';
        state.append(document.createTextNode(' '),link);
      }
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
      const waiting=identity.eligibilityRequestState==='PENDING';
      setState(waiting
        ?T('درخواست بررسی حسابت ثبت شده است. برای حفظ برنامه در این فاصله، نسخه شخصی را روی دستگاه ذخیره کن.',
          'Your account review is pending. Keep a private device copy of the plan while you wait.')
        :T('برنامه‌ات آماده است. اگر ۱۸ سال یا بیشتر داری، می‌توانی بررسی حساب را درخواست کنی یا همین‌جا یک نسخه خصوصی روی دستگاه نگه داری.',
          'Your plan is ready. Adults can request account eligibility or keep a private copy on this device.'));
      return;
    }
    if(hasOpenErasure()){
      setState(T('درخواست حذف کاربرگ شما هنوز در حال پیگیری است. می‌توانید یادگیری را ادامه دهید و نسخه شخصی را در دستگاه خود نگه دارید؛ ذخیره سروری متوقف می‌ماند.',
        'Your workbook erasure request is still being reviewed. Continue learning and keep a private copy on your device; server saving remains paused.'));
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
  requestAdult.addEventListener('click',async()=>{
    if(!identity?.canRequestIndependentAdultReview||
       !identity.schemaProvisioned||busy||!active())return;
    // One affirmative tap makes a PENDING request only. Never upload an ID
    // document, workbook, birth date, parent record or marketing profile.
    const result=await command(T('در حال ثبت درخواست بررسی حساب…',
      'Sending your optional account review request…'),async()=>{
      const response=await userMutation('eligibility-request',{
        adultAffirmation:true,
        confirmation:'I REQUEST INDEPENDENT ADULT REVIEW'
      });
      if(response?.ok!==true||
        response.schema!=='jr.bahar-adult-eligibility-request.v1'||
        response.documentsUploaded!==false||
        response.workbookUploaded!==false||
        response.automaticEligibilityApproval!==false)
        throw Error('UNCONFIRMED_REQUEST');
      return response;
    });
    if(result?.eligibilityRequestState){
      identity.eligibilityRequestState=result.eligibilityRequestState;
      identity.canRequestIndependentAdultReview=false;
      identity.canCancelPendingAdultReview=
        result.eligibilityRequestState==='PENDING';
      restrict();
      setState(T(
        'درخواستت ثبت شد. نیازی به بارگذاری کارت شناسایی در سایت نیست؛ پس از بررسی مستقل، ذخیرهٔ اختیاری برای حسابت قابل پیگیری خواهد بود.',
        'Your request is recorded. No identity document needs uploading here. Optional encrypted saving can be considered after independent review.'
      ));
    }
  });
  cancelAdult.addEventListener('click',async()=>{
    if(!identity?.canCancelPendingAdultReview||busy||!active())return;
    if(!window.confirm(T(
      'درخواست در انتظار بررسی حساب را لغو می‌کنی؟ برنامه آموزشی روی دستگاهت باقی می‌ماند.',
      'Cancel your pending eligibility request? Your local study plan will remain available.'
    )))return;
    const result=await command(T('در حال لغو درخواست…',
      'Canceling your pending application…'),async()=>{
      const response=await userMutation('eligibility-cancel',{
        confirmation:'CANCEL MY PENDING REVIEW'
      });
      if(response?.ok!==true||
         response.schema!=='jr.bahar-adult-review-cancellation.v1'||
         response.verifiedAdultStateUntouched!==true||
         response.workbookDeleted!==false)
        throw Error('CANCEL_NOT_CONFIRMED');
      return response;
    });
    if(result?.pendingRequestCancelled===true){
      identity.eligibilityRequestState='NOT_REQUESTED';
      identity.canRequestIndependentAdultReview=true;
      identity.canCancelPendingAdultReview=false;
      restrict();
      setState(T('درخواستت لغو شد. هر زمان خواستی می‌توانی دوباره درخواست بررسی بدهی؛ یادگیری رایگان ادامه دارد.',
        'Your pending request was canceled. You can request review again later and continue learning free.'));
    }else if(result?.ok===true){
      setState(T('درخواستی برای لغو پیدا نشد؛ دوباره وضعیت حساب را دریافت کن.',
        'No pending request was canceled. Refresh your account status.'));
    }
  });
  refresh.addEventListener('click',()=>updateStatus());
  // Single just-in-time consent dialog. This is only for PRIVATE WORKBOOK
  // STORAGE, never for advertising, admissions or unspecified reuse.
  // The complete approved purpose notice remains available on this page.
  function requestConsentInOnePopup(){
    if(!identity?.privacyNotice||!identity.storageEnabled||
       !identity.independentlyVerifiedAdult||!identity.schemaProvisioned||
       !identity.currentNoticeConfigured||hasOpenErasure()||
       identity.currentConsent||busy||
       document.getElementById('jr-bahar-single-purpose-popup'))return;
    const dialog=document.createElement('dialog');
    dialog.id='jr-bahar-single-purpose-popup';
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
    let consentAccepted=false;
    const dismiss=()=>{
      // Respect the alternative; do not reopen this unsolicited popup if
      // the learner later revisits the section in the same browser tab.
      try{sessionStorage.removeItem(PENDING_TRANSFER_KEY);}catch(_){}
      dialog.close();
      setState(T('می‌توانی بدون ارسال اطلاعات، یادگیری را ادامه بدهی و نسخه خصوصی برنامه را دریافت کنی.',
        'Continue without uploading your notes. You can keep a private local copy.'));
    };
    skip.addEventListener('click',dismiss);
    dialog.addEventListener('close',()=>{
      if(!consentAccepted){
        try{sessionStorage.removeItem(PENDING_TRANSFER_KEY);}catch(_){}
      }
      dialog.remove();
    },{once:true});
    agree.addEventListener('click',async()=>{
      consentAccepted=true;
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
  localExport.addEventListener('click',()=>{
    if(!localDraft)return;
    const blob=new Blob([JSON.stringify(localDraft,null,2)],{
      type:'application/json;charset=utf-8'
    });
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.hidden=true;a.href=url;a.download='bahar-personal-private-workbook.json';
    document.body.append(a);a.click();a.remove();
    window.setTimeout(()=>URL.revokeObjectURL(url),10000);
    setState(T('نسخه خصوصی کاربرگ در اختیار شما قرار گرفت؛ هیچ آپلودی انجام نشد.',
      'Your private workbook file was prepared locally. Nothing was uploaded.'));
  });
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
    await command(T('در حال ثبت درخواست حریم خصوصی و بررسی محدودیت قانونی…',
      'Recording your privacy request and checking lawful retention…'),async()=>{
        const result=await userMutation('erasure-request',{
          confirmation:'REQUEST MY BAHAR WORKBOOK ERASURE'
        });
        if(result?.ok!==true||
           result.schema!=='jr.bahar-private-erasure-request.v1'||
           !/^[a-f0-9-]{36}$/i.test(result.requestId||'')||
           !['COMPLETED','BLOCKED','RECEIVED','IN_REVIEW','PENDING']
              .includes(result.requestStatus)||
           result.backupErasureCertified!==false||
           result.noUnrelatedAccountDataDeleted!==true)
           throw Error('ERASURE_REQUEST_UNCONFIRMED');
        // Never automatically recreate a workbook after a deletion request:
        // clear the public-page same-tab handoff on BOTH hold and completion.
        try{sessionStorage.removeItem(PENDING_TRANSFER_KEY);}catch(_){}
        // A deletion request revokes the previous private storage grant
        // atomically on the server. Never leave the page showing permission
        // to re-save under that prior consent.
        identity.currentConsent=false;
        identity.canStore=false;
        identity.latestErasureRequest={
          id:result.requestId,state:result.requestStatus
        };
        identity.privacyRequestLedgerAvailable=true;
        showErasureProgress(identity.latestErasureRequest,true);
        restrict();
        if(result.requestStatus==='COMPLETED'){
          localDraft=null;identity.workbookRevision=0;
          preview.replaceChildren();restrict();
          setState(T(
            'درخواست حذف ثبت و بررسی شد؛ نسخه جاری دیتابیس حذف شده یا از قبل خالی بوده است. نگهداری نسخه‌های پشتیبان و سوابق قانونی جداگانه بررسی می‌شود.',
            'Your request was recorded. The current database copy was deleted or was already absent; lawful retention and backups are handled separately.'
          ));
        }else{
          setState(T(
            'درخواستت ثبت شد و برای بررسی به مدیر رسید. تا رفع محدودیت قانونی، اطلاعات موجود به‌صورت حفاظت‌شده نگهداری می‌شود. کد پیگیری: ',
            'Your privacy request is recorded for owner review. Existing data remains protected while a legal restriction is resolved. Reference: '
          )+result.requestId);
        }
        return true;
      });
  });
  root.addEventListener('toggle',async()=>{
    if(!root.open){clear();return;}
    // Display a recoverable local draft first, even when account services
    // are unavailable. Only the affirmative popup can permit server storage.
    const pending=pendingHandoff();
    if(pending){
      localDraft=pending;
      preview.replaceChildren();
      const p=document.createElement('p');
      p.textContent=T('برنامهٔ انتخاب‌شده: ','Selected plan: ')+
        short(pending.compass?.goal||pending.weeklyPlan?.goal||'—');
      preview.append(p);restrict();
    }
    const ready=await updateStatus();
    if(ready)await continuePendingHandoff();
    else if(localDraft &&
      !state.querySelector('a[href="/fa/login/"],a[href="/en/login/"]')){
      setState(T('ذخیره در حساب اکنون آماده نیست؛ نسخه خصوصی برنامه‌ات را می‌توانی همین‌جا روی دستگاه نگه داری.',
        'Account saving is currently unavailable. You can still keep a private copy on your device.'));
    }
  });
  // A same-tab transfer was initiated by the user on the PUBLIC learning
  // page. Only an ephemeral fragment selects the already published route.
  if(location.hash==='#jr-bahar-account'&&pendingHandoff()){
    root.id='jr-bahar-account';
    root.open=true;
    root.scrollIntoView({block:'start',behavior:'auto'});
  }
  document.addEventListener('visibilitychange',()=>{if(document.hidden)clear();});
  window.addEventListener('pagehide',()=>clear(),{once:true});
  clear();
})();