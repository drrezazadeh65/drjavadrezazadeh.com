/* JREI independent source reviewer inside original MFA operations workspace.
 * Evidence documents remain on the reviewer's device; only supplied digests
 * and explicit human decisions go to the private mother-DB API.
 */
(()=>{
 'use strict';
 const workspace=document.getElementById('ops-workspace');
 if(!workspace)return;
 const en=document.documentElement.lang==='en';
 const T=(fa,enText)=>en?enText:fa;
 const make=(tag,cls,txt)=>{
   const el=document.createElement(tag);
   if(cls)el.className=cls;
   if(txt!==undefined)el.textContent=String(txt);
   return el;
 };
 const root=make('details','ops-panel jr-exam-subsection');
 root.id='ops-jrei-independent-source-review';
 root.append(make('summary','',T(
   'بازبینی مستقل اصالت منابع آزمون و مجوز تحلیل خصوصی',
   'Independent examination source and private-rights review')));
 root.append(make('p','ops-muted',T(
   'صرفاً برای مدیر/بازبین مستقلی که احراز دومرحله‌ای کرده است. بازبین دامنهٔ اولیه نمی‌تواند همان منبع را تأیید کند. بررسی یک نشانی یا ثبت اثرانگشت هیچ مجوز انتشار، بازنشر، فروش یا تأیید پاسخ‌نامه ایجاد نمی‌کند.',
   'For an independently authorised administrator with fresh MFA. A scope approver may not approve the same source. Inspecting a link or recording a SHA-256 digest does not permit publication, resale or certify an answer key.')));
 const refresh=make('button','',T('بازخوانی صف بازبینی','Refresh review queue'));
 refresh.type='button';
 const status=make('p','ops-muted',T(
   'صف فقط پس از باز کردن بخش و احراز دومرحله‌ای خوانده می‌شود.',
   'Queue loads only while this section is open with fresh MFA.'));
 status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const entries=make('div','jr-exam-rows');
 root.append(refresh,status,entries);
 const target=workspace.querySelector('#ops-jrei-exam-research');
 if(target)target.insertAdjacentElement('afterend',root);
 else workspace.append(root);
 const api='/api/admin/operations/jrei-independent-source-review';
 let ctrl=null,generation=0,busy=false;
 const active=()=>root.open&&!workspace.hidden&&!document.hidden&&navigator.onLine;
 const clear=()=>{
   generation++;ctrl?.abort();ctrl=null;busy=false;
   refresh.disabled=false;entries.replaceChildren();
   status.textContent=T('برای مشاهده شواهد، پنل را باز کنید.',
     'Open the protected section to read evidence.');
 };
 const isSha=s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
 const isUuid=s=>typeof s==='string'&&
   /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(s);
 const safeUrl=value=>{
   try{
     if(typeof value!=='string'||value.length>1200)return null;
     const u=new URL(value);
     if(u.protocol!=='https:'||u.username||u.password||
        u.search||u.hash||u.port)return null;
     if(!/^(?:[a-z0-9-]+\.)+[a-z]{2,63}$/i.test(u.hostname))return null;
     return u.href;
   }catch{return null;}
 };
 function show(data){
   entries.replaceChildren();
   if(data?.schema!=='jr.jrei.independent-source-review.v1'||!data.available){
     status.textContent=T('جدول شواهد بازبینی نصب نشده یا اتصال معتبر نیست؛ وضعیت نامعلوم است.',
       'Source-review schema or verified connection unavailable; status UNKNOWN.');
     return;
   }
   const list=Array.isArray(data.queue)?data.queue.slice(0,40):[];
   status.textContent=list.length?T(
     'فقط منابعی نشان داده می‌شوند که تأیید دامنهٔ بررسی آن‌ها توسط شخص دیگری انجام شده است.',
     'Only sources with investigation scopes approved by another reviewer are listed.'):
     T('منبعی واجد شرایط بررسی مستقل ثبت نشده است؛ این نتیجه، تأیید پوشش کامل نیست.',
       'No eligible independent-review candidate recorded; completeness is not established.');
   for(const item of list){
     if(!isUuid(item.sourceId))continue;
     const card=make('article','jr-exam-coverage-row');
     card.append(make('strong','',String(item.title||'').slice(0,240)));
     card.append(make('span','',[
       item.country,item.level,item.examCategory,item.year,item.subject,
       item.kind,item.claimedAuthority,item.version
     ].filter(v=>v!==null&&v!==undefined).join(' · ').slice(0,350)));
     const url=safeUrl(item.url);
     if(url){
       const link=make('a','',T('بررسی دستی اصل نشانی منبع (زبانهٔ جدا)',
         'Manually inspect source URL (new tab)'));
       link.href=url;link.target='_blank';link.rel='noopener noreferrer';
       card.append(link);
     }
     const form=make('form','jr-exam-coverage-form');
     form.autocomplete='off';
     const choose=(label,opts)=>{
       const holder=make('label','',label);
       const select=make('select');
       for(const [value,name] of opts){
         const option=make('option','',name);option.value=value;
         select.append(option);
       }
       holder.append(select);form.append(holder);return select;
     };
     const decision=choose(T('تصمیم بازبین مستقل','Independent reviewer decision'),[
       ['REQUEST_ADDITIONAL_EVIDENCE',T('نیاز به مدرک بیشتر؛ بدون تأیید',
         'More evidence required; no approval')],
       ['AUTHORIZE_PRIVATE_ANALYSIS',T('اصالت و مجوز تحلیل خصوصی با بررسی مستقل احراز شد',
         'Reviewed original authority and private-analysis rights')],
       ['QUARANTINE_UNRELIABLE',T('قرنطینه منبع نامعتبر یا فاقد مجوز',
         'Quarantine unreliable or unlicensed source')]
     ]);
     const reason=choose(T('دلیل درخواست/رد','Reason for deferral or rejection'),[
       ['FURTHER_EXPERT_REVIEW_REQUIRED',T('بازبینی تخصصی لازم است','Expert review required')],
       ['ISSUER_UNVERIFIED',T('ناشر اصلی تأیید نشده','Issuer not verified')],
       ['RIGHTS_UNVERIFIED',T('مجوز قانونی احراز نشده','Rights not verified')],
       ['SOURCE_SCOPE_MISMATCH',T('مشخصات آزمون هم‌خوان نیست','Exam scope mismatch')],
       ['DOCUMENT_WITHDRAWN',T('سند لغو شده','Document withdrawn')]
     ]);
     const hashes=make('div','jr-exam-coverage-form');
     const proof=[];
     for(const [fa,label] of [
       ['SHA-256 مدرک اصالت ناشر','SHA-256 of examined authority evidence'],
       ['SHA-256 مدرک مجوز مطالعه خصوصی','SHA-256 of examined private-rights evidence'],
       ['SHA-256 مستند شرایط استفاده','SHA-256 of examined applicable terms']
     ]){
       const holder=make('label','',T(fa,label));
       const input=make('input');input.type='text';
       input.pattern='[a-f0-9]{64}';input.maxLength=64;
       input.minLength=64;input.spellcheck=false;input.autocomplete='off';
       input.setAttribute('inputmode','text');
       const fileLabel=make('label','',T(
         'محاسبه اختیاری SHA-256 از فایل محلی؛ فایل به سرور ارسال نمی‌شود',
         'Optional SHA-256 from a local evidence file; file is NEVER uploaded'));
       const file=make('input');file.type='file';
       file.accept='.pdf,.txt,.html,.htm,.json,.png,.jpg,.jpeg';
       file.addEventListener('change',async()=>{
         const chosen=file.files?.[0];
         if(!chosen)return;
         // This local convenience is not proof that the reviewer has read,
         // understood or legally authenticated the evidence document.
         if(chosen.size<1||chosen.size>8*1024*1024||
            !globalThis.crypto?.subtle){
           status.textContent=T(
             'این فایل قابل محاسبه نیست؛ هش معتبر را دستی وارد کنید.',
             'File hash unavailable; enter a verified digest manually.');
           file.value='';return;
         }
         try{
           const digest=await crypto.subtle.digest(
             'SHA-256',await chosen.arrayBuffer());
           if(!workspace.hidden&&root.open){
             input.value=Array.from(new Uint8Array(digest))
               .map(x=>x.toString(16).padStart(2,'0')).join('');
           }
         }catch{
           input.value='';
           status.textContent=T('محاسبه محلی شکست خورد؛ مدرکی ارسال نشد.',
             'Local hashing failed; no evidence document was transmitted.');
         }finally{file.value='';}
       });
       fileLabel.append(file);
       holder.append(input,fileLabel);
       hashes.append(holder);proof.push(input);
     }
     const agree=make('label','',T(
       'این تصمیم صرفاً پس از بررسی واقعی مدارک گرفته شده و شامل تأیید متن سؤال یا انتشار نیست.',
       'I examined the actual evidence independently; this decision does not validate questions or permit publication.'));
     const checkbox=make('input');checkbox.type='checkbox';checkbox.required=true;
     agree.prepend(checkbox);
     const button=make('button','',T('ثبت تصمیم بازبین با MFA','Record human review with MFA'));
     button.type='submit';
     const toggle=()=>{
       hashes.hidden=decision.value!=='AUTHORIZE_PRIVATE_ANALYSIS';
       reason.disabled=decision.value==='AUTHORIZE_PRIVATE_ANALYSIS';
       for(const field of proof)field.required=!hashes.hidden;
       button.textContent=decision.value==='AUTHORIZE_PRIVATE_ANALYSIS'
         ?T('ثبت شواهد بررسی انسانی، فقط تحلیل خصوصی',
            'Record attested human evidence, PRIVATE use only')
         :T('ثبت تصمیم بدون تأیید منبع','Record decision without approval');
     };
     decision.addEventListener('change',toggle);toggle();
     form.append(hashes,agree,button);
     form.addEventListener('submit',event=>{
       event.preventDefault();
       if(!active()||busy||!form.reportValidity())return;
       const payload={sourceId:item.sourceId,decision:decision.value,
         confirmation:'INDEPENDENT_HUMAN_METADATA_REVIEW_ONLY'};
       if(decision.value==='AUTHORIZE_PRIVATE_ANALYSIS'){
         const [a,b,c]=proof.map(x=>x.value.trim().toLowerCase());
         if(![a,b,c].every(isSha)||new Set([a,b,c]).size!==3)return;
         payload.authorityEvidenceSha256=a;
         payload.privateRightsEvidenceSha256=b;
         payload.termsEvidenceSha256=c;
       }else payload.reasonCode=reason.value;
       if(!window.confirm(T(
         'مدرک‌های واقعی را مستقلاً بررسی کرده‌اید؟ این اقدام اجازه بازنشر یا تأیید علمی نمی‌دهد. ثبت شود؟',
         'Have you independently examined real evidence? This grants no publication or scientific certification. Record it?')))return;
       mutate(payload);
     });
     card.append(form);entries.append(card);
   }
   if(data.truncated)entries.append(make('p','ops-muted',T(
     'نمایش حداکثر ۴۰ پرونده؛ مجموع سراسری نامعلوم است.',
     'At most 40 cases shown; complete total is unknown.')));
 }
 async function load(){
   if(!active()||busy)return;
   const seq=++generation;ctrl?.abort();
   ctrl=new AbortController();const req=ctrl;
   const timeout=setTimeout(()=>req.abort(),15000);
   busy=true;refresh.disabled=true;entries.replaceChildren();
   status.textContent=T('در حال خواندن صف از دیتابیس مادر…',
     'Reading real mother-DB reviewer queue…');
   try{
     const res=await fetch(api,{credentials:'same-origin',
       cache:'no-store',headers:{Accept:'application/json'},signal:req.signal});
     if(!res.ok)throw Error('HTTP');
     const data=await res.json();
     if(seq===generation&&active())show(data);
   }catch{
     if(seq===generation&&active())status.textContent=T(
       'صف قابل احراز نیست؛ سطح دسترسی، MFA و جدول بازبینی را بررسی کنید.',
       'Queue unavailable; check reviewer access, MFA and the staged schema.');
   }finally{
     clearTimeout(timeout);
     if(seq===generation){busy=false;refresh.disabled=false;ctrl=null;}
   }
 }
 async function mutate(payload){
   if(!active()||busy)return;
   const seq=++generation;ctrl?.abort();
   ctrl=new AbortController();const req=ctrl;
   const timeout=setTimeout(()=>req.abort(),18000);
   busy=true;refresh.disabled=true;entries.replaceChildren();
   status.textContent=T('در حال ثبت تصمیم انسانی…',
     'Recording the independent human decision…');
   try{
     const auth=await fetch('/api/admin/operations/session',{
       credentials:'same-origin',cache:'no-store',
       headers:{Accept:'application/json'},signal:req.signal});
     if(!auth.ok)throw Error('MFA');
     const session=await auth.json();
     if(session?.ok!==true||session.mfaRequired!==false||
        !isSha(session.csrfToken||''))throw Error('MFA');
     const response=await fetch(api,{method:'POST',
       credentials:'same-origin',cache:'no-store',
       headers:{'Content-Type':'application/json',
         'X-CSRF-Token':session.csrfToken,Accept:'application/json'},
       body:JSON.stringify(payload),signal:req.signal});
     if(!response.ok)throw Error('WRITE');
     const data=await response.json();
     if(seq===generation&&active())show(data);
   }catch{
     if(seq===generation&&active())status.textContent=T(
       'نتیجه ثبت قطعی نیست؛ پیش از تلاش مجدد وضعیت را بازخوانی کنید.',
       'Commit outcome uncertain. Reload the authoritative queue before retrying.');
   }finally{
     clearTimeout(timeout);
     if(seq===generation){busy=false;refresh.disabled=false;ctrl=null;}
   }
 }
 refresh.addEventListener('click',load);
 root.addEventListener('toggle',()=>{if(active())load();else clear();});
 new MutationObserver(()=>{if(workspace.hidden)clear();})
   .observe(workspace,{attributes:true,attributeFilter:['hidden']});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)clear();});
 window.addEventListener('offline',clear);
 window.addEventListener('jr:account-logout',clear);
 window.addEventListener('pagehide',clear);
})();
