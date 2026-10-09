// v4.4 safe route bundle. Integrate into the existing worker.js; preserve legacy payment routes.
// At top of worker.js: import { paymentRoutes } from "./payment-routes.js";
// At start of fetch(request,env): const handled=await paymentRoutes(request,env);if(handled)return handled;
// Cloudflare inline editor requires a proper multi-file/module deployment; do not paste this entire file over worker.js.
const commerceRoutes=(()=>{
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
 if(request.method==="OPTIONS"&&path==="/commerce/create")
  return new Response(null,{status:204,headers:{...cors,"Access-Control-Allow-Methods":"POST,OPTIONS","Access-Control-Allow-Headers":"Content-Type"}});
 if(!env.DB)return fail("database_unconfigured",503);
 if(path==="/commerce/health"&&request.method==="GET"){
  // A valid gateway unit is required for checkout to create a provider payment.
  const gatewayReady=env.COMMERCE_ENABLED==="true" && !!env.BITPAY_API_KEY &&
   ["1","10"].includes(String(env.BITPAY_AMOUNT_MULTIPLIER||"")) &&
   env.ORDER_EMAIL_FULFILMENT_CONFIRMED==="true";
  return reply({ok:true,service:"commerce",
   checkout:gatewayReady,
   capabilities:{
    services:gatewayReady && env.SERVICE_BOOKING_CONFIRMED==="true",
    vip:gatewayReady && env.VIP_BOOKING_CONFIRMED==="true",
    books:gatewayReady && env.BOOK_SHIPPING_CONFIRMED==="true"
   }});
 }
 if(path==="/commerce/create"&&request.method==="POST"){
  if(!allowedOrigin(request))return fail("origin_forbidden",403);
  if(env.COMMERCE_ENABLED!=="true")return fail("checkout_disabled",503);
  if(!env.BITPAY_API_KEY)return fail("gateway_unconfigured",503);
  // Never charge a customer until durable order-linked email receipts are operational.
  if(env.ORDER_EMAIL_FULFILMENT_CONFIRMED!=="true")return fail("order_email_not_configured",503);
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
  // Shipping is not priced yet: never collect money for physical books without explicit shipping rules.
  if(lines.some(x=>x.kind==="book")&&env.BOOK_SHIPPING_CONFIRMED!=="true")return fail("book_shipping_not_configured",503);
  // Services require agreed scope/capacity; no automatic charge until explicitly enabled.
  if(lines.some(x=>x.kind==="service")&&env.SERVICE_BOOKING_CONFIRMED!=="true")return fail("service_booking_not_configured",503);
  if(lines.some(x=>x.kind==="vip")&&env.VIP_BOOKING_CONFIRMED!=="true")return fail("vip_booking_not_configured",503);
  const order=crypto.randomUUID(),factor=crypto.randomUUID().replace(/-/g,"").slice(0,28);
  const amount=total*mul;
  if(!Number.isSafeInteger(amount))return fail("provider_amount_overflow");
  try{
   await env.DB.prepare("INSERT INTO commerce_orders(id,factor_id,amount_toman,provider_amount,currency,items_json,state) VALUES(?,?,?,?,?,?,?)")
    .bind(order,factor,total,amount,"IRT",JSON.stringify(lines),"created").run();
   const callback=SITE+"/fa/shop/payment-return/?order="+encodeURIComponent(order)+"&kind=commerce";
   const raw=await gateway("gateway-send",{amount:String(amount),redirect:callback,factorId:factor,description:"Order "+order},env.BITPAY_API_KEY);
   if(!num(raw)){await env.DB.prepare("UPDATE commerce_orders SET state='failed',updated_at=CURRENT_TIMESTAMP WHERE id=? AND state='created'").bind(order).run();return fail("gateway_rejected",502)}
   await env.DB.prepare("UPDATE commerce_orders SET state='pending',provider_id_get=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND state='created'").bind(raw,order).run();
   return reply({ok:true,orderId:order,totalToman:total,currency:"IRT",paymentUrl:SITE+"/fa/shop/payment-start/?gateway="+encodeURIComponent(API+"gateway-"+raw+"-get")});
  }catch{return fail("order_creation_failed",502)}
 }
 if(path==="/commerce/status"&&request.method==="GET"){
  const id=u.searchParams.get("order");if(!uuid(id))return fail("invalid_order");
  const row=await env.DB.prepare("SELECT state,amount_toman,currency,items_json,paid_at,provider_id_get,provider_trans_id FROM commerce_orders WHERE id=?").bind(id).first();
  if(!row)return fail("order_not_found",404);
  // A public order UUID is a bearer-like reference: NEVER expose buyer data here.
  // The printable payment receipt is released only after server-side settlement.
  if(row.state!=="paid")return reply({ok:true,state:row.state});
  if(!row.paid_at||!row.provider_id_get||!row.provider_trans_id||row.currency!=="IRT")
   return fail("receipt_not_verified",409);
  let items;try{items=JSON.parse(row.items_json)}catch{return fail("receipt_unavailable",503)}
  if(!Array.isArray(items)||!items.length||items.length>20)return fail("receipt_unavailable",503);
  let total=0;
  const lines=[];
  for(const x of items){
   if(!x||typeof x.sku!=="string"||typeof x.title!=="string"||
      !Number.isSafeInteger(x.price)||x.price<1||!Number.isSafeInteger(x.quantity)||
      x.quantity<1||x.quantity>20||x.subtotal!==x.price*x.quantity)
    return fail("receipt_unavailable",503);
   total+=x.subtotal;
   lines.push({sku:x.sku,title:safeText(x.title),quantity:x.quantity,unitToman:x.price,subtotalToman:x.subtotal});
  }
  if(!Number.isSafeInteger(total)||total!==row.amount_toman)return fail("receipt_amount_mismatch",409);
  return reply({ok:true,state:"paid",receipt:{orderId:id,currency:"IRT",amountToman:total,paidAt:String(row.paid_at),items:lines,kind:"payment_confirmation_not_tax_invoice"}});
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
   const result=await env.DB.prepare("UPDATE commerce_orders SET state='paid',provider_trans_id=?,paid_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=? AND state='pending' AND provider_id_get=?")
    .bind(trans,order,idGet).run();
   if(result.meta.changes!==1)return fail("concurrent_update",409);
   return returnPage("paid",order);
  }catch{return fail("verification_unavailable",502)}
 }
 return fail("not_found",404);
}

return commerce;
})();
const donationRoutes=(()=>{
// Optional module for the EXISTING Cloudflare Worker.
// Import { donations } from "./donation-routes.js"; call before legacy routing:
// const response=await donations(request,env); if(response)return response;
// Requires donation-schema.sql in bound D1 DB. Disabled unless DONATIONS_ENABLED=true.
// Never publish as live without confirming BitPay response contract and callback URL.
const SITE="https://drjavadrezazadeh.com";
const API="https://bitpay.ir/payment/";
const HEAD={"Access-Control-Allow-Origin":SITE,"Vary":"Origin","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"};
const reply=(x,s=200)=>Response.json(x,{status:s,headers:HEAD});
const err=(x,s=400)=>reply({ok:false,error:x},s);
const uuid=x=>/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(x||"");
const digits=x=>/^[1-9][0-9]*$/.test(String(x||""));
const ready=env=>env.DONATIONS_ENABLED==="true"&&!!env.DB&&!!env.BITPAY_API_KEY&&["1","10"].includes(String(env.BITPAY_AMOUNT_MULTIPLIER||""))&&env.DONATION_CALLBACK_VERIFIED==="true";
async function gateway(endpoint,fields,key){const r=await fetch(API+endpoint,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({...fields,api:key}),redirect:"manual",signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error("gateway_http");return(await r.text()).trim()}
const result=(state,id)=>{const u=new URL(SITE+"/fa/support-talented-students/");u.searchParams.set("payment",state);u.searchParams.set("order",id);return Response.redirect(u,303)};
async function donations(request,env){
 const u=new URL(request.url),path=u.pathname;
 if(!path.startsWith("/donations/"))return null;
 if(path==="/donations/health"&&request.method==="GET")return reply({ok:true,service:"donations",checkout:ready(env)});
 if(request.method==="OPTIONS"&&path==="/donations/create")return new Response(null,{status:204,headers:{...HEAD,"Access-Control-Allow-Methods":"POST,OPTIONS","Access-Control-Allow-Headers":"Content-Type"}});
 if(!ready(env))return err("donations_disabled",503);
 if(path==="/donations/create"&&request.method==="POST"){
  if(request.headers.get("Origin")!==SITE)return err("origin_forbidden",403);
  if(!(request.headers.get("Content-Type")||"").startsWith("application/json"))return err("content_type",415);
  let input;try{input=await request.json()}catch{return err("invalid_json")}
  const toman=input?.amountToman;
  if(!Number.isSafeInteger(toman)||toman<1000||toman>1000000000)return err("amount_out_of_range");
  const amount=toman*Number(env.BITPAY_AMOUNT_MULTIPLIER);
  if(!Number.isSafeInteger(amount))return err("provider_amount_overflow");
  const id=crypto.randomUUID(),factor=crypto.randomUUID().replace(/-/g,"").slice(0,28);
  try{
   await env.DB.prepare("INSERT INTO donation_orders(id,factor_id,amount_toman,provider_amount,currency,purpose,state) VALUES(?,?,?,?,?,?,?)").bind(id,factor,toman,amount,"IRT","talented_student_support","created").run();
   // Callback goes directly to the Worker; a static GitHub Pages URL cannot verify transactions.
   const callback=new URL(u.origin+"/donations/callback");callback.searchParams.set("order",id);
   const raw=await gateway("gateway-send",{amount:String(amount),redirect:callback.toString(),factorId:factor,description:"Educational support "+id},env.BITPAY_API_KEY);
   if(!digits(raw)){await env.DB.prepare("UPDATE donation_orders SET state='failed',updated_at=CURRENT_TIMESTAMP WHERE id=? AND state='created'").bind(id).run();return err("gateway_rejected",502)}
   await env.DB.prepare("UPDATE donation_orders SET state='pending',provider_id_get=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND state='created'").bind(raw,id).run();
   return reply({ok:true,orderId:id,amountToman:toman,paymentUrl:API+"gateway-"+raw+"-get"});
  }catch{return err("creation_failed",502)}
 }
 if(path==="/donations/status"&&request.method==="GET"){
  const id=u.searchParams.get("order");if(!uuid(id))return err("invalid_order");
  const row=await env.DB.prepare("SELECT state,amount_toman,currency,paid_at,provider_trans_id FROM donation_orders WHERE id=?").bind(id).first();
  if(!row)return err("not_found",404);
  if(row.state!=="paid")return reply({ok:true,state:row.state});
  if(!row.paid_at||!row.provider_trans_id)return err("receipt_unverified",409);
  return reply({ok:true,state:"paid",receipt:{orderId:id,amountToman:row.amount_toman,currency:row.currency,paidAt:row.paid_at,kind:"donation_acknowledgement_not_tax_invoice"}});
 }
 if(path==="/donations/callback"&&["GET","POST"].includes(request.method)){
  const id=u.searchParams.get("order");if(!uuid(id))return err("invalid_order");
  const row=await env.DB.prepare("SELECT * FROM donation_orders WHERE id=?").bind(id).first();
  if(!row)return err("not_found",404);
  if(row.state==="paid")return result("paid",id);
  if(row.state!=="pending")return err("not_pending",409);
  const params=new URLSearchParams(u.search);
  if(request.method==="POST"){
   if(!(request.headers.get("Content-Type")||"").startsWith("application/x-www-form-urlencoded"))return err("content_type",415);
   for(const [k,v] of await request.formData())if(typeof v==="string")params.set(k,v);
  }
  const idGet=params.get("id_get"),trans=params.get("trans_id");
  if(idGet!==row.provider_id_get||!digits(trans))return err("callback_mismatch",409);
  try{
   const verified=JSON.parse(await gateway("gateway-result-second",{trans_id:trans,id_get:idGet,json:"1"},env.BITPAY_API_KEY));
   // Deliberately fail closed: enable only after validating provider's actual verified response contract.
   if(!["1","11"].includes(String(verified.status))||Number(verified.amount)!==row.provider_amount||String(verified.factorId)!==row.factor_id)return err("verification_mismatch",409);
   const update=await env.DB.prepare("UPDATE donation_orders SET state='paid',provider_trans_id=?,paid_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=? AND state='pending' AND provider_id_get=?").bind(trans,id,idGet).run();
   if(update.meta.changes!==1)return err("concurrent_update",409);
   return result("paid",id);
  }catch{return err("verification_unavailable",502)}
 }
 return err("not_found",404);
}

return donations;
})();
export async function paymentRoutes(request,env){return await donationRoutes(request,env) || await commerceRoutes(request,env)}
