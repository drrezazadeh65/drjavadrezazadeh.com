/* Buyer dashboard: read only the authenticated user's consented service leads.
 * No client-side lead creation, synthetic statuses, persistent storage, or entitlement claims.
 */
(()=>{'use strict';
 const section=document.querySelector('[data-customer-consultation-leads]');
 if(!section)return;
 const button=section.querySelector('[data-consultation-lead-check]');
 const output=section.querySelector('[data-consultation-lead-results]');
 if(!button||!output)return;
 const en=document.documentElement.lang==='en';
 const say=(fa,english)=>en?english:fa;
 const text=(tag,value)=>{const node=document.createElement(tag);node.textContent=value;return node;};
 let run=0,controller=null;
 const clear=()=>{run++;if(controller)controller.abort();controller=null;
   button.disabled=false;output.replaceChildren();};
 async function load(){
   if(document.hidden)return;
   const stamp=++run;if(controller)controller.abort();
   controller=new AbortController();const ctrl=controller;
   button.disabled=true;output.replaceChildren(text('p',say(
     'در حال خواندن درخواست‌های متعلق به حساب شما از سرور…',
     'Reading enquiries owned by your account from the server…')));
   try{
     const response=await fetch('/api/growth/leads/mine',{
       method:'GET',credentials:'same-origin',cache:'no-store',
       headers:{Accept:'application/json'},signal:ctrl.signal
     });
     const data=await response.json();
     if(stamp!==run||document.hidden||!section.isConnected)return;
     output.replaceChildren();
     if(!response.ok||data?.ok!==true||data.evidenceScope!=='OWNER_ONLY_NO_PAYMENT_CLAIMS'
       ||!Array.isArray(data.requests)||data.requests.length>20)throw Error(
         response.status===401?'not_logged_in':'service_unavailable');
     if(!data.requests.length){
       output.append(text('p',say(
         'درخواست فعال یا قابل مشاهده‌ای در این حساب گزارش نشد؛ این وضعیت به معنی نبود خرید یا نوبت در بخش‌های دیگر نیست.',
         'No active or visible initial enquiries were returned for this account. Purchases and appointments have separate records.'
       )));return;
     }
     const list=document.createElement('ul');list.className='appointment-private-list';
     const stateLabels={
       NEW:say('دریافت‌شده برای بررسی اولیه','Received for initial review'),
       CONTACTED:say('پیگیری‌شده','Follow-up recorded'),
       CLOSED:say('بسته‌شده','Closed'),
       WITHDRAWN:say('رضایت لغو شده','Consent withdrawn')
     };
     for(const item of data.requests){
       if(typeof item?.service_id!=='string'||
         !/^(service|vip):[A-Za-z0-9_-]{3,64}$/.test(item.service_id)||
         typeof item.state!=='string'||item.state.length>30)continue;
       const row=document.createElement('li');
       const state=Object.hasOwn(stateLabels,item.state)
         ?stateLabels[item.state]:say('در انتظار تأیید وضعیت','Status not verified');
       row.append(text('strong',item.service_id),text('span',' · '+state));
       list.append(row);
     }
     if(list.childElementCount)output.append(list);
     else output.append(text('p',say('وضعیت معتبر قابل نمایش نبود.','No verified enquiry status could be displayed.')));
     output.append(text('p',say(
       'این سوابق فقط درخواست اولیه با رضایت‌اند؛ پرداخت، پذیرش خدمت یا رزرو قطعی را تأیید نمی‌کنند. برای لغو رضایت به فرم درخواست مراجعه کنید.',
       'These are consented initial enquiries, not confirmed bookings, payment or service acceptance.'
     )));
   }catch(error){
     if(stamp!==run||document.hidden||ctrl.signal.aborted)return;
     output.replaceChildren(text('p',
       error.message==='not_logged_in'
         ?say('برای مشاهده درخواست‌ها، وارد حساب دارای ایمیل تأییدشده شوید.',
           'Sign in with your verified-email account to view enquiries.')
         :say('اکنون دریافت درخواست‌های حساب از سرور ممکن نیست؛ هیچ وضعیت یا تعدادی فرض نمی‌شود.',
           'Account enquiry records could not be verified. No status or count is assumed.')
     ));
   }finally{if(stamp===run){button.disabled=false;controller=null;}}
 }
 button.addEventListener('click',load);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)clear();});
 window.addEventListener('pagehide',clear);
})();
