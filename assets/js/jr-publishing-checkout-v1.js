/* JR Future Publishing · guest digital checkout · never trusts a public price */
(()=>{'use strict';
const form=document.querySelector('#jp-digital-checkout-form');
const state=document.querySelector('#jp-checkout-state');
const pay=document.querySelector('#jp-pay-now');
const name=document.querySelector('#jp-buyer-name');
const email=document.querySelector('#jp-buyer-email');
if(!form||!state||!pay||!name||!email)return;
let ready=false,busy=false;
function notice(s){state.textContent=s}
async function offer(){
 try{
  const r=await fetch('/api/publishing/offer',{method:'GET',credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}});
  if(!r.ok)throw Error('offer_unavailable');
  const j=await r.json();
  ready=j.ok===true&&j.checkoutEnabled===true&&j.available===true&&j.sku==='digital:tefl-ma-exams-1370-1405'&&j.priceToman===1000000;
  form.hidden=!ready;
  notice(ready?'درگاه پرداخت و سامانه تحویل دیجیتال آماده‌اند. ایمیل خود را با دقت وارد کنید.':'فروش دیجیتال در حال آماده‌سازی امن است؛ تا فعال‌شدن تحویل خودکار هیچ مبلغی دریافت نمی‌شود.');
 }catch(_){ready=false;form.hidden=true;notice('امکان تأیید آمادگی درگاه وجود ندارد؛ برای حفاظت از خریداران پرداخت موقتاً غیرفعال است.')}
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
  if(dest.origin!==location.origin||!dest.pathname.startsWith('/fa/shop/payment-start/'))throw Error('invalid_gateway_relay');
  notice('سفارش ثبت شد؛ انتقال به صفحه پرداخت امن...');
  window.location.assign(dest.href);
 }catch(_){
  notice('سفارش پرداختی تکمیل نشد. وجهی از این صفحه دریافت نشده است؛ برای تلاش مجدد یا پیگیری با پشتیبانی تماس بگیرید.');
  busy=false;pay.disabled=false;
 }
});
offer();
})();