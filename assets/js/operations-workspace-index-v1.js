/* JR Operations Workspace Index v1 — navigation only.
 * Existing operations access gates, API calls, status and form data are untouched.
 * No local/session storage, telemetry, credentials, new API, or feature activation.
 * Index appears only inside #ops-workspace after the existing administrator gate.
 */
(()=>{
 'use strict';
 const workspace=document.getElementById('ops-workspace');
 if(!workspace)return;
 const en=document.documentElement.lang==='en';
 const text=en?{
   placeholder:'Filter existing operations sections…',
   label:'Filter operational workspaces',
   clear:'Clear filter',
   empty:'No matching area. Try a broader term.',
   count:n=>n+' operational areas',
   shown:name=>'Opened existing workspace: '+name,
   closed:'Workspace is locked; access requires verified administrator authentication.',
   shortcut:'Press / to search',
   fallback:'Area currently unavailable in this edition.'
 }:{
   placeholder:'جستجو در بخش‌های عملیاتی…',
   label:'جستجوی بخش‌های مرکز مدیریت',
   clear:'پاک کردن جستجو',
   empty:'بخشی با این عبارت یافت نشد؛ عبارت کوتاه‌تری امتحان کنید.',
   count:n=>new Intl.NumberFormat('fa-IR').format(n)+' بخش عملیاتی',
   shown:name=>'بخش موجود باز شد: '+name,
   closed:'این بخش خصوصی قفل است و فقط پس از تأیید مدیر نمایش داده می‌شود.',
   shortcut:'کلید / برای جستجو',
   fallback:'این بخش در نسخه حاضر موجود نیست.'
 };
 // Preserve the original server-gated HTML shell and mount navigation entirely
 // inside the hidden workspace. Existing MFA/role checks still control visibility.
 const make=(tag,klass,value)=>{
  const element=document.createElement(tag);
  if(klass)element.className=klass;
  if(value!==undefined)element.textContent=value;
  return element;
 };
 const nav=make('details','ops-workspace-index');
 nav.id='ops-navigator';
 nav.dataset.opsWorkspaceIndex='';
 nav.open=false;
 const summary=make('summary');
 summary.append(make('span',null,en?'Explore operations workspaces':'دسترسی سریع به بخش‌های مدیریت'));
 const body=make('div','ops-index-inner');
 body.append(make('p','ops-muted',en
  ?'This navigation opens existing operational sections only. It cannot change payment, editorial, security or release states.'
  :'این فهرست فقط بخش‌های واقعی مدیریت را باز می‌کند؛ هیچ وضعیت مالی، داوری، انتشار یا گواهی عملیاتی را تغییر نمی‌دهد.'));
 const controls=make('div','ops-index-controls');
 const label=make('label',null,en?'Search sections':'جستجوی بخش');
 label.htmlFor='ops-index-search';
 const input=make('input');
 input.id='ops-index-search';input.type='search';input.autocomplete='off';input.maxLength=100;
 input.dataset.opsIndexFilter='';
 input.setAttribute('aria-controls','ops-index-links');
 label.append(input);
 const clearButton=make('button',null,text.clear);
 clearButton.type='button';clearButton.dataset.opsIndexClear='';clearButton.hidden=true;
 controls.append(label,clearButton);body.append(controls);
 const count=make('p','ops-index-count');count.dataset.opsIndexCount='';body.append(count);
 const results=make('div','ops-index-list');results.id='ops-index-links';results.dataset.opsIndexList='';
 body.append(results);
 const footer=make('div','ops-index-footer');
 const hint=make('span',null,text.shortcut);hint.dataset.opsIndexHint='';
 const feedback=make('p','ops-index-status');feedback.dataset.opsIndexStatus='';
 feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');
 footer.append(hint,feedback);body.append(footer);
 nav.append(summary,body);
 // Place the legacy directory after the primary cockpit instead of above it.
 // The catalogue is collapsed by default and remains available on demand.
 const anchor=workspace.querySelector('.ops-jump');
 if(anchor)anchor.after(nav);
 else workspace.append(nav);
 const groups=[
   {id:'ops-command-center',group:'health',label:en?'Owner command center':'مرکز فرماندهی مدیر'},
   {id:'ops-alert-center',group:'health',label:en?'Incident and email alert control':'هشدارها و کنترل ایمیل'},
   {id:'ops-database-health',group:'health',label:en?'Mother database health':'سلامت دیتابیس مادر'},
   {id:'ops-http-health',group:'health',label:en?'HTTP, 404 and error intake':'خطاهای HTTP و ورودی‌های ۴۰۴'},
   {id:'ops-response-monitor',group:'health',label:en?'HTTPS, response headers and redirects':'هدرهای امنیتی و ریدایرکت'},
   {id:'ops-page-quality',group:'evidence',label:en?'SEO, GEO and 13 page quality scores':'نمرات کیفیت، سئو و GEO تمام صفحات'},
   {id:'ops-master-engine-control',group:'integrations',label:en?'13-engine operational coverage':'پوشش عملیاتی ۱۳ موتور'},
   {id:'ops-source-directory',group:'integrations',label:en?'Source and provider connections':'منابع داده و اتصال‌ها'},
   {id:'ops-collection-settings',group:'integrations',label:en?'Collection policies and manual fetch':'تنظیمات منابع و واکشی دستی'},
   {id:'ops-github-audits',group:'integrations',label:en?'GitHub collection and audit history':'گردآوری و حسابرسی GitHub'},
   {id:'ops-editor-workbench',group:'publishing',label:en?'Website content workbench':'میز ویرایش و محتوای سایت'},
   {id:'jr-community-admin',group:'publishing',label:en?'Content and comment moderation':'مدیریت و تأیید دیدگاه‌ها'},
   {id:'ops-jhela-maturity',group:'publishing',label:en?'JHELA evidence and maturity':'شواهد و آمادگی نشریه'},
   {id:'ops-keyword-master',group:'evidence',label:en?'Keyword strategy':'راهبرد کلیدواژه'},
   {id:'jr-intelligence',group:'evidence'},
   {id:'ops-reporting',group:'evidence',label:en?'13-engine reports and verified evidence':'گزارش‌های ۱۳ موتور و شواهد معتبر'},
   {id:'ops-ai-visibility',group:'evidence'},
   {id:'ops-gsc-direct',group:'evidence'},
   {id:'ops-audit-timeline',group:'evidence'},
   {id:'ops-cards',group:'evidence',label:en?'Evidence and engine register':'فهرست موتورهای عملیاتی'},
   {id:'ops-stage7-blueprint',group:'planning'},
   {id:'ops-scientific-readiness',group:'evidence',label:en?'Scientific systems — verified readiness':'آمادگی سامانه‌های علمی — وضعیت واقعی'},
   {id:'ops-commerce',group:'commerce'},
   {id:'ops-publishing-author-review',group:'publishing'},
   {id:'ops-author-dashboard-preview',group:'publishing',label:en?'Author dashboard — design preview':'پیش‌نمایش طراحی کامل داشبورد مؤلف'},
   {id:'ops-author-real-view',group:'publishing',label:en?'View actual author dashboards (read-only)':'مشاهده داشبورد واقعی مؤلفان (فقط خواندنی)'},
   {id:'ops-jhela-workstream',group:'publishing'},
   {id:'ops-social',group:'social'},
   {id:'ops-social-composer',group:'social'},
   {id:'ops-social-review',group:'social'},
   {id:'ops-social-settings',group:'social'},
   {id:'ops-organic-growth',group:'planning'},
   {id:'ops-revenue-planning',group:'planning'},
   {id:'ops-free-resources',group:'resources'}
 ];
 const groupNames=en?{
   health:'Site health and alerts',integrations:'Engines and sources',
   evidence:'Evidence and quality',planning:'Strategy and planning',
   commerce:'Commerce and orders',publishing:'Scholarly publishing',
   social:'Publication and media',resources:'Resources and tools'
 }:{
   health:'سلامت و هشدارهای سایت',integrations:'موتورها و منابع',
   evidence:'شواهد و کیفیت',planning:'راهبرد و برنامه‌ریزی',
   commerce:'سفارش‌ها و تجارت',publishing:'انتشارات علمی',
   social:'انتشار و رسانه‌ها',resources:'منابع و ابزارها'
 };
 const filter=nav.querySelector('[data-ops-index-filter]');
 const list=nav.querySelector('[data-ops-index-list]');
 const counter=nav.querySelector('[data-ops-index-count]');
 const status=nav.querySelector('[data-ops-index-status]');
 const clear=nav.querySelector('[data-ops-index-clear]');
 if(!filter||!list||!counter||!status||!clear)return;
 const normalize=value=>String(value||'').normalize('NFKC')
  .toLocaleLowerCase(en?'en':'fa').replace(/[\u064b-\u065f\u0670\u0640]/g,'')
  .replace(/[يى]/g,'ی').replace(/ك/g,'ک').replace(/[\u200c\u200d]/g,' ')
  .replace(/\s+/g,' ').trim();
 // The main report is rendered only after successful MFA. Resolve targets on
 // each unlocked render, rather than freezing their absence at page startup.
 function indexedItems(){return groups.map(entry=>{
   const target=document.getElementById(entry.id);
   if(!target||!workspace.contains(target))return null;
   const title=entry.label||target.querySelector(':scope > summary,:scope > h2')?.textContent?.trim()||'';
   if(!title)return null;
   return {...entry,target,title};
 }).filter(Boolean);}
 let built=false;
 function focusTarget(target){
   const focus=target.matches('details')?
     target.querySelector(':scope > summary'):(target.querySelector(':scope > h2')||target);
   if(!focus)return;
   // A temporary programme focus target does not alter saved content or permissions.
   if(!focus.hasAttribute('tabindex'))focus.setAttribute('tabindex','-1');
   focus.focus({preventScroll:true});
   target.scrollIntoView({behavior:'auto',block:'start'});
 }
 function render(){
   if(workspace.hidden)return;
   const q=normalize(filter.value);
   list.replaceChildren();
   const items=indexedItems();
   const matches=items.filter(x=>normalize(groupNames[x.group]+' '+x.title).includes(q));
   const categories=new Map();
   for(const x of matches){
     if(!categories.has(x.group)){
       const group=document.createElement('section');
       group.className='ops-index-group';
       const h=document.createElement('h3');h.textContent=groupNames[x.group];
       const tiles=document.createElement('div');tiles.className='ops-index-tiles';
       group.append(h,tiles);list.append(group);
       categories.set(x.group,tiles);
     }
     const action=document.createElement('button');
     action.type='button';action.className='ops-index-tile';
     action.textContent=x.title;action.setAttribute('data-ops-target',x.id);
     action.addEventListener('click',()=>{
       if(workspace.hidden)return;
       // Existing disclosure panels are opened, never replaced or automatically acted upon.
       if(x.target.matches('details'))x.target.open=true;
       nav.open=false;
       focusTarget(x.target);
       status.textContent=text.shown(x.title);
     });
     categories.get(x.group).append(action);
   }
   counter.textContent=text.count(matches.length);
   if(!matches.length){
     const empty=document.createElement('p');
     empty.className='ops-index-empty';empty.textContent=text.empty;list.append(empty);
   }
   clear.hidden=!filter.value;
 }
 function unlock(){
   if(workspace.hidden)return;
   if(!built){
     built=true;
     filter.setAttribute('aria-label',text.label);
     filter.setAttribute('placeholder',text.placeholder);
     clear.textContent=text.clear;
     nav.querySelector('[data-ops-index-hint]').textContent=text.shortcut;
   }
   render();
 }
 filter.addEventListener('input',render);
 clear.addEventListener('click',()=>{filter.value='';render();filter.focus()});
 const observer=new MutationObserver(()=>{
   if(workspace.hidden){
     nav.open=false;filter.value='';list.replaceChildren();counter.textContent='';status.textContent=text.closed;
   }else unlock();
 });
 observer.observe(workspace,{attributes:true,attributeFilter:['hidden']});
 document.addEventListener('keydown',event=>{
   if(workspace.hidden||event.defaultPrevented||event.altKey||event.ctrlKey||event.metaKey)return;
   const el=event.target;
   if(el?.closest?.('input,textarea,select,[contenteditable="true"],[role="textbox"]'))return;
   if(event.key==='/'&&!nav.open){
     event.preventDefault();nav.open=true;unlock();filter.focus();
   }else if(event.key==='/'&&nav.open){
     event.preventDefault();filter.focus();filter.select();
   }
 });
 if(!workspace.hidden)unlock();
})();
