/* JR Konkur: 1405–1406 mock-exam study planner; no candidate storage, account, network or score conversion.
 * Not an official Sanjesh scorecard. Never equate provider TAZ to national scores.
 */
(()=>{'use strict';
 const create=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=String(text);return n;};
 const faDigits=text=>String(text||'').replace(/[۰-۹٠-٩]/g,c=>{const d=c.codePointAt(0);return String(d>=0x6f0?d-0x6f0:d-0x660);}).trim();
 const decimal=v=>{const s=faDigits(v).replace('٫','.');if(!/^\d+(?:\.\d{1,4})?$/.test(s))return null;const n=Number(s);return Number.isFinite(n)&&n<=100000?n:null;};
 // Negative-marked subject percentages have a distinct range from TAZ and rank.
 const signedPercent=v=>{
  const s=faDigits(v).replace('٫','.').replace(/[−–]/g,'-');
  if(!/^-?\d+(?:\.\d{1,4})?$/.test(s))return null;
  const n=Number(s);
  return Number.isFinite(n)&&n>=-33.34&&n<=100?n:null;
 };
 const dateOk=v=>{
  const m=/^(14\d{2})\/(0?[1-9]|1[0-2])\/(0?[1-9]|[12]\d|3[01])$/.exec(faDigits(v));
  if(!m)return null;
  const month=Number(m[2]),day=Number(m[3]);
  // Months 1–6 have 31 days, months 7–11 have 30.
  // The variable leap-year status of Esfand 30 must not be invented from
  // browser arithmetic; mark it for independent official-calendar review.
  if(month>6&&day>30)return null;
  if(month===12&&day===30)return null;
  return m[1]+'/'+m[2].padStart(2,'0')+'/'+m[3].padStart(2,'0');
 };
 const normalizedSubjectName=value=>String(value).normalize('NFKC')
  .replace(/[يى]/gu,'ی').replace(/ك/gu,'ک')
  .trim().replace(/\s+/gu,' ').toLocaleLowerCase();
 for(const root of document.querySelectorAll('[data-konkur-mock-practice]')){
  const fa=root.dataset.locale!=='en',tr=(a,b)=>fa?a:b;
  root.classList.add('jr-konkur-mock');
  const title=create('h3','',tr('دفترچه شخصی آزمون‌های آزمایشی · آمادگی ۱۴۰۶','Mock-exam progress notebook · Preparing for 1406'));
  const intro=create('p','jr-km-intro',tr(
   'نتایج قلم‌چی، گاج، گزینه دو، ماز، آزمون‌های آزمایشی سنجش و سایر برگزارکنندگان را به‌صورت خوداظهاری وارد کنید. قالب برخی مؤسسات هنوز بررسی نشده است؛ ترازهای مؤسسات قابل تبدیل به رتبه رسمی سنجش نیستند. اطلاعات فقط در همین صفحه باقی می‌مانند.',
   'Enter self-reported results from Kanoon, GAJ, Gozineh Do, MAZ, Sanjesh MOCK exams or other providers. Some report layouts remain unverified. Provider scales cannot be converted to official national ranks. Entries stay on this page.'));
  const form=create('form','jr-km-form');
  const field=(label,element)=>{const n=create('label','jr-km-field',label);n.append(element);return n;};
  const provider=create('select','');
  const directory=Array.isArray(window.JRKonkurMockProviders)?window.JRKonkurMockProviders:[];
  const providers=[['',tr('انتخاب مؤسسه','Select provider')],...(directory.length?directory.map(p=>[p.code,fa?p.fa:p.en]):[['GHALAMCHI',tr('قلم‌چی / کانون','Kanoon / Ghalamchi')],['GAJ',tr('گاج','GAJ')],['OTHER',tr('آزمون آزمایشی دیگر','Other mock exam')]])];
  providers.forEach(([value,label])=>{const item=create('option','',label);item.value=value;provider.append(item);});
  provider.required=true;
  const examGroup=create('select','');
  [['',tr('گروه را انتخاب کنید','Select group')],['MATHEMATICS',tr('ریاضی','Mathematics')],['EXPERIMENTAL_SCIENCES',tr('تجربی','Experimental sciences')],['HUMANITIES',tr('انسانی','Humanities')],['ARTS',tr('هنر','Arts')],['FOREIGN_LANGUAGES',tr('زبان','Languages')]].forEach(([v,label])=>{const n=create('option','',label);n.value=v;examGroup.append(n);});examGroup.required=true;
  const date=create('input','');date.type='text';date.inputMode='numeric';date.autocomplete='off';date.maxLength=10;date.placeholder='1405/08/02';date.required=true;
  const taz=create('input','');taz.type='text';taz.inputMode='decimal';taz.autocomplete='off';taz.maxLength=12;taz.placeholder=tr('تراز گزارش‌شده (اختیاری)','Reported TAZ (optional)');
  const rank=create('input','');rank.type='text';rank.inputMode='numeric';rank.autocomplete='off';rank.maxLength=12;rank.placeholder=tr('رتبه گزارش‌شده (اختیاری)','Reported rank (optional)');
  const grade=create('select','');
  [['UNSPECIFIED',tr('پایه / مقطع اعلام نشده','Grade not specified')],['10',tr('پایه دهم','Grade 10')],['11',tr('پایه یازدهم','Grade 11')],['12',tr('پایه دوازدهم','Grade 12')],['GRADUATE',tr('فارغ‌التحصیل / پشت کنکوری','Graduate / repeat candidate')]].forEach(([v,label])=>{const n=create('option','',label);n.value=v;grade.append(n);});
  const rankScope=create('select','');
  [['UNSPECIFIED',tr('محدوده رتبه نامشخص است','Rank population not specified')],['NATIONAL',tr('کل شرکت‌کنندگان کشوری','National provider participants')],['PROVINCE',tr('استان','Province')],['CITY',tr('شهر','City')],['SCHOOL',tr('مدرسه','School')],['CLASS',tr('کلاس','Class')],['OTHER_SCOPE',tr('سایر / اعلامی مؤسسه','Other provider-defined scope')]].forEach(([v,label])=>{const n=create('option','',label);n.value=v;rankScope.append(n);});
  const lesson=create('input','');lesson.type='text';lesson.autocomplete='off';lesson.maxLength=70;lesson.placeholder=tr('نام درس (اختیاری)','Subject name (optional)');
  const percent=create('input','');percent.type='text';percent.inputMode='decimal';percent.autocomplete='off';percent.maxLength=8;percent.placeholder=tr('درصد درس (اختیاری)','Subject % (optional)');
  const add=create('button','jr-km-add',tr('ثبت موقت نتیجه آزمون','Add temporary exam result'));add.type='submit';
  form.append(field(tr('مؤسسه برگزارکننده','Exam provider'),provider),field(tr('گروه آزمایشی','Examination group'),examGroup),
   field(tr('تاریخ آزمون (شمسی)','Exam date (Solar Hijri)'),date),field(tr('تراز کل در کارنامه همان مؤسسه','Provider-issued overall TAZ'),taz),
   field(tr('رتبه درج‌شده در همان کارنامه','Rank reported by provider'),rank),
   field(tr('پایه یا وضعیت تحصیلی هنگام آزمون','Grade or education stage at this exam'),grade),
   field(tr('جامعه آماری رتبه در کارنامه','Rank comparison population'),rankScope),
   field(tr('درس قابل پیگیری','Subject to track'),lesson),field(tr('درصد آن درس','Subject percentage'),percent),add);
  const extraRows=create('div','jr-km-extra-rows');
  const addSubject=create('button','jr-km-add-subject',tr('افزودن درصد یک درس دیگر','Add another subject result'));addSubject.type='button';
  form.insertBefore(extraRows,add);form.insertBefore(addSubject,add);
  addSubject.addEventListener('click',()=>{
   if(extraRows.children.length>=11)return;
   const row=create('div','jr-km-extra-row');
   const subjectInput=create('input','jr-km-extra-name');subjectInput.type='text';subjectInput.maxLength=70;subjectInput.autocomplete='off';
   const subjectPercent=create('input','jr-km-extra-percent');subjectPercent.type='text';subjectPercent.inputMode='decimal';subjectPercent.maxLength=8;subjectPercent.autocomplete='off';
   const rm=create('button','jr-km-extra-remove',tr('حذف درس','Remove subject'));rm.type='button';
   rm.addEventListener('click',()=>{row.remove();addSubject.disabled=false;});
   row.append(field(tr('نام درس اضافی','Additional subject name'),subjectInput),field(tr('درصد همان درس','Subject percentage'),subjectPercent),rm);
   extraRows.append(row);addSubject.disabled=extraRows.children.length>=11;subjectInput.focus();
  });
  const feedback=create('p','jr-km-feedback','');feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');
  const summary=create('p','jr-km-summary','');
  const history=create('ol','jr-km-history');
  const trend=create('div','jr-km-trend');trend.setAttribute('role','status');
  const controls=create('div','jr-km-controls');
  const exportCsv=create('button','jr-km-export-csv',tr('دریافت فایل CSV','Export CSV'));exportCsv.type='button';
  const clear=create('button','',tr('پاک‌کردن همه داده‌های این صفحه','Clear all page entries'));clear.type='button';
  const print=create('button','',tr('چاپ گزارش توصیفی','Print descriptive report'));print.type='button';
  const review=create('button','jr-km-review-action',tr('ساخت برنامه مرور درس‌ها','Create subject review checklist'));review.type='button';
  const reviewDuration=create('select','jr-km-review-duration');
  [[15,tr('۱۵ دقیقه برای هر درس','15 minutes per subject')],[25,tr('۲۵ دقیقه برای هر درس','25 minutes per subject')],[40,tr('۴۰ دقیقه برای هر درس','40 minutes per subject')]].forEach(([duration,label])=>{
   const option=create('option','',label);option.value=String(duration);reviewDuration.append(option);
  });
  reviewDuration.value='25';
  const reviewDurationLabel=field(tr('زمان پیشنهادی دلخواه برای هر درس','User-selected time per subject'),reviewDuration);
  const reviewPanel=create('section','jr-km-review-panel');
  reviewPanel.setAttribute('aria-live','polite');
  reviewPanel.setAttribute('aria-label',tr('برنامه توصیفی مرور درسی','Descriptive subject review checklist'));
  controls.append(print,exportCsv,clear);
  const exportNotice=create('p','jr-km-export-notice',tr(
   'خروجی فقط با درخواست شما در دستگاهتان ذخیره می‌شود. این فایل داده‌های خوداظهاری و نام درس‌های واردشده را دارد؛ آن را به‌صورت محرمانه نگهداری و پس از پایان نیاز حذف کنید.',
   'Export requires your action and saves a file on your device. It contains unverified self-reported scores and typed subject labels; keep it private and delete it when no longer needed.'));
  const foot=create('p','jr-km-warning',tr(
   'درصد، رتبه و تراز هر برگزارکننده فقط در مقیاس همان آزمون معنا دارند. رتبه مدرسه، شهر و کشور قابل‌جایگزینی با یکدیگر نیستند. تغییر تراز حتی در یک مؤسسه نیز اثبات پیشرفت یا احتمال قبولی نیست.',
   'Every mock scale and rank belongs to its provider and event. National, school and city ranks are not interchangeable. TAZ changes do not prove learning progress or admission chances.'));
  const printable=create('section','jr-km-print');printable.hidden=true;
  root.append(title,intro,form,feedback,summary,history,trend,controls,
   reviewDurationLabel,review,reviewPanel,exportNotice,foot,printable);
  let exams=[];
  const announce=(a,b)=>{feedback.textContent=tr(a,b);};
  function draw(){
   reviewPanel.replaceChildren();
   const num=new Intl.NumberFormat(fa?'fa-IR':'en-US');history.replaceChildren();
   summary.textContent=tr('نتایج موقت ثبت‌شده: ','Temporary records: ')+num.format(exams.length);
   const ordered=exams.slice().sort((a,b)=>a.date.localeCompare(b.date));
   ordered.forEach((row,i)=>{
    const n=create('li','jr-km-item');
    const label=providers.find(x=>x[0]===row.provider)?.[1]||row.provider;
    const text=create('div','jr-km-details');
    text.append(create('strong','',row.date+' — '+label),create('p','',row.group+' · '+row.grade),
     create('small','',tr('تراز همان مؤسسه: ','Same-provider TAZ: ')+(row.taz===null?'—':num.format(row.taz))+
     tr(' · رتبه: ',' · rank: ')+(row.rank===null?'—':num.format(row.rank))+(row.rank!==null?' ['+row.rankScope+']':'')));
    if(row.subject&&row.percent!==null)text.append(create('p','',row.subject+': '+num.format(row.percent)+'%'));
    for(const metric of row.additionalSubjects||[])text.append(create('p','',metric.subject+': '+num.format(metric.percent)+'%'));
    const remove=create('button','',tr('حذف','Remove'));remove.type='button';
    remove.setAttribute('aria-label',tr('حذف نتیجه ','Remove result ')+(i+1));
    remove.addEventListener('click',()=>{exams=exams.filter(v=>v.id!==row.id);draw();announce('نتیجه حذف شد.','Result removed.');});
    n.append(text,remove);history.append(n);
   });
   trend.replaceChildren();
   const latest=ordered.filter(x=>x.taz!==null).at(-1);
   const comparable=latest&&!['OTHER','SCHOOL_LOCAL'].includes(latest.provider)&&ordered.filter(x=>
    x.provider===latest.provider&&x.group===latest.group&&x.grade===latest.grade&&
    x.date.slice(0,4)===latest.date.slice(0,4)&&x.date<latest.date&&x.taz!==null);
   // Two entries on the SAME calendar date are not longitudinal evidence;
   // only compare a genuinely earlier event, in the same provider cohort.
   if(comparable?.length){
    const prior=comparable.at(-1),difference=latest.taz-prior.taz;
    trend.append(create('p','',tr('تفاوت عددی تراز خوداظهاری در دو آزمونِ همان مؤسسه، گروه، پایه و سال (همسانی مقیاس تأیید نشده؛ نه پیش‌بینی قبولی): ',
      'Self-reported TAZ difference within the same provider, group, grade and year (scale comparability unverified; not an admission forecast): ')+(difference>0?'+':'')+num.format(difference)));
   }else trend.append(create('p','',tr('برای مقایسه، دو آزمون از همان مؤسسه، گروه و پایه لازم است. برای سایر برگزارکنندگان ناشناس، مقایسه تراز غیرفعال است.',
     'Comparison needs two events from the same provider, group and grade. Unknown issuers cannot be compared.')));
   // Repeated self-reported subject percentages: descriptive differences only.
   // Never compare providers, education stages, examination years or anonymous issuers.
   const current=ordered.at(-1);
   const comparableSubjectRows=current&&!['OTHER','SCHOOL_LOCAL'].includes(current.provider)
    ?ordered.slice(0,-1).filter(row=>row.provider===current.provider&&row.group===current.group&&
      row.grade===current.grade&&row.date.slice(0,4)===current.date.slice(0,4)&&
      row.date<current.date).reverse():[];
   const subjectMeasures=row=>[
    ...(row.subject&&Number.isFinite(row.percent)?[{subject:row.subject,percent:row.percent}]:[]),
    ...(row.additionalSubjects||[]).filter(item=>item.subject&&Number.isFinite(item.percent)),
   ];
   const differences=[];
   if(current&&comparableSubjectRows.length){
    for(const metric of subjectMeasures(current)){
     const key=normalizedSubjectName(metric.subject);
     for(const previous of comparableSubjectRows){
      const match=subjectMeasures(previous).find(item=>normalizedSubjectName(item.subject)===key);
      if(match){
       differences.push({subject:metric.subject,current:metric.percent,previous:match.percent,
        difference:Math.round((metric.percent-match.percent)*100)/100});
       break;
      }
     }
    }
   }
   if(differences.length){
    const title=create('strong','',tr('تغییر درصد خوداظهاری در درس‌های تکرارشده','Self-reported percentage changes in repeated subjects'));
    const list=create('ul','jr-km-subject-trend');
    for(const metric of differences){
     const signed=metric.difference>0?'+':'';
     list.append(create('li','',metric.subject+': '+num.format(metric.previous)+'% → '+
      num.format(metric.current)+'% ('+signed+num.format(metric.difference)+')'));
    }
    trend.append(title,list,create('small','',tr(
     'این اعداد فقط تفاوت درصدهای ثبت‌شده‌اند؛ دشواری و پوشش مبحثی آزمون‌ها ممکن است متفاوت باشد و رشد یادگیری یا شانس قبولی را اثبات نمی‌کنند.',
     'Differences between self-reported percentages only; exam difficulty and topic coverage may differ. These are not proof of learning growth or admission chances.')));
   }
  }
  form.addEventListener('submit',event=>{
   event.preventDefault();
   if(!provider.value||!examGroup.value){announce('مؤسسه و گروه را انتخاب کنید.','Select provider and group.');return;}
   const day=dateOk(date.value);
   if(!day){announce('تاریخ شمسی معتبر با قالب ۱۴۰۵/۰۸/۰۲ وارد کنید.','Use a valid Solar Hijri date such as 1405/08/02.');date.focus();return;}
   const valueTaz=taz.value.trim()?decimal(taz.value):null;
   const valueRank=rank.value.trim()?decimal(rank.value):null;
   const valuePct=percent.value.trim()?signedPercent(percent.value):null;
   const additionalSubjects=[],subjectNames=new Set();
   if(lesson.value.trim())subjectNames.add(normalizedSubjectName(lesson.value));
   for(const row of extraRows.querySelectorAll('.jr-km-extra-row')){
    const label=row.querySelector('.jr-km-extra-name').value.trim();
    const raw=row.querySelector('.jr-km-extra-percent').value.trim();
    const amount=raw?signedPercent(raw):null;
    if(!label||amount===null||amount>100){announce(
      'نام و درصد معتبر بین ۳۳٫۳۴- تا ۱۰۰ برای هر درس اضافی لازم است.',
      'Each additional subject requires a name and a percentage from -33.34 to 100.');return;}
    const key=normalizedSubjectName(label);
    if(subjectNames.has(key)){announce('نام درس در همین آزمون تکراری است.','The subject is duplicated within this exam.');return;}
    subjectNames.add(key);additionalSubjects.push({subject:label.slice(0,70),percent:amount});
   }
   if((taz.value.trim()&&valueTaz===null)||(rank.value.trim()&&(valueRank===null||!Number.isInteger(valueRank)||valueRank<1))||
      (percent.value.trim()&&(valuePct===null||valuePct>100))||(!valueTaz&&!valueRank&&!Number.isFinite(valuePct)&&additionalSubjects.length===0)){
    announce('تراز، رتبه یا درصد معتبر وارد کنید؛ رتبه باید صحیح مثبت و درصد بین ۳۳٫۳۴- تا ۱۰۰ باشد.',
     'Enter a valid TAZ, rank or percentage. Rank must be positive; percentage must be from -33.34 to 100.');return;
   }
   if(percent.value.trim()&&!lesson.value.trim()){
    announce('برای درصد درس، نام درس را وارد کنید.','A subject name is required for a subject percentage.');lesson.focus();return;
   }
   if(exams.length>=40){announce('سقف موقت این کاربرگ ۴۰ آزمون است.','Temporary worksheet limit is 40 exams.');return;}
   exams.push({id:Date.now()+Math.random(),date:day,provider:provider.value,group:examGroup.value,
    taz:valueTaz,rank:valueRank,rankScope:rankScope.value,grade:grade.value,subject:lesson.value.trim().slice(0,70),percent:valuePct,additionalSubjects});
   draw();announce('نتیجه به‌طور موقت ثبت شد؛ هنوز به حساب یا سرور ارسال نشده است.','Result added temporarily; nothing was sent to an account or server.');
   taz.value='';rank.value='';lesson.value='';percent.value='';extraRows.replaceChildren();addSubject.disabled=false;
  });
  clear.addEventListener('click',()=>{exams=[];draw();announce('تمام نتایج این صفحه پاک شدند.','All temporary results cleared.');});
  review.addEventListener('click',()=>{
   reviewPanel.replaceChildren();
   const factory=window.JRKonkurStudyReview;
   if(!factory||typeof factory.generateStudyReview!=='function'){
    announce('ابزار مرور در دسترس نیست.','Review checklist tool is unavailable.');return;
   }
   const output=factory.generateStudyReview(exams,Number(reviewDuration.value));
   if(output.status!=='DESCRIPTIVE_REVIEW_READY'){
    announce('برای ساخت برنامه، درصد حداقل یک درس از آخرین آزمون را ثبت کنید.',
     'Add a subject percentage to your latest exam to build a checklist.');return;
   }
   const title=create('h4','',tr('برنامه مرور شخصی · بدون پیش‌بینی','Personal review checklist · no predictions'));
   const intro=create('p','',tr(
    'بر اساس درس‌های درج‌شده در آخرین آزمون، نه تراز مؤسسات یا تخمین قبولی. برای هر درس، زمان انتخاب‌شده فقط یک پیشنهاد قابل تغییر است.',
    'Based only on subjects in your latest reported exam, not provider TAZ or admission odds. Selected session length is optional and adjustable.'));
   const items=create('ol','jr-km-review-list');
   const steps=tr([
    'موضوع یا نوع اشتباه را در همان آزمون مشخص کنید.',
    'مفهوم را بدون دیدن جزوه توضیح دهید یا بازیابی کنید.',
    'سؤال تازه حل کنید، بازخورد را بررسی کنید و ابهام باقی‌مانده را یادداشت کنید.'
   ].join('|'),[
    'Identify a topic or mistake pattern in this exam.',
    'Recall or explain the concept without referring to notes.',
    'Practise new questions, examine feedback and note uncertainty.'
   ].join('|')).split('|');
   for(const subject of output.subjects){
    const item=create('li','jr-km-review-item');
    const header=create('strong','',subject.subject+' · '+
      new Intl.NumberFormat(fa?'fa-IR':'en-US').format(subject.selfReportedPercent)+
      '% · '+new Intl.NumberFormat(fa?'fa-IR':'en-US').format(subject.reviewMinutes)+
      tr(' دقیقه پیشنهادی',' suggested minutes'));
    const tasks=create('ul');
    for(const step of steps)tasks.append(create('li','',step));
    item.append(header,tasks);items.append(item);
   }
   const note=create('small','',tr(
    'این فهرست خودراهبر و مبتنی بر خوداظهاری است؛ تفاوت دشواری، پوشش درس و شرایط فردی لحاظ نشده و پیشرفت یادگیری یا شانس قبولی را ثابت نمی‌کند. داده‌ای ذخیره یا ارسال نمی‌شود.',
    'This optional self-directed checklist uses unverified inputs; it does not establish learning gains or admission chances. Differences in difficulty, topic coverage and individual needs require review. Nothing is stored or transmitted.'));
   reviewPanel.append(title,intro,items,note);
   announce('برنامه مرور موقت ساخته شد.','Temporary review checklist created.');
  });
  exportCsv.addEventListener('click',()=>{
   if(!exams.length){announce('ابتدا دست‌کم یک آزمون ثبت کنید.','Enter at least one mock exam first.');return;}
   const exporter=window.JRKonkurMockExport;
   if(!exporter||typeof exporter.buildMockExamCsv!=='function'){
    announce('ابزار خروجی در دسترس نیست؛ گزارش چاپی همچنان قابل استفاده است.',
     'CSV exporter unavailable; the printable report remains available.');return;
   }
   try{
    const payload=exporter.buildMockExamCsv(exams);
    const blob=new Blob([payload.csv],{type:payload.mimeType});
    const url=URL.createObjectURL(blob);
    const link=create('a');link.href=url;link.download=payload.filename;link.hidden=true;
    root.append(link);link.click();link.remove();
    window.setTimeout(()=>URL.revokeObjectURL(url),1000);
    announce('فایل CSV برای ذخیره روی دستگاه آماده شد. اطلاعات به سرور ارسال نشد.',
     'Local CSV download prepared. No data were sent to the server.');
   }catch{
    announce('خروجی ناموفق بود؛ داده‌های موقت بدون تغییر باقی مانده‌اند.',
     'CSV export failed; the temporary entries remain unchanged.');
   }
  });
  print.addEventListener('click',()=>{
   if(!exams.length){announce('ابتدا نتیجه یک آزمون را وارد کنید.','Enter at least one mock exam result.');return;}
   printable.replaceChildren();
   printable.append(create('h3','',tr('گزارش تمرینی آزمون‌های آزمایشی','Mock exam practice report')),
    create('p','',tr('تاریخ تهیه: ','Generated: ')+new Date().toLocaleString(fa?'fa-IR':'en-GB')),
    create('p','',tr('خوداظهاری، بدون اعتبار رسمی، پیش‌بینی رتبه یا احتمال قبولی.',
     'Self-reported; not an official rank, eligibility check or admission forecast.')));
   const list=create('ol');
   exams.slice().sort((a,b)=>a.date.localeCompare(b.date)).forEach(x=>list.append(create('li','',
    x.date+' · '+x.provider+' · '+x.group+' · grade: '+x.grade+' · TAZ: '+(x.taz??'—')+' · rank ['+x.rankScope+']: '+(x.rank??'—')+
    (x.subject?' · '+x.subject+': '+(x.percent??'—')+'%':'')+
    (x.additionalSubjects||[]).map(v=>' · '+v.subject+': '+v.percent+'%').join(''))));
   printable.append(list);
   root.classList.add('jr-km-printing');printable.hidden=false;window.print();
  });
  window.addEventListener('afterprint',()=>{printable.hidden=true;root.classList.remove('jr-km-printing');});
  window.addEventListener('pagehide',()=>{exams=[];printable.replaceChildren();});
  draw();
 }
})();