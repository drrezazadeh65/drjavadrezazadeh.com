/* Private purchase history. No localStorage, client cache or payment inference. */
(()=>{'use strict';
const host=document.querySelector('[data-resource="orders"]');
if(!host)return;
const section=host.querySelector('.case-section .appointment-card.empty');
if(!section)return;
const isEn=document.documentElement.lang==='en';
const tr=(fa,en)=>isEn?en:fa;
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=String(text);if(cls)n.className=cls;return n;};
const format=n=>new Intl.NumberFormat(isEn?'en-US':'fa-IR').format(n);
function showInfo(message,login){
  section.replaceChildren();
  const wrapper=el('div');wrapper.append(el('strong',message));
  if(login){const a=el('a',tr('ورود به حساب تأییدشده','Sign in to your verified account'),'button primary');
    a.href=isEn?'/en/login/':'/fa/login/';wrapper.append(a);}
  section.append(wrapper);
}
function render(orders){
  section.replaceChildren();
  if(!orders.length){showInfo(tr('هنوز سفارشی برای ایمیل تأییدشدهٔ این حساب ثبت نشده است. سفارش مهمان تنها پس از تأیید مالکیت ایمیل با حساب ارتباط می‌یابد.','No orders were found for this account’s verified email. Guest orders appear only after email ownership is verified.'),false);return;}
  const wrap=el('div');wrap.style.cssText='display:grid;gap:1rem;width:100%;min-width:0';
  for(const order of orders){
    const item=el('article','','appointment-card');item.style.cssText='display:block;min-width:0;padding:1rem;overflow-wrap:anywhere';
    const heading=el('strong',tr('سفارش ','Order ')+order.id);
    const state=order.paymentVerified===true
      ?tr('پرداخت در سرور تأیید شده','Server-verified payment')
      :({'created':tr('ثبت اولیه، پرداخت‌نشده','Created, unpaid'),
          'pending':tr('در انتظار تأیید درگاه','Awaiting gateway verification'),
          'failed':tr('پرداخت تأیید نشد','Payment not verified'),
          'cancelled':tr('سفارش لغو شده','Cancelled'),
          'paid':tr('بررسی شواهد پرداخت لازم است','Payment evidence requires review')}[order.state]||tr('در حال بررسی','Under review'));
    item.append(heading,el('p',state),el('p',tr('مبلغ سفارش: ','Order amount: ')+format(order.amountToman)+' '+tr('تومان','toman')));
    if(order.createdAt)item.append(el('small',tr('ثبت: ','Created: ')+order.createdAt));
    const list=el('ul');list.style.cssText='padding-inline-start:1.25rem;line-height:1.9';
    for(const line of order.items||[])list.append(el('li',(line.title||line.sku)+' × '+format(line.quantity)+' — '+format(line.subtotalToman)+' '+tr('تومان','toman')));
    item.append(list);
    item.append(el('small',tr('ارسال، تحویل، استرداد و دسترسی خدمت صرفاً پس از تأیید جداگانه نمایش داده می‌شوند.','Shipping, delivery, refunds and service access require separate verification.')));
    wrap.append(item);
  }
  section.append(wrap);
}
async function load(){
  section.setAttribute('aria-busy','true');
  showInfo(tr('در حال بررسی امن سفارش‌های حساب…','Securely checking account orders…'),false);
  try{
    const res=await fetch('/api/commerce/history',{method:'GET',credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}});
    if(res.status===401){showInfo(tr('برای مشاهده سفارش‌های خود ابتدا وارد حساب دارای ایمیل تأییدشده شوید.','Sign in with a verified email to view your orders.'),true);return;}
    if(!res.ok)throw new Error('history_unavailable');
    const data=await res.json();if(data?.ok!==true||!Array.isArray(data.orders))throw new Error('history_invalid');
    render(data.orders);
  }catch(_){showInfo(tr('تاریخچه واقعی سفارش‌ها در حال حاضر در دسترس نیست؛ اطلاعات فرضی نمایش داده نمی‌شود.','Order history is currently unavailable; no simulated purchases are shown.'),false);}
  finally{section.setAttribute('aria-busy','false');}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
})();