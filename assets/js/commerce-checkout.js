/* Unified payment initiation. Server-side catalog and D1 remain authoritative. */
(()=>{'use strict';
const API='https://drjavadrezazadeh-payment.dr-rezazadeh65.workers.dev';
const CONTACT_EMAIL='dr.rezazadeh65@gmail.com';
const fmt=n=>new Intl.NumberFormat('fa-IR').format(n)+' تومان';
const status=(el,msg)=>{if(el){el.textContent=msg;el.setAttribute('role','status');el.setAttribute('aria-live','polite')}};
async function pay(items,button,message){
 if(!Array.isArray(items)||!items.length)return status(message,'هیچ محصولی انتخاب نشده است.');
 button.disabled=true;status(message,'در حال ایجاد سفارش امن...');
 try{
  const res=await fetch(API+'/commerce/create',{method:'POST',mode:'cors',credentials:'omit',headers:{'Content-Type':'application/json'},body:JSON.stringify({items})});
  const data=await res.json();
  if(!res.ok||!data?.ok){
   status(message,data?.error==='checkout_disabled'?'پرداخت آنلاین در مرحله آزمون نهایی است؛ وجهی برداشت نشده است.':'ثبت سفارش امکان‌پذیر نشد؛ وجهی پرداخت نکنید.');return;
  }
  if(typeof data.paymentUrl!=='string')throw Error('missing_gateway_link');
  const link=new URL(data.paymentUrl,location.origin);
  if(link.origin!==location.origin||link.pathname!=='/fa/shop/payment-start/'||link.searchParams.size!==1||!link.searchParams.has('gateway'))throw Error('unsafe_gateway_link');
  location.assign(link.href);
 }catch(e){status(message,'اتصال به سامانه پرداخت برقرار نشد. وجهی پرداخت نشده است.')}
 finally{button.disabled=false;button.textContent='تلاش مجدد برای پرداخت امن';}
}
function mount(host,kind,items){
 if(!host)return;
 host.classList.add('commerce-grid');
 host.innerHTML='';
 const message=document.createElement('p');message.className='commerce-notice';message.textContent='مبلغ نهایی در سرور بررسی می‌شود. برای پیگیری، شناسه سفارش را نگه دارید و فقط از طریق ایمیل رسمی مکاتبه کنید.';
 for(const item of items){
  if(item.sellable!==true||!Number.isSafeInteger(item.price)||item.price<1||
     typeof item.id!=='string'||!/^[a-z0-9_-]{1,70}$/.test(item.id))continue;
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
  if(vip)mount(vip,'vip',v.services);
  if(services)mount(services,'service',s.services);
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
