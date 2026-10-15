/* Authenticated direct donation; never trusts an editable email field. */
(()=>{'use strict';
const form=document.querySelector('[data-direct-donation-form]');
if(!form)return;
const status=form.querySelector('[data-direct-donation-status]');
const button=form.querySelector('[data-direct-donation-submit]');
const say=message=>{status.textContent=message;};
form.addEventListener('submit',async event=>{
 event.preventDefault();
 if(button.disabled||!form.reportValidity())return;
 const amount=Number(form.elements.amountToman.value);
 const focus=form.elements.focus.value;
 if(!Number.isSafeInteger(amount)||amount<1000||amount>10000000)return say('مبلغ باید بین هزار تا ده میلیون تومان باشد.');
 button.disabled=true;say('در حال تأیید حساب و آماده‌سازی پرداخت…');
 try{
  const me=await fetch('/api/auth/me',{credentials:'same-origin',cache:'no-store'});
  const identity=await me.json();
  if(!me.ok||identity.ok!==true||identity.user?.emailVerified!==true||
   typeof identity.user.email!=='string')throw Error('auth');
  const response=await fetch('/api/donations/create',{
   method:'POST',credentials:'same-origin',cache:'no-store',
   headers:{'Content-Type':'application/json'},
   body:JSON.stringify({amountToman:amount,focus,email:identity.user.email})
  });
  const data=await response.json();
  if(!response.ok||data.ok!==true)throw Error(data.error||'payment');
  const url=new URL(data.paymentUrl,location.origin);
  if(url.origin!==location.origin||url.pathname!=='/fa/shop/payment-start/'||
    url.searchParams.size!==1||!url.searchParams.get('gateway'))throw Error('redirect');
  say('سفارش حمایت ثبت شد؛ انتقال به صفحه پرداخت امن…');
  location.assign(url.href);
 }catch(error){
  say(error.message==='auth'?'برای حمایت از داخل داشبورد، ابتدا با حساب ایمیلی تأییدشده وارد شوید.':
   'آغاز پرداخت تأیید نشد. پیش از تلاش مجدد، وضعیت سوابق حمایت خود را بررسی کنید.');
  button.disabled=false;
 }
});
})();