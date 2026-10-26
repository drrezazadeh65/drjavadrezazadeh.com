/* Owner MFA only: first real, exact, non-model JREI Python roundtrip.
 * No generic commands, no chat text, no production-ready claims.
 */
(()=>{
'use strict';
const root=document.getElementById('ops-jrei-learning');
const workspace=document.getElementById('ops-workspace');
if(!root||!workspace||document.getElementById('jr-python-canary-panel'))return;
const en=document.documentElement.lang==='en';
const T=(fa,english)=>en?english:fa;
const el=(tag,label)=>{const e=document.createElement(tag);if(label)e.textContent=label;return e;};
const panel=el('details');panel.id='jr-python-canary-panel';
panel.className='jr-jrei-apex-command-room';
panel.append(el('summary',T('JREI Python · نخستین مأموریت اجرایی محدود','JREI Python · first bounded real mission')));
const note=el('p',T(
 'آزمایش فقط ۱۲×۷ را با نشست مدیر و تأیید دومرحله‌ای در دیتابیس ثبت می‌کند؛ Worker امضاشده آن را در Python محاسبه و رسید واقعی برمی‌گرداند. این آزمایش به مدل، خزش، دادهٔ خصوصی یا انتشار دسترسی ندارد.',
 'One MFA-gated 12×7 calculation. An existing signed worker executes the local Python tool and returns a durable receipt. No model, crawl, private content or publishing access.'
));
panel.append(note);
const buttons=el('div');buttons.className='jr-jrei-apex-tools';
const check=el('button',T('بررسی نتیجهٔ واقعی','Check recorded result'));check.type='button';
const run=el('button',T('ثبت مأموریت ۱۲×۷','Queue 12×7 mission'));run.type='button';
buttons.append(check,run);panel.append(buttons);
const status=el('p',T('تا دریافت پاسخ سرور، وضعیت نامعلوم است.','State unknown until a server response.'));
status.setAttribute('role','status');status.setAttribute('aria-live','polite');
const history=el('div');panel.append(status,history);root.append(panel);
let busy=false,abort=null;
const active=()=>root.open&&panel.open&&!workspace.hidden&&!document.hidden;
function clear(){
 abort?.abort();abort=null;busy=false;history.replaceChildren();
 status.textContent=T('پاسخ قبلی پاک شد.','Previous result cleared.');
 run.disabled=false;check.disabled=false;
}
const send=async(body)=>{
 const opts={credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}};
 if(body){
   const a=await fetch('/api/admin/operations/session',opts);
   if(!a.ok)throw Error('MFA_REQUIRED');
   const session=await a.json();
   if(session?.mfaRequired!==false||!(/^[a-f0-9]{64}$/i.test(session.csrfToken||'')))
     throw Error('MFA_REQUIRED');
   opts.method='POST';
   opts.headers['X-CSRF-Token']=session.csrfToken;
   opts.headers['Content-Type']='application/json';
   opts.body=JSON.stringify(body);
 }
 const r=await fetch('/api/admin/operations/jrei-python-canary',opts);
 if(!r.ok)throw Error('NOT_AVAILABLE');
 const response=await r.json();
 if(response?.ok!==true)throw Error('NOT_AVAILABLE');
 return response;
};
function render(data){
 history.replaceChildren();
 if(data.schema!=='jr.jrei.python-canary-owner-snapshot.v1'||!Array.isArray(data.jobs))
   throw Error('CONTRACT_INVALID');
 const rows=data.jobs.slice(0,10);
 if(!rows.length){history.append(el('p',T('مأموریتی ثبت نشده است.','No missions recorded.')));return;}
 const list=el('ul');
 for(const item of rows){
   if(!/^[a-f0-9-]{36}$/i.test(item.jobId||''))continue;
   const li=el('li');
   const completed=item.state==='COMPLETED'&&item.numerator===84&&item.denominator===1&&
       /^[a-f0-9]{64}$/.test(item.resultSha256||'');
   li.textContent=item.jobId.slice(0,8)+' · '+String(item.state||'UNKNOWN')+
     (completed?T(' · Python: ۸۴ (رسید در دیتابیس)',' · Python: 84 (DB receipt)'):'');
   list.append(li);
 }
 history.append(list);
}
async function handle(isCreate){
 if(busy||!active())return;
 busy=true;check.disabled=true;run.disabled=true;
 status.textContent=T('در حال ارتباط با درگاه اصلی مدیریت…','Contacting the existing admin gateway…');
 try{
  const body=isCreate?{action:'run-fixed-arithmetic',
    requestKey:Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(x=>x.toString(16).padStart(2,'0')).join('')}:null;
  const result=await send(body);
  if(!active())return;
  if(isCreate){
    if(result.schema!=='jr.jrei.python-canary-owner-receipt.v1')
      throw Error('CONTRACT_INVALID');
    status.textContent=T('درخواست در دیتابیس ثبت شد؛ هنوز اجرای آن تأیید نشده است.',
      'Job queued in the mother DB; execution is not yet attested.');
  }else{
    render(result);
    status.textContent=T('وضعیت از دیتابیس مادر خوانده شد.','Status read from the mother DB.');
  }
 }catch{
  if(active())status.textContent=T(
   'نشست MFA، تنظیمات خصوصی یا سرویس هنوز آماده نیست؛ مأموریت اجراشده فرض نمی‌شود.',
   'MFA, private release settings or service unavailable. No execution is inferred.');
 }finally{busy=false;check.disabled=false;run.disabled=false;}
}
check.addEventListener('click',()=>handle(false));
run.addEventListener('click',()=>handle(true));
panel.addEventListener('toggle',()=>{if(!panel.open)clear();});
root.addEventListener('toggle',()=>{if(!root.open)clear();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)clear();});
workspace.addEventListener('jr:operations-locked',clear);
window.addEventListener('pagehide',clear);
})();
