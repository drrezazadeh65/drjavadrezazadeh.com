/* JR Konkur: 1405–1406 mock-exam study planner; no candidate storage, account, network or score conversion.
 * Not an official Sanjesh scorecard. Never equate provider TAZ to national scores.
 */
(()=>{'use strict';
 const create=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=String(text);return n;};
 const faDigits=text=>String(text||'').replace(/[۰-۹٠-٩]/g,c=>{const d=c.codePointAt(0);return String(d>=0x6f0?d-0x6f0:d-0x660);}).trim();
 const decimal=v=>{const s=faDigits(v).replace('٫','.');if(!/^\d+(?:\.\d{1,4})?$/.test(s))return null;const n=Number(s);return Number.isFinite(n)&&n<=100000?n:null;};
 const dateOk=v=>{const m=/^(14\d{2})\/(0?[1-9]|1[0-2])\/(0?[1-9]|[12]\d|3[01])$/.exec(faDigits(v));return m?m[1]+'/'+m[2].padStart(2,'0')+'/'+m[3].padStart(2,'0'):null;};
 for(const root of document.querySelectorAll('[data-konkur-mock-practice]')){
  const fa=root.dataset.locale!=='en',tr=(a,b)=>fa?a:b;
  root.classList.add('jr-konkur-mock');
  const title=create('h3','',tr('دفترچه شخصی آزمون‌های آزمایشی · آمادگی ۱۴۰۶','Mock-exam progress notebook · Preparing for 1406'));
  const intro=create('p','jr-km-intro',tr(
   'نتایج قلم‌چی، گاج یا آزمون‌های دیگر را شخصاً وارد کنید. این اعداد خوداظهاری‌اند؛ تراز آزمون آزمایشی به رتبه سنجش تبدیل نمی‌شود. اطلاعات فقط تا زمانی که این صفحه باز است در حافظه باقی می‌مانند.',
   'Enter Kanoon, GAJ or other mock-exam results yourself. These are unverified self-reports. Mock scaled scores cannot be converted to official Sanjesh ranks. Entries stay only while this page is open.'));
  const form=create('form','jr-km-form');
  const field=(label,element)=>{const n=create('label','jr-km-field',label);n.append(element);return n;};
  const provider=create('select','');
  const providers=[['',tr('انتخاب مؤسسه','Select provider')],['GHALAMCHI',tr('قلم‌چی / کانون','Kanoon / Ghalamchi')],['GAJ',tr('گاج','GAJ')],['OTHER',tr('آزمون آزمایشی دیگر','Other mock exam')]];
  providers.forEach(([value,label])=>{const item=create('option','',label);item.value=value;provider.append(item);});
  provider.required=true;
  const examGroup=create('select','');
  [['',tr('گروه را انتخاب کنید','Select group')],['MATHEMATICS',tr('ریاضی','Mathematics')],['EXPERIMENTAL_SCIENCES',tr('تجربی','Experimental sciences')],['HUMANITIES',tr('انسانی','Humanities')],['ARTS',tr('هنر','Arts')],['FOREIGN_LANGUAGES',tr('زبان','Languages')]].forEach(([v,label])=>{const n=create('option','',label);n.value=v;examGroup.append(n);});examGroup.required=true;
  const date=create('input','');date.type='text';date.inputMode='numeric';date.autocomplete='off';date.maxLength=10;date.placeholder='1405/08/02';date.required=true;
  const taz=create('input','');taz.type='text';taz.inputMode='decimal';taz.autocomplete='off';taz.maxLength=12;taz.placeholder=tr('تراز گزارش‌شده (اختیاری)','Reported TAZ (optional)');
  const rank=create('input','');rank.type='text';rank.inputMode='numeric';rank.autocomplete='off';rank.maxLength=12;rank.placeholder=tr('رتبه گزارش‌شده (اختیاری)','Reported rank (optional)');
  const lesson=create('input','');lesson.type='text';lesson.autocomplete='off';lesson.maxLength=70;lesson.placeholder=tr('نام درس (اختیاری)','Subject name (optional)');
  const percent=create('input','');percent.type='text';percent.inputMode='decimal';percent.autocomplete='off';percent.maxLength=8;percent.placeholder=tr('درصد درس (اختیاری)','Subject % (optional)');
  const add=create('button','jr-km-add',tr('ثبت موقت نتیجه آزمون','Add temporary exam result'));add.type='submit';
  form.append(field(tr('مؤسسه برگزارکننده','Exam provider'),provider),field(tr('گروه آزمایشی','Examination group'),examGroup),
   field(tr('تاریخ آزمون (شمسی)','Exam date (Solar Hijri)'),date),field(tr('تراز کل در کارنامه همان مؤسسه','Provider-issued overall TAZ'),taz),
   field(tr('رتبه درج‌شده در همان کارنامه','Rank reported by provider'),rank),
   field(tr('درس قابل پیگیری','Subject to track'),lesson),field(tr('درصد آن درس','Subject percentage'),percent),add);
  const feedback=create('p','jr-km-feedback','');feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');
  const summary=create('p','jr-km-summary','');
  const history=create('ol','jr-km-history');
  const trend=create('div','jr-km-trend');trend.setAttribute('role','status');
  const controls=create('div','jr-km-controls');
  const clear=create('button','',tr('پاک‌کردن همه داده‌های این صفحه','Clear all page entries'));clear.type='button';
  const print=create('button','',tr('چاپ گزارش توصیفی','Print descriptive report'));print.type='button';
  controls.append(print,clear);
  const foot=create('p','jr-km-warning',tr(
   'درصد، رتبه و تراز قلم‌چی/گاج صرفاً در مقیاس همان مؤسسه و آزمون معنا دارند. تغییر تراز حتی بین آزمون‌های یک مؤسسه، به علت تفاوت شرکت‌کنندگان و محتوا، اثبات پیشرفت یادگیری یا احتمال قبولی نیست.',
   'Mock rank and TAZ are defined within a provider and exam cohort. Changes even within one provider do not establish learning progress or admission chances because cohorts and test content differ.'));
  const printable=create('section','jr-km-print');printable.hidden=true;
  root.append(title,intro,form,feedback,summary,history,trend,controls,foot,printable);
  let exams=[];
  const announce=(a,b)=>{feedback.textContent=tr(a,b);};
  function draw(){
   const num=new Intl.NumberFormat(fa?'fa-IR':'en-US');history.replaceChildren();
   summary.textContent=tr('نتایج موقت ثبت‌شده: ','Temporary records: ')+num.format(exams.length);
   const ordered=exams.slice().sort((a,b)=>a.date.localeCompare(b.date));
   ordered.forEach((row,i)=>{
    const n=create('li','jr-km-item');
    const label=providers.find(x=>x[0]===row.provider)?.[1]||row.provider;
    const text=create('div','jr-km-details');
    text.append(create('strong','',row.date+' — '+label),create('p','',row.group),
     create('small','',tr('تراز همان مؤسسه: ','Same-provider TAZ: ')+(row.taz===null?'—':num.format(row.taz))+
     tr(' · رتبه: ',' · rank: ')+(row.rank===null?'—':num.format(row.rank))));
    if(row.subject&&row.percent!==null)text.append(create('p','',row.subject+': '+num.format(row.percent)+'%'));
    const remove=create('button','',tr('حذف','Remove'));remove.type='button';
    remove.setAttribute('aria-label',tr('حذف نتیجه ','Remove result ')+(i+1));
    remove.addEventListener('click',()=>{exams=exams.filter(v=>v.id!==row.id);draw();announce('نتیجه حذف شد.','Result removed.');});
    n.append(text,remove);history.append(n);
   });
   trend.replaceChildren();
   const latest=ordered.filter(x=>x.taz!==null).at(-1);
   const comparable=latest&&ordered.filter(x=>x.provider===latest.provider&&x.group===latest.group&&x.taz!==null);
   if(comparable?.length>=2){
    const prior=comparable.at(-2),difference=latest.taz-prior.taz;
    trend.append(create('p','',tr('تفاوت عدد تراز گزارش‌شده در دو آزمون اخیر همین مؤسسه و گروه: ',
      'Reported TAZ difference between two latest exams of the same provider and group: ')+(difference>0?'+':'')+num.format(difference)));
   }else trend.append(create('p','',tr('برای بررسی تغییرات توصیفی، دست‌کم دو نتیجه با تراز در همان مؤسسه و گروه ثبت کنید.',
     'Enter at least two scaled results from the same provider and group for a descriptive change.'));
  }
  form.addEventListener('submit',event=>{
   event.preventDefault();
   if(!provider.value||!examGroup.value){announce('مؤسسه و گروه را انتخاب کنید.','Select provider and group.');return;}
   const day=dateOk(date.value);
   if(!day){announce('تاریخ شمسی معتبر با قالب ۱۴۰۵/۰۸/۰۲ وارد کنید.','Use a valid Solar Hijri date such as 1405/08/02.');date.focus();return;}
   const valueTaz=taz.value.trim()?decimal(taz.value):null;
   const valueRank=rank.value.trim()?decimal(rank.value):null;
   const valuePct=percent.value.trim()?decimal(percent.value):null;
   if((taz.value.trim()&&valueTaz===null)||(rank.value.trim()&&(valueRank===null||!Number.isInteger(valueRank)||valueRank<1))||
      (percent.value.trim()&&(valuePct===null||valuePct>100))||(!valueTaz&&!valueRank&&!Number.isFinite(valuePct))){
    announce('تراز، رتبه یا درصد معتبر وارد کنید؛ رتبه باید عدد صحیح مثبت و درصد حداکثر ۱۰۰ باشد.',
     'Enter a valid TAZ, rank or percentage. Rank must be a positive integer and percentage at most 100.');return;
   }
   if(percent.value.trim()&&!lesson.value.trim()){
    announce('برای درصد درس، نام درس را وارد کنید.','A subject name is required for a subject percentage.');lesson.focus();return;
   }
   if(exams.length>=40){announce('سقف موقت این کاربرگ ۴۰ آزمون است.','Temporary worksheet limit is 40 exams.');return;}
   exams.push({id:Date.now()+Math.random(),date:day,provider:provider.value,group:examGroup.value,
    taz:valueTaz,rank:valueRank,subject:lesson.value.trim().slice(0,70),percent:valuePct});
   draw();announce('نتیجه به‌طور موقت ثبت شد؛ هنوز به حساب یا سرور ارسال نشده است.','Result added temporarily; nothing was sent to an account or server.');
   taz.value='';rank.value='';lesson.value='';percent.value='';
  });
  clear.addEventListener('click',()=>{exams=[];draw();announce('تمام نتایج این صفحه پاک شدند.','All temporary results cleared.');});
  print.addEventListener('click',()=>{
   if(!exams.length){announce('ابتدا نتیجه یک آزمون را وارد کنید.','Enter at least one mock exam result.');return;}
   printable.replaceChildren();
   printable.append(create('h3','',tr('گزارش تمرینی آزمون‌های آزمایشی','Mock exam practice report')),
    create('p','',tr('تاریخ تهیه: ','Generated: ')+new Date().toLocaleString(fa?'fa-IR':'en-GB')),
    create('p','',tr('خوداظهاری، بدون اعتبار رسمی، پیش‌بینی رتبه یا احتمال قبولی.',
     'Self-reported; not an official rank, eligibility check or admission forecast.')));
   const list=create('ol');
   exams.slice().sort((a,b)=>a.date.localeCompare(b.date)).forEach(x=>list.append(create('li','',
    x.date+' · '+x.provider+' · '+x.group+' · TAZ: '+(x.taz??'—')+' · rank: '+(x.rank??'—')+
    (x.subject?' · '+x.subject+': '+(x.percent??'—')+'%':''))));
   printable.append(list);
   root.classList.add('jr-km-printing');printable.hidden=false;window.print();
  });
  window.addEventListener('afterprint',()=>{printable.hidden=true;root.classList.remove('jr-km-printing');});
  window.addEventListener('pagehide',()=>{exams=[];printable.replaceChildren();});
  draw();
 }
})();