/* One-of-one Webster's set. No new checkout system: the existing book cart,
 * server catalogue, BitPay gateway, stock reservation and receipt remain authoritative.
 * This file only offers a shortcut into the canonical flow. */
(()=>{
'use strict';
const sku='book:websters-third-1981';
const id='websters-third-1981';
const isFa=document.documentElement.lang==='fa';
const button=document.querySelector('[data-collectible-buy]');
const state=document.querySelector('[data-collectible-status]');
if(!button||!state)return;
button.disabled=true;
let available=false;
let pending=false;
function label(fa,en){return isFa?fa:en}
function update(text){state.textContent=text}
async function refresh(){
  try{
    const response=await fetch('/api/commerce/collectible-availability',{credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}});
    if(!response.ok)throw new Error('availability_unavailable');
    const info=await response.json();
    if(info.ok!==true||info.sku!==sku)throw new Error('unexpected_inventory_response');
    available=info.available===true&&info.checkoutReady===true;
    button.disabled=!available;
    if(available){
      button.textContent=label('افزودن تنها مجموعه و ادامه به پرداخت امن','Buy the only set — secure checkout');
      update(label('موجودی این مجموعه فعلاً آزاد است؛ ثبت قطعی فروش پس از تأیید درگاه و رزرو اتمی انجام می‌شود.','This set is currently available. The final sale requires an atomic reservation and verified gateway payment.'));
    }else if(info.available===false){
      button.textContent=label('خرید آنلاین فعلاً در دسترس نیست','Online purchase not available');
      update(label('موجودی تأییدشده آزاد نیست: ممکن است مجموعه فروخته شده، رزرو شده یا هنوز در پایگاه داده تأیید نشده باشد. برای استعلام از ایمیل استفاده کنید.','No verified free stock: the set may be sold, reserved or awaiting inventory reconciliation. Enquire by email.'));
    }else{
      button.textContent=label('در انتظار آماده‌سازی درگاه','Awaiting verified payment readiness');
      update(label('این مجموعه موجود است، اما امکان پرداخت هنوز از سوی سرور تأیید نشده است؛ وجهی دریافت نمی‌شود.','The set exists but the server has not yet confirmed secure checkout. No payment will be taken.'));
    }
  }catch(_){
    available=false;button.disabled=true;
    button.textContent=label('بررسی موجودی مقدور نیست','Inventory status unavailable');
    update(label('اتصال به سرور برای تأیید موجودی برقرار نشد؛ برای پیشگیری از فروش تکراری، خرید بسته است.','Server inventory could not be verified. Checkout is disabled to prevent double sale.'));
  }
}
button.addEventListener('click',()=>{
  if(!available||pending)return;
  pending=true;button.disabled=true;
  try{
    const key='jr-book-cart-v1';
    const raw=JSON.parse(localStorage.getItem(key)||'[]');
    const cart=Array.isArray(raw)?raw.filter(x=>x&&typeof x.book_id==='string'&&x.book_id!==id&&Number.isInteger(x.quantity)&&x.quantity>0).slice(0,19):[];
    cart.push({book_id:id,quantity:1});
    localStorage.setItem(key,JSON.stringify(cart));
    location.assign((isFa?'/fa/':'/en/')+'shop/cart/');
  }catch(_){
    pending=false;update(label('ذخیره سبد خرید ممکن نشد؛ لطفاً از مرورگر دیگری استفاده کنید.','Unable to store your cart; please try another browser.'));
    button.disabled=false;
  }
});
refresh();
window.addEventListener('pageshow',e=>{if(e.persisted){pending=false;refresh()}});
})();
