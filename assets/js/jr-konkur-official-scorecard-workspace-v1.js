/* JR Konkur official scorecard review — privacy-minimal and voluntary.
 * Extends the existing Choice Studio; NO fetch, storage, file uploads or identifiers.
 * Provisional field families, NOT a verified 1405/1406 official scorecard parser.
 */
(()=>{'use strict';
 const V=window.JRKonkurOfficialScorecard;if(!V)return;
 const node=(tag,cls,value)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(value!==undefined)e.textContent=String(value);return e;};
 for(const root of document.querySelectorAll('[data-konkur-official-scorecard]')){
  const fa=root.dataset.locale!=='en',t=(a,b)=>fa?a:b;root.classList.add('jr-ks-workspace');
  const title=node('h3','',t('بررسی دستی اطلاعات کارنامه رسمی سنجش','Review a self-reported Sanjesh scorecard'));
  const intro=node('p','jr-ks-warning',t(
   'این فرم ورود دستی و مقدماتی است؛ قالب قطعی کارنامه ۱۴۰۵/۱۴۰۶ و اعتبار اعداد هنوز به‌صورت مستقل تأیید نشده‌اند. اطلاعات به سرور ارسال یا در مرورگر ذخیره نمی‌شوند؛ از واردکردن نام، کد ملی و رمز عبور خودداری کنید.',
   'This is a provisional manual worksheet, not an authenticated 1405/1406 official scorecard parser. No data is uploaded or saved. Do not enter names, ID numbers or passwords.'));
  const form=node('form','jr-ks-form');
  const field=(label,control)=>{
   const n=node('label','jr-ks-field',label);n.append(control);form.append(n);return control;
  };
  const select=(name,arr)=>{
   const e=node('select');e.name=name;arr.forEach(([v,l])=>{const o=node('option','',l);o.value=v;e.append(o);});return e;
  };
  const year=field(t('سال پذیرش','Admission year'),select('year',[
   ['1405','۱۴۰۵ · فقط بررسی مقدماتی'],['1406',t('۱۴۰۶ · در انتظار دفترچه','1406 · guide pending')]
  ]));
  const group=field(t('گروه آزمایشی','Examination group'),select('group',[
   ['',t('انتخاب کنید','Choose group')],
   ['MATHEMATICS',t('ریاضی و فنی','Mathematics')],
   ['EXPERIMENTAL_SCIENCES',t('علوم تجربی','Experimental sciences')],
   ['HUMANITIES',t('علوم انسانی','Humanities')],
   ['ARTS',t('هنر','Arts')],
   ['FOREIGN_LANGUAGES',t('زبان‌های خارجی','Foreign languages')]
  ]));
  const quota=field(t('عنوان سهمیه درج‌شده در کارنامه (اختیاری)','Reported quota label (optional)'),node('input'));
  quota.name='quotaLabel';quota.type='text';quota.maxLength=80;quota.autocomplete='off';
  const specs=[
   ['rankQuota',t('رتبه در سهمیه نهایی','Rank in final quota'),'numeric',9],
   ['rankCountry',t('رتبه کشوری بدون سهمیه','National rank without quota'),'numeric',9],
   ['examScore',t('نمره کل آزمون اختصاصی (در صورت درج)','Official exam composite, if shown'),'decimal',12],
   ['schoolScore',t('نمره کل سابقه تحصیلی (در صورت درج)','Official educational record composite, if shown'),'decimal',12],
   ['finalScore',t('نمره کل نهایی (در صورت درج)','Official final composite, if shown'),'decimal',12],
   ['grade11',t('معدل خام پایه یازدهم؛ فقط یادداشت شخصی','Raw grade 11 average, personal note only'),'decimal',7],
   ['grade12',t('معدل خام پایه دوازدهم؛ فقط یادداشت شخصی','Raw grade 12 average, personal note only'),'decimal',7]
  ];
  const inputs={};
  for(const [key,label,type,max] of specs){
   const input=node('input');input.name=key;input.type='text';input.inputMode=type;
   input.maxLength=max;input.autocomplete='off';input.spellcheck=false;
   field(label,input);inputs[key]=input;
  }
  const declaration=field(t('وضعیت مجازبودن، مطابق اظهار داوطلب','Selection authorization, candidate-reported'),
   select('eligibilityDeclaration',[
    ['UNKNOWN',t('بررسی نشده / نامشخص','Unknown / not checked')],
    ['SELF_REPORTED_YES',t('طبق کارنامه: مجاز','According to my scorecard: eligible')],
    ['SELF_REPORTED_NO',t('طبق کارنامه: غیرمجاز','According to my scorecard: ineligible')]
   ]));
  const controls=node('div','jr-ks-controls');
  const review=node('button','jr-ks-primary',t('بررسی داده‌های واردشده','Review manual inputs'));review.type='submit';
  const reset=node('button','',t('پاک‌کردن همه داده‌ها','Clear all inputs'));reset.type='reset';
  const print=node('button','',t('چاپ یادداشت شخصی','Print personal note'));print.type='button';print.disabled=true;
  controls.append(review,reset,print);form.append(controls);
  const message=node('p','jr-ks-message','');message.setAttribute('role','status');message.setAttribute('aria-live','polite');
  const result=node('section','jr-ks-result');result.hidden=true;
  const next=node('section','jr-ks-next');next.hidden=true;
  next.setAttribute('aria-label',t('گام بعدی بعد از بررسی قالب کارنامه',
    'Next step after scorecard format review'));
  const compare=node('button','jr-ks-primary',t(
    'ادامه با مقایسه پنج‌معیاری مسیرها',
    'Continue to the five-criterion comparison'));
  compare.type='button';
  next.append(compare,node('p','jr-ks-note',t(
    'این گام فقط کاربرگ ترجیحات شخصی را باز می‌کند. هیچ رتبه، تراز، گروه، نام یا داده‌ای از کارنامه به استودیوی انتخاب منتقل نمی‌شود و قبولی یا مجازبودن نیز تأیید نمی‌شود.',
    'This step only opens a personal preference worksheet. No rank, score, group, name or scorecard input is transferred to Choice Studio, and official eligibility or admission remains unverified.')));
  const printView=node('section','jr-ks-print');printView.hidden=true;
  const disclosure=node('p','jr-ks-note',t(
   'رتبه، تراز، نمره کل آزمون و نمره سابقه تحصیلی شاخص‌های متفاوت‌اند. معدل خام پایه‌ها را نمی‌توان با ضرب در یک ضریب به نمره کل رسمی یا رتبه کنکور تبدیل کرد. این ابزار هیچ وضعیت پذیرش یا قبولی را تأیید نمی‌کند.',
   'Ranks, normalized scores and raw school averages are distinct constructs. Raw grades cannot be converted to official scores or ranks with a simple multiplier. This form verifies no eligibility or admission outcome.'));
  root.append(title,intro,form,message,result,next,disclosure,printView);
  compare.addEventListener('click',()=>{
   const studio=document.querySelector('[data-choice-studio]');
   if(studio){
    studio.scrollIntoView({block:'start',behavior:'auto'});
    const input=studio.querySelector('.jr-cs-path input[type="text"]');
    if(input)input.focus({preventScroll:true});
    else if(studio.tabIndex>=0)studio.focus({preventScroll:true});
    return;
   }
   // Preserve existing published routes; never encode the scorecard in URL.
   window.location.assign(fa?'/fa/entekhab-reshteh/':'/en/student-guidance/');
  });
  let inspected=null;
  const descriptors={
   rankQuota:t('رتبه در سهمیه','Quota rank'),rankCountry:t('رتبه کشوری','Country rank'),
   examScore:t('نمره آزمون اختصاصی','Exam composite'),schoolScore:t('نمره سابقه تحصیلی','School composite'),
   finalScore:t('نمره کل نهایی','Final composite'),grade11:t('معدل خام یازدهم','Raw grade 11'),
   grade12:t('معدل خام دوازدهم','Raw grade 12'),quotaLabel:t('سهمیه اظهارشده','Reported quota'),
   eligibilityDeclaration:t('اظهار وضعیت مجازبودن','Reported eligibility')
  };
  const asText=(key,value)=>key==='eligibilityDeclaration'?(
   value==='SELF_REPORTED_YES'?t('داوطلب: مجاز','Candidate reports eligible'):
   value==='SELF_REPORTED_NO'?t('داوطلب: غیرمجاز','Candidate reports ineligible'):
   t('نامشخص','Unknown')):String(value);
  function render(target){
   target.replaceChildren();
   if(!inspected||!inspected.valid)return;
   const r=inspected.report;
   target.append(node('h4','',t('خلاصه خوداظهاری کارنامه','Self-reported scorecard summary')),
    node('p','jr-ks-warning',t(
     'این خلاصه فاقد تأیید سازمان سنجش است. برای تصمیم نهایی، اصل کارنامه، دفترچه سال مربوط و اصلاحیه‌ها باید کنترل شوند.',
     'This summary is NOT verified by Sanjesh. Check the original scorecard, annual guide and amendments before deciding.'
    )),node('p','',t('سال: ','Year: ')+r.year+' · '+r.group));
   const list=node('dl','jr-ks-values');
   for(const [key,value] of Object.entries(r)){
    if(key==='year'||key==='group')continue;
    list.append(node('dt','',descriptors[key]||key),node('dd','',asText(key,value)));
   }
   target.append(list,node('p','',t('نتیجه: بررسی قالب و مجازبودن انجام نشده؛ احتمال قبولی محاسبه نمی‌شود.',
    'Result: scorecard format and official eligibility NOT verified; admission probability not estimated.')));
  }
  form.addEventListener('submit',event=>{
   event.preventDefault();
   const data={year:year.value,group:group.value,quotaLabel:quota.value,eligibilityDeclaration:declaration.value};
   for(const [key,input] of Object.entries(inputs))data[key]=input.value;
   inspected=V.inspect(data);
   if(!inspected.valid){
    result.replaceChildren();result.hidden=true;next.hidden=true;print.disabled=true;
    message.textContent=t('ورودی‌ها نیازمند بررسی هستند: ','Please check entered values: ')+inspected.issues.join('، ');
    return;
   }
   render(result);result.hidden=false;next.hidden=false;print.disabled=false;
   message.textContent=t('ورودی‌ها فقط از نظر قالب بررسی شدند؛ صحت اطلاعات و شرایط پذیرش تأیید نشده‌اند.',
    'Inputs were checked for basic format only; official values and eligibility remain unverified.');
  });
  // A reviewed snapshot is only valid for the exact inputs at the time of
  // clicking Review. Prevent an old printout or next-step status remaining
  // visible after a learner edits any form value.
  const invalidate=()=>{
   if(!inspected)return;
   inspected=null;
   result.replaceChildren();result.hidden=true;
   next.hidden=true;print.disabled=true;
   printView.replaceChildren();printView.hidden=true;
   root.classList.remove('jr-ks-printing');
   message.textContent=t(
    'ورودی‌ها تغییر کردند. برای ایجاد گزارش تازه، دوباره بررسی کنید.',
    'Inputs have changed. Review the new values before printing or continuing.'
   );
  };
  form.addEventListener('input',invalidate);
  form.addEventListener('change',invalidate);
  form.addEventListener('reset',()=>{
   inspected=null;result.replaceChildren();result.hidden=true;next.hidden=true;print.disabled=true;
   printView.replaceChildren();printView.hidden=true;message.textContent=t('فرم و نتیجه پاک شدند.','Form and result cleared.');
  });
  print.addEventListener('click',()=>{
   if(!inspected?.valid)return;
   render(printView);printView.hidden=false;root.classList.add('jr-ks-printing');window.print();
  });
  window.addEventListener('afterprint',()=>{printView.hidden=true;root.classList.remove('jr-ks-printing');});
  window.addEventListener('pagehide',()=>{
   inspected=null;form.reset();result.replaceChildren();printView.replaceChildren();
  });
 }
})();