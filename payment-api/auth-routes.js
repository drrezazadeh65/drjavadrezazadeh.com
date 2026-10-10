const SITE='https://drjavadrezazadeh.com';
const VERIFY_TTL=15*60;
const RESET_TTL=15*60;
const SESSION_TTL=7*24*60*60;
const ITERATIONS=600000;
const enc=new TextEncoder();
const cors={
  'Access-Control-Allow-Origin':SITE,
  'Access-Control-Allow-Credentials':'true',
  'Access-Control-Allow-Headers':'Content-Type',
  'Access-Control-Allow-Methods':'GET,POST,OPTIONS',
  'Cache-Control':'no-store',
  'X-Content-Type-Options':'nosniff',
  'Referrer-Policy':'no-referrer'
};
const reply=(data,status=200,extra={})=>Response.json(data,{status,headers:{...cors,...extra}});
const fail=(error,status=400)=>reply({ok:false,error},status);
const now=()=>Math.floor(Date.now()/1000);
const email=v=>String(v||'').trim().toLowerCase();
const validEmail=v=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)&&v.length<=254;
const validMobile=v=>v===''||/^\+[1-9][0-9]{7,14}$/.test(v);
const validPassword=v=>typeof v==='string'&&v.length>=12&&v.length<=128;
function b64u(bytes){let s='';for(const b of bytes)s+=String.fromCharCode(b);return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
function unb64u(s){const x=String(s).replace(/-/g,'+').replace(/_/g,'/');const p=x+'='.repeat((4-x.length%4)%4);const r=atob(p),b=new Uint8Array(r.length);for(let i=0;i<r.length;i++)b[i]=r.charCodeAt(i);return b}
function token(n=32){const b=new Uint8Array(n);crypto.getRandomValues(b);return b64u(b)}
async function sha256(v){const d=await crypto.subtle.digest('SHA-256',enc.encode(String(v)));return [...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,'0')).join('')}
async function hashPassword(password,pepper,salt){
  if(!pepper)throw new Error('pepper_missing');
  salt=salt||crypto.getRandomValues(new Uint8Array(16));
  const key=await crypto.subtle.importKey('raw',enc.encode(password+'\u0000'+pepper),'PBKDF2',false,['deriveBits']);
  const bits=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt,iterations:ITERATIONS},key,256);
  return 'pbkdf2-sha256$'+ITERATIONS+'$'+b64u(salt)+'$'+b64u(new Uint8Array(bits));
}
async function checkPassword(password,stored,pepper){
  const p=String(stored||'').split('$');
  if(p.length!==4||p[0]!=='pbkdf2-sha256'||Number(p[1])!==ITERATIONS)return false;
  let salt,expected;try{salt=unb64u(p[2]);expected=unb64u(p[3])}catch{return false}
  const calc=unb64u((await hashPassword(password,pepper,salt)).split('$')[3]);
  if(calc.length!==expected.length)return false;
  let diff=0;for(let i=0;i<calc.length;i++)diff|=calc[i]^expected[i];return diff===0;
}
function originOK(req){return req.headers.get('Origin')===SITE}
function jsonType(req){return (req.headers.get('Content-Type')||'').startsWith('application/json')}
function ip(req){return req.headers.get('CF-Connecting-IP')||'unknown'}
async function limit(env,action,identity,req,max,windowSec){
  const bucket=await sha256(action+'|'+identity+'|'+ip(req));
  const n=now(),reset=n+windowSec;
  const row=await env.DB.prepare(
    "INSERT INTO customer_auth_rate_limits(bucket,count,reset_at) VALUES(?,1,?) "+
    "ON CONFLICT(bucket) DO UPDATE SET count=CASE WHEN reset_at<=? THEN 1 ELSE count+1 END, "+
    "reset_at=CASE WHEN reset_at<=? THEN ? ELSE reset_at END RETURNING count"
  ).bind(bucket,reset,n,n,reset).first();
  return Number(row?.count||0)<=max;
}
async function byEmail(env,e){return env.DB.prepare('SELECT * FROM customer_accounts WHERE email_normalized=?').bind(e).first()}
async function byId(env,id){return env.DB.prepare('SELECT * FROM customer_accounts WHERE id=?').bind(id).first()}
async function issue(env,accountId,purpose,ttl){
  const raw=token(),digest=await sha256(raw),t=now();
  await env.DB.prepare('DELETE FROM customer_auth_tokens WHERE account_id=? AND purpose=? AND consumed_at IS NULL').bind(accountId,purpose).run();
  await env.DB.prepare('INSERT INTO customer_auth_tokens(token_hash,account_id,purpose,expires_at,created_at) VALUES(?,?,?,?,?)')
    .bind(digest,accountId,purpose,t+ttl,t).run();
  return raw;
}
async function consume(env,raw,purpose){
  if(typeof raw!=='string'||raw.length<30||raw.length>100)return null;
  const digest=await sha256(raw),t=now();
  const row=await env.DB.prepare(
    'SELECT account_id FROM customer_auth_tokens WHERE token_hash=? AND purpose=? AND consumed_at IS NULL AND expires_at>?'
  ).bind(digest,purpose,t).first();
  if(!row?.account_id)return null;
  const r=await env.DB.prepare(
    'UPDATE customer_auth_tokens SET consumed_at=? WHERE token_hash=? AND purpose=? AND consumed_at IS NULL AND expires_at>?'
  ).bind(t,digest,purpose,t).run();
  return r.meta?.changes===1?row.account_id:null;
}
async function send(env,{to,template,variables,key}){
  if(!env.RESEND_API_KEY)throw new Error('resend_missing');
  const r=await fetch('https://api.resend.com/emails',{
    method:'POST',
    headers:{Authorization:'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':key},
    body:JSON.stringify({
      from:env.AUTH_EMAIL_FROM||'Dr. Javad Rezazadeh <accounts@drjavadrezazadeh.com>',
      to:[to],
      template:{id:template,variables}
    }),
    signal:AbortSignal.timeout(12000)
  });
  if(!r.ok)throw new Error('resend_'+r.status);
  const d=await r.json();if(!d?.id)throw new Error('resend_invalid');
}
function cookie(req,raw,age){
  const thirdParty=new URL(req.url).hostname.endsWith('.workers.dev');
  return 'drjr_session='+raw+'; Path=/; Max-Age='+age+'; HttpOnly; Secure; SameSite='+(thirdParty?'None':'Lax')+(thirdParty?'; Partitioned':'');
}
function clearCookie(req){return cookie(req,'',0)}
async function sessionAccount(env,req){
  const c=req.headers.get('Cookie')||'',m=c.match(/(?:^|;\s*)drjr_session=([^;]+)/);if(!m)return null;
  const digest=await sha256(m[1]),t=now();
  const row=await env.DB.prepare('SELECT account_id FROM customer_auth_sessions WHERE token_hash=? AND revoked_at IS NULL AND expires_at>?').bind(digest,t).first();
  return row?.account_id?byId(env,row.account_id):null;
}
function localePath(locale,fa,en){return locale==='en'?en:fa}

export async function auth(request,env){
  const u=new URL(request.url),path=u.pathname;
  if(!path.startsWith('/auth/'))return null;
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});

  if(path==='/auth/health'&&request.method==='GET'){
    let database=false;
    try{if(env.DB){await env.DB.prepare('SELECT 1 FROM customer_accounts LIMIT 1').first();database=true}}catch{}
    const ready=database&&!!env.RESEND_API_KEY&&!!env.AUTH_PEPPER;
    return reply({ok:true,service:'auth',ready,database,email:!!env.RESEND_API_KEY,passwordKdf:!!env.AUTH_PEPPER});
  }
  if(!env.DB||!env.RESEND_API_KEY||!env.AUTH_PEPPER)return fail('auth_unavailable',503);
  if(request.method==='POST'&&!originOK(request))return fail('origin_forbidden',403);

  if(path==='/auth/register'&&request.method==='POST'){
    if(!jsonType(request))return fail('content_type',415);
    let b;try{b=await request.json()}catch{return fail('invalid_json')}
    const e=email(b?.email),mobile=String(b?.mobile||'').trim(),password=b?.password,locale=b?.locale==='en'?'en':'fa';
    if(!validEmail(e)||!validMobile(mobile)||!validPassword(password))return fail('invalid_registration');
    if(!(await limit(env,'register',e,request,5,3600)))return fail('rate_limited',429);
    let account=await byEmail(env,e);
    if(!account){
      const id=crypto.randomUUID(),h=await hashPassword(password,env.AUTH_PEPPER),t=now();
      try{
        await env.DB.prepare(
          "INSERT INTO customer_accounts(id,email_normalized,password_hash,mobile_e164,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?)"
        ).bind(id,e,h,mobile||null,'pending',t,t).run();
        account=await byId(env,id);
      }catch{account=await byEmail(env,e)}
    }
    if(account&&!account.email_verified_at&&account.status!=='disabled'){
      const raw=await issue(env,account.id,'verify_email',VERIFY_TTL);
      const url=SITE+localePath(locale,'/fa/login/','/en/login/')+'?verify='+encodeURIComponent(raw);
      try{
        await send(env,{to:e,template:'website-email-verification-v43',variables:{VERIFY_URL:url,EXPIRY_MINUTES:15},key:'verify/'+account.id+'/'+await sha256(raw)});
      }catch{return fail('verification_email_failed',502)}
    }
    return reply({ok:true,message:'verification_if_applicable_sent'},202);
  }

  if(path==='/auth/verify-email'&&request.method==='POST'){
    if(!jsonType(request))return fail('content_type',415);
    let b;try{b=await request.json()}catch{return fail('invalid_json')}
    const id=await consume(env,b?.token,'verify_email');if(!id)return fail('invalid_or_expired_token');
    const t=now();
    await env.DB.prepare("UPDATE customer_accounts SET email_verified_at=COALESCE(email_verified_at,?),status='active',updated_at=? WHERE id=? AND status!='disabled'")
      .bind(t,t,id).run();
    return reply({ok:true,verified:true});
  }

  if(path==='/auth/login'&&request.method==='POST'){
    if(!jsonType(request))return fail('content_type',415);
    let b;try{b=await request.json()}catch{return fail('invalid_json')}
    const e=email(b?.email),password=b?.password;
    if(!validEmail(e)||typeof password!=='string')return fail('invalid_credentials',401);
    if(!(await limit(env,'login',e,request,10,900)))return fail('rate_limited',429);
    const a=await byEmail(env,e);
    const valid=!!(a&&a.status==='active'&&a.email_verified_at&&await checkPassword(password,a.password_hash,env.AUTH_PEPPER));
    if(!valid)return fail('invalid_credentials',401);
    const raw=token(),digest=await sha256(raw),t=now();
    await env.DB.prepare('INSERT INTO customer_auth_sessions(token_hash,account_id,expires_at,created_at) VALUES(?,?,?,?)')
      .bind(digest,a.id,t+SESSION_TTL,t).run();
    return reply({ok:true,authenticated:true},200,{'Set-Cookie':cookie(request,raw,SESSION_TTL)});
  }

  if(path==='/auth/forgot-password'&&request.method==='POST'){
    if(!jsonType(request))return fail('content_type',415);
    let b;try{b=await request.json()}catch{return fail('invalid_json')}
    const e=email(b?.email),locale=b?.locale==='en'?'en':'fa';
    if(validEmail(e)&&await limit(env,'recovery',e,request,5,3600)){
      const a=await byEmail(env,e);
      if(a?.status==='active'&&a.email_verified_at){
        const raw=await issue(env,a.id,'reset_password',RESET_TTL);
        const url=SITE+localePath(locale,'/fa/bazyabi-hesab/','/en/recover/')+'?token='+encodeURIComponent(raw);
        try{
          await send(env,{to:e,template:'website-password-recovery-v43',variables:{RESET_URL:url,EXPIRY_MINUTES:15},key:'reset/'+a.id+'/'+await sha256(raw)});
        }catch{}
      }
    }
    return reply({ok:true,message:'recovery_if_account_exists_sent'},202);
  }

  if(path==='/auth/reset-password'&&request.method==='POST'){
    if(!jsonType(request))return fail('content_type',415);
    let b;try{b=await request.json()}catch{return fail('invalid_json')}
    if(!validPassword(b?.password))return fail('invalid_password');
    const id=await consume(env,b?.token,'reset_password');if(!id)return fail('invalid_or_expired_token');
    const h=await hashPassword(b.password,env.AUTH_PEPPER),t=now();
    await env.DB.prepare('UPDATE customer_accounts SET password_hash=?,updated_at=? WHERE id=?').bind(h,t,id).run();
    await env.DB.prepare('UPDATE customer_auth_sessions SET revoked_at=? WHERE account_id=? AND revoked_at IS NULL').bind(t,id).run();
    return reply({ok:true,passwordReset:true},200,{'Set-Cookie':clearCookie(request)});
  }

  if(path==='/auth/me'&&request.method==='GET'){
    const a=await sessionAccount(env,request);if(!a)return fail('unauthorized',401);
    return reply({ok:true,user:{id:a.id,email:a.email_normalized,mobile:a.mobile_e164||null,emailVerified:true}});
  }

  if(path==='/auth/logout'&&request.method==='POST'){
    const c=request.headers.get('Cookie')||'',m=c.match(/(?:^|;\s*)drjr_session=([^;]+)/);
    if(m){const d=await sha256(m[1]);await env.DB.prepare('UPDATE customer_auth_sessions SET revoked_at=? WHERE token_hash=? AND revoked_at IS NULL').bind(now(),d).run()}
    return reply({ok:true},200,{'Set-Cookie':clearCookie(request)});
  }

  return fail('not_found',404);
}
