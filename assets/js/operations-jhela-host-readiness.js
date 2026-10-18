/* Read-only, fresh-MFA owner diagnostics. No private host paths are rendered. */
(()=>{'use strict';
const root=document.querySelector('[data-jhela-host-readiness]');
const workspace=document.getElementById('ops-workspace');
if(!root||!workspace||!workspace.contains(root))return;
const fa=document.documentElement.lang==='fa';
const tr=(en,faText)=>fa?faText:en;
const button=root.querySelector('[data-jhela-host-refresh]');
const status=root.querySelector('[data-jhela-host-status]');
const panel=root.querySelector('[data-jhela-host-results]');
const labels={
 motherDatabase:['Mother database and journal schema','دیتابیس مادر و ساختار مجله'],
 trustedTls:['Verified HTTPS transport','ارتباط امن تأییدشده'],
 privateStorageConfigured:['Private storage configured','مسیر ذخیره خصوصی تعریف شده'],
 privateStorageWritable:['Private storage is writable','فضای خصوصی قابل نوشتن است'],
 antivirusConfigured:['Antivirus configured','موتور ضدبدافزار معرفی شده'],
 antivirusExecutable:['Antivirus executable available','موتور ضدبدافزار قابل اجراست'],
 manuscriptIntakeEnabled:['Manuscript intake explicitly enabled','مجوز فعال‌سازی دریافت مقاله'],
 reviewerIntakeEnabled:['Reviewer applications explicitly enabled','مجوز فعال‌سازی درخواست داوری']
};
const node=(tag,value)=>{const el=document.createElement(tag);el.textContent=value;return el;};
button.addEventListener('click',async()=>{
 button.disabled=true;panel.replaceChildren();
 status.textContent=tr('Checking server evidence…','در حال بررسی شواهد سرور…');
 try{
  const session=await fetch('/api/admin/operations/session',{credentials:'same-origin',cache:'no-store'});
  const s=await session.json();
  if(!session.ok||s.ok!==true||s.mfaRequired)throw Error('admin_mfa_required');
  const r=await fetch('/api/admin/operations/jhela/host-readiness',{credentials:'same-origin',cache:'no-store'});
  const d=await r.json();
  if(!r.ok||d.ok!==true||d.schema!=='jhela-owner-host-readiness-v1')throw Error(d.error||'diagnostics_unavailable');
  for(const [key,label] of Object.entries(labels)){
   const row=node('p',(d.checks?.[key]===true?'✓ ':'× ')+(fa?label[1]:label[0]));
   panel.append(row);
  }
  status.textContent=d.manuscriptIntakeReady===true
   ?tr('Configuration checks passed. A real clean/malicious scan and end-to-end receipt are still required.',
        'تنظیمات پایه تأیید شدند؛ آزمون واقعی اسکن و دریافت مقاله هنوز الزامی است.')
   :tr('Manuscript intake remains unavailable until all required host checks pass.',
        'تا تکمیل کنترل‌های ضروری هاست، دریافت مقاله غیرفعال می‌ماند.');
 }catch(e){
  status.textContent=e.message==='admin_mfa_required'
   ?tr('Verify administrator two-factor authentication first.','ابتدا تأیید دومرحله‌ای مدیریت را انجام دهید.')
   :tr('Readiness check unavailable: ','بررسی آمادگی در دسترس نیست: ')+e.message;
 }finally{button.disabled=false;}
});
})();
