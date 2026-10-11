// Voluntary support checkout is separate from buying a book. Server pricing and settlement are authoritative.
(function(){
 'use strict';
 const form=document.querySelector('[data-support-form]');
 if(!form)return;
 const isFa=document.documentElement.lang==='fa';
 const input=form.querySelector('[name="amountToman"]');
 const email=form.querySelector('[name="email"]');
 const focus=form.querySelector('[name="focus"]');
 const submit=form.querySelector('[type="submit"]');
 const status=document.querySelector('[data-support-status]');
 const preview=document.querySelector('[data-support-preview]');
 const presets=form.querySelectorAll('[data-support-amount]');
 let ready=false,submitted=false;
 const show=s=>{status.textContent=s;};
 const fmt=n=>new Intl.NumberFormat(isFa?'fa-IR':'en-US').format(n);
 const normal=v=>String(v||'').replace(/[۰-۹٠-٩]/g,ch=>{
  const n='۰۱۲۳۴۵۶۷۸۹'.indexOf(ch);
  return String(n>=0?n:'٠١٢٣٤٥٦٧٨٩'.indexOf(ch));
 });
 function update(){
  const n=Number(normal(input.value));
  preview.textContent=Number.isSafeInteger(n)&&n>=1000&&n<=10000000
   ?(isFa?'مبلغ پرداخت: '+fmt(n)+' تومان':'Payment amount: '+fmt(n)+' toman')
   :(isFa?'مبلغ مجاز: ۱٬۰۰۰ تا ۱۰٬۰۰۰٬۰۰۰ تومان':'Allowed amount: 1,000–10,000,000 toman');
 }
 presets.forEach(button=>button.addEventListener('click',()=>{
  if(submitted)return;
  input.value=button.dataset.supportAmount;
  presets.forEach(p=>p.setAttribute('aria-pressed',String(p===button)));
  update();input.focus();
 }));
 input.addEventListener('input',()=>{presets.forEach(p=>p.setAttribute('aria-pressed',String(Number(p.dataset.supportAmount)===Number(normal(input.value)))));update();});
 update();
 submit.disabled=true;
 show(isFa?'در حال بررسی آمادگی درگاه...':'Checking gateway readiness...');
 async function readiness(){
  try{
   const response=await fetch('/api/donations/health',{cache:'no-store',credentials:'omit'});
   if(!response.ok)throw Error('unavailable');
   const data=await response.json();
   if(data?.ok!==true||data.service!=='donations'||data.checkout!==true||
      data.currency!=='IRT'||data.minToman!==1000||data.maxToman!==10000000)throw Error('unavailable');
   ready=true;submit.disabled=false;
   show(isFa?'درگاه آماده است. پیش از پرداخت، مبلغ را بررسی کنید.':'Gateway is ready. Check the amount before payment.');
  }catch(_){
   show(isFa?'پرداخت حمایت مالی فعلاً در دسترس نیست؛ هیچ وجهی دریافت نمی‌شود.':'Support payment is currently unavailable. Nothing will be charged.');
  }
 }
 readiness();
 form.addEventListener('submit',async event=>{
  event.preventDefault();
  if(!ready||submitted)return;
  const amount=Number(normal(input.value));
  if(!Number.isSafeInteger(amount)||amount<1000||amount>10000000){
   show(isFa?'مبلغ صحیح بین ۱٬۰۰۰ تا ۱۰٬۰۰۰٬۰۰۰ تومان وارد کنید.':'Enter a whole amount between 1,000 and 10,000,000 toman.');return;
  }
  if(email.value&&!email.checkValidity()){
   show(isFa?'ایمیل اختیاری واردشده معتبر نیست.':'The optional email is not valid.');return;
  }
  if(!focus||!['general','scholarship','books','services','essentials'].includes(focus.value)){
   show(isFa?'زمینه حمایت نامعتبر است.':'Invalid support category.');return;
  }
  submitted=true;submit.disabled=true;
  show(isFa?'در حال ایجاد پرداخت امن؛ لطفاً دوباره کلیک نکنید.':'Initiating secure payment; please do not submit again.');
  try{
   const response=await fetch('/api/donations/create',{
    method:'POST',mode:'cors',credentials:'omit',cache:'no-store',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({amountToman:amount,email:email.value.trim(),focus:focus.value})
   });
   const result=await response.json();
   if(!response.ok||result?.ok!==true)throw Error(String(result?.error||'payment_unconfirmed'));
   if(result.amountToman!==amount||result.currency!=='IRT')throw Error('unverified_amount');
   const target=new URL(String(result.paymentUrl||''),location.href);
   const nested=target.searchParams.get('gateway');
   if(target.origin!==location.origin||target.pathname!=='/fa/shop/payment-start/'||
      target.searchParams.size!==1||target.searchParams.getAll('gateway').length!==1||!nested)
     throw Error('unsafe_url');
   const gateway=new URL(nested);
   if(gateway.protocol!=='https:'||gateway.hostname!=='bitpay.ir'||gateway.port||
      !/^\/payment\/gateway-[1-9][0-9]*-get\/?$/.test(gateway.pathname)||
      gateway.username||gateway.password||gateway.search||gateway.hash)throw Error('unsafe_url');
   location.assign(target.href);
  }catch(error){
   const code=String(error?.message||'');
   const retryable=['invalid_donation_amount','invalid_donation_email','invalid_support_focus'].includes(code);
   if(retryable){
    submitted=false;submit.disabled=false;
    show(isFa?'مبلغ یا ایمیل را اصلاح و سپس دوباره ارسال کنید.':'Correct the amount or email and resubmit.');
   }else{
    show(isFa?
     'آغاز پرداخت تأیید نشد. برای پیشگیری از پرداخت تکراری، دوباره ثبت نکنید؛ در صورت نیاز با پشتیبانی تماس بگیرید.':
     'Payment initiation was not confirmed. Do not resubmit; contact support to avoid a duplicate payment.');
   }
  }
 });
})();
