/* Owner scientific systems readiness — evidence-backed, read-only and fail-closed.
 * No student/guardian records, scores, drafts or payments are loaded.
 */
(()=>{'use strict';
 const workspace=document.getElementById('ops-workspace');
 const panel=document.getElementById('ops-scientific-readiness');
 if(!workspace||!panel||!workspace.contains(panel))return;
 const status=panel.querySelector('[data-science-status]');
 const results=panel.querySelector('[data-science-results]');
 const refresh=panel.querySelector('[data-science-refresh]');
 if(!status||!results||!refresh)return;
 const en=document.documentElement.lang==='en',t=(fa,english)=>en?english:fa;
 let epoch=0,controller=null;
 function clear(message=''){
  epoch++;controller?.abort();controller=null;
  results.replaceChildren();results.hidden=true;status.textContent=message;refresh.disabled=false;
 }
 function element(tag,cls,value){
  const node=document.createElement(tag);if(cls)node.className=cls;
  if(value!==undefined)node.textContent=String(value);return node;
 }
 function item(title,description,lines,link){
  const article=element('article','jr-science-system');
  article.append(element('h3','',title),element('p','jr-science-desc',description));
  const details=element('dl','jr-science-details');
  for(const [name,value] of lines){
   const dt=element('dt','',name),dd=element('dd','',value);
   details.append(dt,dd);
  }
  article.append(details);
  const anchor=element('a','jr-science-link',t('مشاهده صفحه موجود','Open existing page'));
  anchor.href=link;article.append(anchor);
  return article;
 }
 function state(value,ifTrue,ifFalse){
  return value===true?ifTrue:ifFalse;
 }
 async function reload(){
  if(workspace.hidden||!panel.open)return;
  clear(t('در حال بررسی وضعیت پنج سامانه و نشست مدیر…',
    'Checking five systems and administrator session…'));
  const mark=epoch;const abort=new AbortController();controller=abort;refresh.disabled=true;
  try{
   const options={method:'GET',credentials:'same-origin',cache:'no-store',
    headers:{Accept:'application/json'},signal:abort.signal};
   const auth=await fetch('/api/admin/operations/session',options);
   const session=await auth.json();
   if(!auth.ok||session.ok!==true||session.mfaRequired!==false||!session.mfaExpiresIn)
    throw Error('admin_mfa_required');
   const response=await fetch('/api/golden-talent/health',options);
   const data=await response.json();
   if(!response.ok||data.ok!==true||data.service!=='golden-talent'||data.readOnly!==true)
    throw Error('scientific_health_unavailable');
   if(mark!==epoch||workspace.hidden||!panel.open)return;
   // Existing owner MFA JHELA endpoint: policy evidence, not operational proof.
   let jhela=null;
   try{
     const journal=await fetch('/api/admin/operations/jhela/maturity',options);
     if(journal.ok){
       const document=await journal.json();
       if(document?.ok===true &&
          document.schema==='jhela-owner-maturity-snapshot-v1' &&
          document.editorial?.platform==='first_party_native')jhela=document;
     }
   }catch(_ignored){/* unavailable journal evidence is not inferred */}
   if(mark!==epoch||workspace.hidden||!panel.open)return;
   const science=data.scientificContinuity||{};
   const rcas=data.rcasStart||{},bahar=data.baharReadiness||{};
   const protectedSystem=data.protectedSystem||{};
   const items=[
    item('RCAS',t('شروع توصیفی؛ بدون استنباط استعداد و بدون ذخیره پاسخ در سرور',
     'Descriptive start; no aptitude inference or server-side response storage'),[
      [t('حالت','Mode'),rcas.mode||t('تأیید نشده','Unverified')],
      [t('تعداد گزاره‌ها','Core items'),Number.isInteger(rcas.coreItemCount)?String(rcas.coreItemCount):'—'],
      [t('نمره هنجاری','Normative scoring'),state(rcas.normativeScoring,t('اعلام شده','Reported on'),t('غیرفعال / تأیید نشده','Disabled / not verified'))],
      [t('ثبت پاسخ در سرور','Server storage'),state(rcas.serverResponseStorage,t('اعلام شده','Reported on'),t('غیرفعال / تأیید نشده','Disabled / not verified'))]
     ],en?'/en/golden-talent/assessment/':'/fa/assessments/golden-talent/start/'),
    item('Golden Talent',t('موتور مسیر‌دهی شواهد پیش‌اعتبارسنجی؛ D1 تا D6، بدون امتیاز کلی',
     'Research evidence-routing engine, six domains, no global talent score'),[
      [t('قرارداد علمی','Scientific contract'),science.prevalidationContract||'—'],
      [t('نسخه پژوهشی','Research engine'),science.nodeEngineVersion||'—'],
      [t('آداپتور اجرایی PHP','Live PHP adapter'),state(science.productionScientificAdapterActive,t('فعال گزارش شده','Reported active'),t('غیرفعال / تأیید نشده','Inactive / unverified'))],
      [t('اعتبار علمی روان‌سنجی','Psychometric validation'),state(science.psychometricValidationEstablished,t('تأیید گزارش شده','Reported validated'),t('تأیید نشده','Not validated'))]
     ],en?'/en/golden-talent/':'/fa/golden-talent/'),
    item('BAHAR',t('چرخه یادگیری و بازبینی انسانی؛ بدون نتیجه‌گیری علت و معلولی',
     'Human-reviewed longitudinal learning cycles without causal claims'),[
      [t('ساختار دیتابیس','Database column check'),state(bahar.bertinaMysqlSchemaColumnsAvailable,t('ساختار موجود؛ آزمون پذیرش لازم','Columns present; acceptance pending'),t('تأیید نشده','Not verified'))],
      [t('API ذخیره چرخه‌ها','Cycle persistence API'),state(bahar.weeklyCycleAndEvidenceApiActive,t('فعال گزارش شده','Reported active'),t('غیرفعال / تأیید نشده','Inactive / unverified'))],
      [t('مجوز مشاهده سرپرست','Guardian consent API'),state(bahar.consentScopedPortfolioAccessActive,t('فعال گزارش شده','Reported active'),t('غیرفعال / تأیید نشده','Inactive / unverified'))],
      [t('بازبینی حرفه‌ای','Professional review API'),state(bahar.professionalReviewApiActive,t('فعال گزارش شده','Reported active'),t('غیرفعال / تأیید نشده','Inactive / unverified'))]
     ],en?'/en/golden-talent/dashboard/bahar/':'/fa/app/student/bahar/'),
    item('Studio',t('تأمل درباره مسیر تحصیلی و سواد سنجش؛ نه آزمون استعداد',
     'In-memory study choice and assessment literacy reflection, not diagnosis'),[
      [t('وضعیت داده‌ها','Data state'),science.studioReflectionState||t('تأیید نشده','Not verified')],
      [t('صدور خودکار مسیر','Automatic Golden Path release'),state(science.automaticTalentScoreEnabled,t('نیازمند توقف و بررسی','Investigate unsafe state'),t('غیرفعال / تأیید نشده','Disabled / not verified'))],
      [t('مجوز خرید خودکار','Automatic purchase entitlement'),state(science.automaticPurchaseEntitlementEnabled,t('نیازمند توقف و بررسی','Investigate unsafe state'),t('غیرفعال / تأیید نشده','Disabled / not verified'))]
     ],en?'/en/student-guidance/':'/fa/entekhab-reshteh/'),
     item('JHELA',t('سامانه تحریریه بومی؛ پذیرش، داوری و نمایه‌سازی فقط با شواهد مستقل',
       'Native editorial system; intake, review and indexing require independent evidence'),[
       [t('معماری','Architecture'),jhela?.editorial?.platform||t('تأیید نشده','Unverified')],
       [t('سیاست دریافت مقاله','Intake policy'),jhela?.editorial?.submissionPolicy||t('نامعلوم','Unknown')],
       [t('داوری علمی مستقل','Independent peer review'),jhela?.editorial?.reviewWorkflow||t('تأیید نشده','Unverified')],
       [t('مراحل دارای گواهی مستقل','Independently evidenced milestones'),
         Number.isInteger(jhela?.evidenceReview?.verifiedStageCount)
           ?String(jhela.evidenceReview.verifiedStageCount)+' / 10':t('بدون شاهد','No evidence')],
       [t('نمایه‌سازی مستند','Verified indexing'),
         Array.isArray(jhela?.verifiedIndexClaims)&&jhela.verifiedIndexClaims.length
           ?t('نیازمند بررسی مستقل','Independent review required'):t('تأیید نشده','Unverified')]
     ],'/journal/')
   ];
   results.append(...items);
   results.hidden=false;
   status.textContent=t('نمای واقعی قابلیت‌ها بارگذاری شد؛ اعلام ساختار به معنی تأیید علمی یا فعال‌شدن پرونده خصوصی نیست.',
    'Actual capability declarations loaded. Schema readiness is not scientific validation or private-record activation.');
  }catch(error){
   if(mark===epoch&&!workspace.hidden&&panel.open){
    results.replaceChildren();results.hidden=true;
    status.textContent=t('وضعیت عملیاتی تأیید نشد: ','Readiness could not be verified: ')+String(error.message||'unavailable');
   }
  }finally{if(mark===epoch){controller=null;refresh.disabled=false;}}
 }
 refresh.addEventListener('click',reload);
 panel.addEventListener('toggle',()=>panel.open?reload():clear());
 workspace.addEventListener('jr:operations-locked',()=>{clear();panel.open=false;});
 new MutationObserver(()=>{if(workspace.hidden)clear();}).observe(workspace,{attributes:true,attributeFilter:['hidden']});
 window.addEventListener('pagehide',()=>clear());
 document.addEventListener('visibilitychange',()=>{if(document.hidden)clear();});
})();
