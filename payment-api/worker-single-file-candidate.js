

const AMOUNT_RIAL = 100000;

const BITPAY = "https://bitpay.ir/payment";

const SITE_ORIGIN = "https://drjavadrezazadeh.com";



function json(data, status = 200) {

  return Response.json(data, {

    status,

    headers: {

      "Cache-Control": "no-store",

      "X-Content-Type-Options": "nosniff"

    }

  });

}



function escapeHtml(value) {

  return String(value).replace(/[&<>"']/g, (c) => ({

    "&": "&amp;",

    "<": "&lt;",

    ">": "&gt;",

    '"': "&quot;",

    "'": "&#39;"

  }[c]));

}



function allowedPaymentLink(link) {

  if (typeof link !== "string") return "";



  try {

    const u = new URL(link);



    if (

      u.origin !== SITE_ORIGIN ||

      u.pathname !== "/fa/shop/payment-start/" ||

      u.hash ||

      u.username ||

      u.password

    ) {

      return "";

    }



    const gateway = u.searchParams.get("gateway");



    if (

      [...u.searchParams.keys()].length !== 1 ||

      !gateway ||

      !/^https:\/\/bitpay\.ir\/payment\/gateway-[1-9]\d*-get$/.test(gateway)

    ) {

      return "";

    }



    return u.href;

  } catch {

    return "";

  }

}



function page(message, link = "", showCreate = false) {

  const safeLink = allowedPaymentLink(link);



  let action = "";



  if (safeLink) {

    action = `<a class="button" href="${escapeHtml(safeLink)}">

      ورود به درگاه بیت‌پی

    </a>`;

  } else if (showCreate) {

    action = `<form method="POST" action="/create">

      <button type="submit">

        ایجاد پرداخت ۱۰٬۰۰۰ تومان

      </button>

    </form>`;

  }



  return new Response(`<!doctype html>

<html lang="fa" dir="rtl">

<head>

<meta charset="utf-8">

<meta name="viewport"

      content="width=device-width,initial-scale=1">

<meta name="robots" content="noindex,nofollow">

<title>آزمون پرداخت | دکتر جواد رضازاده</title>

<style>

body {

  font-family: Tahoma,Arial,sans-serif;

  max-width: 520px;

  margin: 70px auto;

  padding: 24px;

  line-height: 2;

  color: #17253d;

}

button,a.button {

  display: inline-block;

  background: #174c92;

  color: white;

  border: 0;

  border-radius: 9px;

  padding: 12px 22px;

  text-decoration: none;

  cursor: pointer;

  font: inherit;

}

</style>

</head>

<body>

<h2>${escapeHtml(message)}</h2>

${action}

<p>

پرداخت فقط پس از تأیید در صفحه رسمی درگاه انجام می‌شود.

</p>

</body>

</html>`, {

    headers: {

      "Content-Type": "text/html; charset=utf-8",

      "Cache-Control": "no-store",

      "X-Content-Type-Options": "nosniff",

      "Referrer-Policy": "strict-origin-when-cross-origin",

      "Content-Security-Policy":

        "default-src 'none'; " +

        "style-src 'unsafe-inline'; " +

        "form-action 'self'; " +

        "base-uri 'none'"

    }

  });

}



async function postBitpay(url, data) {

  const response = await fetch(url, {

    method: "POST",

    headers: {

      "Content-Type":

        "application/x-www-form-urlencoded"

    },

    body: new URLSearchParams(data).toString(),

    redirect: "manual",

    signal: AbortSignal.timeout(15000)

  });



  if (!response.ok) {

    throw new Error("provider_http_error");

  }



  return (await response.text()).trim();

}




// --- Dynamic commerce routes; existing legacy payment routes remain below ---
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
const cors={"Access-Control-Allow-Origin":SITE,"Access-Control-Allow-Credentials":"true","Vary":"Origin","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"};
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

async function cryptKey(env){
 const raw=String(env.RECEIPT_ENCRYPTION_KEY||"");
 if(!raw)return null;
 if(!/^[a-f0-9]{64}$/i.test(raw))throw Error("invalid_receipt_encryption_key");
 return crypto.subtle.importKey("raw",new Uint8Array(raw.match(/../g).map(x=>parseInt(x,16))),"AES-GCM",false,["encrypt","decrypt"]);
}
async function wrapReceiptToken(token,order,env){
 const key=await cryptKey(env);if(!key)return null;
 const iv=crypto.getRandomValues(new Uint8Array(12));
 const cipher=new Uint8Array(await crypto.subtle.encrypt({name:"AES-GCM",iv,additionalData:new TextEncoder().encode(order)},key,new TextEncoder().encode(token)));
 return [...iv].map(b=>b.toString(16).padStart(2,"0")).join("")+":"+
  [...cipher].map(b=>b.toString(16).padStart(2,"0")).join("");
}
async function unwrapReceiptToken(wrapped,order,env){
 const key=await cryptKey(env);if(!key||!wrapped)return null;
 const [ivHex,dataHex]=wrapped.split(":");
 if(!/^[a-f0-9]{24}$/.test(ivHex||"")||!/^[a-f0-9]+$/.test(dataHex||""))throw Error("invalid_receipt_ciphertext");
 const bytes=hex=>new Uint8Array(hex.match(/../g).map(v=>parseInt(v,16)));
 return new TextDecoder().decode(await crypto.subtle.decrypt(
  {name:"AES-GCM",iv:bytes(ivHex),additionalData:new TextEncoder().encode(order)},key,bytes(dataHex)));
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


function jwtBytes(text){
 if(!/^[A-Za-z0-9_-]+$/.test(text))throw Error("invalid_jwt_encoding");
 const raw=text.replace(/-/g,"+").replace(/_/g,"/");
 const bytes=atob(raw.padEnd(Math.ceil(raw.length/4)*4,"="));
 return Uint8Array.from(bytes,c=>c.charCodeAt(0));
}
async function adminIdentity(request,env){
 const domain=String(env.CF_ACCESS_TEAM_DOMAIN||"").toLowerCase();
 const audience=String(env.CF_ACCESS_AUDIENCE||"");
 const allowed=String(env.COMMERCE_ADMIN_EMAILS||"").toLowerCase().split(",").map(x=>x.trim()).filter(Boolean);
 if(!/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(domain)||!audience||!allowed.length)return {error:"admin_access_unconfigured",status:503};
 const bearer=request.headers.get("Cf-Access-Jwt-Assertion")||"";
 const parts=bearer.split(".");
 if(parts.length!==3)return {error:"admin_not_authenticated",status:401};
 try{
  const head=JSON.parse(new TextDecoder().decode(jwtBytes(parts[0])));
  const body=JSON.parse(new TextDecoder().decode(jwtBytes(parts[1])));
  const now=Math.floor(Date.now()/1000);
  if(head.alg!=="RS256"||typeof head.kid!=="string"||head.kid.length>200)return {error:"admin_invalid_token",status:401};
  if(body.iss!=="https://"+domain||!(Array.isArray(body.aud)?body.aud.includes(audience):body.aud===audience)
   ||typeof body.exp!=="number"||body.exp<=now||typeof body.nbf==="number"&&body.nbf>now)
   return {error:"admin_invalid_claims",status:401};
  const response=await fetch("https://"+domain+"/cdn-cgi/access/certs",{cf:{cacheTtl:300},redirect:"error"});
  if(!response.ok)return {error:"admin_identity_unavailable",status:503};
  const set=await response.json(),jwk=(set.keys||[]).find(k=>k.kid===head.kid&&k.kty==="RSA");
  if(!jwk)return {error:"admin_unknown_key",status:401};
  const key=await crypto.subtle.importKey("jwk",jwk,{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["verify"]);
  const valid=await crypto.subtle.verify("RSASSA-PKCS1-v1_5",key,jwtBytes(parts[2]),new TextEncoder().encode(parts[0]+"."+parts[1]));
  if(!valid)return {error:"admin_invalid_signature",status:401};
  const email=String(body.email||"").trim().toLowerCase();
  if(!email||!allowed.includes(email))return {error:"admin_forbidden",status:403};
  return {email};
 }catch{return {error:"admin_invalid_token",status:401}}
}
const FULFILMENT_NEXT={
 preparing_shipment:["shipped","cancelled"],shipped:["delivered"],delivered:["completed"],
 awaiting_service_coordination:["scheduled","cancelled"],scheduled:["completed","cancelled"],
 cancelled:[],completed:[]
};
async function commerceAdmin(request,env,path,u,origin){
 const actor=await adminIdentity(request,env);
 if(actor.error)return fail(actor.error,actor.status);
 if(path==="/commerce/admin/orders"&&request.method==="GET"){
  const limit=Math.trunc(Math.min(100,Math.max(1,Number(u.searchParams.get("limit"))||30)));
  const result=await env.DB.prepare("SELECT id,amount_toman,items_json,customer_json,state,fulfilment_state,tracking_code,created_at,paid_at,provider_trans_id FROM commerce_orders ORDER BY created_at DESC LIMIT ?").bind(limit).all();
  const orders=(result.results||[]).map(o=>({...o,items:JSON.parse(o.items_json||"[]"),customer:JSON.parse(o.customer_json||"{}"),items_json:undefined,customer_json:undefined}));
  return reply({ok:true,orders});
 }
 if(path==="/commerce/admin/fulfilment"&&request.method==="POST"){
  if(!allowedOrigin(request))return fail("origin_forbidden",403);
  let b;try{b=await request.json()}catch{return fail("invalid_json")}
  if(!uuid(b?.order)||typeof b?.to!=="string")return fail("invalid_fulfilment_request");
  const order=await env.DB.prepare("SELECT state,fulfilment_state FROM commerce_orders WHERE id=?").bind(b.order).first();
  if(!order)return fail("order_not_found",404);
  if(order.state!=="paid")return fail("order_not_paid",409);
  if(!(FULFILMENT_NEXT[order.fulfilment_state]||[]).includes(b.to))return fail("invalid_fulfilment_transition",409);
  const tracking=field(b.tracking_code,90);
  if(b.to==="shipped"&&tracking.length<4)return fail("tracking_code_required");
  const changed=await env.DB.prepare("UPDATE commerce_orders SET fulfilment_state=?,tracking_code=CASE WHEN ? != '' THEN ? ELSE tracking_code END,updated_at=CURRENT_TIMESTAMP WHERE id=? AND state='paid' AND fulfilment_state=?").bind(b.to,tracking,tracking,b.order,order.fulfilment_state).run();
  if(changed.meta.changes!==1)return fail("order_state_conflict",409);
  // The actor is Access-verified; never accept browser-supplied roles or audit identity.
  await env.DB.prepare("INSERT INTO commerce_fulfilment_events(order_id,actor_email,previous_state,next_state,tracking_code) VALUES(?,?,?,?,?)").bind(b.order,actor.email,order.fulfilment_state,b.to,tracking||null).run();
  return reply({ok:true,order:b.order,state:b.to});
 }
 if(path==="/commerce/admin/refunds"&&request.method==="GET"){
  const results=await env.DB.prepare("SELECT id,order_id,reason,state,created_at,updated_at,reviewed_by FROM commerce_refund_requests ORDER BY created_at DESC LIMIT 100").all();
  return reply({ok:true,requests:results.results||[],note:"Refund requests are not evidence of money returned."});
 }
 if(path==="/commerce/admin/refunds/update"&&request.method==="POST"){
  if(!allowedOrigin(request))return fail("origin_forbidden",403);
  let input;try{input=await request.json()}catch{return fail("invalid_json")}
  const states={requested:["reviewing","declined"],reviewing:["approved_pending_disbursement","declined"]};
  if(!uuid(input?.request)||typeof input?.to!=="string")return fail("invalid_refund_request");
  const row=await env.DB.prepare("SELECT state FROM commerce_refund_requests WHERE id=?").bind(input.request).first();
  if(!row)return fail("refund_not_found",404);
  if(!(states[row.state]||[]).includes(input.to))return fail("invalid_refund_transition",409);
  const note=field(input.note,500);
  if(note.length<8)return fail("refund_review_note_required");
  const changed=await env.DB.prepare("UPDATE commerce_refund_requests SET state=?,reviewed_by=?,review_note=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND state=?")
   .bind(input.to,actor.email,note,input.request,row.state).run();
  return changed.meta.changes===1?reply({ok:true,state:input.to,money_returned:false}):fail("refund_concurrent_update",409);
 }
 if(path==="/commerce/admin/summary"&&request.method==="GET"){
  const rows=await env.DB.prepare("SELECT state,COUNT(*) AS orders,SUM(CASE WHEN state='paid' THEN amount_toman ELSE 0 END) AS total_toman FROM commerce_orders GROUP BY state").all();
  return reply({ok:true,groups:rows.results||[],currency:"IRT",note:"Gross verified sales only; refunds require separate confirmed reconciliation."});
 }
 return fail("admin_route_not_found",404);
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
async function commerce(request,env){
 const u=new URL(request.url),path=u.pathname;
 if(!path.startsWith("/commerce/"))return null;
 if(request.method==="OPTIONS"&&(["/commerce/create","/commerce/receipt","/commerce/receipt/resend","/commerce/refund/request","/commerce/admin/refunds/update","/commerce/admin/fulfilment","/commerce/admin/orders","/commerce/admin/summary"].includes(path)))
  return new Response(null,{status:204,headers:{...cors,"Access-Control-Allow-Methods":"POST,OPTIONS","Access-Control-Allow-Headers":"Content-Type,Authorization"}});
 if(!env.DB)return fail("database_unconfigured",503);
 if(path.startsWith("/commerce/admin/"))return commerceAdmin(request,env,path,u,origin);
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
  const fingerprint=await hashAccess(JSON.stringify({
   lines:lines.map(x=>[x.sku,x.quantity,x.price]).sort((a,b)=>a[0].localeCompare(b[0])),
   customer:validated.customer,amount_toman:total
  }));
  const existing=await env.DB.prepare("SELECT id,state,provider_id_get,amount_toman,request_fingerprint FROM commerce_orders WHERE idempotency_key=?").bind(idem).first();
  if(existing){
   if(existing.request_fingerprint!==fingerprint)return fail("idempotency_payload_mismatch",409);
   if(existing.state==="pending"&&existing.provider_id_get)return reply({ok:true,orderId:existing.id,totalToman:existing.amount_toman,currency:"IRT",
    paymentUrl:SITE+"/fa/shop/payment-start/?gateway="+encodeURIComponent(API+"gateway-"+existing.provider_id_get+"-get"),requiresExistingAccessToken:true});
   return fail("order_already_exists",409);
  }
  const accessToken=newAccessToken(),accessHash=await hashAccess(accessToken);
  const order=crypto.randomUUID(),factor=crypto.randomUUID().replace(/-/g,"").slice(0,28);
  const amount=total*mul;
  if(!Number.isSafeInteger(amount))return fail("provider_amount_overflow");
  let wrapped;try{wrapped=await wrapReceiptToken(accessToken,order,env)}catch{return fail("receipt_encryption_unavailable",503)}
  try{
   await env.DB.prepare("INSERT INTO commerce_orders(id,factor_id,amount_toman,provider_amount,currency,items_json,state,customer_json,receipt_token_sha256,idempotency_key,fulfilment_state,receipt_token_wrapped,request_fingerprint) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)")
    .bind(order,factor,total,amount,"IRT",JSON.stringify(lines),"created",JSON.stringify(validated.customer),accessHash,idem,"awaiting_payment",wrapped,fingerprint).run();
   const callback=SITE+"/fa/shop/payment-return/?order="+encodeURIComponent(order)+"&kind=commerce";
   const raw=await gateway("gateway-send",{amount:String(amount),redirect:callback,factorId:factor,description:"Order "+order},env.BITPAY_API_KEY);
   if(!num(raw)){await env.DB.prepare("UPDATE commerce_orders SET state='failed',updated_at=CURRENT_TIMESTAMP WHERE id=? AND state='created'").bind(order).run();return fail("gateway_rejected",502)}
   await env.DB.prepare("UPDATE commerce_orders SET state='pending',provider_id_get=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND state='created'").bind(raw,order).run();
   return reply({ok:true,orderId:order,receiptAccessToken:accessToken,totalToman:total,shippingToman:0,currency:"IRT",paymentUrl:SITE+"/fa/shop/payment-start/?gateway="+encodeURIComponent(API+"gateway-"+raw+"-get")});
  }catch{return fail("order_creation_failed",502)}
 }
 if(path==="/commerce/refund/request"&&request.method==="POST"){
  if(!allowedOrigin(request))return fail("origin_forbidden",403);
  if(!(request.headers.get("Content-Type")||"").startsWith("application/json"))return fail("content_type",415);
  let input;try{input=await request.json()}catch{return fail("invalid_json")}
  if(!uuid(input?.order))return fail("invalid_order");
  const row=await env.DB.prepare("SELECT * FROM commerce_orders WHERE id=?").bind(input.order).first();
  if(!await authorisedReceipt(request,row))return fail("order_not_authorised",403);
  if(row.state!=="paid")return fail("refund_requires_paid_order",409);
  const reason=field(input.reason,500);
  if(reason.length<20)return fail("refund_reason_too_short",400);
  const caseId=crypto.randomUUID();
  try{
   await env.DB.prepare("INSERT OR IGNORE INTO commerce_refund_requests(id,order_id,reason) VALUES(?,?,?)")
    .bind(caseId,input.order,reason).run();
   const result=await env.DB.prepare("SELECT id,state,created_at FROM commerce_refund_requests WHERE order_id=?").bind(input.order).first();
   return reply({ok:true,request:result,money_returned:false,notice:"A review request does not constitute a refund."});
  }catch{return fail("refund_request_unavailable",503)}
 }
 if(path==="/commerce/refund/status"&&request.method==="GET"){
  const order=u.searchParams.get("order");
  if(!uuid(order))return fail("invalid_order");
  const row=await env.DB.prepare("SELECT * FROM commerce_orders WHERE id=?").bind(order).first();
  if(!await authorisedReceipt(request,row))return fail("order_not_authorised",403);
  const refundCase=await env.DB.prepare("SELECT id,state,created_at,updated_at FROM commerce_refund_requests WHERE order_id=?").bind(order).first();
  return reply({ok:true,request:refundCase||null,money_returned:false});
 }
 if(path==="/commerce/order"&&request.method==="GET"){
  const id=u.searchParams.get("order");
  if(!uuid(id))return fail("invalid_order");
  const row=await env.DB.prepare("SELECT * FROM commerce_orders WHERE id=?").bind(id).first();
  if(!await authorisedReceipt(request,row))return fail("order_not_authorised",403);
  const customer=JSON.parse(row.customer_json||"{}");
  const order={
   id:row.id,created_at:row.created_at,payment_state:row.state,
   fulfilment_state:row.fulfilment_state||"awaiting_payment",
   paid_at:row.paid_at,items:JSON.parse(row.items_json||"[]"),
   amount_toman:row.amount_toman,shipping_toman:0,
   recipient_name:customer.recipient_name||customer.full_name||null,
   tracking_code:row.tracking_code||null,invoice_available:row.state==="paid",
   support_email:"dr.rezazadeh65@gmail.com",support_eitaa:"https://eitaa.com/DrRezazadeh65"
  };
  return reply({ok:true,order});
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
   // Verified provider event is the ONLY trigger for automated email. Failures never revert a paid transaction.
   if(row.receipt_token_wrapped&&env.RESEND_API_KEY&&env.INVOICE_FROM_EMAIL){
    try{
     const verifiedOrder=await env.DB.prepare("SELECT * FROM commerce_orders WHERE id=?").bind(order).first();
     const privateToken=await unwrapReceiptToken(row.receipt_token_wrapped,order,env);
     if(privateToken)await sendInvoiceEmail(verifiedOrder,privateToken,env);
    }catch{/* The customer may retry from the protected receipt page. */}
   }
   return returnPage("paid",order);
  }catch{return fail("verification_unavailable",502)}
 }
 return fail("not_found",404);
}


export default {

  async fetch(request, env) {
    const commerceResponse = await commerce(request, env);
    if (commerceResponse) return commerceResponse;

    const url = new URL(request.url);



    if (!env.DB || !env.BITPAY_API_KEY) {

      return json({

        error: "configuration_missing"

      }, 503);

    }



    if (

      url.pathname === "/health" &&

      request.method === "GET"

    ) {

      try {

        await env.DB.prepare(

          "SELECT COUNT(*) AS n FROM payment_orders"

        ).first();



        return json({

          status: "ok",

          database: "connected",

          bitpayKeyConfigured: true,

          livePayments: false,

          checkoutReady: true

        });

      } catch {

        return json({

          status: "database_error"

        }, 503);

      }

    }



    if (

      url.pathname === "/" &&

      request.method === "GET"

    ) {

      return page(

        "آزمون پرداخت ۱۰٬۰۰۰ تومانی",

        "",

        true

      );

    }



    if (

      url.pathname === "/create" &&

      request.method === "POST"

    ) {

      const origin = request.headers.get("Origin");



      const allowedOrigins = new Set([

        url.origin,

        SITE_ORIGIN

      ]);
// Temporary compatibility for Origin: null.
// Replace with stronger CSRF protection
// before production checkout is enabled.

      if (

        origin &&

        origin !== "null" &&

        !allowedOrigins.has(origin)

      ) {

        return json({

          error: "invalid_origin",

          receivedOrigin: origin,

          expectedOrigin: url.origin

        }, 403);

      }



      const id = crypto.randomUUID();



      const factorId = String(

        BigInt(Date.now()) * 1000n +

        BigInt(

          crypto.getRandomValues(

            new Uint16Array(1)

          )[0] % 1000

        )

      );



      try {

        await env.DB.prepare(`

          INSERT INTO payment_orders

          (id, factor_id, amount_rial, state)

          VALUES (?, ?, ?, 'created')

        `).bind(

          id,

          factorId,

          AMOUNT_RIAL

        ).run();



        const callback =

          `${SITE_ORIGIN}/fa/shop/payment-return/?order=${encodeURIComponent(id)}`;



        const result = await postBitpay(

          `${BITPAY}/gateway-send`,

          {

            api: env.BITPAY_API_KEY,

            amount: String(AMOUNT_RIAL),

            redirect: callback,

            factorId,

            description:

              "Payment test - 10000 toman"

          }

        );



        if (!/^[1-9]\d*$/.test(result)) {

          return json({

            error: "provider_create_rejected",

            providerCode: result.slice(0, 30)

          }, 502);

        }



        const saved = await env.DB.prepare(`

          UPDATE payment_orders

          SET state='pending',

              provider_id_get=?,

              updated_at=CURRENT_TIMESTAMP

          WHERE id=? AND state='created'

        `).bind(result, id).run();



        if (saved.meta.changes !== 1) {

          return json({

            error: "order_update_failed"

          }, 503);

        }



        const gateway =

          `${BITPAY}/gateway-${result}-get`;



        const paymentUrl =

          `${SITE_ORIGIN}/fa/shop/payment-start/?gateway=${encodeURIComponent(gateway)}`;



        return page(

          "سفارش ثبت شد؛ برای پرداخت وارد درگاه شوید.",

          paymentUrl

        );

      } catch {

        return json({

          error: "payment_creation_failed",

          orderId: id

        }, 502);

      }

    }



    if (

      url.pathname === "/callback" &&

      ["GET", "POST"].includes(request.method)

    ) {

      const orderId =

        url.searchParams.get("order");



      if (

        !orderId ||

        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId)

      ) {

        return page(

          "شناسه سفارش معتبر نیست."

        );

      }



      const order = await env.DB.prepare(

        "SELECT * FROM payment_orders WHERE id=?"

      ).bind(orderId).first();



      if (!order) {

        return page("سفارش پیدا نشد.");

      }



      if (order.state === "paid") {

        return page(

          "پرداخت قبلاً تأیید شده است."

        );

      }



      if (order.state !== "pending") {

        return page(

          "این سفارش آماده تأیید نیست."

        );

      }



      const params =

        new URLSearchParams(url.search);



      if (request.method === "POST") {

        const contentType =

          request.headers.get(

            "Content-Type"

          ) || "";



        if (

          !contentType.startsWith(

            "application/x-www-form-urlencoded"

          )

        ) {

          return page(

            "قالب پاسخ درگاه معتبر نیست."

          );

        }



        const form =

          await request.formData();



        for (const [key, value] of form) {

          if (typeof value === "string") {

            params.set(key, value);

          }

        }

      }



      const transId =

        params.get("trans_id");



      const idGet =

        params.get("id_get");



      if (

        !/^\d+$/.test(transId || "") ||

        idGet !== order.provider_id_get

      ) {

        return page(

          "پرداخت تأیید نشد."

        );

      }



      try {

        const raw = await postBitpay(

          `${BITPAY}/gateway-result-second`,

          {

            api: env.BITPAY_API_KEY,

            trans_id: transId,

            id_get: idGet,

            json: "1"

          }

        );



        let result;



        try {

          result = JSON.parse(raw);

        } catch {

          return page(

            "پاسخ تأیید درگاه قابل بررسی نیست."

          );

        }



        const status =

          String(result.status ?? "");



        const amount =

          Number(result.amount);



        const factorId =

          String(result.factorId ?? "");



        if (

          !["1", "11"].includes(status) ||

          amount !== order.amount_rial ||

          factorId !== order.factor_id

        ) {

          return page(

            "تأیید نهایی انجام نشد؛ مبلغی را دوباره پرداخت نکنید."

          );

        }



        const updated = await env.DB.prepare(`

          UPDATE payment_orders

          SET state='paid',

              provider_trans_id=?,

              paid_at=CURRENT_TIMESTAMP,

              updated_at=CURRENT_TIMESTAMP

          WHERE id=?

            AND state='pending'

            AND provider_id_get=?

        `).bind(

          transId,

          orderId,

          idGet

        ).run();



        return updated.meta.changes === 1

          ? page(

              "پرداخت با موفقیت تأیید و ثبت شد."

            )

          : page(

              "وضعیت سفارش نیازمند بررسی است."

            );

      } catch {

        return page(

          "استعلام پرداخت ناموفق بود؛ دوباره پرداخت نکنید."

        );

      }

    }



    return json({

      error: "not_found"

    }, 404);

  }

};