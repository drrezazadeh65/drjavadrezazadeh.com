/* Read-only BAHAR production readiness indicator. No learner data or hidden writes. */
(()=>{'use strict';
 const section=document.querySelector('[data-bahar-health]');
 if(!section)return;
 const button=section.querySelector('[data-bahar-check]');
 const output=section.querySelector('[data-bahar-result]');
 if(!button||!output)return;
 const en=document.documentElement.lang==='en';
 const t=(fa,english)=>en?english:fa;
 let requestId=0,controller=null;
 function reset(){
   ++requestId;
   if(controller)controller.abort();
   controller=null;button.disabled=false;
   output.replaceChildren();
 }
 function line(message){
   const p=document.createElement('p');p.textContent=message;output.append(p);
 }
 button.addEventListener('click',async()=>{
   reset();
   const id=requestId,abort=new AbortController();
   controller=abort;button.disabled=true;
   line(t('در حال دریافت وضعیت سامانه…','Checking live infrastructure status…'));
   const deadline=setTimeout(()=>abort.abort(),10000);
   try{
     const response=await fetch('/api/golden-talent/health',{
       method:'GET',cache:'no-store',credentials:'same-origin',
       headers:{Accept:'application/json'},signal:abort.signal
     });
     if(id!==requestId||document.hidden)return;
     const data=await response.json();
     if(!response.ok||data?.ok!==true||data.service!=='golden-talent'
       ||!data.baharReadiness)throw new Error('UNVERIFIED');
     output.replaceChildren();
     const state=data.baharReadiness;
     const rows=[
       [t('جداول موردنیاز در دیتابیس برتینا','Required Bertina database columns'),
        state.bertinaMysqlSchemaColumnsAvailable],
       [t('ذخیره و بازیابی خصوصی چرخه‌ها','Private cycles and evidence API'),
        state.weeklyCycleAndEvidenceApiActive],
       [t('مجوز والد/سرپرست در پرونده طولی','Consent-scoped portfolio authorisation'),
        state.consentScopedPortfolioAccessActive],
       [t('بازبینی انسانی در API','Human professional review API'),
        state.professionalReviewApiActive],
       [t('اعتبارسنجی علمی تحلیل روند','Scientifically validated longitudinal analysis'),
        state.longitudinalTrendValidated]
     ];
     const list=document.createElement('dl');
     for(const [name,value] of rows){
       const term=document.createElement('dt');term.textContent=name;
       const description=document.createElement('dd');
       description.textContent=value===true?
         t('ساختار یا قابلیت گزارش شده؛ هنوز نیازمند آزمون پذیرش','Reported ready; acceptance testing still required'):
         t('هنوز تأیید نشده / غیرفعال','Not verified / inactive');
       list.append(term,description);
     }
     output.append(list);
     line(t('BAHAR هنوز به‌عنوان پرونده رشد عملیاتی برای ثبت اطلاعات واقعی فعال نشده است. وجود جدول، به معنای مجوز ثبت داده دانش‌آموز یا اعتبارسنجی علمی نیست.',
       'BAHAR is not enabled for real learner portfolios. Schema presence is not consent, production acceptance or scientific validation.'));
   }catch(_error){
     if(id!==requestId||document.hidden)return;
     output.replaceChildren();
     line(t('اتصال وضعیت BAHAR قابل تأیید نیست؛ داده یا قابلیت فعال فرض نمی‌شود.',
       'BAHAR readiness could not be verified; no capability is assumed to be live.'));
   }finally{
     clearTimeout(deadline);
     if(id===requestId){button.disabled=false;controller=null;}
   }
 });
 document.addEventListener('visibilitychange',()=>{if(document.hidden)reset()});
 window.addEventListener('pagehide',reset);
})();
