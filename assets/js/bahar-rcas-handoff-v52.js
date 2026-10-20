/* Optional and deliberately minimal RCAS -> BAHAR handoff.
   Never imports raw RCAS responses, learner identity, P0, evidence or payment data.
   Clicking the offer inserts a GENERIC activity prompt, not private answers.
*/
(()=>{
'use strict';
const root=document.querySelector('[data-bahar-formative]');
const form=root?.querySelector('[data-bahar-plan-form]');
if(!form||root.querySelector('[data-bahar-route-handoff]'))return;
const goal=form.elements.namedItem('goal');
const action=form.elements.namedItem('action');
if(!goal||!action)return;
let raw=null;
try{raw=JSON.parse(sessionStorage.getItem('gt_rcas_state')||'null');}catch(_){return;}
if(!raw||raw.completed!==true||raw.completedItemCount!==28||
   raw.p0Validated!==true||raw.routingEvidenceCompleted!==true||
   raw.meaningfulCoreEvidence!==true||
   !['start-1.2','start-en-pilot-1'].includes(raw.rcasRevision)||
   raw.routeBasis!=='SELF_SELECTED_UNVALIDATED'||!/^D[1-6]$/.test(raw.routeCode||'')||
   !Number.isFinite(Date.parse(raw.updatedAt))||
   Date.now()-Date.parse(raw.updatedAt)>2*60*60*1000||
   Date.parse(raw.updatedAt)>Date.now()+60000)return;
const fa=document.documentElement.lang==='fa';
const map={
 D1:['بازنگری روش مطالعه با یک تکلیف واقعی','برای یک تکلیف کوتاه، یادآوری بدون نگاه به منبع را امتحان کن و خطاها را توصیف کن.','Review a learning strategy using a real task','Try recall without looking at your notes for one small task, then describe errors.'],
 D2:['بررسی شرایط مطالعه و انرژی','در یک هفته شرایط تمرکز و استراحت را بدون قضاوت ثبت کن و یک تغییر کوچک امن را امتحان کن.','Observe learning energy and conditions','Record concentration and rest conditions without judgement; try one small safe adjustment.'],
 D3:['سنجش انتقادی کاربرد ابزار دیجیتال','در یک تکلیف، هدف استفاده از ابزار دیجیتال و میزان یادگیری مستقل را ثبت کن.','Critically review digital learning tools','For one task, record why you used a digital tool and what you could do independently.'],
 D4:['بررسی مانع محیطی و حمایت عملی','یک مانع قابل تغییر در محیط آموزشی و یک حمایت داوطلبانه را مشاهده و توصیف کن.','Observe an environmental barrier and practical support','Describe one modifiable learning barrier and try an appropriate voluntary support.'],
 D5:['کاوش یک مسیر مورد علاقه','یک تجربه واقعی کم‌خطر در حوزه مورد علاقه انجام بده و یک پرسش تازه ثبت کن.','Explore a personally interesting route','Try one low-risk activity in an area of interest and record a new question.'],
 D6:['مقایسه کیفیت شواهد یک تصمیم','دو منبع مستقل را درباره یک تصمیم آموزشی مقایسه و ابهام‌های باقی‌مانده را ثبت کن.','Compare evidence for one decision','Compare two independent sources for an education decision and note unresolved questions.']
};
const activity=map[raw.routeCode];if(!activity)return;
const panel=document.createElement('aside');
panel.className='jr-bahar-handoff';panel.dataset.baharRouteHandoff='1';
const title=document.createElement('strong');
title.textContent=fa?'ادامه اختیاری از RCAS به BAHAR':'Optional RCAS to BAHAR continuation';
const desc=document.createElement('p');
desc.textContent=fa? 'حوزه خودانتخابی '+raw.routeCode+' شناسایی شد. هیچ پاسخ یا پرونده خصوصی منتقل نشده است. با تأیید شما فقط یک تمرین عمومی در بخش‌های خالی وارد می‌شود.':
 'Your self-selected '+raw.routeCode+' area is available. No responses or private records were transferred. You may insert a generic exercise in empty fields.';
const btn=document.createElement('button');btn.type='button';btn.className='jr-bahar-action';
btn.textContent=fa?'افزودن تمرین پیشنهادی به فرم':'Add generic activity to empty fields';
const feedback=document.createElement('span');feedback.setAttribute('role','status');
btn.addEventListener('click',()=>{
 if(goal.value.trim()||action.value.trim()){
  feedback.textContent=fa?'برای جلوگیری از جایگزینی نوشته‌های شما، فرم فعلی تغییر نکرد.':'Your existing notes were not overwritten.';
  return;
 }
 goal.value=activity[fa?0:2];action.value=activity[fa?1:3];
 goal.dispatchEvent(new Event('input',{bubbles:true}));
 feedback.textContent=fa?'تمرین عمومی افزوده شد. آن را متناسب با شرایط خود بررسی و ویرایش کنید.':'Generic activity inserted. Review and adapt it to your own circumstances.';
 goal.focus();
});
panel.append(title,desc,btn,feedback);
form.parentElement?.insertBefore(panel,form);
})();
