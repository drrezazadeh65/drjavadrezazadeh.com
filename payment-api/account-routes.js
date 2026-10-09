// v4.4 account routes: Cloudflare D1, verified-email identity, no SMS authentication.
// Disabled until ACCOUNT_ENABLED=true, ACCOUNT_EMAIL_ENABLED=true and Resend sender is verified.
// Mount BEFORE commerce and legacy payment routes in the existing Worker.
const A_ORIGIN="https://drjavadrezazadeh.com",A_ITERATIONS=210000,A_SESSION_TTL=43200,A_ACTION_TTL=86400;
const A_HEADERS={"Access-Control-Allow-Origin":A_ORIGIN,"Access-Control-Allow-Methods":"GET,POST,OPTIONS","Access-Control-Allow-Headers":"Content-Type,Authorization","Vary":"Origin","Cache-Control":"private, no-store, max-age=0","X-Content-Type-Options":"nosniff","Referrer-Policy":"no-referrer"};
const aok=(body,status=200)=>Response.json(body,{status,headers:A_HEADERS});
const ano=(error,status=400)=>aok({ok:false,error},status);
const anow=()=>Math.floor(Date.now()/1000);
function aemail(s){const email=String(s||"").trim().toLowerCase();return email.length<=254&&/^[^\s@<>]+@[a-z0-9][a-z0-9.-]*\.[a-z]{2,63}$/.test(email)?email:null}
function aphone(s){const str=String(s||"").replace(/[۰-۹]/g,x=>String(x.charCodeAt(0)-1776)).replace(/[٠-٩]/g,x=>String(x.charCodeAt(0)-1632)).replace(/[\s()-]/g,"");return str?(/^\+?[0-9]{8,15}$/.test(str)?str:null):""}
function aname(s){return String(s||"").replace(/[\u0000-\u001f\u007f<>]/g," ").trim().slice(0,90)}
function avalidPassword(s){return typeof s==="string"&&s.length>=12&&s.length<=128&&!/[\u0000-\u001f\u007f]/.test(s)}
function arandom(){return [...crypto.getRandomValues(new Uint8Array(32))].map(x=>x.toString(16).padStart(2,"0")).join("")}
async function ahash(text){return [...new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(text)))].map(x=>x.toString(16).padStart(2,"0")).join("")}
async function apbkdf2(password,salt,iterations=A_ITERATIONS){
 const k=await crypto.subtle.importKey("raw",new TextEncoder().encode(password),"PBKDF2",false,["deriveBits"]);
 const bytes=await crypto.subtle.deriveBits({name:"PBKDF2",hash:"SHA-256",salt:new Uint8Array(salt.match(/../g).map(x=>parseInt(x,16))),iterations},k,256);
 return [...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,"0")).join("");
}
function aequal(a,b){if(typeof a!=="string"||typeof b!=="string"||a.length!==b.length)return false;let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0}
async function abody(req){if(!/^application\/json(?:;|$)/i.test(req.headers.get("Content-Type")||""))throw Error("invalid_content_type");const text=await req.text();if(text.length>8192)throw Error("oversized_request");const obj=JSON.parse(text);if(!obj||typeof obj!=="object"||Array.isArray(obj))throw Error("invalid_request");return obj}
async function alimit(env,req,purpose,identity="",limit=5,window=900){
 const bucket=await ahash(purpose+"|"+(req.headers.get("CF-Connecting-IP")||"unknown")+"|"+identity),now=anow();
 const r=await env.DB.prepare("INSERT INTO jr_account_rate(bucket,hits,expires_at) VALUES(?,?,?) ON CONFLICT(bucket) DO UPDATE SET hits=CASE WHEN expires_at<? THEN 1 ELSE hits+1 END,expires_at=CASE WHEN expires_at<? THEN excluded.expires_at ELSE expires_at END RETURNING hits")
  .bind(bucket,1,now+window,now,now).first();
 return Number(r?.hits||999)<=limit;
}
const auser=(env,email)=>env.DB.prepare("SELECT * FROM jr_account_users WHERE email=? LIMIT 1").bind(email).first();
async function aissueAction(env,id,purpose){
 const value=arandom(),digest=await ahash(value),now=anow();
 await env.DB.prepare("INSERT INTO jr_account_tokens(digest,user_id,purpose,expires_at,created_at) VALUES(?,?,?,?,?)").bind(digest,id,purpose,now+A_ACTION_TTL,now).run();
 return value;
}
async function asend(env,to,purpose,token){
 const from=String(env.ACCOUNT_FROM_EMAIL||"");
 if(env.ACCOUNT_EMAIL_ENABLED!=="true"||!env.RESEND_API_KEY||!/^.+@[^@\s]+\.[^@\s]+$/.test(from))return false;
 const url=A_ORIGIN+"/fa/account/"+(purpose==="verify"?"verify":"reset")+"/#token="+encodeURIComponent(token);
 const title=purpose==="verify"?"تأیید ایمیل و فعال‌سازی حساب":"بازیابی امن رمز عبور";
 const message=purpose==="verify"?"برای تأیید ایمیل و تعیین رمز عبور حساب از پیوند زیر استفاده کنید.":"برای تعیین رمز عبور جدید از پیوند زیر استفاده کنید.";
 try{
 const res=await fetch("https://api.resend.com/emails",{method:"POST",headers:{"Authorization":"Bearer "+env.RESEND_API_KEY,"Content-Type":"application/json"},body:JSON.stringify({from,to,subject:title+" | Dr. Javad Rezazadeh",text:message+"\n"+url+"\nاین پیوند یک‌بارمصرف است و حداکثر ۲۴ ساعت اعتبار دارد. اگر درخواست متعلق به شما نیست، آن را نادیده بگیرید."}),signal:AbortSignal.timeout(10000)});
 if(!res.ok)return false;const receipt=await res.json().catch(()=>({}));return !!receipt.id;
 }catch{return false}
}
async function aconsume(env,token,purpose){
 if(!/^[a-f0-9]{64}$/i.test(token||""))return null;
 const digest=await ahash(token),now=anow();
 return env.DB.prepare("UPDATE jr_account_tokens SET used_at=? WHERE digest=? AND purpose=? AND used_at IS NULL AND expires_at>? RETURNING user_id")
  .bind(now,digest,purpose,now).first();
}
async function acreateSession(env,id){
 const token=arandom(),digest=await ahash(token),now=anow();
 await env.DB.prepare("INSERT INTO jr_account_sessions(digest,user_id,expires_at,created_at) VALUES(?,?,?,?)").bind(digest,id,now+A_SESSION_TTL,now).run();
 return {token,expires_at:now+A_SESSION_TTL};
}
async function aauthenticate(request,env){
 const m=/^Bearer ([a-f0-9]{64})$/i.exec(request.headers.get("Authorization")||"");if(!m)return null;
 const digest=await ahash(m[1]),now=anow();
 return env.DB.prepare("SELECT u.id,u.email,u.full_name,u.mobile,u.role,u.created_at,s.digest FROM jr_account_sessions s JOIN jr_account_users u ON s.user_id=u.id WHERE s.digest=? AND s.revoked_at IS NULL AND s.expires_at>? AND u.email_verified_at IS NOT NULL AND u.disabled_at IS NULL")
 .bind(digest,now).first();
}
function apublic(user){return {id:user.id,email:user.email,full_name:user.full_name,role:user.role,created_at:user.created_at}}
function avip(rows,env){
 const now=Date.now(),yearMs=365*86400000,out=[];
 for(const row of rows||[]){
  if(!row.provider_trans_id||!row.paid_at)continue;
  const raw=String(row.paid_at),iso=/^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/.test(raw)?raw.replace(" ","T")+"Z":raw;
  const start=Date.parse(iso);
  if(!Number.isFinite(start))continue;
  let items;try{items=JSON.parse(row.items_json||"[]")}catch{continue}
  const vip=(items||[]).filter(x=>typeof x.sku==="string"&&/^vip:[a-z0-9-]+$/.test(x.sku)&&Number(x.quantity)>0);
  if(!vip.length)continue;
  const expires_at=new Date(start+yearMs).toISOString(),active=now>=start&&now<start+yearMs;
  for(const v of vip)out.push({order_id:row.id,sku:v.sku,started_at:new Date(start).toISOString(),expires_at,active,annual_coaching_unlimited:true,in_person_by_appointment:true,private_direct_contact:active?"available_to_verified_customer":"expired"});
 }
 return out;
}
export async function account(request,env){
 const u=new URL(request.url),p=u.pathname;
 if(!p.startsWith("/account/"))return null;
 if(request.headers.get("Origin")&&request.headers.get("Origin")!==A_ORIGIN)return ano("origin_not_allowed",403);
 if(request.method==="OPTIONS")return new Response(null,{status:204,headers:A_HEADERS});
 if(env.ACCOUNT_ENABLED!=="true"||!env.DB)return ano("account_unavailable",503);
 try{
  if(p==="/account/register"&&request.method==="POST"){
   if(env.ACCOUNT_EMAIL_ENABLED!=="true"||!env.RESEND_API_KEY||!env.ACCOUNT_FROM_EMAIL)return ano("verification_email_unavailable",503);
   const q=await abody(request),email=aemail(q.email),name=aname(q.full_name),phone=aphone(q.mobile);
   if(!email||name.length<3||phone===null||q.terms_accepted!==true)return ano("invalid_registration");
   if(!await alimit(env,request,"register",email,3,3600))return ano("rate_limited",429);
   let user=await auser(env,email);
   if(user?.email_verified_at)return aok({ok:true,verification_required:true},202);
   if(!user){
    const id=crypto.randomUUID(),randomSalt=arandom(),now=anow();
    await env.DB.prepare("INSERT INTO jr_account_users(id,email,full_name,mobile,pass_salt,pass_hash,pass_iterations,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)")
      .bind(id,email,name,phone,randomSalt,randomSalt,A_ITERATIONS,now,now).run();
    user={id};
   }
   const token=await aissueAction(env,user.id,"verify");
   await asend(env,email,"verify",token);
   // Generic response does not disclose registration state or mail provider success.
   return aok({ok:true,verification_required:true},202);
  }
  if(p==="/account/verify"&&request.method==="POST"){
   const q=await abody(request);
   if(!avalidPassword(q.password))return ano("invalid_password_requirements");
   if(!await alimit(env,request,"verify","",7,900))return ano("rate_limited",429);
   const saved=await aconsume(env,q.token,"verify");if(!saved)return ano("invalid_or_expired_token",400);
   const salt=arandom(),hash=await apbkdf2(q.password,salt),now=anow();
   const success=await env.DB.prepare("UPDATE jr_account_users SET pass_salt=?,pass_hash=?,pass_iterations=?,email_verified_at=?,updated_at=? WHERE id=? AND email_verified_at IS NULL")
     .bind(salt,hash,A_ITERATIONS,now,now,saved.user_id).run();
   if(success.meta?.changes!==1)return ano("account_already_verified",409);
   const session=await acreateSession(env,saved.user_id);return aok({ok:true,...session});
  }
  if(p==="/account/login"&&request.method==="POST"){
   const q=await abody(request),email=aemail(q.email);
   if(!email||typeof q.password!=="string"||q.password.length>128)return ano("invalid_credentials",401);
   if(!await alimit(env,request,"login",email,5,900))return ano("rate_limited",429);
   const user=await auser(env,email);
   // Equalise cost to reduce account-enumeration timing differences.
   const salt=user?.pass_salt||"0".repeat(64),iterations=Number(user?.pass_iterations||A_ITERATIONS);
   if(iterations<100000||iterations>600000)return ano("invalid_credentials",401);
   const result=await apbkdf2(q.password,salt,iterations);
   if(!user||!user.email_verified_at||user.disabled_at||!aequal(result,user.pass_hash))return ano("invalid_credentials",401);
   const session=await acreateSession(env,user.id);return aok({ok:true,...session,user:apublic(user)});
  }
  if(p==="/account/reset/request"&&request.method==="POST"){
   if(env.ACCOUNT_EMAIL_ENABLED!=="true"||!env.RESEND_API_KEY||!env.ACCOUNT_FROM_EMAIL)return ano("verification_email_unavailable",503);
   const q=await abody(request),email=aemail(q.email);if(!email)return ano("invalid_email");
   if(!await alimit(env,request,"reset_request",email,3,3600))return ano("rate_limited",429);
   const user=await auser(env,email);
   if(user?.email_verified_at&&!user.disabled_at){const token=await aissueAction(env,user.id,"reset");await asend(env,email,"reset",token)}
   return aok({ok:true,if_account_exists_email_sent:true},202);
  }
  if(p==="/account/reset/confirm"&&request.method==="POST"){
   const q=await abody(request);if(!avalidPassword(q.password))return ano("invalid_password_requirements");
   if(!await alimit(env,request,"reset_confirm","",7,900))return ano("rate_limited",429);
   const action=await aconsume(env,q.token,"reset");if(!action)return ano("invalid_or_expired_token");
   const salt=arandom(),hash=await apbkdf2(q.password,salt),now=anow();
   await env.DB.prepare("UPDATE jr_account_users SET pass_salt=?,pass_hash=?,pass_iterations=?,updated_at=? WHERE id=? AND email_verified_at IS NOT NULL")
    .bind(salt,hash,A_ITERATIONS,now,action.user_id).run();
   await env.DB.prepare("UPDATE jr_account_sessions SET revoked_at=? WHERE user_id=? AND revoked_at IS NULL").bind(now,action.user_id).run();
   return aok({ok:true,reset_complete:true});
  }
  if(["/account/me","/account/logout","/account/orders","/account/vip"].includes(p)){
   const user=await aauthenticate(request,env);if(!user)return ano("not_authenticated",401);
   if(p==="/account/me"&&request.method==="GET")return aok({ok:true,user:apublic(user)});
   if(p==="/account/logout"&&request.method==="POST"){await env.DB.prepare("UPDATE jr_account_sessions SET revoked_at=? WHERE digest=?").bind(anow(),user.digest).run();return aok({ok:true})}
   if(p==="/account/orders"&&request.method==="GET"){
    const records=await env.DB.prepare("SELECT id,state,fulfilment_state,created_at,paid_at,amount_toman,items_json,tracking_code FROM commerce_orders WHERE lower(json_extract(customer_json,'$.email'))=? ORDER BY created_at DESC LIMIT 100").bind(user.email).all();
    const orders=(records.results||[]).map(r=>({id:r.id,payment_state:r.state,fulfilment_state:r.fulfilment_state,created_at:r.created_at,paid_at:r.paid_at,amount_toman:r.amount_toman,items:JSON.parse(r.items_json||"[]"),tracking_code:r.tracking_code}));
    return aok({ok:true,orders});
   }
   if(p==="/account/vip"&&request.method==="GET"){
    const result=await env.DB.prepare("SELECT id,paid_at,provider_trans_id,items_json FROM commerce_orders WHERE state='paid' AND lower(json_extract(customer_json,'$.email'))=? ORDER BY paid_at DESC LIMIT 100").bind(user.email).all();
    const memberships=avip(result.results||[],env);
    const hasActive=memberships.some(m=>m.active);
    // Configuration-held direct telephone is revealed only to the holder of a verified email account
    // associated with a bank-verified paid VIP package whose membership has not expired.
    const phone=String(env.VIP_DIRECT_PHONE||"").trim();
    const validatedPhone=/^\+?[0-9]{8,15}$/.test(phone)?phone:null;
    return aok({ok:true,memberships,direct_phone:hasActive?validatedPhone:null,in_person_meetings:hasActive,unlimited_annual_coaching:hasActive});
   }
  }
  return ano("not_found",404);
 }catch{return ano("account_request_unavailable",503)}
}
