(()=>{"use strict";
const API="https://drjavadrezazadeh-payment.dr-rezazadeh65.workers.dev",mode=document.body.dataset.accountMode,lang=document.documentElement.lang,en=lang==="en";
const message=document.getElementById("message"),form=document.getElementById("account-form");
const msg=(fa,enText)=>en?enText:fa;
const errors={account_unavailable:msg("حساب کاربری هنوز روی سرور فعال نشده است. هیچ ثبت‌نامی انجام نشده است.","Account service is not yet active. No account has been created."),verification_email_unavailable:msg("ارسال ایمیل تأیید هنوز آماده نیست.","Verification emails are not yet available."),invalid_credentials:msg("ایمیل یا رمز ورود معتبر نیست.","Invalid email or password."),not_authenticated:msg("برای مشاهده اطلاعات خصوصی، وارد حساب شوید.","Sign in to view private data."),rate_limited:msg("درخواست‌های زیادی ثبت شده است. کمی بعد دوباره تلاش کنید.","Too many attempts; please try later."),invalid_or_expired_token:msg("پیوند منقضی یا قبلاً استفاده شده است.","Link expired or already used."),invalid_registration:msg("نام، ایمیل و پذیرش شرایط را بررسی کنید.","Check name, email and consent."),invalid_password_requirements:msg("رمز حداقل ۱۲ نویسه و حداکثر ۱۲۸ نویسه باشد.","Password must have 12–128 characters.")};
const sessionKey="jr-account-session-v440",token=()=>{try{return sessionStorage.getItem(sessionKey)||""}catch{return""}},save=s=>{try{sessionStorage.setItem(sessionKey,s)}catch{}},clear=()=>{try{sessionStorage.removeItem(sessionKey)}catch{}};
const show=(value)=>{if(message){message.textContent=value;message.hidden=false}};
async function api(path,{body,auth=false}={}){const h={"Accept":"application/json"};if(body!==undefined)h["Content-Type"]="application/json";if(auth)h.Authorization="Bearer "+token();const r=await fetch(API+path,{method:body!==undefined?"POST":"GET",headers:h,body:body!==undefined?JSON.stringify(body):undefined,credentials:"omit",cache:"no-store",redirect:"error"});let data;try{data=await r.json()}catch{throw Error("network")};if(!r.ok||!data.ok)throw Error(data.error||"network");return data}
function setWaiting(yes){const button=form?.querySelector('button[type="submit"]');if(button)button.disabled=yes}
const fragment=new URLSearchParams(location.hash.slice(1)),actionToken=fragment.get("token")||"";
if(actionToken&&["verify","reset-confirm"].includes(mode))history.replaceState(null,"",location.pathname+location.search);
if(form)form.addEventListener("submit",async e=>{e.preventDefault();const data=Object.fromEntries(new FormData(form));setWaiting(true);show(msg("در حال پردازش امن...","Processing securely..."));
try{
 if(mode==="register"){const result=await api("/account/register",{body:{email:data.email,full_name:data.full_name,mobile:data.mobile||"",terms_accepted:data.terms==="yes"}});show(msg("درخواست ثبت شد. برای فعال‌سازی حساب، ایمیل خود را بررسی کنید. اگر پیام را دریافت نکردید، پوشه هرزنامه را هم بررسی کنید.","Request received. Check your email to activate the account."));}
 else if(mode==="login"){const d=await api("/account/login",{body:{email:data.email,password:data.password}});save(d.token);location.assign("/fa/app/account/");}
 else if(mode==="verify"){if(!actionToken)throw Error("invalid_or_expired_token");if(data.password!==data.confirm_password)throw Error("password_mismatch");const d=await api("/account/verify",{body:{token:actionToken,password:data.password}});save(d.token);location.assign("/fa/app/account/");}
 else if(mode==="reset-request"){await api("/account/reset/request",{body:{email:data.email}});show(msg("اگر حسابی با این ایمیل وجود داشته باشد، پیوند بازیابی ارسال می‌شود.","If an account exists, a recovery email will be sent."));}
 else if(mode==="reset-confirm"){if(!actionToken)throw Error("invalid_or_expired_token");if(data.password!==data.confirm_password)throw Error("password_mismatch");await api("/account/reset/confirm",{body:{token:actionToken,password:data.password}});clear();show(msg("رمز عبور تغییر کرد. اکنون وارد حساب شوید.","Password updated. You can sign in."));}
}catch(err){show(errors[err.message]||msg("درخواست انجام نشد. از اتصال و اطلاعات ورودی مطمئن شوید.","Request could not be completed. Please check your connection."));}finally{setWaiting(false)}});
if(mode!=="dashboard")return;
const hello=document.getElementById("greeting"),orders=document.getElementById("orders"),vip=document.getElementById("vip"),phone=document.getElementById("vip-phone"),login=document.getElementById("signin"),logout=document.getElementById("logout");
const el=(tag,txt,cls)=>{const n=document.createElement(tag);if(txt!==undefined)n.textContent=txt;if(cls)n.className=cls;return n};
if(!token()){show("برای دسترسی به داشبورد، ورود ایمیلی لازم است.");login.hidden=false;return}
(async()=>{
 try{const [profile,history,benefits]=await Promise.all([api("/account/me",{auth:true}),api("/account/orders",{auth:true}),api("/account/vip",{auth:true})]);
 hello.textContent=profile.user.full_name+" · "+profile.user.email;
 show("اطلاعات از پایگاه داده خصوصی و فقط برای حساب ایمیلی تأییدشده دریافت شده است.");
 login.hidden=true;logout.hidden=false;
 orders.replaceChildren();
 if(!history.orders.length)orders.append(el("p","هنوز خریدی برای این ایمیل ثبت نشده است."));
 for(const o of history.orders){const art=el("article",undefined,"order");art.append(el("h3","سفارش "+o.id),el("p","مبلغ: "+new Intl.NumberFormat("fa-IR").format(o.amount_toman)+" تومان"),el("p","وضعیت پرداخت: "+(o.payment_state==="paid"?"تأییدشده":"در انتظار یا ناموفق")),el("p","وضعیت انجام: "+o.fulfilment_state));const items=el("p",(o.items||[]).map(i=>i.title||i.sku).join("، "));art.append(items);orders.append(art)}
 vip.replaceChildren();
 if(!benefits.memberships.length)vip.append(el("p","عضویت VIP تأییدشده‌ای برای این ایمیل یافت نشد."));
 for(const m of benefits.memberships){const art=el("article",undefined,"order");art.append(el("h3",m.sku.replace("vip:","VIP · ")),el("p",m.active?"عضویت یک‌ساله فعال":"دوره عضویت پایان یافته"),el("p","اعتبار تا: "+m.expires_at),el("p","کوچینگ سالانه مرتبط: بدون سقف عددی درخواست‌ها؛ ملاقات حضوری با هماهنگی."));vip.append(art)}
 if(benefits.direct_phone){const a=el("a",benefits.direct_phone);a.href="tel:"+benefits.direct_phone;phone.replaceChildren(a);phone.hidden=false}
 else if(benefits.memberships.some(x=>x.active)){phone.replaceChildren(el("p","عضویت VIP شما تأیید شد. شماره تماس پس از پیکربندی امن در دسترس خواهد بود."));phone.hidden=false}
 }catch(err){show(errors[err.message]||"بازیابی امن اطلاعات ممکن نشد. لطفاً بعداً دوباره تلاش کنید.");login.hidden=false;clear()}
})();
logout?.addEventListener("click",async()=>{try{await api("/account/logout",{body:{},auth:true})}catch{}clear();location.assign("/fa/login/")});
})();