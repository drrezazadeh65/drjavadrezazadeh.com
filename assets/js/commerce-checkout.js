/* Unified payment initiation. Server-side catalog and D1 remain authoritative. */
(()=>{'use strict';
const API='https://drjavadrezazadeh-payment.dr-rezazadeh65.workers.dev';
const CONTACT_EMAIL='info@drjavadrezazadeh.com';
const fmt=n=>new Intl.NumberFormat('fa-IR').format(n)+' تومان';
const status=(el,msg)=>{if(el){el.textContent=msg;el.setAttribute('role','status');el.setAttribute('aria-live','polite')}};
async function pay(items,button,message){
 if(button.disabled)return;
 if(!Array.isArray(items)||!items.length)return status(message,'هیچ محصولی انتخاب نشده است.');
 button.disabled=true;status(message,'در حال ایجاد سفارش امن...');
 try{
  const res=await fetch(API+'/commerce/create',{method:'POST',mode:'cors',credentials:'omit',headers:{'Content-Type':'application/json'},body:JSON.stringify({items})});
  const data=await res.json();
  if(!res.ok||data?.ok!==true){
   status(message,data?.error==='checkout_disabled'?'پرداخت آنلاین این خدمت فعال نیست؛ از اقدام به پرداخت خودداری کنید.':'ثبت سفارش تأیید نشد؛ پیش از تلاش مجدد، وضعیت سفارش را از طریق ایمیل رسمی پیگیری کنید.');return;
  }
  if(typeof data.paymentUrl!=='string')throw Error('missing_gateway_link');
  const link=new URL(data.paymentUrl,location.origin);
  if(link.origin!==location.origin||link.pathname!=='/fa/shop/payment-start/'||link.searchParams.size!==1||!link.searchParams.get('gateway'))throw Error('unsafe_gateway_link');
  button.dataset.redirecting='true';
  location.assign(link.href);
 }catch(e){delete button.dataset.redirecting;status(message,'وضعیت درخواست پرداخت نامشخص است. پیش از تلاش مجدد، وضعیت سفارش را از طریق ایمیل رسمی بررسی کنید.')}
 finally{if(!button.dataset.redirecting){button.disabled=false;button.textContent='تلاش مجدد برای پرداخت امن';}}
}
function mount(host,kind,items){
 if(!host)return;
 host.classList.add('commerce-grid');
 host.innerHTML='';
 const message=document.createElement('p');message.className='commerce-notice';message.textContent='مبلغ نهایی در سرور بررسی می‌شود. برای پیگیری، شناسه سفارش را نگه دارید و فقط از طریق ایمیل رسمی مکاتبه کنید.';
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
  image.alt='تصویر اختصاصی '+String(item.title_fa||'خدمت تخصصی');
  image.loading='lazy';image.decoding='async';image.width=1200;image.height=675;
  image.style.cssText='display:block;width:100%;height:auto;aspect-ratio:16/9;object-fit:cover;border-radius:14px;border:1px solid #b6a37d;margin:0 0 16px';
  const title=document.createElement('h3');title.textContent=item.title_fa;
  const fit=document.createElement('p');fit.className='commerce-fit';
  fit.textContent=kind==='service'?String(item.fit_fa||'برای آگاهی از دامنه این خدمت، معرفی کامل آن را بخوانید.'):'دامنه، خروجی و شرایط بسته اختصاصی را پیش از تصمیم بررسی کنید.';
  const price=document.createElement('p');price.className='commerce-price';price.textContent=fmt(item.price);
  const button=document.createElement('button');button.type='button';button.className='commerce-pay';button.textContent='در حال بررسی وضعیت درگاه';button.disabled=true;
  const live=document.createElement('p');live.className='commerce-feedback';live.setAttribute('aria-live','polite');
  button.addEventListener('click',()=>pay([{sku:kind+':'+item.id,quantity:1}],button,live));
  const details=document.createElement('a');details.href=kind==='service'?'/fa/services/'+encodeURIComponent(item.id)+'/':'/fa/vip/'+encodeURIComponent(item.id)+'/';details.textContent=kind==='service'?'معرفی کامل، شرایط و جزئیات خدمت':'مشاهده معرفی بسته‌های VIP';details.className='commerce-details';details.style.cssText='display:block;margin:12px 0;color:inherit;text-decoration:underline;text-underline-offset:5px';card.append(image,title,fit,price,details,button,live);host.append(card);
 }
 if(!visible){const empty=document.createElement('p');empty.className='commerce-notice';empty.textContent='خدمت انتخاب‌شده در فهرست فروش یافت نشد. لطفاً از فهرست رسمی یک خدمت را انتخاب کنید.';const back=document.createElement('a');back.href=kind==='service'?'/fa/services/':'/fa/vip/';back.textContent='بازگشت به فهرست خدمات';empty.append(document.createElement('br'),back);host.append(empty);}
 const contact=document.createElement('div');contact.className='commerce-contact';
 const email=document.createElement('a');email.href='mailto:'+CONTACT_EMAIL+'?subject='+encodeURIComponent('هماهنگی خدمات دکتر رضازاده');email.textContent='ارتباط از طریق ایمیل';
 const note=document.createElement('p');note.textContent='پرسش‌های پیش از خرید و پیگیری سفارش فقط از طریق ایمیل رسمی انجام می‌شود. پشتیبانی ایتا برای دانش‌آموزان دارای خدمت خریداری‌شده و دسترسی تأییدشده است.';
 contact.append(note,email);host.prepend(contact);host.prepend(message);
}
async function start(){
 const vip=document.querySelector('[data-commerce-vip]');
 const services=document.querySelector('[data-commerce-services]');
 if(!vip&&!services)return;
 try{
  const [v,s]=await Promise.all([
   vip?fetch('/assets/data/vip-catalog.json',{cache:'no-store'}).then(x=>{if(!x.ok)throw Error('catalog');return x.json()}):Promise.resolve(null),
   services?fetch('/assets/data/service-catalog.json',{cache:'no-store'}).then(x=>{if(!x.ok)throw Error('catalog');return x.json()}):Promise.resolve(null)
  ]);
  if(vip)mount(vip,'vip',Array.isArray(v?.services)?v.services:[]);
  if(services)mount(services,'service',Array.isArray(s?.services)?s.services:[]);
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
    button.textContent=ready?'پرداخت امن این خدمت':'درگاه این خدمت هنوز آماده نیست';
   }
   const message=host.querySelector('.commerce-notice');
   if(message && !ready)message.textContent='رزرو و پرداخت آنلاین این خدمت هنوز آماده نیست. برای پرسش پیش از خرید، فقط از ایمیل رسمی استفاده کنید؛ در این صفحه وجهی دریافت نمی‌شود.';
  }
 }catch(e){for(const el of [vip,services])if(el)el.textContent='فهرست خدمات موقتاً در دسترس نیست.'}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
