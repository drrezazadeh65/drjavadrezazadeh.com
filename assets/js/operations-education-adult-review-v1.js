/* JR BAHAR adult verification queue — owner MFA, no documents uploaded.
 * A self-declared age never qualifies as independently verified adulthood.
 * Authorized owner reviews evidence out of band; a local browser SHA-256
 * fingerprint is retained, not the document bytes or photo.
 */
(() => {
  'use strict';
  const panel=document.querySelector('[data-jr-bahar-adult-owner-review]');
  const workspace=document.getElementById('ops-workspace');
  const container=document.getElementById('ops-education-readiness');
  if(!panel||!workspace||!container)return;
  const fa=document.documentElement.lang==='fa';
  const T=(a,b)=>fa?a:b;
  const $=name=>panel.querySelector('[data-jr-adult-review-'+name+']');
  const btn=$('refresh'),form=$('form'),status=$('status');
  const summary=$('summary'),cards=$('accounts'),account=$('account');
  const decision=$('decision'),method=$('method'),file=$('file');
  const sha=$('sha'),confirm=$('confirm'),save=$('save');
  if(!btn||!form||!status||!summary||!cards||!account||!decision||
    !method||!file||!sha||!confirm||!save)return;
  const numeral=new Intl.NumberFormat(fa?'fa-IR':'en-US');
  let controller=null,serial=0,busy=false,rows=[],queued=false;
  const visible=()=>!workspace.hidden&&container.open&&!document.hidden;
  const make=(tag,value,cls)=>{
    const el=document.createElement(tag);
    if(cls)el.className=cls;
    if(value!==undefined)el.textContent=String(value);
    return el;
  };
  const message=text=>{status.textContent=text;};
  const approvedRecord=record=>
    record?.reviewState==='VERIFIED_ADULT' &&
    record.accountActive===true &&
    record.verifiedEmail===true;
  function updateForm(){
    const row=rows.find(r=>r.accountId===account.value);
    let allowed=false;
    if(row){
      allowed=(
        (decision.value==='VERIFIED_ADULT'||decision.value==='DECLINED')&&
          row.reviewState==='PENDING'
      )||(decision.value==='REVOKED'&&approvedRecord(row));
    }
    save.disabled=busy||!visible()||!allowed||sha.value.length!==64||
      !confirm.checked||!['IN_PERSON_IDENTITY_REVIEW',
        'CONTRACTED_AGE_ASSURANCE',
        'AUTHORIZED_INDEPENDENT_RECORD_REVIEW'].includes(method.value);
  }
  function reset(){
    ++serial;controller?.abort();controller=null;rows=[];busy=false;
    account.replaceChildren();cards.replaceChildren();sha.value='';
    file.value='';confirm.checked=false;btn.disabled=false;save.disabled=true;
    summary.textContent='';
    message(T('اطلاعات محرمانه فقط پس از ورود مدیر خوانده می‌شود.',
      'Private queue loads only after administrator authentication.'));
  }
  function render(data){
    rows=data.records;cards.replaceChildren();account.replaceChildren();
    const pending=data.counts?.PENDING;
    summary.textContent=T('درخواست‌های در انتظار بررسی: ','Requests pending independent review: ')+
      (Number.isSafeInteger(pending)?numeral.format(pending):T('نامشخص','Unknown'))+
      T(' · فهرست حداکثر ۱۰۰ حساب آخر را نمایش می‌دهد.',
        ' · Only the latest 100 accounts can appear.');
    if(rows.length===0){
      cards.append(make('p',T('درخواست ثبت‌شده‌ای در فهرست فعلی وجود ندارد.',
        'No records are listed in this current owner snapshot.')));
    }
    for(const row of rows){
      if(!row||typeof row.accountId!=='string'||
         !/^[0-9a-f-]{36}$/i.test(row.accountId)||
         typeof row.reviewState!=='string'||
         typeof row.email!=='string'||row.email.length>254)continue;
      const option=document.createElement('option');
      option.value=row.accountId;
      option.textContent=row.email+' · '+row.reviewState;
      account.append(option);
      const card=make('article',undefined,'jr-edu-offers__card');
      card.append(make('strong',row.email,'jr-edu-offers__title'));
      card.append(make('p',
        T('وضعیت بررسی انسانی: ','Human review: ')+row.reviewState,
        'jr-edu-offers__warning'));
      card.append(make('p',T('ایمیل تأییدشده: ','Verified email: ')+
        (row.verifiedEmail?T('بله','Yes'):T('خیر','No')),
        'jr-edu-offers__warning'));
      if(row.requestedAt)card.append(make('small',
        T('درخواست: ','Requested: ')+row.requestedAt));
      cards.append(card);
    }
    if(data.limitedResults===true)cards.append(make('p',
      T('درخواست‌های دیگری نیز وجود دارند؛ فهرست عمداً محدود شده است.',
        'Additional accounts exist; the private list is intentionally bounded.')));
    sha.value='';file.value='';confirm.checked=false;updateForm();
  }
  async function load(){
    if(!visible()||busy)return false;
    const id=++serial;
    controller?.abort();controller=new AbortController();
    busy=true;btn.disabled=true;save.disabled=true;
    message(T('در حال دریافت صف درخواست‌های واقعی…',
      'Loading the real private eligibility request queue…'));
    try {
      const response=await fetch('/api/admin/operations/education-adult-review',{
        method:'GET',credentials:'same-origin',cache:'no-store',
        headers:{Accept:'application/json'},signal:controller.signal
      });
      if(!response.ok)throw Error('NOT_AUTHORIZED');
      const data=await response.json();
      if(id!==serial||!visible())return false;
      if(data?.ok!==true||data.schema!=='jr.bahar-adult-review-queue.v1'||
        data.noDocumentsCollected!==true||
        !Array.isArray(data.records)||data.records.length>100||
        typeof data.counts!=='object'||data.counts===null||
        data.automaticApproval!==false&&data.state!=='SCHEMA_NOT_PROVISIONED')
        throw Error('INCOMPATIBLE_QUEUE');
      if(data.state==='SCHEMA_NOT_PROVISIONED'){
        rows=[];cards.replaceChildren();account.replaceChildren();
        message(T('جداول افزایشی احراز بزرگسالی هنوز نصب نشده‌اند؛ هیچ حسابی تأیید نشده است.',
          'The additive independent adult-review tables are not provisioned. No user was approved.'));
        return false;
      }
      if(data.state!=='MANUAL_OUT_OF_BAND_REVIEW_ONLY'||data.canRecordDecision!==true)
        throw Error('NOT_READY');
      render(data);
      message(T('این درخواست‌ها هنوز تأیید واقعی نیستند. هر تصمیم نیازمند بررسی مستقل مدارک است.',
        'These are not verified identities. Every decision requires lawful, independent evidence review.'));
      return true;
    }catch(e){
      if(id!==serial||e?.name==='AbortError')return false;
      rows=[];account.replaceChildren();cards.replaceChildren();
      summary.textContent='';
      message(T('صف درخواست‌ها قابل خواندن نیست؛ وضعیت تأیید هیچ حسابی فرض نمی‌شود.',
        'Unable to read private queue; no account eligibility is presumed.'));
      return false;
    }finally{
      if(id===serial){controller=null;busy=false;btn.disabled=false;updateForm();}
    }
  }
  btn.addEventListener('click',load);
  for(const item of [account,decision,method,confirm])
    item.addEventListener('change',updateForm);
  file.addEventListener('change',async()=>{
    const chosen=file.files?.[0];
    sha.value='';confirm.checked=false;updateForm();
    if(!chosen)return;
    const id=++serial;
    if(chosen.size<1||chosen.size>10485760||
      !globalThis.crypto?.subtle){
      file.value='';
      message(T('فایل محلی حداکثر ۱۰ مگابایت و ارتباط امن مرورگر لازم است.',
        'A local file up to 10 MB and browser secure context are required.'));
      return;
    }
    save.disabled=true;
    message(T('در حال محاسبه محلی اثرانگشت مدرک؛ هیچ فایلی ارسال نمی‌شود…',
      'Hashing the reviewed evidence on your device; no document is uploaded…'));
    try{
      const bytes=await chosen.arrayBuffer();
      const digest=await crypto.subtle.digest('SHA-256',bytes);
      if(id!==serial||!visible())return;
      sha.value=Array.from(new Uint8Array(digest))
        .map(b=>b.toString(16).padStart(2,'0')).join('');
      message(T('فقط اثرانگشت محاسبه شد؛ فایل محرمانه از مرورگر ارسال نشده است.',
        'Evidence SHA-256 calculated locally. The confidential document was not uploaded.'));
      updateForm();
    }catch{
      if(id!==serial)return;
      sha.value='';
      message(T('اثر انگشت محلی محاسبه نشد؛ هیچ تصمیمی مجاز نیست.',
        'Unable to calculate local document fingerprint; review decision is blocked.'));
    }
  });
  form.addEventListener('submit',async event=>{
    event.preventDefault();updateForm();
    if(save.disabled||!visible()||busy)return;
    const row=rows.find(r=>r.accountId===account.value);
    if(!row)return;
    const text=decision.value==='VERIFIED_ADULT'
      ?T('سن و هویت این حساب را مستقل تأیید می‌کنید؟',
        'Have you independently confirmed this account belongs to a verified adult?')
      :decision.value==='REVOKED'
        ?T('تأیید قبلی این حساب لغو شود؟','Revoke the previous adult verification?')
        :T('درخواست این حساب رد شود؟','Decline this account request?');
    if(!window.confirm(text))return;
    const id=++serial;busy=true;btn.disabled=true;save.disabled=true;
    controller?.abort();controller=new AbortController();
    message(T('در حال بررسی اعتبار دومرحله‌ای و ثبت تصمیم واقعی…',
      'Verifying current MFA and recording the owner decision…'));
    try{
      const session=await fetch('/api/admin/operations/session',{
        credentials:'same-origin',cache:'no-store',
        headers:{Accept:'application/json'},signal:controller.signal
      });
      if(!session.ok)throw Error('MFA_REQUIRED');
      const auth=await session.json();
      if(id!==serial||!visible())return;
      if(auth?.ok!==true||auth.mfaRequired!==false||
        !/^[a-f0-9]{64}$/i.test(auth.csrfToken||''))
        throw Error('MFA_REQUIRED');
      const response=await fetch('/api/admin/operations/education-adult-review',{
        method:'POST',credentials:'same-origin',cache:'no-store',
        signal:controller.signal,
        headers:{Accept:'application/json','Content-Type':'application/json',
          'X-CSRF-Token':auth.csrfToken},
        body:JSON.stringify({
          accountId:row.accountId,decision:decision.value,
          method:method.value,evidenceSha256:sha.value,
          confirmation:'I INDEPENDENTLY REVIEWED THIS ACCOUNT'
        })
      });
      if(!response.ok)throw Error('REVIEW_DENIED');
      const result=await response.json();
      if(id!==serial||!visible())return;
      if(result?.ok!==true||
        result.schema!=='jr.bahar-adult-review-decision.v1'||
        result.accountId!==row.accountId||
        result.reviewState!==decision.value||
        result.ownerDecisionLogged!==true||
        result.automaticStorageActivated!==false)
        throw Error('NOT_CONFIRMED');
      message(T('سرور ثبت تصمیم را تأیید کرد؛ فهرست را دوباره بخوانید.',
        'The server confirmed the human review decision. Refresh the queue to reconcile.'));
      rows=[];account.replaceChildren();cards.replaceChildren();
      sha.value='';file.value='';confirm.checked=false;
    }catch(e){
      if(id!==serial||e?.name==='AbortError')return;
      message(T('تصمیم تأیید نشد؛ داده‌های محرمانه ارسال نشدند. وضعیت را دوباره دریافت کنید.',
        'Review decision was not confirmed; no document was uploaded. Reload the queue.'));
      sha.value='';file.value='';confirm.checked=false;
    }finally{
      if(id===serial){busy=false;controller=null;btn.disabled=false;updateForm();}
    }
  });
  container.addEventListener('toggle',()=>{if(!container.open)reset();});
  const watcher=new MutationObserver(()=>{if(workspace.hidden)reset();});
  watcher.observe(workspace,{attributes:true,attributeFilter:['hidden']});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)reset();});
  window.addEventListener('pagehide',()=>{reset();watcher.disconnect();},{once:true});
  reset();
})();