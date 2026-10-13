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
     const orders=data.orders.filter(paidService).slice(0,20);
     output.replaceChildren();
     if(!orders.length){
       message(t('در ۵۰ سفارش اخیر این حساب، خدمت دارای پرداخت ثبت‌شده برای نمایش نوبت یافت نشد. این نتیجه به معنای نبود تمام سوابق قبلی نیست.',
         'No eligible paid service appears in your latest 50 orders. Older account records may still exist.'));
       return;
     }
     message(t('تاریخ و ساعت بر اساس منطقه زمانی مرورگر شما نمایش داده می‌شوند: ',
       'Times are shown in your browser time zone: ')+timezone);
     const list=el('ul');list.className='appointment-private-list';
     for(const order of orders){
       if(stamp!==revision||document.hidden)break;
       try{
         const detail=await fetch('/api/commerce/fulfilment?order='+encodeURIComponent(order.id),{
           method:'GET',credentials:'same-origin',cache:'no-store',
           headers:{Accept:'application/json'},signal:ctrl.signal
         });
         if(stamp!==revision||document.hidden)break;
         if(!detail.ok)continue;
         const d=await detail.json();
         if(d?.ok!==true||d.paymentRecord!=='provider_verified_not_bank_settlement'
           ||!Array.isArray(d.serviceCases)||d.serviceCases.length>20)continue;
         for(const c of d.serviceCases){
           if(typeof c?.sku!=='string'||!statusLabels[c.status])continue;
           const entry=el('li');
           const title=el('strong',c.sku+' · '+statusLabels[c.status]);entry.append(title);
           if((c.status==='booked'||c.status==='in_progress')&&c.bookingStart&&c.bookingEnd){
             const start=formatTime(c.bookingStart),end=formatTime(c.bookingEnd);
             if(start&&end)entry.append(el('p',t('شروع: ','Start: ')+start+
               ' | '+t('پایان: ','End: ')+end));
           }else if(c.status==='scheduling'||c.status==='awaiting_contact'){
             entry.append(el('p',t('زمان قطعی ثبت نشده؛ هماهنگی توسط تیم خدمات انجام می‌شود.',
               'No confirmed time yet; the service team must coordinate scheduling.')));
           }
           entry.append(el('small',t('شماره سفارش: ','Order: ')+String(order.id||'')));
           list.append(entry);
         }
       }catch(error){
         if(ctrl.signal.aborted)break;
         // A failed individual order lookup cannot authorise guessed details.
       }
     }
     if(stamp!==revision||document.hidden)return;
     if(!list.childElementCount){
       message(t('جزئیات نوبت هنوز با شواهد پرداخت و دسترسی این حساب قابل تأیید نیست.',
         'No appointment details could be authenticated for these orders.'));
       return;
     }
     output.append(list);
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
