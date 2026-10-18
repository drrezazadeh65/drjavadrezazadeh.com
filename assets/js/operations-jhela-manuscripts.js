/* Native JHELA preliminary editorial screening; fresh owner MFA required.
 * Private manuscript text is rendered with textContent, never HTML.
 * No PDF download, peer-review, acceptance, DOI or payment controls here.
 */
(()=>{'use strict';
const scope=document.getElementById('ops-workspace');
const root=document.querySelector('[data-jhela-manuscript-owner]');
if(!scope||!root||!scope.contains(root))return;
const fa=document.documentElement.lang==='fa';
let canDownloadFiles=false;
const t=(en,faText)=>fa?faText:en;
const button=root.querySelector('[data-jhela-owner-ms-refresh]');
const status=root.querySelector('[data-jhela-owner-ms-status]');
const panel=root.querySelector('[data-jhela-owner-ms-results]');
const el=(tag,value)=>{const x=document.createElement(tag);if(value!==undefined)x.textContent=value;return x;};
const note=s=>{status.textContent=s;};
async function request(url,options={}){
 const r=await fetch(url,{credentials:'same-origin',cache:'no-store',
  headers:{Accept:'application/json',...(options.body?{'Content-Type':'application/json'}:{})},...options});
 const data=await r.json().catch(()=>({}));
 if(!r.ok||data.ok!==true)throw Error(data.error||'journal_unavailable');
 return data;
}
async function session(){
 const d=await request('/api/admin/operations/session');
 if(d.mfaRequired||!d.csrfToken)throw Error('admin_mfa_required');
 return d.csrfToken;
}
async function screen(m,next,reason){
 const action=t('Confirm preliminary screening action?','تغییر وضعیت بررسی مقدماتی تأیید می‌شود؟');
 if(!window.confirm(action))return;
 try{
  const csrf=await session();
  await request('/api/admin/operations/jhela/manuscripts/screen',{
   method:'POST',
   headers:{Accept:'application/json','Content-Type':'application/json','X-CSRF-Token':csrf},
   body:JSON.stringify({id:m.id,status:next,message:reason||''})
  });
  note(t('Preliminary screening decision recorded.','تصمیم بررسی مقدماتی ثبت شد.'));
  await refresh();
 }catch(err){note(t('Decision not saved: ','تصمیم ثبت نشد: ')+err.message);}
}
function details(label,value){
 const section=el('details'),heading=el('summary',label),body=el('p',value||'—');
 section.append(heading,body);return section;
}
function card(m){
 const item=el('article');item.className='ops-jhela-reviewer-card';
 item.append(el('h4',m.tracking_code+' · '+m.title));
 item.append(el('p',t('Author: ','نویسنده: ')+(m.public_name||'—')+' · '+(m.affiliation||'—')));
 item.append(el('p',t('Private contact: ','ایمیل محرمانه: ')+m.author_email));
 item.append(el('p',t('Type: ','نوع مقاله: ')+m.article_type+
  ' · '+t('Status: ','وضعیت: ')+m.status));
 item.append(el('p',t('Secure receipt: ','رسید امن: ')+
  (m.uploaded_at&&m.manuscript_sha256?t('Verified metadata','فراداده ثبت‌شده'):
   t('PDF not yet received','فایل هنوز دریافت نشده است'))));
 if(canDownloadFiles&&m.uploaded_at&&m.manuscript_sha256){
  const link=el('a',t('Download confidential manuscript PDF','دریافت محرمانه فایل PDF مقاله'));
  link.href='/api/admin/operations/jhela/manuscripts/file?id='+encodeURIComponent(m.id);
  link.className='button';link.rel='nofollow';item.append(link);
 }
 item.append(details(t('Abstract and keywords','چکیده و کلیدواژه‌ها'),
  (m.abstract_text||'')+'\n'+(m.keywords_text||'')));
 item.append(details(t('Research ethics declaration','اظهارنامه اخلاق پژوهش'),m.declarations));
 const allowed=['PRELIMINARY_RECEIVED','UNDER_SCREENING','AUTHOR_INFORMATION_RECEIVED'];
 if(allowed.includes(m.status)&&m.uploaded_at&&m.manuscript_sha256){
  const actions=el('div');actions.className='ops-jhela-reviewer-decisions';
  if(m.status!=='UNDER_SCREENING'){
   const start=el('button',t('Start preliminary screening','آغاز بررسی مقدماتی'));
   start.type='button';start.addEventListener('click',()=>screen(m,'UNDER_SCREENING',''));actions.append(start);
  }
  const form=el('form'),label=el('label',t('Information required from author (20–500 characters)','اطلاعات موردنیاز از نویسنده (۲۰ تا ۵۰۰ نویسه)'));
  const field=el('textarea');field.required=true;field.minLength=20;field.maxLength=500;field.rows=3;
  label.append(field);form.append(label);
  const ask=el('button',t('Request author information','درخواست تکمیل اطلاعات'));
  ask.type='submit';form.append(ask);
  form.addEventListener('submit',e=>{e.preventDefault();if(field.value.trim().length<20)return;screen(m,'NEEDS_INFORMATION',field.value);});
  actions.append(form);
  // Desk decline is a reasoned, auditable pre-review decision, not peer review.
  if(m.status==='UNDER_SCREENING'){
   const decline=el('form');
   const reasonLabel=el('label',t('Reasoned desk decision (40–1000 characters)',
    'دلیل مستند تصمیم اولیه سردبیری (۴۰ تا ۱۰۰۰ نویسه)'));
   const reason=el('textarea');reason.required=true;reason.minLength=40;reason.maxLength=1000;reason.rows=4;
   reasonLabel.append(reason);decline.append(reasonLabel);
   const decision=el('button',t('Decline before peer review','عدم پذیرش در بررسی مقدماتی'));
   decision.type='submit';decline.append(decision);
   decline.addEventListener('submit',e=>{
    e.preventDefault();if(reason.value.trim().length<40)return;
    screen(m,'DESK_DECLINED',reason.value);
   });
   actions.append(decline);
  }
  item.append(actions);
 }
 return item;
}
async function refresh(){
 button.disabled=true;panel.replaceChildren();
 note(t('Reading secure preliminary manuscript queue…','در حال دریافت صف محرمانه بررسی مقدماتی…'));
 try{
  await session();
  const d=await request('/api/admin/operations/jhela/manuscripts');
  if(d.schema!=='jhela-native-owner-screening-v1'||!Array.isArray(d.manuscripts))throw Error('invalid_queue');
  canDownloadFiles=d.canDownloadFiles===true;
  if(!d.manuscripts.length)panel.append(el('p',t('No manuscripts have been received.','هنوز مقاله‌ای دریافت نشده است.')));
  else d.manuscripts.forEach(m=>panel.append(card(m)));
  note(t('Preliminary screening only; this does not constitute peer review or acceptance.',
    'صرفاً بررسی مقدماتی؛ این مرحله به معنای داوری یا پذیرش مقاله نیست.'));
 }catch(err){
  note(err.message==='admin_mfa_required'?
   t('Complete administrator two-factor verification first.','ابتدا تأیید دومرحله‌ای مدیریت را تکمیل کنید.'):
   t('Private queue unavailable: ','صف محرمانه در دسترس نیست: ')+err.message);
 }finally{button.disabled=false;}
}
button.addEventListener('click',refresh);
})();
