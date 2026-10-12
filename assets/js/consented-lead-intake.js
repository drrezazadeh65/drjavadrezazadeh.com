/* Stage14: optional first-party lead capture for VERIFIED account holders.
   No free text, files, assessment answers, phone or social identifiers collected.
   The existing user-controlled mailto fallback remains available. */
(() => {
  'use strict';
  const form=document.querySelector('[data-stage14-consent-lead]');
  if (!form) return;
  const choice=form.querySelector('[name="serviceId"]');
  const consent=form.querySelector('[name="consentGiven"]');
  const status=form.querySelector('[data-stage14-lead-status]');
  const mine=form.querySelector('[data-stage14-lead-mine]');
  const list=form.querySelector('[data-stage14-lead-list]');
  const submit=form.querySelector('[type="submit"]');
  const consentVersion='stage14-consultation-v1';
  const say=message=>{status.textContent=message};
  async function loadCatalog(){
    try {
      const response=await fetch('/assets/data/service-catalog.json',{credentials:'same-origin',cache:'reload'});
      if(!response.ok)throw new Error('catalog');
      const catalog=await response.json();
      for(const service of (catalog.services||[])) {
        if(service.sellable!==true||typeof service.id!=='string')continue;
        const option=document.createElement('option');
        option.value='service:'+service.id;
        option.textContent=service.title_fa;
        choice.append(option);
      }
      choice.disabled=choice.options.length<=1;
      submit.disabled=choice.disabled;
      if(choice.disabled)say('فهرست خدمات اکنون در دسترس نیست؛ از مسیر ایمیل استفاده کنید.');
    }catch(_){say('فهرست خدمات در دسترس نیست؛ درخواست اولیه را از طریق ایمیل ارسال کنید.');}
  }
  async function callApi(url,body=null) {
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
    if(error?.status===401)return 'ثبت امن نیازمند ورود به حساب دارای ایمیل تأییدشده است. می‌توانید وارد حساب شوید یا از ایمیل جایگزین استفاده کنید.';
    if(error?.status===429)return 'تعداد درخواست‌های اخیر بیش از حد مجاز است؛ از ارسال مجدد سریع خودداری کنید.';
    if(error?.status===409)return 'درخواست قبلی این خدمت در این ماه لغو شده است. برای پیگیری ضروری از ایمیل استفاده کنید.';
    if(error?.status===503)return 'زیرساخت ثبت امن درخواست در سرور هنوز فعال یا تأیید نشده است؛ مسیر ایمیل همچنان در دسترس است.';
    return 'ثبت یا مشاهده درخواست انجام نشد. بدون تأیید سرور هیچ درخواستی را ثبت‌شده فرض نکنید.';
  }
  form.addEventListener('submit',async e=>{
    e.preventDefault();
    if(!form.reportValidity()||choice.disabled||!consent.checked)return;
    submit.disabled=true;say('در حال دریافت تأیید سرور…');
    try{
      const result=await callApi('/api/growth/leads',{
        serviceId:choice.value,purpose:'CONSULTATION_CONTACT',
        consentGiven:true,consentVersion,marketingOptIn:false
      });
      say(result.duplicate
        ? 'درخواست این خدمت قبلاً در حساب شما ثبت شده است؛ ثبت تکراری انجام نشد.'
        : 'درخواست با رضایت صریح شما در سرور پذیرفته شد. این تأیید به معنی رزرو، خرید یا پرداخت نیست.');
      consent.checked=false;
    }catch(error){say(describe(error));}
    finally{submit.disabled=false;}
  });
  mine.addEventListener('click',async()=>{
    mine.disabled=true;say('در حال دریافت درخواست‌های متعلق به حساب شما…');
    list.replaceChildren();
    try {
      const data=await callApi('/api/growth/leads/mine');
      if(!Array.isArray(data.requests)||data.requests.length===0){
        say('در این حساب، درخواست فعال و قابل مشاهده‌ای گزارش نشد.');return;
      }
      say('فقط درخواست‌های حساب تأییدشده فعلی نمایش داده می‌شوند.');
      for(const r of data.requests){
        const entry=document.createElement('li');
        const span=document.createElement('span');
        span.textContent=String(r.service_id||'خدمت')+' — '+String(r.state||'نامشخص')+' ';
        entry.append(span);
        if(r.state!=='WITHDRAWN' && typeof r.id==='string'){
          const button=document.createElement('button');button.type='button';button.textContent='لغو رضایت این درخواست';
          button.addEventListener('click',async()=>{
            button.disabled=true;
            try{
              const out=await callApi('/api/growth/leads/withdraw',{leadId:r.id});
              if(out.state==='WITHDRAWN'){span.textContent=String(r.service_id||'خدمت')+' — WITHDRAWN ';button.remove();say('رضایت این درخواست لغو شد؛ امکان دریافت یا مشاهده مجدد داده باید مطابق سیاست نگهداری کنترل شود.');}
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
