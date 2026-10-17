/* Existing Bertina PHP/MySQL checkout. Server-side catalog and validation are authoritative. */
(()=>{'use strict';
const API='/api';
const CONTACT_EMAIL='info@drjavadrezazadeh.com';
const IS_EN=document.documentElement.lang==='en';
const I18N={
 "هیچ محصولی انتخاب نشده است.": "No service has been selected.",
 "نام و ایمیل خریدار برای هماهنگی ارائه خدمت لازم است.": "Your name and email are needed for order coordination.",
 "در حال ایجاد سفارش امن...": "Creating the secure order...",
 "پرداخت آنلاین این خدمت فعال نیست؛ از اقدام به پرداخت خودداری کنید.": "Online checkout is unavailable for this service; no payment was initiated.",
 "ثبت سفارش تأیید نشد؛ پیش از تلاش مجدد، وضعیت سفارش را از طریق ایمیل رسمی پیگیری کنید.": "Order creation could not be confirmed. Check the previous attempt using the official support email before retrying.",
 "وضعیت درخواست پرداخت نامشخص است. پیش از تلاش مجدد، وضعیت سفارش را از طریق ایمیل رسمی بررسی کنید.": "Payment request status is uncertain. Contact official support before another attempt to avoid duplicate charges.",
 "تلاش مجدد برای پرداخت امن": "Retry secure checkout",
 "مبلغ نهایی در سرور بررسی می‌شود. پس از پرداخت، شناسه سفارش را نگه دارید. در صورت تأخیر در هماهنگی، اشکال در ارائه خدمت یا درخواست استرداد وجه، با ذکر شناسه سفارش به info@drjavadrezazadeh.com ایمیل بزنید. پرداخت به‌تنهایی رزرو قطعی ساعت مشاوره نیست.": "The server verifies the exact order amount. Keep your order reference. For a delayed appointment, delivery question or refund review, contact info@drjavadrezazadeh.com with that reference. Payment is not an appointment confirmation.",
 "نام و نام خانوادگی خریدار": "Customer's full name",
 "ایمیل برای هماهنگی و پیگیری خدمت": "Email for service coordination",
 "شماره تماس (اختیاری)": "Contact phone (optional)",
 "خرید خدمات و بسته‌های VIP بدون ثبت‌نام امکان‌پذیر است. پرداخت، سفارش شما را ثبت می‌کند؛ تعیین زمان و شیوه ارائه خدمت پس از پرداخت از طریق ایمیل هماهنگ می‌شود و پرداخت به‌تنهایی به معنای رزرو قطعی ساعت مشاوره نیست. در صورت عدم امکان ارائه خدمت، با اعلام شناسه سفارش از طریق ایمیل رسمی، درخواست پیگیری یا استرداد وجه ثبت کنید.": "Guest purchases are supported. A successful payment creates an order; the appointment or delivery method must be coordinated afterwards. A paid order does not automatically reserve a consultation slot. If the service cannot be provided, request follow-up or a refund review using the official support email and your order reference.",
 "حداقل دو حرف وارد کنید.": "Enter at least two characters.",
 "تصویر اختصاصی ": "Service illustration: ",
 "خدمت تخصصی": "professional service",
 "برای آگاهی از دامنه این خدمت، معرفی کامل آن را بخوانید.": "Review the full service description before deciding.",
 "دامنه، خروجی و شرایط بسته اختصاصی را پیش از تصمیم بررسی کنید.": "Review the package scope and delivery terms before deciding.",
 "در حال بررسی وضعیت درگاه": "Checking payment availability",
 "پیش از پرداخت، نام و ایمیل معتبر وارد کنید.": "Enter a valid name and email before payment.",
 "معرفی کامل، شرایط و جزئیات خدمت": "Read full scope, terms and details",
 "مشاهده معرفی بسته‌های VIP": "View VIP package details",
 "خدمت انتخاب‌شده در فهرست فروش یافت نشد. لطفاً از فهرست رسمی یک خدمت را انتخاب کنید.": "This service was not found in the current official catalogue. Select a valid service.",
 "بازگشت به فهرست خدمات": "Return to services",
 "هماهنگی خدمات دکتر رضازاده": "Service coordination",
 "ارتباط از طریق ایمیل": "Contact support by email",
 "پرسش‌های پیش از خرید و پیگیری سفارش فقط از طریق ایمیل رسمی انجام می‌شود. پشتیبانی ایتا برای دانش‌آموزان دارای خدمت خریداری‌شده و دسترسی تأییدشده است.": "For pre-purchase questions and order follow-up, use the official email. Additional private support is available only to eligible verified customers.",
 "پرداخت امن این خدمت": "Secure service payment",
 "درگاه این خدمت هنوز آماده نیست": "Checkout not available for this service",
 "رزرو و پرداخت آنلاین این خدمت هنوز آماده نیست. برای پرسش پیش از خرید، فقط از ایمیل رسمی استفاده کنید؛ در این صفحه وجهی دریافت نمی‌شود.": "Payment and booking are not currently available for this service. This page will not charge you; contact official support for details.",
 "فهرست خدمات موقتاً در دسترس نیست.": "The service catalogue is temporarily unavailable."
};
const tr=fa=>IS_EN?(Object.hasOwn(I18N,fa)?I18N[fa]:fa):fa;
const fmt=n=>new Intl.NumberFormat(IS_EN?'en-US':'fa-IR').format(n)+(IS_EN?' toman':' تومان');
const status=(el,msg)=>{if(el){el.textContent=msg;el.setAttribute('role','status');el.setAttribute('aria-live','polite')}};
async function pay(items,button,message,customer){
 if(button.disabled)return;
 if(!Array.isArray(items)||!items.length)return status(message,tr('هیچ محصولی انتخاب نشده است.'));
 if(!customer||typeof customer.name!=='string'||typeof customer.email!=='string')return status(message,tr('نام و ایمیل خریدار برای هماهنگی ارائه خدمت لازم است.'));
 button.disabled=true;status(message,tr('در حال ایجاد سفارش امن...'));
 try{
  const res=await fetch(API+'/commerce/create',{method:'POST',mode:'cors',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({items,customer})});
  const data=await res.json();
  if(!res.ok||data?.ok!==true){
   status(message,data?.error==='checkout_disabled'?tr('پرداخت آنلاین این خدمت فعال نیست؛ از اقدام به پرداخت خودداری کنید.'):tr('ثبت سفارش تأیید نشد؛ پیش از تلاش مجدد، وضعیت سفارش را از طریق ایمیل رسمی پیگیری کنید.'));return;
  }
  if(typeof data.paymentUrl!=='string')throw Error('missing_gateway_link');
  const link=new URL(data.paymentUrl,location.origin);
  if(link.origin!==location.origin||link.username||link.password||link.hash||link.pathname!=='/fa/shop/payment-start/'||link.searchParams.size!==1||!link.searchParams.get('gateway'))throw Error('unsafe_gateway_link');
  button.dataset.redirecting='true';
  location.assign(link.href);
 }catch(e){delete button.dataset.redirecting;status(message,tr('وضعیت درخواست پرداخت نامشخص است. پیش از تلاش مجدد، وضعیت سفارش را از طریق ایمیل رسمی بررسی کنید.'))}
 finally{if(!button.dataset.redirecting){button.disabled=false;button.textContent=tr('تلاش مجدد برای پرداخت امن');}}
}
function mount(host,kind,items,translations={}){
 if(!host)return;
 host.classList.add('commerce-grid');
 host.innerHTML='';
 const message=document.createElement('p');message.className='commerce-notice';message.textContent=tr('مبلغ نهایی در سرور بررسی می‌شود. پس از پرداخت، شناسه سفارش را نگه دارید. در صورت تأخیر در هماهنگی، اشکال در ارائه خدمت یا درخواست استرداد وجه، با ذکر شناسه سفارش به info@drjavadrezazadeh.com ایمیل بزنید. پرداخت به‌تنهایی رزرو قطعی ساعت مشاوره نیست.');
 const buyer=document.createElement('div');
 buyer.className='commerce-buyer-fields';
 buyer.style.cssText='grid-column:1/-1;display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px;background:#fff;border:1px solid #c6d2de;border-radius:16px;padding:18px;';
 const fields={};
 for(const field of [
  {name:'name',label:tr('نام و نام خانوادگی خریدار'),type:'text',max:100},
  {name:'email',label:tr('ایمیل برای هماهنگی و پیگیری خدمت'),type:'email',max:254},
  {name:'phone',label:tr('شماره تماس (اختیاری)'),type:'tel',max:30}
 ]){
  const label=document.createElement('label');
  label.style.cssText='display:flex;flex-direction:column;gap:7px;font-weight:600;color:#19344c;font-size:14px;';
  label.textContent=field.label;
  const input=document.createElement('input');
  input.name=field.name;input.type=field.type;input.maxLength=field.max;
  input.autocomplete=field.name==='name'?'name':field.name==='email'?'email':'tel';
  input.required=field.name!=='phone';
  input.style.cssText='font:inherit;min-height:46px;border:1px solid #a9b9c8;border-radius:8px;padding:8px 12px;min-width:0;';
  label.append(input);buyer.append(label);fields[field.name]=input;
 }
 const guidance=document.createElement('p');
 guidance.style.cssText='grid-column:1/-1;margin:0;font-size:13px;line-height:1.8;color:#41576b;';
 guidance.textContent=tr('خرید خدمات و بسته‌های VIP بدون ثبت‌نام امکان‌پذیر است. پرداخت، سفارش شما را ثبت می‌کند؛ تعیین زمان و شیوه ارائه خدمت پس از پرداخت از طریق ایمیل هماهنگ می‌شود و پرداخت به‌تنهایی به معنای رزرو قطعی ساعت مشاوره نیست. در صورت عدم امکان ارائه خدمت، با اعلام شناسه سفارش از طریق ایمیل رسمی، درخواست پیگیری یا استرداد وجه ثبت کنید.');
 buyer.append(guidance);
 const buyerContact=()=>{
  for(const input of [fields.name,fields.email]){
   if(!input.reportValidity())return null;
  }
  if(fields.name.value.trim().length<2){fields.name.setCustomValidity(tr('حداقل دو حرف وارد کنید.'));fields.name.reportValidity();fields.name.setCustomValidity('');return null;}
  if(fields.phone.value&&!fields.phone.checkValidity()){fields.phone.reportValidity();return null;}
  return {name:fields.name.value.trim(),email:fields.email.value.trim(),phone:fields.phone.value.trim()};
 };
 host.append(buyer);
 const selected=new URLSearchParams(location.search).get(kind==='service'?'service':'vip');
 let visible=0;
 for(const item of items){
  if(selected && item.id!==selected)continue;
  if(item.sellable!==true||!Number.isSafeInteger(item.price)||item.price<1||
     typeof item.id!=='string'||!/^[a-z0-9_-]{1,70}$/.test(item.id))continue;
  visible++;
  const card=document.createElement('article');card.className='commerce-card';
  const image=document.createElement('img');
  image.src=kind==='service'?'/assets/images/services/'+encodeURIComponent(item.id)+'.svg':'/assets/images/vip-'+encodeURIComponent(item.id)+'.svg';
  image.alt=tr('تصویر اختصاصی ')+String(IS_EN&&kind==='service'?(translations[item.id]?.title||tr('خدمت تخصصی')):(item.title_fa||tr('خدمت تخصصی')));
  image.loading='lazy';image.decoding='async';image.width=1200;image.height=675;
  image.style.cssText='display:block;width:100%;height:auto;aspect-ratio:16/9;object-fit:cover;border-radius:14px;border:1px solid #b6a37d;margin:0 0 16px';
  const title=document.createElement('h3');title.textContent=IS_EN&&kind==='service'?(translations[item.id]?.title||item.title_fa):item.title_fa;
  const fit=document.createElement('p');fit.className='commerce-fit';
  fit.textContent=kind==='service'?String(IS_EN?(translations[item.id]?.fit||tr('برای آگاهی از دامنه این خدمت، معرفی کامل آن را بخوانید.')):(item.fit_fa||tr('برای آگاهی از دامنه این خدمت، معرفی کامل آن را بخوانید.'))):tr('دامنه، خروجی و شرایط بسته اختصاصی را پیش از تصمیم بررسی کنید.');
  const price=document.createElement('p');price.className='commerce-price';price.textContent=fmt(item.price);
  const button=document.createElement('button');button.type='button';button.className='commerce-pay';button.textContent=tr('در حال بررسی وضعیت درگاه');button.disabled=true;
  const live=document.createElement('p');live.className='commerce-feedback';live.setAttribute('aria-live','polite');
  button.addEventListener('click',()=>{
   const customer=buyerContact();
   if(!customer)return status(live,tr('پیش از پرداخت، نام و ایمیل معتبر وارد کنید.'));
   return pay([{sku:kind+':'+item.id,quantity:1}],button,live,customer);
  });
  const details=document.createElement('a');details.href=kind==='service'?(IS_EN?'/en/services/':'/fa/services/')+encodeURIComponent(item.id)+'/':'/fa/vip/'+encodeURIComponent(item.id)+'/';details.textContent=kind==='service'?tr('معرفی کامل، شرایط و جزئیات خدمت'):tr('مشاهده معرفی بسته‌های VIP');details.className='commerce-details';details.style.cssText='display:block;margin:12px 0;color:inherit;text-decoration:underline;text-underline-offset:5px';card.append(image,title,fit,price,details,button,live);host.append(card);
 }
 if(!visible){const empty=document.createElement('p');empty.className='commerce-notice';empty.textContent=tr('خدمت انتخاب‌شده در فهرست فروش یافت نشد. لطفاً از فهرست رسمی یک خدمت را انتخاب کنید.');const back=document.createElement('a');back.href=kind==='service'?(IS_EN?'/en/services/':'/fa/services/'):'/fa/vip/';back.textContent=tr('بازگشت به فهرست خدمات');empty.append(document.createElement('br'),back);host.append(empty);}
 const contact=document.createElement('div');contact.className='commerce-contact';
 const email=document.createElement('a');email.href='mailto:'+CONTACT_EMAIL+'?subject='+encodeURIComponent(tr('هماهنگی خدمات دکتر رضازاده'));email.textContent=tr('ارتباط از طریق ایمیل');
 const note=document.createElement('p');note.textContent=tr('پرسش‌های پیش از خرید و پیگیری سفارش فقط از طریق ایمیل رسمی انجام می‌شود. پشتیبانی ایتا برای دانش‌آموزان دارای خدمت خریداری‌شده و دسترسی تأییدشده است.');
 contact.append(note,email);host.prepend(contact);host.prepend(message);
}
async function start(){
 const vip=document.querySelector('[data-commerce-vip]');
 const services=document.querySelector('[data-commerce-services]');
 if(!vip&&!services)return;
 try{
  const [v,s,descriptions]=await Promise.all([
   vip?fetch('/assets/data/vip-catalog.json',{cache:'no-store'}).then(x=>{if(!x.ok)throw Error('catalog');return x.json()}):Promise.resolve(null),
   services?fetch('/assets/data/service-catalog.json',{cache:'no-store'}).then(x=>{if(!x.ok)throw Error('catalog');return x.json()}):Promise.resolve(null),
   services&&IS_EN?fetch('/assets/data/service-descriptions-en.json',{cache:'no-store'}).then(x=>{if(!x.ok)throw Error('translations');return x.json()}):Promise.resolve(null)
  ]);
  if(vip)mount(vip,'vip',Array.isArray(v?.services)?v.services:[]);
  if(services)mount(services,'service',Array.isArray(s?.services)?s.services:[],descriptions?.services||{});
  // A public catalogue does not prove that payment and fulfilment are available.
  let health=null;
  try{
   const r=await fetch(API+'/commerce/health',{cache:'no-store',credentials:'omit'});
   if(r.ok){const data=await r.json();if(data?.ok===true)health=data}
  }catch(_){}
  for(const [host,kind] of [[vip,'vip'],[services,'services']]){
   if(!host)continue;
   const channel=health?.capabilities?.[kind];
   const ready=health?.checkout===true && channel===true;
   for(const button of host.querySelectorAll('.commerce-pay')){
    button.disabled=!ready;
    button.textContent=ready?tr('پرداخت امن این خدمت'):tr('درگاه این خدمت هنوز آماده نیست');
   }
   const message=host.querySelector('.commerce-notice');
   if(message && !ready)message.textContent=tr('رزرو و پرداخت آنلاین این خدمت هنوز آماده نیست. برای پرسش پیش از خرید، فقط از ایمیل رسمی استفاده کنید؛ در این صفحه وجهی دریافت نمی‌شود.');
  }
 }catch(e){for(const el of [vip,services])if(el)el.textContent=tr('فهرست خدمات موقتاً در دسترس نیست.')}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
