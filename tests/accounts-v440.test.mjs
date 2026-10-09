import test from "node:test";
import assert from "node:assert/strict";
import {webcrypto} from "node:crypto";
globalThis.crypto??=webcrypto;
import {account} from "../payment-api/account-routes.js";
const SITE="https://drjavadrezazadeh.com",HOST="https://drjavadrezazadeh-payment.dr-rezazadeh65.workers.dev";
const users=new Map(),sessions=new Map(),actions=new Map(),rate=new Map(),orders=[],outbox=[];
let clock=Date.now();
function D1(){
return {prepare(sql){let bind=[];return {
bind(...xs){bind=xs;return this},
async first(){
 if(sql.startsWith("INSERT INTO jr_account_rate")){let [bucket,hits,expires,now]=bind;let row=rate.get(bucket);if(!row||row.expires_at<now)row={hits:1,expires_at:expires};else row.hits++;rate.set(bucket,row);return row}
 if(sql.startsWith("SELECT * FROM jr_account_users WHERE email="))return users.get(bind[0])||null;
 if(sql.startsWith("UPDATE jr_account_tokens SET used_at=")){
  const [now,digest,purpose,cutoff]=bind;let row=actions.get(digest);
  if(!row||row.purpose!==purpose||row.expires_at<=cutoff||row.used_at)return null;
  row.used_at=now;return {user_id:row.user_id}
 }
 if(sql.startsWith("SELECT u.id,u.email")){let [digest,now]=bind,row=sessions.get(digest),user=row&&[...users.values()].find(u=>u.id===row.user_id);
  if(!row||!user||row.revoked_at||row.expires_at<=now||!user.email_verified_at||user.disabled_at)return null;
  return {...user,digest};
 }
 throw Error("Unexpected first SQL "+sql)
},
async run(){
 if(sql.startsWith("INSERT INTO jr_account_users")){let [id,email,full_name,mobile,pass_salt,pass_hash,pass_iterations,created_at,updated_at]=bind;if(users.has(email))throw Error("duplicate");users.set(email,{id,email,full_name,mobile,pass_salt,pass_hash,pass_iterations,created_at,updated_at,email_verified_at:null,disabled_at:null,role:"customer"});return {meta:{changes:1}}}
 if(sql.startsWith("INSERT INTO jr_account_tokens")){let [digest,user_id,purpose,expires_at,created_at]=bind;actions.set(digest,{digest,user_id,purpose,expires_at,created_at,used_at:null});return {meta:{changes:1}}}
 if(sql.startsWith("UPDATE jr_account_users SET pass_salt=")){let [salt,hash,iterations,date,...ids]=bind,id=ids.at(-1),user=[...users.values()].find(u=>u.id===id);if(!user)return {meta:{changes:0}};user.pass_salt=salt;user.pass_hash=hash;user.pass_iterations=iterations;user.updated_at=date;if(sql.includes("email_verified_at=?")){if(user.email_verified_at)return {meta:{changes:0}};user.email_verified_at=date}return {meta:{changes:1}}}
 if(sql.startsWith("INSERT INTO jr_account_sessions")){let [digest,user_id,expires_at,created_at]=bind;sessions.set(digest,{digest,user_id,expires_at,created_at,revoked_at:null});return {meta:{changes:1}}}
 if(sql.startsWith("UPDATE jr_account_sessions SET revoked_at=")){let [now,id]=bind,changes=0;for(const s of sessions.values()){if((sql.includes("WHERE digest=?")?s.digest===id:s.user_id===id)&&!s.revoked_at){s.revoked_at=now;changes++}}return {meta:{changes}}}
 throw Error("Unexpected run SQL "+sql)
},
async all(){
 if(sql.includes("FROM commerce_orders WHERE state='paid'")){
  return {results:orders.filter(o=>o.state==="paid"&&o.customer.email===bind[0]).map(o=>({id:o.id,paid_at:o.paid_at,provider_trans_id:o.provider_trans_id,items_json:JSON.stringify(o.items)}))}
 }
 if(sql.includes("FROM commerce_orders WHERE lower(json_extract"))return {results:orders.filter(o=>o.customer.email===bind[0]).map(o=>({id:o.id,paid_at:o.paid_at,created_at:o.created_at,amount_toman:o.amount_toman,state:o.state,fulfilment_state:o.fulfilment_state,tracking_code:o.tracking_code,items_json:JSON.stringify(o.items)}))};
 throw Error("Unexpected all SQL "+sql)
}
}}};
}
const env={DB:D1(),ACCOUNT_ENABLED:"true",ACCOUNT_EMAIL_ENABLED:"true",ACCOUNT_FROM_EMAIL:"noreply@drjavadrezazadeh.com",RESEND_API_KEY:"mock-resend",VIP_DIRECT_PHONE:"+989123456789"};
globalThis.fetch=async (url,opts)=>{if(url!=="https://api.resend.com/emails")throw Error("unexpected external fetch "+url);const body=JSON.parse(opts.body);outbox.push(body);return Response.json({id:"accepted-"+outbox.length})};
async function req(path,{method="GET",data,auth,origin=SITE}={}){let headers={Origin:origin};if(auth)headers.Authorization="Bearer "+auth; if(data){headers["Content-Type"]="application/json"};return account(new Request(HOST+path,{method,headers,body:data?JSON.stringify(data):undefined}),env)}
const parseLink=()=>{const text=outbox.at(-1)?.text||"";const match=text.match(/https:\/\/drjavadrezazadeh\.com\/fa\/account\/(?:verify|reset)\/#token=([a-f0-9]{64})/);assert.ok(match,"must email a one-time hash-fragment link");return match[1]};
test("fail closed without account activation, and deny untrusted Origin",async()=>{
 const cfg={...env,ACCOUNT_ENABLED:"false"};assert.equal((await account(new Request(HOST+"/account/me"),cfg)).status,503);
 assert.equal((await req("/account/register",{method:"POST",origin:"https://evil.example",data:{}})).status,403);
 const opt=await req("/account/register",{method:"OPTIONS"});assert.equal(opt.status,204);
 assert.match(opt.headers.get("Access-Control-Allow-Headers"),/Authorization/);
});
test("email-only registration, verification and password login reject role spoofing",async()=>{
 const weak=await req("/account/register",{method:"POST",data:{email:"bad",full_name:"Some Person",terms_accepted:true}});
 assert.equal(weak.status,400);
 const registered=await req("/account/register",{method:"POST",data:{email:"vip@example.org",full_name:"Valid VIP Buyer",mobile:"",role:"advisor",terms_accepted:true}});
 assert.equal(registered.status,202);assert.equal(users.get("vip@example.org").role,"customer");
 assert.equal(users.get("vip@example.org").mobile,"","no phone verification or mandatory mobile");
 const code=parseLink();
 const before=await req("/account/login",{method:"POST",data:{email:"vip@example.org",password:"Long-enough-password-2026"}});
 assert.equal(before.status,401,"unverified email cannot log in");
 assert.equal((await req("/account/verify",{method:"POST",data:{token:code,password:"weak"}})).status,400);
 const verified=await req("/account/verify",{method:"POST",data:{token:code,password:"Long-enough-password-2026"}});
 assert.equal(verified.status,200);
 const result=await verified.json();assert.match(result.token,/^[a-f0-9]{64}$/);
 assert.equal((await req("/account/verify",{method:"POST",data:{token:code,password:"Long-enough-password-2026"}})).status,400,"token replay must fail");
 const logged=await req("/account/login",{method:"POST",data:{email:"vip@example.org",password:"Long-enough-password-2026"}});
 assert.equal(logged.status,200);
 globalThis.testSession=(await logged.json()).token;
 const profile=await req("/account/me",{auth:globalThis.testSession});assert.equal((await profile.json()).user.role,"customer");
 assert.equal((await req("/account/me")).status,401);
 assert.equal((await req("/account/login",{method:"POST",data:{email:"vip@example.org",password:"wrong"}})).status,401);
});
test("private VIP contact belongs only to verified paid email holder during annual membership",async()=>{
 let r=await req("/account/vip",{auth:globalThis.testSession});
 assert.equal((await r.json()).direct_phone,null,"registration alone never grants direct phone");
 orders.push({id:"book-paid",customer:{email:"vip@example.org"},state:"paid",paid_at:new Date().toISOString(),provider_trans_id:"B-1",items:[{sku:"book:roshanaei",quantity:1}],amount_toman:2000000,created_at:new Date().toISOString(),fulfilment_state:"preparing_shipment"});
 orders.push({id:"vip-pending",customer:{email:"vip@example.org"},state:"pending",paid_at:null,provider_trans_id:null,items:[{sku:"vip:academic-direction",quantity:1}],amount_toman:24000000,created_at:new Date().toISOString()});
 orders.push({id:"vip-other",customer:{email:"other@example.org"},state:"paid",paid_at:new Date().toISOString(),provider_trans_id:"P-OTHER",items:[{sku:"vip:research-publication",quantity:1}],amount_toman:48000000,created_at:new Date().toISOString()});
 orders.push({id:"vip-old",customer:{email:"vip@example.org"},state:"paid",paid_at:new Date(Date.now()-400*86400000).toISOString(),provider_trans_id:"P-OLD",items:[{sku:"vip:university-selection",quantity:1}],amount_toman:36000000,created_at:new Date().toISOString()});
 r=await req("/account/vip",{auth:globalThis.testSession});let d=await r.json();
 assert.equal(d.direct_phone,null,"expired membership must not reveal phone");
 assert.equal(d.memberships.length,1);assert.equal(d.memberships[0].active,false);
 orders.push({id:"vip-current",customer:{email:"vip@example.org"},state:"paid",paid_at:new Date().toISOString(),provider_trans_id:"P-CURRENT",items:[{sku:"vip:academic-direction",quantity:1}],amount_toman:24000000,created_at:new Date().toISOString(),fulfilment_state:"awaiting_service_coordination"});
 r=await req("/account/vip",{auth:globalThis.testSession});d=await r.json();
 assert.equal(d.direct_phone,env.VIP_DIRECT_PHONE);assert.equal(d.memberships.length,2);
 assert.equal(d.memberships.filter(x=>x.active).length,1);
 assert.equal(d.unlimited_annual_coaching,true);
 assert.equal(d.in_person_meetings,true);
 assert.equal((await req("/account/vip")).status,401);
 const history=await (await req("/account/orders",{auth:globalThis.testSession})).json();
 assert.equal(history.orders.length,4);assert.ok(!JSON.stringify(history).includes("other@example.org"));assert.ok(!JSON.stringify(history).includes(env.VIP_DIRECT_PHONE));
});
test("email-only password reset revokes every prior session and sign-out works",async()=>{
 let r=await req("/account/reset/request",{method:"POST",data:{email:"vip@example.org"}});assert.equal(r.status,202);
 const code=parseLink();
 r=await req("/account/reset/confirm",{method:"POST",data:{token:code,password:"New-Secure-Password-2026"}});
 assert.equal(r.status,200);
 assert.equal((await req("/account/me",{auth:globalThis.testSession})).status,401);
 assert.equal((await req("/account/login",{method:"POST",data:{email:"vip@example.org",password:"Long-enough-password-2026"}})).status,401);
 const newLogin=await req("/account/login",{method:"POST",data:{email:"vip@example.org",password:"New-Secure-Password-2026"}});
 assert.equal(newLogin.status,200);
 const newSession=(await newLogin.json()).token;
 assert.equal((await req("/account/logout",{method:"POST",auth:newSession,data:{}})).status,200);
 assert.equal((await req("/account/me",{auth:newSession})).status,401);
});
