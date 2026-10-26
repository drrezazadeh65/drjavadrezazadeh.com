/* APEX signed-worker observation seam. Source-only, OFF by default.
 * The original worker has exactly one authorised type: PUBLIC retrieval
 * evaluation; this panel NEVER queues, dispatches, cancels or leases a job.
 * All writes go through the existing SUPER_ADMIN MFA / CSRF operations route.
 */
(()=>{
'use strict';
const parent=document.getElementById('ops-jrei-command-room');
const root=document.getElementById('ops-jrei-learning');
const workspace=document.getElementById('ops-workspace');
if(!parent||!root||!workspace||document.getElementById('ops-jrei-worker-observations'))return;
const en=document.documentElement.lang==='en';
const T=(f,e)=>en?e:f;
const endpoint='/api/admin/operations/jrei-apex-worker-observations';
const missionEndpoint='/api/admin/operations/jrei-apex-missions';
const element=(tag,label)=>{
 const e=document.createElement(tag);
 if(label!==undefined)e.textContent=label;
 return e;
};
const section=element('details');
section.id='ops-jrei-worker-observations';
const title=element('summary',T('ارتباط با Worker امضاشده · شواهد Lease و Checkpoint',
 'Signed-worker linkage · lease evidence & checkpoints'));
const description=element('p',T(
 'فقط می‌توان یک مأموریت بازبینی شواهد یادگیری را به یک Job از قبل موجود و متعلق به همین مدیر پیوند داد. این صفحه هیچ وظیفه‌ای اجرا یا لغو نمی‌کند؛ لغو Job فقط در پنل اصلی Worker انجام می‌شود.',
 'Only a learning-evidence mission may be linked to an already existing job owned by this administrator. This screen never runs or cancels a job; use the original Worker panel for job cancellation.'
));
const toolbar=element('div');toolbar.className='jr-jrei-apex-tools';
const refresh=element('button',T('خواندن شواهد موجود','Load existing worker evidence'));
refresh.type='button';toolbar.append(refresh);
const status=element('p',T('وضعیت اتصال هنوز بررسی نشده است.','Link status has not been checked.'));
status.setAttribute('role','status');status.setAttribute('aria-live','polite');
const form=element('form');form.className='jr-jrei-apex-tools';
const missionLabel=element('label',T('مأموریت ثبت‌شدهٔ بازبینی یادگیری','Existing learning-evidence mission'));
const missionSelect=element('select');missionSelect.required=true;
missionLabel.append(missionSelect);
const jobLabel=element('label',T('Job موجود و ثبت‌شده در صف امضاشده','Existing signed-worker queue job'));
const jobSelect=element('select');jobSelect.required=true;
jobLabel.append(jobSelect);
const acknowledgement=element('label');
const agreed=element('input');agreed.type='checkbox';agreed.required=true;
acknowledgement.append(agreed,document.createTextNode(T(
 ' می‌دانم این پیوند نه مجوز اجراست و نه تأیید علمی نتیجه.',
 ' I understand linking is neither dispatch permission nor scientific validation.'
)));
const link=element('button',T('ثبت پیوند به Job موجود','Link existing job'));
link.type='submit';link.disabled=true;
form.append(missionLabel,jobLabel,acknowledgement,link);
const results=element('div');
const journal=element('details');
journal.append(element('summary',T('سابقهٔ ثبت Checkpoint','Recorded checkpoint history')));
const journalList=element('div');journal.append(journalList);
section.append(title,description,toolbar,form,status,results,journal);
parent.append(section);
let abort=null,serial=0,busy=false,owner=null,worker=null;
const active=()=>parent.open&&root.open&&section.open&&!workspace.hidden&&!document.hidden;
function reset(){
 serial+=1;abort?.abort();abort=null;busy=false;owner=null;worker=null;
 missionSelect.replaceChildren();jobSelect.replaceChildren();results.replaceChildren();
 journalList.replaceChildren();link.disabled=true;refresh.disabled=false;
 status.textContent=T('برای مشاهدهٔ داده‌های سرور این بخش را باز کنید.',
 'Open this panel to read server evidence.');
}
const noData=(sel,label)=>{
 sel.replaceChildren();
 const option=element('option',label);option.value='';sel.append(option);
};
function linkedEvidence(item){
 const article=element('article');article.className='jr-jrei-apex-mission';
 article.append(element('strong',T('مأموریت: ','Mission: ')+String(item.missionId)));
 article.append(element('p',T('Job: ','Job: ')+String(item.jobId)));
 article.append(element('p',T('وضعیت Job: ','Job state: ')+String(item.jobStatus||'UNKNOWN')));
 article.append(element('p',T('برداشت از شواهد: ','Evidence meaning: ')+String(item.observationCode||'UNKNOWN')));
 article.append(element('small',T('آخرین Checkpoint ثبت‌شده: ','Latest checkpoint: ')+
   String(item.lastCheckpointSequence??0)));
 if(item.canCancelOnlyViaExistingHybridOwner!==true)return article;
 const button=element('button',T('ثبت Checkpoint جدید','Record a new checkpoint'));
 button.type='button';button.disabled=busy;
 button.addEventListener('click',()=>send({
  action:'checkpoint',missionId:item.missionId
 }));
 article.append(button);
 return article;
}
function populateSelections(){
 noData(missionSelect,T('انتخاب مأموریت','Choose mission'));
 const missions=(owner?.missions||[]).filter(m=>
   m.intent==='LEARNING_EVIDENCE_REVIEW'&&m.status==='PLANNED'
   &&typeof m.missionId==='string');
 for(const m of missions){
  const option=element('option',m.missionId);option.value=m.missionId;
  missionSelect.append(option);
 }
 const recalc=()=>{
  noData(jobSelect,T('انتخاب Job موجود','Choose existing job'));
  const chosen=missions.find(m=>m.missionId===missionSelect.value);
  const jobs=(worker?.availableOwnedJobs||[]).filter(j=>
   chosen&&Number.isSafeInteger(j.queuedAt)&&j.queuedAt>=chosen.createdAt);
  for(const job of jobs){
   const option=element('option',String(job.jobId)+' · '+String(job.state));
   option.value=job.jobId;jobSelect.append(option);
  }
  link.disabled=!(owner?.ownerWritePrivateFlagEnabled===true&&
   owner?.planningEnabled===true&&owner?.emergencyStop===false&&
   owner?.executionEnabled===false&&
   worker?.privateOwnerLinkEnabled===true&&
   worker?.motherDbLinkTablesReady===true&&jobs.length);
 };
 missionSelect.onchange=recalc;
 recalc();
}
function render(){
 results.replaceChildren();journalList.replaceChildren();populateSelections();
 for(const job of (worker?.linkedJobs||[]).slice(0,40)){
  if(typeof job.missionId==='string'&&typeof job.jobId==='string')
   results.append(linkedEvidence(job));
 }
 if(!results.childElementCount)results.append(element('p',T(
  'هنوز Job به مأموریت مالک پیوند نخورده است.',
  'No existing worker job has been linked to this owner mission.'
 )));
 const ordered=element('ol');
 for(const ev of (worker?.checkpoints||[]).slice(0,100)){
  const li=element('li',String(ev.observationCode||'UNKNOWN')+
   ' · '+String(ev.missionId||'')+' · '+String(ev.checkpointSha256||''));
  ordered.append(li);
 }
 journalList.append(ordered);
 status.textContent=worker?.motherDbLinkTablesReady!==true
 ?T('Migration مربوط به اتصال Worker نصب نشده یا در دسترس نیست.',
   'Worker observation migration is not installed or unavailable.')
 :T('شواهد دیتابیس خوانده شد؛ نتیجهٔ Job همچنان مستقل و تأییدنشده است.',
   'Recorded job metadata read. Worker results remain independently unverified.');
}
async function csrf(signal){
 const response=await fetch('/api/admin/operations/session',{
  cache:'no-store',credentials:'same-origin',signal,headers:{Accept:'application/json'}
 });
 if(!response.ok)throw Error('OWNER_SESSION_MISSING');
 const data=await response.json();
 if(data?.ok!==true||data.mfaRequired!==false||
  !/^[a-f0-9]{64}$/i.test(data.csrfToken||''))throw Error('OWNER_MFA_REQUIRED');
 return data.csrfToken;
}
async function jsonRequest(url,signal,body=null,token=''){
 const opts={cache:'no-store',credentials:'same-origin',signal,
  headers:{Accept:'application/json'}};
 if(body!==null){
  opts.method='POST';
  opts.headers={'Content-Type':'application/json','Accept':'application/json',
   'X-CSRF-Token':token};
  opts.body=JSON.stringify(body);
 }
 const response=await fetch(url,opts);
 if(!response.ok)throw Error('PRIVATE_SERVER_UNAVAILABLE');
 return response.json();
}
async function send(body=null){
 if(!active()||busy)return;
 const round=++serial,ctl=new AbortController();abort=ctl;
 busy=true;refresh.disabled=true;link.disabled=true;
 status.textContent=T('در حال خواندن اطلاعات واقعی سرور…',
  'Reading actual server evidence…');
 try{
  const token=await csrf(ctl.signal);
  const pair=await Promise.all([
   jsonRequest(missionEndpoint,ctl.signal),
   jsonRequest(endpoint,ctl.signal,body,token)
  ]);
  if(round!==serial||!active())return;
  if(pair[0]?.ok!==true||
    pair[0].schema!=='jr.jrei.apex-owner-missions.v1'||
    pair[1]?.ok!==true||
    pair[1].schema!=='jr.jrei.apex-worker-observations.v1'||
    pair[1].workerDispatchImplemented!==false)throw Error('CONTRACT_MISMATCH');
  owner=pair[0];worker=pair[1];render();
 }catch{
  if(round===serial&&active()){
   owner=null;worker=null;results.replaceChildren();journalList.replaceChildren();
   link.disabled=true;
   status.textContent=T(
    'وضعیت نامعلوم است؛ درخواست ممکن است ثبت شده باشد. قبل از هر اقدام دوباره داده‌ها را بخوانید.',
    'Outcome unknown; a request may have committed. Reload source evidence before another action.'
   );
  }
 }finally{
  if(round===serial){abort=null;busy=false;refresh.disabled=false;if(owner&&worker)render();}
 }
}
refresh.addEventListener('click',()=>send());
form.addEventListener('submit',e=>{
 e.preventDefault();
 if(!active()||busy||link.disabled||!agreed.checked)return;
 const mission=owner?.missions?.find(x=>x.missionId===missionSelect.value);
 const job=worker?.availableOwnedJobs?.find(x=>x.jobId===jobSelect.value);
 if(!mission||!job||!Number.isSafeInteger(job.revision))return;
 send({action:'link',missionId:mission.missionId,jobId:job.jobId,
  expectedJobRevision:job.revision,
  confirmation:'LINK_EXISTING_OWNED_RETRIEVAL_JOB_ONLY'});
});
section.addEventListener('toggle',()=>{if(active())send();else reset();});
parent.addEventListener('toggle',()=>{if(!parent.open)reset();});
root.addEventListener('toggle',()=>{if(!root.open)reset();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)reset();});
document.addEventListener('jr:account-logout',reset);
window.addEventListener('pagehide',reset);
reset();
})();
