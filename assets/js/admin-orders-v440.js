(()=>{"use strict";
const API="https://drjavadrezazadeh-payment.dr-rezazadeh65.workers.dev",states={
 preparing_shipment:["shipped","cancelled"],shipped:["delivered"],delivered:["completed"],
 awaiting_service_coordination:["scheduled","cancelled"],scheduled:["completed","cancelled"],
 cancelled:[],completed:[]
}, labels={preparing_shipment:"آماده‌سازی ارسال",shipped:"ارسال‌شده",delivered:"تحویل‌شده",completed:"تکمیل‌شده",awaiting_service_coordination:"در انتظار هماهنگی",scheduled:"زمان‌بندی‌شده",cancelled:"لغوشده",refunded:"بازپرداخت‌شده",awaiting_payment:"پرداخت‌نشده"};
const status=document.getElementById("admin-status"),ordersEl=document.getElementById("admin-orders"),stats=document.getElementById("admin-stats"),dashboard=document.getElementById("admin-dashboard"),refresh=document.getElementById("refresh");
const fmt=n=>new Intl.NumberFormat("fa-IR").format(Number(n||0))+" تومان";
const el=(parent,tag,txt,cls)=>{let n=document.createElement(tag);if(txt!==undefined)n.textContent=txt;if(cls)n.className=cls;parent.append(n);return n};
async function api(path,opts={}){
 const r=await fetch(API+path,{method:opts.method||"GET",credentials:"include",mode:"cors",cache:"no-store",
  headers:opts.body?{"Content-Type":"application/json"}:{},body:opts.body?JSON.stringify(opts.body):undefined});
 let data;try{data=await r.json()}catch{throw Error("non_json_response")}
 if(!r.ok)throw Error(data.error||"request_denied");
 return data;
}
function details(card,key,value){
 if(value===null||value===undefined||value==="")return;
 el(card,"p",key+": "+String(value));
}
function renderOrder(order){
 const o=el(ordersEl,"article",undefined,"admin-order"),c=order.customer||{},h=el(o,"h3","سفارش "+order.id);
 const detail=el(o,"div",undefined,"admin-detail");
 const a=el(detail,"div");details(a,"نام",c.full_name);details(a,"تلفن",c.mobile);details(a,"ایمیل",c.email);
 const b=el(detail,"div");details(b,"وضعیت پرداخت",order.state);details(b,"وضعیت اجرا",labels[order.fulfilment_state]||order.fulfilment_state);details(b,"مبلغ",fmt(order.amount_toman));
 const c2=el(detail,"div");details(c2,"زمان سفارش",order.created_at);details(c2,"کد رهگیری",order.tracking_code);
 if(c.address){const dest=el(o,"p");dest.textContent="نشانی تحویل: "+[c.province,c.city,c.address,c.postal_code].filter(Boolean).join("، ");}
 const list=el(o,"ul");for(const item of order.items||[]){const li=el(list,"li");li.textContent=item.title+" × "+item.quantity+" — "+fmt(item.subtotal);}
 if(order.state!=="paid")return;
 const valid=states[order.fulfilment_state]||[];
 if(!valid.length)return;
 const form=el(o,"form",undefined,"admin-form");
 const label=el(form,"label","انتقال وضعیت");const select=el(label,"select");
 for(const v of valid){const opt=el(select,"option",labels[v]||v);opt.value=v;}
 const trLabel=el(form,"label","کد پیگیری (برای وضعیت ارسال‌شده الزامی است)");
 const tr=el(trLabel,"input");tr.type="text";tr.maxLength=90;tr.value=order.tracking_code||"";
 const button=el(form,"button","ثبت تغییر وضعیت");button.type="submit";
 const feedback=el(form,"p","", "admin-feedback");feedback.setAttribute("aria-live","polite");
 form.addEventListener("submit",async e=>{
  e.preventDefault();if(select.value==="shipped"&&tr.value.trim().length<4){feedback.textContent="کد رهگیری الزامی است.";return;}
  if(!confirm("آیا تغییر وضعیت سفارش تأیید می‌شود؟"))return;
  button.disabled=true;feedback.textContent="در حال ثبت تغییر...";
  try{await api("/commerce/admin/fulfilment",{method:"POST",body:{order:order.id,to:select.value,tracking_code:tr.value.trim()}});feedback.textContent="تغییر ثبت شد.";await load();}
  catch(error){feedback.textContent="خطا: "+error.message;}finally{button.disabled=false;}
 });
}
async function load(){
 refresh.disabled=true;status.textContent="در حال اعتبارسنجی نشست مدیریتی...";
 try{
  const [orders,summary]=await Promise.all([api("/commerce/admin/orders?limit=30"),api("/commerce/admin/summary")]);
  dashboard.hidden=false;ordersEl.replaceChildren();stats.replaceChildren();
  for(const x of summary.groups||[]){
   const block=el(stats,"div",undefined,"admin-stat");el(block,"strong",x.state+" · "+x.orders+" سفارش");
   el(block,"p",fmt(x.total_toman||0));
  }
  for(const x of orders.orders||[])renderOrder(x);
  if(!orders.orders?.length)el(ordersEl,"p","سفارشی ثبت نشده است.");
  status.textContent="ورود مدیر با سرور تأیید شد؛ نتایج از پایگاه‌داده خوانده می‌شوند.";
 }catch(error){
  dashboard.hidden=true;ordersEl.replaceChildren();stats.replaceChildren();
  status.textContent="دسترسی سفارش‌ها برقرار نشد ("+error.message+"). اتصال Cloudflare Access و مجوز مدیریتی باید تأیید شوند؛ هیچ اطلاعات خصوصی نمایش داده نمی‌شود.";
 }finally{refresh.disabled=false;}
}
refresh.addEventListener("click",load);
load();
})();