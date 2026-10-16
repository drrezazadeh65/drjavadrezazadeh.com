/* JHELA evidence-bound owner dashboard reader: explicit click, MFA API only, no browser persistence. */
(()=>{'use strict';
const shell=document.getElementById('ops-jhela-maturity'),workspace=document.getElementById('ops-workspace');
if(!shell||!workspace||!workspace.contains(shell))return;
const trigger=shell.querySelector('[data-jhela-maturity-refresh]'),status=shell.querySelector('[data-jhela-maturity-status]'),out=shell.querySelector('[data-jhela-maturity-results]');
if(!trigger||!status||!out)return;
const fa=document.documentElement.lang==='fa';
const tt=(a,b)=>fa?a:b;
const node=(tag,txt)=>{const n=document.createElement(tag);if(txt!==undefined)n.textContent=txt;return n;};
function render(data){
  if(data?.schema!=='jhela-owner-maturity-snapshot-v1'||!Array.isArray(data.scientificMilestones)||data.scientificMilestones.length!==10||
     !Array.isArray(data.infrastructureTiers)||data.infrastructureTiers.length!==4||data.ojs?.submissions!=='closed'||
     data.evidenceReview?.progressPercent!==null||data.verifiedIndexClaims?.length!==0)
    throw new Error('unverified_source');
  out.replaceChildren();
  const note=node('p',tt('این گزارش از قراردادهای مدیریت مجله خوانده شده است؛ هنوز به مقالات و داوری‌های واقعی OJS متصل نیست.','This report reflects the journal’s approved planning records; it is not connected to live OJS manuscripts or reviews.'));
  note.className='ops-muted';out.append(note);
  const stats=node('div');stats.className='ops-jhela-live-metrics';
  for(const [label,value] of [
    [tt('پذیرش مقاله','Article submissions'),tt('بسته','Closed')],
    [tt('وضعیت OJS','OJS status'),tt('هنوز تأیید نشده','Not yet verified')],
    [tt('مراحل دارای گواهی مستقل','Independently verified stages'),String(data.evidenceReview.verifiedStageCount)+' / 10'],
    [tt('فضای اضافه‌شده به هاست','Additional host storage'),tt('۵ گیگابایت برنامه‌ریزی شده؛ نصب تأیید نشده','5 GB planned; not yet confirmed')],
  ]){const card=node('div');const b=node('strong',value);const t=node('span',label);card.append(t,b);stats.append(card);}
  out.append(stats);
  const title=node('h4',tt('وضعیت سندی ده مرحلهٔ علمی','Scientific milestone evidence'));
  out.append(title);
  const list=node('ol');list.className='ops-jhela-evidence-list';
  for(const step of data.scientificMilestones){
     const li=node('li'),label=node('span',step.id+' — '+(fa?step.fa:step.en));
     const state=node('small',tt('بدون گواهی مستقل ثبت‌شده','Independent certification not recorded'));
     li.append(label,state);list.append(li);
  }
  out.append(list);
}
async function refresh(){
 if(trigger.disabled)return;
 trigger.disabled=true;
 out.replaceChildren();
 status.textContent=tt('در حال بررسی اطلاعات مدیریت مجله…','Retrieving journal governance records…');
 try{
   const response=await fetch('/api/admin/operations/jhela/maturity',{method:'GET',credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}});
   if(response.status===401||response.status===403)throw new Error('auth_required');
   if(!response.ok)throw new Error('not_available');
   const body=await response.json();
   if(body?.ok!==true)throw new Error('unverified_source');
   render(body);
   status.textContent=tt('اطلاعات برنامه‌ریزی مجله نمایش داده شد؛ گواهی عملیاتی یا نمایه‌سازی صادر نشده است.','Journal planning records loaded; no operational or indexing certification is implied.');
 }catch(error){
   status.textContent=error.message==='auth_required'
     ?tt('برای مشاهده، ورود مدیر و تأیید هویت دوباره لازم است.','Administrator sign-in and renewed verification are required.')
     :tt('وضعیت فعلی قابل بازیابی نیست؛ هیچ مرحله‌ای تأییدشده فرض نمی‌شود.','Current records could not be retrieved. No milestone is presumed certified.');
   out.replaceChildren();
 }finally{trigger.disabled=false;}
}
trigger.addEventListener('click',refresh);
})();