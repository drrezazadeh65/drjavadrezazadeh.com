/* JREI APEX owner model-free skill discovery, source stage v1.
 * Existing original ops-workspace (SUPER_ADMIN, MFA, CSRF), no new login.
 * This is not a model chat, an owner command executor or production proof.
 * No personal text, tool commands, keys or endpoint URLs in browser.
 */
(()=>{
'use strict';
const root=document.getElementById('ops-jrei-learning');
const workspace=document.getElementById('ops-workspace');
if(!root||!workspace||document.getElementById('jr-jrei-python-skill-discovery'))return;
const en=document.documentElement.lang==='en';
const T=(fa,english)=>en?english:fa;
const text=(tag,value)=>{
 const e=document.createElement(tag);
 if(value!==undefined)e.textContent=value;
 return e;
};
const section=document.createElement('details');
section.id='jr-jrei-python-skill-discovery';
section.className='jr-jrei-learning-python-skill-discovery';
const summary=text('summary',T('مهارت‌های قطعی Python (بدون مدل زبانی)',
 'Python model-free skills (no language model required)'));
const note=text('p',T(
 'این فهرست صرفاً از سرویس خصوصی امضاشده خوانده می‌شود. هنگام خاموش بودن سرویس، هیچ اتصال یا توانایی ساختگی نمایش داده نمی‌شود. این بخش اجازهٔ خزش، تغییر دیتابیس یا اجرای دستور نمی‌دهد.',
 'Only the signed private Python service may supply this catalog. An offline service is never shown as connected. This panel cannot crawl, mutate a database or execute commands.'
));
const button=text('button',T('بررسی سرویس خصوصی و فهرست مهارت‌ها',
 'Check private service and registered skills'));
button.type='button';
const status=text('p',T('هنوز سرویس بررسی نشده است.','Private service not yet checked.'));
status.setAttribute('role','status');
status.setAttribute('aria-live','polite');
const content=text('div');
content.setAttribute('aria-live','off');
section.append(summary,note,button,status,content);
root.append(section);
let controller=null;
let serial=0;
const available=()=>root.open&&section.open&&!workspace.hidden&&!document.hidden;
function clear(){
 serial+=1;
 if(controller)controller.abort();
 controller=null;
 button.disabled=false;
 content.replaceChildren();
 status.textContent=T('بررسی انجام نشده یا به پایان رسیده است.',
  'Not checked or previous evidence cleared.');
}
async function check(){
 if(!available()||controller)return;
 const count=++serial;
 const abort=new AbortController();
 controller=abort;
 button.disabled=true;
 content.replaceChildren();
 status.textContent=T('در حال بررسی از مسیر اصلی احراز مدیر…',
  'Reading through the existing authenticated owner gateway…');
 try{
  const authResponse=await fetch('/api/admin/operations/session',{
   method:'GET',credentials:'same-origin',cache:'no-store',
   signal:abort.signal,headers:{'Accept':'application/json'}
  });
  if(!authResponse.ok)throw Error('MFA_REQUIRED');
  const auth=await authResponse.json();
  if(auth?.ok!==true||auth.mfaRequired!==false||
    !/^[0-9a-f]{64}$/i.test(auth.csrfToken||''))throw Error('MFA_REQUIRED');
  const res=await fetch('/api/admin/operations/jrei-python-skills',{
   method:'POST',credentials:'same-origin',cache:'no-store',signal:abort.signal,
   headers:{'Content-Type':'application/json','Accept':'application/json',
    'X-CSRF-Token':auth.csrfToken},
   body:JSON.stringify({action:'catalog'})
  });
  if(!res.ok)throw Error('PRIVATE_PYTHON_UNAVAILABLE');
  const data=await res.json();
  if(!available()||serial!==count)return;
  if(data?.ok!==true||
     data.schema!=='jr.jrei.owner-python-skill-view.v1'||
     data.productionSkillAccepted!==false||
     data.privilegedExecutionAllowed!==false)throw Error('INVALID_CONTRACT');
  if(data.status==='PRIVATE_PYTHON_NOT_ENABLED'){
   status.textContent=T(
    'سرویس Python هنوز از سوی سرور فعال نشده است؛ هیچ مهارت زنده‌ای تأیید نمی‌شود.',
    'Private Python service is not enabled. No hosted skill availability is claimed.');
   return;
  }
  if(data.status!=='PRIVATE_SKILL_RESPONSE_RECEIVED'||
     data.result?.schema_version!=='jr.jrei.skill-catalog.v1'||
     data.result.privileged_execution_enabled!==false||
     !Array.isArray(data.result.skills))throw Error('INVALID_CATALOG');
  status.textContent=T(
   'پاسخ واقعی از سرویس خصوصی دریافت شد؛ قابلیت‌ها محدود به پیشنهاد هستند.',
   'Private service responded; these capabilities remain advisory only.');
  const list=text('ul');
  for(const skill of data.result.skills.slice(0,16)){
   if(typeof skill.skill_id!=='string'||skill.skill_id.length>120||
      skill.mutates_mother_db!==false||skill.network_access!==false)continue;
   const item=text('li');
   const name=text('strong',skill.skill_id);
   const desc=text('span',' — '+String(skill.execution||'UNKNOWN'));
   item.append(name,desc);
   list.append(item);
  }
  content.replaceChildren(list,text('p',T(
   'تأیید علمی، اتصال مدل، پایگاه داده و اجرای مأموریت از این پاسخ نتیجه نمی‌شود.',
   'Neither scientific validation, model connectivity, DB access nor task execution is inferred.')));
 }catch{
  if(available()&&serial===count){
   content.replaceChildren();
   status.textContent=T(
    'سرویس خصوصی پاسخ قابل تأیید نداد یا نشست مدیر معتبر نبود؛ وضعیت نامعلوم است.',
    'No trusted private Python response or owner session; state remains UNKNOWN.');
  }
 }finally{
  if(serial===count){controller=null;button.disabled=false;}
 }
}
button.addEventListener('click',check);
section.addEventListener('toggle',()=>{if(!section.open)clear();});
root.addEventListener('toggle',()=>{if(!root.open)clear();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)clear();});
window.addEventListener('pagehide',clear);
document.addEventListener('jr:account-logout',clear);
})();
