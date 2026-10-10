import { auth } from './auth-routes.js';


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
// --- Dynamic commerce routes; existing legacy payment routes remain below ---*
// Dynamic commerce module for EXISTING Cloudflare Worker (do not replace legacy routes).*
// Integration: import {commerce} from "./commerce-routes.js"; at top of existing Worker,*
// then inside fetch handler BEFORE legacy routing:*
// const result = await commerce(request, env); if (result) return result;*
// D1: run commerce-schema.sql; binding DB; secret BITPAY_API_KEY.*
// Required env: BITPAY_AMOUNT_MULTIPLIER ("1" for toman, "10" for rial); confirm with provider first.*
// Required env: COMMERCE_ENABLED="true" only after verified live small-value test.*
// CATALOG_SOURCE is the owner's public GitHub main branch; prices are NEVER supplied by browser.*

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

  if(s.sellable===true&&Number.isSafeInteger(s.price)&&s.price>0&&s.price<=1000000000&&/^[a-z0-9_\\-]{1,70}$/.test(s.id))

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

function commerceReady(env){return env.COMMERCE_ENABLED==="true"&&!!env.BITPAY_API_KEY&&["1","10"].includes(String(env.BITPAY_AMOUNT_MULTIPLIER||""))&&env.ORDER_EMAIL_FULFILMENT_CONFIRMED==="true"}
function commerceChannelReady(env,kind){
 if(kind==="book")return env.BOOK_SHIPPING_CONFIRMED==="true";
 if(kind==="service")return env.SERVICE_BOOKING_CONFIRMED==="true";
 if(kind==="vip")return env.VIP_BOOKING_CONFIRMED==="true";
 return false;
}
async function commerce(request,env){

 const u=new URL(request.url),path=u.pathname;

 if(!path.startsWith("/commerce/"))return null;

 if(request.method==="OPTIONS"&&path==="/commerce/create")

  return new Response(null,{status:204,headers:{...cors,"Access-Control-Allow-Methods":"POST,OPTIONS","Access-Control-Allow-Headers":"Content-Type"}});

 if(!env.DB)return fail("database_unconfigured",503);

 if(path==="/commerce/health"&&request.method==="GET")

  return reply({ok:true,service:"commerce",checkout:commerceReady(env),capabilities:{services:commerceReady(env)&&env.SERVICE_BOOKING_CONFIRMED==="true",vip:commerceReady(env)&&env.VIP_BOOKING_CONFIRMED==="true",books:commerceReady(env)&&env.BOOK_SHIPPING_CONFIRMED==="true"}});

 if(path==="/commerce/create"&&request.method==="POST"){

  if(!allowedOrigin(request))return fail("origin_forbidden",403);

  if(!commerceReady(env))return fail("checkout_disabled",503);

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

   const item=available.get(sku);
   if(!item)return fail("unavailable_product",409);
   if(!commerceChannelReady(env,item.kind))return fail("fulfilment_unconfirmed",503);
// Services are quantity-one appointments; capacity and terms must be confirmed separately.*

   if(item.kind!=="book"&&quantity!==1)return fail("service_quantity_invalid");

   lines.push({...item,quantity,subtotal:item.price*quantity});

   total+=item.price*quantity;

  }

  if(!Number.isSafeInteger(total)||total<1000||total>1000000000)return fail("amount_out_of_range");
// Shipping is not priced yet: never collect money for physical books without explicit shipping rules.*
// Book delivery is free to the buyer; the merchant bears shipping costs.*
// Shipping charge is always zero and excluded from the gateway amount.*
// Services require agreed scope/capacity; no automatic charge until explicitly enabled.*


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

  const row=await env.DB.prepare("SELECT state,amount_toman,currency,items_json,paid_at,provider_trans_id FROM commerce_orders WHERE id=?").bind(id).first();

  if(!row)return fail("order_not_found",404);
  if(row.state!=="paid")return reply({ok:true,state:row.state});
  if(!row.paid_at||!row.provider_trans_id||row.currency!=="IRT"||!Number.isSafeInteger(row.amount_toman)||row.amount_toman<1)
   return fail("receipt_unverified",409);

  let stored;try{stored=JSON.parse(row.items_json)}catch{return fail("receipt_unverified",409)}
  if(!Array.isArray(stored)||stored.length<1||stored.length>20)return fail("receipt_unverified",409);

  const receiptItems=[];let receiptTotal=0;
  for(const item of stored){
   if(!item||!["book","service","vip"].includes(item.kind)||typeof item.sku!=="string"||
      !/^(?:book|service|vip):[a-z0-9_-]{1,70}$/.test(item.sku)||typeof item.title!=="string"||
      item.title.length<1||item.title.length>150||!Number.isSafeInteger(item.price)||item.price<1||
      !Number.isSafeInteger(item.quantity)||item.quantity<1||item.quantity>20||
      !Number.isSafeInteger(item.subtotal)||item.subtotal!==item.price*item.quantity)
    return fail("receipt_unverified",409);
   receiptTotal+=item.subtotal;
   if(!Number.isSafeInteger(receiptTotal))return fail("receipt_unverified",409);
   receiptItems.push({sku:item.sku,kind:item.kind,title:safeText(item.title),quantity:item.quantity,unitToman:item.price,subtotalToman:item.subtotal});
  }
  if(receiptTotal!==row.amount_toman)return fail("receipt_unverified",409);

  return reply({ok:true,state:"paid",receipt:{orderId:id,currency:"IRT",amountToman:row.amount_toman,items:receiptItems,paidAt:row.paid_at}});

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
// Fail closed: provider must return authenticated amount, order factor and success status.*
// Confirm these exact field names against the real provider verification response before enabling.*

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


// Donation API: disabled by default, independent ledger and provider verification.
const donationHeaders={"Access-Control-Allow-Origin":SITE_ORIGIN,"Vary":"Origin","Cache-Control":"no-store"};
const donationReply=(data,status=200)=>Response.json(data,{status,headers:donationHeaders});
const donationError=(error,status=400)=>donationReply({ok:false,error},status);
const donationUUID=id=>/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id||"");
const donationDigits=v=>/^[1-9][0-9]*$/.test(String(v||""));
const donationReady=env=>env.DONATIONS_ENABLED==="true"&&env.DONATION_CALLBACK_VERIFIED==="true"&&!!env.DB&&!!env.BITPAY_API_KEY&&["1","10"].includes(String(env.BITPAY_AMOUNT_MULTIPLIER||""));
async function donations(request,env){
 const u=new URL(request.url),path=u.pathname;
 if(!path.startsWith("/donations/"))return null;
 if(path==="/donations/health"&&request.method==="GET")return donationReply({ok:true,service:"donations",checkout:donationReady(env)});
 if(path==="/donations/create"&&request.method==="OPTIONS")return new Response(null,{status:204,headers:{...donationHeaders,"Access-Control-Allow-Methods":"POST,OPTIONS","Access-Control-Allow-Headers":"Content-Type"}});
 if(!donationReady(env))return donationError("donations_disabled",503);
 if(path==="/donations/create"&&request.method==="POST"){
  if(request.headers.get("Origin")!==SITE_ORIGIN)return donationError("origin_forbidden",403);
  if(!(request.headers.get("Content-Type")||"").startsWith("application/json"))return donationError("content_type",415);
  let body;try{body=await request.json()}catch{return donationError("invalid_json")}
  const toman=body?.amountToman;
  if(!Number.isSafeInteger(toman)||toman<1000||toman>1000000000)return donationError("invalid_amount");
  const amount=toman*Number(env.BITPAY_AMOUNT_MULTIPLIER);
  if(!Number.isSafeInteger(amount))return donationError("amount_overflow");
  const id=crypto.randomUUID(),factor=crypto.randomUUID().replace(/-/g,"").slice(0,28);
  try{
   await env.DB.prepare("INSERT INTO donation_orders(id,factor_id,amount_toman,provider_amount,currency,purpose,state) VALUES(?,?,?,?,?,?,?)").bind(id,factor,toman,amount,"IRT","talented_student_support","created").run();
   const callback=new URL(u.origin+"/donations/callback");callback.searchParams.set("order",id);
   const raw=await postBitpay(BITPAY+"/gateway-send",{api:env.BITPAY_API_KEY,amount:String(amount),redirect:callback.toString(),factorId:factor,description:"Educational support "+id});
   if(!donationDigits(raw)){await env.DB.prepare("UPDATE donation_orders SET state='failed',updated_at=CURRENT_TIMESTAMP WHERE id=? AND state='created'").bind(id).run();return donationError("gateway_rejected",502)}
   await env.DB.prepare("UPDATE donation_orders SET state='pending',provider_id_get=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND state='created'").bind(raw,id).run();
   return donationReply({ok:true,orderId:id,amountToman:toman,paymentUrl:BITPAY+"/gateway-"+raw+"-get"});
  }catch{return donationError("creation_failed",502)}
 }
 if(path==="/donations/status"&&request.method==="GET"){
  const id=u.searchParams.get("order");if(!donationUUID(id))return donationError("invalid_order");
  const row=await env.DB.prepare("SELECT state,amount_toman,currency,paid_at,provider_trans_id FROM donation_orders WHERE id=?").bind(id).first();
  if(!row)return donationError("not_found",404);
  if(row.state!=="paid")return donationReply({ok:true,state:row.state});
  if(!row.paid_at||!row.provider_trans_id)return donationError("receipt_unverified",409);
  return donationReply({ok:true,state:"paid",receipt:{orderId:id,amountToman:row.amount_toman,currency:row.currency,paidAt:row.paid_at,kind:"donation_acknowledgement_not_tax_invoice"}});
 }
 if(path==="/donations/callback"&&["GET","POST"].includes(request.method)){
  const id=u.searchParams.get("order");if(!donationUUID(id))return donationError("invalid_order");
  const row=await env.DB.prepare("SELECT * FROM donation_orders WHERE id=?").bind(id).first();
  if(!row)return donationError("not_found",404);
  if(row.state==="paid")return donationReturn("paid",id);
  if(row.state!=="pending")return donationError("not_pending",409);
  const params=new URLSearchParams(u.search);
  if(request.method==="POST"){
   if(!(request.headers.get("Content-Type")||"").startsWith("application/x-www-form-urlencoded"))return donationError("content_type",415);
   for(const [k,v] of await request.formData())if(typeof v==="string")params.set(k,v);
  }
  const idGet=params.get("id_get"),trans=params.get("trans_id");
  if(idGet!==row.provider_id_get||!donationDigits(trans))return donationError("callback_mismatch",409);
  try{
   const verified=JSON.parse(await postBitpay(BITPAY+"/gateway-result-second",{api:env.BITPAY_API_KEY,trans_id:trans,id_get:idGet,json:"1"}));
   if(!["1","11"].includes(String(verified.status))||Number(verified.amount)!==row.provider_amount||String(verified.factorId)!==row.factor_id)return donationError("verification_mismatch",409);
   const update=await env.DB.prepare("UPDATE donation_orders SET state='paid',provider_trans_id=?,paid_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=? AND state='pending' AND provider_id_get=?").bind(trans,id,idGet).run();
   if(update.meta.changes!==1)return donationError("concurrent_update",409);
   return donationReturn("paid",id);
  }catch{return donationError("verification_unavailable",502)}
 }
 return donationError("not_found",404);
}
function donationReturn(state,id){const u=new URL(SITE_ORIGIN+"/fa/support-talented-students/");u.searchParams.set("payment",state);u.searchParams.set("order",id);return Response.redirect(u.toString(),303)}

export default {

  async fetch(request, env) {

    const donationResponse = await donations(request,env);
    if(donationResponse)return donationResponse;
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

          checkoutReady: env.LEGACY_PAYMENT_TEST_ENABLED === "true"

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

        env.LEGACY_PAYMENT_TEST_ENABLED === "true" ? "آزمون پرداخت ۱۰٬۰۰۰ تومانی" : "پرداخت آزمایشی غیرفعال است.",

        "",

        env.LEGACY_PAYMENT_TEST_ENABLED === "true"

      );

    }

    if (

      url.pathname === "/create" &&

      request.method === "POST"

    ) {

      if(env.LEGACY_PAYMENT_TEST_ENABLED!=="true")return json({error:"legacy_test_disabled"},503);
        const origin = request.headers.get("Origin");

      const allowedOrigins = new Set([

        url.origin,

        SITE_ORIGIN

      ]);
// Temporary compatibility for Origin: null.*
// Replace with stronger CSRF protection*
// before production checkout is enabled.*

      if (

        origin &&

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