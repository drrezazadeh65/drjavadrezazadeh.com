/* Keyword Master Map v1: read-only, evidence-labelled editorial strategy.
   Zero search volumes/rankings are invented. Admin workspace itself is server-authorized. */
(()=>{'use strict';
const panel=document.getElementById('jr-intelligence');
if(!panel)return;
const fa=panel.dataset.lang==='fa',t=(a,b)=>fa?a:b;
const section=document.createElement('section');section.className='jr-keyword-master';section.setAttribute('aria-label',t('مرکز کلیدواژه‌های فارسی و انگلیسی','Bilingual keyword master center'));
section.innerHTML='<h3>'+t('مرکز راهبرد کلیدواژه','Keyword Strategy Center')+'</h3>'+
 '<p class="jr-keyword-caption">'+t('کلیدواژه‌های پیشنهادی به صفحات موجود سایت متصل‌اند. رتبه، حجم جست‌وجو و داده رقبا تا دریافت شواهد معتبر «نامشخص» هستند؛ این جدول داده زنده گوگل نیست.','Editorial keyword hypotheses are mapped to existing pages. Ranking, search volume and competitors remain unknown until verified; this is not live Google data.')+'</p>'+
 '<div class="jr-keyword-controls"><label>'+t('زبان','Language')+' <select data-kw-lang><option value="">'+t('هر دو زبان','Both')+'</option><option value="fa">فارسی</option><option value="en">English</option></select></label>'+
 '<label>'+t('جست‌وجو در نقشه','Search map')+' <input type="search" data-kw-search placeholder="'+t('کلیدواژه یا نشانی','Keyword or URL')+'"></label>'+
 '<button type="button" data-kw-export disabled>'+t('دریافت CSV','Export CSV')+'</button></div>'+
 '<p data-kw-summary role="status" aria-live="polite">'+t('در حال بارگذاری نقشه…','Loading strategy map…')+'</p>'+
 '<div class="jr-keyword-table-scroll"><table><thead><tr><th>'+t('کلیدواژه','Keyword')+'</th><th>'+t('نیت جست‌وجو','Intent')+'</th><th>'+t('صفحه مرجع','Owner URL')+'</th><th>'+t('اولویت محتوا','Priority')+'</th><th>'+t('داده عملکرد','Performance')+'</th></tr></thead><tbody data-kw-results></tbody></table></div>'+
 '<p class="jr-keyword-caption">'+t('گام پژوهشی بعدی: ثبت منبع، تاریخ، کشور، دستگاه، جایگاه و مقایسه واقعی رقبا برای هر عبارت در ایران و بازارهای انگلیسی‌زبان. بدون داده تأییدشده ادعای پیشرفت رتبه نمی‌کنیم.','Next research step: capture source, date, country, device, positions and actual competitors in Iranian and English-language markets. No ranking claims without evidence.')+'</p>';
panel.appendChild(section);
const $=s=>section.querySelector(s),tbody=$('[data-kw-results]'),summary=$('[data-kw-summary]'),exportBtn=$('[data-kw-export]');
let rows=[],current=[];
const td=(value)=>{const c=document.createElement('td');c.textContent=value;return c;};
function repaint(){
 const q=$('[data-kw-search]').value.trim().toLocaleLowerCase(),lang=$('[data-kw-lang]').value;
 current=rows.filter(k=>(!lang||k.lang===lang)&&(!q||(k.keyword+' '+k.canonical+' '+k.intent).toLocaleLowerCase().includes(q)));
 tbody.replaceChildren();
 for(const k of current){
  const tr=document.createElement('tr');tr.append(td(k.keyword),td(k.intent));
  const path=document.createElement('td'),a=document.createElement('a');a.href=k.canonical;a.target='_blank';a.rel='noopener noreferrer';a.textContent=k.canonical;path.append(a);tr.append(path);
  tr.append(td(k.editorialPriority),td(t('نامشخص · داده تأیید نشده','Unknown · unverified')));tbody.append(tr);
 }
 if(!current.length){const tr=document.createElement('tr'),cell=td(t('موردی یافت نشد','No matches'));cell.colSpan=5;tr.append(cell);tbody.append(tr);}
 summary.textContent=t('عبارت‌های نقشه‌شده: ','Mapped hypotheses: ')+current.length+'/'+rows.length+' · '+t('رتبه‌ها و حجم جست‌وجو: نامشخص','Positions and volumes: unknown');
 exportBtn.disabled=!current.length;
}
function csvCell(value){let s=String(value??'');if(/^[\s]*[=+\-@]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';}
exportBtn.addEventListener('click',()=>{
 if(!current.length)return;
 const table=[['id','language','keyword','intent','canonical','priority','status'],...current.map(k=>[k.id,k.lang,k.keyword,k.intent,k.canonical,k.editorialPriority,k.stage])];
 const csv='\uFEFF'+table.map(row=>row.map(csvCell).join(',')).join('\r\n');
 const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'})),a=document.createElement('a');
 a.href=url;a.download='jr-keyword-editorial-map.csv';a.hidden=true;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
$('[data-kw-search]').addEventListener('input',repaint);
$('[data-kw-lang]').addEventListener('change',repaint);
fetch('/api/admin/operations/keyword-map',{credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}})
 .then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json();})
 .then(data=>{
  if(data.ok!==true||data.schema!=='jr-keyword-master-map-v1'||!Array.isArray(data.keywords))throw Error('Unsupported map');
  rows=data.keywords.filter(k=>typeof k.keyword==='string'&&/^\/(?:fa|en|journal)\//.test(k.canonical)&&/^KW-\d{3}$/.test(k.id));
  repaint();
 }).catch(()=>{summary.textContent=t('نقشه کلیدواژه در این نسخه بارگذاری نشد.','Keyword map unavailable in this release.');});
})();