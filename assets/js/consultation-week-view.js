/* Public, read-only consultation week. Never treats a displayed hour as booked. */
(()=>{'use strict';
 const root=document.querySelector('[data-consultation-week]');
 const form=document.querySelector('[data-consultation-composer]');
 if(!root||!form)return;
 const fa=document.documentElement.lang==='fa';
 const say=(a,b)=>fa?a:b;
 const state=root.querySelector('[data-consultation-week-state]');
 const days=root.querySelector('[data-consultation-week-days]');
 const chosen=form.querySelector('input[name="preferred_slot"]');
 if(!state||!days||!chosen)return;
 const zone='Asia/Tehran';
 const count=new Intl.NumberFormat(fa?'fa-IR':'en-GB');
 const clock=new Intl.DateTimeFormat(fa?'fa-IR':'en-GB',
     {hour:'2-digit',minute:'2-digit',timeZone:zone,hourCycle:'h23'});
 const dateFormatter=new Intl.DateTimeFormat(fa?'fa-IR':'en-GB',
     {weekday:'long',day:'numeric',month:'long',timeZone:zone});
 const utcPattern=/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
 const element=(tag,text,cls)=>{
   const el=document.createElement(tag);
   if(text!==undefined)el.textContent=String(text);
   if(cls)el.className=cls;
   return el;
 };
 const utcDate=value=>{
   if(typeof value!=='string'||!utcPattern.test(value))return null;
   const d=new Date(value.replace(' ','T')+'Z');
   if(!Number.isFinite(d.getTime())
     ||d.toISOString().slice(0,19)!==value.replace(' ','T'))return null;
   return d;
 };
 let current=null;
 let buttons=[];
 const reset=()=>{
   current=null;
   buttons.forEach(b=>{b.setAttribute('aria-pressed','false');b.classList.remove('is-selected');});
 };
 form.addEventListener('reset',()=>{
   reset();
   state.textContent=say('انتخاب ساعت پاک شد؛ هیچ نوبتی رزرو نشده است.',
     'Time preference cleared. No appointment has been booked.');
 });
 function render(info){
   if(info?.ok!==true||info.schema!=='consultation-week-v1'
      ||info.timezone!==zone||info.slotMinutes!==60
      ||info.maxPublishedDailyHours!==4||info.customerReservationEnabled!==false
      ||info.externalCalendarConfirmed!==false
      ||!Array.isArray(info.days)||info.days.length!==7)throw Error('untrusted_calendar');
   days.replaceChildren();buttons=[];
   let published=0;
   info.days.forEach(day=>{
     if(typeof day?.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(day.date)
       ||!Array.isArray(day.slots)||day.slots.length>4
       ||!Number.isInteger(day.totalSlots)||day.totalSlots!==day.slots.length
       ||!Number.isInteger(day.remainingSlots))throw Error('invalid_calendar_day');
     const card=element('article',undefined,'cw-day');
     const heading=element('h3',dateFormatter.format(new Date(day.date+'T12:00:00Z')));
     card.append(heading);
     const list=element('div',undefined,'cw-day-slots');
     let remaining=0;
     day.slots.forEach(slot=>{
       const start=utcDate(slot?.startUtc),end=utcDate(slot?.endUtc);
       if(!start||!end||end-start!==3600000||!['AVAILABLE','FULL'].includes(slot.status))
         throw Error('invalid_calendar_slot');
       // Explicit date parts avoid browser locale-dependent date strings.
       const parts=new Intl.DateTimeFormat('en-GB',{timeZone:zone,
         year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(start);
       const part=k=>parts.find(p=>p.type===k)?.value;
       if(part('year')+'-'+part('month')+'-'+part('day')!==day.date)
         throw Error('calendar_day_mismatch');
       const isAvailable=slot.status==='AVAILABLE';
       if(isAvailable)remaining++;
       const button=element('button',clock.format(start)+' – '+clock.format(end)+
         ' · '+(isAvailable?say('قابل درخواست','Available to request'):
           say('ظرفیت تکمیل','Full')),'cw-slot '+(isAvailable?'cw-free':'cw-full'));
       button.type='button';button.disabled=!isAvailable;
       button.setAttribute('aria-pressed','false');
       if(isAvailable) {
         button.addEventListener('click',()=>{
           reset();
           current=slot.startUtc;
           chosen.value=current;
           chosen.dispatchEvent(new Event('change',{bubbles:true}));
           button.classList.add('is-selected');
           button.setAttribute('aria-pressed','true');
           state.textContent=say('زمان '+clock.format(start)+' به عنوان ترجیح شما انتخاب شد؛ هنوز رزرو یا نگهداری ظرفیت انجام نشده است. فرم درخواست را تکمیل کنید.',
             'You chose '+clock.format(start)+' as a preference. No slot has been held or booked. Complete the enquiry form.');
           form.scrollIntoView({behavior:'smooth',block:'start'});
         });
       }
       buttons.push(button);
       list.append(button);
     });
     if(remaining!==day.remainingSlots)throw Error('invalid_daily_remaining');
     published+=day.slots.length;
     if(!day.slots.length)list.append(element('p',say('زمانی برای درخواست منتشر نشده است.',
       'No requestable hours have been published.'),'cw-unpublished'));
     card.append(element('p',day.slots.length
       ?(remaining?say(count.format(remaining)+' جلسه در این روز باقی مانده است.',
           count.format(remaining)+' appointment hour(s) left on this day.'):
         say('ظرفیت این روز تکمیل شده است.','This day is fully booked.'))
       :say('برنامه این روز هنوز منتشر نشده است.','No published capacity for this day.'),'cw-count'),list);
     days.append(card);
   });
   state.textContent=published?say(
     'ساعت‌های سبز در حال حاضر قابل درخواست هستند و ساعت‌های قرمز تکمیل شده‌اند. ظرفیت در لحظهٔ هماهنگی دوباره بررسی می‌شود؛ انتخاب ساعت رزرو نیست.',
     'Green hours are currently requestable; red hours are full. Capacity is rechecked before confirmation. Selection is not a booking.'
   ):say('فعلاً ساعتی برای این هفته منتشر نشده است. می‌توانید درخواست اولیه خود را ارسال کنید.',
     'No hours have been published for this week. You may still send an initial enquiry.');
 }
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),10000);
 fetch('/api/commerce/consultation-week',{
   method:'GET',credentials:'same-origin',cache:'no-store',
   headers:{Accept:'application/json'},signal:controller.signal
 }).then(async response=>{
   if(!response.ok)throw Error('calendar_not_published');
   return response.json();
 }).then(render).catch(()=>{
   days.replaceChildren();
   chosen.value='';
   state.textContent=say('تقویم لحظه‌ای هنوز در دسترس نیست. برای هماهنگی، فرم درخواست اولیه را تکمیل کنید؛ هیچ ساعت آزادی فرض نمی‌شود.',
     'The live calendar is not currently available. Use the initial enquiry form; no availability is assumed.');
 }).finally(()=>clearTimeout(timeout));
})();
