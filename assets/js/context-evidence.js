(()=>{
const q=(s,r=document)=>r.querySelector(s);
const form=q('#contextEvidenceForm'); if(!form)return;
const fieldMap=[
 ['قوی‌ترین درس/حوزه','strongArea'],['شاهد قوت','strongEvidence'],
 ['حوزه دشوار','challengeArea'],['شاهد شکاف','challengeEvidence'],
 ['محیط مطالعه','studyEnvironment'],['اثر وقفه/بی‌نظمی','disruptionImpact'],
 ['دسترسی منابع','resourceAccess'],['حمایت/فشار/استقلال','supportContext'],
 ['مانع واقعی','e7Barrier'],['شاهد مانع','e7Evidence'],['بخش قابل‌کنترل','e7Control'],
 ['حمایت موردنیاز','e7Support'],['مسئول اقدام','e7Owner'],['زمان بازبینی','e7Review']
];
const esc=s=>String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const typeLabel=()=>{
 const el=q('#e7Type'); return el?.options[el.selectedIndex]?.text||'—';
};
form.addEventListener('submit',e=>{
 e.preventDefault();
 const cards=fieldMap.map(([label,id])=>'<article><span>'+esc(label)+'</span><p>'+esc(q('#'+id)?.value.trim()||'—')+'</p></article>').join('');
 const type='<article><span>نوع مانع</span><p>'+esc(typeLabel())+'</p></article>';
 q('#contextPreviewContent').innerHTML='<div class="context-preview-grid">'+cards+type+'</div>';
 const box=q('#contextPreview'); box.hidden=false;
 box.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
});
q('#clearContextForm')?.addEventListener('click',()=>{
 form.reset(); const box=q('#contextPreview'); if(box)box.hidden=true; q('#strongArea')?.focus();
});
})();