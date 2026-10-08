import test from "node:test";
import assert from "node:assert/strict";
import {webcrypto} from "node:crypto";
globalThis.crypto ??= webcrypto;
import {commerce} from "../payment-api/commerce-routes.js";

const SITE="https://drjavadrezazadeh.com",BASE="https://drjavadrezazadeh-payment.dr-rezazadeh65.workers.dev";
const book={id:"roshanaei",title_fa:"سپید",commerce:{sellable:true,inventory_state:"IN_STOCK",currency:"IRT",price:2000000}};
const service={id:"academic_consult_60",title_fa:"مشاوره تخصصی تحصیلی",sellable:true,price:6000000};
const vip={id:"academic-direction",title_fa:"برنامه راهبری تحصیلی",sellable:true,checkout_enabled:true,price:50000000};
const buyer={full_name:"خریدار نمونه آزمون",mobile:"09121234567",email:"buyer@example.com",
 province:"تهران",city:"تهران",address:"خیابان نمونه، کوچه دوم، پلاک ۱۰",postal_code:"1234567890",
 terms_accepted:true};
const orders=new Map(),refunds=new Map();
let gatewayId=123456,verifyMismatch=false,callbackAttempts=0;
function db(){
 return {prepare(sql){let vals=[];
  return {bind(...args){vals=args;return this},
   async first(){
    if(sql.includes("FROM commerce_refund_requests")){
     if(sql.includes("WHERE order_id=?"))return [...refunds.values()].find(x=>x.order_id===vals[0])||null;
     if(sql.includes("WHERE id=?"))return refunds.get(vals[0])||null;
    }
    if(sql.includes("WHERE idempotency_key="))return [...orders.values()].find(x=>x.idempotency_key===vals[0])||null;
    if(sql.includes("WHERE id=?"))return orders.get(vals[0])||null;
    return null;
   },
   async run(){
    if(sql.startsWith("INSERT OR IGNORE INTO commerce_refund_requests")){
     const [id,order_id,reason]=vals;
     if(![...refunds.values()].some(x=>x.order_id===order_id))refunds.set(id,{id,order_id,reason,state:"requested",created_at:new Date().toISOString()});
     return {meta:{changes:1}};
    }
    if(sql.startsWith("INSERT INTO commerce_orders")){
     const [id,factor_id,amount_toman,provider_amount,currency,items_json,state,customer_json,receipt_token_sha256,idempotency_key,fulfilment_state,receipt_token_wrapped,request_fingerprint]=vals;
     assert.ok(![...orders.values()].some(x=>x.idempotency_key===idempotency_key),"unique idempotency");
     orders.set(id,{id,factor_id,amount_toman,provider_amount,currency,items_json,state,customer_json,receipt_token_sha256,idempotency_key,fulfilment_state,receipt_token_wrapped,request_fingerprint,provider_id_get:null,provider_trans_id:null,paid_at:null});
     return {meta:{changes:1}};
    }
    if(sql.includes("SET state='pending'")){
     const o=orders.get(vals[1]);o.state="pending";o.provider_id_get=vals[0];return {meta:{changes:1}};
    }
    if(sql.includes("SET state='failed'")){
     const o=orders.get(vals[0]);o.state="failed";return {meta:{changes:1}};
    }
    if(sql.includes("SET state='paid'")){
     const [fulfil,trans,id,idGet]=vals,o=orders.get(id);
     if(o.state!=="pending"||idGet!==o.provider_id_get)return {meta:{changes:0}};
     Object.assign(o,{state:"paid",fulfilment_state:fulfil,provider_trans_id:trans,paid_at:new Date().toISOString()});
     return {meta:{changes:1}};
    }
    if(sql.includes("receipt_email_sent_at"))return {meta:{changes:1}};
    throw new Error("Unexpected D1 SQL: "+sql);
   }
  };
 }};
}
const env={DB:db(),COMMERCE_ENABLED:"true",BITPAY_API_KEY:"test-secret-not-live",
 BITPAY_AMOUNT_MULTIPLIER:"10",SERVICE_BOOKING_CONFIRMED:"true",VIP_BOOKING_CONFIRMED:"true"};
globalThis.fetch=async (input,init={})=>{
 const u=String(input);
 if(u.endsWith("assets/data/book-catalog.json"))return Response.json({books:[book]});
 if(u.endsWith("assets/data/service-catalog.json"))return Response.json({currency:"IRT",services:[service]});
 if(u.endsWith("assets/data/vip-catalog.json"))return Response.json({currency:"IRT",services:[vip]});
 if(u.endsWith("/gateway-send"))return new Response(String(gatewayId++),{status:200});
 if(u.endsWith("/gateway-result-second")){
  callbackAttempts++;
  const form=new URLSearchParams(init.body),idGet=form.get("id_get");
  const order=[...orders.values()].find(o=>o.provider_id_get===idGet);
  return new Response(JSON.stringify({status:"1",amount:order.provider_amount,
    factorId:verifyMismatch?"wrong-factor":order.factor_id}),{status:200});
 }
 throw Error("Unexpected upstream call "+u);
};
async function call(path,{method="GET",body,origin,headers={}}={}){
 const opts={method,headers:{...headers}};
 if(origin)opts.headers.Origin=origin;
 if(body!==undefined){opts.body=JSON.stringify(body);opts.headers["Content-Type"]="application/json";}
 return commerce(new Request(BASE+path,opts),env);
}
test("rejects missing shipping data and terms before gateway",async()=>{
 const key=crypto.randomUUID();
 for(const c of [{...buyer,postal_code:"999"}, {...buyer,terms_accepted:false}]){
  const r=await call("/commerce/create",{method:"POST",origin:SITE,body:{items:[{sku:"book:roshanaei",quantity:1}],customer:c,idempotency_key:key}});
  assert.equal(r.status,400);
 }
 assert.equal(orders.size,0);
});
test("server-side price, secure receipt, idempotency, verified callback and free shipping",async()=>{
 const idempotency_key=crypto.randomUUID(),body={items:[{sku:"book:roshanaei",quantity:2}],customer:buyer,idempotency_key};
 const create=await call("/commerce/create",{method:"POST",origin:SITE,body});
 assert.equal(create.status,200);
 const data=await create.json();
 assert.equal(data.totalToman,4000000);assert.equal(data.shippingToman,0);
 assert.match(data.receiptAccessToken,/^[a-f0-9]{64}$/);
 const saved=orders.get(data.orderId);assert.equal(saved.provider_amount,40000000);
 assert.ok(!JSON.stringify(saved).includes(data.receiptAccessToken),"capability must not be stored in plaintext");
 const mismatched=await call("/commerce/create",{method:"POST",origin:SITE,body:{...body,customer:{...buyer,address:"Different address, number 22; must never inherit previous order"}}});
 assert.equal(mismatched.status,409);
 assert.equal((await mismatched.json()).error,"idempotency_payload_mismatch");
 const again=await call("/commerce/create",{method:"POST",origin:SITE,body});
 assert.equal(again.status,200);assert.equal((await again.json()).requiresExistingAccessToken,true);
 const deniedOrder=await call("/commerce/order?order="+data.orderId);
 assert.equal(deniedOrder.status,403,"private tracking denies missing capability");
 const trackingBefore=await call("/commerce/order?order="+data.orderId,{headers:{Authorization:"Bearer "+data.receiptAccessToken}});
 assert.equal(trackingBefore.status,200);assert.equal((await trackingBefore.json()).order.payment_state,"pending");
 const noToken=await call("/commerce/receipt?order="+data.orderId);
 assert.equal(noToken.status,403);
 const before=await call("/commerce/receipt?order="+data.orderId,{headers:{Authorization:"Bearer "+data.receiptAccessToken}});
 assert.equal((await before.json()).invoice,null);
 const cannotRefund=await call("/commerce/refund/request",{method:"POST",origin:SITE,headers:{Authorization:"Bearer "+data.receiptAccessToken},body:{order:data.orderId,reason:"Test refund request before bank verification"}});
 assert.equal(cannotRefund.status,409);
 const cb=await call("/commerce/callback?order="+data.orderId+"&id_get="+saved.provider_id_get+"&trans_id=77777");
 assert.equal(cb.status,303);assert.match(cb.headers.get("Location"),/state=paid/);
 const receipt=await call("/commerce/receipt?order="+data.orderId,{headers:{Authorization:"Bearer "+data.receiptAccessToken}});
 assert.equal(receipt.status,200);
 const d=(await receipt.json()).invoice;
 assert.equal(d.payment_state,"paid");assert.equal(d.total_toman,4000000);
 assert.equal(d.shipping_toman,0);assert.equal(d.customer.postal_code,buyer.postal_code);
 assert.equal(d.fulfilment_state,"preparing_shipment");assert.match(d.invoice_number,/^JR-REC-/);
 const tracked=await call("/commerce/order?order="+data.orderId,{headers:{Authorization:"Bearer "+data.receiptAccessToken}});
 const view=(await tracked.json()).order;
 assert.equal(view.payment_state,"paid");assert.equal(view.invoice_available,true);
 assert.equal(view.fulfilment_state,"preparing_shipment");assert.equal(view.amount_toman,4000000);
 const refundBody={order:data.orderId,reason:"Physical delivery could not be coordinated; request a manual review."};
 const requested=await call("/commerce/refund/request",{method:"POST",origin:SITE,headers:{Authorization:"Bearer "+data.receiptAccessToken},body:refundBody});
 assert.equal(requested.status,200);
 const requestData=await requested.json();assert.equal(requestData.money_returned,false);
 const againRefund=await call("/commerce/refund/request",{method:"POST",origin:SITE,headers:{Authorization:"Bearer "+data.receiptAccessToken},body:refundBody});
 assert.equal((await againRefund.json()).request.id,requestData.request.id,"review request is idempotent");
 const protectedStatus=await call("/commerce/refund/status?order="+data.orderId);
 assert.equal(protectedStatus.status,403);
 const checked=await call("/commerce/refund/status?order="+data.orderId,{headers:{Authorization:"Bearer "+data.receiptAccessToken}});
 assert.equal((await checked.json()).request.state,"requested");
 const replay=await call("/commerce/callback?order="+data.orderId+"&id_get="+saved.provider_id_get+"&trans_id=77777");
 assert.equal(replay.status,303);assert.equal(callbackAttempts,1,"no duplicate verification");
});
test("rejects forged provider factor and does not mark order as paid",async()=>{
 const create=await call("/commerce/create",{method:"POST",origin:SITE,body:{
  items:[{sku:"service:academic_consult_60",quantity:1}],
  customer:{full_name:"Test Buyer",mobile:"09121234567",terms_accepted:true},
  idempotency_key:crypto.randomUUID()
 }});
 assert.equal(create.status,200);
 const order=(await create.json()).orderId,saved=orders.get(order);
 verifyMismatch=true;
 const r=await call("/commerce/callback?order="+order+"&id_get="+saved.provider_id_get+"&trans_id=9999");
 verifyMismatch=false;
 assert.equal(r.status,409);assert.equal(orders.get(order).state,"pending");
});
test("rejects cross-origin and invalid service quantities",async()=>{
 const invalid=await call("/commerce/create",{method:"POST",origin:"https://untrusted.example",body:{items:[]}});
 assert.equal(invalid.status,403);
 const invalidQty=await call("/commerce/create",{method:"POST",origin:SITE,body:{
  items:[{sku:"service:academic_consult_60",quantity:2}],customer:buyer,idempotency_key:crypto.randomUUID()}});
 assert.equal(invalidQty.status,400);
});