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
const inventory=el('button',T('ساختار واقعی دیتابیس مادر','Inspect mother DB structure'));inventory.type='button';
buttons.append(inspect,run,inventory);panel.append(buttons);
const preflight=el('p');preflight.setAttribute('aria-live','polite');
const status=el('p',T('در انتظار استعلام وضعیت واقعی…','Awaiting actual status query…'));
status.setAttribute('role','status');status.setAttribute('aria-live','polite');
const history=el('div');
const inventoryView=el('details');
const inventoryCaption=el('summary',T('ساختار جدول‌های JREI در drjavad1_store','JREI tables in drjavad1_store'));
inventoryView.append(inventoryCaption);
const inventoryStatus=el('p',T('این نما فقط پس از درخواست مدیر، فرادادهٔ جدول‌ها را می‌خواند.','This view reads only table metadata on explicit owner request.'));
inventoryStatus.setAttribute('aria-live','polite');
const inventoryResults=el('div');
inventoryView.append(inventoryStatus,inventoryResults);
panel.append(preflight,status,history,inventoryView);
root.append(panel);
let timer=null,activeRequest=null,busy=false,generation=0,remaining=0;
let inventoryAbort=null,inventoryBusy=false;
const isActive=()=>root.open&&panel.open&&!workspace.hidden&&!document.hidden;
const csrf=/^[a-f0-9]{64}$/i;
const uuid=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const hash=/^[a-f0-9]{64}$/i;
function cancel(){
 generation++;clearTimeout(timer);timer=null;
 activeRequest?.abort();activeRequest=null;
 remaining=0;busy=false;inspect.disabled=false;run.disabled=false;
 inventoryAbort?.abort();inventoryAbort=null;inventoryBusy=false;inventory.disabled=false;
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
   const stored=String(item.state||'UNKNOWN');
   const expired=item.effectiveState==='EXPIRED_BY_CLOCK'&&
     (stored==='QUEUED'||stored==='LEASED');
   // A read-only owner snapshot must not report a clock-expired job as
   // actively pending merely because no worker has updated its DB row.
   const state=expired?'EXPIRED_BY_CLOCK':stored;
   const completed=state==='COMPLETED'&&item.numerator===84&&
     item.denominator===1&&hash.test(item.resultSha256||'');
   if(state==='QUEUED'||state==='LEASED')pending=true;
   const readableState=expired
     ?T('مهلت سپری شده (ثبت‌شده: ','Deadline expired (stored: ')+stored+')'
     :state;
   const desc=item.jobId.slice(0,8)+' · '+readableState+
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
async function loadMotherInventory(){
 if(!isActive()||inventoryBusy)return;
 inventoryBusy=true;inventory.disabled=true;
 const token=generation;
 const ac=new AbortController();inventoryAbort=ac;
 inventoryStatus.textContent=T('در حال دریافت فرادادهٔ ساختاری…','Reading structural metadata…');
 try{
  const result=await request('/api/admin/operations/jrei-mother-schema/inventory',null,ac);
  if(token!==generation||!isActive())return;
  if(result.schema!=='jr.jrei.mother-structure-inventory.v1' ||
     result.targetSchema!=='drjavad1_store'||result.readOnly!==true ||
     result.provisioningOrMigrationExecuted!==false ||
     !result.groups||typeof result.groups!=='object')throw Error('INVALID_STRUCTURE_CONTRACT');
  inventoryResults.replaceChildren();
  const groups=['identity','hybrid','python_runtime','knowledge','news','examinations','operations'];
  const labels={
   identity:T('هویت','Identity'),hybrid:T('ارتباط امن','Signed hybrid worker'),
   python_runtime:T('هسته Python','Python runtime'),
   knowledge:T('دانش و منابع','Knowledge'),news:T('موتور خبر','News'),
   examinations:T('آزمون‌ها','Exams'),operations:T('عملیات','Operations')
  };
  for(const key of groups){
   const items=result.groups[key];
   if(!Array.isArray(items))throw Error('INVALID_STRUCTURE_GROUP');
   const block=el('details');
   const head=el('summary',labels[key]+' · '+items.filter(x=>x.status==='STRUCTURE_OBSERVED').length+'/'+items.length);
   block.append(head);
   const ul=el('ul');
   for(const x of items.slice(0,32)){
    if(!/^[a-z][a-z0-9_]{2,63}$/.test(x.name||''))continue;
    const state=['STRUCTURE_OBSERVED','NOT_OBSERVED_IN_TARGET_SCHEMA',
      'NOT_A_BASE_TABLE','ENGINE_NOT_INNODB'].includes(x.status)?x.status:'UNKNOWN';
    ul.append(el('li',x.name+' · '+state));
   }
   block.append(ul);inventoryResults.append(block);
  }
  inventoryView.open=true;
  inventoryStatus.textContent=result.pdoCurrentContextMatchesTarget
   ?T('فرادادهٔ واقعی از پایگاه مادر خوانده شد؛ این نتیجه به معنای نصب یا فعال‌سازی نیست.',
      'Mother metadata read. No installation or activation is inferred.')
   :T('هشدار: زمینهٔ SQL متفاوت است؛ داده‌ها فقط با نام صریح پایگاه مادر جست‌وجو شدند.',
      'SQL context differs; metadata was filtered by the explicit mother DB schema.');
 }catch(e){
  if(e?.name!=='AbortError'&&token===generation&&isActive())
   inventoryStatus.textContent=T('ساختار دیتابیس تأیید نشد؛ هیچ تغییری انجام نشد.',
     'Mother DB structure unavailable; no changes were made.');
 }finally{
  if(inventoryAbort===ac)inventoryAbort=null;
  inventoryBusy=false;inventory.disabled=false;
 }
}
inventory.addEventListener('click',loadMotherInventory);
inspect.addEventListener('click',()=>{cancel();remaining=12;refresh(generation,false);});
run.addEventListener('click',create);
panel.addEventListener('toggle',()=>{cancel();if(isActive())refresh(generation,false);});
root.addEventListener('toggle',()=>{if(!root.open)cancel();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)cancel();});
window.addEventListener('pagehide',cancel);
workspace.addEventListener('jr:operations-locked',cancel);
})();
