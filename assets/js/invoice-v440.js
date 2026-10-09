/* v4.4.0-alpha protected payment receipt, never infer paid status from redirect. */
(()=>{"use strict";
const API="https://drjavadrezazadeh-payment.dr-rezazadeh65.workers.dev";
const query=new URLSearchParams(location.search),order=query.get("order");
const fragment=new URLSearchParams(location.hash.slice(1));
const feedback=document.getElementById("invoice-feedback");
const mount=document.getElementById("invoice-content");
const print=document.getElementById("print"),copy=document.getElementById("copy"),email=document.getElementById("email");
const fmt=x=>new Intl.NumberFormat("fa-IR").format(Number(x)||0)+" تومان";
const cell=(parent,key,value)=>{
 if(value===null||value===undefined||value==="")return;
 const wrap=document.createElement("dl");wrap.className="receipt-field";
 const dt=document.createElement("dt");dt.textContent=key;
 const dd=document.createElement("dd");dd.textContent=String(value);
 wrap.append(dt,dd);parent.append(wrap);
};
const row=(parent,title,value,klass)=>{
 const block=document.createElement("div");block.className="receipt-amount"+(klass?" "+klass:"");
 const a=document.createElement("span"),b=document.createElement("strong");a.textContent=title;b.textContent=value;
 block.append(a,b);parent.append(block);
};
function view(data){
 document.getElementById("stamp").textContent="پرداخت تأییدشده";
 document.getElementById("stamp").classList.add("verified");
 const invoice=data.invoice,c=invoice.customer||{},meta=document.getElementById("invoice-meta"),customer=document.getElementById("invoice-customer");
 cell(meta,"شماره رسید",invoice.invoice_number);
 cell(meta,"شناسه سفارش",invoice.order_number);
 cell(meta,"تاریخ تأیید پرداخت",invoice.receipt_date||"—");
 cell(meta,"وضعیت بانکی",invoice.payment_state==="paid"?"پرداخت تأییدشده":"در انتظار");
 cell(meta,"شناسه تراکنش",invoice.transaction_reference);
 cell(meta,"صادرکننده",invoice.business);
 cell(customer,"نام و نام خانوادگی",c.full_name);
 cell(customer,"شماره همراه",c.mobile);
 cell(customer,"ایمیل",c.email);
 if(c.address){
  cell(customer,"گیرنده",c.recipient_name||c.full_name);
  cell(customer,"استان / شهر",[c.province,c.city].filter(Boolean).join(" / "));
  cell(customer,"نشانی تحویل",c.address);
  cell(customer,"کد پستی",c.postal_code);
  cell(customer,"پلاک و واحد",c.building_unit);
 }
 const tbody=document.getElementById("invoice-items");
 for(const item of invoice.items||[]){
  const tr=document.createElement("tr");
  for(const v of [item.title,item.quantity,fmt(item.price),fmt(item.subtotal)]){
   const td=document.createElement("td");td.textContent=String(v??"");tr.append(td);
  }tbody.append(tr);
 }
 const totals=document.getElementById("invoice-totals");
 row(totals,"جمع اقلام",fmt(invoice.subtotal_toman));
 row(totals,"هزینه ارسال",fmt(invoice.shipping_toman));
 row(totals,"تخفیف",fmt(invoice.discount_toman));
 row(totals,"مبلغ پرداخت‌شده",fmt(invoice.total_toman),"total");
 const states={
  preparing_shipment:"در حال آماده‌سازی ارسال",shipped:"ارسال‌شده",delivered:"تحویل‌شده",
  awaiting_service_coordination:"در انتظار هماهنگی خدمت",scheduled:"زمان‌بندی‌شده",
  completed:"تکمیل‌شده",cancelled:"لغوشده",refunded:"بازپرداخت‌شده",awaiting_payment:"در انتظار پرداخت"
 };
 const fulfil=document.getElementById("invoice-fulfilment");
 cell(fulfil,"وضعیت سفارش",states[invoice.fulfilment_state]||invoice.fulfilment_state);
 cell(fulfil,"کد پیگیری مرسوله",invoice.tracking_code);
 mount.hidden=false;feedback.textContent="این رسید بر اساس پرداخت تأییدشده در سامانه سفارش‌ها صادر شده است.";
}
(async()=>{
 if(!/^[a-f0-9-]{36}$/i.test(order||"")){feedback.textContent="شناسه سفارش معتبر نیست.";return;}
 let token=fragment.get("access");
 if(token&&/^[a-f0-9]{64}$/.test(token)){
  try{sessionStorage.setItem("jr-receipt:"+order,token)}catch{}
  // Access token must not be inadvertently forwarded in browser URLs.
  history.replaceState(null,"",location.pathname+location.search);
 }else{
  try{token=sessionStorage.getItem("jr-receipt:"+order)}catch{}
 }
 if(!/^[a-f0-9]{64}$/.test(token||"")){
  feedback.textContent="کد دسترسی خصوصی این سفارش در این مرورگر یافت نشد. لینک خصوصی رسید را از ایمیل خرید باز کنید یا با پشتیبانی تماس بگیرید.";
  return;
 }
 try{
  const response=await fetch(API+"/commerce/receipt?order="+encodeURIComponent(order),{
   method:"GET",cache:"no-store",credentials:"omit",headers:{"Authorization":"Bearer "+token}
  });
  const data=await response.json();
  if(!response.ok||!data.ok)throw Error("not_authorised");
  if(data.payment_state!=="paid"||!data.invoice){
   feedback.textContent="رسید هنوز قابل صدور نیست؛ وضعیت پرداخت: "+String(data.payment_state||"نامشخص")+". در صورت برداشت وجه دوباره پرداخت نکنید.";
   return;
  }
  view(data);
  document.getElementById("tracking-link").href="/fa/shop/order/?order="+encodeURIComponent(order);
  print.disabled=false;print.addEventListener("click",()=>window.print());
  copy.disabled=false;copy.addEventListener("click",async()=>{
   const url=location.origin+location.pathname+"?order="+encodeURIComponent(order)+"#access="+encodeURIComponent(token);
   try{await navigator.clipboard.writeText(url);feedback.textContent="لینک خصوصی رسید کپی شد. آن را عمومی منتشر نکنید.";}
   catch{feedback.textContent="کپی خودکار در این مرورگر امکان‌پذیر نیست.";}
  });
  if(data.invoice.customer?.email){
   email.hidden=false;
   email.addEventListener("click",async()=>{
    email.disabled=true;
    try{
     const res=await fetch(API+"/commerce/receipt/resend",{method:"POST",credentials:"omit",
      headers:{"Content-Type":"application/json","Authorization":"Bearer "+token},body:JSON.stringify({order})});
     if(res.status===429)throw Error("email_cooldown");
     const result=await res.json();
     if(!res.ok||result.accepted_for_delivery!==true)throw Error("email_unavailable");
     feedback.textContent="درخواست ارسال مجدد به سرویس ایمیل پذیرفته شد. تحویل به صندوق دریافت ممکن است با تأخیر انجام شود.";
    }catch(error){feedback.textContent=error.message==="email_cooldown"?
      "برای جلوگیری از ارسال تکراری، بین دو درخواست ایمیل دست‌کم ۱۰ دقیقه فاصله لازم است.":
      "سرویس ارسال ایمیل در دسترس نیست؛ رسید را چاپ یا لینک خصوصی آن را نگهداری کنید.";}
    finally{email.disabled=false;}
   });
  }
 }catch{
  feedback.textContent="بازیابی رسید امن ممکن نشد. از صحت کد خصوصی مطمئن شوید و در صورت برداشت وجه، دوباره پرداخت نکنید.";
 }
})();
})();