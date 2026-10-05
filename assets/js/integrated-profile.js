(()=>{
const root=document.getElementById('integratedDomains');
const form=document.getElementById('integratedProfileForm');
if(!root||!form)return;
const domains=[
 ['A','جهت و عاملیت'],
 ['B','راهبرد یادگیری'],
 ['C','اجرا و بازگشت'],
 ['D','پایش و سواد خطا'],
 ['E','انرژی و فشار تحصیلی'],
 ['F','خودتنظیمی دیجیتال و هوش مصنوعی'],
 ['G','مسیر طلایی و حمایت']
];
const sources=['S','P','R','O','C','T'];
const states=[
 ['','انتخاب وضعیت'],
 ['CONVERGENT','همسو'],
 ['DISCREPANT','متناقض'],
 ['SINGLE_SOURCE','تک‌منبعی'],
 ['INSUFFICIENT','ناکافی']
];
const esc=s=>String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

root.innerHTML=domains.map(([code,label])=>`
<fieldset class="integrated-domain" data-domain="${code}">
 <legend><b>${code}</b><span>${label}</span></legend>
 <div class="integrated-domain-grid">
  <div class="integrated-source-select"><span>منابع شواهد موجود</span><div>${sources.map(src=>`<label><input type="checkbox" name="${code}_source" value="${src}"><span>${src}</span></label>`).join('')}</div></div>
  <label>وضعیت شواهد<select name="${code}_state">${states.map(([v,l])=>`<option value="${v}">${l}</option>`).join('')}</select></label>
  <label class="integrated-priority"><input type="checkbox" name="${code}_priority"><span>این حوزه اکنون اولویت بررسی است</span></label>
  <label>اقدام بعدی<textarea name="${code}_action" rows="3" placeholder="چه اقدام یا بررسی‌ای باید انجام شود؟"></textarea></label>
  <label>شاخص پایش<textarea name="${code}_monitor" rows="3" placeholder="از کجا می‌فهمیم وضعیت تغییر کرده است؟"></textarea></label>
  <label>زمان بازبینی<input name="${code}_review" type="text" placeholder="مثلاً ۷ روز دیگر / تاریخ مشخص"></label>
 </div>
</fieldset>`).join('');

const stateLabel=v=>states.find(x=>x[0]===v)?.[1]||'هنوز مشخص نشده';
form.addEventListener('submit',e=>{
 e.preventDefault();
 const cards=domains.map(([code,label])=>{
  const box=root.querySelector('[data-domain="'+code+'"]');
  const src=[...box.querySelectorAll('input[name="'+code+'_source"]:checked')].map(x=>x.value);
  const state=box.querySelector('[name="'+code+'_state"]').value;
  const priority=box.querySelector('[name="'+code+'_priority"]').checked;
  const action=box.querySelector('[name="'+code+'_action"]').value.trim();
  const monitor=box.querySelector('[name="'+code+'_monitor"]').value.trim();
  const review=box.querySelector('[name="'+code+'_review"]').value.trim();
  return '<article class="integrated-preview-card"><header><b>'+code+' · '+esc(label)+'</b>'+(priority?'<span>اولویت</span>':'')+'</header><dl><div><dt>منابع</dt><dd>'+esc(src.join(' + ')||'هنوز ثبت نشده')+'</dd></div><div><dt>وضعیت</dt><dd>'+esc(stateLabel(state))+'</dd></div><div><dt>اقدام بعدی</dt><dd>'+esc(action||'—')+'</dd></div><div><dt>شاخص پایش</dt><dd>'+esc(monitor||'—')+'</dd></div><div><dt>بازبینی</dt><dd>'+esc(review||'—')+'</dd></div></dl></article>';
 }).join('');
 document.getElementById('integratedPreviewContent').innerHTML='<div class="integrated-preview-grid">'+cards+'</div>';
 const p=document.getElementById('integratedPreview');p.hidden=false;
 p.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
});
document.getElementById('clearIntegratedProfile')?.addEventListener('click',()=>{
 form.reset();document.getElementById('integratedPreview').hidden=true;
 root.querySelector('select,textarea,input')?.focus();
});
})();