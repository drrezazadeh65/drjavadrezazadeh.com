/* JREI bounded Python canary — original owner MFA/CSRF session.
 * The panel NEVER equates a signed node health report with execution.
 * A completed DB receipt is evidence of the bounded 12x7 signed-job path,
 * not of genuine model inference, training, live crawling or news.
 */
(()=>{
'use strict';
const root=document.getElementById('ops-jrei-learning');
const workspace=document.getElementById('ops-workspace');
if(!root||!workspace||document.getElementById('jr-python-canary-panel'))return;
const en=document.documentElement.lang==='en';
const T=(fa,enText)=>en?enText:fa;
const el=(tag,t)=>{const o=document.createElement(tag);if(t)o.textContent=t;return o;};
const panel=el('details');panel.id='jr-python-canary-panel';
panel.className='jr-jrei-apex-command-room';
panel.append(el('summary',T('JREI Python · مأموریت واقعی محدود','JREI Python · bounded execution')));
panel.append(el('p',T(
 'مأموریت آزمایشی ۱۲×۷ تنها پس از احراز هویت مدیریتی، به صف دیتابیس مادر می‌رود. Worker امضاشده پاسخ Python را ثبت می‌کند. سلامت Worker به‌تنهایی اثبات انجام مأموریت نیست.',
 'A one-off 12×7 mission is queued only in the existing MFA session. The signed worker records a Python computation receipt. Worker health alone is not proof of execution.'
)));
const buttons=el('div');buttons.className='jr-jrei-apex-tools';
const inspect=el('button',T('بررسی آمادگی و نتیجه','Check readiness and result'));inspect.type='button';
const run=el('button',T('اجرای محدود ۱۲×۷','Queue bounded 12×7'));run.type='button';
buttons.append(inspect,run);panel.append(buttons);
const preflight=el('p');preflight.setAttribute('aria-live','polite');
const status=el('p',T('در انتظار استعلام وضعیت واقعی…','Awaiting actual status query…'));
status.setAttribute('role','status');status.setAttribute('aria-live','polite');
const history=el('div');panel.append(preflight,status,history);
root.append(panel);
let timer=null,activeRequest=null,busy=false,generation=0,remaining=0;
const isActive=()=>root.open&&panel.open&&!workspace.hidden&&!document.hidden;
const csrf=/^[a-f0-9]{64}$/i;
const uuid=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const hash=/^[a-f0-9]{64}$/i;
function cancel(){
 generation++;clearTimeout(timer);timer=null;
 activeRequest?.abort();activeRequest=null;
 remaining=0;busy=false;inspect.disabled=false;run.disabled=false;
}
async function request(path,body,abort){
 const opt={credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'},
   signal:abort?.signal};
 if(body){
   const s=await fetch('/api/admin/operations/session',opt);
   if(!s.ok)throw Error('MFA_SESSION_UNAVAILABLE');
   const session=await s.json();
   if(!session?.ok||session.mfaRequired!==false||!csrf.test(session.csrfToken||''))
     throw Error('MFA_REQUIRED');
   opt.method='POST';
   opt.headers['X-CSRF-Token']=session.csrfToken;
   opt.headers['Content-Type']='application/json';
   opt.body=JSON.stringify(body);
 }
 const response=await fetch(path,opt);
 if(!response.ok)throw Error('SERVER_UNAVAILABLE');
 const data=await response.json();
 if(data?.ok!==true)throw Error('SERVER_CONTRACT_INVALID');
 return data;
}
function drawPreflight(data){
 if(data.schema!=='jr.jrei.python-canary-preflight.v1')throw Error('CONTRACT_INVALID');
 const bits=[
   [data.motherTableReady,T('جدول مأموریت','Mission table')],
   [data.signedPythonHealthTableReady,T('جدول گزارش سلامت','Health record table')],
   [data.canaryFeatureEnabled,T('مجوز اجرای محدود','Bounded execution permission')],
   [data.signedPythonReportingEnabled,T('گزارش امضاشده','Signed reporting')],
   [data.freshEnabledNodeReports>0,T('گزارش تازه از Worker','Fresh signed worker report')]
 ];
 preflight.textContent=bits.map(([pass,label])=>
   (pass===true?T('آماده: ','Ready: '):T('آماده نیست: ','Not ready: '))+label
 ).join(' · ');
}
function drawJobs(data){
 if(data.schema!=='jr.jrei.python-canary-owner-snapshot.v1'||
   !Array.isArray(data.jobs))throw Error('CONTRACT_INVALID');
 history.replaceChildren();
 const entries=data.jobs.slice(0,10);
 if(entries.length===0){history.append(el('p',T('هنوز مأموریتی ثبت نشده است.','No mission has been submitted.')));return false;}
 const ul=el('ul');let pending=false;
 for(const item of entries){
   if(!uuid.test(item.jobId||''))continue;
   const state=String(item.state||'UNKNOWN');
   const completed=state==='COMPLETED'&&item.numerator===84&&
     item.denominator===1&&hash.test(item.resultSha256||'');
   if(state==='QUEUED'||state==='LEASED')pending=true;
   const desc=item.jobId.slice(0,8)+' · '+state+
     (completed?T(' · رسید ثبت‌شده: ۸۴',' · stored receipt: 84'):'');
   ul.append(el('li',desc));
 }
 history.append(ul);return pending;
}
async function refresh(token,auto=false){
 if(!isActive()||busy||token!==generation)return;
 busy=true;inspect.disabled=true;run.disabled=true;
 const ac=new AbortController();activeRequest=ac;
 try{
   if(!auto){
     const evidence=await request('/api/admin/operations/jrei-python-canary/preflight',null,ac);
     if(token!==generation||!isActive())return;
     drawPreflight(evidence);
   }
   const data=await request('/api/admin/operations/jrei-python-canary',null,ac);
   if(token!==generation||!isActive())return;
   const pending=drawJobs(data);
   status.textContent=pending
     ?T('مأموریت هنوز در صف یا در حال اجراست؛ نتیجه خودکار بررسی می‌شود.',
         'The mission is queued or leased; receipt will refresh automatically.')
     :T('وضعیت واقعی از دیتابیس مادر دریافت شد.','Actual state read from the mother database.');
   if(pending&&remaining>0){remaining--;timer=setTimeout(()=>refresh(token,true),10000);}
 }catch(e){
   if(token===generation&&isActive()&&e?.name!=='AbortError')
     status.textContent=T(
       'امکان دریافت وضعیت وجود ندارد؛ هیچ نتیجه‌ای را موفق فرض نکنید.',
       'Status cannot be retrieved; no success is inferred.');
 }finally{
   if(activeRequest===ac)activeRequest=null;
   busy=false;inspect.disabled=false;run.disabled=false;
 }
}
async function create(){
 if(!isActive()||busy)return;
 cancel();const token=generation;
 busy=true;run.disabled=true;inspect.disabled=true;
 status.textContent=T('در حال ثبت درخواست با نشست مدیریتی…','Submitting via the existing owner session…');
 const ac=new AbortController();activeRequest=ac;
 try{
   const key=Array.from(crypto.getRandomValues(new Uint8Array(16)))
     .map(x=>x.toString(16).padStart(2,'0')).join('');
   const created=await request('/api/admin/operations/jrei-python-canary',{
     action:'run-fixed-arithmetic',requestKey:key
   },ac);
   if(token!==generation||!isActive())return;
   if(created.schema!=='jr.jrei.python-canary-owner-receipt.v1'||
     !uuid.test(created.jobId||''))throw Error('CONTRACT_INVALID');
   status.textContent=T('مأموریت ثبت شد؛ تا مشاهدهٔ رسید، موفقیت اجرا تأیید نیست.',
     'Job queued; execution is unverified until a stored completion receipt appears.');
   remaining=12;
 }catch(e){
   if(token===generation&&isActive()&&e?.name!=='AbortError')
     status.textContent=T('ثبت مأموریت تأیید نشد؛ نشست MFA، مجوز یا دیتابیس را بررسی کنید.',
       'Mission submission unconfirmed. Check owner MFA, feature gate and mother DB.');
 }finally{
   if(activeRequest===ac)activeRequest=null;
   busy=false;run.disabled=false;inspect.disabled=false;
 }
 if(token===generation&&isActive()&&remaining>0)refresh(token,false);
}
inspect.addEventListener('click',()=>{cancel();remaining=12;refresh(generation,false);});
run.addEventListener('click',create);
panel.addEventListener('toggle',()=>{cancel();if(isActive())refresh(generation,false);});
root.addEventListener('toggle',()=>{if(!root.open)cancel();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)cancel();});
window.addEventListener('pagehide',cancel);
workspace.addEventListener('jr:operations-locked',cancel);
})();
