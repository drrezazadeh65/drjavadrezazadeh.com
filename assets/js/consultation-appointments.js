/* Private buyer consultation appointment view.
 * Powered by existing same-origin purchase history and paid-order fulfilment
 * evidence. No hidden writes, auto-bookings, personal notes or browser storage.
 */
(()=>{'use strict';
 const section=document.querySelector('[data-consultation-appointments]');
 if(!section)return;
 const button=section.querySelector('[data-consultation-check]');
 const output=section.querySelector('[data-consultation-results]');
 if(!button||!output)return;
 const en=document.documentElement.lang==='en';
 const t=(fa,english)=>en?english:fa;
 const locale=en?'en-GB':'fa-IR';
 const el=(tag,value,cls)=>{const n=document.createElement(tag);
   if(value!==undefined)n.textContent=String(value);
   if(cls)n.className=cls;return n;};
 let revision=0,controller=null;
 const clear=()=>{
   revision++;
   if(controller)controller.abort();
   controller=null;button.disabled=false;output.replaceChildren();
 };
 const message=(txt,login=false)=>{
   output.append(el('p',txt));
   if(login){
     const a=el('a',t('ورود به حساب ایمیل تأییدشده','Sign in with your verified email'),'button');
     a.href=en?'/en/login/':'/fa/login/';output.append(a);
   }
 };
 const paidService=order=>order.paymentVerified===true&&
   Array.isArray(order.items)&&order.items.some(x=>typeof x?.sku==='string'&&
     /^(service|vip):[a-z0-9_-]+$/.test(x.sku));
 const formatTime=value=>{
   if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value))return null;
   const date=new Date(value.replace(' ','T')+'Z');
   if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,19)!==value.replace(' ','T'))return null;
   return new Intl.DateTimeFormat(locale,{dateStyle:'full',timeStyle:'short'}).format(date);
 };
 const timezone=Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC';
 const DELIVERY_LABELS={
   PHONE:t('تلفنی','Telephone'),
   VOICE:t('تماس صوتی آنلاین','Online voice call'),
   VIDEO:t('آنلاین تصویری','Online video'),
   IN_PERSON:t('حضوری (صرفاً VIP یا کوچینگ سالانه)','In person (VIP or annual coaching only)')
 };
 const CITY_LABELS={TEHRAN:t('تهران','Tehran'),KASHAN:t('کاشان','Kashan')};
 function makeChoice(order,caseRecord,entry,stamp){
   const modes=Array.isArray(caseRecord.allowedDeliveryModes)
     ?caseRecord.allowedDeliveryModes.filter(v=>Object.hasOwn(DELIVERY_LABELS,v)):[];
   if(!caseRecord.customerChoiceEnabled||!modes.length)return;
   const container=el('div',undefined,'appointment-preference');
   const label=el('label',t('نوع جلسه مورد نظر','Choose your preferred session format'));
   const mode=document.createElement('select');
   mode.setAttribute('aria-label',t('روش مشاوره','Consultation format'));
   for(const key of modes){
     const option=document.createElement('option');option.value=key;option.textContent=DELIVERY_LABELS[key];
     mode.append(option);
   }
   if(modes.includes(caseRecord.deliveryMode))mode.value=caseRecord.deliveryMode;
   else mode.value=modes[0];
   label.append(mode);
   const cityLabel=el('label',t('شهر جلسه حضوری','In-person city'));
   const city=document.createElement('select');
   for(const key of Object.keys(CITY_LABELS)){
     const option=document.createElement('option');option.value=key;
     option.textContent=CITY_LABELS[key];city.append(option);
   }
   if(Object.hasOwn(CITY_LABELS,caseRecord.meetingCity))city.value=caseRecord.meetingCity;
   const updateCity=()=>{cityLabel.hidden=mode.value!=='IN_PERSON';};
   cityLabel.append(city);mode.addEventListener('change',updateCity);updateCity();
   const submit=el('button',t('ثبت روش پیشنهادی جلسه','Save preferred session format'),'button');
   submit.type='button';
   const feedback=el('p',t('انتخاب روش جلسه، به معنای تأیید نوبت یا ظرفیت نیست.',
     'Selecting a format does not confirm appointment availability.'));
   submit.addEventListener('click',async()=>{
     if(stamp!==revision||document.hidden)return;
     const selectedMode=mode.value;
     if(!modes.includes(selectedMode))return;
     const selectedCity=selectedMode==='IN_PERSON'?city.value:null;
     submit.disabled=true;
     feedback.textContent=t('در حال ثبت انتخاب شما…','Saving your preference…');
     try{
       const res=await fetch('/api/commerce/consultation-preference',{
         method:'POST',credentials:'same-origin',cache:'no-store',
         headers:{'Content-Type':'application/json','Accept':'application/json'},
         body:JSON.stringify({orderId:order.id,sku:caseRecord.sku,
           mode:selectedMode,city:selectedCity})
       });
       const answer=await res.json();
       if(stamp!==revision||document.hidden)return;
       if(!res.ok||answer?.ok!==true||answer?.schema!=='commerce-consultation-choice-v1'
         ||answer.preference?.appointmentConfirmed!==false)throw Error('preference_not_accepted');
       feedback.textContent=t('روش دلخواه ثبت شد؛ هماهنگی زمان و ظرفیت با تیم مشاوره است.',
         'Your preference was recorded. The consultant must still confirm time and capacity.');
     }catch{
       if(stamp===revision&&!document.hidden)feedback.textContent=t(
         'ثبت روش مشاوره تأیید نشد؛ ورود حساب، وضعیت سفارش یا آمادگی سامانه را بررسی کنید.',
         'Your preference was not confirmed. Check account access, payment status or system readiness.');
     }finally{if(stamp===revision)submit.disabled=false;}
   });
   container.append(label,cityLabel,submit,feedback);
   entry.append(container);
 }
 const statusLabels={
   awaiting_contact:t('در انتظار تماس و هماهنگی','Awaiting consultant contact'),
   scheduling:t('در حال تعیین نوبت','Scheduling in progress'),
   booked:t('نوبت توسط مدیر ثبت شده','Booked by consultant'),
   in_progress:t('خدمت در حال ارائه','Service in progress'),
   delivered:t('تحویل خدمت در سامانه ثبت شده','Service completion recorded'),
   cancelled:t('لغو خدمت ثبت شده','Service cancelled')
 };
 button.addEventListener('click',async()=>{
   clear();
   const stamp=revision,ctrl=new AbortController();controller=ctrl;
   button.disabled=true;
   message(t('در حال تأیید سفارش‌ها و زمان جلسات…','Checking purchased services and appointment records…'));
   const timeout=setTimeout(()=>ctrl.abort(),15000);
   try{
     const response=await fetch('/api/commerce/history',{
       method:'GET',credentials:'same-origin',cache:'no-store',
       headers:{Accept:'application/json'},signal:ctrl.signal
     });
     if(stamp!==revision||document.hidden)return;
     if(response.status===401||response.status===403){
       output.replaceChildren();message(t('ابتدا با حسابی که ایمیل آن تأیید شده وارد شوید.',
         'Sign in with your verified account to view your appointments.'),true);return;
     }
     if(!response.ok)throw Error('history_unavailable');
     const data=await response.json();
     if(data?.ok!==true||!Array.isArray(data.orders)||data.orders.length>50)
       throw Error('history_invalid');
     const eligibleOrders=data.orders.filter(paidService);
     const orders=eligibleOrders.slice(0,20);
     // History is a bounded page: 50 total records may imply unseen older
     // purchases. A separate 20-service display limit can also truncate.
     const mayHaveOlder=data.orders.length===50||eligibleOrders.length>orders.length;
     output.replaceChildren();
     if(!orders.length){
       message(t('در ۵۰ سفارش اخیر این حساب، خدمت دارای پرداخت ثبت‌شده برای نمایش نوبت یافت نشد. این نتیجه به معنای نبود تمام سوابق قبلی نیست.',
         'No eligible paid service appears in your latest 50 orders. Older account records may still exist.'));
       return;
     }
     message(t('تاریخ و ساعت بر اساس منطقه زمانی مرورگر شما نمایش داده می‌شوند: ',
       'Times are shown in your browser time zone: ')+timezone);
     const list=el('ul');list.className='appointment-private-list';
     let unverifiedOrderCount=0;
     for(const order of orders){
       if(stamp!==revision||document.hidden)break;
       try{
         const detail=await fetch('/api/commerce/fulfilment?order='+encodeURIComponent(order.id),{
           method:'GET',credentials:'same-origin',cache:'no-store',
           headers:{Accept:'application/json'},signal:ctrl.signal
         });
         if(stamp!==revision||document.hidden)break;
         if(!detail.ok){unverifiedOrderCount++;continue;}
         const d=await detail.json();
         if(d?.ok!==true||d.paymentRecord!=='provider_verified_not_bank_settlement'
           ||!Array.isArray(d.serviceCases)||!d.serviceCases.length||
           d.serviceCases.length>20){unverifiedOrderCount++;continue;}
         let shownForOrder=0,partialOrder=false;
         for(const c of d.serviceCases){
           // Defence in depth: an API detail is not displayed for an
           // unrelated SKU even when a paid order ID is valid.
           if(typeof c?.sku!=='string'||!Object.hasOwn(statusLabels,c.status)||
             !order.items.some(x=>x?.sku===c.sku)){
             partialOrder=true;continue;
           }
           const entry=el('li');
           const title=el('strong',c.sku+' · '+statusLabels[c.status]);entry.append(title);
           if(Object.hasOwn(DELIVERY_LABELS,c.deliveryMode)){
             const cityText=c.deliveryMode==='IN_PERSON'&&Object.hasOwn(CITY_LABELS,c.meetingCity)
               ?' · '+CITY_LABELS[c.meetingCity]:'';
             entry.append(el('p',t('روش انتخاب‌شده: ','Selected format: ')+
               DELIVERY_LABELS[c.deliveryMode]+cityText));
           }
           if((c.status==='booked'||c.status==='in_progress')&&c.bookingStart&&c.bookingEnd){
             const start=formatTime(c.bookingStart),end=formatTime(c.bookingEnd);
             if(start&&end&&Date.parse(c.bookingStart.replace(' ','T')+'Z')<
               Date.parse(c.bookingEnd.replace(' ','T')+'Z'))
               entry.append(el('p',t('شروع: ','Start: ')+start+
                 ' | '+t('پایان: ','End: ')+end));
             else partialOrder=true;
           }else if(c.status==='scheduling'||c.status==='awaiting_contact'){
             entry.append(el('p',t('زمان قطعی ثبت نشده؛ هماهنگی توسط تیم خدمات انجام می‌شود.',
               'No confirmed time yet; the service team must coordinate scheduling.')));
           }
           entry.append(el('small',t('شماره سفارش: ','Order: ')+String(order.id||'')));
           makeChoice(order,c,entry,stamp);
           list.append(entry);
           shownForOrder++;
         }
         if(!shownForOrder||partialOrder)unverifiedOrderCount++;
       }catch(error){
         if(ctrl.signal.aborted)break;
         // A failed individual order lookup cannot authorise guessed details
         // or silently turn this bounded view into an apparently complete one.
         unverifiedOrderCount++;
       }
     }
     if(stamp!==revision||document.hidden)return;
     if(!list.childElementCount){
       message(t('جزئیات نوبت هنوز با شواهد پرداخت و دسترسی این حساب قابل تأیید نیست.',
         'No appointment details could be authenticated for these orders.'));
       return;
     }
     output.append(list);
     if(unverifiedOrderCount||mayHaveOlder)message(t(
       'این فهرست ممکن است ناقص باشد: جزئیات برخی سفارش‌ها تأیید نشد یا سوابق قدیمی‌تری وجود دارد. برای پیگیری دقیق، دوباره بررسی کنید یا با تیم خدمات تماس بگیرید.',
       'This list may be incomplete: some order details could not be verified or older records may exist. Retry or contact the service team for a complete review.'
     ));
     message(t('تغییر یا لغو نوبت هنوز از این صفحه انجام نمی‌شود؛ برای هماهنگی با واحد خدمات تماس بگیرید. داشتن نوبت به معنای انجام جلسه یا تسویه بانکی نیست.',
       'This page cannot reschedule or cancel appointments. Contact the service team. A booking does not prove delivery or bank settlement.'));
   }catch(error){
     if(stamp!==revision||document.hidden)return;
     output.replaceChildren();
     message(t('وضعیت نوبت‌ها در این لحظه قابل تأیید نیست. اطلاعات ذخیره‌شده محلی جایگزین پاسخ سرور نمی‌شود.',
       'Appointments could not be verified now. No local copy is substituted for the server.'));
   }finally{
     clearTimeout(timeout);
     if(stamp===revision){controller=null;button.disabled=false;}
   }
 });
 document.addEventListener('visibilitychange',()=>{if(document.hidden)clear()});
 window.addEventListener('pagehide',clear);
})();
