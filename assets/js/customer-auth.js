(()=>{'use strict';
const API='/api';
const lang=document.documentElement.lang==='en'?'en':'fa';
const text={
 fa:{
  unavailable:'اتصال امن به سامانه حساب برقرار نشد. لطفاً پس از برقراری HTTPS معتبر دوباره تلاش کنید.',
  checking:'در حال بررسی اتصال امن حساب…',
  ready:'سامانه حساب آماده است.',
  sending:'در حال ارسال…',
  registerOk:'حساب ثبت شد. ایمیل خود را باز کنید و لینک تأیید را بزنید.',
  loginOk:'ورود موفق بود؛ در حال انتقال به داشبورد…',
  badLogin:'ایمیل یا رمز عبور معتبر نیست.',
  verifyOk:'ایمیل با موفقیت تأیید شد. اکنون می‌توانید وارد شوید.',
  verifyBad:'لینک تأیید نامعتبر یا منقضی شده است.',
  recoveryOk:'اگر این ایمیل حساب فعالی داشته باشد، لینک بازیابی ارسال شد.',
  resetOk:'رمز جدید ثبت شد. اکنون با رمز جدید وارد شوید.',
  generic:'درخواست کامل نشد. لطفاً کمی بعد دوباره تلاش کنید.',
  invalidRegistration:'شماره موبایل را با کد کشور مانند +98 وارد کنید و رمز عبور را بررسی کنید.',
  rateLimited:'تعداد تلاش‌ها بیش از حد مجاز است. لطفاً بعداً دوباره تلاش کنید.',
  emailFailed:'حساب ممکن است ثبت شده باشد، اما ایمیل تأیید ارسال نشد. پس از رفع مشکل ارسال، از گزینه «ارسال مجدد ایمیل تأیید» استفاده کنید.',
  retryPending:'اگر حساب تأییدنشده‌ای با این ایمیل وجود داشته باشد، درخواست ارسال مجدد پردازش شد. دریافت پیام را در پوشه‌های ورودی و هرزنامه بررسی کنید.',
  retryEmailRequired:'ابتدا ایمیل حساب خود را به‌درستی وارد کنید.',
  authUnavailable:'سرویس ثبت‌نام موقتاً آماده نیست. لطفاً بعداً مراجعه کنید.',
  emailTransportUnavailable:'ارسال ایمیل تأیید هنوز آماده نیست. ورود به حساب‌های فعال همچنان امکان‌پذیر است.',
  passwordRule:'رمز باید حداقل ۱۲ نویسه داشته باشد.'
 },
 en:{
  unavailable:'A secure connection to the account service could not be established. Please try again after trusted HTTPS is available.',
  checking:'Checking secure account connection…',
  ready:'Account service is ready.',
  sending:'Sending…',
  registerOk:'Account created. Open your email and use the verification link.',
  loginOk:'Signed in. Redirecting to your dashboard…',
  badLogin:'The email or password is not valid.',
  verifyOk:'Email verified successfully. You can now sign in.',
  verifyBad:'The verification link is invalid or expired.',
  recoveryOk:'If this email has an active account, a recovery link has been sent.',
  resetOk:'Your new password has been saved. Sign in with it now.',
  generic:'The request could not be completed. Please try again later.',
  invalidRegistration:'Check the mobile number in international format (for example +98) and the password.',
  rateLimited:'Too many attempts. Please wait before trying again.',
  emailFailed:'Your account may be pending verification, but email delivery failed. After the mail service is restored, use Retry verification email.',
  retryPending:'If an unverified account exists for this email, the request has been processed. Check your inbox and spam folder.',
  retryEmailRequired:'Please enter a valid account email address first.',
  authUnavailable:'Registration is temporarily unavailable. Please try again later.',
  emailTransportUnavailable:'Email verification delivery is not ready yet. Existing users can still sign in.',
  passwordRule:'Password must contain at least 12 characters.'
 }
}[lang];
const $=(s,r=document)=>r.querySelector(s);
const statusEl=$('[data-auth-status]');
const setStatus=(msg,state='')=>{if(statusEl){statusEl.textContent=msg;statusEl.dataset.state=state;statusEl.setAttribute('role','status');statusEl.setAttribute('aria-live','polite')}};
async function call(path,body){
 const r=await fetch(API+path,{method:'POST',mode:'cors',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 let d={};try{d=await r.json()}catch{}
 return {r,d};
}
async function health(){
 setStatus(text.checking,'checking');
 try{
  const r=await fetch(API+'/auth/health',{method:'GET',mode:'cors',credentials:'include',cache:'no-store'});
  const d=await r.json();
  if(!r.ok||d?.ready!==true)throw new Error('not_ready');
  document.documentElement.dataset.authReady='true';
  const registrationReady=d?.registrationReady===true;
  document.documentElement.dataset.authRegistrationReady=String(registrationReady);
  const registrationForm=$('[data-auth-form="register"]');
  document.querySelectorAll('[data-auth-live-control]').forEach(el=>{
    if(registrationForm?.contains(el)&&!registrationReady)return;
    el.disabled=false;
  });
  setStatus(registrationForm&&!registrationReady?text.emailTransportUnavailable:text.ready,registrationForm&&!registrationReady?'unavailable':'ready');
  return true;
 }catch{
  document.documentElement.dataset.authReady='false';
  setStatus(text.unavailable,'unavailable');
  return false;
 }
}
async function verifyFromUrl(){
 const token=new URLSearchParams(location.search).get('verify');
 if(!token)return;
 setStatus(text.sending,'checking');
 try{
  const {r}=await call('/auth/verify-email',{token});
  if(!r.ok)throw new Error();
  setStatus(text.verifyOk,'success');
  history.replaceState({},'',location.pathname);
 }catch{setStatus(text.verifyBad,'error')}
}
function bindRegister(){
 const form=$('[data-auth-form="register"]');if(!form)return;
 form.addEventListener('submit',async e=>{
  e.preventDefault();
  if(document.documentElement.dataset.authRegistrationReady!=='true')
   return setStatus(text.emailTransportUnavailable,'unavailable');
  const fd=new FormData(form),password=String(fd.get('password')||'');
  if(password.length<12)return setStatus(text.passwordRule,'error');
  setStatus(text.sending,'checking');
  form.querySelectorAll('input,button').forEach(x=>x.disabled=true);
  try{
   const {r,d}=await call('/auth/register',{email:fd.get('email'),mobile:fd.get('mobile')||'',password,locale:lang});
   if(!r.ok)throw new Error(d?.error||'failed');
   form.reset();setStatus(text.registerOk,'success');
  }catch(error){
   const safeMessages={
    invalid_registration:text.invalidRegistration,
    invalid_password:text.invalidRegistration,
    rate_limited:text.rateLimited,
    verification_email_failed:text.emailFailed,
    auth_unavailable:text.authUnavailable,
    verification_email_unavailable:text.emailTransportUnavailable
   };
   setStatus(safeMessages[error?.message]||text.generic,'error');
  }
  finally{form.querySelectorAll('[data-auth-live-control]').forEach(x=>x.disabled=false)}
 });
}
function bindRetry(){
 const button=$('[data-auth-retry]');
 const form=$('[data-auth-form="register"]');
 if(!button||!form)return;
 button.addEventListener('click',async()=>{
  if(document.documentElement.dataset.authRegistrationReady!=='true')
   return setStatus(text.emailTransportUnavailable,'unavailable');
  const emailField=form.querySelector('input[name="email"]');
  if(!emailField||!emailField.checkValidity())return setStatus(text.retryEmailRequired,'error');
  button.disabled=true;
  setStatus(text.sending,'checking');
  try{
   await call('/auth/retry-verification',{email:emailField.value,locale:lang});
   // Use the same result for existing/nonexisting addresses to prevent enumeration.
   setStatus(text.retryPending,'success');
  }catch{setStatus(text.generic,'error')}
  finally{button.disabled=false}
 });
}
function bindLogin(){
 const form=$('[data-auth-form="login"]');if(!form)return;
 form.addEventListener('submit',async e=>{
  e.preventDefault();const fd=new FormData(form);
  setStatus(text.sending,'checking');
  form.querySelectorAll('input,button').forEach(x=>x.disabled=true);
  try{
   const {r}=await call('/auth/login',{email:fd.get('email'),password:fd.get('password')});
   if(!r.ok)throw new Error();
   setStatus(text.loginOk,'success');
   location.assign(lang==='en'?'/en/account/':'/fa/customer-dashboard/');
  }catch{setStatus(text.badLogin,'error');form.querySelectorAll('[data-auth-live-control]').forEach(x=>x.disabled=false)}
 });
}
function bindRecovery(){
 const forgot=$('[data-auth-form="forgot"]'),reset=$('[data-auth-form="reset"]');
 const token=new URLSearchParams(location.search).get('token');
 if(token&&forgot)forgot.hidden=true;
 if(token&&reset)reset.hidden=false;
 if(forgot)forgot.addEventListener('submit',async e=>{
  e.preventDefault();const fd=new FormData(forgot);setStatus(text.sending,'checking');
  forgot.querySelectorAll('input,button').forEach(x=>x.disabled=true);
  try{await call('/auth/forgot-password',{email:fd.get('email'),locale:lang});forgot.reset();setStatus(text.recoveryOk,'success')}
  catch{setStatus(text.recoveryOk,'success')}
  finally{forgot.querySelectorAll('[data-auth-live-control]').forEach(x=>x.disabled=false)}
 });
 if(reset)reset.addEventListener('submit',async e=>{
  e.preventDefault();const fd=new FormData(reset),password=String(fd.get('password')||'');
  if(password.length<12)return setStatus(text.passwordRule,'error');
  setStatus(text.sending,'checking');reset.querySelectorAll('input,button').forEach(x=>x.disabled=true);
  try{
   const {r}=await call('/auth/reset-password',{token,password});
   if(!r.ok)throw new Error();
   setStatus(text.resetOk,'success');
   history.replaceState({},'',location.pathname);
   setTimeout(()=>location.assign(lang==='en'?'/en/login/':'/fa/login/'),900);
  }catch{setStatus(text.verifyBad,'error');reset.querySelectorAll('[data-auth-live-control]').forEach(x=>x.disabled=false)}
 });
}
document.addEventListener('DOMContentLoaded',async()=>{
 const ok=await health();
 if(!ok)return;
 await verifyFromUrl();
 bindRegister();bindRetry();bindLogin();bindRecovery();
});
})();