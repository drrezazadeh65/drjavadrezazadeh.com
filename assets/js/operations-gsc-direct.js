/* JR owner GSC projection: read-only and no Google calls from the browser.
 * Missing or unattested values are never presented as verified Google facts.
 */
(()=>{
 'use strict';
 const workspace=document.getElementById('ops-workspace');
 const panel=document.getElementById('ops-gsc-direct');
 if(!workspace||!panel||!workspace.contains(panel))return;
 const english=document.documentElement.lang==='en';
 const t=(fa,en)=>english?en:fa;
 const refresh=panel.querySelector('[data-gsc-direct-refresh]');
 const status=panel.querySelector('[data-gsc-direct-status]');
 const results=panel.querySelector('[data-gsc-direct-results]');
 if(!refresh||!status||!results)return;
 let epoch=0;
 let request=null;
 const make=(tag,value,klass)=>{
  const node=document.createElement(tag);
  if(value!==undefined)node.textContent=String(value);
  if(klass)node.className=klass;
  return node;
 };
 const na=()=>t('داده موجود نیست','Not available');
 const num=(value,digits=0)=>{
  if(typeof value!=='number'||!Number.isFinite(value))return na();
  return new Intl.NumberFormat(english?'en-US':'fa-IR',{maximumFractionDigits:digits}).format(value);
 };
 function lock(){
  ++epoch;
  if(request){request.abort();request=null;}
  results.replaceChildren();
  status.textContent='';
  refresh.disabled=false;
  panel.open=false;
 }
 workspace.addEventListener('jr:operations-locked',lock);
 panel.addEventListener('toggle',()=>{
  if(workspace.hidden||!panel.open){++epoch;if(request)request.abort();request=null;results.replaceChildren();status.textContent='';refresh.disabled=false;return;}
  void load();
 });
 function show(report){
  results.replaceChildren();
  const label=report.status==='locally_validated_unattested'
    ?t('ساختار داده محلی معتبر است؛ اصالت گزارش هنوز مستقل تأیید نشده است.',
       'Local data structure is valid; source authenticity has not been independently attested.')
    :report.status==='no_rows_unattested'
    ?t('هیچ ردیفی در نمونه ثبت نشده؛ این به معنی صفر کلیک یا نمایش نیست.',
       'No rows were supplied; this does not establish zero clicks or impressions.')
    :t('گزارش معتبر جدید در سرور خصوصی موجود نیست؛ مقدارهای نامشخص صفر نیستند.',
       'No valid private snapshot is available. Unknown values are not zero.');
  results.append(make('p',label,'ops-muted'));
  if(report.status==='unavailable')return;
  results.append(make('p',t('بازه: ','Window: ')+String(report.startDate||na())+
    ' — '+String(report.endDate||na())+' · '+
    t('زمان ثبت: ','Collected: ')+String(report.collectedAtUtc||na()),'ops-muted'));
  const grid=make('div',undefined,'ops-grid');
  const metrics=report.metrics||{};
  const values=[
    [t('کلیک','Clicks'),num(metrics.clicks)],
    [t('نمایش','Impressions'),num(metrics.impressions)],
    [t('نرخ کلیک','CTR'),typeof metrics.ctr==='number'&&Number.isFinite(metrics.ctr)?num(metrics.ctr*100,2)+'%':na()],
    [t('میانگین رتبه','Average position'),num(metrics.position,2)]
  ];
  for(const [heading,value] of values){
   const card=make('article',undefined,'ops-card');
   card.append(make('small',heading),make('div',value,'ops-number'));
   grid.append(card);
  }
  results.append(grid);
  results.append(make('p',t(
   'این نمونه صرفاً مجموع یک بازه است؛ وضعیت ایندکس صفحات، نقشه سایت و روند روزانه هنوز از این فایل قابل استنتاج نیست.',
   'This is only a period aggregate. Page indexing, sitemap health and daily trends cannot be inferred from it.'
  ),'ops-muted'));
 }
 function showGa4(ga4,gtm){
  const section=make('section',undefined,'ops-panel');
  section.append(make('h3',t('Google Analytics 4 — شاخص‌های مستقل از Search Console','Google Analytics 4 — separate on-site metrics')));
  section.append(make('p',t(
    'وضعیت: هنوز هیچ گزارش تأییدشده‌ای از GA4 به سرور مدیریت وارد نشده است. اتصال آزمایشی API مستقل از اندازه‌گیری بازدید سایت است.',
    'Status: No independently verified GA4 report has been ingested into this owner dashboard. API verification and live site tracking are separate checks.'
  ),'ops-muted'));
  const grid=make('div',undefined,'ops-grid');
  for(const [title,value] of [
   [t('کاربران فعال','Active users'),ga4?.activeUsers],
   [t('رویدادها','Events'),ga4?.eventCount]
  ]){
   const card=make('article',undefined,'ops-card');
   card.append(make('small',title),make('div',num(value),'ops-number'));
   grid.append(card);
  }
  section.append(grid);
  section.append(make('p',t(
   'مدیریت برچسب: کانتینر GTM ثبت شده، اما تنظیم تگ‌ها، رضایت و انتشار هنوز تأیید نشده است.',
   'Tag management: GTM container registered, but tag setup, consent QA, Preview and publication remain unverified.'
  ),'ops-muted'));
  results.append(section);
 }
 async function load(){
  if(workspace.hidden||!panel.open)return;
  const current=++epoch;
  if(request)request.abort();
  request=new AbortController();
  refresh.disabled=true;results.replaceChildren();
  status.textContent=t('در حال خواندن دادهٔ خصوصی…','Reading private observation…');
  try{
   const response=await fetch('/api/admin/operations/search-intelligence',{
    method:'GET',credentials:'same-origin',cache:'no-store',
    headers:{Accept:'application/json'},signal:request.signal
   });
   const body=await response.json();
   if(current!==epoch||workspace.hidden||!panel.open)return;
   if(response.status===403&&body?.error==='owner_search_intelligence_forbidden'){
    status.textContent=t('دسترسی فقط برای مدیر ارشد سایت است.','Only the site SUPER_ADMIN may view this report.');
    return;
   }
   if(!response.ok||body?.ok!==true||body.schema!=='jr-owner-search-intelligence-v1'
     ||body.gsc?.schema!=='jr-owner-gsc-direct-v1'
     ||body.ga4?.schema!=='jr-owner-ga4-observation-v1'
     ||!['unavailable','locally_validated_unattested','no_rows_unattested'].includes(body.gsc.status))
    throw Error('invalid_private_report');
   show(body.gsc);
   showGa4(body.ga4,body.tagManager);
   status.textContent=t('گزارش خصوصی بازخوانی شد؛ هیچ درخواست مستقیم به گوگل ارسال نشد.',
     'Private observation loaded; no live Google API request was made.');
  }catch{
   if(current===epoch&&!workspace.hidden&&panel.open){
    results.replaceChildren();
    status.textContent=t('داده در دسترس نیست یا نشست مدیریت منقضی شده است.',
      'Data unavailable or administrator session has expired.');
   }
  }finally{
   if(current===epoch){request=null;refresh.disabled=false;}
  }
 }
 refresh.addEventListener('click',()=>{void load();});
})();
