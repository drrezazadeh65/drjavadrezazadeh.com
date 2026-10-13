/* BAHAR: minimal, consent-scoped guardian coverage only; no educational record detail. */
(()=>{'use strict';
 const root=document.querySelector('[data-bahar-guardian]');
 if(!root)return;
 const en=document.documentElement.lang==='en';
 const t=(fa,english)=>en?english:fa;
 const button=root.querySelector('[data-bahar-guardian-check]');
 const output=root.querySelector('[data-bahar-guardian-result]');
 if(!button||!output)return;
 let revision=0,controller=null;
 function clear(){
   ++revision;
   if(controller)controller.abort();
   controller=null;button.disabled=false;output.replaceChildren();
 }
 function message(value,showLogin=false){
   const p=document.createElement('p');p.textContent=value;output.append(p);
   if(showLogin){
     const a=document.createElement('a');
     a.href=en?'/en/login/':'/fa/login/';
     a.textContent=t('ورود به حساب تأییدشده','Sign in to a verified account');
     output.append(a);
   }
 }
 const count=n=>Number.isSafeInteger(n)&&n>=0&&n<=1000000?n:null;
 button.addEventListener('click',async()=>{
   clear();
   const id=revision,ctrl=new AbortController();
   controller=ctrl;button.disabled=true;
   message(t('در حال تأیید سرپرستی و رضایت مستقل برای مشاهده…',
     'Verifying guardianship and separate parent-visibility consent…'));
   const timeout=setTimeout(()=>ctrl.abort(),12000);
   try{
     const response=await fetch('/api/golden-talent/my-bahar-overview',{
       method:'GET',credentials:'same-origin',cache:'no-store',
       headers:{Accept:'application/json'},signal:ctrl.signal
     });
     if(id!==revision||document.hidden)return;
     output.replaceChildren();
     if(response.status===401||response.status===403){
       message(t('برای بررسی دسترسی به حساب تأییدشده وارد شوید.',
         'Sign in to your verified account to check access.'),true);
       return;
     }
     if(!response.ok)throw Error('unavailable');
     const data=await response.json();
     if(data?.ok!==true||data?.schema!=='bahar-guardian-overview-v1'
       ||data?.scope!=='verified_guardian_assessment_and_parent_visibility'
       ||!Array.isArray(data.learners)||data.learners.length>25
       ||data.rawEvidenceExposed!==false||data.interpretationsExposed!==false)
       throw Error('unexpected private contract');
     if(data.learners.length===0){
       message(t('هیچ خلاصه مجازی برای این حساب یافت نشد. ممکن است رابطه سرپرستی، رضایت مستقل مشاهده یا داده‌های پرونده هنوز ثبت نشده باشد.',
         'No authorised summary is available. Verified guardianship, separate visibility consent or records may be absent.'));
       return;
     }
     message(t('تعداد پرونده‌ها و چرخه‌ها فقط برای اطلاع است؛ شاخص رشد یا کیفیت عملکرد نیست.',
       'Counts describe record coverage only, not progress or performance.'));
     const list=document.createElement('ul');
     for(const learner of data.learners){
       if(!learner||typeof learner.learnerAlias!=='string'
         ||learner.learnerAlias.length>120)throw Error('invalid alias');
       const p=count(learner.portfolioCount),c=count(learner.weeklyCycleCount),
         r=count(learner.humanReviewedCycleCount);
       if(p===null||c===null||r===null||r>c)throw Error('invalid counts');
       const li=document.createElement('li');
       li.textContent=(learner.learnerAlias||t('پرونده مجاز','Authorised record'))+
         ' — '+t('پرونده رشد: ','Portfolios: ')+p+
         ' · '+t('چرخه ثبت‌شده: ','Recorded cycles: ')+c+
         ' · '+t('چرخه بازبینی‌شده: ','Human-reviewed cycles: ')+r;
       list.append(li);
     }
     output.append(list);
   }catch(_error){
     if(id!==revision||document.hidden)return;
     output.replaceChildren();
     message(t('بررسی امن BAHAR در این لحظه موفق نبود. هیچ اطلاعات ذخیره‌شده‌ای به‌جای پاسخ سرور نمایش داده نمی‌شود.',
       'Authorised BAHAR lookup is unavailable. No cached learner data is substituted.'));
   }finally{
     clearTimeout(timeout);
     if(id===revision){controller=null;button.disabled=false;}
   }
 });
 document.addEventListener('visibilitychange',()=>{if(document.hidden)clear()});
 window.addEventListener('pagehide',clear);
})();
