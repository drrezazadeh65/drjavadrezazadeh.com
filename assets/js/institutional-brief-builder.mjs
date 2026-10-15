/**
 * Private-by-default institutional brief composer, shared across FA and EN.
 * No account state, browser storage, provider call, analytics or submission.
 * The user alone chooses whether to send an email using their own mail app.
 */
const catalogue=Object.freeze({
  keynote:{fa:'سخنرانی دعوتی یا نشست علمی',en:'Keynote, invited talk or panel',service:null},
  workshop:{fa:'کارگاه تخصصی آموزشی',en:'Specialist educational workshop',service:'service:specialist_workshop_120'},
  teacher:{fa:'توسعه حرفه‌ای و آموزش معلمان',en:'Teacher education and professional development',service:'service:teacher_dev_90'},
  advisory:{fa:'مشاوره راهبردی آموزشی سازمان',en:'Institutional educational advisory',service:'vip:institutional-advisory'},
  research:{fa:'مشاوره یا همکاری پژوهشی',en:'Research consultation or collaboration',service:'service:research_consult_60'}
});
const audiences=Object.freeze({
  school:{fa:'مدرسه یا شبکه مدارس',en:'School or school network'},
  university:{fa:'دانشگاه یا مرکز آموزش عالی',en:'University or higher education'},
  teachers:{fa:'انجمن معلمان یا مرکز تربیت مدرس',en:'Educator or teacher-development group'},
  research:{fa:'گروه پژوهشی یا ناشر',en:'Research group or publisher'},
  other:{fa:'مؤسسه یا سازمان دیگر',en:'Other institution'}
});
const windows=Object.freeze({
  flexible:{fa:'زمان انعطاف‌پذیر',en:'Flexible'},
  month:{fa:'در حدود یک ماه آینده',en:'Approximately within a month'},
  quarter:{fa:'در سه ماه آینده',en:'Within the next three months'},
  later:{fa:'بعداً، پس از توافق',en:'Later, subject to agreement'}
});
const modes=Object.freeze({
  remote:{fa:'برخط یا از راه دور',en:'Remote / online'},
  discuss:{fa:'نیازمند بررسی و توافق جداگانه',en:'To discuss separately'}
});
const sizes=Object.freeze({
  small:{fa:'حداکثر ۳۰ نفر',en:'Up to 30 people'},
  medium:{fa:'۳۱ تا ۱۰۰ نفر',en:'31–100 people'},
  large:{fa:'بیش از ۱۰۰ نفر',en:'Over 100 people'},
  unknown:{fa:'فعلاً مشخص نیست',en:'Not yet decided'}
});
function option(dict,key,lang){
  if(typeof key!=='string'||!Object.hasOwn(dict,key))throw new RangeError('invalid_option');
  return dict[key][lang];
}
export function composeInstitutionalBrief(input,lang='fa'){
  if(lang!=='fa'&&lang!=='en')throw new RangeError('invalid_locale');
  if(!input||typeof input!=='object')throw new TypeError('invalid_brief');
  const format=option(catalogue,input.format,lang);
  const audience=option(audiences,input.audience,lang);
  const when=option(windows,input.window,lang);
  const mode=option(modes,input.mode,lang);
  const size=option(sizes,input.size,lang);
  const raw=input.goal;
  if(typeof raw!=='string'||raw.trim().length<20||raw.length>450)
    throw new RangeError('invalid_goal');
  // Strip control characters, retaining ordinary line breaks only. Text is
  // assigned via textContent/value and URI-encoded before mailto navigation.
  const goal=raw.replace(/\r\n?/g,'\n').replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g,'').trim();
  if(goal.length<20)throw new RangeError('invalid_goal');
  const fa=lang==='fa';
  const subject=(fa?'درخواست همکاری حرفه‌ای: ':'Institutional enquiry: ')+format;
  const body=[
    fa?'پیش‌نویس درخواست همکاری (هنوز ارسال نشده است)':'Institutional enquiry draft (not yet sent)',
    (fa?'نوع همکاری: ':'Contribution: ')+format,
    (fa?'نوع سازمان: ':'Institution type: ')+audience,
    (fa?'اندازه تقریبی مخاطبان: ':'Approximate audience: ')+size,
    (fa?'زمان مورد نظر: ':'Preferred timeframe: ')+when,
    (fa?'شیوه اجرا: ':'Delivery preference: ')+mode,
    (fa?'مسئله و هدف اصلی:\n':'Primary problem and intended outcome:\n')+goal,
    fa
      ?'خواهشمند است تناسب درخواست، دامنه کار، امکان اجرا و شرایط حرفه‌ای و مالی جداگانه بررسی شود.'
      :'Please review feasibility, scope, availability, and professional or commercial terms separately.',
    fa
      ?'این پیش‌نویس قرارداد، رزرو، تضمین نتیجه یا تأیید پرداخت نیست. در مرحله نخست مدارک حساس ارسال نمی‌شود.'
      :'This draft is not a contract, booking, outcome guarantee or payment confirmation. No sensitive documents should accompany the initial enquiry.'
  ].join('\n\n');
  return {subject,body,serviceId:catalogue[input.format].service};
}
function mount(root){
  const form=root.querySelector('[data-ib-form]');
  const result=root.querySelector('[data-ib-result]');
  const preview=root.querySelector('[data-ib-preview]');
  const email=root.querySelector('[data-ib-email]');
  const copy=root.querySelector('[data-ib-copy]');
  const secure=root.querySelector('[data-ib-account]');
  const status=root.querySelector('[data-ib-status]');
  if(!form||!result||!preview||!email||!copy||!secure||!status)return;
  const lang=document.documentElement.lang==='fa'?'fa':'en';
  const say=(fa,en)=>lang==='fa'?fa:en;
  const safePath=lang==='fa'?'/fa/darkhast-moshavere/':'/en/request-consultation/';
  const reset=()=>{
    preview.value='';
    result.hidden=true;
    email.href='mailto:dr.rezazadeh65@gmail.com';
    secure.href=safePath;
    status.textContent='';
  };
  form.addEventListener('input',reset);
  form.addEventListener('change',reset);
  form.addEventListener('reset',()=>{reset();});
  form.addEventListener('submit',event=>{
    event.preventDefault();
    if(!form.reportValidity())return;
    try{
      const names=['format','audience','size','window','mode','goal'];
      const input=Object.fromEntries(names.map(name=>[name,form.elements.namedItem(name)?.value]));
      const draft=composeInstitutionalBrief(input,lang);
      preview.value=draft.body;
      email.href='mailto:dr.rezazadeh65@gmail.com?subject='+
        encodeURIComponent(draft.subject)+'&body='+encodeURIComponent(draft.body);
      // A secure account form receives only a known, public service SKU.
      // The confidential draft is never copied into the address bar.
      secure.href=safePath+(draft.serviceId?'?service='+encodeURIComponent(draft.serviceId):'');
      result.hidden=false;
      status.textContent=say('پیش‌نویس آماده است ولی ارسال نشده است. متن را بازبینی و سپس روش ارسال را انتخاب کنید.',
        'Your draft is ready but has not been sent. Review it and choose how to send.');
      preview.focus();
    }catch(_){
      reset();
      status.textContent=say('لطفاً گزینه‌ها و شرح هدف همکاری را بررسی کنید.',
        'Please review the options and the intended project outcome.');
    }
  });
  copy.addEventListener('click',async()=>{
    if(result.hidden)return;
    try{
      if(!navigator.clipboard?.writeText)throw new Error('clipboard_unavailable');
      await navigator.clipboard.writeText(preview.value);
      status.textContent=say('متن کپی شد. ارسال ایمیل همچنان بر عهده شماست.',
        'Draft copied. Sending the email remains your decision.');
    }catch(_){
      preview.focus();
      preview.select();
      status.textContent=say('متن انتخاب شد؛ از گزینه کپی دستگاه استفاده کنید.',
        'Draft selected. Use your device’s Copy action.');
    }
  });
  window.addEventListener('pagehide',reset);
  window.addEventListener('pageshow',e=>{if(e.persisted){form.reset();reset()}});
}
if(typeof document!=='undefined'){
  document.querySelectorAll('[data-institutional-brief-builder]').forEach(mount);
}
