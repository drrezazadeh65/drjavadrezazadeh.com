/* Bertina owner MFA-protected author verification queue. No payout or signature actions. */
(()=>{'use strict';
const root=document.getElementById('ops-publishing-author-review');if(!root)return;
const box=document.getElementById('ops-publishing-author-results');
const state=document.getElementById('ops-publishing-author-status');
const refresh=document.getElementById('ops-publishing-author-refresh');
const el=(tag,text,cls='')=>{const v=document.createElement(tag);if(cls)v.className=cls;v.textContent=String(text??'');return v};
const api='/api/admin/operations/publishing/authors';
const status=s=>state.textContent=s;
async function check(res){const j=await res.json();if(!res.ok||j.ok!==true)throw Error(j.error||'request_failed');return j;}
async function decision(authorId,kind,value,documentId,note,button){
 button.disabled=true;status('در حال ثبت رأی مدیر با تأیید نشست دومرحله‌ای...');
 try{
  const s=await check(await fetch('/api/admin/operations/session',{credentials:'same-origin',cache:'no-store'}));
  if(s.mfaRequired===true||!s.csrfToken)throw Error('admin_mfa_required');
  const resp=await fetch(api+'/decision',{method:'POST',credentials:'same-origin',cache:'no-store',
   headers:{'Content-Type':'application/json','X-CSRF-Token':s.csrfToken},
   body:JSON.stringify({authorId,kind,decision:value,documentId,note})});
  await check(resp);status('تصمیم مدیر ثبت شد؛ نه تسویه‌ای انجام شده و نه قراردادی امضا شده است.');await load(true);
 }catch(e){status('نتیجه بررسی ثبت نشد: '+String(e.message||'خطا'));}
 finally{button.disabled=false;}
}
function controls(authorId,kind,id,allowed){
 const actions=el('div','','jp-owner-actions');
 const note=document.createElement('textarea');note.placeholder='دلیل درخواست اصلاح/رد، برای مشاهده در داشبورد مؤلف';note.maxLength=600;note.rows=2;
 actions.append(note);
 for(const [value,label] of allowed){
  const btn=el('button',label,'jp-button');btn.type='button';
  btn.addEventListener('click',()=>{
   if(value!=='approved'&&note.value.trim().length<5){status('برای درخواست اصلاح یا رد، دلیل روشن ثبت کنید.');return;}
   decision(authorId,kind,value,id,note.value.trim(),btn);
  });actions.append(btn);
 }
 return actions;
}
function card(a){
 const shell=el('article','','jp-owner-case');
 shell.append(el('h3',a.display_name_fa||'مؤلف'),el('p','وضعیت حساب مؤلف: '+a.status));
 shell.append(el('p','نام قانونی: '+(a.legal_name_fa||'ثبت نشده')+
  ' · نام لاتین: '+(a.legal_name_en||'—')+
  ' · عنوان علمی: '+(a.academic_title||'—')+
  ' · مؤسسه: '+(a.affiliation||'—')));
 shell.append(el('p','تخصص: '+(a.specialization||'—')+' · ORCID: '+(a.orcid||'—')));
 shell.append(el('p','وضعیت پروفایل: '+(a.profile_state||'فاقد اطلاعات')+
  (a.profile_note?' · توضیح: '+a.profile_note:''),'jp-small'));
 if(a.profile_state==='submitted'||a.profile_state==='changes_requested'){
  shell.append(controls(a.id,'profile','',[['approved','تأیید هویت و رزومه'],['changes_requested','درخواست اصلاح پروفایل']]));
 }
 shell.append(el('p','حساب بانکی: '+(a.bank_name||'—')+
   ' · صاحب حساب: '+(a.holder_name||'—')+
   ' · کارت ****'+(a.card_last4||'—')+' · شبا ****'+(a.iban_last4||'—')+
   ' · وضعیت: '+(a.bank_state||'ثبت نشده'),'jp-small'));
 if(a.bank_state==='submitted'||a.bank_state==='changes_requested'){
  shell.append(controls(a.id,'bank','',[['approved','تأیید مالکیت حساب'],['changes_requested','درخواست اصلاح بانک']]));
 }
 const list=el('ul','','jp-work-list');
 for(const d of a.documents||[]){
  const li=el('li','مدرک: '+d.document_kind+' · وضعیت: '+d.review_state+' · تاریخ: '+d.submitted_at);
  const link=el('a','دریافت محرمانه سند جهت بررسی');
  link.href=api+'/document?id='+encodeURIComponent(d.id);link.rel='noreferrer';link.target='_blank';
  li.append(link);
  if(d.review_state==='submitted')li.append(controls(a.id,'document',d.id,[['approved','مدرک معتبر است'],['rejected','رد مدرک']]));
  list.append(li);
 }
 if(!list.childElementCount)list.append(el('li','مدرکی برای این مؤلف ارائه نشده است.'));
 shell.append(el('h4','اسناد قابل بررسی'),list);
 return shell;
}
async function load(quiet=false){
 refresh.disabled=true;if(!quiet)status('در حال دریافت پرونده‌ها از بانک اطلاعاتی خصوصی...');
 try{
  const j=await check(await fetch(api,{credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}}));
  box.replaceChildren(...j.authors.map(card));
  if(!j.authors.length)box.append(el('p','هیچ مؤلفی در سامانه ثبت نشده است.'));
  if(!quiet)status('پرونده‌ها فقط برای مدیر ارشد با MFA تازه باز شدند؛ هیچ مدرکی در حافظه عمومی مرورگر ذخیره نمی‌شود.');
 }catch(e){box.replaceChildren();status(e.message==='author_onboarding_not_provisioned'?
  'جداول تکمیلی هویت مؤلف هنوز طبق برنامه مرحله آخر نصب نشده‌اند.':
  'دسترسی نیازمند ورود مدیر ارشد و تأیید دومرحله‌ای است: '+e.message);}
 finally{refresh.disabled=false;}
}
refresh.addEventListener('click',()=>load());
})();