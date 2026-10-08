/* v4.4.0-alpha: privacy-aware, server-priced unified checkout.
 * Client totals are previews. A successful redirect is NOT payment confirmation. */
(()=>{"use strict";
const API="https://drjavadrezazadeh-payment.dr-rezazadeh65.workers.dev";
const CART_KEY="jr-book-cart-v1";
const box=document.querySelector("[data-book-checkout]");
if(!box)return;
const fa=document.documentElement.lang!=="en";
const t=(f,e)=>fa?f:e;
const money=n=>new Intl.NumberFormat(fa?"fa-IR":"en-US").format(n)+t(" تومان"," toman");
const put=(parent,tag,cls,value)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(value!==undefined)el.textContent=value;parent.append(el);return el};
const inputs=[
  {key:"full_name",fa:"نام و نام خانوادگی",en:"Full name",required:true,max:90,auto:"name"},
  {key:"mobile",fa:"شماره همراه",en:"Mobile phone",required:true,max:22,auto:"tel",type:"tel"},
  {key:"email",fa:"ایمیل (اختیاری)",en:"Email (optional)",max:254,auto:"email",type:"email"},
  {key:"province",fa:"استان",en:"Province",shipping:true,required:true,max:90,auto:"address-level1"},
  {key:"city",fa:"شهر",en:"City",shipping:true,required:true,max:90,auto:"address-level2"},
  {key:"address",fa:"نشانی کامل پستی",en:"Complete postal address",shipping:true,required:true,max:450,auto:"street-address"},
  {key:"postal_code",fa:"کد پستی ۱۰ رقمی",en:"10-digit postal code",shipping:true,required:true,max:12,auto:"postal-code"},
  {key:"building_unit",fa:"پلاک، طبقه و واحد (در صورت نیاز)",en:"Building, floor and unit",shipping:true,max:90},
  {key:"recipient_name",fa:"نام گیرنده، اگر متفاوت است",en:"Recipient if different",shipping:true,max:90},
  {key:"delivery_notes",fa:"توضیحات تحویل (اختیاری)",en:"Delivery notes (optional)",shipping:true,max:350},
  {key:"coordination_notes",fa:"موضوع و ترجیح زمانی هماهنگی (اختیاری)",en:"Coordination details (optional)",service:true,max:350}
];
let currentIdempotency;
function fail(msg){let s=box.querySelector("[data-checkout-status]");if(s)s.textContent=msg;}
function safeCart(){
 try{
  const parsed=JSON.parse(localStorage.getItem(CART_KEY)||"[]");
  if(!Array.isArray(parsed)||parsed.length>20)return [];
  return parsed.filter(x=>x&&typeof x.book_id==="string"&&Number.isInteger(x.quantity)&&x.quantity>=1&&x.quantity<=20);
 }catch{return []}
}
async function getItems(){
 const sku=new URLSearchParams(location.search).get("sku");
 if(sku){
  if(!/^(service|vip):[a-z0-9_-]{1,70}$/.test(sku))throw Error("invalid_sku");
  const [kind,id]=sku.split(":");
  const url=kind==="service"?"/assets/data/service-catalog.json":"/assets/data/vip-catalog.json";
  const r=await fetch(url,{cache:"no-store"});if(!r.ok)throw Error("catalog_unavailable");
  const cat=await r.json(),item=cat.services.find(x=>x.id===id);
  if(!item||item.sellable!==true||(kind==="vip"&&item.checkout_enabled!==true))throw Error("not_sellable");
  return [{sku,quantity:1,title:item.title_fa,price:item.price,kind}];
 }
 const cart=safeCart();if(!cart.length)throw Error("empty_cart");
 const response=await fetch("/assets/data/book-catalog.json",{cache:"no-store"});
 if(!response.ok)throw Error("book_catalog_unavailable");
 const data=await response.json();
 const result=cart.map(x=>{let b=data.books.find(b=>b.id===x.book_id);return b&&b.commerce?.sellable===true&&b.commerce.inventory_state==="IN_STOCK"?
  {sku:"book:"+b.id,quantity:x.quantity,title:b.title_fa,price:b.commerce.price,kind:"book"}:null});
 if(result.some(x=>!x))throw Error("book_unavailable");
 return result;
}
function draw(items){
 const shipping=items.some(x=>x.kind==="book");
 box.replaceChildren();
 put(box,"p","kicker",t("تسویه امن · نسخه ۴.۴","Secure checkout · v4.4"));
 put(box,"h1","",t("مشخصات سفارش و خریدار","Order and customer details"));
 put(box,"p","lead",t("پیش از ورود به درگاه، مشخصات را بررسی کنید. قیمت نهایی در سرور محاسبه می‌شود؛ نتیجه پرداخت فقط بعد از تأیید درگاه معتبر است.","Review the details before payment. Final pricing is server-authoritative; a redirect alone does not confirm payment."));
 const summary=put(box,"section","commerce-order-summary");
 put(summary,"h2","",t("خلاصه سفارش","Order summary"));
 let total=0;
 for(const item of items){
  let price=item.price*item.quantity;total+=price;
  const p=put(summary,"p","commerce-line");
  put(p,"span","",item.title+" × "+item.quantity);
  put(p,"strong","",money(price));
 }
 const ship=put(summary,"p","commerce-line");
 put(ship,"span","",t("ارسال کتاب (بر عهده فروشگاه)","Book shipping (paid by store)"));
 put(ship,"strong","",money(0));
 const sum=put(summary,"p","commerce-line commerce-total");
 put(sum,"span","",t("جمع پیش از تأیید سرور","Estimated total"));
 put(sum,"strong","",money(total));
 const form=put(box,"form","commerce-customer-form");
 form.noValidate=false;
 put(form,"h2","",shipping?t("مشخصات خریدار و نشانی تحویل","Buyer and delivery address"):t("مشخصات خریدار و هماهنگی خدمت","Buyer and service coordination"));
 for(const meta of inputs){
  if(meta.shipping&&!shipping||meta.service&&shipping)continue;
  const label=put(form,"label","commerce-field");
  const caption=put(label,"span","",t(meta.fa,meta.en));
  const field=(meta.key==="address"||meta.key.endsWith("notes"))?document.createElement("textarea"):document.createElement("input");
  if(field.tagName==="INPUT")field.type=meta.type||"text";
  field.name=meta.key;field.required=Boolean(meta.required);field.maxLength=meta.max||160;field.autocomplete=meta.auto||"off";
  if(meta.key==="postal_code"){field.inputMode="numeric";field.pattern="[0-9۰-۹٠-٩]{10}";}
  if(meta.key==="mobile")field.inputMode="tel";
  if(meta.key==="address")field.rows=3;
  label.append(field);caption.setAttribute("id","label-"+meta.key);field.setAttribute("aria-labelledby","label-"+meta.key);
 }
 const consent=put(form,"label","commerce-consent");
 const checkbox=document.createElement("input");checkbox.type="checkbox";checkbox.required=true;checkbox.name="terms_accepted";consent.append(checkbox);
 put(consent,"span","",t("اطلاعات خود و سفارش را تأیید می‌کنم و شرایط خرید، ارسال و حریم خصوصی سایت را می‌پذیرم.","I confirm the order details and accept the purchase, delivery, and privacy terms."));
 const policies=put(form,"p","commerce-policies");
 const links=[[(fa?"/fa/shop/policies/":"/en/shop/policies/"),t("شرایط خرید، ارسال و بازپرداخت","Purchase, delivery and refunds")],["/terms/",t("شرایط عمومی سایت","General terms")],["/privacy/",t("حریم خصوصی","Privacy")]];
 for(const [href,label] of links){const a=put(policies,"a","",label);a.href=href;policies.append(" · ");}
 const button=put(form,"button","button primary commerce-submit",t("تأیید و ورود به پرداخت امن","Confirm and pay securely"));
 button.type="submit";
 const feedback=put(form,"p","commerce-feedback");feedback.dataset.checkoutStatus="";feedback.setAttribute("role","status");feedback.setAttribute("aria-live","polite");
 put(form,"p","commerce-support",t("برای پیگیری: dr.rezazadeh65@gmail.com | ایتا: @DrRezazadeh65","Support: dr.rezazadeh65@gmail.com | Eitaa: @DrRezazadeh65"));
 const back=put(box,"p","");const a=put(back,"a","",t("بازگشت به سبد یا فروشگاه","Back to cart or shop"));
 a.href=shipping?(fa?"/fa/shop/cart/":"/en/shop/cart/"):(fa?"/fa/services/":"/en/services/");
 form.addEventListener("submit",async e=>{
  e.preventDefault();
  if(!form.reportValidity())return;
  const data=new FormData(form),customer=Object.fromEntries(inputs.filter(x=>!(x.shipping&&!shipping||x.service&&shipping)).map(x=>[x.key,String(data.get(x.key)||"").trim()]));
  customer.terms_accepted=checkbox.checked;
  if(!currentIdempotency)currentIdempotency=crypto.randomUUID();
  button.disabled=true;fail(t("در حال ایجاد امن سفارش...","Creating order securely..."));
  try{
   const response=await fetch(API+"/commerce/create",{method:"POST",mode:"cors",credentials:"omit",
    headers:{"Content-Type":"application/json"},body:JSON.stringify({items:items.map(x=>({sku:x.sku,quantity:x.quantity})),customer,idempotency_key:currentIdempotency})});
   const result=await response.json();
   if(!response.ok||result.ok!==true)throw Error(result.error||"order_creation_failed");
   if(!/^[0-9a-f-]{36}$/i.test(result.orderId))throw Error("order_id_invalid");
   if(result.receiptAccessToken&&/^[a-f0-9]{64}$/.test(result.receiptAccessToken)){
    sessionStorage.setItem("jr-receipt:"+result.orderId,result.receiptAccessToken);
   }else if(!sessionStorage.getItem("jr-receipt:"+result.orderId)){throw Error("receipt_access_unavailable");}
   const link=new URL(result.paymentUrl);
   if(link.origin!==location.origin||link.pathname!=="/fa/shop/payment-start/"||link.searchParams.size!==1||!link.searchParams.has("gateway"))
    throw Error("unsafe_gateway_link");
   fail(t("سفارش ایجاد شد؛ در حال انتقال امن...","Order created; proceeding to payment..."));
   location.assign(link.href);
  }catch(error){
   const descriptions={
    checkout_disabled:t("درگاه هنوز آماده پذیرش سفارش نیست؛ وجهی برداشت نشده است.","Checkout is unavailable; no money has been taken."),
    invalid_shipping_address:t("لطفاً کد پستی، استان، شهر و نشانی را اصلاح کنید.","Check postcode and delivery address."),
    gateway_unconfigured:t("اتصال درگاه تکمیل نشده است؛ وجهی برداشت نشده است.","Gateway is not configured; no payment was taken."),
    order_already_exists:t("درخواست قبلاً ثبت شده است. از پرداخت دوباره خودداری و با پشتیبانی تماس بگیرید.","An order already exists; do not pay again. Contact support.")
   };
   fail(descriptions[error.message]||t("ثبت سفارش تکمیل نشد. در صورت برداشت وجه، دوباره پرداخت نکنید و با پشتیبانی تماس بگیرید.","Order was not completed. If charged, do not pay again; contact support."));
   button.disabled=false;
  }
 });
}
getItems().then(draw).catch(()=>{box.replaceChildren();put(box,"h1","",t("انتخاب معتبری یافت نشد","No valid selection"));const link=put(box,"a","",t("بازگشت به فروشگاه","Return to shop"));link.href="/fa/shop/";});
})();