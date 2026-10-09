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
export async function donations(request,env){
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
