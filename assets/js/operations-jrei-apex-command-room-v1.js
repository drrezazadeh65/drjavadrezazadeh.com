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
 'LEARNING_EVIDENCE_REVIEW':T('بازبینی شواهد یادگیری','Review learning evidence'),
 'WEBSITE_CODE_REVIEW':T('بررسی کد و پیشنهاد اصلاح ایمن سایت','Review site code and propose a safe patch'),
 'WEBSITE_SEO_GEO_REVIEW':T('ممیزی هوشمند سئو و دیده‌شدن در هوش مصنوعی','Review SEO and AI-search visibility'),
 'WEBSITE_DESIGN_ACCESSIBILITY_REVIEW':T('بازبینی طراحی موبایل و دسترس‌پذیری','Review mobile design and accessibility'),
 'WEBSITE_DATABASE_SCHEMA_REVIEW':T('ممیزی ساختار پایگاه داده مادر؛ فقط خواندنی','Review mother DB schema, read-only'),
 'WEBSITE_OPERATIONS_ENGINES_REVIEW':T('بازبینی موتورهای مدیریتی و گزارش‌گیری','Review operations engines and reports')
};
// Reuse the EXISTING seven low-risk executors, never a model-supplied tool.
const readonlyObservations=Object.freeze({
 WEBSITE_SEO_GEO_REVIEW:'ENG-01.ACT-011',
 WEBSITE_OPERATIONS_ENGINES_REVIEW:'ENG-11.ACT-009'
});
const diagnosticDimensions=Object.freeze({
 WEBSITE_SEO_GEO_REVIEW:['onPageSeo','geo','aiReadiness'],
 WEBSITE_DESIGN_ACCESSIBILITY_REVIEW:['mobile','ui','ux','accessibility']
});
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
const pythonLabel=make('label');
const pythonToggle=make('input');pythonToggle.type='checkbox';pythonToggle.disabled=true;
pythonLabel.append(pythonToggle,document.createTextNode(T(
 ' پیشنهاد برنامهٔ Python با قرارداد امضاشده؛ بدون اجرا',
 ' Signed Python planning proposal only; no execution'
)));
request.append(label,pythonLabel,create);
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
 pythonToggle.disabled=true;pythonToggle.checked=false;
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
 pythonToggle.disabled=!canCreate||data.pythonPlanningSourceEnabled!==true;
 if(pythonToggle.disabled)pythonToggle.checked=false;
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
  // This is a real owner-triggered existing read-only executor, not a
  // mission completion or authorization for JREI to change the website.
  const actionId=readonlyObservations[mission.intent];
  if(actionId&&mission.status==='PLANNED'&&!halted){
   const observe=make('button',T('اجرای مشاهدهٔ خواندنی ثبت‌شونده',
     'Run audited read-only observation'));
   observe.type='button';observe.disabled=busy;
   const receipt=make('p');
   observe.addEventListener('click',()=>runObservation(mission.missionId,actionId,observe,receipt));
   card.append(observe,receipt);
  }
  if(mission.status==='PLANNED'&&!halted&&
     (Object.hasOwn(diagnosticDimensions,mission.intent)||
      mission.intent==='WEBSITE_DATABASE_SCHEMA_REVIEW')){
   const inspect=make('button',T('مشاهدهٔ شواهد موجود سایت',
      'Inspect existing site evidence'));
   inspect.type='button';inspect.disabled=busy;
   const findings=make('div');
   inspect.addEventListener('click',()=>
     runSiteDiagnostics(mission.intent,inspect,findings));
   card.append(inspect,findings);
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
  if(event.event==='OWNER_READONLY_OBSERVATION_LINKED'&&
     /^[a-f0-9]{64}$/.test(event.sourceObservationRunId||'')){
   li.append(make('small',T(' · رسید مشاهده: ',' · linked observation: ')+
     event.sourceObservationRunId.slice(0,12)));
  }
  list.append(li);
 }
 eventList.append(list);
 setStatus(T(
  'ثبت رویدادها قابل مشاهده است؛ شواهد اجرای واقعی مأموریت هنوز تأیید نشده است.',
  'Recorded metadata is available; actual task execution has not been verified.'));
}
async function runSiteDiagnostics(intent,button,output){
 if(busy||!current()||
    !(Object.hasOwn(diagnosticDimensions,intent)||
      intent==='WEBSITE_DATABASE_SCHEMA_REVIEW'))return;
 const mark=++serial;
 busy=true;button.disabled=true;output.replaceChildren();
 const ctl=new AbortController();controller=ctl;
 output.append(make('p',T('در حال دریافت مشاهدات واقعی ذخیره‌شده…',
   'Reading existing source-derived evidence…')));
 try{
  if(intent==='WEBSITE_DATABASE_SCHEMA_REVIEW'){
   const res=await fetch('/api/admin/operations/jrei-mother-schema/inventory',{
    credentials:'same-origin',cache:'no-store',signal:ctl.signal,
    headers:{Accept:'application/json'}
   });
   if(!res.ok)throw Error('SCHEMA_INVENTORY_UNAVAILABLE');
   const data=await res.json();
   if(mark!==serial||!current())return;
   if(data?.ok!==true||
      data.schema!=='jr.jrei.mother-structure-inventory.v1'||
      data.targetSchema!=='drjavad1_store'||
      data.readOnly!==true||data.provisioningOrMigrationExecuted!==false||
      !data.groups||typeof data.groups!=='object')
     throw Error('SCHEMA_METADATA_INVALID');
   output.replaceChildren();
   for(const [group,items] of Object.entries(data.groups).slice(0,10)){
    if(!Array.isArray(items))continue;
    const confirmed=items.filter(row=>row?.status==='STRUCTURE_OBSERVED').length;
    output.append(make('p',group+': '+confirmed+'/'+items.length+
      T(' جدول مشاهده‌شده',' tables observed')));
   }
   output.append(make('small',T(
     'این اطلاعات فقط فرا‌دادهٔ پایگاه داده است؛ هیچ تغییری اعمال نشده.',
     'Database metadata only. No schema or data changes were made.')));
  }else{
   const dimensions=diagnosticDimensions[intent];
   // All dimensions and URL paths are static owner-console choices.
   // Results are heuristic SOURCE observations, never live PSI or rankings.
   const rows=[];
   for(const dimension of dimensions){
    const path='/api/admin/operations/page-quality?index=public&sort=weakest'+
      '&page=1&dimension='+encodeURIComponent(dimension);
    const res=await fetch(path,{credentials:'same-origin',
      cache:'no-store',signal:ctl.signal,headers:{Accept:'application/json'}});
    if(!res.ok)throw Error('SITE_SOURCE_INVENTORY_UNAVAILABLE');
    const data=await res.json();
    if(mark!==serial||!current())return;
    if(data?.ok!==true||data.schema!=='operations-page-quality-results-v1'||
       !['source_only','unavailable'].includes(data.status)||
       !Array.isArray(data.records)||data.records.length>50||
       data.status==='source_only'&&data.dimension!==dimension)
      throw Error('SITE_SOURCE_INVENTORY_INVALID');
    rows.push({dimension,data});
   }
   output.replaceChildren();
   for(const {dimension,data} of rows){
    const d=make('details');
    const summary=make('summary',dimension+' · '+
      (Number.isSafeInteger(data.total)?data.total:T('نامعلوم','unknown'))+
      T(' مسیر',' routes'));
    d.append(summary);
    const list=make('ul');
    for(const entry of data.records.slice(0,8)){
     if(typeof entry.route!=='string'||
        !/^\/(?:fa|en|journal)\/[a-zA-Z0-9/_-]*$/.test(entry.route))continue;
     const value=entry.grades?.[dimension];
     const grade=typeof value==='number'&&Number.isFinite(value)?
       value.toFixed(1):T('بدون نمره','not scored');
     list.append(make('li',entry.route+' · '+grade));
    }
    d.append(list);output.append(d);
   }
   output.append(make('small',T(
     'امتیازها بر پایهٔ تحلیل فایل‌های سایت‌اند؛ رتبهٔ گوگل یا ارزیابی زنده نیستند.',
     'Scores describe site-source heuristics, not verified rankings or live UX.')));
  }
 }catch{
  if(mark===serial&&current()){
   output.replaceChildren(make('p',T(
    'دادهٔ معتبر دریافت نشد. اجرای اصلاح یا ممیزی زنده تأیید نشده است.',
    'Verified source evidence unavailable; no live audit or correction is claimed.')));
  }
 }finally{
  if(mark===serial){controller=null;busy=false;button.disabled=false;}
 }
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
async function runObservation(missionId,actionId,button,receipt){
 if(!current()||busy||!Object.values(readonlyObservations).includes(actionId))return;
 const mark=++serial;
 busy=true;button.disabled=true;
 const ctl=new AbortController();controller=ctl;
 receipt.textContent=T('در حال مشاهدهٔ ایمن از موتور موجود…',
   'Running the existing bounded read-only observation…');
 try{
  const csrf=await sessionCsrf(ctl.signal);
  const bytes=new Uint8Array(16);crypto.getRandomValues(bytes);
  const requestKey=Array.from(bytes,x=>x.toString(16).padStart(2,'0')).join('');
  const response=await fetch('/api/admin/operations/action-runs',{
   method:'POST',credentials:'same-origin',cache:'no-store',signal:ctl.signal,
   headers:{Accept:'application/json','Content-Type':'application/json',
     'X-CSRF-Token':csrf},
   body:JSON.stringify({actionId,requestKey})
  });
  if(!response.ok)throw Error('READONLY_OBSERVATION_UNAVAILABLE');
  const data=await response.json();
  if(mark!==serial||!current())return;
  if(data?.ok!==true||data.schema!=='operations-readonly-action-run-v1'||
     data.run?.actionId!==actionId||
     !['succeeded','blocked','failed','interrupted'].includes(data.run?.status))
     throw Error('READONLY_OBSERVATION_RESULT_INVALID');
  if(!['succeeded','blocked'].includes(data.run.status)){
   receipt.textContent=T('مشاهده تکمیل نشده است: ','Observation not completed: ')+
     data.run.status;
   return;
  }
  if(!/^[a-f0-9]{64}$/.test(data.run.runId||''))
   throw Error('OBSERVATION_RUN_ID_UNVERIFIED');
  receipt.textContent=T('در حال پیوند دادن رسید به دفتر مأموریت…',
    'Attaching the audited observation to the mission ledger…');
  const attached=await fetch(URL,{
   method:'POST',credentials:'same-origin',cache:'no-store',signal:ctl.signal,
   headers:{Accept:'application/json','Content-Type':'application/json',
     'X-CSRF-Token':csrf},
   body:JSON.stringify({action:'link-observation',missionId,runId:data.run.runId})
  });
  if(!attached.ok)throw Error('MISSION_OBSERVATION_LINK_UNCONFIRMED');
  const snapshot=await attached.json();
  if(mark!==serial||!current())return;
  if(snapshot?.ok!==true||snapshot.schema!=='jr.jrei.apex-owner-missions.v1'||
     snapshot.workerDispatchImplemented!==false||
     !Array.isArray(snapshot.events)||
     !snapshot.events.some(item=>
       item.event==='OWNER_READONLY_OBSERVATION_LINKED'&&
       item.missionId===missionId&&item.sourceObservationRunId===data.run.runId))
    throw Error('MISSION_OBSERVATION_RECEIPT_UNVERIFIED');
  draw(snapshot);
  setStatus(T(
   'رسید مشاهده به مأموریت پیوند داده شد؛ اجرای مأموریت اصلی همچنان تأیید نشده است.',
   'Observation receipt linked to the mission; autonomous mission execution remains unverified.'));
 }catch{
  if(mark===serial&&current())receipt.textContent=T(
    'نتیجهٔ مشاهده قطعی نیست؛ سابقهٔ اجرا در گزارش عملیات بررسی شود.',
    'Observation outcome uncertain; review the existing operations action history.');
 }finally{
  if(mark===serial){controller=null;busy=false;button.disabled=false;}
 }
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
  if(['plan','plan-python'].includes(body?.action)){pendingKey=null;pendingIntent=null;}
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
pythonToggle.addEventListener('change',()=>{pendingKey=null;pendingIntent=null;});
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
 post({action:pythonToggle.checked?'plan-python':'plan',intent,
   requestKey:pendingKey});
});
shell.addEventListener('toggle',()=>{if(shell.open&&root.open)run();else reset();});
root.addEventListener('toggle',()=>{if(!root.open)reset();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)reset();});
window.addEventListener('pagehide',reset);
document.addEventListener('jr:account-logout',reset);
reset();
})();
