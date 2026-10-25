/* Candidate private JREI exam workspace; NO model calls, keys or local answer storage. */
(()=>{
 'use strict';
 const root=document.querySelector('[data-exam-candidate]');
 if(!root)return;
 const lang=document.documentElement.lang==='en'?'en':'fa';
 const T=(fa,en)=>lang==='fa'?fa:en;
 const status=root.querySelector('[data-exam-candidate-status]');
 const list=root.querySelector('[data-exam-candidate-list]');
 const paper=root.querySelector('[data-exam-paper]');
 const actions=root.querySelector('[data-exam-paper-actions]');
 const clock=root.querySelector('[data-exam-deadline]');
 if(!status||!list||!paper||!actions||!clock)return;
 const fmt=new Intl.NumberFormat(lang==='fa'?'fa-IR':'en-US');
 let active=null,revision=0,items=[],selected={},cursor=0,busy=false;
 let recoveryRequired=false;
 let recoveryAttemptId=null;
 // A local device's clock may be wrong by hours. Server time is the
 // reference; client time is used only to display an approximate countdown.
 let serverClockOffsetMs=0;
 let expireAt=0;
 const element=(tag,value,cls)=>{
   const node=document.createElement(tag);
   if(cls)node.className=cls;
   if(value!==undefined)node.textContent=String(value);
   return node;
 };
 const request=async(url,init={})=>{
   const controller=new AbortController();
   const timer=setTimeout(()=>controller.abort(),12000);
   try{
     const response=await fetch(url,{
       credentials:'same-origin',cache:'no-store',
       headers:{Accept:'application/json',...(init.headers||{})},
       ...init,signal:controller.signal
     });
     const data=await response.json();
     if(!response.ok||!data||data.ok===false)
       throw Error(data?.error||'SERVER_UNAVAILABLE');
     return data;
   }finally{clearTimeout(timer);}
 };
 const timeLabel=(sec)=>{
   const n=Math.max(0,sec|0);
   return fmt.format(Math.floor(n/60))+':'+String(n%60).padStart(2,'0');
 };
 const setStatus=(msg)=>{status.textContent=msg;};
 const refreshClock=()=>{
   if(!active||!expireAt){clock.textContent='';return;}
   const seconds=Math.max(0,Math.ceil(expireAt-(Date.now()+serverClockOffsetMs)/1000));
   clock.textContent=T('زمان تقریبی باقی‌مانده: ','Approximate remaining time: ')+
     timeLabel(seconds)+T(' · اعتبار زمان فقط با سرور است',
       ' · the server clock is authoritative');
   if(seconds===0)clock.textContent+=T(
     ' · ذخیرهٔ جدید ممکن نیست',' · new saves are not accepted');
 };
 setInterval(()=>{if(!document.hidden)refreshClock();},1000);
 const post=(action,payload)=>request('/api/exams/attempt',{
   method:'POST',headers:{'Content-Type':'application/json',
     'X-JR-Exam-Action':'v1'},
   body:JSON.stringify({action,...payload})
 });
 const safeAttempt=x=>x&&typeof x.attemptId==='string'&&
   /^[0-9a-f-]{36}$/i.test(x.attemptId);
 async function loadAttempts(){
   if(busy)return;
   busy=true;setStatus(T('در حال دریافت سوابق معتبر آزمون…',
     'Loading your actual examination records…'));
   // A list refresh closes any previous attempt view and clears
   // private answers from live JS memory. Resumption must refetch both
   // the original question-version manifest and saved server responses.
   active=null;expireAt=0;revision=0;cursor=0;
   items=[];selected={};recoveryRequired=false;recoveryAttemptId=null;
   list.replaceChildren();paper.replaceChildren();actions.replaceChildren();
   refreshClock();
   try{
     const data=await request('/api/exams/my');
     if(data.schema!=='jr.jrei.candidate-exams.v1'||!Array.isArray(data.attempts))
       throw Error('SCHEMA_UNAVAILABLE');
     const fragment=document.createDocumentFragment();
     const rows=data.attempts.filter(safeAttempt);
     if(!rows.length)fragment.append(element('p',
       T('هنوز آزمونی به این حساب اختصاص داده نشده است.',
         'No examination has yet been assigned to this account.')));
     for(const entry of rows.slice(0,40)){
       const article=element('article',undefined,'jr-offering');
       article.append(element('h3',
         lang==='fa'?entry.titleFa:(entry.titleEn||entry.titleFa)));
       article.append(element('p',T('وضعیت: ','State: ')+
         String(entry.attemptState).slice(0,32)));
       if(entry.attemptState==='IN_PROGRESS'){
         const button=element('button',T('ادامهٔ آزمون','Resume examination'),'jr-btn');
         button.type='button';
         button.addEventListener('click',()=>openAttempt(entry.attemptId));
         article.append(button);
       }else if(['SUBMITTED','TIMED_OUT'].includes(entry.attemptState)){
         const button=element('button',
           T('بازنمایی نمرهٔ خام اولیه','View preliminary raw grade'),
           'jr-btn secondary');
         button.type='button';
         button.addEventListener('click',async()=>{
           if(busy)return;
           busy=true;button.disabled=true;
           try{
             const data=await request('/api/exams/result?attemptId='+
               encodeURIComponent(entry.attemptId));
             if(data.schema!=='jr.jrei.candidate-preliminary-grade.v1'||
                data.resultStatus!=='VERIFIED_RECOMPUTABLE_RAW_GRADE_NOT_VALIDATED'||
                !data.sourceResponsesVerifiedByDigest||
                !data.originalScoreRunDigestMatched||
                !data.immutableSnapshotDigestMatched||
                !data.rawScorePersistedInMotherDatabase||
                !data.grade||!Number.isSafeInteger(data.grade.rawScoreMillipoints))
               throw Error('GRADE_UNVERIFIED');
             const summary=element('dl');
             for(const [fa,en,value] of [
               ['پاسخ صحیح','Correct',data.grade.correctCount],
               ['پاسخ نادرست','Incorrect',data.grade.incorrectCount],
               ['بی‌پاسخ','Unanswered',data.grade.unansweredCount],
               ['امتیاز خام (هزارم)','Raw millipoints',data.grade.rawScoreMillipoints]
             ]){
               summary.append(element('dt',T(fa,en)),
                 element('dd',fmt.format(value)));
             }
             summary.append(element('p',T(
               'این گزارش فقط جمع‌بندی پاسخ‌هاست؛ رتبه، درصدک یا احتمال قبولی علمی نیست.',
               'This is a raw-response summary, not a percentile, ranking or admission prediction.')));
             article.querySelector('dl')?.remove();
             article.append(summary);
           }catch{
             setStatus(T(
               'کارنامه قابل بازسازی و تأیید نبود؛ دادهٔ حدسی نمایش داده نشد.',
               'The stored score could not be independently reconstructed; no inferred score was shown.'));
           }finally{busy=false;button.disabled=false;}
         });
         article.append(button);
       }else{
         article.append(element('p',T(
           'این آزمون پایان یافته یا در وضعیت غیرقابل ادامه است.',
           'This examination is finished or not currently resumable.')));
       }
       fragment.append(article);
     }
     list.replaceChildren(fragment);
     setStatus(T('سوابق فقط از حساب احرازشدهٔ سرور دریافت شدند.',
       'Only your server-authorized account history is displayed.'));
   }catch{
     setStatus(T(
       'سوابق آزمون در دسترس نیستند یا قابلیت هنوز منتشر نشده است. اطلاعات خصوصی از حافظهٔ مرورگر حدس زده نمی‌شود.',
       'Exam history is unavailable or not released. No private records are inferred from browser storage.'));
   }finally{busy=false;}
 }
 async function openAttempt(id,preferredItemId=null){
   if(busy||!/^[0-9a-f-]{36}$/i.test(id))return;
   busy=true;setStatus(T('در حال بازیابی پاسخ‌های سرور…',
     'Restoring server-saved responses…'));
   try{
     const [progress,published]=await Promise.all([
       request('/api/exams/attempt?attemptId='+encodeURIComponent(id)),
       request('/api/exams/items?attemptId='+encodeURIComponent(id))
     ]);
     if(progress.schema!=='jr.jrei.exam-progress.v1'||
        published.schema!=='jr.jrei.private-published-items.v1'||
        !progress.canResume||!Array.isArray(published.items)||
        progress.attemptId!==published.attemptId||
        progress.responseRevision!==published.responseRevision||
        !Number.isSafeInteger(progress.deadlineAt)||
        !Number.isSafeInteger(progress.serverNow)||
        progress.serverNow<=0||progress.serverNow>=4102444800)
       throw Error('SESSION_REVISION_CHANGED');
     active=id;revision=progress.responseRevision;expireAt=progress.deadlineAt;
     serverClockOffsetMs=progress.serverNow*1000-Date.now();
     recoveryRequired=false;recoveryAttemptId=null;
     items=published.items;
     const restoredIndex=preferredItemId===null?-1:
       items.findIndex(item=>item.itemId===preferredItemId);
     cursor=restoredIndex>=0?restoredIndex:0;selected={};
     for(const row of progress.savedChoices||[])
       if(row&&typeof row.itemId==='string')selected[row.itemId]=row.selectedOptionId;
     list.replaceChildren();renderPaper();
     setStatus(T('فقط پاسخ‌های ذخیره‌شدهٔ سرور بازگردانده شدند.',
       'Only server-saved choices were restored.'));
   }catch{
     recoveryRequired=true;recoveryAttemptId=id;
     active=null;items=[];expireAt=0;paper.replaceChildren();
     actions.replaceChildren();refreshClock();
     setStatus(T('بازیابی آزمون ممکن نشد. بدون تأیید سرور، پاسخ یا وضعیت ذخیره‌شده‌ای ادعا نمی‌شود.',
       'Exam recovery was not authorized. No answer is assumed saved without server confirmation.'));
   }finally{
     // renderPaper() was initially called with busy=true during server
     // restoration. Rebuild its controls after the read succeeds so a
     // valid candidate can actually select a radio and submit answers.
     busy=false;
     if(active&&!recoveryRequired)renderPaper();
   }
 }
 function renderPaper(){
   paper.replaceChildren();actions.replaceChildren();
   if(!active||!items.length)return;
   const item=items[cursor];
   if(!item||!Array.isArray(item.options))return;
   const card=element('section',undefined,'jr-offering');
   card.append(element('p',T('سؤال ','Question ')+fmt.format(cursor+1)+
     T(' از ',' of ')+fmt.format(items.length)));
   card.append(element('h2',String(item.stem||'')));
   const group=element('fieldset');group.append(element('legend',
     T('یک گزینه انتخاب کنید','Select one option')));
   const radios=[];
   for(const opt of item.options){
     const label=element('label',undefined,'jr-candidate-choice');
     const radio=document.createElement('input');
     radio.type='radio';radio.name='item-'+item.itemId;
     radio.value=String(opt.id);radio.disabled=busy;
     radio.checked=selected[item.itemId]===opt.id;
     label.append(radio,element('span',String(opt.text||'')));
     group.append(label);radios.push(radio);
   }
   card.append(group);paper.append(card);
   const previous=element('button',T('قبلی','Previous'),'jr-btn secondary');
   previous.type='button';previous.disabled=cursor===0||busy||recoveryRequired;
   previous.addEventListener('click',()=>{if(busy)return;cursor--;renderPaper();});
   actions.append(previous);
   const next=element('button',T('بعدی','Next'),'jr-btn secondary');
   next.type='button';next.disabled=cursor===items.length-1||busy||recoveryRequired;
   next.addEventListener('click',()=>{if(busy)return;cursor++;renderPaper();});
   actions.append(next);
   const save=element('button',T('ذخیرهٔ انتخاب در سرور','Save selected choice to server'),'jr-btn');
   save.type='button';save.disabled=busy||recoveryRequired;
   save.addEventListener('click',async()=>{
     const option=radios.find(x=>x.checked)?.value??null;
     if(busy||recoveryRequired)return;
     busy=true;save.disabled=true;setStatus(T('در حال ذخیرهٔ امن…','Saving on server…'));
     try{
       const result=await post('save',{attemptId:active,
         itemId:item.itemId,selectedOptionId:option,
         expectedResponseRevision:revision,
         confirmation:'SAVE_EXAM_RESPONSE'});
       if(!result.ok||!Number.isSafeInteger(result.responseRevision))
         throw Error('SAVE_UNCONFIRMED');
       revision=result.responseRevision;selected[item.itemId]=option;
       setStatus(T('ذخیره در سرور تأیید شد.','Server confirmed your saved response.'));
     }catch{
       // A write may have committed despite a lost HTTP response. NEVER
       // repeat the mutation or guess the answer. Read the original server
       // revision and its stored responses before allowing another action.
       recoveryRequired=true;recoveryAttemptId=active;
       setStatus(T(
         'تأیید ذخیره قطع شد؛ در حال بازیابی وضعیت واقعی از سرور…',
         'Save confirmation was lost; recovering the authoritative server state…'));
     }finally{
       busy=false;renderPaper();
       if(recoveryAttemptId)void openAttempt(recoveryAttemptId,item.itemId);
     }
   });
   actions.append(save);
   const submit=element('button',T('ثبت نهایی پاسخ‌ها','Final submission'),'jr-btn');
   submit.type='button';submit.disabled=busy||recoveryRequired;
   submit.addEventListener('click',async()=>{
     if(busy||recoveryRequired||!window.confirm(T(
       'فقط پاسخ‌های ذخیره‌شده در سرور ثبت نهایی می‌شوند. ادامه؟',
       'Only previously server-saved answers will be submitted. Continue?')))return;
     busy=true;submit.disabled=true;
     try{
       const result=await post('submit',{attemptId:active,
         expectedResponseRevision:revision,confirmation:'FINAL_SUBMIT_EXAM'});
       if(!['SUBMITTED','TIMED_OUT'].includes(result.state))
         throw Error('SUBMISSION_UNCONFIRMED');
       recoveryRequired=false;
       active=null;expireAt=0;items=[];paper.replaceChildren();
       actions.replaceChildren();refreshClock();
       setStatus(T(
         'ثبت نهایی توسط سرور تأیید شد. هر نمرهٔ خام اولیه نیازمند سیاست انتشار و بازبینی است.',
         'Server confirmed final submission. Any preliminary raw score remains subject to review and publication policy.'));
       busy=false;
       await loadAttempts();
     }catch{
       // The first submission may already be terminal. Never submit again
       // without reading the canonical account record.
       recoveryRequired=true;
       setStatus(T(
         'نتیجه ثبت نهایی نامشخص است؛ وضعیت را از سرور بازیابی می‌کنیم.',
         'Final submission is unconfirmed; recovering the actual server state.'));
     }finally{
       busy=false;renderPaper();
       if(recoveryRequired)void loadAttempts();
     }
   });
   actions.append(submit);
   refreshClock();
 }
 const refresh=root.querySelector('[data-exam-refresh]');
 refresh?.addEventListener('click',()=>loadAttempts());
 document.addEventListener('visibilitychange',()=>{
   if(document.hidden)return;
   refreshClock();
   if(!busy&&recoveryAttemptId)void openAttempt(recoveryAttemptId);
 });
 // On restored connectivity retry ONLY authenticated reads. Neither
 // submitted answers nor a failed finalization is automatically replayed.
 window.addEventListener('online',()=>{
   if(busy)return;
   if(recoveryAttemptId)void openAttempt(recoveryAttemptId);
   else if(!active)void loadAttempts();
 });
 loadAttempts();
})();
