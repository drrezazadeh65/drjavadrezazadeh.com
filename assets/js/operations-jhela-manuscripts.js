/* Owner-only JHELA preliminary screening. Source of truth: authenticated mother DB. */
(()=>{'use strict';
const scope=document.getElementById('ops-workspace'),root=document.querySelector('[data-jhela-manuscript-owner]');
if(!scope||!root||!scope.contains(root))return;
const fa=document.documentElement.lang==='fa',t=(en,faText)=>fa?faText:en;
const button=root.querySelector('[data-jhela-manuscript-refresh]');
const status=root.querySelector('[data-jhela-manuscript-status]');
const panel=root.querySelector('[data-jhela-manuscript-results]');
const element=(tag,value)=>{const n=document.createElement(tag);if(value!==undefined)n.textContent=String(value);return n;};
const note=msg=>{status.textContent=msg;};
async function request(path,options={}){
 const r=await fetch(path,{credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json',...options.headers},...options});
 const data=await r.json().catch(()=>({}));
 if(!r.ok||data.ok!==true)throw Error(data.error||'unavailable');return data;
}
async function adminCsrf(){
 const session=await request('/api/admin/operations/session');
 if(session.mfaRequired||!session.csrfToken)throw Error('admin_mfa_required');
 return session.csrfToken;
}
const statuses={
 AWAITING_FILE:t('Awaiting PDF','در انتظار PDF'),
 PRELIMINARY_RECEIVED:t('PDF received','PDF دریافت شد'),
 UNDER_SCREENING:t('Preliminary screening','بررسی مقدماتی'),
 NEEDS_INFORMATION:t('Further information requested','نیازمند اطلاعات تکمیلی')
};
async function transition(record,next){
 const label=next==='UNDER_SCREENING'?t('Start or resume screening','شروع یا ادامه بررسی'):t('Request additional information','درخواست اطلاعات تکمیلی');
 if(!window.confirm(t('Confirm preliminary status change for ','تأیید تغییر وضعیت مقدماتی برای ')+record.tracking_code+'?'))return;
 note(t('Verifying administrator and recording the decision…','در حال تأیید مدیر و ثبت تغییر وضعیت…'));
 try{
  const csrf=await adminCsrf();
  await request('/api/admin/operations/jhela/manuscripts/triage',{method:'POST',
   headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},
   body:JSON.stringify({id:record.id,status:next})});
  await refresh();
 }catch(e){note(t('No change recorded: ','تغییری ثبت نشد: ')+e.message);}
}
function card(record){
 const c=element('article');c.className='ops-jhela-reviewer-card';
 c.append(element('h4',record.tracking_code+' · '+record.title));
 c.append(element('p',t('Author: ','نویسنده: ')+record.author_email));
 c.append(element('p',t('Article type: ','نوع مقاله: ')+record.article_type));
 c.append(element('p',t('Status: ','وضعیت: ')+(statuses[record.status]||record.status)));
 c.append(element('p',t('PDF: ','فایل: ')+(record.uploaded_at?record.original_filename||t('Received','دریافت شد'):t('Not uploaded','بارگذاری نشده'))));
 const actions=element('div');actions.className='ops-jhela-reviewer-decisions';
 let next=null;
 if(record.uploaded_at&&['PRELIMINARY_RECEIVED','NEEDS_INFORMATION'].includes(record.status))next='UNDER_SCREENING';
 else if(record.uploaded_at&&record.status==='UNDER_SCREENING')next='NEEDS_INFORMATION';
 if(next){
  const label=next==='UNDER_SCREENING'?t('Start / resume preliminary screening','شروع / ادامه بررسی مقدماتی'):t('Request additional information','درخواست اطلاعات تکمیلی');
  const b=element('button',label);b.type='button';b.addEventListener('click',()=>transition(record,next));actions.append(b);
 }
 c.append(actions);return c;
}
async function refresh(){
 button.disabled=true;panel.replaceChildren();note(t('Loading private manuscript metadata…','در حال دریافت اطلاعات محرمانه پرونده‌ها…'));
 try{
  await adminCsrf();
  const d=await request('/api/admin/operations/jhela/manuscripts');
  if(d.schema!=='jhela-owner-preliminary-queue-v1'||!Array.isArray(d.manuscripts))throw Error('invalid_response');
  if(!d.manuscripts.length)panel.append(element('p',t('No real manuscript submissions recorded.','هنوز پرونده واقعی دریافت نشده است.')));
  else d.manuscripts.forEach(x=>panel.append(card(x)));
  note(t('Preliminary records loaded; no formal peer-review or acceptance decisions are implied.','پرونده‌های مقدماتی دریافت شد؛ این مرحله به معنای داوری یا پذیرش نیست.'));
 }catch(e){
  note(e.message==='admin_mfa_required'?t('Complete administrator two-factor verification first.','ابتدا تأیید دومرحله‌ای مدیریت را تکمیل کنید.'):
   t('Records unavailable: ','دسترسی به پرونده‌ها ممکن نیست: ')+e.message);
 }finally{button.disabled=false;}
}
button.addEventListener('click',refresh);
})();
