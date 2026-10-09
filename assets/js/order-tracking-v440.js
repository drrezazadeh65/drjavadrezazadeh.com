(()=>{"use strict";
const API="https://drjavadrezazadeh-payment.dr-rezazadeh65.workers.dev";
const search=new URLSearchParams(location.search),id=search.get("order");
const hash=new URLSearchParams(location.hash.slice(1)),feedback=document.getElementById("order-feedback"),badge=document.getElementById("order-badge");
const detail=document.getElementById("order-detail"),link=document.getElementById("invoice-link"),refresh=document.getElementById("refresh");
const refundBlock=document.getElementById("refund-block"),refundForm=document.getElementById("refund-form"),refundFeedback=document.getElementById("refund-feedback");
const statuses={created:"در حال ایجاد سفارش",pending:"در انتظار تأیید بانکی",paid:"پرداخت تأییدشده",failed:"پرداخت ناموفق",cancelled:"لغو‌شده"};
const fulfil={preparing_shipment:"در حال آماده‌سازی ارسال",shipped:"تحویل به شرکت حمل",delivered:"تحویل‌شده",awaiting_service_coordination:"در انتظار هماهنگی خدمت",scheduled:"زمان‌بندی‌شده",completed:"تکمیل‌شده",cancelled:"لغو‌شده",refunded:"بازپرداخت‌شده",awaiting_payment:"در انتظار پرداخت"};
const money=n=>new Intl.NumberFormat("fa-IR").format(n||0)+" تومان";
const section=(target,title,value)=>{if(value===undefined||value===null||value==="")return;const dl=document.createElement("dl");dl.className="receipt-field";const dt=document.createElement("dt"),dd=document.createElement("dd");dt.textContent=title;dd.textContent=String(value);dl.append(dt,dd);target.append(dl)};
let token=hash.get("access")||"";
if(/^[a-f0-9]{64}$/.test(token)){
 try{sessionStorage.setItem("jr-receipt:"+id,token)}catch{}
 history.replaceState(null,"",location.pathname+location.search);
}else{try{token=sessionStorage.getItem("jr-receipt:"+id)||""}catch{}}
async function load(){
 detail.hidden=true;link.hidden=true;feedback.textContent="در حال استعلام وضعیت سفارش از سرور...";
 if(!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id||"")||!/^[a-f0-9]{64}$/.test(token)){
  feedback.textContent="شناسه یا کد خصوصی سفارش معتبر نیست. لطفاً از لینک خصوصی رسید استفاده کنید یا با پشتیبانی تماس بگیرید.";return;
 }
 try{
  const r=await fetch(API+"/commerce/order?order="+encodeURIComponent(id),{credentials:"omit",cache:"no-store",headers:{"Authorization":"Bearer "+token}});
  const data=await r.json();
  if(!r.ok||!data.ok||!data.order)throw Error("unavailable");
  const o=data.order;
  badge.textContent=statuses[o.payment_state]||"وضعیت نامشخص";badge.classList.toggle("verified",o.payment_state==="paid");
  const meta=document.getElementById("order-meta");meta.replaceChildren();const items=document.getElementById("order-items");items.replaceChildren();const status=document.getElementById("order-fulfilment");status.replaceChildren();
  section(meta,"شناسه سفارش",o.id);section(meta,"زمان ایجاد سفارش",o.created_at);section(meta,"وضعیت پرداخت",statuses[o.payment_state]||o.payment_state);
  if(o.paid_at)section(meta,"زمان تأیید پرداخت",o.paid_at);
  section(meta,"نام گیرنده",o.recipient_name);
  for(const item of o.items||[])section(items,item.title||item.sku,"تعداد: "+item.quantity+" | جمع: "+money(item.subtotal));
  section(items,"مبلغ کل",money(o.amount_toman));section(items,"هزینه ارسال",money(o.shipping_toman));
  section(status,"وضعیت انجام",fulfil[o.fulfilment_state]||o.fulfilment_state);
  section(status,"شناسه پیگیری مرسوله",o.tracking_code);
  if(o.invoice_available){link.hidden=false;link.href="/fa/shop/invoice/?order="+encodeURIComponent(id);}
  detail.hidden=false;
  refundBlock.hidden=o.payment_state!=="paid";
  if(o.payment_state==="paid")await getRefundStatus();
  feedback.textContent="آخرین وضعیت ثبت‌شده سفارش از سامانه امن دریافت شد.";
 }catch{badge.textContent="وضعیت تأیید نشد";feedback.textContent="استعلام خصوصی ممکن نشد. در صورت برداشت وجه از پرداخت مجدد خودداری کنید و با پشتیبانی تماس بگیرید.";}
}
async function getRefundStatus(){
 try{
  const r=await fetch(API+"/commerce/refund/status?order="+encodeURIComponent(id),{cache:"no-store",credentials:"omit",headers:{"Authorization":"Bearer "+token}});
  const data=await r.json();
  if(!r.ok||!data.ok)throw Error("unavailable");
  if(data.request){
   const states={requested:"در انتظار بررسی",reviewing:"در حال بررسی",declined:"درخواست ردشده",approved_pending_disbursement:"در انتظار اقدام مالی مستقل"};
   refundFeedback.textContent="وضعیت درخواست قبلی: "+(states[data.request.state]||data.request.state)+". ثبت درخواست به معنی بازگشت وجه نیست.";
   refundForm.hidden=true;
  }
 }catch{refundFeedback.textContent="وضعیت درخواست بازپرداخت در حال حاضر قابل استعلام نیست.";}
}
refundForm.addEventListener("submit",async event=>{
 event.preventDefault();
 const reason=String(refundForm.elements.reason.value||"").trim();
 if(reason.length<20){refundFeedback.textContent="لطفاً دلیل درخواست را با حداقل ۲۰ نویسه توضیح دهید.";return}
 if(!confirm("آیا ثبت درخواست بررسی بازپرداخت، بدون انجام خودکار بازگشت وجه، تأیید می‌شود؟"))return;
 const submit=refundForm.querySelector('button[type="submit"]');submit.disabled=true;
 refundFeedback.textContent="در حال ثبت امن درخواست بررسی...";
 try{
  const r=await fetch(API+"/commerce/refund/request",{method:"POST",mode:"cors",credentials:"omit",
   headers:{"Authorization":"Bearer "+token,"Content-Type":"application/json"},body:JSON.stringify({order:id,reason})});
  const d=await r.json();if(!r.ok||!d.ok)throw Error("not_saved");
  refundFeedback.textContent="درخواست با شناسه "+d.request.id+" ثبت شد و نیازمند بررسی پشتیبانی است؛ هیچ وجهی خودکار بازگردانده نشده است.";
  refundForm.hidden=true;
 }catch{refundFeedback.textContent="ثبت درخواست ممکن نشد؛ از راه ارتباط رسمی با پشتیبانی تماس بگیرید.";}
 finally{submit.disabled=false;}
});
refresh.addEventListener("click",load);load();
})();