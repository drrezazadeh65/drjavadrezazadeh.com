/* Golden Talent verified guardian entry point — private, read-only, no persisted responses. */
(()=>{'use strict';
 const root=document.querySelector('[data-gt-guardian]');
 if(!root)return;
 const english=document.documentElement.lang==='en';
 const t=(fa,en)=>english?en:fa;
 const load=root.querySelector('[data-gt-guardian-load]');
 const output=root.querySelector('[data-gt-guardian-result]');
 if(!load||!output)return;
 let revision=0,controller=null;
 const clear=()=>{
   ++revision;
   if(controller)controller.abort();
   controller=null;
   load.disabled=false;
   output.replaceChildren();
 };
 const message=(text,link)=>{
   const p=document.createElement('p');p.textContent=text;output.append(p);
   if(link){
     const a=document.createElement('a');
     a.href=english?'/en/login/':'/fa/login/';
     a.textContent=t('ورود یا ثبت‌نام در حساب تأییدشده','Sign in to a verified account');
     output.append(a);
   }
 };
 load.addEventListener('click',async()=>{
   clear();
   const current=revision;
   const requestController=new AbortController();
   controller=requestController;
   load.disabled=true;
   message(t('در حال بررسی رابطه سرپرستی و رضایت معتبر…','Checking verified guardianship and current consent…'));
   const timeout=setTimeout(()=>requestController.abort(),12000);
   try{
     const response=await fetch('/api/golden-talent/my-subjects',{
       method:'GET',credentials:'same-origin',cache:'no-store',
       headers:{Accept:'application/json'},signal:requestController.signal
     });
     if(current!==revision||document.hidden)return;
     output.replaceChildren();
     if(response.status===401||response.status===403){
       message(t('برای مشاهده فقط روابط تأییدشده، ابتدا با حساب دارای ایمیل تأییدشده وارد شوید.',
         'Sign in with a verified email account to check authorised relationships.'),true);
       return;
     }
     if(!response.ok){
       message(t('پایگاه داده یا مجوزهای Golden Talent هنوز آماده یا قابل تأیید نیست؛ هیچ پرونده‌ای نمایش داده نمی‌شود.',
         'Golden Talent storage or authorisation is not yet confirmed; no learner records are displayed.'));
       return;
     }
     const data=await response.json();
     if(data?.ok!==true||data.scope!=='verified_guardian_current_assessment_consent'
       ||!Array.isArray(data.learners)||data.learners.length>25)throw Error('invalid response');
     if(data.learners.length===0){
       message(t('اکنون هیچ پرونده‌ای با رابطه سرپرستی و رضایت معتبر برای این حساب قابل نمایش نیست. نبود پرونده، به معنی نبود دانش‌آموز یا حذف سوابق نیست.',
         'No learner currently meets both verified guardianship and current assessment consent for this account. This does not mean records were deleted.'));
       return;
     }
     const intro=document.createElement('p');
     intro.textContent=t('فقط نام مستعار پرونده‌های مجاز نمایش داده می‌شود. پاسخ آزمون، امتیاز، گزارش و یادداشت خصوصی قابل مشاهده نیست.',
       'Only permitted learner aliases are shown. No responses, scores, reports or private notes are available.');
     output.append(intro);
     const list=document.createElement('ul');
     for(const item of data.learners){
       if(!item||item.relationship!=='VERIFIED_GUARDIAN'||item.assessmentConsent!=='CURRENT'
         ||typeof item.displayName!=='string'||!Array.isArray(item.availableActions)
         ||item.availableActions.length!==0)continue;
       const li=document.createElement('li');
       li.textContent=item.displayName||t('پرونده بدون نام نمایشی','Unnamed learner record');
       list.append(li);
     }
     output.append(list);
   }catch(e){
     if(current!==revision||document.hidden)return;
     output.replaceChildren();
     message(t('دسترسی امن در این لحظه تأیید نشد. داده‌ای از حافظه محلی جایگزین نمی‌شود.',
       'Authorised access could not be verified. No locally cached records are substituted.'));
   }finally{
     clearTimeout(timeout);
     if(current===revision){load.disabled=false;controller=null;}
   }
 });
 document.addEventListener('visibilitychange',()=>{if(document.hidden)clear()});
 window.addEventListener('pagehide',clear);
})();
