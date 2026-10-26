/* JREI OWNER PILOT — experimental Qwen, never a public/chat quality release.
 * Existing signed SUPER_ADMIN session + MFA + CSRF; no localStorage.
 */
(()=>{
 'use strict';
 const host=document.getElementById('ops-jrei-hybrid-nodes');
 const workspace=document.getElementById('ops-workspace');
 if(!host||!workspace)return;
 const en=document.documentElement.lang==='en';
 const T=(fa,english)=>en?english:fa;
 const panel=document.createElement('details');
 panel.className='jr-hybrid-jobs jr-hybrid-form-panel';
 const heading=document.createElement('summary');
 heading.textContent=T('آزمایش خصوصی Qwen روی گره ویندوز مجاز — بدون انتشار عمومی',
   'Private Qwen pilot on authorised Windows node — no public release');
 panel.append(heading);
 const form=document.createElement('form');
 form.className='jr-hybrid-form';
 const note=document.createElement('p');
 note.textContent=T(
  'صرفاً برای مدیر. پاسخ آزمایشی اعتبار علمی ندارد؛ اطلاعات شخصی، رمز یا مدارک خصوصی وارد نکنید. برای کارکردن، مدل و Worker آزمایشی باید روی همان گره ویندوز دارای مجوز روشن باشند.',
  'Owner-only. Provisional unverified model responses. Do not enter personal data, secrets or private documents. Requires Qwen and the signed pilot Worker on the same approved Windows node.');
 const field=document.createElement('label');
 field.textContent=T('پرسش آزمایشی','Pilot question');
 const input=document.createElement('textarea');
 input.rows=3;input.maxLength=650;input.required=true;
 input.value=T('سلام JREI، خودت را در دو جمله معرفی کن.',
   'Hello JREI. Introduce yourself in two sentences.');
 field.append(input);
 const acknowledgment=document.createElement('label');
 const agreed=document.createElement('input');
 agreed.type='checkbox';agreed.required=true;
 acknowledgment.append(agreed,document.createTextNode(T(
   ' می‌پذیرم پاسخ‌ها فقط آزمایشی‌اند و نباید مبنای تصمیم علمی قرار گیرند.',
   ' I understand these are private, unverified experimental answers.')));
 const submit=document.createElement('button');
 submit.type='submit';submit.textContent=T('ارسال آزمایش خصوصی','Ask private Qwen');
 const status=document.createElement('p');
 status.setAttribute('role','status');
 const answer=document.createElement('pre');
 answer.dir=en?'ltr':'rtl';
 answer.style.whiteSpace='pre-wrap';
 answer.style.overflowWrap='anywhere';
 form.append(note,field,acknowledgment,submit,status,answer);
 // A separate READ-ONLY snapshot does not preserve any prompt or model output.
 // All figures are the current mother-DB aggregate, not evidence of
 // signed pilot-poll freshness or scientific quality.
 const diagnostics=document.createElement('details');
 diagnostics.className='jr-hybrid-form-panel';
 const diagnosticHeading=document.createElement('summary');
 diagnosticHeading.textContent=T('وضعیت واقعی آزمایش خصوصی (بدون ذخیرهٔ مکالمه)',
   'Actual private-pilot status (no conversation storage)');
 const diagnosticRefresh=document.createElement('button');
 diagnosticRefresh.type='button';
 diagnosticRefresh.textContent=T('بررسی صف خصوصی از سرور',
   'Read private queue status from server');
 const diagnosticStatus=document.createElement('p');
 diagnosticStatus.setAttribute('role','status');
 diagnosticStatus.setAttribute('aria-live','polite');
 const diagnosticContent=document.createElement('div');
 diagnostics.append(diagnosticHeading,diagnosticRefresh,diagnosticStatus,
   diagnosticContent);
 panel.append(form,diagnostics);host.append(panel);
 let running=false,ctl=null,liveJob=null,diagnosticCtl=null;
 async function readPrivateReadiness(){
   if(!valid()||diagnosticCtl)return;
   const control=new AbortController();diagnosticCtl=control;
   diagnosticRefresh.disabled=true;
   diagnosticContent.replaceChildren();
   diagnosticStatus.textContent=T('در حال خواندن وضعیت دیتابیس مادر…',
     'Reading mother-database status…');
   try {
     const response=await fetch('/api/admin/operations/jrei-owner-pilot',{
       method:'GET',credentials:'same-origin',cache:'no-store',
       signal:control.signal,headers:{Accept:'application/json'}
     });
     if(!response.ok)throw Error('OWNER_PRIVATE_SNAPSHOT_UNAVAILABLE');
     const snapshot=await response.json();
     if(control.signal.aborted||!valid()||!diagnostics.open)return;
     if(snapshot?.ok!==true||
        snapshot.schema!=='jr.jrei.owner-pilot-readiness.v1'||
        snapshot.privateOnly!==true||snapshot.publicAiActivated!==false||
        snapshot.scientificQualityAccepted!==false)
       throw Error('OWNER_PRIVATE_SNAPSHOT_CONTRACT_INVALID');
     const counts=snapshot.activeQueueCounts;
     const value=(x)=>x===true?T('آماده در سمت سرور','Configured on server'):
       x===false?T('غیرفعال یا موجود نیست','Disabled or unavailable'):
       T('نامعلوم','Unknown');
     const number=x=>Number.isSafeInteger(x)&&x>=0?
       x.toLocaleString(en?'en-US':'fa-IR'):T('نامعلوم','Unknown');
     const rows=[
       [T('جداول صف خصوصی','Private queue tables'),
          value(snapshot.motherDatabaseQueueReady)],
       [T('کلید رمزگذاری صف','Queue encryption'),
          value(snapshot.queueEncryptionConfigured)],
       [T('امکان پذیرش درخواست خصوصی','Private request intake'),
          value(snapshot.acceptingPrivateOwnerRequests)],
       [T('نودهای فعال ثبت‌شده','Registered enabled owner nodes'),
          number(snapshot.registeredEnabledOwnerNodes)],
       [T('مدل‌های دارای حقوق بررسی‌شده','Rights-reviewed model candidates'),
          number(snapshot.rightsReviewedModelCandidates)],
       [T('درخواست‌های منتظر','Queued private requests'),
          number(counts?.PILOT_QUEUED)],
       [T('درخواست‌های واگذارشده','Leased private requests'),
          number(counts?.PILOT_LEASED)],
       [T('پاسخ‌های آمادهٔ دریافت','Responses pending retrieval'),
          number(counts?.PILOT_COMPLETED)],
       [T('پاسخ‌های متوقف‌شده توسط کنترل کیفیت',
          'Drafts withheld by safety review'),number(counts?.PILOT_BLOCKED)],
       [T('سلامت زندهٔ Qwen روی رایانه','Live Qwen health on Windows'),
          T('از دیتابیس سایت قابل اثبات نیست',
            'Not attested by this server snapshot')],
       [T('تأیید علمی و انتشار عمومی','Scientific acceptance/public release'),
          T('تأیید نشده / غیرفعال','Unverified / disabled')]
     ];
     const dl=document.createElement('dl');
     for(const [name,detail] of rows){
       const dt=document.createElement('dt');dt.textContent=name;
       const dd=document.createElement('dd');dd.textContent=detail;
       dl.append(dt,dd);
     }
     diagnosticContent.replaceChildren(dl);
     diagnosticStatus.textContent=T(
       'داده‌ها فقط شمارش‌های جاری هستند؛ مکالمه‌های دریافت‌شده عمداً حذف می‌شوند.',
       'Current metadata only; delivered conversations are intentionally erased.');
   }catch{
     if(!control.signal.aborted&&valid()){
       diagnosticContent.replaceChildren();
       diagnosticStatus.textContent=T(
         'وضعیت خصوصی قابل تأیید نیست؛ نشست MFA یا پاسخ سرور را بررسی کنید.',
         'Private status unavailable; check the MFA session and server response.');
     }
   }finally{
     if(diagnosticCtl===control){diagnosticCtl=null;diagnosticRefresh.disabled=false;}
   }
 }
 diagnosticRefresh.addEventListener('click',readPrivateReadiness);
 diagnostics.addEventListener('toggle',()=>{
   if(!diagnostics.open){
     diagnosticCtl?.abort();diagnosticCtl=null;
     diagnosticContent.replaceChildren();
     diagnosticStatus.textContent='';
   }
 });
 const valid=()=>host.open&&panel.open&&!workspace.hidden&&!document.hidden;
 const sleep=ms=>new Promise(done=>setTimeout(done,ms));
 async function command(body){
   const signal=ctl?.signal;
   const s=await fetch('/api/admin/operations/session',{
     credentials:'same-origin',cache:'no-store',
     headers:{Accept:'application/json'},signal});
   if(!s.ok)throw Error('OWNER_MFA_REQUIRED');
   const data=await s.json();
   if(data?.ok!==true||data.mfaRequired!==false||
      !/^[a-f0-9]{64}$/i.test(data.csrfToken||''))
     throw Error('OWNER_MFA_REQUIRED');
   const r=await fetch('/api/admin/operations/jrei-owner-pilot',{
     method:'POST',credentials:'same-origin',cache:'no-store',signal,
     headers:{Accept:'application/json','Content-Type':'application/json',
       'X-CSRF-Token':data.csrfToken},
     body:JSON.stringify(body)});
   if(!r.ok)throw Error('PRIVATE_PILOT_BACKEND_UNAVAILABLE');
   const result=await r.json();
   if(result?.ok!==true)throw Error('PRIVATE_PILOT_RESPONSE_INVALID');
   return result;
 }
 async function cancel(){
   if(!liveJob)return;
   const job=liveJob;liveJob=null;
   try{await command({action:'cancel',jobId:job.jobId,
     retrievalToken:job.retrievalToken});}catch{}
 }
 function leave(){
   if(ctl)ctl.abort();
   ctl=null;
   // A visible result was already consumed and erased by PHP.
   // Otherwise the short-retention server expiry is authoritative:
   // do not persist browser job tokens or treat an abort as cancellation.
   liveJob=null;
   diagnosticCtl?.abort();diagnosticCtl=null;
   diagnosticContent.replaceChildren();
   running=false;submit.disabled=false;
   answer.textContent='';
 }
 form.addEventListener('submit',async e=>{
   e.preventDefault();
   if(running||!valid()||!form.reportValidity())return;
   const question=input.value.trim();
   if(!question||question.length>650)return;
   running=true;submit.disabled=true;ctl=new AbortController();
   status.textContent=T('در حال ارسال درخواست به گره مجاز…','Sending to approved Windows node…');
   answer.textContent='';
   try{
     const start=await command({action:'ask',language:en?'en':'fa',
       question,privatePilotAcknowledged:true});
     if(start.status!=='PENDING'||typeof start.jobId!=='string'||
        !/^[a-f0-9]{64}$/.test(start.retrievalToken||''))
       throw Error('PILOT_JOB_TOKEN_UNVERIFIED');
     liveJob={jobId:start.jobId,retrievalToken:start.retrievalToken};
     status.textContent=T('منتظر پاسخ Worker امضاشده…',
       'Waiting for the signed worker…');
     for(let i=0;i<31&&valid()&&!ctl.signal.aborted;i++){
       await sleep(2800);
       if(!valid()||ctl.signal.aborted)break;
       const got=await command({action:'result',...liveJob});
       if(got.status==='PENDING')continue;
       liveJob=null;
       if(got.status==='REVIEW_REQUIRED'&&typeof got.answer==='string'){
         answer.textContent=got.answer;
         status.textContent=T('پاسخ آزمایشی است؛ اعتبار علمی تأیید نشده.',
           'Provisional result; scientific accuracy is unverified.');
       }else if(got.status==='BLOCKED_BY_QUALITY_REVIEW'){
         status.textContent=T('پاسخ به دلیل کنترل کیفیت نمایش داده نشد.',
           'Answer withheld by model quality guard.');
       }else status.textContent=T('پاسخی در این نوبت دریافت نشد.',
         'No answer this time.');
       break;
     }
     if(liveJob){
       await cancel();
       if(valid())status.textContent=T(
         'زمان آزمایش تمام شد؛ اتصال Worker یا مجوزهای خصوصی را بررسی کنید.',
         'Pilot timed out; check signed worker and private server readiness.');
     }
   }catch{
     if(valid())status.textContent=T(
       'اتصال خصوصی برقرار نشد. احراز دومرحله‌ای، Worker یا کلید رمزگذاری سرور را بررسی کنید.',
       'Private pilot unavailable: check MFA, signed worker and server encryption key.');
   }finally{
     if(liveJob&&!ctl?.signal.aborted)await cancel();
     liveJob=null;ctl=null;running=false;submit.disabled=false;
   }
 });
 panel.addEventListener('toggle',()=>{if(!panel.open)leave();});
 host.addEventListener('toggle',()=>{if(!host.open)leave();});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)leave();});
 window.addEventListener('pagehide',leave);
 window.addEventListener('jr:account-logout',leave);
})();
