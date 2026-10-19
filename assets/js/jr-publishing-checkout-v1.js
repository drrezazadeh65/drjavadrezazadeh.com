/* JR Future Publishing · guest digital checkout · never trusts a public price */
(()=>{'use strict';
const form=document.querySelector('#jp-digital-checkout-form');
const state=document.querySelector('#jp-checkout-state');
const pay=document.querySelector('#jp-pay-now');
const name=document.querySelector('#jp-buyer-name');
const email=document.querySelector('#jp-buyer-email');
const badge=document.querySelector('#jp-offer-badge');
const readiness=document.querySelector('#jp-purchase-readiness');
const recheck=document.querySelector('#jp-recheck-offer');
if(!form||!state||!pay||!name||!email)return;
let ready=false,busy=false,checking=false;
function notice(s){state.textContent=s}
function setOfferReady(value){
 ready=value;
 form.hidden=!ready;
 if(badge)badge.textContent=ready?'خرید آنلاین فعال؛ تحویل دیجیتال':'فروش در انتظار تأیید آمادگی';
 if(readiness)readiness.textContent=ready
  ?'نسخه دیجیتال دو فایل PDF اکنون پس از پرداخت تأییدشده از طریق لینک‌های خصوصی تحویل می‌شود.'
  :'خرید آنلاین پس از تأیید آمادگی درگاه و تحویل امن دو PDF فعال می‌شود. تا زمان فعال‌سازی هیچ مبلغی دریافت نخواهد شد.';
}
async function offer(){
 if(checking||busy)return;
 checking=true;
 if(recheck)recheck.disabled=true;
 notice('در حال بررسی وضعیت واقعی پرداخت و تحویل در سرور...');
 try{
  const r=await fetch('/api/publishing/offer',{method:'GET',credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}});
  if(!r.ok)throw Error('offer_unavailable');
  const j=await r.json();
  setOfferReady(j.ok===true&&j.checkoutEnabled===true&&j.available===true&&j.sku==='digital:tefl-ma-exams-1370-1405'&&j.priceToman===1000000);
  notice(ready?'فروش آنلاین فعال است؛ نام و ایمیل دریافت فایل‌ها را وارد کنید. پرداخت فقط پس از تأیید درگاه معتبر قطعی می‌شود.':'فروش دیجیتال هنوز از سمت سرور آماده اعلام نشده است؛ تا فعال‌شدن تحویل امن هیچ مبلغی دریافت نمی‌شود.');
 }catch(_){
  setOfferReady(false);
  notice('تأیید آمادگی درگاه در دسترس نیست؛ برای جلوگیری از دریافت وجه بدون تحویل، خرید موقتاً غیرفعال است.');
 }finally{
  checking=false;
  if(recheck)recheck.disabled=false;
 }
}
form.addEventListener('submit',async e=>{
 e.preventDefault();if(!ready||busy||!form.reportValidity())return;
 const customer={name:name.value.trim(),email:email.value.trim(),phone:''};
 if(customer.name.length<2||!customer.email.includes('@'))return;
 busy=true;pay.disabled=true;notice('در حال ایجاد سفارش امن در سرور...');
 try{
  const r=await fetch('/api/commerce/create',{method:'POST',credentials:'same-origin',cache:'no-store',
    headers:{'Content-Type':'application/json','Accept':'application/json'},
    body:JSON.stringify({items:[{sku:'digital:tefl-ma-exams-1370-1405',quantity:1}],customer})});
  const j=await r.json();
  if(!r.ok||j.ok!==true||j.currency!=='IRT'||j.totalToman!==1000000||typeof j.paymentUrl!=='string')throw Error('order_not_ready');
  const dest=new URL(j.paymentUrl,location.origin);
  if(dest.origin!==location.origin||dest.username||dest.password||dest.hash||dest.pathname!=='/fa/shop/payment-start/'||dest.searchParams.size!==1||!dest.searchParams.get('gateway'))throw Error('invalid_gateway_relay');
  notice('سفارش ثبت شد؛ انتقال به صفحه پرداخت امن...');
  window.location.assign(dest.href);
 }catch(_){
  // An uncertain POST can create an order or start payment before the response is lost.
  // Keep this form locked to prevent a duplicate charge until the buyer checks status.
  notice('وضعیت سفارش یا درخواست پرداخت نامشخص است. برای جلوگیری از پرداخت تکراری، پیش از تلاش مجدد با پشتیبانی رسمی info@drjavadrezazadeh.com و با اعلام نام و ایمیل سفارش تماس بگیرید.');
 }
});
recheck?.addEventListener('click',offer);
document.addEventListener?.('visibilitychange',()=>{if(document.visibilityState==='visible'&&!busy)offer()});
offer();
})();