/* Stage14: optional, bilingual, first-party lead capture for VERIFIED accounts.
 * The server alone authorises requests and their visibility. No personal free text,
 * payment information, sensitive records, persistent browser storage or analytics.
 * Email draft/contact paths remain available when verified intake is unavailable.
 */
(() => {
  'use strict';
  const form=document.querySelector('[data-stage14-consent-lead]');
  if(!form)return;
  const fa=document.documentElement.lang==='fa';
  const t=(persian,english)=>fa?persian:english;
  const choice=form.querySelector('[name="serviceId"]');
  const consent=form.querySelector('[name="consentGiven"]');
  const status=form.querySelector('[data-stage14-lead-status]');
  const mine=form.querySelector('[data-stage14-lead-mine]');
  const list=form.querySelector('[data-stage14-lead-list]');
  const submit=form.querySelector('[type="submit"]');
  const consentVersion='stage14-consultation-v1';
  const englishTitles=Object.freeze({
    academic_consult_60:'Specialist educational consultation',
    student_parent_90:'Joint student and parent session',
    konkur_consult_60:'Iranian university entrance exam consultation',
    konkur_month:'One-month university entrance exam guidance',
    transcript_analysis:'Academic transcript and pathway review',
    field_selection_standard:'University major selection — standard',
    field_selection_comprehensive:'Comprehensive university major selection',
    talent_initial:'Initial specialist talent exploration',
    golden_talent_comprehensive:'Golden Talent — comprehensive assessment and proposed pathway',
    golden_talent_premium:'Golden Talent — assessment, parent session and pathway report',
    teacher_consult_60:'Teacher, materials and assessment consultation',
    teacher_dev_90:'Teacher professional development session',
    manuscript_diagnostic:'Manuscript diagnostic review (up to 7,000 words)',
    academic_editing:'Academic English editing (up to 5,000 words)',
    research_consult_60:'Research consultation',
    journal_strategy:'Journal selection and publication strategy',
    reviewer_response:'Response-to-reviewers support (up to 20 comments)',
    academic_cv:'Academic CV and application/career guidance',
    academic_interview_90:'Academic or faculty interview preparation',
    organization_consult_90:'Institutional or school consultation',
    specialist_workshop_120:'Online specialist workshop (up to 2 hours)'
  });
  const say=message=>{status.textContent=message};
  const titleFor=service=>fa?service.title_fa:(englishTitles[service.id]||service.title_fa||service.id);
  async function loadCatalog(){
    try{
      const response=await fetch('/assets/data/service-catalog.json',{credentials:'same-origin',cache:'reload'});
      if(!response.ok)throw new Error('catalog');
      const catalog=await response.json();
      for(const service of (catalog.services||[])){
        if(service.sellable!==true||typeof service.id!=='string')continue;
        const option=document.createElement('option');
        option.value='service:'+service.id;
        option.textContent=titleFor(service);
        choice.append(option);
      }
      choice.disabled=choice.options.length<=1;
      submit.disabled=choice.disabled;
      if(choice.disabled)say(t('فهرست خدمات اکنون در دسترس نیست؛ از مسیر ایمیل استفاده کنید.',
        'The service catalogue is unavailable; please use the email contact option.'));
    }catch(_){say(t('فهرست خدمات در دسترس نیست؛ درخواست اولیه را از طریق ایمیل ارسال کنید.',
      'The service catalogue is unavailable. You can still enquire by email.'));}
  }
  async function callApi(url,body=null){
    const response=await fetch(url,{
      method:body===null?'GET':'POST',credentials:'same-origin',cache:'no-store',
      headers:body===null?{'Accept':'application/json'}:{'Accept':'application/json','Content-Type':'application/json'},
      ...(body===null?{}:{body:JSON.stringify(body)})
    });
    const data=await response.json().catch(()=>({ok:false}));
    if(!response.ok||data.ok!==true)throw {status:response.status,code:data.error||'unavailable'};
    return data;
  }
  function describe(error){
    if(error?.status===401)return t(
      'ثبت امن نیازمند ورود به حساب دارای ایمیل تأییدشده است. می‌توانید وارد حساب شوید یا از ایمیل جایگزین استفاده کنید.',
      'Sign in with a verified email account to submit securely, or use the email contact option.');
    if(error?.status===429)return t(
      'تعداد درخواست‌های اخیر بیش از حد مجاز است؛ از ارسال مجدد سریع خودداری کنید.',
      'Too many recent enquiries. Please do not resubmit rapidly.');
    if(error?.status===409)return t(
      'درخواست قبلی این خدمت در این ماه لغو شده است. برای پیگیری ضروری از ایمیل استفاده کنید.',
      'A request for this service was withdrawn this month. Use email for essential follow-up.');
    if(error?.status===503)return t(
      'زیرساخت ثبت امن درخواست در سرور هنوز فعال یا تأیید نشده است؛ مسیر ایمیل همچنان در دسترس است.',
      'Secure account intake is currently unavailable. The email contact route remains available.');
    return t('ثبت یا مشاهده درخواست انجام نشد. بدون تأیید سرور هیچ درخواستی را ثبت‌شده فرض نکنید.',
      'The server did not confirm the request. Do not assume it was received.');
  }
  form.addEventListener('submit',async e=>{
    e.preventDefault();
    if(!form.reportValidity()||choice.disabled||!consent.checked)return;
    submit.disabled=true;
    say(t('در حال دریافت تأیید سرور…','Awaiting server confirmation…'));
    try{
      const result=await callApi('/api/growth/leads',{
        serviceId:choice.value,purpose:'CONSULTATION_CONTACT',
        consentGiven:true,consentVersion,marketingOptIn:false
      });
      say(result.duplicate
        ?t('درخواست این خدمت قبلاً در حساب شما ثبت شده است؛ ثبت تکراری انجام نشد.',
           'This service enquiry is already recorded in your account; no duplicate was created.')
        :t('درخواست با رضایت صریح شما در سرور پذیرفته شد. این تأیید به معنی رزرو، خرید یا پرداخت نیست.',
           'The server received your consented enquiry. This is not a confirmed booking, purchase or payment.'));
      consent.checked=false;
    }catch(error){say(describe(error));}
    finally{submit.disabled=false;}
  });
  mine.addEventListener('click',async()=>{
    mine.disabled=true;
    say(t('در حال دریافت درخواست‌های متعلق به حساب شما…','Retrieving enquiries for your verified account…'));
    list.replaceChildren();
    try{
      const data=await callApi('/api/growth/leads/mine');
      if(!Array.isArray(data.requests)||data.requests.length===0){
        say(t('در این حساب، درخواست فعال و قابل مشاهده‌ای گزارش نشد.',
          'There are no visible active enquiries for this account.'));
        return;
      }
      say(t('فقط درخواست‌های حساب تأییدشده فعلی نمایش داده می‌شوند.',
        'Only enquiries belonging to the current verified account are shown.'));
      for(const r of data.requests){
        const entry=document.createElement('li');
        const span=document.createElement('span');
        const serviceId=String(r.service_id||t('خدمت','Service'));
        const state=String(r.state||t('نامشخص','Unknown'));
        span.textContent=serviceId+' — '+state+' ';
        entry.append(span);
        if(r.state!=='WITHDRAWN'&&typeof r.id==='string'){
          const button=document.createElement('button');
          button.type='button';
          button.textContent=t('لغو رضایت این درخواست','Withdraw consent for this enquiry');
          button.addEventListener('click',async()=>{
            button.disabled=true;
            try{
              const out=await callApi('/api/growth/leads/withdraw',{leadId:r.id});
              if(out.state==='WITHDRAWN'){
                span.textContent=serviceId+' — WITHDRAWN ';
                button.remove();
                say(t('رضایت این درخواست لغو شد؛ داده باید طبق سیاست نگهداری پردازش شود.',
                  'Consent was withdrawn. The record remains subject to the stated retention policy.'));
              }else button.disabled=false;
            }catch(error){button.disabled=false;say(describe(error));}
          });
          entry.append(button);
        }
        list.append(entry);
      }
    }catch(error){say(describe(error));}
    finally{mine.disabled=false;}
  });
  loadCatalog();
})();
