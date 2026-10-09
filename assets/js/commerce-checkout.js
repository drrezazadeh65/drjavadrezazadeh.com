/* Unified payment initiation. Server-side catalog and D1 remain authoritative. */
(()=>{'use strict';
const API='https://drjavadrezazadeh-payment.dr-rezazadeh65.workers.dev';
const CONTACT_EMAIL='dr.rezazadeh65@gmail.com';
const EITAA_URL='https://eitaa.com/DrRezazadeh65';
const fmt=n=>new Intl.NumberFormat('fa-IR').format(n)+' تومان';
const status=(el,msg)=>{if(el){el.textContent=msg;el.setAttribute('role','status');el.setAttribute('aria-live','polite')}};
function pay(items,button,message){
 if(!Array.isArray(items)||items.length!==1||!/^(vip|service):[a-z0-9_-]{1,70}$/.test(items[0]?.sku||""))return status(message,'خدمت انتخاب‌شده معتبر نیست.');
 button.disabled=true;
 const target=new URL('/fa/shop/checkout/',location.origin);
 target.searchParams.set('sku',items[0].sku);
 location.assign(target.href);
}
function mount(host,kind,items){
 if(!host)return;
 host.classList.add('commerce-grid');
 host.innerHTML='';
 const message=document.createElement('p');message.className='commerce-notice';message.textContent='مرحله بعد شامل اطلاعات خریدار، بررسی نهایی مبلغ و تأیید شرایط پیش از انتقال امن به درگاه است.';
 for(const item of items){
  if(item.sellable!==true||!Number.isSafeInteger(item.price)||item.price<1)continue;
  const card=document.createElement('article');card.className='commerce-card';
  const title=document.createElement('h3');title.textContent=item.title_fa;
  const price=document.createElement('p');price.className='commerce-price';price.textContent=fmt(item.price);
  const button=document.createElement('button');button.type='button';button.className='commerce-pay';button.textContent='ادامه به مشخصات و پرداخت';
  const live=document.createElement('p');live.className='commerce-feedback';live.setAttribute('aria-live','polite');
  button.addEventListener('click',()=>pay([{sku:kind+':'+item.id,quantity:1}],button,live));
  const details=document.createElement('a');details.href=kind==='service'?'/fa/services/'+encodeURIComponent(item.id)+'/':'/fa/vip/';details.textContent=kind==='service'?'معرفی کامل، شرایط و جزئیات خدمت':'مشاهده معرفی بسته‌های VIP';details.className='commerce-details';details.style.cssText='display:block;margin:12px 0;color:inherit;text-decoration:underline;text-underline-offset:5px';card.append(title,price,details,button,live);host.append(card);
 }
 const contact=document.createElement('div');contact.className='commerce-contact';
 const email=document.createElement('a');email.href='mailto:'+CONTACT_EMAIL+'?subject='+encodeURIComponent('هماهنگی خدمات دکتر رضازاده');email.textContent='ارتباط از طریق ایمیل';
 const eitaa=document.createElement('a');eitaa.href=EITAA_URL;eitaa.target='_blank';eitaa.rel='noopener noreferrer';eitaa.textContent='پیام در ایتا: @DrRezazadeh65';
 const note=document.createElement('p');note.textContent='برای هماهنگی پیش از خرید یا پیگیری زمان ارائه خدمت می‌توانید از ایمیل یا ایتا استفاده کنید. برای تکمیل خرید، شماره همراه معتبر و اطلاعات هماهنگی خدمت در گام بعد دریافت می‌شود.';
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
