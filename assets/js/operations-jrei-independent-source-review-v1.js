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
     // Curriculum review has a separate additive schema. Display its honest
     // independent availability even if original-source review is absent.
     renderCurriculumGradeAlignment(data?.curriculumGradeAlignment);
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
   renderCurriculumGradeAlignment(data.curriculumGradeAlignment);
 }
 /**
  * Independent human evidence for curriculum ID and grade mapping. Even an
  * accepted match never certifies an exam key, topic ontology or public use.
  */
 function renderCurriculumGradeAlignment(review){
   const panel=make('details','jr-exam-subsection');
   panel.append(make('summary','',T(
     'بازبینی مستقل انطباق پایه و برنامهٔ درسی با منبع اصلی',
     'Independent curriculum-ID and grade alignment review')));
   panel.append(make('p','ops-muted',T(
     'اثر انگشت مدرک واقعیِ تطبیق پایه و شناسه برنامه درسی را فقط پس از بررسی دستی ثبت کنید. این گواهی، اصالت خودکار منبع، صحت سؤال یا مجوز تکثیر نیست.',
     'Record a SHA-256 digest only after independently examining genuine evidence for the curriculum-ID and grade associated with the original source. This is not automated authentication, verified answer correctness or reproduction permission.')));
   if(!review||review.schema!=='jr.jrei.curriculum-grade-human-review.v1'||
      review.available!==true){
     panel.append(make('p','ops-muted',T(
       'مهاجرت انطباق یا اطلاعات معتبر موجود نیست؛ وضعیت نامعلوم است.',
       'Curriculum review migration unavailable; alignment remains UNKNOWN.')));
     entries.append(panel);return;
   }
   const cases=Array.isArray(review.queue)?review.queue.slice(0,30):[];
   if(!cases.length)panel.append(make('p','ops-muted',T(
     'دامنهٔ نیازمند بازبینی مستقل در این پنجره یافت نشد؛ این به معنی پوشش کامل علمی نیست.',
     'No alignment review case in this window; scientific coverage is not thereby proven.')));
   for(const item of cases){
     if(!isUuid(item.requirementId)||!isUuid(item.sourceId))continue;
     const card=make('article','jr-exam-coverage-row');
     card.append(make('strong','',[
       item.country,item.curriculum,item.curriculumVersion,item.level,
       item.grade>0?item.grade:null,item.examCategory,item.year,
       item.subject,item.expectedKind
     ].filter(v=>v!==null&&v!==undefined).join(' · ').slice(0,380)));
     card.append(make('span','',String(item.sourceTitle||'').slice(0,180)));
     const form=make('form','jr-exam-coverage-form');
     form.autocomplete='off';
     const choice=make('label','',T(
       'تصمیم مستقل درباره انطباق فراداده','Human decision on metadata alignment'));
     const sel=make('select');
     for(const [value,text] of [
       ['REJECTED_SCOPE_ALIGNMENT',T('رد انطباق یا نیاز به بازبینی بیشتر',
         'Alignment rejected / more evidence needed')],
       ['ATTESTED_SCOPE_ALIGNMENT',T('انطباق مستند پایه و برنامه درسی را مستقلاً بررسی کردم',
         'I independently verified documentary grade/curriculum metadata')],
       ['REVOKED_SCOPE_ALIGNMENT',T('لغو گواهی قبلی این دامنه',
         'Revoke prior attestation on this scope')]
     ]){
       const option=make('option','',text);option.value=value;sel.append(option);
     }
     choice.append(sel);
     const reason=make('label','',T('دلیل اصلاح یا رد','Reason for rejection/revocation'));
     const select=make('select');
     for(const [value,text] of [
       ['ISSUER_EVIDENCE_INCOMPLETE',T('مدرک صادرکننده ناکافی است','Issuer evidence incomplete')],
       ['UNVERIFIED_CURRICULUM_ID',T('شناسه برنامه درسی تأیید نشده','Curriculum identifier unverified')],
       ['GRADE_SCOPE_MISMATCH',T('پایه تحصیلی همخوان نیست','Grade mismatch')],
       ['SOURCE_SUPERSEDED',T('منبع جایگزین شده','Source superseded')],
       ['OFFICIAL_CORRECTION_REQUIRED',T('اصلاحیه رسمی باید بررسی شود','Official correction requires review')]
     ]){
       const o=make('option','',text);o.value=value;select.append(o);
     }
     reason.append(select);
     const proofLabel=make('label','',T(
       'SHA-256 مدرک مستقل انطباق پایه و برنامه درسی',
       'SHA-256 of independently examined curriculum/grade evidence'));
     const proof=make('input');proof.type='text';proof.maxLength=64;
     proof.minLength=64;proof.pattern='[a-f0-9]{64}';
     proof.spellcheck=false;proof.autocomplete='off';
     proofLabel.append(proof);
     const local=make('label','',T(
       'محاسبه محلی SHA-256 فایل سند؛ هیچ فایلی ارسال نمی‌شود',
       'Hash a local documentary evidence file; the file is never uploaded'));
     const localFile=make('input');localFile.type='file';
     localFile.accept='.pdf,.txt,.html,.htm,.png,.jpg,.jpeg';
     localFile.addEventListener('change',async()=>{
       const chosen=localFile.files?.[0];
       if(!chosen)return;
       try{
         if(chosen.size<1||chosen.size>8*1024*1024||!crypto?.subtle)
           throw Error('HASH_UNAVAILABLE');
         const digest=await crypto.subtle.digest(
           'SHA-256',await chosen.arrayBuffer());
         if(active())proof.value=Array.from(new Uint8Array(digest))
           .map(v=>v.toString(16).padStart(2,'0')).join('');
       }catch{
         status.textContent=T('محاسبه محلی ممکن نشد؛ فایل ارسال نشده است.',
           'Local hash unavailable; no file was transmitted.');
       }finally{localFile.value='';}
     });
     local.append(localFile);
     const acknowledge=make('label','',T(
       'سند را شخصاً بررسی کردم. می‌دانم تأیید فراداده، تأیید محتوای علمی یا اجازه انتشار نیست.',
       'I personally reviewed the evidence and understand that metadata alignment is not scientific or publication approval.'));
     const box=make('input');box.type='checkbox';box.required=true;
     acknowledge.prepend(box);
     const submit=make('button','',T('ثبت داوری مستقل با MFA',
       'Record independent review with MFA'));
     submit.type='submit';
     const toggle=()=>{
       const approving=sel.value==='ATTESTED_SCOPE_ALIGNMENT';
       proofLabel.hidden=!approving;local.hidden=!approving;proof.required=approving;
       reason.hidden=approving;select.disabled=approving;
     };
     sel.addEventListener('change',toggle);toggle();
     form.append(choice,reason,proofLabel,local,acknowledge,submit);
     form.addEventListener('submit',event=>{
       event.preventDefault();
       if(!active()||busy||!form.reportValidity())return;
       const approving=sel.value==='ATTESTED_SCOPE_ALIGNMENT';
       if(approving&&!isSha(proof.value.trim().toLowerCase()))return;
       if(sel.value==='REVOKED_SCOPE_ALIGNMENT'&&
          item.previousDecision!=='ATTESTED_SCOPE_ALIGNMENT')return;
       if(!window.confirm(T(
         'این تصمیم تنها برای انطباق فراداده است و هیچ اثر خودکار بر مجوزها یا پاسخ‌ها ندارد. ثبت شود؟',
         'Record this metadata-only decision? It cannot authorize exam answers, reproduction or publication.')))return;
       mutate({action:'review_curriculum_grade',
         requirementId:item.requirementId,sourceId:item.sourceId,
         revision:Number.isSafeInteger(item.revision)?item.revision:null,
         decision:sel.value,
         evidenceSha256:approving?proof.value.trim().toLowerCase():null,
         reasonCode:approving?null:select.value,
         confirmation:'REVIEW_CURRICULUM_GRADE_HUMAN_EVIDENCE'});
     });
     card.append(form);panel.append(card);
   }
   if(review.truncated)panel.append(make('p','ops-muted',T(
     'صف ۳۰ رکورد محدود است؛ نمایش به معنی کامل‌بودن فهرست نیست.',
     'The queue shows at most 30 records; it is not a complete inventory.')));
   const active=Array.isArray(review.activeAttestations)?
     review.activeAttestations.slice(0,20):[];
   const revisions=make('details','jr-exam-subsection');
   revisions.append(make('summary','',T(
     'لغو آگاهانهٔ گواهی‌های قبلی انطباق (حفظ تاریخچه)',
     'Explicitly revoke prior curriculum/grade attestations (retain history)')));
   revisions.append(make('p','ops-muted',T(
     'حتی گواهی قبلی نیز ممکن است با تغییر منبع یا اصلاح برنامهٔ درسی اعتبار خود را از دست بدهد. لغو این گواهی فقط انطباق فراداده را از پوشش حذف می‌کند.',
     'Previously accepted metadata can become inaccurate. Revocation removes its coverage eligibility but preserves the source and decision history.')));
   if(!active.length)revisions.append(make('p','ops-muted',T(
     'گواهی ثبت‌شده‌ای برای لغو وجود ندارد.',
     'No current recorded attestation available for revocation.')));
   for(const item of active){
     if(!isUuid(item.requirementId)||!isUuid(item.sourceId)||
        !Number.isSafeInteger(item.revision))continue;
     const card=make('article','jr-exam-coverage-row');
     card.append(make('strong','',[
       item.country,item.curriculum,item.level,
       item.grade>0?item.grade:null,item.year,item.subject,
       item.expectedKind
     ].filter(v=>v!==null&&v!==undefined).join(' · ').slice(0,250)));
     card.append(make('span','',String(item.sourceTitle||'').slice(0,150)));
     const form=make('form','jr-exam-coverage-form');
     const label=make('label','',T('علت لغو گواهی','Reason for revocation'));
     const reasons=make('select');
     for(const [value,text] of [
       ['OFFICIAL_CORRECTION_REQUIRED',T('اصلاحیه رسمی نیازمند بررسی','Official correction required')],
       ['GRADE_SCOPE_MISMATCH',T('عدم انطباق پایه','Grade mismatch')],
       ['UNVERIFIED_CURRICULUM_ID',T('شناسه درسی تأیید نشده','Curriculum ID unverified')],
       ['SOURCE_SUPERSEDED',T('منبع جایگزین شده','Source superseded')],
       ['ISSUER_EVIDENCE_INCOMPLETE',T('مدرک قبلی ناکافی است','Earlier evidence incomplete')]
     ]){
       const option=make('option','',text);option.value=value;reasons.append(option);
     }
     label.append(reasons);
     const btn=make('button','jr-exam-emergency',T(
       'لغو گواهی با ثبت سابقه','Revoke attestation with audit trail'));
     btn.type='submit';
     form.append(label,btn);
     form.addEventListener('submit',event=>{
       event.preventDefault();
       if(!active()||busy||!form.reportValidity())return;
       if(!window.confirm(T(
         'این گواهی را لغو و تاریخچه را حفظ می‌کنید؟ هیچ سند اصلی حذف نمی‌شود.',
         'Revoke this metadata attestation while preserving source and history?')))return;
       mutate({action:'review_curriculum_grade',
         requirementId:item.requirementId,sourceId:item.sourceId,
         revision:item.revision,decision:'REVOKED_SCOPE_ALIGNMENT',
         reasonCode:reasons.value,evidenceSha256:null,
         confirmation:'REVIEW_CURRICULUM_GRADE_HUMAN_EVIDENCE'});
     });
     card.append(form);revisions.append(card);
   }
   if(review.activeTruncated)revisions.append(make('p','ops-muted',T(
     'فقط ۲۰ گواهی اخیر نمایش داده شده است.',
     'Only the latest 20 attestations are shown.')));
   panel.append(revisions);
   entries.append(panel);
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
