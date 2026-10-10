import { WorkerEntrypoint } from 'cloudflare:workers';

const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','access-control-allow-origin':'https://drjavadrezazadeh.com','vary':'Origin'}});
const emailOk=value=>typeof value==='string' && value.length<=254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const allowedRoles=new Set(['student','parent','teacher','adviser','book']);
const escape=value=>String(value).replace(/[\r\n\t]/g,' ').trim();
export default class RegistrationIntake extends WorkerEntrypoint {
  async fetch(request) {
    const url=new URL(request.url);
    if(url.pathname!=='/register-request' || request.method!=='POST') return json({error:'not_found'},404);
    if(request.headers.get('origin')!=='https://drjavadrezazadeh.com') return json({error:'forbidden_origin'},403);
    if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return json({error:'unsupported_media_type'},415);
    if(Number(request.headers.get('content-length')||0)>4096) return json({error:'too_large'},413);
    let data;try {data=await request.json();}catch{return json({error:'invalid_json'},400);}
    if(data?.website) return json({accepted:true});
    const name=escape(data?.name||''),email=escape(data?.email||''),role=data?.role;
    if(name.length<2||name.length>100||!emailOk(email)||!allowedRoles.has(role)) return json({error:'invalid_fields'},400);
    if(!this.env.TURNSTILE_SECRET || !this.env.EMAIL_SERVICE) return json({error:'service_unavailable'},503);
    const challenge=String(data?.turnstileToken||'');
    if(!challenge||challenge.length>2048) return json({error:'verification_required'},400);
    const ip=request.headers.get('CF-Connecting-IP')||'';
    const form=new FormData();
    form.set('secret',this.env.TURNSTILE_SECRET);form.set('response',challenge);if(ip)form.set('remoteip',ip);
    let verified;
    try {const result=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',body:form});verified=await result.json();}catch{return json({error:'verification_unavailable'},503);}
    if(!verified?.success||verified.hostname!=='drjavadrezazadeh.com') return json({error:'verification_failed'},403);
    const id=crypto.randomUUID();
    const message='Registration request ID: '+id+'\nName: '+name+'\nEmail: '+email+'\nRole: '+role+'\nNo account has been created.';
    try {
      await this.env.EMAIL_SERVICE.sendTransactional({type:'consultation_notice',to:'info@drjavadrezazadeh.com',subject:'New registration request '+id,text:message,idempotencyKey:'intake:'+id});
      await this.env.EMAIL_SERVICE.sendTransactional({type:'registration_verification',to:email,subject:'Registration request received',text:'We received your request (reference '+id+'). No account has been created yet. Reply to info@drjavadrezazadeh.com if you need assistance.',idempotencyKey:'receipt:'+id});
    } catch {return json({error:'delivery_unavailable'},503);}
    return json({accepted:true,reference:id});
  }
}
