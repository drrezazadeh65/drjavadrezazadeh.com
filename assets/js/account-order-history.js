/* Private purchase history. No localStorage, client cache or payment inference. */
(()=>{'use strict';
const host=document.querySelector('[data-resource="orders"]');
if(!host)return;
const section=host.querySelector('.case-section .appointment-card.empty');
if(!section)return;
const isEn=document.documentElement.lang==='en';
const tr=(fa,en)=>isEn?en:fa;
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=String(text);if(cls)n.className=cls;return n;};
const format=n=>new Intl.NumberFormat(isEn?'en-US':'fa-IR').format(n);
function showInfo(message,login){
  section.replaceChildren();
  const wrapper=el('div');wrapper.append(el('strong',message));
  if(login){const a=el('a',tr('ورود به حساب تأییدشده','Sign in to your verified account'),'button primary');
    a.href=isEn?'/en/login/':'/fa/login/';wrapper.append(a);}
  section.append(wrapper);
}
const SERVICE_BRIEF_PROMPTS={
 "academic_consult_60": [
  "تصمیم دانشگاهی مورد نظر، مهلت آن و گزینه‌هایی که تاکنون بررسی شده‌اند را مشخص کنید.",
  "State the academic decision, its deadline, and the alternatives already considered."
 ],
 "student_parent_90": [
  "مسئله را از نگاه دانش‌آموز و والد به‌صورت جداگانه و بدون قضاوت نهایی شرح دهید.",
  "Explain the issue from both the student's and the parent's perspectives without prematurely choosing a side."
 ],
 "konkur_consult_60": [
  "وضعیت فعلی آمادگی کنکور، برنامه مطالعه و مسئله فوری تصمیم را روشن کنید.",
  "Describe current entrance-exam preparation, existing study routines and the immediate decision."
 ],
 "konkur_month": [
  "هدف یک‌ماهه، زمان در دسترس و داده‌ای که با آن پیشرفت سنجیده می‌شود را بنویسید.",
  "Specify the one-month objective, realistic study time and evidence used to review progress."
 ],
 "transcript_analysis": [
  "بازه زمانی و نظام نمره‌دهی کارنامه، هدف تحلیل و محدودیت‌های تفسیر آن را توضیح دهید.",
  "Identify the transcript period and grading system, the decision it informs and any interpretive limits."
 ],
 "field_selection_standard": [
  "ترجیح رشته و دانشگاه، شرایط احراز و محدودیت‌های مکانی یا خانوادگی را توضیح دهید.",
  "Explain preferred disciplines and universities, verified eligibility and location or family constraints."
 ],
 "field_selection_comprehensive": [
  "تعارض ترجیحات، انتخاب‌های اصلی و معیارهای اولویت‌بندی را با نمونه روشن کنید.",
  "Identify competing priorities, leading options and the criteria for comparing them."
 ],
 "talent_initial": [
  "تجربه‌های مشاهده‌شده، علاقه‌های فرد و پرسش واقعی خانواده درباره مسیر رشد را بیان کنید.",
  "Describe observed experiences, the learner's interests and the family's actual developmental question."
 ],
 "golden_talent_comprehensive": [
  "منابع شواهد آموزشی و رشدی، ابهام‌ها و هدف تصمیم را بدون برچسب‌زنی به فرد شرح دهید.",
  "Outline developmental and learning evidence, uncertainties and the decision context without fixed talent labels."
 ],
 "golden_talent_premium": [
  "دلیل نیاز به جلسه والد و گزارش مسیر، داده‌های موجود و پرسش‌های باز را شرح دهید.",
  "Explain the need for a parent consultation and pathway report, including available evidence and unanswered questions."
 ],
 "teacher_consult_60": [
  "مسئله کلاس، هدف یادگیری، ویژگی زبان‌آموزان و شواهد تدریس را توصیف کنید.",
  "Describe the teaching challenge, learning objective, learner context and available classroom evidence."
 ],
 "teacher_dev_90": [
  "مسئله حرفه‌ای تکرارشونده، تجربه‌های انجام‌شده و شاخص تغییر مطلوب را بیان کنید.",
  "Identify a recurring professional problem, previous responses and signs of desired improvement."
 ],
 "manuscript_diagnostic": [
  "پرسش پژوهش، رشته، نوع مقاله، محدودیت واژگان و نگرانی‌های روش یا استدلال را مشخص کنید.",
  "State the research question, discipline, manuscript type, word limit and methodological or argument concerns."
 ],
 "academic_editing": [
  "رشته علمی، مخاطب نشریه، گونه انگلیسی ترجیحی و محدوده تغییر مجاز را مشخص کنید.",
  "Specify the discipline, target readership, preferred English variety and limits on editorial changes."
 ],
 "research_consult_60": [
  "طرح و سؤال پژوهش، روش یا داده موجود و محل دقیق ابهام را شرح دهید.",
  "Summarise the research question, design or existing data and the exact methodological uncertainty."
 ],
 "journal_strategy": [
  "موضوع و نوع مقاله، نشریات مدنظر و معیار واقعی انتخاب مجله را بیان کنید.",
  "Describe topic and article type, candidate journals and genuine journal-selection criteria."
 ],
 "reviewer_response": [
  "نظرهای داوران، نسخه فعلی اصلاحات و مواردی که با استدلال مخالفت دارید را خلاصه کنید.",
  "Summarise reviewer comments, revisions made and points of evidence-based disagreement."
 ],
 "academic_cv": [
  "نوع فرصت دانشگاهی، رزومه واقعی و شواهد مرتبط با معیارهای اعلام‌شده را معرفی کنید.",
  "State the target academic role, verifiable CV record and evidence aligned with the published criteria."
 ],
 "academic_interview_90": [
  "عنوان جایگاه، حوزه دانشگاهی، سوابق مستند و محورهای مصاحبه را روشن کنید.",
  "Provide the role, academic field, documented achievements and interview focus."
 ],
 "organization_consult_90": [
  "مسئله سازمانی، ذی‌نفعان، محدودیت اجرا و معیارهای سنجش موفقیت را توضیح دهید.",
  "Describe the institutional problem, stakeholders, implementation constraints and meaningful success criteria."
 ],
 "specialist_workshop_120": [
  "گروه شرکت‌کنندگان، هدف یادگیری، مدت و نتیجه عملی قابل انتظار را مشخص کنید.",
  "Describe the participants, learning objectives, session duration and expected practical outputs."
 ]
};
function serviceIntakeEditor(order,service){
 const disclosure=el('details');disclosure.className='service-intake-editor';
 disclosure.style.cssText='margin-top:13px;padding:12px;border:1px solid rgba(212,175,55,.35);border-radius:12px;max-width:100%';
 disclosure.append(el('summary',tr('ثبت یا اصلاح شرح محرمانه خدمت','Submit or revise your private service brief')));
 const region=el('div');region.setAttribute('aria-live','polite');disclosure.append(region);
 let revision=0,loaded=false,loading=false;
 const field=(label,tag,min,max,rows)=>{
  const wrap=el('label',label);wrap.style.cssText='display:grid;gap:7px;margin:12px 0';
  const input=document.createElement(tag);input.required=true;
  input.minLength=min;input.maxLength=max;
  input.style.cssText='width:100%;min-height:45px;padding:10px;border-radius:8px;font:inherit;background:#141414;color:#f8f5e9;border:1px solid #b6a16a;box-sizing:border-box';
  if(rows)input.rows=rows;
  wrap.append(input);return {wrap,input};
 };
 const form=el('form');form.style.cssText='display:grid;gap:9px;margin-top:13px';
 const subject=field(tr('موضوع سفارش و مسئله اصلی','Service topic and main question'),'input',8,180);
 const background=field(tr('زمینه، وضعیت موجود و شواهد مرتبط','Background, current situation and relevant evidence'),'textarea',20,3500,5);
 const objectives=field(tr('هدف دقیق و خروجی مورد انتظار','Specific objectives and expected deliverable'),'textarea',20,3000,4);
 const specificId=String(service.sku||'').replace(/^(service|vip):/,'');
 const guidance=Object.hasOwn(SERVICE_BRIEF_PROMPTS,specificId)?SERVICE_BRIEF_PROMPTS[specificId]:null;
 if(guidance){
  const note=el('p',tr(guidance[0],guidance[1]),'service-intake-context');
  note.style.cssText='margin:0 0 12px;padding:12px 15px;border:1px solid rgba(212,175,55,.3);border-radius:12px;background:#242019;color:#f8e6c1;line-height:1.8';
  form.append(note);
  background.input.placeholder=tr('شرح شواهد و زمینه مرتبط با راهنمای بالا','Relevant evidence and context for the question above');
  objectives.input.placeholder=tr('نتیجه‌ای که باید به‌صورت قابل‌توضیح تحویل شود','The practical, explainable outcome you expect');
 }
 form.append(subject.wrap,background.wrap,objectives.wrap);
 const minor=el('label');minor.style.cssText='display:flex;align-items:center;gap:9px;margin-top:8px';
 const minorCheck=document.createElement('input');minorCheck.type='checkbox';
 minor.append(minorCheck,el('span',tr('این درخواست درباره فرد زیر ۱۸ سال است.','The service concerns someone under 18.')));
 const guardian=el('label');guardian.style.cssText='display:flex;align-items:center;gap:9px';
 const guardianCheck=document.createElement('input');guardianCheck.type='checkbox';
 guardian.append(guardianCheck,el('span',tr('ولی یا سرپرست قانونی هستم و مسئولیت ثبت این درخواست را می‌پذیرم.','I am the parent or legal guardian authorised to make this request.')));
 guardian.hidden=true;
 minorCheck.addEventListener('change',()=>{guardian.hidden=!minorCheck.checked;
   guardianCheck.required=minorCheck.checked;if(!minorCheck.checked)guardianCheck.checked=false;});
 const consent=el('label');consent.style.cssText='display:flex;align-items:start;gap:9px;margin-top:8px';
 const consentCheck=document.createElement('input');consentCheck.type='checkbox';consentCheck.required=true;
 consent.append(consentCheck,el('span',tr(
  'با استفاده محرمانه از این توضیحات صرفاً برای بررسی و اجرای خدمت خریداری‌شده موافقم. نام، رمز عبور یا مدارک محرمانه را اینجا وارد نمی‌کنم.',
  'I agree to the private use of this brief solely to coordinate the purchased service. I will not enter passwords, personal identity documents or sensitive files here.'
 )));
 const note=el('p',tr(
  'این فرم فقط متن را به‌صورت رمزنگاری‌شده ثبت می‌کند؛ بارگذاری مدارک از این بخش انجام نمی‌شود. تأیید سرپرستی توسط این گزینه به‌تنهایی احراز هویت مستقل نیست.',
  'This form stores encrypted text only, not documents. Checking guardian consent is not independent verification of guardianship.'
 ),'ops-muted');
 const save=el('button',tr('ذخیره محرمانه شرح خدمت','Save encrypted service brief'),'button');
 save.type='submit';
 const result=el('p');result.setAttribute('role','status');
 form.append(minor,guardian,consent,note,save,result);
 region.append(form);
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(!loaded||loading||!form.reportValidity())return;
  if(minorCheck.checked&&!guardianCheck.checked)return;
  if(!window.confirm(tr(
   'شرح خدمت فقط در پرونده سفارش خودتان ذخیره شود؟ این کار به معنای تحویل یا شروع خودکار خدمت نیست.',
   'Save this brief in your private order? It does not start or certify fulfilment automatically.'
  )))return;
  loading=true;save.disabled=true;result.textContent=tr('در حال ذخیره امن…','Encrypting and saving your brief…');
  try{
   const payload={orderId:order.id,sku:service.sku,expectedRevision:revision,
    subject:subject.input.value.trim(),background:background.input.value.trim(),
    objectives:objectives.input.value.trim(),isMinor:minorCheck.checked,
    guardianAcknowledged:guardianCheck.checked,privacyAcknowledged:consentCheck.checked};
   const response=await fetch('/api/commerce/service-intake',{
    method:'POST',credentials:'same-origin',cache:'no-store',
    headers:{'Content-Type':'application/json','Accept':'application/json'},
    body:JSON.stringify(payload)});
   const data=await response.json();
   if(!response.ok||data?.ok!==true||data.schema!=='private-service-intake-v1'
      ||data.saved!==true||!Number.isSafeInteger(data.revision))throw Error('not_saved');
   revision=data.revision;consentCheck.checked=false;
   result.textContent=tr('شرح خدمت با موفقیت و به‌صورت محرمانه ثبت شد. نسخه: ','Encrypted brief saved. Revision: ')+revision;
  }catch(_){
   result.textContent=tr('ذخیره تأیید نشد؛ برای جلوگیری از بازنویسی اطلاعات، ابتدا فرم را ببندید و دوباره بارگذاری کنید.',
    'Save not confirmed. To avoid overwriting recent updates, close and reopen this form to refresh.');
   loaded=false;
  }finally{loading=false;save.disabled=false;}
 });
 disclosure.addEventListener('toggle',async()=>{
  if(!disclosure.open||loaded||loading)return;
  loading=true;save.disabled=true;
  result.textContent=tr('در حال دریافت محرمانه اطلاعات سفارش…','Loading your private service brief…');
  try{
   const response=await fetch('/api/commerce/service-intake?order='+encodeURIComponent(order.id)
     +'&sku='+encodeURIComponent(service.sku),{
      method:'GET',credentials:'same-origin',cache:'no-store',
      headers:{Accept:'application/json'}});
   if(!response.ok)throw Error('intake_unavailable');
   const data=await response.json();
   if(data?.ok!==true||data.schema!=='private-service-intake-v1'
      ||!Number.isSafeInteger(data.revision))throw Error('intake_invalid');
   revision=data.revision;
   if(data.intake){
    subject.input.value=String(data.intake.subject||'');
    background.input.value=String(data.intake.background||'');
    objectives.input.value=String(data.intake.objectives||'');
    minorCheck.checked=data.intake.isMinor===true;
    guardianCheck.checked=data.guardianAcknowledged===true;
    guardian.hidden=!minorCheck.checked;guardianCheck.required=minorCheck.checked;
   }
   loaded=true;result.textContent=revision>0?
     tr('نسخه پیشین بازیابی شد؛ اصلاحات پس از ذخیره ثبت می‌شوند.','Previously saved version loaded; edits require saving.'):
     tr('هنوز شرحی ثبت نشده است.','No private brief has been recorded yet.');
  }catch(_){result.textContent=tr(
    'دسترسی به فرم محرمانه تأیید نشد. ورود به حساب، پرداخت تأییدشده و فعال‌بودن پایگاه داده را بررسی کنید.',
    'The private form is unavailable. Check verified sign-in, payment evidence and service storage readiness.');}
  finally{loading=false;save.disabled=!loaded;}
 });
 return disclosure;
}
function serviceFileWorkspace(order,service){
 const box=el('details');box.className='service-private-files';
 box.style.cssText='margin-top:13px;border:1px solid rgba(212,175,55,.35);border-radius:12px;padding:12px;max-width:100%;background:#191918';
 box.append(el('summary',tr('مدارک محرمانه و خروجی تحویل‌شده','Private documents and delivered outputs')));
 const content=el('div');content.style.cssText='margin-top:14px';
 const state=el('p');state.setAttribute('role','status');state.setAttribute('aria-live','polite');
 const files=el('ul');files.style.cssText='list-style:none;padding:0;display:grid;gap:9px';
 const form=el('form');form.style.cssText='margin:18px 0;display:grid;gap:12px';
 const help=el('p',tr(
  'برای ارسال مدارک، فایل PDF یا DOCX حداکثر ۱۲ مگابایت انتخاب کنید. فایل پس از اسکن امنیتی به‌صورت رمزنگاری‌شده در پرونده سفارش ذخیره می‌شود. خروجی مشاور تنها پس از ثبت مستند تحویل قابل دریافت است.',
  'Submit a PDF or DOCX of up to 12 MB. Each upload is scanned and encrypted in your paid-order record. The professional output appears only after evidence-backed delivery is recorded.'
 ),'ops-muted');
 const label=el('label',tr('بارگذاری سند مربوط به این خدمت','Upload a document for this service'));
 label.style.cssText='display:grid;gap:9px';
 const file=document.createElement('input');file.type='file';file.name='document';file.required=true;
 file.accept='.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
 label.append(file);
 const submit=el('button',tr('ارسال رمزنگاری‌شده به پرونده','Securely upload to this case'),'button');
 submit.type='submit';
 const minorFlag=el('label');minorFlag.style.cssText='display:flex;align-items:start;gap:9px';
 const minorCheck=document.createElement('input');minorCheck.type='checkbox';
 minorFlag.append(minorCheck,el('span',tr('این مدرک مربوط به فرد زیر ۱۸ سال است.',
    'This document concerns someone under 18.')));
 const guardianFlag=el('label');guardianFlag.style.cssText='display:flex;align-items:start;gap:9px';
 const guardianCheck=document.createElement('input');guardianCheck.type='checkbox';
 guardianFlag.append(guardianCheck,el('span',tr(
  'در این پرونده، ولی یا سرپرست قانونی هستم و اجازه ارائه مدرک را دارم. این اعلام جایگزین احراز مستقل سرپرستی نیست.',
  'I am the authorised parent or legal guardian for this document. This declaration is not independent verification of guardianship.'
 )));
 guardianFlag.hidden=true;
 minorCheck.addEventListener('change',()=>{guardianFlag.hidden=!minorCheck.checked;
   guardianCheck.required=minorCheck.checked;if(!minorCheck.checked)guardianCheck.checked=false;});
 const privacyFlag=el('label');privacyFlag.style.cssText='display:flex;align-items:start;gap:9px';
 const privacyCheck=document.createElement('input');privacyCheck.type='checkbox';privacyCheck.required=true;
 privacyFlag.append(privacyCheck,el('span',tr(
  'آگاهانه با اسکن امنیتی و ذخیره رمزنگاری‌شده این سند فقط برای بررسی و ارائه همین خدمت موافقت می‌کنم.',
  'I explicitly consent to security scanning and encrypted storage of this document solely for the purchased service.'
 )));
 form.append(label,minorFlag,guardianFlag,privacyFlag,submit);
 content.append(help,state,files);
 if(!['delivered','cancelled'].includes(service.status))content.append(form);
 box.append(content);
 let loading=false,loaded=false;
 async function refresh(){
  if(loading||!box.open)return;
  loading=true;state.textContent=tr('در حال دریافت پرونده خصوصی…','Retrieving your private files…');
  try{
   const url='/api/commerce/service-files?order='+encodeURIComponent(order.id)+'&sku='+encodeURIComponent(service.sku);
   const response=await fetch(url,{method:'GET',credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}});
   if(!response.ok)throw Error('unavailable');
   const data=await response.json();
   if(data?.ok!==true||data.schema!=='private-service-files-v1'||!Array.isArray(data.files))throw Error('invalid_file_list');
   if(!box.open)return;
   files.replaceChildren();
   for(const record of data.files){
    if(!/^[0-9a-f-]{36}$/i.test(String(record.id||'')))continue;
    if(!['client_source','professional_output'].includes(record.kind))continue;
    const li=el('li');li.style.cssText='padding:12px;border:1px solid rgba(212,175,55,.2);border-radius:10px;display:flex;gap:12px;align-items:center;flex-wrap:wrap';
    li.append(el('span',(record.kind==='professional_output'?
     tr('خروجی تخصصی','Professional output'):tr('مدرک شما','Your document'))+' · '+String(record.file_extension||'').toUpperCase()));
    const a=el('a',tr('دریافت امن فایل','Download privately'));
    a.href='/api/commerce/service-file?id='+encodeURIComponent(record.id);
    a.rel='nofollow';a.style.cssText='color:#f5d993;text-underline-offset:4px';
    li.append(a);files.append(li);
   }
   state.textContent=data.files.length?
    tr('فایل‌های قابل‌دسترسی این پرونده نمایش داده شدند.','Authorised files for this case are listed.'):
    tr('هنوز فایلی برای این پرونده ثبت نشده است.','There are no files available for this case yet.');
   loaded=true;
  }catch(_){
   state.textContent=tr('سامانه امن فایل هنوز پاسخ تأییدشده‌ای ارائه نکرده است؛ سند محرمانه را از راه عمومی ارسال نکنید.',
    'Private file storage is not currently verified. Do not send confidential records through a public channel.');
  }finally{loading=false;}
 }
 box.addEventListener('toggle',()=>{if(box.open&&!loaded)refresh();});
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(loading||!file.files?.length||!form.reportValidity()||!privacyCheck.checked||(minorCheck.checked&&!guardianCheck.checked))return;
  const selected=file.files[0];
  if(selected.size>12582912||!/(\\.pdf|\\.docx)$/i.test(selected.name)){
   state.textContent=tr('فقط PDF یا DOCX حداکثر ۱۲ مگابایت مجاز است.','Only PDF or DOCX up to 12 MB is accepted.');return;
  }
  if(!window.confirm(tr('فایل فقط به پرونده خصوصی این سفارش پیوست شود؟',
      'Attach this document only to your private paid service case?')))return;
  const payload=new FormData();payload.append('orderId',order.id);payload.append('sku',service.sku);
  payload.append('privacyAcknowledged','1');
  payload.append('isMinor',minorCheck.checked?'1':'0');
  payload.append('guardianAcknowledged',guardianCheck.checked?'1':'0');
  payload.append('document',selected,selected.name);
  loading=true;submit.disabled=true;
  state.textContent=tr('در حال اسکن، رمزنگاری و ثبت سند…','Scanning, encrypting and registering the file…');
  try{
   const response=await fetch('/api/commerce/service-files',{method:'POST',
    credentials:'same-origin',cache:'no-store',body:payload,headers:{Accept:'application/json'}});
   const data=await response.json();
   if(!response.ok||data?.ok!==true||data.schema!=='private-service-files-v1'
      ||data.file?.registered!==true)throw Error('not_accepted');
   file.value='';privacyCheck.checked=false;minorCheck.checked=false;guardianCheck.checked=false;guardianFlag.hidden=true;loaded=false;
   state.textContent=tr('مدرک به‌صورت محرمانه ثبت شد.','Your document was registered privately.');
  }catch(_){
   state.textContent=tr('ثبت فایل تأیید نشد؛ ابتدا وضعیت پرونده را دوباره بررسی کنید و سند را از روش عمومی ارسال نکنید.',
     'Upload not confirmed. Check this case before retrying; do not send sensitive files through public channels.');
  }finally{
   loading=false;submit.disabled=false;
   if(!loaded)refresh();
  }
 });
 return box;
}
function render(orders){
  section.replaceChildren();
  if(!orders.length){showInfo(tr('هنوز سفارشی برای ایمیل تأییدشدهٔ این حساب ثبت نشده است. سفارش مهمان تنها پس از تأیید مالکیت ایمیل با حساب ارتباط می‌یابد.','No orders were found for this account’s verified email. Guest orders appear only after email ownership is verified.'),false);return;}
  const wrap=el('div');wrap.style.cssText='display:grid;gap:1rem;width:100%;min-width:0';
  for(const order of orders){
    const item=el('article','','appointment-card');item.style.cssText='display:block;min-width:0;padding:1rem;overflow-wrap:anywhere';
    const heading=el('strong',tr('سفارش ','Order ')+order.id);
    const state=order.paymentVerified===true
      ?tr('پرداخت با سند تأیید درگاه مطابقت دارد؛ تسویه بانکی جداگانه بررسی می‌شود',
        'Provider claim matched; bank settlement requires separate verification')
      :({'created':tr('ثبت اولیه، پرداخت‌نشده','Created, unpaid'),
          'pending':tr('در انتظار تأیید درگاه','Awaiting gateway verification'),
          'failed':tr('پرداخت تأیید نشد','Payment not verified'),
          'cancelled':tr('سفارش لغو شده','Cancelled'),
          'paid':tr('بررسی شواهد پرداخت لازم است','Payment evidence requires review')}[order.state]||tr('در حال بررسی','Under review'));
    item.append(heading,el('p',state),el('p',tr('مبلغ سفارش: ','Order amount: ')+format(order.amountToman)+' '+tr('تومان','toman')));
    if(order.createdAt)item.append(el('small',tr('ثبت: ','Created: ')+order.createdAt));
    const list=el('ul');list.style.cssText='padding-inline-start:1.25rem;line-height:1.9';
    for(const line of order.items||[])list.append(el('li',(line.title||line.sku)+' × '+format(line.quantity)+' — '+format(line.subtotalToman)+' '+tr('تومان','toman')));
    item.append(list);
    item.append(el('small',tr('ارسال، تحویل، استرداد و دسترسی خدمت صرفاً پس از تأیید جداگانه نمایش داده می‌شوند.','Shipping, delivery, refunds and service access require separate verification.')));
    if(order.paymentVerified===true){
      const track=el('button',tr('پیگیری تحویل و نوبت','Track delivery or booking'),'button');
      track.type='button';
      const detail=el('div');detail.setAttribute('aria-live','polite');
      let loaded=false;
      track.addEventListener('click',async()=>{
        if(loaded){detail.hidden=!detail.hidden;return;}
        track.disabled=true;
        detail.replaceChildren(el('p',tr('در حال بررسی آخرین وضعیت واقعی…','Checking recorded fulfilment status…')));
        try{
          const res=await fetch('/api/commerce/fulfilment?order='+encodeURIComponent(order.id),
            {credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}});
          if(!res.ok)throw new Error('fulfilment_unavailable');
          const data=await res.json();if(data?.ok!==true)throw new Error('invalid_response');
          detail.replaceChildren();
          if(data.paymentRecord!=='provider_verified_not_bank_settlement'){
            detail.append(el('p',tr('پروندهٔ پرداخت برای ارائهٔ وضعیت تحویل هنوز به تطبیق نیاز دارد.','Payment evidence requires reconciliation before displaying fulfilment.')));
          }else{
            if(Array.isArray(data.serviceCases)&&data.serviceCases.length){
              const list=el('ul');
              const statuses={
                awaiting_contact:tr('در انتظار هماهنگی','Awaiting contact'),
                scheduling:tr('در حال تعیین نوبت','Scheduling'),
                booked:tr('نوبت ثبت شده','Booked'),
                in_progress:tr('در حال ارائه','In progress'),
                delivered:tr('تحویل توسط مدیر همراه با سند داخلی ثبت شده؛ تأیید مستقل دریافت مشتری هنوز لازم است','Owner-attested delivery recorded; independent buyer receipt is not confirmed'),
                cancelled:tr('لغو ثبت شده','Cancelled')
              };
              for(const c of data.serviceCases){
                const line=el('li',c.sku+' — '+(statuses[c.status]||tr('نیازمند بررسی','Review needed')));
                if(c.bookingStart)line.append(el('small',' · '+tr('زمان ثبت‌شده: ','Recorded slot: ')+c.bookingStart));
                if(typeof c.sku==='string'&&/^(?:service|vip):[a-z0-9_-]{1,60}$/.test(c.sku)
                  &&c.status!=='cancelled'){
                  if(c.status!=='delivered')line.append(serviceIntakeEditor(order,c));
                  line.append(serviceFileWorkspace(order,c));
                }
                list.append(line);
              }
              detail.append(el('strong',tr('وضعیت خدمات','Service cases')),list);
            }
            if(data.parcel){
              const p=data.parcel;
              const states={preparing:tr('آماده‌سازی','Preparing'),dispatched:tr('ارسال‌شده','Dispatched'),
                in_transit:tr('در مسیر','In transit'),delivered:tr('تحویل‌شده','Delivered'),returned:tr('مرجوع‌شده','Returned')};
              detail.append(el('p',tr('وضعیت مرسوله: ','Parcel: ')+(states[p.state]||tr('ثبت نشده','Not reported'))));
              if(p.carrier)detail.append(el('p',tr('شرکت حمل: ','Carrier: ')+p.carrier));
              if(p.trackingCode)detail.append(el('p',tr('کد رهگیری: ','Tracking code: ')+p.trackingCode));
            }
            if((!data.serviceCases||!data.serviceCases.length)&&!data.parcel)
              detail.append(el('p',tr('هنوز وضعیت تحویل تأییدشده‌ای برای این سفارش ثبت نشده است.','No verified fulfilment event has been recorded for this order.')));
          }
          loaded=true;
        }catch(_){detail.replaceChildren(el('p',tr('وضعیت تحویل در حال حاضر قابل تأیید نیست؛ اطلاعات فرضی نمایش داده نمی‌شود.','Delivery cannot currently be verified; no synthetic tracking data is shown.')));}
        finally{track.disabled=false;}
      });
      item.append(track,detail);
      const refund=el('details');
      refund.append(el('summary',tr('درخواست بررسی استرداد وجه','Request a refund review')));
      const form=el('form');form.style.cssText='display:grid;gap:.75rem;margin-top:.75rem;max-width:32rem';
      const label=el('label',tr('دلیل درخواست','Reason for request'));
      const select=el('select');select.required=true;
      const reasons=[
        ['service_not_provided',tr('خدمت ارائه نشده','Service not delivered')],
        ['cancel_request',tr('درخواست لغو سفارش','Cancellation request')],
        ['book_not_received',tr('کتاب دریافت نشده','Book not received')],
        ['incorrect_item',tr('کالا یا خدمت نادرست','Incorrect item or service')],
        ['duplicate_payment',tr('پرداخت تکراری','Duplicate payment')],
        ['other',tr('سایر موارد','Other')]
      ];
      for(const [value,title] of reasons){
        const option=el('option',title);option.value=value;select.append(option);
      }
      label.append(select);
      const request=el('button',tr('ثبت درخواست برای بررسی','Submit for review'),'button');
      request.type='submit';
      const outcome=el('p');outcome.setAttribute('role','status');
      form.append(label,request,el('small',tr('ثبت درخواست به معنی بازپرداخت یا لغو خودکار نیست.','Requesting a review does not automatically issue a refund or cancel an order.')),outcome);
      form.addEventListener('submit',async event=>{
        event.preventDefault();
        if(!window.confirm(tr('درخواست بررسی این سفارش ثبت شود؟ وجه بدون بررسی و تأیید بازپرداخت نمی‌شود.','Submit this request for review? No bank refund is issued automatically.')))return;
        request.disabled=true;
        outcome.textContent=tr('در حال ثبت درخواست…','Submitting request…');
        try{
          const response=await fetch('/api/commerce/refund-request',{
            method:'POST',credentials:'same-origin',cache:'no-store',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({orderId:order.id,reasonCode:select.value})
          });
          const data=await response.json();
          if(!response.ok||data?.ok!==true)throw Error('request_failed');
          outcome.textContent=tr('درخواست با شناسه ','Request ')+data.requestId+tr(' ثبت شد؛ بررسی و بازپرداخت احتمالی جداگانه انجام می‌شود.',' was recorded. Review and any bank refund are separate steps.');
          form.querySelector('select').disabled=true;
        }catch(_){
          outcome.textContent=tr('ثبت درخواست اکنون تأیید نشد. از بخش پشتیبانی پیگیری کنید.','Submission could not be verified. Please contact support.');
          request.disabled=false;
        }
      });
      refund.append(form);item.append(refund);

    }
    wrap.append(item);
  }
  section.append(wrap);
}
async function load(){
  section.setAttribute('aria-busy','true');
  showInfo(tr('در حال بررسی امن سفارش‌های حساب…','Securely checking account orders…'),false);
  try{
    const res=await fetch('/api/commerce/history',{method:'GET',credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}});
    if(res.status===401){showInfo(tr('برای مشاهده سفارش‌های خود ابتدا وارد حساب دارای ایمیل تأییدشده شوید.','Sign in with a verified email to view your orders.'),true);return;}
    if(!res.ok)throw new Error('history_unavailable');
    const data=await res.json();if(data?.ok!==true||!Array.isArray(data.orders))throw new Error('history_invalid');
    render(data.orders);
  }catch(_){showInfo(tr('تاریخچه واقعی سفارش‌ها در حال حاضر در دسترس نیست؛ اطلاعات فرضی نمایش داده نمی‌شود.','Order history is currently unavailable; no simulated purchases are shown.'),false);}
  finally{section.setAttribute('aria-busy','false');}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
})();