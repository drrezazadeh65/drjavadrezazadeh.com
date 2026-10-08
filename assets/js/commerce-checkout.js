/* Unified payment initiation. Server-side catalog and D1 remain authoritative. */
(()=>{'use strict';
const API='https://drjavadrezazadeh-payment.dr-rezazadeh65.workers.dev';
const CONTACT_EMAIL='dr.rezazadeh65@gmail.com';
const EITAA_URL='https://eitaa.com/DrRezazadeh65';
const fmt=n=>new Intl.NumberFormat('fa-IR').format(n)+' تومان';
const status=(el,msg)=>{if(el){el.textContent=msg;el.setAttribute('role','status');el.setAttribute('aria-live','polite')}};
async function pay(items,button,message,email){
 if(email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return status(message,'نشانی ایمیل معتبر نیست.');
 if(!Array.isArray(items)||!items.length)return status(message,'هیچ محصولی انتخاب نشده است.');
 button.disabled=true;status(message,'در حال ایجاد سفارش امن...');
 try{
  const res=await fetch(API+'/commerce/create',{method:'POST',mode:'cors',credentials:'omit',headers:{'Content-Type':'application/json'},body:JSON.stringify({items,customerEmail:email||undefined})});
  const data=await res.json();
  if(!res.ok||!data.ok){
   status(message,data.error==='checkout_disabled'?'پرداخت آنلاین در مرحله آزمون نهایی است؛ وجهی برداشت نشده است.':'ثبت سفارش امکان‌پذیر نشد؛ وجهی پرداخت نکنید.');return;
  }
  const link=new URL(data.paymentUrl);
  if(link.origin!==location.origin||link.pathname!=='/fa/shop/payment-start/'||link.searchParams.size!==1||!link.searchParams.has('gateway'))throw Error('unsafe_gateway_link');
  location.assign(link.href);
 }catch(e){status(message,'اتصال به سامانه پرداخت برقرار نشد. وجهی پرداخت نشده است.')}
 finally{button.disabled=false}
}
function mount(host,kind,items){
 if(!host)return;
 host.classList.add('commerce-grid');
 host.innerHTML='';
 const message=document.createElement('p');message.className='commerce-notice';message.textContent='مبلغ نهایی در سرور بررسی می‌شود. برای هماهنگی سریع‌تر، ایمیل خود را وارد کنید (اختیاری).';
 for(const item of items){
  if(item.sellable!==true||!Number.isSafeInteger(item.price)||item.price<1)continue;
  const card=document.createElement('article');card.className='commerce-card';
  const title=document.createElement('h3');title.textContent=item.title_fa;
  const price=document.createElement('p');price.className='commerce-price';price.textContent=fmt(item.price);
  const emailInput=document.createElement('input');emailInput.type='email';emailInput.autocomplete='email';emailInput.placeholder='ایمیل برای پیگیری (اختیاری)';emailInput.maxLength=254;emailInput.setAttribute('aria-label','ایمیل برای پیگیری سفارش');emailInput.style.cssText='display:block;width:100%;min-height:44px;margin:8px 0 14px;border-radius:9px;border:1px solid #9e875d;padding:10px;background:#fff;color:#17253d;direction:ltr';
  const button=document.createElement('button');button.type='button';button.className='commerce-pay';button.textContent='پرداخت امن این خدمت';
  const live=document.createElement('p');live.className='commerce-feedback';live.setAttribute('aria-live','polite');
  button.addEventListener('click',()=>pay([{sku:kind+':'+item.id,quantity:1}],button,live,emailInput.value.trim()));
  card.append(title,price,emailInput,button,live);host.append(card);
 }
 const contact=document.createElement('div');contact.className='commerce-contact';
 const email=document.createElement('a');email.href='mailto:'+CONTACT_EMAIL+'?subject='+encodeURIComponent('هماهنگی خدمات دکتر رضازاده');email.textContent='ارتباط از طریق ایمیل';
 const eitaa=document.createElement('a');eitaa.href=EITAA_URL;eitaa.target='_blank';eitaa.rel='noopener noreferrer';eitaa.textContent='پیام در ایتا: @DrRezazadeh65';
 const note=document.createElement('p');note.textContent='برای هماهنگی پیش از خرید یا پیگیری زمان ارائه خدمت می‌توانید از ایمیل یا ایتا استفاده کنید. برای ثبت و پیگیری رسمی سفارش، نشانی ایمیل معتبر ضروری است.';
 contact.append(note,email,document.createTextNode('  ·  '),eitaa);host.prepend(contact);host.prepend(message);
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
  if(vip)mount(vip,'vip',v.services.filter(x=>x.checkout_enabled===true));
  if(services)mount(services,'service',s.services);
 }catch(e){for(const el of [vip,services])if(el)el.textContent='فهرست خدمات موقتاً در دسترس نیست.'}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
