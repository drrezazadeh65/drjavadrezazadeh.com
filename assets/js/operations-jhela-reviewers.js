/* JHELA owner-only academic reviewer screening. Every decision uses the already-active fresh-MFA admin session. */
(()=>{'use strict';
const scope=document.getElementById('ops-workspace'),root=document.querySelector('[data-jhela-reviewer-owner]');
if(!scope||!root||!scope.contains(root))return;
const fa=document.documentElement.lang==='fa',t=(en,faText)=>fa?faText:en;
const button=root.querySelector('[data-jhela-owner-review-refresh]');
const status=root.querySelector('[data-jhela-owner-review-status]');
const panel=root.querySelector('[data-jhela-owner-review-results]');
let lockEpoch=0;
scope.addEventListener('jr:operations-locked',()=>{
 lockEpoch++;panel.replaceChildren();button.disabled=false;status.textContent='';
});
const element=(name,text)=>{const x=document.createElement(name);if(text!==undefined)x.textContent=text;return x;};
const note=(message)=>{status.textContent=message;};
async function request(url,opt={}){
 const r=await fetch(url,{credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json',...(opt.body?{'Content-Type':'application/json'}:{})},...opt});
 const j=await r.json().catch(()=>({}));
 if(!r.ok||j.ok!==true)throw Error(j.error||'not_available');return j;
}
async function session(){
 const x=await request('/api/admin/operations/session');
 if(x.mfaRequired||!x.csrfToken)throw Error('admin_mfa_required');
 return x.csrfToken;
}
async function decide(item,decision){
 if(scope.hidden)return;
 const epoch=lockEpoch;
 if(!window.confirm(t('Confirm '+decision+' for '+item.academic_name+'?','تأیید تصمیم '+decision+' برای '+item.academic_name+'؟')))return;
 note(t('Checking owner MFA and saving the decision…','در حال بررسی تأیید دومرحله‌ای و ثبت تصمیم…'));
 try{
  const csrf=await session();
  if(scope.hidden||epoch!==lockEpoch)return;
  await request('/api/admin/operations/jhela/reviewers/decision',{method:'POST',
   headers:{Accept:'application/json','Content-Type':'application/json','X-CSRF-Token':csrf},
   body:JSON.stringify({id:item.id,decision})});
  if(scope.hidden||epoch!==lockEpoch)return;
  await refresh();
 }catch(err){if(scope.hidden||epoch!==lockEpoch)return;note(err.message==='admin_mfa_required'?t('Use the main admin TOTP verification first.','ابتدا تأیید دومرحله‌ای داشبورد اصلی مدیریت را انجام دهید.'):
 t('Decision was not recorded: ','تصمیم ثبت نشد: ')+err.message);}
}
function candidate(x){
 const card=element('article');card.className='ops-jhela-reviewer-card';
 card.append(element('h4',x.academic_name));
 card.append(element('p',[x.academic_rank,x.institution,x.country].filter(Boolean).join(' · ')));
 card.append(element('p',t('Current decision: ','وضعیت فعلی: ')+x.status));
 card.append(element('p',t('Private correspondence: ','ایمیل مکاتبات محرمانه: ')+x.private_contact_email));
 card.append(element('p',t('Fields: ','تخصص علمی: ')+x.expertise));
 card.append(element('p',t('Methods: ','روش‌شناسی: ')+x.methods));
 card.append(element('p',t('Professional CV: ','خلاصه رزومه: ')+x.cv_summary));
 card.append(element('p',t('Selected publications: ','آثار منتخب: ')+x.publications));
 card.append(element('p',t('Public CV consent: ','رضایت انتشار عمومی رزومه: ')+(Number(x.profile_public_consent)===1?t('Yes','بله'):t('No','خیر'))));
 const actions=element('div');actions.className='ops-jhela-reviewer-decisions';
 for(const [value,label] of [['APPROVED',t('Approve scientific application','تأیید صلاحیت علمی')],['REJECTED',t('Reject application','رد درخواست')],['REVOKED',t('Revoke appointment','لغو همکاری')]]){
  const action=element('button',label);action.type='button';action.addEventListener('click',()=>decide(x,value));actions.append(action);
 }
 card.append(actions);return card;
}
async function refresh(){
 if(scope.hidden)return;
 const epoch=lockEpoch;
 button.disabled=true;panel.replaceChildren();note(t('Loading confidential academic candidate records…','در حال دریافت درخواست‌های محرمانه همکاری علمی…'));
 try{
  await session();if(scope.hidden||epoch!==lockEpoch)return;
  const result=await request('/api/admin/operations/jhela/reviewers');
  if(scope.hidden||epoch!==lockEpoch)return;
  if(result.schema!=='jhela-owner-reviewer-queue-v1'||!Array.isArray(result.candidates))throw Error('invalid_source');
  if(!result.candidates.length)panel.append(element('p',t('No applicant profiles received yet.','هنوز درخواست همکاری علمی ثبت نشده است.')));
  else result.candidates.forEach(x=>panel.append(candidate(x)));
  note(t('Reviewer records loaded. Public visibility requires both approval and opt-in consent.','پرونده‌های علمی بارگذاری شد؛ انتشار عمومی نیازمند تأیید و رضایت جداگانه است.'));
 }catch(err){
  if(scope.hidden||epoch!==lockEpoch)return;
  note(err.message==='admin_mfa_required'?t('Complete administrator two-factor verification before reviewing candidates.','برای بررسی داوران ابتدا تأیید دومرحله‌ای مدیر را انجام دهید.'):
  t('Records unavailable: ','دریافت اطلاعات ممکن نیست: ')+err.message);
 }finally{if(epoch===lockEpoch)button.disabled=false;}
}
button.addEventListener('click',refresh);
})();