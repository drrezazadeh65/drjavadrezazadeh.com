/* Admin-only design preview of the author workspace. No impersonation,
   private author API calls, fake sales, payment, role or account mutation. */
(()=>{'use strict';
 const workspace=document.getElementById('ops-workspace');
 const root=document.getElementById('ops-author-dashboard-preview');
 if(!workspace||!root||!workspace.contains(root))return;
 const status=root.querySelector('[data-author-design-status]');
 const mount=root.querySelector('[data-author-design-content]');
 if(!status||!mount)return;
 const en=document.documentElement.lang==='en';
 const t=(fa,eng)=>en?eng:fa;
 const e=(tag,cls,text)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(text!==undefined)x.textContent=text;return x;};
 const add=(parent,...children)=>{parent.append(...children);return parent;};
 let epoch=0;
 function clear(){epoch++;mount.hidden=true;mount.replaceChildren();status.textContent='';}
 workspace.addEventListener('jr:operations-locked',()=>{clear();root.open=false;});
 function render(){
  mount.replaceChildren();
  const screen=e('div','jr-ap-screen');screen.dir=en?'ltr':'rtl';
  const head=e('header','jr-ap-head'),title=e('div');
  add(title,e('span','jr-ap-brand','JR FUTURE PUBLISHING'),
   e('h3','',t('داشبورد اختصاصی مؤلف','Author dashboard')),
   e('p','',t('نمای طراحی در مرکز مدیریت — بدون تغییر نقش حساب','Visual inspection in Administration — no role switching')));
  add(head,title,e('div','jr-ap-monogram','JR'));screen.append(head);
  screen.append(e('p','jr-ap-banner',t(
   'پیش‌نمایش ساختار داشبورد مؤلف برای مدیر ارشد. تمام آمار مالی در این نما با «—» نمایش داده می‌شود؛ هیچ فروش یا تسویه ساختگی نیست.',
   'Author dashboard design preview for the owner. Financial values show dashes; no fictional sale or settlement is presented.')));
  const grid=e('div','jr-ap-grid');
  const kpis=[
   [t('خریدهای تأییدشده','Verified purchases'),'—'],
   [t('سهم تعهدشده مؤلف','Author accrued share'),t('— تومان','— toman')],
   [t('سهم صندوق استعدادها','Talent-support allocation'),t('— تومان','— toman')],
   [t('تسویه بانکی تأییدشده','Confirmed settlement'),t('— تومان','— toman')],
   [t('مانده تسویه‌نشده','Outstanding balance'),t('— تومان','— toman')],
   [t('وضعیت اعلان‌ها','Notice delivery status'),'—']
  ];
  for(const [label,val] of kpis)add(grid,add(e('article','jr-ap-kpi'),e('small','',label),e('strong','',val)));
  screen.append(grid);
  const tabs=e('div','jr-ap-nav');tabs.setAttribute('role','tablist');
  tabs.setAttribute('aria-label',t('بخش‌های داشبورد','Dashboard sections'));
  const sections=e('div');const buttons=[],panels=[];
  const defs=[
   ['overview',t('نمای کلی','Overview')],
   ['works',t('آثار','Works')],
   ['sales',t('فروش و اعلان‌ها','Sales & notices')],
   ['contracts',t('قراردادها','Contracts')],
   ['profile',t('هویت و تسویه','Identity & banking')]
  ];
  defs.forEach(([id,label])=>{
   const b=e('button','',label),p=e('section','jr-ap-panel');
   b.type='button';b.id='jr-ap-tab-'+id;b.setAttribute('role','tab');
   b.setAttribute('aria-controls','jr-ap-panel-'+id);
   p.id='jr-ap-panel-'+id;p.setAttribute('role','tabpanel');p.setAttribute('aria-labelledby',b.id);p.tabIndex=0;
   tabs.append(b);sections.append(p);buttons.push(b);panels.push(p);
  });
  const p=panels[0];
  add(p,e('h4','',t('میز کار مؤلف','Author workspace')),
   e('p','',t('چیدمان واقعی داشبورد شامل وضعیت آثار، فروش بانکی تأییدشده، گزارش تسویه، قراردادها، اعلان‌ها و پرونده حرفه‌ای است. ارقام تنها در حساب مجاز و از API خصوصی خوانده می‌شوند.',
   'The live dashboard shows works, verified sales, settlement reports, contracts, notices and professional records. Actual figures load only through the authorized private API.')));
  const tiles=e('div','jr-ap-tiles');
  for(const [title,detail] of [
   [t('مرور فروش','Sales history'),t('۵۰ تراکنش اخیر، جست‌وجو و خروجی CSV','Last 50 transactions, search and CSV export')],
   [t('شفافیت مالی','Financial breakdown'),t('سهم ۷۰٪ مؤلف و ۳۰٪ حمایت از استعدادها در فروش کامل','70% author and 30% talent support on each full-price sale')],
   [t('آثار و قراردادها','Works & contracts'),t('وضعیت اثر، پیش‌نویس قرارداد و اعلان‌ها','Work status, contract drafts and notices')]
  ])add(tiles,add(e('article','jr-ap-tile'),e('strong','',title),e('p','',detail)));
  p.append(tiles);
  add(panels[1],e('h4','',t('کتاب‌ها و آثار من','My publications')),
   e('p','',t('اثر مرتبط با این طرح: مجموعه دو PDF سؤالات و پاسخنامه تشریحی ارشد آموزش زبان انگلیسی (۱۳۷۰–۱۴۰۵)، سید محراب میرکریمی.',
   'Relevant work: Seyyed Mehrab Mirkarimi’s two-PDF TEFL MA questions and explained answers (1370–1405).')));
  const link=e('a','jr-ap-cta',t('مشاهده محصول در فروشگاه','View publication in the shop'));
  link.href=en?'/en/shop/authors/mehrab-mirkarimi/':'/fa/shop/authors/mehrab-mirkarimi/';
  panels[1].append(link);
  add(panels[2],e('h4','',t('فروش‌ها و پیام‌های مربوط به مؤلف','Sales and author notifications')),
   e('p','',t('جزئیات خرید تأییدشده، سهم مؤلف، بازپرداخت‌ها و وضعیت ایمیل در حساب واقعی دیده می‌شود؛ اینجا هیچ داده خریدار ارائه نمی‌شود.',
   'Verified purchases, author allocations, refunds and email states are shown in the private account. No buyer data is exposed here.')));
  const wrap=e('div','jr-ap-table-wrap'),table=e('table'),thead=e('thead'),tr=e('tr');
  for(const item of [t('شماره فروش','Sale ref'),t('تاریخ','Date'),t('سهم مؤلف','Author share'),t('اعلان','Notice')])tr.append(e('th','',item));
  thead.append(tr);const tbody=e('tbody'),empty=e('td','',t('داده واقعی در پیش‌نمایش طراحی بارگذاری نشده است.','Live records are not loaded in this design preview.'));
  empty.colSpan=4;tbody.append(add(e('tr'),empty));add(table,thead,tbody);wrap.append(table);panels[2].append(wrap);
  add(panels[3],e('h4','',t('قراردادهای نشر و اسناد','Contracts and agreements')),
   e('p','',t('نمایش قراردادهای ثبت‌شده، نسخه‌های پیش‌نویس و وضعیت تأیید. پیش‌نمایش، قرارداد جدید یا امضا ایجاد نمی‌کند.',
   'Registered agreements, drafts and review status. Preview does not create or sign contracts.')),
   e('p','jr-ap-muted',t('وضعیت قرارداد: —','Contract status: —')));
  add(panels[4],e('h4','',t('رزومه، احراز هویت و تسویه','Profile, identity and settlement')),
   e('p','',t('پنل واقعی شامل تکمیل رزومه، بارگذاری داده‌های هویتی از مسیر امن و ثبت اطلاعات بانکی برای تأیید مدیر است. اطلاعات کامل حساب و شبا نمایش داده نمی‌شوند.',
   'The real portal supports profile review, secure identity submission and bank details for administrative approval. Full banking information is not shown.')),
   e('p','jr-ap-muted',t('تأیید هویت: — · بررسی حساب بانکی: —','Identity: — · Bank approval: —')));
  function select(i,focus=false){buttons.forEach((b,j)=>{b.setAttribute('aria-selected',String(i===j));b.tabIndex=i===j?0:-1;});panels.forEach((p,j)=>p.hidden=i!==j);if(focus)buttons[i].focus();}
  buttons.forEach((b,i)=>{b.addEventListener('click',()=>select(i));b.addEventListener('keydown',event=>{
   let next=null;if(event.key==='ArrowRight')next=(i+1)%buttons.length;
   else if(event.key==='ArrowLeft')next=(i-1+buttons.length)%buttons.length;
   else if(event.key==='Home')next=0;
   else if(event.key==='End')next=buttons.length-1;
   if(next!==null){event.preventDefault();select(next,true);}
  });});
  select(0);add(screen,tabs,sections,e('p','jr-ap-foot',t('فقط نمایشی · هیچ اقدامی در حساب مؤلف، پرداخت، قرارداد یا دیتابیس انجام نمی‌شود.',
    'Visual-only · no author, payment, contract or database changes.')));
  mount.append(screen);mount.hidden=false;
 }
 async function show(){
  if(workspace.hidden||!root.open)return;
  const mark=++epoch;mount.replaceChildren();mount.hidden=true;
  status.textContent=t('در حال تأیید نشست دومرحله‌ای مدیر…','Checking administrator MFA…');
  try{
   const response=await fetch('/api/admin/operations/session',{credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}});
   const result=await response.json();
   if(!response.ok||result.ok!==true||result.mfaRequired===true||!result.csrfToken)throw Error('admin_mfa_required');
   if(mark!==epoch||workspace.hidden||!root.open)return;
   render();status.textContent=t('نمای طراحی باز شد؛ اعداد واقعی بارگذاری نشده‌اند.','Design preview opened; no actual financial data loaded.');
  }catch(_){if(mark===epoch&&!workspace.hidden&&root.open)status.textContent=t('ابتدا ورود و تأیید دومرحله‌ای مدیر را کامل کنید.','Complete administrator login and MFA first.');}
 }
 root.addEventListener('toggle',()=>root.open?show():clear());
 function jump(){if(location.hash!=='#ops-author-dashboard-preview'||workspace.hidden)return;
  if(!root.open)root.open=true;
  root.scrollIntoView({block:'start',behavior:'auto'});
 }
 window.addEventListener('hashchange',jump);
 new MutationObserver(()=>{if(!workspace.hidden)jump();}).observe(workspace,{attributes:true,attributeFilter:['hidden']});
 jump();
})();