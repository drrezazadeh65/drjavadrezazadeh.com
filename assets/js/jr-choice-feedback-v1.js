/* JR Choice Evidence & Feedback v1
 * Progressive upgrade to the established five-criterion choice studio.
 * No account reads, network, tracking, storage, aptitude claims or admissions
 * probabilities. School tracks, examination groups and university majors are
 * deliberately distinguished and are not claims of formal eligibility.
 */
(()=>{
'use strict';
const groups=[
 {id:'experimental',fa:'تجربی',en:'Experimental sciences',
  noteFa:'علوم تجربی یک شاخه دوره متوسطه است؛ نمونه رشته‌های دانشگاهی زیر پذیرش و ضوابط جداگانه دارند.',
  noteEn:'Experimental sciences is a school track; university programmes have separate entry rules.',
  samples:[['علوم تجربی','Experimental sciences'],['پزشکی','Medicine'],['پرستاری','Nursing'],['زیست‌شناسی','Biology']]},
 {id:'mathematics',fa:'ریاضی',en:'Mathematics',
  noteFa:'ریاضی‌فیزیک شاخه تحصیلی است؛ ورود به رشته‌های دانشگاهی مرتبط نیازمند بررسی دفترچه و پیش‌نیازهاست.',
  noteEn:'Mathematics–physics is a school track; university eligibility must be verified.',
  samples:[['ریاضی‌فیزیک','Mathematics–physics'],['مهندسی کامپیوتر','Computer engineering'],['آمار','Statistics'],['مهندسی عمران','Civil engineering']]},
 {id:'humanities',fa:'انسانی',en:'Humanities',
  noteFa:'علوم انسانی شاخه تحصیلی است؛ نام‌های زیر نمونه‌اند، نه توصیه بر اساس یک آزمون.',
  noteEn:'Humanities is a school track. These examples are not individual recommendations.',
  samples:[['علوم انسانی','Humanities'],['حقوق','Law'],['روان‌شناسی','Psychology'],['مدیریت','Management']]},
 {id:'languages',fa:'زبان',en:'Languages',
  noteFa:'زبان در اینجا گروه آزمونی و حوزه دانشگاهی است؛ الزاماً شاخه مستقل متوسطه نیست.',
  noteEn:'Languages here is an entrance-exam group and university field, not necessarily a separate school track.',
  samples:[['آموزش زبان انگلیسی','English language teaching'],['مترجمی زبان انگلیسی','English translation'],['زبان‌شناسی','Linguistics'],['زبان و ادبیات انگلیسی','English literature']]},
 {id:'arts',fa:'هنر',en:'Arts',
  noteFa:'هنر گروه آزمونی و حوزه دانشگاهی هم دارد؛ آن را با شاخه‌های هنرستان یکسان نگیریم.',
  noteEn:'Arts can be an examination group or degree area, distinct from vocational school pathways.',
  samples:[['گرافیک','Graphic design'],['سینما','Cinema'],['طراحی صنعتی','Industrial design'],['هنرهای تجسمی','Visual arts']]},
 {id:'technical',fa:'فنی‌وحرفه‌ای',en:'Technical–vocational',
  noteFa:'فنی‌وحرفه‌ای شاخه مهارتی متوسطه است؛ رشته‌ها و شرایط ارائه در هر منطقه و سال متفاوت‌اند.',
  noteEn:'Technical–vocational is a secondary skills track; local qualifications and routes may vary.',
  samples:[['شبکه و نرم‌افزار رایانه','Computing and software'],['الکتروتکنیک','Electrotechnics'],['حسابداری','Accounting'],['مکانیک خودرو','Automotive mechanics']]},
 {id:'kardanesh',fa:'کاردانش',en:'Kardanesh skills',
  noteFa:'کاردانش یک شاخه مهارتی است؛ دوره‌ها و امکان ادامه تحصیل را باید در منابع رسمی بررسی کرد.',
  noteEn:'Kardanesh is a skills-oriented secondary track; confirm locally approved programmes.',
  samples:[['مهارت‌های رایانه‌ای','Computing skills'],['طراحی و دوخت','Clothing design and sewing'],['امور اداری','Office administration'],['خدمات فنی','Technical services']]}
];
const criteria=[
 ['علاقه و تجربه واقعی','Interest and experience'],
 ['پیش‌نیازها و شرایط ورود','Requirements and eligibility'],
 ['هزینه و امکانات مالی','Financial feasibility'],
 ['موقعیت و شرایط زندگی','Location and life circumstances'],
 ['انعطاف و امکان بازنگری','Flexibility and alternatives']
];
function el(tag,txt,cls){
 const n=document.createElement(tag);
 if(cls)n.className=cls;
 if(txt!==undefined&&txt!==null)n.textContent=txt;
 return n;
}
const text=(fa,a,b)=>fa?a:b;
// Version identifies the output FORMAT and transparent self-report method,
// not empirical validation, national registration, or reviewer approval.
const REPORT_FORMAT='JR-CHOICE-REFLECTION/1.0.0';
const pathwayIdentity=value=>String(value).normalize('NFKC')
 .replace(/[يى]/gu,'ی').replace(/ك/gu,'ک')
 .replace(/\s+/gu,' ').trim().toLocaleLowerCase();
function enhance(root,n){
 const fa=root.dataset.locale==='fa';
 const form=root.querySelector('.jr-cs-form');
 const slots=[...root.querySelectorAll('.jr-cs-path')];
 // Visually reordered cards must NEVER change criterion-to-rating mapping.
 // The existing canonical factor index travels with each real DOM card.
 const weights=[...root.querySelectorAll('.jr-cs-weight input[type="range"]')]
  .sort((a,b)=>Number(a.closest('.jr-cs-weight').dataset.factorIndex)-
                  Number(b.closest('.jr-cs-weight').dataset.factorIndex));
 const options=root.querySelector('.jr-cs-pathways');
 const result=root.querySelector('.jr-cs-result');
 if(!form||slots.length!==2||weights.length!==5||!options||!result)return;
 const names=slots.map(slot=>slot.querySelector('input[type="text"]'));
 const ratings=slots.map(slot=>[...slot.querySelectorAll('select')]);
 if(names.some(x=>!x)||ratings.some(x=>x.length!==5))return;
 const prefix='jr-cs-feedback-'+n;
 const categories=el('section',null,'jr-cs-categories');
 categories.dataset.choiceCategories='';
 categories.setAttribute('aria-label',text(fa,'انتخاب حوزه و رشته','Choose a study category and pathway'));
 categories.append(el('h4',text(fa,'رشته‌ها و گروه‌های تحصیلی','Study tracks and examination groups')));
 categories.append(el('p',text(fa,
  'گروه‌های زیر ترکیبی از شاخه‌های مدرسه، گروه‌های آزمونی و رشته‌های دانشگاهی‌اند؛ این‌ها یک طبقه‌بندی واحد نیستند. از تب‌ها برای واردکردن نام گزینه‌ها استفاده کنید. تناسب، مجازبودن ورود و قبولی از این فهرست نتیجه نمی‌شود.',
  'These tabs mix school tracks, entrance-exam groups and university programmes: they are not one uniform classification. Select example names only; eligibility, admission and fit are not established.'
 ),'jr-cs-categories-note'));
 const tabs=el('div',null,'jr-cs-tabs');tabs.setAttribute('role','tablist');
 tabs.setAttribute('aria-label',text(fa,'گروه‌های تحصیلی','Study categories'));
 const panel=el('div',null,'jr-cs-category-panel');
 panel.setAttribute('role','tabpanel');panel.id=prefix+'-options';panel.tabIndex=0;
 const exampleStatus=el('p',null,'jr-cs-example-status');
 exampleStatus.setAttribute('role','status');
 exampleStatus.setAttribute('aria-live','polite');
 const buttons=[];
 function selectTab(index,focus=false){
  const group=groups[index];
  buttons.forEach((button,i)=>{
   const selected=index===i;
   button.setAttribute('aria-selected',String(selected));
   button.tabIndex=selected?0:-1;
  });
  panel.setAttribute('aria-labelledby',buttons[index].id);
  panel.replaceChildren(el('p',group[fa?'noteFa':'noteEn'],'jr-cs-category-note'));
  const list=el('ul',null,'jr-cs-examples');
  group.samples.forEach(sample=>{
   const row=el('li',null,'jr-cs-example');
   const name=sample[fa?0:1];
   row.append(el('strong',name));
   for(let j=0;j<2;j++){
    const add=el('button',text(fa,'گزینه '+(j===0?'اول':'دوم'),'Option '+(j+1)),'jr-cs-example-add');
    add.type='button';
    add.setAttribute('aria-label',name+' — '+text(fa,'قرار دادن در گزینه '+(j===0?'اول':'دوم'),'Add to option '+(j+1)));
    add.addEventListener('click',()=>{
     const existing=names[j].value.trim();
     if(existing&&existing!==name){
      exampleStatus.textContent=text(fa,
       'این گزینه قبلاً با نام دیگری پر شده است. برای حفظ تصمیم قبلی، ابتدا آن را خودتان ذخیره یا پاک کنید.',
       'This pathway already has another name. Save or clear your previous choice yourself before replacing it.');
      names[j].focus();
      return;
     }
     if(existing!==name){
      names[j].value=name;
      names[j].dispatchEvent(new Event('input',{bubbles:true}));
     }
     exampleStatus.textContent=text(fa,
       'فقط نام نمونه وارد شد؛ هیچ ارزیابی یا وضعیت قبولی تعیین نشده است.',
       'Only the sample name was entered; no fit rating or admission status was assigned.');
     names[j].focus();
    });
    row.append(add);
   }
   list.append(row);
  });
  panel.append(list);
  if(focus)buttons[index].focus();
 }
 groups.forEach((group,i)=>{
  const button=el('button',group[fa?'fa':'en'],'jr-cs-tab');
  button.type='button';button.id=prefix+'-'+group.id;
  button.setAttribute('role','tab');
  button.setAttribute('aria-controls',panel.id);
  button.setAttribute('aria-selected','false');
  button.addEventListener('click',()=>selectTab(i));
  tabs.append(button);buttons.push(button);
 });
 tabs.addEventListener('keydown',event=>{
  const index=buttons.indexOf(document.activeElement);
  if(index<0)return;
  let next;
  if(event.key==='ArrowRight')next=(index+1)%buttons.length;
  else if(event.key==='ArrowLeft')next=(index+buttons.length-1)%buttons.length;
  else if(event.key==='Home')next=0;
  else if(event.key==='End')next=buttons.length-1;
  else return;
  event.preventDefault();
  selectTab(next,true);
 });
 categories.append(tabs,panel,exampleStatus);
 form.insertBefore(categories,options);
 selectTab(0);
 const trigger=el('button',text(fa,'مشاهده نتیجه و پیشنهادهای بعدی','Show your result and next steps'),'jr-cs-show-result');
 trigger.type='button';
 const report=el('section',null,'jr-cs-interpreted-result');
 report.id=prefix+'-result';
 report.hidden=true;report.tabIndex=-1;
 report.setAttribute('role','region');
 report.setAttribute('aria-label',text(fa,'گزارش توصیفی تصمیم','Descriptive decision report'));
 trigger.setAttribute('aria-controls',report.id);
 trigger.setAttribute('aria-expanded','false');
 const print=el('button',text(fa,'چاپ یا ذخیره گزارش','Print or save result'),'jr-cs-report-print');
 print.type='button';print.hidden=true;
 form.insertBefore(trigger,result);
 result.append(report,print);
 const hide=()=>{
  report.hidden=true;report.replaceChildren();
  print.hidden=true;trigger.setAttribute('aria-expanded','false');
 };
 function snapshot(){
  const active=weights.map((w,i)=>({i,weight:Number(w.value)})).filter(w=>w.weight>0);
  const labels=names.map(v=>v.value.trim());
  if(!active.length)return {error:text(fa,'حداقل یک معیار فعال لازم است.','At least one criterion must be active.')};
  if(labels.some(v=>!v))return {error:text(fa,'نام دو مسیر را وارد کنید.','Enter names for both pathways.')};
  if(pathwayIdentity(labels[0])===pathwayIdentity(labels[1]))
   return {error:text(fa,'دو مسیر باید نام متفاوت داشته باشند.','Pathway names must be distinct.')};
  const input=active.map(({i,weight})=>({
   i,weight,values:ratings.map(selects=>Number(selects[i].value))
  }));
  if(input.some(x=>x.values.some(v=>!Number.isInteger(v)||v<1||v>5))){
   return {error:text(fa,'برای هر معیارِ دارای اهمیت، ارزیابی هر دو مسیر را مشخص کنید.','Rate both pathways on every active criterion.')};
  }
  const weightTotal=input.reduce((a,x)=>a+x.weight,0);
  const scores=labels.map((_,index)=>input.reduce((a,x)=>a+x.weight*x.values[index],0)/weightTotal);
  const gaps=input.map(x=>({
   ...x,
   difference:Math.abs(x.values[0]-x.values[1])*x.weight
  })).sort((a,b)=>b.difference-a.difference);
  return {labels,scores,input,top:gaps[0]};
 }
 function makeReport(data){
  const createdAt=new Date();
  const provenance=el('section',null,'jr-cs-report-provenance');
  provenance.dataset.reportFormat=REPORT_FORMAT;
  provenance.append(
   el('h4',text(fa,'شناسنامه گزارش شخصی','Personal report provenance')),
   el('p',text(fa,'نسخه قالب: ','Format version: ')+REPORT_FORMAT),
   el('p',text(fa,'تهیه‌شده در این دستگاه: ','Generated on this device: ')+
     createdAt.toLocaleString(fa?'fa-IR':'en-US')),
   el('p',text(fa,
     'منبع اعداد: فقط وزن‌ها و ارزیابی‌های واردشده در همین نشست؛ بدون اطلاعات رسمی دانشگاه، نمره روان‌سنجی یا تأیید یک متخصص.',
     'Source of figures: only the weights and ratings entered in this session; no official university record, psychometric score or professional verification.'))
  );
  const outcome=el('div',null,'jr-cs-outcome');
  outcome.append(el('h4',text(fa,'جمع‌بندی توصیفی شما','Your descriptive outcome')));
  const difference=Math.abs(data.scores[0]-data.scores[1]);
  const preferred=data.scores[0]>data.scores[1]?0:1;
  outcome.append(el('p',difference<1e-10?
   text(fa,'برآوردهای فعلی شما شاخص‌های برابر ایجاد کرده‌اند؛ تفاوتی برای اولویت‌بندی موقت نشان داده نشده است.','Your entries produced equal indices; no provisional preference is indicated.'):
   text(fa,'بر اساس وزن‌ها و برآوردهای خودتان، گزینه‌ای که فعلاً ارزش بررسی بیشتر دارد: ','Based on your own weights and ratings, the pathway to investigate first is: ')+data.labels[preferred]));
  const indices=el('div',null,'jr-cs-report-indices');
  data.labels.forEach((label,i)=>{
   const metric=el('div',null,'jr-cs-report-index');
   metric.append(el('strong',label),el('span',text(fa,'شاخص ترجیح شخصی (از ۵)','Personal preference index (out of 5)')));
   metric.append(el('b',data.scores[i].toLocaleString(fa?'fa-IR':'en-US',{maximumFractionDigits:2})));
   indices.append(metric);
  });
  outcome.append(indices);
  if(data.top&&data.top.difference>0)
   outcome.append(el('p',text(fa,'بیشترین اختلافِ وزن‌دار در پاسخ‌ها مربوط به «','The largest weighted difference in your entries concerns “')+
    criteria[data.top.i][fa?0:1]+text(fa,'» است؛ شواهد مخالف این برداشت را نیز بررسی کنید.','”; look for evidence that might contradict it.')));
  const evidence=el('section',null,'jr-cs-report-evidence');
  evidence.append(el('h5',text(fa,'جزئیات معیارهای ارزیابی‌شده','Assessed criteria and ratings')));
  const list=el('ul');
  data.input.forEach(row=>{
   const item=el('li');
   item.append(el('strong',criteria[row.i][fa?0:1]));
   item.append(el('span',text(fa,'اهمیت: ','Importance: ')+row.weight.toLocaleString(fa?'fa-IR':'en-US')+
    text(fa,' · اول: ',' · first: ')+row.values[0].toLocaleString(fa?'fa-IR':'en-US')+
    text(fa,' · دوم: ',' · second: ')+row.values[1].toLocaleString(fa?'fa-IR':'en-US')));
   list.append(item);
  });
  evidence.append(list);
  // Tailored inquiry prompts highlight a self-reported weak-fit area for each
  // option, weighted by the learner's own priorities. This is neither a score
  // of personal ability nor an externally assessed deficit.
  const inquiryPrompts=[
   ['یک فعالیت کوتاه مرتبط انجام دهید؛ تفاوت علاقه اعلامی و تجربه واقعی را یادداشت کنید.',
    'Try a related activity and record whether actual experience supports your stated interest.'],
   ['دفترچه رسمی و پیش‌نیازهای سال جاری را بررسی کنید؛ این فرم امکان ورود را تعیین نمی‌کند.',
    'Check current official eligibility and prerequisites; this worksheet cannot establish admission.'],
   ['هزینه‌های واقعی و منابع قابل‌دسترس را با ارقام و مدارک مستقل برآورد کنید.',
    'Verify real costs and available financial support through independent evidence.'],
   ['شرایط رفت‌وآمد، محل زندگی و تعهدات خانوادگی را با زمان‌بندی واقعی بسنجید.',
    'Check commute, location and family commitments against a realistic weekly timetable.'],
   ['راه‌های تغییر مسیر و انعطاف برنامه را در مقررات و سرفصل‌های رسمی بررسی کنید.',
    'Review official transfer options, course flexibility and alternative routes.']
  ];
  const checks=el('section',null,'jr-cs-report-priorities');
  checks.append(el('h5',text(fa,'اولویت بررسی برای هر گزینه، بر اساس پاسخ‌های خودتان','Priority check for each option, based on your own ratings')));
  const checkList=el('ul');
  data.labels.forEach((label,index)=>{
   const ranked=data.input.map(item=>({
    index:item.i,
    weightedGap:item.weight*(5-item.values[index]),
    judgement:item.values[index]
   })).sort((a,b)=>b.weightedGap-a.weightedGap||a.index-b.index);
   const focus=ranked[0];
   if(!focus)return;
   const item=el('li');
   item.append(el('strong',label+' — '+criteria[focus.index][fa?0:1]));
   item.append(el('p',text(fa,'در برآورد شخصی شما، این معیار با توجه به اهمیت انتخابی نیازمند وارسی بیشتری است. ',
     'Given your own weights and impressions, this criterion deserves an independent check. ')+
     inquiryPrompts[focus.index][fa?0:1]));
   checkList.append(item);
  });
  checks.append(checkList);
  evidence.append(checks);
  const next=el('section',null,'jr-cs-report-next');
  next.append(el('h5',text(fa,'برای رسیدن به تصمیم قابل دفاع','Steps before a defensible decision')));
  const steps=fa?[
    'ضوابط و دفترچه رسمیِ سال جاری، پیش‌نیازها و شرایط ورود هر مسیر را مستقلاً بررسی کنید.',
    'سرفصل‌ها و فعالیت‌های واقعی هر مسیر را با گفت‌وگو با فرد مطلع یا دانشجو بررسی کنید.',
    'یک فعالیت کوتاه مرتبط انجام دهید و آنچه اتفاق افتاد و توضیح‌های رقیب را یادداشت کنید.',
    'در تعارض جدی میان شرایط تحصیلی، خانواده، منابع مالی و علاقه، از مشاور واجد صلاحیت کمک بگیرید.'
   ]:[
    'Check current official entry rules, qualifications and prerequisites independently.',
    'Examine actual course content and speak with an informed learner or practitioner.',
    'Try a small related activity and record observations, including rival explanations.',
    'Seek qualified guidance if eligibility, finances, family circumstances and interests conflict.'
   ];
  const ol=el('ol');steps.forEach(step=>ol.append(el('li',step)));next.append(ol);
  const links=el('div',null,'jr-cs-report-links');
  const guide=el('a',text(fa,'راهنمای ماتریس تصمیم رشته‌ها','Qualitative decision guide'));
  guide.href=fa?'/fa/rahnamaha/moghayese-reshteha-ba-matris-tasmim/':'/en/student-guidance/';
  const bahar=el('a',text(fa,'ادامه یادداشت تجربه در BAHAR','Continue activity notes in BAHAR'));
  bahar.href=fa?'/fa/app/student/bahar/#baharWorkingPlan':'/en/golden-talent/dashboard/bahar/#baharWorkingPlan';
  // Optional human support is a separate, owner-published consultation
  // workflow. No pathway name, rating or report is sent to that route.
  const consult=el('a',text(fa,
    'درخواست اختیاری بررسی با مشاور',
    'Optional review with an adviser'));
  consult.href=fa?'/fa/darkhast-moshavere/':'/en/request-consultation/';
  links.append(guide,bahar,consult);next.append(links);
  next.append(el('p',text(fa,
    'بازکردن صفحه مشاوره هیچ‌یک از پاسخ‌ها، وزن‌ها یا گزارش فعلی را منتقل نمی‌کند. بررسی انسانی تنها در صورت درخواست جداگانه و پذیرش شرایط همان خدمت انجام می‌شود.',
    'Opening the consultation page does not transfer any pathway, weight, rating or report. Human review is a separate, optional service with its own conditions.')));
  const disclaimer=el('p',text(fa,
   'محدودیت علمی: این گزارش فقط تحلیل ورودی‌های همین نشست است؛ هیچ استعداد، نمره استاندارد، امکان قبولی، صلاحیت ورود یا آینده‌ای را اندازه‌گیری یا پیش‌بینی نمی‌کند. داده‌ها ذخیره یا ارسال نمی‌شوند.',
   'Scientific limitation: this report interprets your inputs during this session only. It does not measure aptitude, standardised ability, admission, eligibility or future success. Nothing is stored or transmitted.'
  ),'jr-cs-report-disclaimer');
  report.replaceChildren(provenance,outcome,evidence,next,disclaimer);
 }
 trigger.addEventListener('click',()=>{
  const data=snapshot();
  if(data.error){
   hide();
   root.querySelector('.jr-cs-live').textContent=data.error;
   return;
  }
  makeReport(data);
  report.hidden=false;print.hidden=false;
  trigger.setAttribute('aria-expanded','true');
  report.focus({preventScroll:true});
  report.scrollIntoView({block:'nearest',behavior:'instant'});
 });
 form.addEventListener('input',hide);
 form.addEventListener('change',hide);
 form.addEventListener('reset',hide);
 print.addEventListener('click',()=>{if(!report.hidden)window.print();});
 root.dataset.choiceFeedback='ready';
}
document.querySelectorAll('[data-choice-studio]').forEach(enhance);
})();