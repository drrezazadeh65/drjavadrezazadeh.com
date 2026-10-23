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
     CANDIDATE_UNREVIEWED:T('منبع پیشنهادی بدون بررسی مستقل','Unreviewed candidate'),
     SOURCE_CANDIDATE_LINKED_UNREVIEWED:T('منبع پیشنهادی پیوند شد؛ بررسی نشده','Candidate linked; review pending'),
     QUARANTINED:T('قرنطینه شده','Quarantined'),
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
     en:'Source coverage by year, level and examination',fields:['country_code','curriculum_version','educational_level','exam_category','examination_year','subject_id','source_count','rights_reviewed_count']},
   {key:'coverageObligations',fa:'منابع مورد انتظار و پاسخ‌نامه‌های بررسی‌نشده',
     en:'Expected exam papers and answer-key gaps',fields:['country_code','curriculum_id','curriculum_version','educational_level','grade','examination_year','exam_category','subject_id','expected_kind','requirement_state','count']},
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

 function renderCoverageReadiness(snapshot){
   const read=snapshot.coverageReadiness;
   if(!read||read.schema!=='jr.jrei.exam-coverage-readiness.v1'){
     fact(T('جزئیات پوشش و کلید پاسخ','Exam/source-key detail'),
       T('نامعلوم؛ دادهٔ منبع در دسترس نیست','Unknown; source registry not available'));
     return;
   }
   fact(T('منابع ثبت‌شده در دفتر آزمون‌ها','Exam source registry records'),
     read.ready?safeCount(read.totalRows):T('نامعلوم','Unknown'));
   fact(T('درستی علمی کلیدهای پاسخ','Independent answer-key correctness'),
     T('هنوز مستقلاً تأیید نشده','Not independently verified'));
   fact(T('اجازهٔ انتشار بانک سؤال','Question bank public release'),
     T('تأیید نشده؛ انتشار غیرفعال','Unverified; publication blocked'));
   const box=elt('details','jr-exam-subsection');
   box.append(elt('summary','',T('پوشش آزمون‌ها به تفکیک مقطع، سال و کلید پاسخ',
     'Exam coverage by education level, year and answer-key status')));
   box.append(elt('p','',T(
     'تعداد منابع، گواه تأیید کلید پاسخ یا پوشش کامل سال‌ها نیست. وضعیت‌های زیر تنها سوابق واقعی ثبت‌شده در دیتابیس مادر هستند.',
     'Record counts do not certify answer correctness or complete annual coverage. These are only recorded source metadata from the mother database.')));
   if(!read.ready){
     box.append(elt('p','',T(
       'مهاجرت مصوب یا جدول لازم موجود نیست؛ هیچ تعداد صفر ساختگی نمایش داده نمی‌شود.',
       'The approved migration or required table is unavailable; missing values are never treated as zero.')));
     sections.append(box);return;
   }
   const groups=Array.isArray(read.examCoverage)?read.examCoverage:[];
   if(!groups.length)box.append(elt('p','',T(
     'هنوز منبع آزمونی در دفتر ثبت نشده است.',
     'No examination source has yet been registered.')));
   const aggregate=new Map();
   for(const entry of groups){
     const level=String(entry.educationalLevel||'UNKNOWN').slice(0,60);
     const prev=aggregate.get(level)||{total:0,rights:0,keys:new Set()};
     prev.total+=Number.isSafeInteger(entry.sourceCount)?entry.sourceCount:0;
     prev.rights+=Number.isSafeInteger(entry.approvedForPrivateAnalysisCount)?
       entry.approvedForPrivateAnalysisCount:0;
     prev.keys.add(String(entry.answerKeyState||'UNKNOWN').slice(0,64));
     aggregate.set(level,prev);
   }
   for(const [level,r] of aggregate){
     const card=elt('article','jr-exam-coverage-row');
     card.append(elt('strong','',level),
       elt('span','',T('کل منابع اعلامی: ','Declared sources: ')+safeCount(r.total)),
       elt('span','',T('واجد مجوز مطالعهٔ خصوصی طبق رکورد: ',
         'Metadata records permitting private analysis: ')+safeCount(r.rights)),
       elt('span','',T('وضعیت‌های ثبت‌شدهٔ کلید پاسخ: ',
         'Recorded answer-key states: ')+[...r.keys].join(', ')));
     box.append(card);
   }
   if(read.truncated)box.append(elt('p','',T(
     'بیش از ۱۲۰ گروه وضعیت وجود دارد؛ این نمای محدود اثبات پوشش کامل نیست.',
     'Over 120 status groups exist; this bounded view is not comprehensive.')));
   sections.append(box);
 }



 function renderExamCommercialControls(centre,panel){
   const block=elt('details','jr-exam-subsection');
   block.append(elt('summary','',T(
     'محصولات پیش‌نویس و تعلیق اضطراری','Draft products and emergency suspension')));
   block.append(elt('p','',T(
     'ثبت پیش‌نویس، هیچ مجوز خرید یا انتشار صادر نمی‌کند.',
     'Draft creation never enables checkout or publication.')));
   const form=document.createElement('form');
   const input=(parent,label,max=180,type='text')=>{
     const holder=elt('label','',label);
     const ctrl=document.createElement('input');
     ctrl.type=type;ctrl.required=true;ctrl.maxLength=max;
     ctrl.autocomplete='off';holder.append(ctrl);parent.append(holder);
     return ctrl;
   };
   const code=input(form,T('کد محصول (حروف کوچک لاتین)','Lowercase product code'),70);
   code.pattern='[a-z0-9][a-z0-9._-]{2,69}';
   const select=(parent,label,choices)=>{
     const holder=elt('label','',label),control=document.createElement('select');
     for(const [value,title] of choices){
       const option=elt('option','',title);option.value=value;control.append(option);
     }
     holder.append(control);parent.append(holder);return control;
   };
   const division=select(form,T('مقطع','Division'),[
     ['KONKUR',T('کنکور','Undergraduate')],
     ['MASTERS',T('کارشناسی ارشد','Master’s')],
     ['DOCTORAL',T('دکتری','Doctoral')],['SCHOOL',T('مدرسه','School')]]);
   const titleFa=input(form,T('عنوان فارسی','Persian title'));
   const titleEn=input(form,T('عنوان انگلیسی','English title'));
   const blueprint=input(form,T('شناسهٔ طرح آزمون','Blueprint UUID'),36);
   const instrument=input(form,T('شناسهٔ نسخهٔ سنجش','Instrument version UUID'),36);
   const model=input(form,T('شناسهٔ مدل نمره‌دهی','Scoring model UUID'),36);
   const uuid=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
   const create=elt('button','',T('ثبت پیش‌نویس','Create draft product'));
   create.type='submit';form.append(create);
   form.addEventListener('submit',event=>{
     event.preventDefault();if(!active()||busy||!form.reportValidity())return;
     if(![blueprint.value,instrument.value,model.value].every(x=>uuid.test(x)))return;
     if(!window.confirm(T('محصول فقط پیش‌نویس بماند؟',
       'Keep this product DRAFT and not purchasable?')))return;
     mutate({action:'exam_product_draft',code:code.value.trim(),
       division:division.value,titleFa:titleFa.value.trim(),
       titleEn:titleEn.value.trim(),blueprintId:blueprint.value.trim(),
       instrumentVersionId:instrument.value.trim(),
       scoringModelId:model.value.trim(),
       confirmation:'CREATE_UNPUBLISHED_EXAM_DRAFT'});
   });
   const createBox=elt('details','jr-exam-subsection');
   createBox.append(elt('summary','',T('پیش‌نویس جدید','New draft')));
   createBox.append(form);block.append(createBox);
   const products=Array.isArray(centre.productRegistry)?centre.productRegistry:[];
   const drafts=products.filter(p=>p.state==='DRAFT');
   if(drafts.length){
     const offerBox=elt('details','jr-exam-subsection');
     offerBox.append(elt('summary','',T('ایجاد نوبت پیش‌نویس','New draft offering')));
     const of=document.createElement('form');
     const product=select(of,T('محصول پیش‌نویس','Draft parent product'),
       drafts.map(p=>[p.productId,String(p.code).slice(0,70)]));
     const stage=select(of,T('مرحله','Stage'),[
       ['DIAGNOSTIC',T('تشخیصی','Diagnostic')],['PROGRESS',T('پیشرفت','Progress')],
       ['FINAL_MOCK',T('نهایی','Final mock')]]);
     const start=input(of,T('شروع به وقت محلی دستگاه','Start in local device time'),24,'datetime-local');
     const end=input(of,T('پایان به وقت محلی دستگاه','End in local device time'),24,'datetime-local');
     const registration=input(of,T('پایان ثبت‌نام به وقت محلی','Registration close in local time'),24,'datetime-local');
     const duration=input(of,T('مدت به ثانیه','Duration in seconds'),8,'number');
     const max=input(of,T('تعداد تلاش','Attempt limit'),2,'number');
     duration.min='60';duration.max='28800';max.min='1';max.max='10';max.value='1';
     const button=elt('button','',T('ثبت نوبت پیش‌نویس','Create draft offering'));
     button.type='submit';of.append(button);
     of.addEventListener('submit',event=>{
       event.preventDefault();if(!active()||busy||!of.reportValidity())return;
       const convert=x=>Math.floor(Date.parse(x.value)/1000);
       const opensAt=convert(start),closesAt=convert(end),registrationClosesAt=convert(registration);
       if(![opensAt,closesAt,registrationClosesAt].every(Number.isSafeInteger))return;
       if(!window.confirm(T('نوبت فقط پیش‌نویس و بدون فروش باشد؟',
         'Create an unpublished, unpurchasable offering?')))return;
       mutate({action:'exam_offering_draft',productId:product.value,
         stageCode:stage.value,opensAt,closesAt,registrationClosesAt,
         durationSeconds:Number(duration.value),maxAttempts:Number(max.value),
         confirmation:'CREATE_UNPUBLISHED_EXAM_OFFERING'});
     });
     offerBox.append(of);block.append(offerBox);
   }
   for(const p of products){
     const article=elt('article','jr-exam-coverage-row');
     article.append(elt('strong','',String(p.code)+' · '+String(p.state)));
     article.append(elt('span','',String(p.division)+' · '+String(p.titleFa||'')));
     if(p.state!=='SUSPENDED'){
       const stop=elt('button','jr-exam-emergency',T('تعلیق محصول','Suspend product'));
       stop.type='button';stop.addEventListener('click',()=>{
         if(!active()||busy||!window.confirm(T(
           'تعلیق فوری انجام شود؟ حقوق خریداران و بازپرداخت باید جدا بررسی شود.',
           'Suspend now? Buyer obligations and refunds require separate review.')))return;
         mutate({action:'exam_suspend_product',id:p.productId,revision:p.revision,
           confirmation:'SUSPEND_EXAM_WITHOUT_REFUND'});
       });article.append(stop);
     }
     block.append(article);
   }
   const offerings=Array.isArray(centre.offeringRegistry)?centre.offeringRegistry:[];
   for(const o of offerings){
     const row=elt('article','jr-exam-coverage-row');
     row.append(elt('span','',String(o.stageCode)+' · '+String(o.state)+' · '+String(o.offeringId)));
     if(o.state!=='SUSPENDED'){
       const stop=elt('button','jr-exam-emergency',T('تعلیق نوبت','Suspend offering'));
       stop.type='button';stop.addEventListener('click',()=>{
         if(!active()||busy||!window.confirm(T(
           'نوبت متوقف شود؟ تعهدات مالی جداگانه بررسی شوند.',
           'Suspend offering? Resolve financial obligations separately.')))return;
         mutate({action:'exam_suspend_offering',id:o.offeringId,revision:o.revision,
           confirmation:'SUSPEND_EXAM_WITHOUT_REFUND'});
       });row.append(stop);
     }
     block.append(row);
   }
   panel.append(block);
 }

 function renderCommercialCentre(snapshot){
   const centre=snapshot.commercialCentre;
   if(!centre||centre.schema!=='jr.jrei.exam-commercial-owner.v1'){
     fact(T('مرکز تجاری آزمون‌ها','Commercial exam centre'),
       T('آمار معتبر دریافت نشده','No authoritative inventory available'));
     return;
   }
   fact(T('جداول تجاری آزمون','Commercial examination schema'),
     centre.motherDbSchemaReady?
       T('جداول شناسایی شدند؛ پذیرش عملیاتی لازم است','Tables found; operational acceptance required'):
       T('مهاجرت افزایشی اجرا نشده یا نامعلوم','Additive migration pending or unknown'));
   fact(T('مجوز خصوصی بخش تجاری','Commercial feature policy'),
     centre.privateEnabled?
       T('مجوز پیکربندی؛ بدون اجازهٔ فروش','Config opted in, NOT permission to sell'):
       T('خاموش','OFF'));
   fact(T('آمادگی فروش واقعی آزمون','Verified exam checkout readiness'),
     T('تأیید نشده؛ فروش باز نیست','Unverified; checkout disabled'));
   const risk=centre.operationalRisks;
   if(risk){
     fact(T('آزمون‌های منقضی و هنوز تعیین‌تکلیف‌نشده',
       'Expired examinations not yet reconciled'),
       safeCount(risk.unknownExpiredAttempts));
     fact(T('نشست‌های منقضی در انتظار بازبینی انسانی',
       'Expired attempts awaiting human review'),
       safeCount(risk.unfinishedDeadlineReviews));
     fact(T('مجوزهای فعالِ مرتبط با نوبت تعلیق‌شده',
       'Active entitlements tied to suspended examinations'),
       safeCount(risk.activeAccessOnSuspendedExams));
     fact(T('سیاست خصوصی رسیدگی به نشست‌های منقضی',
       'Private unfinished-exam reconciliation policy'),
       risk.deadlineCronPolicyEnabled?
         T('مجوز پیکربندی روشن؛ اجرای Cron هنوز اثبات نشده',
           'Private opt-in ON; actual cron execution unverified'):
         T('خاموش (پیش‌فرض)','OFF by default'));
   }
   const panel=elt('details','jr-exam-subsection');
   panel.append(elt('summary','',
     T('محصولات، نوبت‌ها و تلاش‌های آزمون','Products, scheduled offerings and attempts')));
   panel.append(elt('p','',T(
     'این داده‌ها فقط وضعیت‌های واقعی ثبت‌شده در پایگاه مادر هستند. تعداد سفارش پرداخت‌شده، تسویهٔ بانکی یا نتیجهٔ علمی از این جدول‌ها استنتاج نمی‌شود.',
     'These are only recorded mother-DB states. Bank settlement, authenticated payment, and scientific accuracy cannot be inferred from counts.')));
   if(!centre.motherDbSchemaReady){
     panel.append(elt('p','',T(
       'پس از بررسی نسخهٔ دیتابیس و مجوز انتشار، جداول افزایشی بررسی خواهند شد.',
       'Additive tables await schema review and owner-authorized migration.')));
     sections.append(panel);return;
   }
   const review=centre.itemReviewCoverageAvailable&&
     Array.isArray(centre.itemReviewCoverage)?centre.itemReviewCoverage:null;
   const coverage=elt('div','jr-exam-coverage-row');
   coverage.append(elt('strong','',T('تکمیل داوری سؤال و پاسخ‌نامه به تفکیک حوزه',
     'Independent item and answer-key review coverage')));
   if(review===null){
     coverage.append(elt('span','',T('نامعلوم؛ مسیر بررسی علمی نصب یا آماده نیست',
       'Unknown: the scientific review source is unavailable')));
   }else if(!review.length){
     coverage.append(elt('span','',T('هیچ محصول یا سؤال ثبت نشده است',
       'No exam product or item recorded')));
   }else for(const entry of review){
     const v=String(entry.division||'UNKNOWN').slice(0,32);
     coverage.append(elt('span','',v+' · '+
       T('سؤالات ثبت‌شده: ','Recorded items: ')+safeCount(entry.recordedItemCount)+
       ' · '+T('داوری مستقل: ','Independent reviews: ')+
       safeCount(entry.independentlyReviewedItemCount)+
       ' · '+T('کلید بازبینی‌شده: ','Reviewed keys: ')+
       safeCount(entry.reviewedKeyCount)));
   }
   coverage.append(elt('p','',T(
     'این شمارش فقط بر اساس فرادادهٔ ثبت‌شده است؛ صحت پاسخ، مجوز نشر و روایی آزمون هنوز نیازمند تأیید نهایی‌اند.',
     'Counts reflect registry metadata only, not confirmed answer correctness, publication rights or scientific validity.')));
   panel.append(coverage);
   const release=centre.productReleaseGates;
   if(release&&release.schema==='jr.jrei.product-release-gates.v1'){
     const details=elt('details','jr-exam-subsection');
     details.append(elt('summary','',T(
       'موانع اختصاصی عرضهٔ هر آزمون',
       'Per-product examination release blockers')));
     if(!release.available)details.append(elt('p','',T(
       'اطلاعات علمی محصول در دیتابیس قابل بررسی نیست.',
       'Source-governed product readiness is not observable.')));
     const translation={
       PRODUCT_NOT_PUBLISHED:T('محصول هنوز منتشر نشده','Product not published'),
       COMMERCIAL_REUSE_RIGHTS_NOT_APPROVED:T('مجوز تکثیر تجاری تأیید نشده','Commercial reproduction rights not approved'),
       ANSWER_KEY_REVIEW_NOT_APPROVED:T('بازبینی کلید پاسخ ناقص','Answer-key review incomplete'),
       IMMUTABLE_CONTENT_DELIVERY_NOT_APPROVED:T('تحویل محتوای نسخه‌دار تأیید نشده','Immutable content delivery unaccepted'),
       PRODUCT_REVIEWER_MISSING:T('تأییدکنندهٔ محصول ثبت نشده','Product reviewer missing'),
       INDEPENDENT_BLUEPRINT_REVIEW_MISSING:T('بررسی مستقل طرح آزمون ناقص','Blueprint lacks independent approval'),
       ORIGINAL_INSTRUMENT_VERSION_NOT_APPROVED:T('نسخهٔ اصلی آزمون تأیید نشده','Original instrument version unapproved'),
       QUESTION_COUNT_NOT_ACCEPTED:T('تعداد سؤالات کافی یا مجاز نیست','Question count outside controlled bounds'),
       INCOMPLETE_INDEPENDENT_ITEM_AND_KEY_REVIEW:T('داوری مستقل سؤال و پاسخ‌نامه ناقص','Item and key scientific review incomplete'),
       ORIGINAL_EXAM_DELIVERY_NOT_RELEASED:T('موتور تحویل آزمون هنوز فعال نشده','Original exam delivery not released'),
       LIVE_PURCHASE_AND_END_TO_END_ACCEPTANCE_REQUIRED:T('پذیرش عملی پرداخت و آزمون باقی است','Payment and end-to-end acceptance outstanding')
     };
     const records=Array.isArray(release.items)?release.items:[];
     for(const item of records.slice(0,30)){
       const box=elt('article','jr-exam-coverage-row');
       box.append(elt('strong','',String(item.code||'—').slice(0,70)));
       box.append(elt('span','',
         T('تعداد سؤالات / بررسی‌شده: ','Items / reviewed metadata: ')+
         safeCount(item.recordedItemCount)+' / '+safeCount(item.reviewedItemMetadataCount)));
       const list=elt('ul','jr-exam-rows');
       for(const code of Array.isArray(item.blockers)?item.blockers:[]){
         list.append(elt('li','',translation[code]||String(code).slice(0,90)));
       }
       box.append(list);details.append(box);
     }
     if(release.truncated)details.append(elt('p','',
       T('فقط ۳۰ محصول اخیر فهرست شده‌اند.','Only the latest 30 products are shown.')));
     details.append(elt('p','',T(
       'حتی صفرشدن موانع فراداده، اثبات کیفیت آزمون یا مجوز دریافت وجه نیست.',
       'No metadata-only check establishes scientific quality or payment authorization.')));
     panel.append(details);
   }
   renderExamCommercialControls(centre,panel);
   const access=centre.entitlementGovernance;
   if(access?.schema==='jr.jrei.exam-entitlement-governance.v1'){
     fact(T('مجوزهای فعال در نوبت‌های تعلیق‌شده',
       'Active entitlements on suspended offerings'),
       safeCount(access.exposureCount));
     const monitor=elt('details','jr-exam-subsection');
     monitor.append(elt('summary','',T(
       'تعهدات خریداران و لغو مستند دسترسی',
       'Buyer obligations and audited access revocation')));
     monitor.append(elt('p','',T(
       'بازپرداخت تنها از فرایند مالی اصلی انجام می‌شود؛ این گزارش هیچ پولی منتقل نمی‌کند.',
       'Only the original commerce workflow handles refunds. This view moves no money.')));
     monitor.append(elt('p','',T(
       'مجوز صدور از سفارش واقعی: ','Verified-order policy: ')+
       (access.grantSwitchEnabled?T('مجاز در تنظیمات','Owner opted in'):T('خاموش','OFF'))+
       ' · '+T('پذیرش اتصال SKU به فروشگاه: ','Checkout SKU bridge: ')+
       (access.checkoutBridgeOwnerOptIn?T('مجوز تنظیماتی روشن','Owner opt-in ON'):T('خاموش','OFF'))));
     monitor.append(elt('p','',T(
       'اعلام روشن‌بودن تنظیمات اثبات صحت پرداخت، عرضهٔ واقعی یا صدور مجوز نیست.',
       'Configuration alone is not evidence of a verified purchase, live checkout or entitlement issuance.')));
     const rows=Array.isArray(access.cases)?access.cases:[];
     if(!access.schemaReady)monitor.append(elt('p','',T('جداول قابل مشاهده نیستند','Schema unavailable')));
     for(const entry of rows.slice(0,40)){
       const record=elt('article','jr-exam-coverage-row');
       record.append(elt('strong','',String(entry.productCode||'').slice(0,70)));
       record.append(elt('span','',String(entry.entitlementId||'').slice(0,36)));
       record.append(elt('span','',String(entry.grantReason||'').slice(0,40)));
       if(entry.entitlementState==='ACTIVE'){
         const stop=elt('button','jr-exam-emergency',
           T('تعلیق دسترسی؛ بدون بازپرداخت خودکار',
             'Revoke access, without automatic refund'));
         stop.type='button';
         stop.addEventListener('click',()=>{
           if(!active()||busy||!window.confirm(T(
             'دسترسی قطع شود؟ پاسخ‌ها حفظ می‌شوند؛ تعهدات مالی باید جدا رسیدگی شوند.',
             'Revoke access? Answers remain and buyer obligations require separate review.')))return;
           mutate({action:'exam_revoke_entitlement',
             entitlementId:entry.entitlementId,revision:entry.revision,
             reasonCode:'ASSESSMENT_ACCESS_SUSPENDED',
             confirmation:'REVOKE_EXAM_ACCESS_KEEP_BUYER_RIGHTS'});
         });
         record.append(stop);
       }
       monitor.append(record);
     }
     panel.append(monitor);
   }
   for(const [key,label] of [
     ['productStates',T('محصولات','Products')],
     ['offeringStates',T('نوبت‌های برگزاری','Scheduled offerings')],
     ['entitlementStates',T('مجوزهای دسترسی','Recorded entitlements')],
     ['attemptStates',T('تلاش‌های داوطلب','Candidate attempts')]
   ]){
     const group=elt('div','jr-exam-coverage-row');
     group.append(elt('strong','',label));
     const values=centre[key];
     if(!Array.isArray(values))group.append(elt('span','',T('نامعلوم','Unknown')));
     else if(!values.length)group.append(elt('span','',T('هیچ ردیفی ثبت نشده','No records')));
     else for(const value of values.slice(0,35)){
       const state=String(value.product_state??value.offering_state??
         value.state??value.attempt_state??'UNKNOWN').slice(0,32);
       const division=value.division?String(value.division).slice(0,35)+' / ':'';
       group.append(elt('span','',division+state+' · '+safeCount(value.n)));
     }
     panel.append(group);
   }
   panel.append(elt('p','',T(
     'شروع آزمون، دریافت وجه و صدور مجوز باید تنها از مسیر پرداخت و سنجش موردتأیید سرور انجام شوند.',
     'Exam starts, verified payment and entitlement grants must use the accepted server-owned commerce and assessment flow.')));
   sections.append(panel);
 }



 function renderExpiredExamReviews(snapshot){
   const review=snapshot.examDeadlineReview;
   if(!review||review.schema!=='jr.jrei.deadline-owner-review.v1'){
     fact(T('بازبینی انسانی آزمون‌های منقضی',
       'Expired-exam owner review'),
       T('اطلاعات معتبر گزارش نشده','No authoritative snapshot'));
     return;
   }
   fact(T('پرونده‌های پایان‌یافته و نیازمند بررسی',
     'Expired examination cases awaiting owner disposition'),
     review.available?safeCount(review.pending):T('نامعلوم','Unknown'));
   const panel=elt('details','jr-exam-subsection');
   panel.append(elt('summary','',T(
     'تصمیم‌های مدیریتی دربارهٔ آزمون‌های منقضی',
     'Owner decisions for expired candidate attempts')));
   panel.append(elt('p','',T(
     'بستن پرونده، تصحیح آزمون، حذف پاسخ، تسویه‌حساب یا بازپرداخت نیست؛ تعهدات مالی و آموزشی باید جداگانه بررسی شوند.',
     'Closing a case does not grade the exam, erase answers, reimburse a buyer or resolve service obligations.')));
   if(!review.available){
     panel.append(elt('p','',T(
       'وضعیت جدول نامعلوم است؛ تا پذیرش مهاجرت و سرویس، عملیاتی اجرا نمی‌شود.',
       'Backlog state is unavailable; no action until source and DB acceptance.')));
     sections.append(panel);return;
   }
   const choices=[
     ['CANDIDATE_DISCONNECTED',T('قطع ارتباط داوطلب','Candidate disconnected')],
     ['TIME_EXPIRED',T('پایان مهلت پاسخ‌دهی','Server deadline passed')],
     ['CONTENT_OR_ACCESS_SUSPENDED',T('تعلیق محتوا یا دسترسی','Content/access suspended')],
     ['SERVICE_REVIEW_RECORDED',T('پیگیری خدمات ثبت شده','Service follow-up recorded')]
   ];
   const cases=Array.isArray(review.items)?review.items:[];
   for(const item of cases.slice(0,40)){
     const card=elt('article','jr-exam-coverage-row');
     card.append(elt('strong','',String(item.productCode||'').slice(0,70)));
     card.append(elt('span','',T('شناسهٔ پرونده: ','Case ID: ')+
       String(item.attemptId||'').slice(0,36)));
     card.append(elt('span','',T('زمان پایان: ','Deadline: ')+
       (Number.isSafeInteger(item.deadlineAt)?
         new Date(item.deadlineAt*1000).toLocaleString(en?'en-GB':'fa-IR'):'—')));
     card.append(elt('span','',T('نوع مجوز: ','Grant type: ')+
       String(item.grantReason||'').slice(0,40)));
     const form=document.createElement('form');
     const label=elt('label','',T('دلیل رسیدگی','Recorded disposition reason'));
     const options=document.createElement('select');options.required=true;
     for(const [code,title] of choices){
       const opt=elt('option','',title);opt.value=code;options.append(opt);
     }
     label.append(options);form.append(label);
     const button=elt('button','',T('بستن پرونده بدون نمره‌دهی',
       'Close review without grading'));
     button.type='submit';form.append(button);
     form.addEventListener('submit',event=>{
       event.preventDefault();
       if(!active()||busy||!form.reportValidity())return;
       if(!window.confirm(T(
         'این پرونده بدون محاسبهٔ نمره بسته می‌شود؛ حقوق خریدار و پیگیری خدمات هنوز پابرجاست. تأیید؟',
         'This case will close WITHOUT a grade. Buyer rights and service follow-up remain open. Confirm?')))return;
       mutate({action:'exam_close_expired_review',
         attemptId:item.attemptId,revision:item.revision,
         reasonCode:options.value,
         confirmation:'CLOSE_UNGRADED_EXPIRED_ATTEMPT'});
     });
     card.append(form);panel.append(card);
   }
   if(review.hasMorePossibly)panel.append(elt('p','',
     T('فقط ۴۰ مورد نخست نمایش داده شده است.',
       'Only the first 40 cases are shown.')));
   sections.append(panel);
 }

 function renderKnowledgeAcquisition(snapshot){
   const ka=snapshot.knowledgeAcquisition;
   if(!ka||ka.schema!=='jr.jrei.ka-owner.v1'){
     fact('JREI-KA',T('ثبت وضعیت معتبر انجام نشده','No authoritative state'));
     return;
   }
   fact(T('دفتر صف گردآوری مجاز','Governed acquisition queue'),
     ka.schemaReady?T('موجود در دیتابیس؛ اجرا هنوز نیازمند پذیرش',
       'Database tables present; execution not accepted'):
       T('نیازمند مهاجرت مصوب','Requires approved additive migration'));
   fact(T('منابع با برنامهٔ بازبینی مصوب','Approved refresh policies'),
     ka.schemaReady?safeCount(ka.approvedSources):T('نامعلوم','Unknown'));
   const root=elt('details','jr-exam-subsection');
   root.append(elt('summary','',T(
     'JREI-KA؛ زمان‌بندی، منابع و کنترل‌های مجاز',
     'JREI-KA authorised sources, schedule and controls')));
   root.append(elt('p','',T(
     'زمان‌بند فرادادهٔ کار را تولید می‌کند. پردازشگر مستقلِ دریافت HTTPS نیز در کد موجود است، اما فقط پس از تأیید مجوز و فعال‌سازی خصوصی کار می‌کند. OCR، صحت علمی و انتشار هنوز جداگانه نیازمند پذیرش‌اند.',
     'The scheduler queues metadata; a separately gated HTTPS acquirer is staged in source. Real fetching requires lawful approval, private opt-in and final acceptance. OCR, scientific review and publication remain separate.')));
   if(!ka.schemaReady){
     root.append(elt('p','',T('جدول‌های افزایشی هنوز برای استفاده آماده نیستند.',
       'Additive mother-DB tables are not yet available.')));
     sections.append(root);return;
   }
   const ctrl=ka.controls;
   const fmt=(n)=>Number.isSafeInteger(n)?safeCount(n):T('نامعلوم','Unknown');
   root.append(elt('p','',T('اجازهٔ خصوصی Cron: ','Private Cron opt-in: ')+
     (ka.privateScheduleOptIn?T('در پیکربندی مجاز','Permitted in configuration'):
       T('خاموش','OFF'))));
   root.append(elt('p','',T('سیاست زمان‌بندی: ','Scheduling policy: ')+
     (ctrl?.schedulingEnabled?T('روشن','Enabled'):T('خاموش','OFF'))+
     ' · '+T('سیاست گردآوری: ','Acquisition policy: ')+
     (ctrl?.acquisitionEnabled?T('روشن','Enabled'):T('خاموش','OFF'))));
   if(ctrl){
     root.append(elt('p','',
       T('حد صف: ','Max queue: ')+fmt(ctrl.maxQueueDepth)+
       ' · '+T('حد کار در هر چرخه: ','Per cycle: ')+fmt(ctrl.maxNewTasksPerCycle)));
     root.append(elt('p','',
       T('سهمیهٔ اعلامی روزانه، بایت: ','Configured daily byte budget: ')+
         fmt(ctrl.maxDailyBytes)));
   }
   const acquisition=ka.acquisitionObservability;
   fact(T('اسناد اخذشده و در صف بازبینی علمی','Acquired documents pending scientific review'),
     acquisition?.schemaReady?fmt(acquisition.pendingScientificReview):T('نامعلوم','Unknown'));
   fact(T('پیوندهای PDF کشف‌شده و منتظر بررسی مجوز','PDF links awaiting reuse-rights review'),
     acquisition?.schemaReady?fmt(acquisition.candidatesPendingRightsReview):T('نامعلوم','Unknown'));
   root.append(elt('p','',
     T('سوئیچ خصوصی دریافت خودکار HTTPS: ','Private auto-fetch switch: ')+
     (ka.privateAutoFetchOptIn?T('در پیکربندی روشن؛ اجرای عملی هنوز اثبات نشده',
       'Opt-in ON; actual operation unverified'):T('خاموش','OFF'))));
   if(acquisition?.schemaReady){
     const stats=elt('div','jr-exam-coverage-row');
     stats.append(elt('strong','',T('داده‌های ثبت‌شدهٔ دریافت خصوصی',
       'Actual recorded private acquisition metadata')));
     stats.append(elt('span','',T('مشاهده‌های ثبت‌شده: ','Recorded observations: ')+
       fmt(acquisition.observationCount)));
     stats.append(elt('span','',T('حجم ثبت‌شده به بایت: ','Recorded private bytes: ')+
       fmt(acquisition.recordedBytes)));
     stats.append(elt('span','',T('رزرو پهنای باند امروز به بایت: ',
       'Conservatively reserved bandwidth today, bytes: ')+
       fmt(acquisition.bytesReservedToday)));
     root.append(stats);
     const candidates=Array.isArray(acquisition.sourceCandidatePreview)?
       acquisition.sourceCandidatePreview:[];
     if(candidates.length){
       const proposals=elt('details','jr-exam-subsection');
       proposals.append(elt('summary','',T(
         'اسناد پیشنهادیِ کشف‌شده؛ بدون تأیید خودکار مجوز',
         'Discovered document proposals — rights approval pending')));
       proposals.append(elt('p','',T(
         'این پیوندها هنوز مجوز دانلود، بازنشر یا تبدیل‌شدن به سؤال آزمون را ندارند.',
         'These discoveries do NOT yet authorize retrieval, reproduction or examination use.')));
       for(const proposed of candidates.slice(0,20)){
         const item=elt('article','jr-exam-coverage-row');
         item.append(elt('strong','',String(proposed.label||'').slice(0,220)));
         item.append(elt('span','',String(proposed.state||'').slice(0,70)));
         item.append(elt('span','',String(proposed.url||'').slice(0,650)));
         proposals.append(item);
       }
       root.append(proposals);
     }
   }
   const extraction=ka.extractionObservability;
   fact(T('متن‌های استخراج‌شدهٔ اولیه منتظر داوری',
     'First-pass extracted text awaiting review'),
     extraction?.schemaReady?fmt(extraction.textPendingReview):T('نامعلوم','Unknown'));
   fact(T('فایل‌های PDF یا تصویر نیازمند OCR',
     'Documents awaiting a proper OCR pass'),
     extraction?.schemaReady?fmt(extraction.ocrRequired):T('نامعلوم','Unknown'));
   root.append(elt('p','',
     T('سوئیچ خصوصی استخراج متن: ','Private text extraction switch: ')+
     (ka.privateTextExtractionOptIn?
       T('مجاز در تنظیمات؛ عملکرد واقعی هنوز تأیید نشده',
         'Owner opt-in; actual operation not yet verified'):
       T('خاموش','OFF'))));
   if(extraction?.schemaReady){
     const stats=elt('div','jr-exam-coverage-row');
     stats.append(elt('strong','',T(
       'وضعیت ثبت‌شدهٔ استخراج خصوصیِ متن',
       'Source-recorded private text extraction')));
     for(const [labelFa,labelEn,value] of [
       ['در صف','Queued',extraction.totalQueued],
       ['در حال پردازش','Claimed',extraction.activeClaimed],
       ['نیازمند OCR','Requires OCR',extraction.ocrRequired],
       ['نیازمند بررسی ساختار JSON','Structured review',extraction.structuredReviewRequired],
       ['ناموفق یا وضعیت نامعلوم','Failed/unknown',extraction.failedReviewRequired],
       ['بایت متن خصوصی','Private text bytes',extraction.extractedPrivateBytes]
     ])stats.append(elt('span','',T(labelFa,labelEn)+': '+fmt(value)));
     root.append(stats);
     for(const record of Array.isArray(extraction.languages)?
           extraction.languages.slice(0,10):[]){
       root.append(elt('span','',T('نشانهٔ زبان: ','Language hint: ')+
         String(record.languageHint||'unknown').slice(0,12)+
         ' · '+fmt(record.count)));
     }
     root.append(elt('p','',T(
       'استخراج اولیهٔ متن به معنای OCR، صحت فرمول‌های ریاضی یا داوری علمی نیست.',
       'First-pass text extraction does not establish OCR, mathematical integrity or scientific review.')));
   }
   const passage=ka.passageReviewObservability;
   root.append(elt('p','',
      T('تولید خودکار فرادادهٔ بندهای متن: ','Private passage proposals: ')+
      (ka.privatePassageProposalsOptIn?T('مجوز تنظیماتی روشن','Owner opt-in ON'):
      T('خاموش','OFF'))));
   fact(T('بندهای مستند پیشنهادی منتظر بازبینی مستقل',
     'Proposed source passages awaiting independent review'),
     passage?.schemaReady?fmt(passage.unreviewedSpans):T('نامعلوم','Unknown'));
   if(passage?.schemaReady){
     const sourcePassages=elt('div','jr-exam-coverage-row');
     sourcePassages.append(elt('strong','',
       T('پیشنهادهای مستند؛ بدون انتشار متن','Source passage metadata — private only')));
     sourcePassages.append(elt('span','',
       T('مجموع بندهای انگشت‌نگاری‌شده: ','Fingerprint-only passages: ')+
       fmt(passage.proposedSpans)));
     sourcePassages.append(elt('span','',
       T('مجموع اسناد بخش‌بندی‌شده: ','Segmented documents: ')+
       fmt(passage.runs)));
     sourcePassages.append(elt('span','',
       T('تقسیم‌بندی ناقص، نیازمند بازبینی: ','Incomplete segmentation reviews: ')+
       fmt(passage.incompleteRuns)));
     sourcePassages.append(elt('p','',T(
       'بندهای استخراج‌شده هنوز مدرک تأییدشده برای مدل زبانی نیستند؛ متن و پاسخ علمی به‌طور خودکار عمومی نمی‌شوند.',
       'Private spans do not establish approved retrieval evidence and never publish scholarly claims or copyrighted passages.')));
     root.append(sourcePassages);
   }
   const quotes=ka.publicQuoteOwnerReview;
   fact(T('بندهای خصوصی در انتظار تأیید حق نقل‌قول',
     'Private source passages awaiting public-quote rights review'),
     quotes?.available?fmt(quotes.pendingCount):T('نامعلوم','Unknown'));
   if(quotes?.available){
     const items=Array.isArray(quotes.examples)?quotes.examples.slice(0,8):[];
     if(items.length){
       const pane=elt('details','jr-exam-subsection');
       pane.append(elt('summary','',T(
         'بازبینی مستقل مجوز نقل‌قول برای هوش مصنوعی',
         'Independent public-quote licensing review')));
       pane.append(elt('p','',T(
         'این صفحه فقط برای مدیر است. تأیید نقل‌قول، صحت علمی پاسخ تولیدشده را تأیید نمی‌کند.',
         'This owner-only review certifies licensed quotation, NOT model interpretation or scientific truth.')));
       for(const item of items){
         const card=elt('article','jr-exam-coverage-row');
         card.append(elt('strong','',String(item.sourceTitle||'').slice(0,240)));
         card.append(elt('p','',String(item.excerpt||'').slice(0,650)));
         card.append(elt('span','',
           T('هش متن اصلی: ','Original passage SHA: ')+String(item.passageSha256||'')));
         const form=document.createElement('form');
         const label=elt('label','',T(
           'SHA-256 شاهد بازبینی مستقل (۶۴ رقم هگز)',
           'Independent review evidence SHA-256 (64 hex characters)'));
         const evidence=document.createElement('input');
         evidence.type='text';evidence.required=true;
         evidence.maxLength=64;evidence.minLength=64;
         evidence.pattern='[a-f0-9]{64}';evidence.autocomplete='off';
         label.append(evidence);form.append(label);
         const decision=document.createElement('select');
         for(const [value,fa,en] of [
           ['REJECT_PUBLIC_QUOTE','رد درخواست نقل‌قول','Reject public quotation'],
           ['APPROVE_PUBLIC_QUOTE','تأیید مجوز نقل‌قول، نه ادعای علمی','Approve quote rights, not scientific claims']
         ]){
           const option=elt('option','',T(fa,en));
           option.value=value;decision.append(option);
         }
         const decisionLabel=elt('label','',T('تصمیم بازبینی','Review decision'));
         decisionLabel.append(decision);form.append(decisionLabel);
         const button=elt('button','jr-btn secondary',T(
           'ثبت تصمیم مستند','Record reviewed decision'));
         button.type='submit';form.append(button);
         form.addEventListener('submit',ev=>{
           ev.preventDefault();
           if(!active()||busy||!form.reportValidity())return;
           if(decision.value==='APPROVE_PUBLIC_QUOTE'&&!item.licensedForPublicQuote){
             window.alert(T('مجوز تکثیر عمومی موجود نیست.',
               'Public-reproduction licence is not available.'));
             return;
           }
           if(!window.confirm(T(
             'فقط حق نشر و اصالت نقل‌قول بررسی شده است؛ صحت علمی تفسیر مدل جداگانه بررسی خواهد شد. ادامه؟',
             'This reviews quotation provenance and reuse rights only; model interpretation still needs independent validation. Continue?')))return;
           mutate({action:'ka_review_public_quote',
             passageId:item.passageId,
             excerptSha256:item.passageSha256,
             rightsEvidenceSha256:item.rightsEvidenceSha256,
             independentReviewEvidenceSha256:evidence.value,
             decision:decision.value,
             confirmation:'REVIEW_LICENSED_QUOTE_NOT_SCIENTIFIC_TRUTH'});
         });
         card.append(form);pane.append(card);
       }
       if(quotes.truncated)pane.append(elt('p','',T(
         'تنها هشت مورد اول نمایش داده شده است.',
         'Only the first eight cases are displayed.')));
       root.append(pane);
     }
   }
   const pairing=ka.paperKeyProposals;
   fact(T('تطبیق‌های اولیهٔ دفترچه و پاسخ‌نامه در انتظار داوری',
     'Exam paper and answer key matches awaiting independent review'),
     pairing?.schemaReady?fmt(pairing.unreviewedPairCount):T('نامعلوم','Unknown'));
   if(pairing?.schemaReady){
     const review=elt('div','jr-exam-coverage-row');
     review.append(elt('strong','',T(
       'تطبیق منبع و پاسخ‌نامه فقط بر اساس فراداده',
       'Source-only answer-key matching, without grading rights')));
     review.append(elt('span','',T('پیشنهادها: ','Proposals: ')+
       fmt(pairing.sourceMatchProposalCount)));
     review.append(elt('span','',T('دفترچه‌های با چند پاسخ‌نامهٔ محتمل: ',
       'Papers with competing candidate keys: ')+fmt(pairing.ambiguousPapers)));
     review.append(elt('p','',T(
       'تطبیق سال و درس، صحت گزینه‌ها را اثبات نمی‌کند. داوری انسانی و بررسی اصلاحیه‌های رسمی الزامی است.',
       'Year/subject matching does not prove key correctness; expert verification and official corrections are required.')));
     root.append(review);
     const cases=Array.isArray(pairing.exceptionQueue)?
       pairing.exceptionQueue.slice(0,20):[];
     if(cases.length){
       const queue=elt('details','jr-exam-subsection');
       queue.append(elt('summary','',T(
         'اختلاف‌های تطبیق دفترچه و پاسخ‌نامه؛ بررسی استثناها',
         'Paper/key matching exceptions for owner review')));
       queue.append(elt('p','',T(
         'تأیید فراداده در این مرحله، صحت گزینه‌ها یا انتشار تجاری را تأیید نمی‌کند.',
         'Metadata triage does not certify answers or authorize commercial publication.')));
       for(const entry of cases){
         const card=elt('article','jr-exam-coverage-row');
         card.append(elt('strong','',
           String(entry.paperTitle||'').slice(0,180)));
         card.append(elt('span','',
           T('پاسخ‌نامهٔ پیشنهادی: ','Candidate key: ')+
           String(entry.keyTitle||'').slice(0,180)));
         card.append(elt('span','',
           String(entry.country||'')+' · '+fmt(entry.year)+' · '+
           String(entry.subject||'').slice(0,90)));
         const controls=elt('div','jr-exam-actions');
         for(const [decision,fa,en] of [
           ['META_CONFIRMED_NEEDS_CONTENT_REVIEW',
             'تطبیق فراداده؛ ادامهٔ بررسی محتوایی',
             'Metadata matched; require answer-content review'],
           ['REJECTED_METADATA_MISMATCH',
             'رد پیشنهاد تطبیق','Reject candidate match']
         ]){
           const control=elt('button','jr-btn secondary',T(fa,en));
           control.type='button';
           control.addEventListener('click',()=>{
             if(!active()||busy||!window.confirm(T(
               'فقط تصمیم اداریِ تطبیق ثبت شود؛ هنوز هیچ کلیدی تأیید علمی نمی‌شود. تأیید؟',
               'Record metadata triage only; no answer key is scientifically accepted. Continue?')))return;
             mutate({action:'ka_triage_paper_key',
               candidateId:entry.candidateId,decision,
               confirmation:'TRIAGE_KEY_CANDIDATE_WITHOUT_SCIENTIFIC_APPROVAL'});
           });
           controls.append(control);
         }
         card.append(controls);queue.append(card);
       }
       if(pairing.queueTruncated)queue.append(elt('p','',
         T('فقط ۲۰ پروندهٔ نخست نمایش داده می‌شود.',
           'Only the first 20 exception cases are shown.')));
       root.append(queue);
     }
   }
   root.append(elt('p','',T(
     'مجوز خصوصی تطبیق پاسخ‌نامه: ','Private key matching policy: ')+
     (pairing?.ownerProposalPolicy?T('مجوز تنظیماتی روشن','Owner opt-in ON'):
       T('خاموش','OFF'))));
   const quote=ka.publicQuoteOwnerReview;
   fact(T('بندهای مستندِ منتظر بررسی حق نقل عمومی',
     'Passage quotations awaiting legal independent review'),
     quote?.available?fmt(quote.pendingCount):T('نامعلوم','Unknown'));
   if(quote?.available){
     const queue=elt('details','jr-exam-subsection');
     queue.append(elt('summary','',T(
       'داوری مستقلِ حقوق نقل‌قول مستند',
       'Independent review of quotation provenance and reuse rights')));
     queue.append(elt('p','',T(
       'تأیید در این مرحله فقط اجازهٔ استفادهٔ محدود از نقل‌قول است و صحت پاسخ‌های هوش مصنوعی را اثبات نمی‌کند.',
       'This decision approves limited quote use only, NOT model correctness or scientific validity.')));
     for(const source of Array.isArray(quote.examples)?quote.examples.slice(0,8):[]){
       const item=elt('article','jr-exam-coverage-row');
       item.append(elt('strong','',String(source.sourceTitle||'').slice(0,220)));
       item.append(elt('p','',String(source.excerpt||'').slice(0,900)));
       const form=document.createElement('form');
       const label=elt('label','',T(
         'SHA-256 سند بازبینی مستقل حقوق استفاده',
         'Independent quotation-rights review evidence SHA-256'));
       const digest=document.createElement('input');
       digest.type='text';digest.required=true;
       digest.pattern='[a-f0-9]{64}';digest.maxLength=64;
       digest.placeholder='64 hex';
       label.append(digest);form.append(label);
       for(const [decision,fa,en] of [
          ['APPROVE_PUBLIC_QUOTE','تأیید محدود نقل‌قول؛ نه صحت علمی',
           'Approve limited quotation, NOT factual validation'],
          ['REJECT_PUBLIC_QUOTE','رد استفادهٔ عمومی از بند','Reject public quotation']]){
         const button=elt('button','jr-btn secondary',T(fa,en));
         button.type='submit';button.value=decision;
         button.addEventListener('click',()=>{form.dataset.decision=decision;});
         form.append(button);
       }
       form.addEventListener('submit',event=>{
         event.preventDefault();
         if(!active()||busy||!form.reportValidity()||
            !window.confirm(T(
              'سند اصلی و حق نقل‌قول بررسی شده است؟ این تصمیم هیچ پاسخ علمی را تأیید نمی‌کند.',
              'Original rights and quote reviewed? This does not validate any scientific claim.')))return;
         mutate({action:'ka_review_public_quote',
           passageId:source.passageId,
           excerptSha256:source.passageSha256,
           rightsEvidenceSha256:source.rightsEvidenceSha256,
           independentReviewEvidenceSha256:digest.value,
           decision:form.dataset.decision||'REJECT_PUBLIC_QUOTE',
           confirmation:'REVIEW_LICENSED_QUOTE_NOT_SCIENTIFIC_TRUTH'});
       });
       item.append(form);queue.append(item);
     }
     if(quote.truncated)queue.append(elt('p','',
       T('فقط ۸ پروندهٔ نخست نمایش داده شده‌اند.',
         'Only first eight review cases shown.')));
     root.append(queue);
   }
   const states=Array.isArray(ka.jobStates)?ka.jobStates:[];
   const snapshotBox=elt('div','jr-exam-coverage-row');
   snapshotBox.append(elt('strong','',T('وضعیت واقعی کارهای ثبت‌شده',
     'Recorded queue states')));
   if(!states.length)snapshotBox.append(elt('span','',
     T('کاری در جدول موجود نیست','No recorded jobs')));
   else for(const r of states)
     snapshotBox.append(elt('span','',String(r.state).slice(0,30)+
       ' · '+fmt(r.count)));
   root.append(snapshotBox);
   const policies=Array.isArray(ka.sourcePolicies)?ka.sourcePolicies:[];
   for(const p of policies.slice(0,40)){
     const item=elt('article','jr-exam-coverage-row');
     item.append(elt('strong','',String(p.sourceTitle||p.sourceId).slice(0,130)));
     item.append(elt('span','',String(p.sourceId)+
       ' · '+String(p.priorityTier)+' · '+String(p.state)));
     item.append(elt('span','',T('دورهٔ بازبینی، ثانیه: ','Refresh interval seconds: ')+
       fmt(p.refreshIntervalSeconds)));
     item.append(elt('span','',T('حقوق استفاده/robots/transport: ',
       'Rights/robots/transport: ')+
       [p.rightsReviewed,p.robotsTermsReviewed,p.transportReviewed].map(x=>x?'✓':'—').join(' / ')));
     if(p.state==='PENDING_REVIEW'){
       const proposal=elt('details','jr-exam-subsection');
       proposal.append(elt('summary','',T(
         'ثبت شواهد سه‌گانه و تأیید منبع',
         'Approve source only after three documented reviews')));
       const form=document.createElement('form');
       const reviews=[
         ['rightsEvidenceSha256',T('هش سند بررسی حقوق استفاده','Reuse-rights review SHA-256')],
         ['robotsEvidenceSha256',T('هش بررسی robots و شرایط سایت','Robots/terms review SHA-256')],
         ['transportEvidenceSha256',T('هش بررسی ایمنی دریافت','Transport security review SHA-256')]
       ];
       const inputs={};
       for(const [name,label] of reviews){
         const row=elt('label','',label),input=document.createElement('input');
         input.required=true;input.pattern='[a-f0-9]{64}';
         input.maxLength=64;input.minLength=64;input.dir='ltr';
         input.autocomplete='off';input.spellcheck=false;
         row.append(input);form.append(row);inputs[name]=input;
       }
       const submit=elt('button','',
         T('تأیید فقط بعد از بررسی واقعی','Approve after independent review'));
       submit.type='submit';form.append(submit);
       form.addEventListener('submit',event=>{
         event.preventDefault();if(!active()||busy||!form.reportValidity())return;
         if(!window.confirm(T(
           'آیا ناشر، مجوز، robots و ایمنی HTTPS واقعاً جداگانه بررسی و مستند شده‌اند؟',
           'Have issuer, rights, robots and HTTPS safety actually been independently reviewed and documented?')))return;
         mutate({action:'ka_approve_source',sourceId:p.sourceId,revision:p.revision,
           rightsEvidenceSha256:inputs.rightsEvidenceSha256.value.trim(),
           robotsEvidenceSha256:inputs.robotsEvidenceSha256.value.trim(),
           transportEvidenceSha256:inputs.transportEvidenceSha256.value.trim(),
           confirmation:'APPROVE_VERIFIED_PUBLIC_KA_SOURCE'});
       });
       proposal.append(form);item.append(proposal);
     }
     if(p.state==='APPROVED'||p.state==='PENDING_REVIEW'){
       const stop=elt('button','jr-exam-emergency',
         T('تعلیق این منبع','Suspend source'));
       stop.type='button';
       stop.addEventListener('click',()=>{
         if(!window.confirm(T('صف آیندهٔ این منبع متوقف شود؟',
           'Cancel pending future tasks for this source?')))return;
         mutate({action:'ka_suspend_source',sourceId:p.sourceId,
           revision:p.revision,confirmation:'SUSPEND_KA_SOURCE'});
       });
       item.append(stop);
     }
     root.append(item);
   }
   if(ctrl){
     const stop=elt('button','jr-exam-emergency',
       T('توقف زمان‌بندی و دریافت آینده','Disable future scheduling and acquisition'));
     stop.type='button';
     stop.disabled=!ctrl.schedulingEnabled&&!ctrl.acquisitionEnabled;
     stop.addEventListener('click',()=>{
       if(!window.confirm(T('همهٔ کارهای در صف لغو شوند؟ اجرای نامعلوم تکرار نخواهد شد.',
         'Cancel queued tasks? Unknown in-flight work is never automatically replayed.')))return;
       mutate({action:'ka_set_controls',policyRevision:ctrl.policyRevision,
         schedulingEnabled:false,acquisitionEnabled:false,
         confirmation:'SET_KA_OWNER_POLICY'});
     });
     root.append(stop);
   }
   sections.append(root);
 }


 function renderLiveModelReadiness(snapshot){
   const ai=snapshot.liveAiReadiness;
   if(!ai||ai.schema!=='jr.jrei.owner-live-model-readiness.v1'){
     fact(T('موتور استنتاج زندهٔ JREI','JREI real-model inference'),
       T('آمار معتبر دریافت نشد','No authoritative status received'));
     return;
   }
   fact(T('اتصال واقعی مدل ابری','Real cloud model source status'),
     ai.serverProviderConfigured?
       T('کلید و تنظیمات شناسایی شدند؛ پذیرش عملیاتی باقی است',
         'Server credentials and policy configured; operational proof pending'):
       T('غیرفعال یا بدون مجوز','OFF or not configured'));
   fact(T('رزرو درخواست مدل در روز جاری','Cloud-model calls reserved today'),
     ai.reservedToday?safeCount(ai.reservedToday.calls):
       T('نامعلوم؛ مهاجرت مصوب لازم است','Unknown; approved migration pending'));
   const observed=ai.observedProviderOutcomes;
   fact(T('پاسخ‌های تکمیل‌شدهٔ ثبت‌شده (۷ روز)',
       'Recorded completed provider responses (7 days)'),
     observed?.schemaReady?safeCount(observed.providerReportedCompleted):
       T('نامعلوم؛ جدول پایش هنوز آماده نیست','Unknown; telemetry schema missing'));
   fact(T('میانگین زمان پاسخ ثبت‌شده (میلی‌ثانیه)',
       'Recorded mean response time, milliseconds'),
     observed?.schemaReady&&Number.isSafeInteger(observed.meanObservedLatencyMs)?
       safeCount(observed.meanObservedLatencyMs):
       T('نامعلوم؛ هنوز دادهٔ معتبر نداریم','Unknown; no measured outcome'));
   const box=elt('details','jr-exam-subsection');
   box.append(elt('summary','',T(
     'وضعیت حقیقی اتصال مدل و سهمیه‌های JREI',
     'Real JREI model provider and budget readiness')));
   box.append(elt('p','',T(
     'این آمار فقط تنظیمات سرور و رزرو محافظه‌کارانهٔ سهمیه است. صحت مدل، هزینهٔ دلاری و پاسخ‌دهی زنده تا اجرای واقعی و پذیرش پایانی نامعلوم‌اند.',
     'This is server policy and conservative quota reservation ONLY. Actual quality, USD spend and live inference are unknown until final acceptance.')));
   const lines=[
      [T('سوئیچ خصوصی استنتاج','Private inference policy'),ai.privateRuntimeOptIn?'ON':'OFF'],
      [T('مدل ثبت‌شده در تنظیمات','Configured model'),ai.approvedModelLabel||'—'],
      [T('پذیرش مستقلِ انتشار دستیار عمومی','Independent public AI release gate'),
        ai.separatePublicReleaseAccepted?
          T('تنظیم روشن؛ آزمون نهایی باید تأیید شده باشد','Owner configuration ON; requires accepted final QA'):
          T('خاموش؛ دستیار ثابت حفظ می‌شود','OFF; static guide preserved')],
      [T('فراخوانی‌های ناموفق ثبت‌شده','Recorded failed provider calls'),
        observed?.schemaReady?safeCount(observed.providerReportedFailed):T('نامعلوم','Unknown')],
      [T('توکن ورودی گزارش‌شدهٔ ارائه‌دهنده','Provider-reported input tokens'),
        observed?.schemaReady?safeCount(observed.providerReportedInputTokens):T('نامعلوم','Unknown')],
      [T('توکن خروجی گزارش‌شدهٔ ارائه‌دهنده','Provider-reported output tokens'),
        observed?.schemaReady?safeCount(observed.providerReportedOutputTokens):T('نامعلوم','Unknown')],
      [T('استفاده‌های بدون گزارش توکن','Calls without reported usage'),
        observed?.schemaReady?safeCount(observed.usageUnknownCount):T('نامعلوم','Unknown')],
      [T('جدول بودجهٔ مادر','Mother DB quota schema'),
        ai.providerBudgetSchemaReady?T('مشاهده شد','Present'):T('نامعلوم/نیازمند مهاجرت','Unknown/pending')],
      [T('حد درخواست روزانه','Daily request ceiling'),safeCount(ai.quotas?.maxCallsPerDay)],
      [T('سقف ورودی رزرو‌شده','Reserved daily input token ceiling'),
        safeCount(ai.quotas?.inputTokenReservationCap)],
      [T('سقف خروجی رزرو‌شده','Reserved daily output token ceiling'),
        safeCount(ai.quotas?.outputTokenReservationCap)],
      [T('استنتاج مستقل اثبات‌شده','Verified provider inference'),
        ai.actualProviderInferenceProven?T('دارای شاهد','Evidenced'):T('اثبات نشده','Not established')],
      [T('اعتبارسنجی علمی مدل','Independently accepted quality'),
        ai.modelQualityIndependentlyAccepted?T('دارای شاهد','Evidenced'):T('اثبات نشده','Not established')],
      [T('هزینهٔ واقعی و P95','Verified USD cost and P95 latency'),
        T('نامعلوم تا پذیرش واقعی','Unknown before actual acceptance')]
   ];
   for(const [label,value] of lines){
     const row=elt('div','jr-exam-coverage-row');
     row.append(elt('strong','',label),elt('span','',String(value)));
     box.append(row);
   }
   sections.append(box);
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
   renderCoverageReadiness(snapshot);
   renderCommercialCentre(snapshot);
   renderExpiredExamReviews(snapshot);
   renderKnowledgeAcquisition(snapshot);
   renderLiveModelReadiness(snapshot);
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
     // A missing-paper *research intent* is not an authenticated official
     // source. Each owner entry persists as REQUIRES_SOURCE_REVIEW only.
     const coverage=elt('details','jr-exam-subsection');
     coverage.append(elt('summary','',T(
       'ثبت نیاز بررسی آزمون و پاسخ‌نامه (فقط فراداده)',
       'Register an examination/answer-key coverage target (metadata only)')));
     coverage.append(elt('p','',T(
       'هیچ سؤال، پاسخ‌نامه یا تاریخ رسمی از این فرم تأیید یا منتشر نمی‌شود. فقط نیاز بررسی ثبت خواهد شد.',
       'This action neither verifies nor publishes any official question, key or date; it only registers a review target.')));
     const form=document.createElement('form');form.className='jr-exam-coverage-form';
     const field=(name,title,kind='text')=>{
       const lbl=elt('label','',title);
       const input=document.createElement('input');
       input.name=name;input.type=kind;input.required=true;
       input.maxLength=100;
       lbl.append(input);form.append(lbl);return input;
     };
     const choose=(name,title,options)=>{
       const lbl=elt('label','',title);
       const input=document.createElement('select');
       input.name=name;
       for(const [value,label] of options){
         const opt=document.createElement('option');
         opt.value=value;opt.textContent=label;input.append(opt);
       }
       lbl.append(input);form.append(lbl);return input;
     };
     const country=field('country',T('کد کشور (مانند IR)','Country code, e.g. IR'));
     country.value='IR';country.minLength=2;country.maxLength=2;
     const curriculum=field('curriculum',T('شناسه برنامه درسی','Curriculum identifier'));
     const version=field('version',T('نسخه برنامه درسی','Curriculum version'));
     const level=choose('level',T('مقطع','Education level'),[
       ['PRIMARY',T('دبستان ۱ تا ۶','Primary 1–6')],
       ['LOWER_SECONDARY',T('متوسطه اول ۷ تا ۹','Lower secondary 7–9')],
       ['UPPER_SECONDARY',T('متوسطه دوم ۱۰ تا ۱۲','Upper secondary 10–12')],
       ['UNDERGRADUATE_ENTRANCE',T('کنکور کارشناسی','Undergraduate entrance')],
       ['MASTERS_ENTRANCE',T('آزمون کارشناسی ارشد','Master’s entrance')],
       ['DOCTORAL_ENTRANCE',T('آزمون دکتری','Doctoral entrance')],
       ['UNIVERSITY_ADVANCED',T('آزمون دانشگاهی','University advanced')]
     ]);
     const grade=choose('grade',T('پایه تحصیلی','School grade'),[]);
     const categories=[
       ['SCHOOL_INTERNAL',T('امتحان داخلی','School examination')],
       ['NATIONAL_FINAL',T('امتحان نهایی','National final')],
       ['NATIONAL_ENTRANCE',T('کنکور کارشناسی','National entrance')],
       ['MASTERS_ENTRANCE',T('آزمون ارشد','Master’s entrance')],
       ['DOCTORAL_ENTRANCE',T('آزمون دکتری','Doctoral entrance')],
       ['UNIVERSITY_COURSE',T('ارزیابی دانشگاهی','University course')],
       ['ADVANCED_ACADEMIC',T('ارزیابی پیشرفته','Advanced academic')]
     ];
     const category=choose('category',T('نوع آزمون','Examination category'),categories);
     const subject=field('subject',T('شناسه درس یا رشته','Subject/discipline identifier'));
     const year=field('year',T('سال برگزاری','Examination year'),'number');
     year.min='1300';year.max='2400';year.step='1';year.value='';
     const kind=choose('kind',T('نوع منبع مورد انتظار','Expected source kind'),[
       ['EXAM_PAPER',T('دفترچه سؤال','Examination paper')],
       ['ANSWER_KEY',T('کلید پاسخ','Answer key')],
       ['MARKING_SCHEME',T('راهنمای تصحیح','Marking scheme')],
       ['CURRICULUM_BLUEPRINT',T('جدول مشخصات','Curriculum blueprint')],
       ['EXAMINATION_GUIDANCE',T('راهنمای آزمون','Examination guidance')]
     ]);
     const updateGrade=()=>{
       grade.replaceChildren();
       const values=level.value==='PRIMARY'?[1,2,3,4,5,6]
         :level.value==='LOWER_SECONDARY'?[7,8,9]
         :level.value==='UPPER_SECONDARY'?[10,11,12]:[];
       for(const value of values){
         const option=document.createElement('option');
         option.value=String(value);option.textContent=fmt.format(value);
         grade.append(option);
       }
       grade.disabled=!values.length;
       category.value=level.value==='MASTERS_ENTRANCE'
         ?'MASTERS_ENTRANCE':level.value==='DOCTORAL_ENTRANCE'
         ?'DOCTORAL_ENTRANCE':level.value==='UNDERGRADUATE_ENTRANCE'
         ?'NATIONAL_ENTRANCE':level.value==='UNIVERSITY_ADVANCED'
         ?'UNIVERSITY_COURSE':'SCHOOL_INTERNAL';
     };
     level.addEventListener('change',updateGrade);updateGrade();
     const register=elt('button','',T('ثبت نیاز بررسی (بدون تأیید رسمی)',
       'Register review target (NOT official approval)'));
     register.type='submit';form.append(register);
     form.addEventListener('submit',event=>{
       event.preventDefault();
       if(!active()||busy||!form.reportValidity())return;
       const countryCode=country.value.trim().toUpperCase();
       const examYear=Number(year.value);
       const input={
         action:'register_coverage_target',
         level:level.value,grade:grade.disabled?null:Number(grade.value),
         countryCode,curriculumId:curriculum.value.trim(),
         curriculumVersion:version.value.trim(),
         examCategory:category.value,examYear,
         subjectId:subject.value.trim(),expectedKind:kind.value,
         confirmation:'REGISTER_UNVERIFIED_EXAM_COVERAGE'
       };
       if(!window.confirm(T(
          'این مورد فقط به‌عنوان «نیازمند بررسی منبع» در دیتابیس مادر ثبت شود؟',
          'Register this metadata-only item as requiring source review?')))return;
       mutate(input);
     });
     coverage.append(form);actions.append(coverage);
     // Link a *candidate* URI to an independently registered coverage need.
     // HTTPS metadata is saved privately but never fetched or designated
     // copyright-cleared, official, or scientifically approved by this form.
     const openTargets=Array.isArray(snapshot.coverageTargets)
       ?snapshot.coverageTargets:[];
     if(openTargets.length){
       const candidate=elt('details','jr-exam-subsection');
       candidate.append(elt('summary','',T(
         'ثبت منبع پیشنهادی برای نیاز بررسی‌شده (بدون دریافت فایل)',
         'Link a candidate source to an open review target (no download)')));
       candidate.append(elt('p','',T(
         'آدرس HTTPS صرفاً برای بررسی آینده در دیتابیس خصوصی ثبت می‌شود. مجوز استفاده، اصالت کلید، حق تکثیر و انتشار هنوز تأیید نشده‌اند. آدرس دارای توکن یا اطلاعات خصوصی وارد نکنید.',
         'HTTPS source location is stored privately for later review only. This does not certify the issuer, answer key, copyright or publication rights. Never enter URL tokens or personal information.')));
       const sourceForm=document.createElement('form');
       sourceForm.className='jr-exam-coverage-form';
       const targetLabel=elt('label','',T('نیاز بررسی که منبع به آن پیوند می‌خورد',
         'Open review target receiving the candidate'));
       const targetSelect=document.createElement('select');
       targetSelect.name='coverageRequirementId';
       for(const needed of openTargets.slice(0,40)){
         if(!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i
           .test(needed.requirement_id||''))continue;
         const opt=document.createElement('option');
         opt.value=needed.requirement_id;
         opt.textContent=[
           needed.educational_level,needed.grade||'',
           needed.examination_year,needed.subject_id,needed.expected_kind
         ].filter(Boolean).join(' · ').slice(0,220);
         targetSelect.append(opt);
       }
       targetLabel.append(targetSelect);sourceForm.append(targetLabel);
       const sourceInput=(name,title,{type='text',max=240,required=true}={})=>{
         const label=elt('label','',title);
         const inp=document.createElement('input');
         inp.name=name;inp.type=type;inp.required=required;
         inp.maxLength=max;
         label.append(inp);sourceForm.append(label);return inp;
       };
       const sourceTitle=sourceInput('sourceTitle',T(
         'عنوان منبع پیشنهادی','Candidate publication title'));
       const issuer=sourceInput('issuerId',T(
         'شناسه نهاد منتشرکننده (نیازمند تأیید)','Claimed issuer identifier'),
         {max:100});
       const sourceVersion=sourceInput('sourceVersion',T(
         'نسخه یا ویرایش اعلام‌شده منبع','Candidate edition/version'),{max:100});
       const sourceUrl=sourceInput('candidateUrl',T(
         'نشانی HTTPS بدون پارامتر، رمز یا اطلاعات فردی',
         'HTTPS URL without query, credentials or personal information'),
         {type:'url',max:1200});
       sourceUrl.pattern='https://.*';
       const date=sourceInput('publicationDate',T(
         'تاریخ انتشار (اختیاری؛ در صورت اطلاع)','Publication date (optional if known)'),
         {type:'date',max:10,required:false});
       const submit=elt('button','',T(
         'ثبت منبع نامعتبر تا زمان بررسی مستقل',
         'Register unreviewed source candidate'));
       submit.type='submit';submit.disabled=!targetSelect.options.length;
       sourceForm.append(submit);
       sourceForm.addEventListener('submit',event=>{
         event.preventDefault();
         if(!active()||busy||!sourceForm.reportValidity()||
            !targetSelect.value)return;
         const url=sourceUrl.value.trim();
         try{
           const parsed=new URL(url);
           if(parsed.protocol!=='https:'||parsed.username||parsed.password||
             parsed.search||parsed.hash||parsed.port)
             throw Error('UNSAFE_URL');
         }catch{
           say(T('برای حفاظت از اطلاعات، فقط نشانی عمومی HTTPS بدون پارامتر پذیرفته می‌شود.',
             'Only plain public HTTPS addresses without tokens or query are permitted.'));
           return;
         }
         if(!window.confirm(T(
           'فقط فراداده منبع ثبت شود؛ هیچ مدرک دانلود یا تأیید علمی نمی‌شود. ادامه؟',
           'Save source metadata only, without download or scientific approval?')))return;
         mutate({
           action:'register_source_candidate',
           coverageRequirementId:targetSelect.value,
           sourceTitle:sourceTitle.value.trim(),issuerId:issuer.value.trim(),
           sourceVersion:sourceVersion.value.trim(),
           candidateUrl:url,publicationDate:date.value||null,
           confirmation:'REGISTER_UNREVIEWED_SOURCE_CANDIDATE'
         });
       });
       candidate.append(sourceForm);actions.append(candidate);
     }else{
       actions.append(elt('p','',ready?T(
         'هیچ نیاز بررسیِ بدون منبع ثبت نشده است. ابتدا نیاز بررسی دفترچه یا پاسخ‌نامه را ثبت کنید.',
         'No unlinked review target exists. Register an exam-paper/answer-key review target first.'):
         T('تا زمان آماده‌شدن دیتابیس، ثبت منبع ممکن نیست.',
           'Source candidate registration is unavailable until the schema is ready.')));
     }
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
