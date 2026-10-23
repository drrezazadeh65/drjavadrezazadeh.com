/* JREI exams / original TESTLY research source-only MFA owner console.
 * Never enumerates students, prompts, raw exam questions or participant data.
 * The Bertina PHP API is the ONLY authority for saved review status.
 */
(()=>{
 'use strict';
 const root=document.getElementById('ops-jrei-exam-research');
 const workspace=document.getElementById('ops-workspace');
 if(!root||!workspace)return;
 const en=document.documentElement.lang==='en';
 const T=(fa,english)=>en?english:fa;
 const fmt=new Intl.NumberFormat(en?'en-US':'fa-IR');
 const api='/api/admin/operations/jrei-exam-research';
 const state=root.querySelector('[data-jrei-exam-status]');
 const stats=root.querySelector('[data-jrei-exam-facts]');
 const sections=root.querySelector('[data-jrei-exam-sections]');
 const actions=root.querySelector('[data-jrei-exam-actions]');
 const worker=root.querySelector('[data-jrei-exam-worker]');
 const refresh=root.querySelector('[data-jrei-exam-refresh]');
 if(!state||!stats||!sections||!actions||!refresh||!worker)return;
 let generation=0,ctl=null,busy=false;
 const active=()=>root.open&&!workspace.hidden&&!document.hidden&&navigator.onLine;
 const elt=(tag,cls,value)=>{
   const x=document.createElement(tag);
   if(cls)x.className=cls;
   if(value!==undefined)x.textContent=String(value);
   return x;
 };
 const say=x=>state.textContent=x;
 const clearNodes=()=>{
   stats.replaceChildren();sections.replaceChildren();actions.replaceChildren();
   worker.replaceChildren();
 };
 function clear(){
   generation++;ctl?.abort();ctl=null;busy=false;refresh.disabled=false;
   clearNodes();say(T('برای نمایش شواهد، پنل را با احراز دومرحله‌ای باز کنید.',
     'Open this section with fresh MFA to see authoritative evidence.'));
 }
 const safeCount=x=>Number.isSafeInteger(x)&&x>=0?fmt.format(x):T('نامعلوم','Unknown');
 function fact(label,value){
   const card=elt('div','jr-exam-fact');
   card.append(elt('strong','',label),elt('span','',value));
   stats.append(card);
 }
 const displayValue=(key,v)=>{
   if(typeof v==='number')return safeCount(v);
   if(typeof v==='boolean')return v?T('بله','Yes'):T('خیر','No');
   if(v===null||v===undefined||v==='')return T('نامعلوم','Unknown');
   const labels={
     AUTHORITATIVE_REVIEWED:T('منبع با تأیید مستقل','Independently source-reviewed'),
     REQUIRES_SOURCE_REVIEW:T('پوشش هنوز بررسی نشده','Coverage needs source review'),
     PERMISSION_UNVERIFIED:T('مجوز تکثیر تأیید نشده','Copy rights unverified'),
     NO_APPROVED_EVALUATION:T('ارزیابی تأییدشده وجود ندارد','No approved evaluation'),
     NOT_EVALUATED:T('ارزیابی انجام نشده','Not evaluated'),
     UNVALIDATED:T('فاقد اعتبارسنجی تجربی','Not empirically validated'),
     NOT_REVIEWED:T('بازبینی نشده','Unreviewed'),
     DRAFT:T('پیش‌نویس','Draft'),
     THEORETICAL_PROPOSITION:T('گزاره نظری','Theoretical proposition'),
     PROPOSED_OPERATIONAL_INDICATOR:T('شاخص عملیاتی پیشنهادی','Proposed operational indicator'),
     CHALLENGES_PROPOSITION:T('یافته چالش‌برانگیز','Challenges proposition'),
     INCONCLUSIVE:T('نامشخص','Inconclusive')
   };
   return labels[v]||String(v).slice(0,120);
 };
 const columns=[
   {key:'sourceCoverage',fa:'پوشش سال، مقطع و نوع آزمون',
     en:'Source coverage by year, level and examination',fields:['educational_level','exam_category','examination_year','source_count','rights_reviewed_count']},
   {key:'coverageObligations',fa:'منابع مورد انتظار و پاسخ‌نامه‌های بررسی‌نشده',
     en:'Expected exam papers and answer-key gaps',fields:['educational_level','examination_year','expected_kind','requirement_state','count']},
   {key:'sourceReview',fa:'حقوق انتشار و تأیید منابع',
     en:'Source licensing and review status',fields:['review_state','rights_state','count']},
   {key:'intakeStates',fa:'صف گردآوری و پردازش مجاز',
     en:'Lawful discovery and ingestion queue',fields:['result_state','rights_review_state','robots_review_state','count']},
   {key:'itemReviews',fa:'بازبینی سؤال و کیفیت پاسخ‌ها',
     en:'Question and answer review',fields:['item_state','ambiguity_review_state','copyright_review_state','count']},
   {key:'blueprints',fa:'مشخصات رسمی و طرح آزمون',
     en:'Verified examination blueprint status',fields:['status','format_review_state','timing_review_state','scoring_review_state','count']},
   {key:'preparationProgrammes',fa:'برنامه‌های آمادگی آزمون',
     en:'Exam preparation programmes',fields:['status','exam_date_verified','count']},
   {key:'preparationStages',fa:'سه مرحله تشخیصی، پیشرفت و آزمون آزمایشی',
     en:'Diagnostic, progress and final mock stages',fields:['stage_code','status','count']},
   {key:'frameworks',fa:'وضعیت علمی چارچوب‌های TESTLY و Humanability',
     en:'TESTLY and Humanability framework evidence',fields:['framework_code','evidence_maturity','research_status','validated_composite_score','count']},
   {key:'indicatorMaturity',fa:'درجه بلوغ شاخص‌های پژوهشی',
     en:'Research indicator maturity',fields:['evidence_maturity','operational_definition_state','count']},
   {key:'researchProtocols',fa:'پروتکل‌های پژوهشی و مجوزهای اخلاقی',
     en:'Research protocols and ethics review',fields:['research_state','ethics_review_state','guardian_review_status','count']},
   {key:'researchDatasets',fa:'مجموعه‌داده‌های مجاز پژوهش',
     en:'Authorized research datasets',fields:['dataset_state','external_export_approved','count']},
   {key:'researchAnalyses',fa:'نتایج پژوهش، از جمله یافته‌های مخالف',
     en:'Research outcomes including contradictory findings',fields:['interpretation','results_review_state','count']}
 ];
 function viewGroup(def,list,ready){
   const detail=elt('details','jr-exam-subsection');
   detail.append(elt('summary','',T(def.fa,def.en)));
   if(!ready){
     detail.append(elt('p','',T('دیتابیس هنوز تأیید نشده؛ تعدادها نامعلوم است.',
       'Database schema unverified; all values are unknown.')));
   }else if(!Array.isArray(list)||!list.length){
     detail.append(elt('p','',T('هیچ رکورد عملیاتی در این بخش ثبت نشده است.',
       'No operational records have been registered in this area.')));
   }else{
     const ul=elt('ul','jr-exam-rows');
     for(const row of list.slice(0,70)){
       if(!row||typeof row!=='object')continue;
       const li=elt('li','');
       for(const field of def.fields){
         if(!Object.prototype.hasOwnProperty.call(row,field))continue;
         const frag=elt('span','');
         frag.append(elt('strong','',field.replaceAll('_',' ')+': '),
           document.createTextNode(displayValue(field,row[field])));
         li.append(frag);
       }
       ul.append(li);
     }
     detail.append(ul);
   }
   sections.append(detail);
 }
 function renderWorker(snapshot){
   worker.replaceChildren();
   const section=elt('details','jr-exam-subsection');
   section.append(elt('summary','',T(
     'وضعیت نودهای محاسباتی و صف پردازش',
     'Hybrid computing nodes and processing queue')));
   if(!snapshot||snapshot.ok!==true||
      snapshot.schema!=='jr.jrei.hybrid-owner.v1'||
      snapshot.motherDbSchemaReady!==true){
     section.append(elt('p','',T(
       'وضعیت نودها قابل‌تأیید نیست؛ اتصال رایانه ویندوز و توان GPU ادعا نمی‌شود.',
       'Node status is unavailable. No Windows connectivity or GPU performance is claimed.')));
   }else{
     const counts=snapshot.counts||{};
     section.append(elt('p','',T('در صف: ','Queued: ')+safeCount(counts.queued)+
       T(' · در اختیار Worker: ',' · Leased: ')+safeCount(counts.leased)+
       T(' · نیازمند بررسی: ',' · Review required: ')+safeCount(counts.reviewRequired)));
     const nodes=Array.isArray(snapshot.nodes)?snapshot.nodes:[];
     if(!nodes.length){
       section.append(elt('p','',T('نود محاسباتی ثبت نشده است.',
         'No computing node has been registered.')));
     }else{
       const ul=elt('ul','jr-exam-rows');
       for(const node of nodes.slice(0,20)){
         const li=elt('li','');
         const measurements=[
           node.reportedCpuPercent===null?T('CPU نامعلوم','CPU unknown'):
             'CPU '+displayValue('cpu',node.reportedCpuPercent)+'%',
           node.reportedRamPercent===null?T('RAM نامعلوم','RAM unknown'):
             'RAM '+displayValue('ram',node.reportedRamPercent)+'%',
           node.reportedGpuPercent===null?T('GPU نامعلوم','GPU unknown'):
             'GPU '+displayValue('gpu',node.reportedGpuPercent)+'%',
           node.reportedLatencyMs===null?T('تأخیر نامعلوم','latency unknown'):
             T('تأخیر گزارش‌شده: ','reported latency: ')+
             displayValue('latency',node.reportedLatencyMs)+' ms'
         ];
         li.append(elt('strong','',String(node.name||node.providerType||'Node').slice(0,80)),
           elt('span','',T('وضعیت ثبت‌شده: ','Recorded state: ')+
             displayValue('state',node.state)),
           elt('span','',measurements.join(' · ')));
         ul.append(li);
       }
       section.append(ul);
     }
     section.append(elt('p','',T(
       'مصرف CPU/RAM/GPU خوداظهاری Worker است؛ اندازه‌گیری مستقل و پایداری ۲۴ساعته هنوز تأیید نشده.',
       'CPU/RAM/GPU are worker-reported, not independently measured or proof of 24/7 reliability.')));
   }
   worker.append(section);
 }
 function render(snapshot,hybrid=null){
   clearNodes();
   const ready=snapshot.motherDbSchemaReady===true;
   const c=snapshot.controls;
   fact(T('جدول‌های اختصاصی آزمون و پژوهش','Exam and research mother-DB schema'),
     ready?T('شناسایی شده؛ اجرای زنده هنوز تأیید نشده',
       'Found; real operation not independently verified'):
       T('نیازمند Migration نهایی یا ناموجود','Requires approved migration or unavailable'));
   fact(T('گردآوری و تولید خودکار','Automatic discovery and generation'),
     !ready?T('نامعلوم','Unknown'):
       (c?.discoveryEnabled||c?.generationEnabled)
         ?T('سیاست روشن؛ اصالت منابع هنوز باید بررسی شود',
            'Policy enabled; source authenticity not yet independently verified')
         :T('خاموش؛ عملیات آغاز نشده','OFF; no task started'));
   fact(T('تعاریف اصلی TESTLY و Humanability','Original TESTLY/Humanability proposals'),
     T('منابع مؤلف بررسی شده؛ اعتبارسنجی تجربی هنوز انجام نشده',
       'Original author proposals reviewed; empirical validation NOT established'));
   fact(T('اجرای واقعی خزنده و آزمون‌ها','Real crawler and exam execution'),
     T('تأیید نشده','Not verified'));
   fact(T('پژوهش با شرکت‌کنندگان زیر سن قانونی','Research involving minors'),
     T('غیرفعال تا احراز اخلاق و سرپرست قانونی',
       'Disabled until ethics and guardian authorization'));
   for(const def of columns)viewGroup(def,snapshot[def.key],ready);
   renderWorker(hybrid);
   if(ready&&c){
     const explain=elt('p','jr-exam-action-explain',T(
       'توقف اضطراری فقط وظایف آینده را غیرفعال می‌کند؛ پردازش درحال اجرا، داده‌های قبلی یا مجوزهای قانونی را حذف نمی‌کند.',
       'Emergency stop disables future operations only; it cannot undo in-flight work, previous records or legal obligations.'));
     actions.append(explain);
     const pause=elt('button','jr-exam-emergency',T(
       'توقف همه فعالیت‌های آزمون و پژوهش','Stop all exam and research processing'));
     pause.type='button';
     pause.disabled=busy||!(
       c.discoveryEnabled||c.extractionEnabled||c.generationEnabled||
       c.participantEnrolmentEnabled||c.researchProcessingEnabled);
     pause.addEventListener('click',()=>{
       if(!window.confirm(T('تمام عملیات آینده متوقف شوند؟',
         'Disable all future exam and research jobs?')))return;
       mutate({action:'pause_all',policyRevision:c.policyRevision,
         confirmation:'PAUSE_JREI_EXAM_RESEARCH'});
     });
     actions.append(pause);
     const sources=Array.isArray(snapshot.sourceQueue)?snapshot.sourceQueue:[];
     if(sources.length){
       const row=elt('div','jr-exam-source-actions');
       const lbl=elt('label','',T('قرنطینه منبع مشکوک (فقط مدیر)',
         'Quarantine an unverified source (owner only)'));
       const select=elt('select','');
       for(const src of sources.slice(0,20)){
         if(!/^[a-f0-9-]{36}$/i.test(src.source_id||''))continue;
         const option=document.createElement('option');
         option.value=src.source_id;
         option.textContent=(src.source_title||T('منبع بدون عنوان','Untitled source'))
           .slice(0,100)+' · '+displayValue('review_state',src.review_state);
         select.append(option);
       }
       lbl.append(select);
       const stop=elt('button','jr-exam-emergency',T('قرنطینه منبع','Quarantine source'));
       stop.type='button';stop.disabled=!select.options.length;
       stop.addEventListener('click',()=>{
         if(!select.value)return;
         if(!window.confirm(T(
           'با قرنطینه، انتشار و پردازش بعدی این منبع متوقف می‌شود. ادامه؟',
           'Quarantine disables future processing and publication of this source. Continue?')))return;
         mutate({action:'quarantine_source',sourceId:select.value,
           confirmation:'QUARANTINE_UNVERIFIED_EXAM_SOURCE'});
       });
       row.append(lbl,stop);actions.append(row);
     }
   }else{
     actions.append(elt('p','',T(
       'تا احراز دیتابیس و سطح دسترسی مدیر، هیچ کلید عملیاتی فعال نیست.',
       'No owner mutation is available without verified schema and owner access.')));
   }
   say(T('این داده‌ها فقط وضعیت ثبت‌شده در دیتابیس مادر را نشان می‌دهند؛ نمره ساختگی یا تأیید علمی خودکار وجود ندارد.',
     'These are recorded mother-DB metadata only, not fabricated scores or scientific certification.'));
 }
 async function load(){
   if(!active()||busy)return;
   const seq=++generation;
   ctl?.abort();ctl=new AbortController();const request=ctl;
   let timeout=false;const timer=setTimeout(()=>{timeout=true;request.abort();},15000);
   busy=true;refresh.disabled=true;clearNodes();
   say(T('در حال دریافت وضعیت واقعی پوشش آزمون و پژوهش…',
     'Loading real exam coverage and research records…'));
   try{
     const res=await fetch(api,{credentials:'same-origin',cache:'no-store',
       headers:{Accept:'application/json'},signal:request.signal});
     if(!res.ok)throw Error('HTTP');
     const data=await res.json();
     if(seq!==generation||!active())return;
     if(data?.ok!==true||data.schema!=='jr.jrei.exam-research-owner.v1'||
        !Array.isArray(data.sourceCoverage)||!Array.isArray(data.researchAnalyses))
       throw Error('CONTRACT');
     let hybrid=null;
     try{
       const r=await fetch('/api/admin/operations/jrei-hybrid',{
         credentials:'same-origin',cache:'no-store',
         headers:{Accept:'application/json'},signal:request.signal});
       if(r.ok)hybrid=await r.json();
     }catch{ /* Worker metadata is optional; never fabricate status. */ }
     if(seq!==generation||!active())return;
     render(data,hybrid);
   }catch(error){
     if(seq!==generation||!active())return;
     clearNodes();say(timeout
       ?T('مهلت ۱۵ثانیه‌ای دریافت پایان یافت. داده‌های قبلی پاک شدند.',
          'The 15-second read expired. Previous data was cleared.')
       :T('وضعیت قابل تأیید نیست؛ لطفاً احراز دومرحله‌ای و دیتابیس را بررسی کنید.',
          'Status unavailable. Verify MFA and mother-database availability.'));
   }finally{
     clearTimeout(timer);
     if(seq===generation){ctl=null;busy=false;refresh.disabled=false;}
   }
 }
 async function mutate(data){
   if(!active()||busy)return;
   const seq=++generation;
   ctl?.abort();ctl=new AbortController();const request=ctl;
   const timer=setTimeout(()=>request.abort(),18000);
   busy=true;refresh.disabled=true;clearNodes();
   say(T('در حال اعمال محدودیت ایمنی در دیتابیس مادر…',
     'Applying owner safety control in the mother database…'));
   try{
     const r=await fetch('/api/admin/operations/session',{credentials:'same-origin',
       cache:'no-store',headers:{Accept:'application/json'},signal:request.signal});
     if(!r.ok)throw Error('MFA');
     const session=await r.json();
     if(session?.ok!==true||session.mfaRequired!==false||
       !/^[a-f0-9]{64}$/i.test(session.csrfToken||''))throw Error('MFA');
     const saved=await fetch(api,{method:'POST',credentials:'same-origin',
       cache:'no-store',headers:{'Content-Type':'application/json',
        'X-CSRF-Token':session.csrfToken,Accept:'application/json'},
       body:JSON.stringify(data),signal:request.signal});
     if(!saved.ok)throw Error('WRITE');
     const snapshot=await saved.json();
     if(seq!==generation||!active())return;
     if(snapshot?.ok!==true||snapshot.schema!=='jr.jrei.exam-research-owner.v1')
       throw Error('CONTRACT');
     render(snapshot);
   }catch(error){
     if(seq!==generation||!active())return;
     clearNodes();say(T(
       'نتیجه تغییر قطعی نیست؛ ممکن است سرور آن را ثبت کرده باشد. تا تازه‌سازی و تأیید وضعیت دوباره اقدام نکنید.',
       'The mutation might have committed. Do not repeat it without rereading the authoritative server state.'));
   }finally{
     clearTimeout(timer);
     if(seq===generation){ctl=null;busy=false;refresh.disabled=false;}
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
