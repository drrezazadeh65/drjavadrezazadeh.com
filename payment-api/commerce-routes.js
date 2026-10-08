// Dynamic commerce module for EXISTING Cloudflare Worker (do not replace legacy routes).
// Integration: import {commerce} from "./commerce-routes.js"; at top of existing Worker,
// then inside fetch handler BEFORE legacy routing:
// const result = await commerce(request, env); if (result) return result;
// D1: run commerce-schema.sql; binding DB; secret BITPAY_API_KEY.
// Required env: BITPAY_AMOUNT_MULTIPLIER ("1" for toman, "10" for rial); confirm with provider first.
// Required env: COMMERCE_ENABLED="true" only after verified live small-value test.
// CATALOG_SOURCE is the owner's public GitHub main branch; prices are NEVER supplied by browser.
const SITE="https://drjavadrezazadeh.com";
const RAW="https://raw.githubusercontent.com/drrezazadeh65/drjavadrezazadeh.com/main/";
const API="https://bitpay.ir/payment/";
const cors={"Access-Control-Allow-Origin":SITE,"Vary":"Origin","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"};
const reply=(obj,status=200)=>Response.json(obj,{status,headers:cors});
const uuid=s=>/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(s||"");
const num=s=>/^[1-9][0-9]*$/.test(String(s||""));
const fail=(code,status=400)=>reply({ok:false,error:code},status);
const safeText=s=>String(s||"").replace(/[<>\r\n]/g," ").slice(0,150);

function normaliseDigits(value){return String(value??"").replace(/[۰-۹]/g,c=>String(c.charCodeAt(0)-1776)).replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-1632))}
function field(value,max=160){return String(value??"").replace(/[\u0000-\u001f\u007f<>]/g," ").trim().slice(0,max)}
function normalizeCustomer(input,shipping){
 if(!input||typeof input!=="object"||Array.isArray(input))return {error:"customer_required"};
 const name=field(input.full_name,90);
 const mobile=normaliseDigits(input.mobile).replace(/[\s()-]/g,"");
 const email=field(input.email,254).toLowerCase();
 if(name.length<3||name.length>90)return {error:"invalid_customer_name"};
 if(!/^\+?[0-9]{8,15}$/.test(mobile))return {error:"invalid_mobile"};
 if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return {error:"invalid_email"};
 if(input.terms_accepted!==true)return {error:"terms_not_accepted"};
 const customer={full_name:name,mobile,email};
 if(shipping){
  const province=field(input.province,90),city=field(input.city,90);
  const address=field(input.address,450),postal=normaliseDigits(input.postal_code).replace(/\s/g,"");
  if(province.length<2||city.length<2||address.length<10||!/^\d{10}$/.test(postal))return {error:"invalid_shipping_address"};
  Object.assign(customer,{province,city,address,postal_code:postal,building_unit:field(input.building_unit,90),recipient_name:field(input.recipient_name,90)||name,delivery_notes:field(input.delivery_notes,350)});
 }else{
  customer.coordination_notes=field(input.coordination_notes,350);
 }
 return {customer};
}
async function hashAccess(token){
 const bytes=new TextEncoder().encode(token);
 return [...new Uint8Array(await crypto.subtle.digest("SHA-256",bytes))].map(v=>v.toString(16).padStart(2,"0")).join("");
}
function newAccessToken(){
 const bytes=crypto.getRandomValues(new Uint8Array(32));
 return [...bytes].map(v=>v.toString(16).padStart(2,"0")).join("");
}
async function authorisedReceipt(request,row){
 const header=request.headers.get("Authorization")||"";
 const match=/^Bearer ([a-f0-9]{64})$/.exec(header);
 if(!match||!row?.receipt_token_sha256)return false;
 const digest=await hashAccess(match[1]);
 // Compare fixed-length hashes; the capability is random and never sent to the gateway.
 let mismatch=0;for(let i=0;i<64;i++)mismatch|=digest.charCodeAt(i)^row.receipt_token_sha256.charCodeAt(i);
 return mismatch===0;
}
function asReceipt(row){
 const customer=JSON.parse(row.customer_json||"{}"),items=JSON.parse(row.items_json||"[]");
 return {invoice_number:"JR-REC-"+row.id.replace(/-/g,"").toUpperCase(),
  order_number:row.id,receipt_date:row.paid_at,kind:"payment_receipt_not_tax_invoice",
  business:"Dr. Javad Rezazadeh Yazdeli",contact_email:"dr.rezazadeh65@gmail.com",
  contact_eitaa:"https://eitaa.com/DrRezazadeh65",
  customer,items,subtotal_toman:row.amount_toman,shipping_toman:0,discount_toman:0,
  total_toman:row.amount_toman,currency:"IRT",payment_state:row.state,
  fulfilment_state:row.fulfilment_state||"awaiting_payment",
  tracking_code:row.tracking_code||null,transaction_reference:row.provider_trans_id||null};
}
async function sendInvoiceEmail(row,token,env){
 if(!row?.customer_json||!env.RESEND_API_KEY||!env.INVOICE_FROM_EMAIL)return;
 const email=JSON.parse(row.customer_json).email;
 if(!email||row.receipt_email_sent_at)return;
 const link=SITE+"/fa/shop/invoice/?order="+encodeURIComponent(row.id)+"#access="+encodeURIComponent(token);
 const response=await fetch("https://api.resend.com/emails",{
  method:"POST",headers:{"Authorization":"Bearer "+env.RESEND_API_KEY,"Content-Type":"application/json"},
  body:JSON.stringify({from:env.INVOICE_FROM_EMAIL,to:[email],subject:"رسید پرداخت سفارش "+row.id,
   text:"پرداخت سفارش شما تأیید شد. این لینک خصوصی رسید شماست؛ آن را در اختیار دیگران قرار ندهید.\n"+link+"\nپشتیبانی: dr.rezazadeh65@gmail.com"})
 });
 if(!response.ok)throw Error("email_delivery_failed");
 await env.DB.prepare("UPDATE commerce_orders SET receipt_email_sent_at=CURRENT_TIMESTAMP WHERE id=? AND receipt_email_sent_at IS NULL").bind(row.id).run();
}

async function catalog(path){
 const res=await fetch(RAW+path,{headers:{"Accept":"application/json"},cf:{cacheTtl:0,cacheEverything:false},signal:AbortSignal.timeout(10000)});
 if(!res.ok)throw Error("catalog_unavailable");
 const data=await res.json();
 return data;
}
async function inventory(){
 const [books,services,vip]=await Promise.all([catalog("assets/data/book-catalog.json"),catalog("assets/data/service-catalog.json"),catalog("assets/data/vip-catalog.json")]);
 const items=new Map();
 for(const b of books.books||[]){
  const c=b.commerce||{};
  if(c.sellable===true&&c.inventory_state==="IN_STOCK"&&c.currency==="IRT"&&Number.isSafeInteger(c.price)&&c.price>0&&c.price<=1000000000&&/^[a-z0-9-]{1,60}$/.test(b.id))
   items.set("book:"+b.id,{sku:"book:"+b.id,title:safeText(b.title_fa),price:c.price,kind:"book"});
 }
 if(services.currency!=="IRT")throw Error("invalid_service_currency");
 for(const s of services.services||[]){
  if(s.sellable===true&&Number.isSafeInteger(s.price)&&s.price>0&&s.price<=1000000000&&/^[a-z0-9_\-]{1,70}$/.test(s.id))
   items.set("service:"+s.id,{sku:"service:"+s.id,title:safeText(s.title_fa),price:s.price,kind:"service"});
 }
 if(vip.currency!=="IRT")throw Error("invalid_vip_currency");
 for(const v of vip.services||[]){
  if(v.sellable===true&&v.checkout_enabled===true&&Number.isSafeInteger(v.price)&&v.price>0&&v.price<=1000000000&&/^[a-z0-9-]{1,70}$/.test(v.id))
   items.set("vip:"+v.id,{sku:"vip:"+v.id,title:safeText(v.title_fa),price:v.price,kind:"vip"});
 }
 return items;
}
async function gateway(endpoint,fields,secret){
 const body=new URLSearchParams({...fields,api:secret});
 const r=await fetch(API+endpoint,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:body.toString(),redirect:"manual",signal:AbortSignal.timeout(15000)});
 if(!r.ok)throw Error("gateway_http");
 return (await r.text()).trim();
}
function multiplier(env){const m=String(env.BITPAY_AMOUNT_MULTIPLIER||"");if(m!=="1"&&m!=="10")throw Error("payment_unit_unconfirmed");return Number(m)}
function allowedOrigin(req){return req.headers.get("Origin")===SITE}
function returnPage(state,id){const u=new URL(SITE+"/fa/shop/payment-result/");u.searchParams.set("state",state);u.searchParams.set("order",id);return Response.redirect(u.toString(),303)}
export async function commerce(request,env){
 const u=new URL(request.url),path=u.pathname;
 if(!path.startsWith("/commerce/"))return null;
 if(request.method==="OPTIONS"&&["/commerce/create","/commerce/receipt","/commerce/receipt/resend"].includes(path))
  return new Response(null,{status:204,headers:{...cors,"Access-Control-Allow-Methods":"POST,OPTIONS","Access-Control-Allow-Headers":"Content-Type,Authorization"}});
 if(!env.DB)return fail("database_unconfigured",503);
 if(path==="/commerce/health"&&request.method==="GET")
  return reply({ok:true,service:"commerce",checkout:env.COMMERCE_ENABLED==="true"});
 if(path==="/commerce/create"&&request.method==="POST"){
  if(!allowedOrigin(request))return fail("origin_forbidden",403);
  if(env.COMMERCE_ENABLED!=="true")return fail("checkout_disabled",503);
  if(!env.BITPAY_API_KEY)return fail("gateway_unconfigured",503);
  if(!(request.headers.get("Content-Type")||"").startsWith("application/json"))return fail("content_type",415);
  let input;try{input=await request.json()}catch{return fail("invalid_json")}
  if(!Array.isArray(input?.items)||input.items.length<1||input.items.length>20)return fail("invalid_items");
  const count=new Map();
  for(const x of input.items){
   if(!x||typeof x.sku!=="string"||!Number.isInteger(x.quantity)||x.quantity<1||x.quantity>20)return fail("invalid_item");
   count.set(x.sku,(count.get(x.sku)||0)+x.quantity);
  }
  if(count.size>20||[...count.values()].some(q=>q>20))return fail("invalid_quantity");
  let available,mul;try{[available,mul]=await Promise.all([inventory(),Promise.resolve(multiplier(env))])}catch{return fail("catalog_or_currency_unavailable",503)}
  const lines=[];let total=0;
  for(const [sku,quantity] of count){
   const item=available.get(sku);if(!item)return fail("unavailable_product",409);
   // Services are quantity-one appointments; capacity and terms must be confirmed separately.
   if(item.kind!=="book"&&quantity!==1)return fail("service_quantity_invalid");
   lines.push({...item,quantity,subtotal:item.price*quantity});
   total+=item.price*quantity;
  }
  if(!Number.isSafeInteger(total)||total<1000||total>1000000000)return fail("amount_out_of_range");
  // Physical books have owner-approved free delivery: zero customer shipping charges.
  // Services require agreed scope/capacity; no automatic charge until explicitly enabled.
  if(lines.some(x=>x.kind==="service")&&env.SERVICE_BOOKING_CONFIRMED!=="true")return fail("service_booking_not_configured",503);
  if(lines.some(x=>x.kind==="vip")&&env.VIP_BOOKING_CONFIRMED!=="true")return fail("vip_booking_not_configured",503);
  const validated=normalizeCustomer(input.customer,lines.some(x=>x.kind==="book"));
  if(validated.error)return fail(validated.error,400);
  const idem=String(input.idempotency_key||"");
  if(!uuid(idem))return fail("idempotency_key_required");
  const existing=await env.DB.prepare("SELECT id,state,provider_id_get,amount_toman FROM commerce_orders WHERE idempotency_key=?").bind(idem).first();
  if(existing){
   if(existing.state==="pending"&&existing.provider_id_get)return reply({ok:true,orderId:existing.id,totalToman:existing.amount_toman,currency:"IRT",
    paymentUrl:SITE+"/fa/shop/payment-start/?gateway="+encodeURIComponent(API+"gateway-"+existing.provider_id_get+"-get"),requiresExistingAccessToken:true});
   return fail("order_already_exists",409);
  }
  const accessToken=newAccessToken(),accessHash=await hashAccess(accessToken);
  const order=crypto.randomUUID(),factor=crypto.randomUUID().replace(/-/g,"").slice(0,28);
  const amount=total*mul;
  if(!Number.isSafeInteger(amount))return fail("provider_amount_overflow");
  try{
   await env.DB.prepare("INSERT INTO commerce_orders(id,factor_id,amount_toman,provider_amount,currency,items_json,state,customer_json,receipt_token_sha256,idempotency_key,fulfilment_state) VALUES(?,?,?,?,?,?,?,?,?,?,?)")
    .bind(order,factor,total,amount,"IRT",JSON.stringify(lines),"created",JSON.stringify(validated.customer),accessHash,idem,"awaiting_payment").run();
   const callback=SITE+"/fa/shop/payment-return/?order="+encodeURIComponent(order)+"&kind=commerce";
   const raw=await gateway("gateway-send",{amount:String(amount),redirect:callback,factorId:factor,description:"Order "+order},env.BITPAY_API_KEY);
   if(!num(raw)){await env.DB.prepare("UPDATE commerce_orders SET state='failed',updated_at=CURRENT_TIMESTAMP WHERE id=? AND state='created'").bind(order).run();return fail("gateway_rejected",502)}
   await env.DB.prepare("UPDATE commerce_orders SET state='pending',provider_id_get=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND state='created'").bind(raw,order).run();
   return reply({ok:true,orderId:order,receiptAccessToken:accessToken,totalToman:total,shippingToman:0,currency:"IRT",paymentUrl:SITE+"/fa/shop/payment-start/?gateway="+encodeURIComponent(API+"gateway-"+raw+"-get")});
  }catch{return fail("order_creation_failed",502)}
 }
 if(path==="/commerce/receipt"&&request.method==="GET"){
  const id=u.searchParams.get("order");
  if(!uuid(id))return fail("invalid_order");
  const row=await env.DB.prepare("SELECT * FROM commerce_orders WHERE id=?").bind(id).first();
  if(!await authorisedReceipt(request,row))return fail("receipt_not_authorised",403);
  if(row.state!=="paid")return reply({ok:true,payment_state:row.state,invoice:null});
  return reply({ok:true,payment_state:"paid",invoice:asReceipt(row)});
 }
 if(path==="/commerce/receipt/resend"&&request.method==="POST"){
  if(!allowedOrigin(request))return fail("origin_forbidden",403);
  let input;try{input=await request.json()}catch{return fail("invalid_json")}
  if(!uuid(input?.order))return fail("invalid_order");
  const row=await env.DB.prepare("SELECT * FROM commerce_orders WHERE id=?").bind(input.order).first();
  if(!await authorisedReceipt(request,row))return fail("receipt_not_authorised",403);
  if(row.state!=="paid")return fail("payment_not_verified",409);
  if(!env.RESEND_API_KEY||!env.INVOICE_FROM_EMAIL)return fail("email_not_configured",503);
  try{await sendInvoiceEmail(row,request.headers.get("Authorization").slice(7),env);return reply({ok:true,delivered:!!(row.receipt_email_sent_at||JSON.parse(row.customer_json).email)});}
  catch{return fail("email_delivery_unavailable",503)}
 }
 if(path==="/commerce/status"&&request.method==="GET"){
  const id=u.searchParams.get("order");if(!uuid(id))return fail("invalid_order");
  const row=await env.DB.prepare("SELECT state FROM commerce_orders WHERE id=?").bind(id).first();
  return row?reply({ok:true,state:row.state}):fail("order_not_found",404);
 }
 if(path==="/commerce/callback"&&["GET","POST"].includes(request.method)){
  const order=u.searchParams.get("order");if(!uuid(order))return fail("invalid_order");
  const row=await env.DB.prepare("SELECT * FROM commerce_orders WHERE id=?").bind(order).first();
  if(!row)return fail("order_not_found",404);
  if(row.state==="paid")return returnPage("paid",order);
  if(row.state!=="pending")return fail("order_not_pending",409);
  const params=new URLSearchParams(u.search);
  if(request.method==="POST"){
   if(!(request.headers.get("Content-Type")||"").startsWith("application/x-www-form-urlencoded"))return fail("content_type",415);
   for(const [k,v] of await request.formData())if(typeof v==="string")params.set(k,v);
  }
  const idGet=params.get("id_get"),trans=params.get("trans_id");
  if(idGet!==row.provider_id_get||!num(trans))return fail("callback_mismatch");
  if(!env.BITPAY_API_KEY)return fail("gateway_unconfigured",503);
  try{
   const raw=await gateway("gateway-result-second",{trans_id:trans,id_get:idGet,json:"1"},env.BITPAY_API_KEY);
   const data=JSON.parse(raw);
   // Fail closed: provider must return authenticated amount, order factor and success status.
   // Confirm these exact field names against the real provider verification response before enabling.
   if(!["1","11"].includes(String(data.status))||Number(data.amount)!==row.provider_amount||String(data.factorId)!==row.factor_id)
    return fail("verification_mismatch",409);
   const fulfil=JSON.parse(row.items_json).some(x=>x.kind==="book")?"preparing_shipment":"awaiting_service_coordination";
   const result=await env.DB.prepare("UPDATE commerce_orders SET state='paid',fulfilment_state=?,provider_trans_id=?,paid_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=? AND state='pending' AND provider_id_get=?")
    .bind(fulfil,trans,order,idGet).run();
   if(result.meta.changes!==1)return fail("concurrent_update",409);
   return returnPage("paid",order);
  }catch{return fail("verification_unavailable",502)}
 }
 return fail("not_found",404);
}
