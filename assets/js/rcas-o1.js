(()=>{
const q=(s,r=document)=>r.querySelector(s);
const form=q('#rcasO1Form');
if(!form)return;
const role=q('#observerRole');
const params=new URLSearchParams(location.search);
const requested=(params.get('role')||'').toLowerCase();
if(requested==='parent')role.value='PARENT';
if(requested==='teacher')role.value='TEACHER';
if(requested==='mentor')role.value='MENTOR';

const fields=[
 ['نسبت/موقعیت','relationshipContext'],
 ['رفتار مشاهده‌شده','observedBehaviour'],
 ['نمونه قوت/پیشرفت','strengthProgress'],
 ['مانع و حمایت','barrierSupport'],
 ['ابهام/نیاز به بررسی','unknownReview']
];
const esc=s=>String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const roleLabel=()=>role.options[role.selectedIndex]?.text||'مشخص نشده';
form.addEventListener('submit',e=>{
 e.preventDefault();
 const preview=q('#observerPreview'),box=q('#observerPreviewContent');
 const rows=fields.map(([label,id])=>{
   const value=q('#'+id)?.value.trim()||'—';
   return '<article><span>'+esc(label)+'</span><p>'+esc(value)+'</p></article>';
 }).join('');
 box.innerHTML='<div class="observer-preview-role"><b>نقش مشاهده‌گر</b><span>'+esc(roleLabel())+'</span></div><div class="observer-preview-grid">'+rows+'</div>';
 preview.hidden=false;
 preview.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
});
q('#clearObserverForm')?.addEventListener('click',()=>{
 form.reset();
 if(requested==='parent')role.value='PARENT';
 if(requested==='teacher')role.value='TEACHER';
 if(requested==='mentor')role.value='MENTOR';
 const preview=q('#observerPreview'); if(preview)preview.hidden=true;
 q('#relationshipContext')?.focus();
});
window.addEventListener('beforeunload',()=>{ /* intentionally no persistence */ });
})();