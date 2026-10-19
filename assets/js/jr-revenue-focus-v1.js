/* Honest, public, no-cookie commerce readiness for the existing three-service spotlight.
 * No pricing authority, personal data, payment initiation or booking inference.
 */
(()=>{'use strict';
 const targets=[...document.querySelectorAll('[data-jr-payment-readiness]')];
 if(!targets.length)return;
 const fa=document.documentElement.lang==='fa';
 const copy=(en,faText)=>fa?faText:en;
 const status=(message,state)=>{
  for(const node of targets){node.textContent=message;node.dataset.state=state;}
 };
 const controller=new AbortController();
 async function refresh(){
  try{
   const response=await fetch('/api/commerce/health',{
    credentials:'omit',cache:'no-store',
    headers:{Accept:'application/json'},signal:controller.signal
   });
   if(!response.ok)throw Error('unavailable');
   const data=await response.json();
   if(data?.ok!==true||typeof data.checkout!=='boolean')throw Error('unverified');
   const ready=data.checkout===true&&data.capabilities?.services===true;
   if(ready)status(copy(
    'Secure ordering is currently enabled for services. The server will recheck the final amount and payment eligibility before proceeding; payment does not confirm delivery.',
    'در حال حاضر سفارش امن خدمات فعال است. سرور پیش از ادامه، مبلغ نهایی و شرایط پرداخت را دوباره بررسی می‌کند؛ پرداخت به معنای تأیید تحویل نیست.'
   ),'ready');
   else status(copy(
    'Online payment for these services is not currently confirmed. You may review the service scope or submit an enquiry; do not attempt a payment outside the secure checkout.',
    'فعال‌بودن پرداخت آنلاین این خدمات اکنون تأیید نشده است. شرح خدمت را مطالعه یا درخواست اولیه ثبت کنید؛ خارج از مسیر سفارش امن پرداخت نکنید.'
   ),'unavailable');
  }catch{
   if(controller.signal.aborted)return;
   status(copy(
    'Payment availability could not be confirmed. The secure checkout performs its own server check; an enquiry is not a purchase.',
    'وضعیت درگاه اکنون قابل تأیید نیست. مسیر سفارش امن کنترل سروری مستقل دارد؛ درخواست اولیه به معنای خرید نیست.'
   ),'unknown');
  }
 }
 refresh();
 window.addEventListener('pagehide',()=>controller.abort(),{once:true});
})();
