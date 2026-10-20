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
let lockEpoch=0;
workspace.addEventListener('jr:operations-locked',()=>{
 lockEpoch++;panel.replaceChildren();status.textContent='';button.disabled=false;
});
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
// Operator guidance is safe to display: never include paths, keys or private manuscript data.
const guidance={
 motherDatabase:['Verify the existing mother database and journal tables; do not create a second database.','وجود دیتابیس مادر و جدول‌های مجله را بررسی کنید؛ دیتابیس تازه نسازید.'],
 trustedTls:['Ask Bertina to verify a trusted HTTPS certificate for the main website and journal host.','از برتینا تأیید گواهی معتبر HTTPS دامنه اصلی و مجله را بخواهید.'],
 privateStorageConfigured:['In the existing private api/config.local.php, configure jhela_private_storage using the existing directory outside public_html.','در فایل خصوصی و موجود api/config.local.php، کلید jhela_private_storage را به پوشه فعلی خارج از public_html متصل کنید.'],
 privateStorageWritable:['Use cPanel File Manager to check private-folder permissions and PHP account ownership. Do not move PDFs into public_html.','با File Manager مجوز نوشتن پوشه خصوصی و مالکیت حساب PHP را بررسی کنید؛ PDF را به public_html منتقل نکنید.'],
 antivirusConfigured:['Ask Bertina for the actual ClamAV executable path, then configure jhela_av_binary in the existing private config.','مسیر اجرایی واقعی ClamAV را از برتینا بگیرید و سپس jhela_av_binary را در تنظیمات خصوصی موجود ثبت کنید.'],
 antivirusExecutable:['Bertina must confirm clamscan and PHP proc_open are available to the live LiteSpeed PHP worker. A cPanel Terminal is not required.','برتینا باید دسترسی پردازش PHP سایت به clamscan و تابع proc_open را تأیید کند؛ ترمینال cPanel لازم نیست.'],
 manuscriptIntakeEnabled:['Enable native intake only after a safe staging scan and secure test submission. Never bypass security checks.','دریافت مقاله را تنها پس از اسکن آزمایشی امن و ارسال آزمایشی محرمانه فعال کنید؛ کنترل‌های امنیتی را دور نزنید.'],
 reviewerIntakeEnabled:['Enable reviewer applications after verified identity, consent and owner approval tests.','درخواست همکاری داوری را پس از آزمون هویت تأییدشده، رضایت و تأیید مدیر فعال کنید.']
};
button.addEventListener('click',async()=>{
 if(workspace.hidden)return;
 const epoch=lockEpoch;
 button.disabled=true;panel.replaceChildren();
 status.textContent=tr('Checking server evidence…','در حال بررسی شواهد سرور…');
 try{
  const session=await fetch('/api/admin/operations/session',{credentials:'same-origin',cache:'no-store'});
  const s=await session.json();
  if(workspace.hidden||epoch!==lockEpoch)return;
  if(!session.ok||s.ok!==true||s.mfaRequired)throw Error('admin_mfa_required');
  const r=await fetch('/api/admin/operations/jhela/host-readiness',{credentials:'same-origin',cache:'no-store'});
  const d=await r.json();
  if(workspace.hidden||epoch!==lockEpoch)return;
  if(!r.ok||d.ok!==true||d.schema!=='jhela-owner-host-readiness-v1')throw Error(d.error||'diagnostics_unavailable');
  for(const [key,label] of Object.entries(labels)){
   const row=node('p',(d.checks?.[key]===true?'✓ ':'× ')+(fa?label[1]:label[0]));
   panel.append(row);
   if(d.checks?.[key]!==true){
    const hint=node('p',fa?guidance[key][1]:guidance[key][0]);
    hint.className='ops-muted';
    panel.append(hint);
   }
  }
  const evidence=node('p',tr(
   'Evidence still required: clean and malicious sample scans, private PDF receipt and role-based access checks. These checks are not proof of peer review or publication.',
   'شواهد ضروری باقی‌مانده: اسکن نمونه سالم و آلوده در محیط کنترل‌شده، رسید PDF خصوصی و آزمون سطح دسترسی. این کنترل‌ها اثبات داوری یا انتشار نیستند.'));
  evidence.className='ops-muted';
  panel.append(evidence);
  status.textContent=d.manuscriptIntakeReady===true
   ?tr('Configuration checks passed. A real clean/malicious scan and end-to-end receipt are still required.',
        'تنظیمات پایه تأیید شدند؛ آزمون واقعی اسکن و دریافت مقاله هنوز الزامی است.')
   :tr('Manuscript intake remains unavailable until all required host checks pass.',
        'تا تکمیل کنترل‌های ضروری هاست، دریافت مقاله غیرفعال می‌ماند.');
 }catch(e){
  if(workspace.hidden||epoch!==lockEpoch)return;
  status.textContent=e.message==='admin_mfa_required'
   ?tr('Verify administrator two-factor authentication first.','ابتدا تأیید دومرحله‌ای مدیریت را انجام دهید.')
   :tr('Readiness check unavailable: ','بررسی آمادگی در دسترس نیست: ')+e.message;
 }finally{if(epoch===lockEpoch)button.disabled=false;}
});
})();
