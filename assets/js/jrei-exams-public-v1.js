/* JR examination centre — source-driven metadata only; no client checkout. */
(()=>{
 'use strict';
 const root=document.querySelector('[data-jrei-exam-catalogue]');
 const status=document.querySelector('[data-jrei-exam-status]');
 if(!root||!status)return;
 const en=document.documentElement.lang==='en';
 const T=(fa,english)=>en?english:fa;
 const fmt=new Intl.NumberFormat(en?'en-US':'fa-IR');
 const date=new Intl.DateTimeFormat(en?'en-GB':'fa-IR',{
   timeZone:'Asia/Tehran',dateStyle:'medium',timeStyle:'short'
 });
 const label=(fa,english)=>en?english:fa;
 const el=(tag,value,cls)=>{
   const item=document.createElement(tag);
   if(cls)item.className=cls;
   if(value!==undefined)item.textContent=String(value);
   return item;
 };
 const text=x=>typeof x==='string'?x.slice(0,250):'';
 const timestamp=x=>Number.isSafeInteger(x)&&x>0&&x<4102444800?
   date.format(new Date(x*1000)):T('تأیید نشده','Not verified');
 const DIVISIONS={
   KONKUR:T('آزمون‌های ورودی کارشناسی','Undergraduate entrance'),
   MASTERS:T('آزمون‌های کارشناسی ارشد','Master’s entrance'),
   DOCTORAL:T('آزمون‌های دکتری','Doctoral entrance'),
   SCHOOL:T('آزمون‌های مدرسه','School examinations')
 };
 const info=(box,title,value)=>{
   box.append(el('dt',title),el('dd',value));
 };
 async function load(){
   const controller=new AbortController();
   const handle=setTimeout(()=>controller.abort(),12000);
   status.textContent=T('در حال بررسی فهرست تأییدشده…',
     'Checking the review-approved catalogue…');
   try{
     const response=await fetch('/api/exams/catalog',{
       method:'GET',cache:'no-store',credentials:'omit',
       headers:{Accept:'application/json'},signal:controller.signal
     });
     if(!response.ok)throw Error('CATALOGUE_UNAVAILABLE');
     const data=await response.json();
     if(!data||data.schema!=='jr.jrei.exam-commercial-catalogue.v1'||
       data.enabled!==true||data.schemaReady!==true||
       !Array.isArray(data.items)||data.items.length>24)
       throw Error('CATALOGUE_UNAVAILABLE');
     const safe=[];
     for(const item of data.items){
       if(!item||!Object.prototype.hasOwnProperty.call(DIVISIONS,item.division)||
          !/^[a-z0-9._-]{1,70}$/i.test(item.code||'')||
          typeof item.titleFa!=='string'||item.titleFa.length>180||
          !Number.isSafeInteger(item.durationSeconds)||
          item.durationSeconds<60||item.durationSeconds>28800||
          item.checkoutEnabled!==false)
         continue;
       safe.push(item);
     }
     const blocks=document.createDocumentFragment();
     for(const item of safe){
       const card=el('article',undefined,'jr-offering');
       card.append(el('h3',en&&item.titleEn?text(item.titleEn):text(item.titleFa)));
       card.append(el('p',DIVISIONS[item.division]));
       const dl=el('dl');
       info(dl,T('شروع جلسهٔ برنامه‌ریزی‌شده','Scheduled platform session'),
         timestamp(item.opensAt));
       info(dl,T('مدت زمان','Duration'),fmt.format(item.durationSeconds/60)+
         T(' دقیقه',' minutes'));
       info(dl,T('حداکثر تلاش','Attempt limit'),fmt.format(item.maxAttempts));
       card.append(dl);
       card.append(el('p',T(
         'ثبت‌نام و خرید هنوز فعال نیست؛ اطلاعات نمایش‌داده‌شده تنها معرفی جلسهٔ تأییدشده است.',
         'Registration and checkout remain disabled. These details describe a reviewed schedule only.'),
         'jr-pending'));
       blocks.append(card);
     }
     root.replaceChildren(blocks);
     status.textContent=safe.length?
       T('جلسه‌های معرفی‌شده از داده‌های بررسی‌شدهٔ سرور دریافت شدند؛ فروش و شرکت در آزمون هنوز فعال نشده‌اند.',
         'Session metadata was read from the server; purchase and exam delivery are not yet enabled.'):
       T('هنوز آزمون تجاری آمادهٔ ثبت‌نام در فهرست وجود ندارد.',
         'No commercial examination is currently ready for registration.');
   }catch{
     root.replaceChildren();
     status.textContent=T(
       'فهرست تأییدشده در دسترس نیست. هیچ جلسه، قیمت یا ظرفیت فرضی نمایش داده نمی‌شود.',
       'The approved catalogue is unavailable. No hypothetical sessions, prices or capacity are shown.');
   }finally{clearTimeout(handle);}
 }
 if(document.visibilityState==='visible')load();
 else document.addEventListener('visibilitychange',()=>{
   if(document.visibilityState==='visible'&&!root.childElementCount)load();
 },{once:true});
})();
