/* JREI APEX V2 -- owner mission journal (source only, default OFF).
 * This runs ONLY inside the existing operations MFA workspace; no separate
 * identity, no model-to-shell, no sensitive command free-text or localStorage.
 * A planned mission is never displayed as an executed/verified task.
 */
(()=>{
'use strict';
const root=document.getElementById('ops-jrei-learning');
const workspace=document.getElementById('ops-workspace');
if(!root||!workspace||document.getElementById('ops-jrei-command-room'))return;
const en=document.documentElement.lang==='en';
const T=(fa,english)=>en?english:fa;
const URL='/api/admin/operations/jrei-apex-missions';
const descriptions={
 'SEO_ROBOTS_DIAGNOSTIC':T('بررسی مسدودسازی ایندکس گوگل','Review Google indexing blocks'),
 'NEWS_INGESTION_DIAGNOSTIC':T('بررسی توقف دریافت اخبار','Review blocked news intake'),
 'JREI_NODE_HEALTH_REVIEW':T('بازبینی وضعیت واقعی گره‌ها','Review actual AI node health'),
 'EDUCATION_SOURCE_GAP_REVIEW':T('شکاف منابع علمی و آموزشی','Review education source gaps'),
 'MOTHER_DB_METADATA_REVIEW':T('بازبینی ساختار دیتابیس مادر','Review mother DB metadata'),
 'LEARNING_EVIDENCE_REVIEW':T('بازبینی شواهد یادگیری','Review learning evidence')
};
const make=(tag,content)=>{
 const e=document.createElement(tag);
 if(content!==undefined)e.textContent=content;
 return e;
};
const shell=make('details');
shell.id='ops-jrei-command-room';
shell.className='jr-jrei-apex-command-room';
shell.append(make('summary',T('اتاق فرمان JREI APEX · سابقهٔ پایدار مأموریت‌ها',
  'JREI APEX Command Room · durable mission journal')));
shell.append(make('p',T(
 'این بخش یک دفتر برنامه‌ریزی و ثبت رویداد است، نه اجرای خودکار دستور. همهٔ درخواست‌ها از همان ورود مدیر و احراز دومرحله‌ای استفاده می‌کنند. وضعیت انتشار و اتصال به سرویس مستقل‌اند.',
 'This records owner proposals and events; it does not automatically execute tools. The original admin login and MFA govern all operations. Production and worker readiness remain independent.'
)));
const toolbar=make('div');toolbar.className='jr-jrei-apex-tools';
const reload=make('button',T('خواندن وضعیت واقعی','Load server status'));reload.type='button';
const stop=make('button',T('توقف اضطراری برنامه‌ریزی','Emergency stop planning'));stop.type='button';
const resume=make('button',T('فعال‌سازی فقط برنامه‌ریزی','Resume planning only'));resume.type='button';
toolbar.append(reload,stop,resume);
const status=make('p',T('تا دریافت پاسخ سرور، وضعیت نامعلوم است.','Status unknown until the server responds.'));
status.setAttribute('role','status');status.setAttribute('aria-live','polite');
const request=make('form');request.className='jr-jrei-apex-tools';
const label=make('label',T('نوع مأموریت ثبت‌شدنی','Registered mission intent'));
const select=make('select');
select.required=true;
for(const [kind,description] of Object.entries(descriptions)){
 const opt=make('option',description);opt.value=kind;select.append(opt);
}
label.append(select);
const create=make('button',T('ثبت برنامهٔ قابل پیگیری','Register accountable plan'));
create.type='submit';
request.append(label,create);
const note=make('p',T(
 'هر مأموریت تنها شناسه، نوع درخواست، وضعیت و هش رویدادها را ذخیره می‌کند؛ متن خصوصی یا رمز وارد نمی‌شود. ساخت برنامه به معنی اجرای آن نیست.',
 'Only mission IDs, intent codes, states and event hashes are stored; private text or credentials are not collected. No work is executed on plan creation.'
));
const history=make('div');history.className='jr-jrei-apex-history';
const events=make('details');events.append(make('summary',T('رویدادهای ثبت‌شده','Recorded state events')));
const eventList=make('div');events.append(eventList);
shell.append(toolbar,request,note,status,history,events);
root.append(shell);
let controller=null, serial=0, busy=false, last=null, pendingKey=null, pendingIntent=null;
const current=()=>root.open&&shell.open&&!workspace.hidden&&!document.hidden;
const setStatus=value=>{status.textContent=value;};
const localTime=stamp=>{
 if(!Number.isSafeInteger(stamp)||stamp<=0)return T('نامعلوم','Unknown');
 return new Date(stamp*1000).toLocaleString(en?'en-US':'fa-IR');
};
const reset=()=>{
 serial+=1;controller?.abort();controller=null;busy=false;last=null;
 pendingKey=null;pendingIntent=null;
 history.replaceChildren();eventList.replaceChildren();
 create.disabled=true;resume.disabled=true;stop.disabled=true;
 reload.disabled=false;
 setStatus(T('ابتدا وضعیت را از سرور بخوانید.','Load current server status first.'));
};
function draw(data){
 history.replaceChildren();eventList.replaceChildren();
 last=data;
 const ready=data.motherDbSchemaReady===true;
 const ownerWrites=data.ownerWritePrivateFlagEnabled===true;
 const planning=data.planningEnabled===true;
 const halted=data.emergencyStop===true;
 const canCreate=ready&&ownerWrites&&planning&&!halted&&data.executionEnabled===false;
 create.disabled=!canCreate;
 resume.disabled=!ready||!ownerWrites||busy||canCreate;
 stop.disabled=!ready||halted||busy;
 if(!ready){
  setStatus(T('Migration مأموریت‌ها روی دیتابیس مادر نصب یا تأیید نشده است؛ هیچ عملیات زنده‌ای فعال نیست.',
    'The mission migration is absent or unverified in the mother DB; no live operations are enabled.'));
  return;
 }
 const facts=make('p',T(
  'دادهٔ واقعی دیتابیس: '+(halted?'توقف اضطراری فعال':'توقف اضطراری غیرفعال')+
   ' · ثبت برنامه '+(canCreate?'مجاز':'غیرفعال')+' · اجرای Worker غیرفعال است.',
  'Mother DB response: emergency stop '+(halted?'ON':'OFF')+
   ' · planning '+(canCreate?'enabled':'disabled')+' · worker execution not implemented.'));
 history.append(facts);
 const missions=Array.isArray(data.missions)?data.missions:[];
 if(!missions.length)history.append(make('p',T(
  'هیچ مأموریت ثبت‌شده‌ای برای این حساب گزارش نشده است.',
  'No recorded mission for this owner account.')));
 for(const mission of missions.slice(0,40)){
  if(typeof mission.missionId!=='string'||
    !/^[a-f0-9-]{36}$/i.test(mission.missionId))continue;
  const card=make('article');card.className='jr-jrei-apex-mission';
  const head=make('strong',descriptions[mission.intent]||mission.intent);
  const state=make('p',T('وضعیت: ','State: ')+String(mission.status||'UNKNOWN'));
  const recorded=make('small',T('ثبت: ','Recorded: ')+localTime(mission.createdAt));
  const id=make('code',mission.missionId);
  card.append(head,state,recorded,id);
  if(['PLANNED','AUTHORIZED','RUNNING','EXECUTED'].includes(mission.status)){
   const cancel=make('button',T('لغو یا ثبت نتیجهٔ نامعلوم','Cancel or record uncertain outcome'));
   cancel.type='button';cancel.disabled=busy;
   cancel.addEventListener('click',()=>post({action:'cancel',missionId:mission.missionId}));
   card.append(cancel);
  }
  history.append(card);
 }
 const rows=Array.isArray(data.events)?data.events:[];
 const list=make('ol');
 for(const event of rows.slice(0,60)){
  const li=make('li');
  li.append(make('strong',String(event.event||'UNKNOWN')));
  li.append(make('span',' — '+String(event.missionId||'').slice(0,8)+
   ' · '+localTime(event.recordedAt)));
  list.append(li);
 }
 eventList.append(list);
 setStatus(T(
  'ثبت رویدادها قابل مشاهده است؛ شواهد اجرای واقعی مأموریت هنوز تأیید نشده است.',
  'Recorded metadata is available; actual task execution has not been verified.'));
}
async function sessionCsrf(signal){
 const res=await fetch('/api/admin/operations/session',{
  credentials:'same-origin',cache:'no-store',signal,headers:{Accept:'application/json'}
 });
 if(!res.ok)throw Error('MFA_REQUIRED');
 const auth=await res.json();
 if(auth?.ok!==true||auth.mfaRequired!==false||
   !/^[a-f0-9]{64}$/i.test(auth.csrfToken||''))throw Error('MFA_REQUIRED');
 return auth.csrfToken;
}
async function run(body=null){
 if(!current()||busy)return;
 const marker=++serial;
 const ctl=new AbortController();controller=ctl;
 busy=true;reload.disabled=true;create.disabled=true;resume.disabled=true;stop.disabled=true;
 setStatus(T('در حال بررسی پاسخ سرویس مادر…','Reading authoritative mother DB response…'));
 try{
  const csrf=await sessionCsrf(ctl.signal);
  const opts={
   credentials:'same-origin',cache:'no-store',signal:ctl.signal,
   headers:{Accept:'application/json'}
  };
  if(body!==null){
   opts.method='POST';
   opts.headers={'Accept':'application/json','Content-Type':'application/json',
     'X-CSRF-Token':csrf};
   opts.body=JSON.stringify(body);
  }
  const response=await fetch(URL,opts);
  if(!response.ok)throw Error('SERVICE_UNAVAILABLE');
  const result=await response.json();
  if(serial!==marker||!current())return;
  if(result?.ok!==true||result.schema!=='jr.jrei.apex-owner-missions.v1'||
    result.workerDispatchImplemented!==false)throw Error('CONTRACT_INVALID');
  if(body?.action==='plan'){pendingKey=null;pendingIntent=null;}
  draw(result);
 }catch{
  if(serial===marker&&current()){
   last=null;history.replaceChildren();eventList.replaceChildren();
   setStatus(T(
    'پاسخ قطعی دریافت نشد. ثبت یا لغو ممکن است انجام شده باشد؛ قبل از تلاش مجدد وضعیت را تازه بخوانید.',
    'Outcome uncertain. A plan/cancel may have been recorded; reload authoritative state before retrying.'));
  }
 }finally{
  if(serial===marker){controller=null;busy=false;reload.disabled=false;
   if(last)draw(last);else{create.disabled=true;resume.disabled=true;stop.disabled=true;}
  }
 }
}
async function post(body){await run(body);}
reload.addEventListener('click',()=>run());
stop.addEventListener('click',()=>post({action:'emergency-stop'}));
resume.addEventListener('click',()=>post({action:'resume-planning'}));
select.addEventListener('change',()=>{pendingKey=null;pendingIntent=null;});
request.addEventListener('submit',event=>{
 event.preventDefault();
 if(!current()||busy||create.disabled)return;
 const intent=select.value;
 if(!Object.prototype.hasOwnProperty.call(descriptions,intent))return;
 if(!pendingKey||pendingIntent!==intent){
  const bytes=new Uint8Array(16);crypto.getRandomValues(bytes);
  pendingKey=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
  pendingIntent=intent;
 }
 post({action:'plan',intent,requestKey:pendingKey});
});
shell.addEventListener('toggle',()=>{if(shell.open&&root.open)run();else reset();});
root.addEventListener('toggle',()=>{if(!root.open)reset();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)reset();});
window.addEventListener('pagehide',reset);
document.addEventListener('jr:account-logout',reset);
reset();
})();
