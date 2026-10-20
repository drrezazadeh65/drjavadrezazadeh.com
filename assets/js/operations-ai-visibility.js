/* Owner-only AI visibility: dated Ubersuggest evidence, never live inference.
 * Uses existing MFA operations API and never calls Ubersuggest from browsers.
 */
(()=>{
 'use strict';
 const workspace=document.getElementById('ops-workspace');
 const panel=document.getElementById('ops-ai-visibility');
 if(!workspace||!panel||!workspace.contains(panel))return;
 const en=document.documentElement.lang==='en';
 const t=(fa,eng)=>en?eng:fa;
 const refresh=panel.querySelector('[data-aisv-refresh]');
 const status=panel.querySelector('[data-aisv-status]');
 const results=panel.querySelector('[data-aisv-results]');
 if(!refresh||!status||!results)return;
 let generation=0;
 const element=(tag,content,klass)=>{
  const node=document.createElement(tag);
  if(content!==undefined)node.textContent=String(content);
  if(klass)node.className=klass;
  return node;
 };
 const val=value=>value===null||value===undefined?t('داده موجود نیست','N/A'):String(value);
 const pct=value=>value===null||value===undefined?t('داده موجود نیست','N/A'):String(value)+'%';
 function reset(){
  generation++;results.replaceChildren();status.textContent='';refresh.disabled=false;
 }
 workspace.addEventListener('jr:operations-locked',()=>{
  reset();panel.open=false;
 });
 panel.addEventListener('toggle',()=>{
  if(workspace.hidden||!panel.open){reset();return;}
  void load();
 });
 function show(snapshot){
  results.replaceChildren();
  if(snapshot.status!=='provider_report_snapshot'){
   results.append(element('p',t(
    'هنوز داده‌ای از منبع معتبر برای نمایش ثبت نشده است؛ فقدان داده معادل صفر نیست.',
    'No verified provider observation is available; missing data is not zero.'
   ),'ops-muted'));return;
  }
  const context=element('p',
   t('منبع: ','Source: ')+String(snapshot.source||'Ubersuggest')+' · '+
   t('تاریخ بازیابی: ','Retrieved: ')+val(snapshot.retrievedOn)+' · '+
   t('محدوده: انگلیسی / آمریکا','Scope: English / United States'),
   'ops-muted');
  results.append(context);
  const totals=element('div',undefined,'ops-grid');
  const stat=(label,value,note)=>{
   const card=element('article',undefined,'ops-card');
   card.append(element('small',label),element('div',value,'ops-number'));
   if(note)card.append(element('p',note,'ops-muted'));
   totals.append(card);
  };
  stat(t('پرسش‌های ثابت','Fixed prompts'),val(snapshot.fixedPromptCount));
  stat(t('پاسخ‌های نمونه‌برداری‌شده','Sampled answers'),val(snapshot.sampledAnswers));
  stat(t('پاسخ‌های دارای نام برند','Answers mentioning brand'),val(snapshot.brandMentions));
  stat(t('حضور در همین نمونه','Presence in this sample'),pct(snapshot.brandPresencePercent),
   t('این نرخ به سایر مدل‌ها، زمان‌ها یا کشورها تعمیم داده نمی‌شود.',
     'Not a general score for other models, regions or time periods.'));
  results.append(totals);
  const providers=element('section',undefined,'ops-panel');
  providers.append(element('h3',t('پوشش قابل اندازه‌گیری ارائه‌دهندگان','Provider measurement coverage')));
  const providerList=element('ul');
  const names={openai:'OpenAI / ChatGPT',gemini:'Gemini',google_aio:'Google AI Overviews'};
  for(const row of snapshot.providers||[]){
   const name=names[row.provider]||row.provider;
   providerList.append(element('li',name+' · '+
    t('نمونه‌ها: ','Samples: ')+val(row.sampledAnswers)+' · '+
    t('حضور برند: ','Brand presence: ')+pct(row.brandPresencePercent)+' · '+
    t('ارجاع مستند: ','Verified website citations: ')+val(row.verifiedCitationCount)));
  }
  providers.append(providerList);results.append(providers);
  const detail=element('details',undefined,'ops-panel');
  detail.append(element('summary',t('۱۰ پرسش ثابت و نگاشت به صفحات موجود','Ten fixed prompts and existing page mappings')));
  const list=element('ol');
  for(const p of snapshot.prompts||[]){
   const item=element('li');
   item.append(element('p',p.prompt));
   item.append(element('small',
    t('پاسخ‌های ثبت‌شده: ','Recorded samples: ')+val(p.sampledAnswers)+' · '+
    t('اشاره به برند: ','Brand mentions: ')+val(p.brandMentions)+' · '+
    t('نرخ مشاهده‌شده: ','Observed rate: ')+pct(p.brandPresencePercent)));
   if(typeof p.primaryPublicRoute==='string'&&
    /^\/en\/(?:[a-z0-9-]+\/){1,3}$/.test(p.primaryPublicRoute)){
    const route=element('a',t('صفحه عمومی مرتبط','Related public page'));
    route.href=p.primaryPublicRoute;route.rel='noopener noreferrer';
    item.append(element('p')).lastChild.append(route);
   }
   list.append(item);
  }
  detail.append(list);results.append(detail);
  results.append(element('p',
   t('ارجاعات قابل راستی‌آزمایی، رتبه‌ها و تغییر تاریخی هنوز نامشخص‌اند. دادهٔ منبع برای مرور مدیریتی ثبت شده، نه برای تأیید نمایه‌سازی یا افزایش دیده‌شدن.',
    'Verified citation URLs, ranking and historical change remain unavailable. This is a dated source observation, not proof of indexing or improvement.'),
    'ops-muted'));
 }
 async function load(){
  if(workspace.hidden||!panel.open)return;
  const epoch=++generation;
  refresh.disabled=true;
  results.replaceChildren();
  status.textContent=t('در حال دریافت گزارش خصوصی ثبت‌شده…','Loading saved private evidence…');
  try{
   const response=await fetch('/api/admin/operations/ai-visibility',{
    method:'GET',credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}
   });
   const data=await response.json();
   if(epoch!==generation||workspace.hidden||!panel.open)return;
   if(!response.ok||data?.ok!==true||data.schema!=='jr-owner-aisv-snapshot-v1'
    ||!['provider_report_snapshot','unavailable'].includes(data.status)
    ||!Array.isArray(data.prompts)||!Array.isArray(data.providers))throw Error('source_invalid');
   show(data);
   status.textContent=data.status==='provider_report_snapshot'
    ?t('شواهد مشاهده‌شدهٔ Ubersuggest بارگذاری شدند؛ استعلام جدیدی از سرویس بیرونی انجام نشد.',
       'Saved Ubersuggest evidence loaded; no new external samples were collected.')
    :t('داده معتبر در دسترس نیست؛ هیچ عددی فرض نشد.','No valid evidence; no values assumed.');
  }catch{
   if(epoch===generation&&!workspace.hidden&&panel.open){
    results.replaceChildren();
    status.textContent=t('گزارش در دسترس نیست؛ دوباره احراز هویت و تلاش کنید.',
      'Evidence unavailable; check administrator MFA and try again.');
   }
  }finally{if(epoch===generation)refresh.disabled=false;}
 }
 refresh.addEventListener('click',load);
})();
