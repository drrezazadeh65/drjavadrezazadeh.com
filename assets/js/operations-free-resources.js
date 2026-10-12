/* Catalogued free resources in the existing MFA-protected administrator workspace.
   Read-only, no external provider fetches, no visitor tracking or local persistence. */
(()=>{'use strict';
const panel=document.getElementById('ops-free-resources'), workspace=document.getElementById('ops-workspace'),
      list=document.getElementById('ops-resources-list'), status=document.getElementById('ops-resources-status'),
      select=document.getElementById('ops-resources-category'), reload=document.getElementById('ops-resources-refresh');
if(!panel||!workspace||!list||!status||!select||!reload)return;
const en=document.documentElement.lang==='en';
const tr=(fa,enText)=>en?enText:fa;
const groups={GROWTH:tr('رشد و بازاریابی','Growth and marketing'),TECHNICAL:tr('فنی و دسترس‌پذیری','Technical quality'),SCHOLARLY:tr('علمی و استنادی','Scholarly authority')};
const access={MANUAL_REFERENCE:tr('بررسی دستی','Manual reference'),READ_API_CANDIDATE:tr('API قابل بررسی؛ نامتصل','API candidate; not connected'),CI_OPEN_SOURCE_CANDIDATE:tr('متن‌باز؛ نیازمند نصب کنترل‌شده','Open-source; approved installation needed'),ACCOUNT_SETUP_REQUIRED:tr('نیازمند حساب و مجوز','Account authorization required'),CONDITIONAL_ELIGIBILITY:tr('وابسته به شرایط ارائه‌دهنده','Provider eligibility required')};
let items=null,scholarlyObservation=null,performanceObservation=null,request=null,generation=0;
const make=(tag,txt,cls)=>{const node=document.createElement(tag);if(txt!==undefined)node.textContent=txt;if(cls)node.className=cls;return node;};
function reset(){generation++;request?.abort();request=null;items=null;scholarlyObservation=null;performanceObservation=null;document.getElementById('ops-scholar-observation')?.remove();document.getElementById('ops-performance-observation')?.remove();list.replaceChildren();status.textContent='';select.replaceChildren(make('option',tr('همه دسته‌ها','All categories')));select.firstChild.value='';}
function draw(){
 if(!items)return;list.replaceChildren();
 const category=select.value,shown=items.filter(item=>!category||item.category===category);
 for(const item of shown){
  const card=make('article',undefined,'ops-card');
  card.append(make('small',(groups[item.category]||item.category)+' · '+item.ownerEngine),make('h3',item.name),
    make('p',item.purpose),make('p',access[item.accessPath]||item.accessPath),
    make('small',tr('اتصال خارجی تأیید نشده','External connection not verified')));
  if(typeof item.url==='string'&&/^https:\/\/[^\s<>"']+$/.test(item.url)){
   const a=make('a',tr('وب‌سایت رسمی','Official website'));a.href=item.url;a.target='_blank';a.rel='noopener noreferrer';card.append(a);
  }
  list.append(card);
 }
 status.textContent=tr('نمایش '+shown.length+' از '+items.length+' منبع. هیچ داده خارجی خودکاری دریافت نشده است.',
 'Showing '+shown.length+' of '+items.length+' references. No automated external data has been retrieved.');
 if(scholarlyObservation){
   let summary=document.getElementById('ops-scholar-observation');
   if(!summary){summary=make('section',undefined,'ops-panel');summary.id='ops-scholar-observation';status.after(summary);}
   summary.replaceChildren();
   summary.append(make('h3',tr('مشاهدات علمی Crossref','Crossref scholarly observations')));
   const o=scholarlyObservation;
   if(o.status==='observed'||o.status==='stale'){
     summary.append(make('p',tr('زمان مشاهده: ','Observed: ')+(o.observedAt||tr('نامشخص','Unknown'))+' · '+tr('فراداده بازیابی‌شده: ','Metadata found: ')+String(o.metrics?.metadataFound??0)+' / '+String(o.metrics?.attempted??0)));
     if(o.status==='stale')summary.append(make('p',tr('قدیمی؛ برای تصمیم‌گیری باید دوباره بررسی شود.','Stale: recheck before acting.')));
     for(const item of o.records||[]){const detail=make('p',item.doi+' · '+item.status+' · '+(item.providerTitle||item.sourceTitle||''));summary.append(detail);}
   }else summary.append(make('p',tr('هنوز داده معتبر و منتشرشده‌ای از Crossref در سرور موجود نیست.','No validated deployed Crossref observation is available yet.')));
   summary.append(make('small',tr('وجود فراداده DOI به معنای تأیید نویسندگی، میزان استناد یا رتبه گوگل نیست.','DOI metadata retrieval does not establish authorship, citations or Google rankings.')));
 }
 if(performanceObservation){
   let section=document.getElementById('ops-performance-observation');
   if(!section){section=make('section',undefined,'ops-panel');section.id='ops-performance-observation';status.after(section);}
   section.replaceChildren();section.append(make('h3',tr('آزمون رایگان سرعت موبایل','Free mobile performance check')));
   const p=performanceObservation;
   if(p.status==='provider_unavailable')section.append(make('p',tr('API گوگل داده‌ای ارائه نکرده است؛ این موضوع نشانه کندی سایت نیست.','Google API returned no usable data; this does not indicate a slow website.')));
   else if(p.status==='observed')section.append(make('p',tr('سنجش آزمایشگاهی موبایل: ','Mobile lab observations: ')+String(p.measuredPages||0)+' / '+String(p.attemptedPages||0)));
   else section.append(make('p',tr('هنوز سنجش معتبر و تازه‌ای موجود نیست.','No current reviewed lab measurement is available.')));
   for(const q of p.results||[])section.append(make('p',q.url+' · '+(q.labPerformanceScore===null?tr('بدون امتیاز','No score'):q.labPerformanceScore+'/100')+(q.reason?' · '+q.reason:'')));
   section.append(make('small',tr('HTTP 429 یعنی محدودیت سرویس؛ امتیاز آزمایشگاهی معادل داده کاربران واقعی نیست.','HTTP 429 indicates provider throttling; lab scores are not real-user field metrics.')));
 }

}
async function load(){
 if(workspace.hidden||!panel.open)return;
 const id=++generation;request?.abort();request=new AbortController();
 document.getElementById('ops-scholar-observation')?.remove();document.getElementById('ops-performance-observation')?.remove();list.replaceChildren();status.textContent=tr('در حال دریافت از سرور امن…','Loading from the protected server…');
 try{
  const response=await fetch('/api/admin/operations/free-resources',{credentials:'same-origin',cache:'no-store',signal:request.signal,headers:{Accept:'application/json'}});
  const data=await response.json();
  if(!response.ok||data.ok!==true||data.schema!=='operations-free-resources-v1'||!Array.isArray(data.resources)||data.verifiedExternalConnections!==0)throw Error('not_available');
  if(id!==generation||workspace.hidden||!panel.open)return;
  items=data.resources;
  scholarlyObservation=data.scholarlyObservation||{status:'not_collected'};
  performanceObservation=data.performanceObservation||{status:'not_collected'};
  const categories=[...new Set(items.map(item=>item.category))];
  select.replaceChildren(make('option',tr('همه دسته‌ها','All categories')));select.firstChild.value='';
  for(const category of categories){const option=make('option',groups[category]||category);option.value=category;select.append(option);}
  draw();
 }catch(error){
  if(id!==generation||workspace.hidden||!panel.open||error.name==='AbortError')return;
  items=null;list.replaceChildren();status.textContent=tr('دریافت فهرست ممکن نشد؛ اتصال خارجی تأیید نشده است.','Directory unavailable; no external connection is verified.');
 }
}
panel.addEventListener('toggle',()=>panel.open?load():reset());
reload.addEventListener('click',load);select.addEventListener('change',draw);
new MutationObserver(()=>{if(workspace.hidden){panel.open=false;reset();}}).observe(workspace,{attributes:true,attributeFilter:['hidden']});
})();
