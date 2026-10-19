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
const fa=document.documentElement.lang==='fa';
const tr=(persian,english)=>fa?persian:english;
let ready=false,busy=false,checking=false;
function notice(s){state.textContent=s}
function setOfferReady(value){
 ready=value;
 form.hidden=!ready;
 // Keep controls fail-closed during verification or uncertain order POSTs.
 pay.disabled=!ready||busy;
 if(badge)badge.textContent=ready?tr("خرید آنلاین فعال؛ تحویل دیجیتال","Digital checkout available; private PDF delivery"):tr("فروش در انتظار تأیید آمادگی","Checkout awaiting server verification");
 if(readiness)readiness.textContent=ready
  ?tr("نسخه دیجیتال دو فایل PDF اکنون پس از پرداخت تأییدشده از طریق لینک‌های خصوصی تحویل می‌شود.","After verified payment, both PDFs are delivered through private download links.")
  :tr("خرید آنلاین پس از تأیید آمادگی درگاه و تحویل امن دو PDF فعال می‌شود. تا زمان فعال‌سازی هیچ مبلغی دریافت نخواهد شد.","Checkout opens only after the server confirms secure payment and delivery. No payment is taken beforehand.");
}
async function offer(){
 if(checking||busy)return;
 checking=true;
 setOfferReady(false); // stale readiness must not leave a payment CTA visible
 if(recheck)recheck.disabled=true;
 notice(tr("در حال بررسی وضعیت واقعی پرداخت و تحویل در سرور...","Checking real-time payment and fulfilment readiness..."));
 try{
  const r=await fetch('/api/publishing/offer',{method:'GET',credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}});
  if(!r.ok)throw Error('offer_unavailable');
  const j=await r.json();
  setOfferReady(j.ok===true&&j.checkoutEnabled===true&&j.available===true&&j.sku==='digital:tefl-ma-exams-1370-1405'&&j.priceToman===1000000);
  notice(ready?tr("فروش آنلاین فعال است؛ نام و ایمیل دریافت فایل‌ها را وارد کنید. پرداخت فقط پس از تأیید درگاه معتبر قطعی می‌شود.","Checkout is available. Enter your name and delivery email. An order is paid only after verified confirmation from the payment provider."):tr("فروش دیجیتال هنوز از سمت سرور آماده اعلام نشده است؛ تا فعال‌شدن تحویل امن هیچ مبلغی دریافت نمی‌شود.","Digital sales are not yet approved by the server. No payment is collected until secure delivery is ready."));
 }catch(_){
  setOfferReady(false);
  notice(tr("تأیید آمادگی درگاه در دسترس نیست؛ برای جلوگیری از دریافت وجه بدون تحویل، خرید موقتاً غیرفعال است.","Payment readiness cannot be verified right now. Checkout is unavailable to avoid charging without secure delivery."));
 }finally{
  checking=false;
  if(recheck)recheck.disabled=false;
 }
}
form.addEventListener('submit',async e=>{
 e.preventDefault();if(!ready||busy||!form.reportValidity())return;
 const customer={name:name.value.trim(),email:email.value.trim(),phone:''};
 if(customer.name.length<2||!customer.email.includes('@'))return;
 busy=true;pay.disabled=true;notice(tr("در حال ایجاد سفارش امن در سرور...","Creating your secure order on the server..."));
 try{
  const r=await fetch('/api/commerce/create',{method:'POST',credentials:'same-origin',cache:'no-store',
    headers:{'Content-Type':'application/json','Accept':'application/json'},
    body:JSON.stringify({items:[{sku:'digital:tefl-ma-exams-1370-1405',quantity:1}],customer})});
  const j=await r.json();
  if(!r.ok||j.ok!==true||j.currency!=='IRT'||j.totalToman!==1000000||typeof j.paymentUrl!=='string')throw Error('order_not_ready');
  const dest=new URL(j.paymentUrl,location.origin);
  if(dest.origin!==location.origin||dest.username||dest.password||dest.hash||dest.pathname!=='/fa/shop/payment-start/'||dest.searchParams.size!==1||!dest.searchParams.get('gateway'))throw Error('invalid_gateway_relay');
  notice(tr("سفارش ثبت شد؛ انتقال به صفحه پرداخت امن...","Order created. Redirecting to the secure payment page..."));
  window.location.assign(dest.href);
 }catch(_){
  // An uncertain POST can create an order or start payment before the response is lost.
  // Keep this form locked to prevent a duplicate charge until the buyer checks status.
  notice(tr("وضعیت سفارش یا درخواست پرداخت نامشخص است. برای جلوگیری از پرداخت تکراری، پیش از تلاش مجدد با پشتیبانی رسمی info@drjavadrezazadeh.com و با اعلام نام و ایمیل سفارش تماس بگیرید.","The order or payment request status is uncertain. To prevent duplicate payment, contact official support at info@drjavadrezazadeh.com with the buyer name and email before retrying."));
 }
});
recheck?.addEventListener('click',offer);
document.addEventListener?.('visibilitychange',()=>{if(document.visibilityState==='visible'&&!busy)offer()});
offer();
})();