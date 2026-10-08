// VIP payment API v1 — deploy to Cloudflare Worker only after D1 migration.
// This module deliberately does not reuse the fixed 10,000-toman test checkout.
// Required env: DB (D1 binding), BITPAY_API_KEY (secret).
const SITE = "https://drjavadrezazadeh.com";
const GATEWAY = "https://bitpay.ir/payment";
const PRODUCTS = Object.freeze({
  "academic-direction":240000000,
  "university-selection":360000000,
  "golden-talent-signature":600000000,
  "research-publication":480000000,
  "educator-development":360000000,
  "institutional-advisory":900000000
});
const cors = {"Access-Control-Allow-Origin":SITE,"Vary":"Origin","Cache-Control":"no-store"};
const json=(x,status=200)=>Response.json(x,{status,headers:{...cors,"X-Content-Type-Options":"nosniff"}});
const validId=s=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s||"");
async function post(path,data,api){
 const res=await fetch(GATEWAY+path,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({...data,api}).toString(),redirect:"manual",signal:AbortSignal.timeout(15000)});
 if(!res.ok)throw new Error("gateway_http");
 return (await res.text()).trim();
}
export default {async fetch(request,env){
 const url=new URL(request.url);
 if(request.method==="OPTIONS"&&url.pathname==="/vip/create")return new Response(null,{status:204,headers:{...cors,"Access-Control-Allow-Methods":"POST,OPTIONS","Access-Control-Allow-Headers":"Content-Type"}});
 if(!env.DB||!env.BITPAY_API_KEY)return json({error:"unconfigured"},503);
 if(url.pathname==="/vip/create"&&request.method==="POST"){
  // Reject opaque origins; browser clients must originate from the canonical site.
  if(request.headers.get("Origin")!==SITE)return json({error:"origin_forbidden"},403);
  if(!(request.headers.get("Content-Type")||"").toLowerCase().startsWith("application/json"))return json({error:"content_type"},415);
  let body;try{body=await request.json()}catch{return json({error:"invalid_json"},400)}
  const sku=body?.sku;
  if(typeof sku!=="string"||!Object.hasOwn(PRODUCTS,sku))return json({error:"unknown_product"},400);
  const amount=PRODUCTS[sku],id=crypto.randomUUID(),factorId=String(Date.now())+String(crypto.getRandomValues(new Uint16Array(1))[0]).padStart(5,"0");
  try{
   await env.DB.prepare("INSERT INTO vip_orders(id,sku,amount_rial,factor_id,state) VALUES(?,?,?,?,'created')").bind(id,sku,amount,factorId).run();
   // Callback on canonical domain to match BitPay merchant domain registration.
   const redirect=SITE+"/fa/shop/payment-return/?order="+encodeURIComponent(id)+"&kind=vip";
   const raw=await post("/gateway-send",{amount:String(amount),redirect,factorId,description:"VIP service "+sku},env.BITPAY_API_KEY);
   if(!/^[1-9]\d*$/.test(raw))return json({error:"provider_rejected",code:raw.slice(0,20)},502);
   await env.DB.prepare("UPDATE vip_orders SET state='pending',provider_id_get=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND state='created'").bind(raw,id).run();
   return json({orderId:id,paymentUrl:SITE+"/fa/shop/payment-start/?gateway="+encodeURIComponent(GATEWAY+"/gateway-"+raw+"-get")});
  }catch{return json({error:"creation_failed"},502)}
 }
 if(url.pathname==="/vip/status"&&request.method==="GET"){
  // Public status deliberately excludes PII, order metadata and gateway tokens.
  const id=url.searchParams.get("order");
  if(!validId(id))return json({error:"invalid_order"},400);
  const row=await env.DB.prepare("SELECT state FROM vip_orders WHERE id=?").bind(id).first();
  return row?json({state:row.state}):json({error:"not_found"},404);
 }
 if(url.pathname==="/vip/callback"&&["GET","POST"].includes(request.method)){
  const order=url.searchParams.get("order");
  if(!validId(order))return json({error:"invalid_order"},400);
  const row=await env.DB.prepare("SELECT * FROM vip_orders WHERE id=?").bind(order).first();
  if(!row)return json({error:"not_found"},404);
  if(row.state==="paid")return Response.redirect(SITE+"/fa/shop/payment-result/?state=paid",303);
  if(row.state!=="pending")return json({error:"invalid_state"},409);
  const params=new URLSearchParams(url.search);
  if(request.method==="POST"){
   if(!(request.headers.get("Content-Type")||"").startsWith("application/x-www-form-urlencoded"))return json({error:"content_type"},415);
   const form=await request.formData();for(const [k,v] of form)if(typeof v==="string")params.set(k,v);
  }
  const idGet=params.get("id_get"),trans=params.get("trans_id");
  if(idGet!==row.provider_id_get||!/^[0-9]+$/.test(trans||""))return json({error:"callback_mismatch"},400);
  try{
   const raw=await post("/gateway-result-second",{trans_id:trans,id_get:idGet,json:"1"},env.BITPAY_API_KEY);
   const data=JSON.parse(raw);
   if(!["1","11"].includes(String(data.status))||Number(data.amount)!==row.amount_rial||String(data.factorId)!==row.factor_id)return json({error:"verification_mismatch"},409);
   const result=await env.DB.prepare("UPDATE vip_orders SET state='paid',provider_trans_id=?,paid_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=? AND state='pending' AND provider_id_get=?").bind(trans,order,idGet).run();
   if(result.meta.changes!==1)return json({error:"state_conflict"},409);
   return Response.redirect(SITE+"/fa/shop/payment-result/?state=paid",303);
  }catch{return json({error:"verification_failed"},502)}
 }
 return json({error:"not_found"},404);
}};
