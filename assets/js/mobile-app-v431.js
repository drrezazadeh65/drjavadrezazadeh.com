/* v4.3.1 mobile app shell: task navigation, contextual icons, app-like sheets */
(()=>{
const q=(s,r=document)=>r.querySelector(s),qa=(s,r=document)=>[...r.querySelectorAll(s)];
const raw=location.pathname.replace(/index\.html$/,'');
const gh='/drjavadrezazadeh.com/';
const base=raw.includes(gh)?gh:'/';
const path=base==='/'?raw:'/'+raw.slice(base.length);
const isFa=path.startsWith('/fa/');
const privatePrefixes=['/fa/app/','/app/','/en/account/','/fa/assessments/','/assessments/','/en/golden-talent/assessment/','/en/golden-talent/dashboard/','/en/golden-talent/observer/','/en/golden-talent/roles/','/en/golden-talent/student/'];
if(privatePrefixes.some(p=>path.startsWith(p))||path.startsWith('/journal/'))return;
/* Some legacy inner pages include this shell directly AND through site-extras.
   A second bootstrap must not remove the first dock, destroy focus, or attach
   duplicate menu/cart event handlers. Keep this document-scoped and private-safe. */
if(document.documentElement.dataset.jrMobileAppShellInitialized==='1')return;
document.documentElement.dataset.jrMobileAppShellInitialized='1';
const u=p=>base+p.replace(/^\//,'');
if(!q('link[data-v431-mobile-shell],link[href*="mobile-app-v431.css"]')){
 const l=document.createElement('link');l.rel='stylesheet';l.href=u('assets/css/mobile-app-v431.css?v=431c');l.dataset.v431MobileShell='1';document.head.appendChild(l);
}
/* Keep pre-approved stylesheet bundles byte-for-byte stable; this is an additive
   brand-token mobile enhancement shared by all existing public shell routes. */
if(!q('link[data-jr-native-mobile]')){
 const layer=document.createElement('link');
 layer.rel='stylesheet';layer.href=u('assets/css/mobile-native-20261021.css?v=1');
 layer.dataset.jrNativeMobile='1';document.head.appendChild(layer);
}
const paths={
home:'<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10"/><path d="M9 20v-6h6v6"/>',
user:'<circle cx="12" cy="8" r="3.5"/><path d="M5 20c.7-4 3-6 7-6s6.3 2 7 6"/>',
chat:'<path d="M4 5h16v11H9l-5 4z"/>',
book:'<path d="M4 5.5c3-1 5.5-.6 8 1v13c-2.5-1.6-5-2-8-1z"/><path d="M20 5.5c-3-1-5.5-.6-8 1v13c2.5-1.6 5-2 8-1z"/>',
menu:'<path d="M5 7h14M5 12h14M5 17h14"/>',
bag:'<path d="M5 8h14l-1 12H6z"/><path d="M9 9V7a3 3 0 0 1 6 0v2"/>',
search:'<circle cx="11" cy="11" r="6"/><path d="m16 16 4 4"/>',
graduation:'<path d="m3 9 9-5 9 5-9 5z"/><path d="M7 12v4c3 2 7 2 10 0v-4"/><path d="M21 9v6"/>',
briefcase:'<rect x="4" y="7" width="16" height="12" rx="2"/><path d="M9 7V5h6v2M4 12h16"/>',
globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/>',
lock:'<rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
spark:'<path d="m12 3 1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z"/><path d="m18.5 15 .8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>',
news:'<path d="M5 4h14v16H5z"/><path d="M8 8h8M8 12h8M8 16h5"/>',
path:'<path d="M5 18c3-6 5-7 8-7 2.5 0 3.5-2 6-6"/><circle cx="5" cy="18" r="1.5"/><circle cx="13" cy="11" r="1.5"/><circle cx="19" cy="5" r="1.5"/>'
};
const icon=n=>'<svg class="app-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">'+(paths[n]||paths.path)+'</svg>';
const iconFor=(href,label='')=>{
 const s=(href+' '+label).toLowerCase();
 if(/shop|bookstore|فروشگاه/.test(s))return'bag';
 if(/golden|talent|استعداد/.test(s))return'spark';
 if(/consult|مشاور|contact|تماس/.test(s))return'chat';
 if(/search|جست/.test(s))return'search';
 if(/privacy|حریم|secure|account|حساب/.test(s))return'lock';
 if(/research|پژوهش|publication|انتشار|journal|jhela/.test(s))return'book';
 if(/teach|student|education|تدریس|دانش|آموزش/.test(s))return'graduation';
 if(/collaboration|invite|همکاری/.test(s))return'briefcase';
 if(/news|اخبار|guide|راهنما/.test(s))return'news';
 if(/cv|resume|رزومه|about|درباره/.test(s))return'user';
 if(/international|english|فارسی|language|زبان/.test(s))return'globe';
 return'path';
};
// The shared installed-mobile shell used to REPLACE the fixed four-action
// homepage dock after initial paint. Reconcile one source of truth here:
 // preserve the already-rendered homepage dock; create equivalent 4-way
// tabs only for ordinary FA/EN public informational pages.
// Authenticated spaces, journal, commerce/cart/checkout and consultant intake
// keep their specialist navigators and pre-existing cart control.
const isHomepage=path==='/fa/'||path==='/en/';
const commerceOrPrivate= /^\/(?:fa|en)\/(?:shop|checkout|cart|payment|order|orders|login|register|recover|bazyabi-hesab|account|app|assessments|request-consultation|darkhast-moshavere)(?:\/|$)/.test(path)||
  /^\/en\/golden-talent\/(?:assessment|dashboard|checkout|plans|roles|observer|student)(?:\/|$)/.test(path)||
  /^\/(?:fa|en)\/services\/(?:checkout|cart|payment)(?:\/|$)/.test(path);
const needDockEligible=/^\/(?:fa|en)\//.test(path) &&
  !commerceOrPrivate && Boolean(q('.site-header'));
const standardTabs=isFa?[
 [u('fa/'),'خانه','home'],[u('fa/golden-talent/'),'استعداد','spark'],[u('fa/shop/'),'فروشگاه','bag'],[u('fa/darkhast-moshavere/'),'مشاوره','chat'],[u('fa/login/'),'حساب','user']
]:[
 [u('en/'),'Home','home'],[u('en/golden-talent/'),'Talent','spark'],[u('en/shop/'),'Shop','bag'],[u('en/request-consultation/'),'Consult','chat'],[u('en/login/'),'Account','user']
];
const needTabs=isFa?[
 [u('fa/'),'خانه','home'],[u('fa/masir-man/'),'کاوش','search'],
 [u('fa/masir-man/#need'),'دستیار','spark'],
 [u('fa/customer-dashboard/'),'حساب من','user']
]:[
 [u('en/'),'Home','home'],[u('en/my-path/'),'Explore','search'],
 [u('en/my-path/#need'),'AI Assistant','spark'],
 [u('en/account/'),'My Account','user']
];
const tabs=needDockEligible?needTabs:standardTabs;
const sheet=isFa?[
 [u('fa/masir-man/'),'مسیر من؛ از نیاز شروع کن'],[u('fa/bahar/'),'BAHAR؛ برنامه مطالعه رایگان'],
 [u('fa/darbare-man/'),'درباره دکتر رضازاده'],[u('fa/rezome/'),'رزومه علمی'],[u('fa/khadamat/'),'خدمات آموزشی'],[u('fa/tadris/'),'تدریس دانشگاهی'],[u('fa/ketab-ha/'),'کتاب‌ها'],[u('fa/shop/'),'فروشگاه کتاب'],[u('fa/amoozesh-zaban/'),'آموزش زبان انگلیسی'],[u('fa/pajouhesh/'),'پژوهش'],[u('fa/entesharat-elmi/'),'انتشارات علمی'],[u('fa/faaliat-haye-elmi/'),'فعالیت‌های علمی'],[u('fa/entekhab-reshteh/'),'انتخاب رشته'],[u('fa/estedaadyabi/'),'استعدادیابی'],[u('fa/moshavere-konkur/'),'مشاوره کنکور'],[u('fa/danesh-amoozan/'),'دانش‌آموزان'],[u('fa/rahnamaha/'),'راهنماها'],[u('fa/tamas/'),'تماس'],[u('fa/harim-khosusi/'),'حریم خصوصی'],[u('fa/jostojo/'),'جست‌وجو'],[u('publisher/'),'Rezazadeh Foundation Press'],[u('journal/'),'JHELA']
]:[
 [u('en/my-path/'),'My Learning Path'],[u('en/bahar/'),'BAHAR Free Study Planner'],
 [u('en/about/'),'About'],[u('en/cv/'),'Public CV'],[u('en/services/'),'Services'],[u('en/academic-profile/'),'Academic Profile'],[u('en/language-education/'),'Language Education'],[u('en/student-guidance/'),'Student Guidance'],[u('en/teacher-education/'),'Teacher Education'],[u('en/teaching/'),'University Teaching'],[u('en/books/'),'Books'],[u('en/shop/'),'Bookstore'],[u('en/publications/'),'Publications'],[u('en/academic-engagements/'),'Academic Engagements'],[u('en/research/'),'Research'],[u('en/projects/'),'Public Projects'],[u('en/collaboration/'),'International Collaboration'],[u('en/news-insights/'),'News & Insights'],[u('en/contact/'),'Contact'],[u('en/search/'),'Search'],[u('en/golden-talent/'),'Golden Talent'],[u('publisher/'),'Rezazadeh Foundation Press'],[u('journal/'),'JHELA'],[u('fa/'),'فارسی']
];
// Never remove the native 4-tab homepage dock: its accessibility proxy and
// single existing concierge are already wired there by the page-level JS.
const originalHomeDock=needDockEligible&&isHomepage?
  q('.app-dock[data-jr-home-primary-dock]'):null;
if(!originalHomeDock)q('.app-dock')?.remove();
q('#mobile-app-menu')?.remove();
const header=q('.site-header');
if(header&&!q('.mobile-menu-trigger',header)){
 const trigger=document.createElement('button');trigger.type='button';trigger.className='mobile-menu-trigger';trigger.setAttribute('data-nav-toggle','');trigger.setAttribute('aria-controls','mobile-app-menu');trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-label',isFa?'بازکردن منو':'Open menu');trigger.innerHTML=icon('menu');header.appendChild(trigger);
}
const nav=originalHomeDock||document.createElement('nav');
if(!originalHomeDock){
 nav.className='app-dock';
 nav.setAttribute('aria-label',isFa?'منوی اصلی اپ':'App navigation');
}
if(needDockEligible){
 nav.dataset.jrNeedPrimaryDock='1';
 document.body.classList.add('jr-need-primary-dock-active');
}
const isInstalled=navigator.standalone===true||window.matchMedia?.('(display-mode: standalone)').matches;
const installControl=isInstalled?'':'<button type="button" class="dock-action jr-dock-install" data-jr-dock-install aria-label="'+(isFa?'نصب اپلیکیشن':'Install website app')+'">'+
  '<svg class="app-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 3v12m-5-5 5 5 5-5M5 17v4h14v-4"/></svg><span>'+(isFa?'نصب':'Install')+'</span></button>';
if(!originalHomeDock){
 nav.innerHTML=tabs.map(([h,l,i],index)=>
   '<a href="'+h+'" data-app-tab="'+i+'"'+
   (needDockEligible&&index===2?' data-jr-open-assistant data-jr-assistant-fallback="'+h+'"':'')+
   '>'+icon(i)+'<span>'+l+'</span>'+
   (i==='bag'?'<b class="app-cart-badge" data-app-cart-count hidden>0</b>':'')+
   '</a>').join('');
 document.body.appendChild(nav);
}
if(needDockEligible){
 // Lazy additive assets use the current approved mobile shell. No extra
 // database, second AI backend, new dialog or competing service worker.
 if(!q('link[href*="jr-home-primary-dock-v4.css"]')){
  const style=document.createElement('link');style.rel='stylesheet';
  style.href=u('assets/css/jr-home-primary-dock-v4.css?v=20261022-need-dock-2');
  document.head.appendChild(style);
 }
 if(!q('script[src*="jr-home-primary-dock-v4.js"]')){
  const script=document.createElement('script');
  script.src=u('assets/js/jr-home-primary-dock-v4.js?v=20261022-need-dock-2');
  script.defer=true;document.head.appendChild(script);
 }
}
const panel=document.createElement('div');panel.className='mobile-app-sheet';panel.id='mobile-app-menu';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label',isFa?'دسترسی سریع':'Explore');
panel.innerHTML='<div class="app-sheet-panel"><div class="app-sheet-head"><div><small>'+(isFa?'ناوبری اپ':'APP NAVIGATION')+'</small><strong>'+(isFa?'دسترسی سریع':'Explore')+'</strong></div><button type="button" class="app-sheet-close" data-nav-close aria-label="'+(isFa?'بستن منو':'Close menu')+'">×</button></div><div class="app-sheet-search"><label for="jr-mobile-quick-find">'+(isFa?'جست‌وجوی سریع در بخش‌های سایت':'Quickly find a site section')+'</label><input id="jr-mobile-quick-find" data-jr-mobile-quick-find type="search" autocomplete="off" spellcheck="false" placeholder="'+(isFa?'نام خدمت، کتاب یا بخش...':'Service, book or section...')+'" aria-controls="jr-mobile-quick-links"><span data-jr-mobile-search-count role="status" aria-live="polite"></span></div><div class="app-sheet-grid" id="jr-mobile-quick-links">'+sheet.map(([h,l])=>'<a href="'+h+'"><span class="sheet-icon">'+icon(iconFor(h,l))+'</span><b>'+l+'</b><span class="sheet-chevron" aria-hidden="true">›</span></a>').join('')+'</div><p class="app-sheet-empty" data-jr-mobile-empty hidden>'+(isFa?'بخشی با این عبارت پیدا نشد. عبارت دیگری وارد کنید.':'No section matched. Try another term.')+'</p>'+(installControl?'<div class="app-sheet-install">'+installControl+'</div>':'')+(isInstalled?'<div class="app-sheet-update"><button type="button" data-jr-app-update-check>'+icon('path')+'<span>'+(isFa?'بررسی نسخه جدید اپلیکیشن':'Check for app updates')+'</span></button><p data-jr-app-update-status role="status" aria-live="polite">'+(isFa?'در صورت انتشار نسخه جدید، به‌روزرسانی با تأیید شما انجام می‌شود.':'Updates are announced before you choose to refresh.')+'</p></div>':'')+'</div>';
document.body.appendChild(panel);

if(installControl){
 const installButton=q('[data-jr-dock-install]',panel);
 installButton?.addEventListener('click',async()=>{
  if(navigator.standalone===true||window.matchMedia?.('(display-mode: standalone)').matches){
   installButton.closest('.app-sheet-install')?.remove();return;
  }
  const requested=typeof window.jrPwaRequest==='function'&&await window.jrPwaRequest();
  if(requested)return;
  let note=q('[data-jr-install-help]');
  if(!note){
   note=document.createElement('div');
   note.dataset.jrInstallHelp='1';note.className='jr-dock-install-help';
   note.setAttribute('role','status');note.setAttribute('aria-live','polite');
   document.body.appendChild(note);
  }
  const ios=/iPhone|iPad|iPod/i.test(navigator.userAgent||'');
  note.textContent=ios
    ?(isFa?'در Safari، اشتراک‌گذاری و سپس افزودن به صفحه اصلی را انتخاب کنید.':'In Safari, select Share, then Add to Home Screen.')
    :(isFa?'از منوی مرورگر، گزینه نصب برنامه یا افزودن به صفحه اصلی را انتخاب کنید.':'From your browser menu, choose Install app or Add to Home Screen.');
  note.hidden=false;
 });
 window.addEventListener('appinstalled',()=>{
  installButton?.closest('.app-sheet-install')?.remove();
  q('[data-jr-install-help]')?.remove();
 },{once:true});
}
// Private-safe, client-side discovery: no search query is stored or transmitted.
const sheetSearch=q('[data-jr-mobile-quick-find]',panel);
const sheetLinks=qa('.app-sheet-grid a',panel);
const normalizeSheetTerm=value=>value.normalize('NFKC').toLocaleLowerCase().replace(/[\u064B-\u065F]/g,'').replace(/[يى]/g,'ی').replace(/ك/g,'ک').trim();
const applySheetSearch=()=>{
  const query=normalizeSheetTerm(sheetSearch.value);
  let visible=0;
  for(const link of sheetLinks){
    const label=normalizeSheetTerm(link.textContent+' '+new URL(link.href,location.href).pathname);
    link.hidden=Boolean(query)&&!label.includes(query);
    if(!link.hidden)visible++;
  }
  q('[data-jr-mobile-empty]',panel).hidden=visible!==0;
  q('[data-jr-mobile-search-count]',panel).textContent=query
    ?(isFa?'نتیجه: '+visible+' بخش':visible+' matching sections')
    :'';
};
sheetSearch?.addEventListener('input',applySheetSearch);
const updateButton=q('[data-jr-app-update-check]',panel);
updateButton?.addEventListener('click',async()=>{
  const status=q('[data-jr-app-update-status]',panel);
  updateButton.disabled=true;
  status.textContent=isFa?'در حال بررسی نسخه جدید...':'Checking for updates...';
  try{
    const check=window.jrPwaCheckForUpdates;
    let outcome;
    if(typeof check==='function')outcome=await check();
    else if('serviceWorker' in navigator){
      const reg=await navigator.serviceWorker.getRegistration();
      if(reg){await reg.update();outcome='checked'}
    }
    status.textContent=outcome==='checked'
      ?(isFa?'بررسی انجام شد. اگر نسخه جدیدی دریافت شود، پیام به‌روزرسانی نشان داده می‌شود.':'Check completed. An update notice will appear when a new version is ready.')
      :(isFa?'بررسی نسخه از این مرورگر یا اتصال ممکن نیست.':'Update check is unavailable in this browser or connection.');
  }catch(_){
    status.textContent=isFa?'بررسی انجام نشد؛ اتصال اینترنت را بررسی کنید.':'Check unsuccessful; verify your connection.';
  }finally{updateButton.disabled=false}
});
const current=location.pathname.replace(/index\.html$/,'');
const localeRoot=isFa?'/fa/':'/en/';
const matches=qa('.app-dock a').map(a=>{try{const p=new URL(a.href,location.href).pathname.replace(/index\.html$/,'');const exact=p===current,nested=!exact&&p!==localeRoot&&current.startsWith(p);return exact||nested?{a,p,exact}:null}catch{return null}}).filter(Boolean).sort((a,b)=>(Number(b.exact)-Number(a.exact))||(b.p.length-a.p.length));
let active=matches[0]?.a||null;
if(!active){
 const cluster=isFa
  ?(/\/fa\/(?:login|register|bazyabi-hesab)\//.test(current)?'/fa/login/':/\/fa\/(?:darkhast-moshavere|moshavere-tahsili|moshavere-konkur|entekhab-reshteh)\//.test(current)?'/fa/darkhast-moshavere/':'/fa/')
  :(/\/en\/(?:login|register|recover)\//.test(current)?'/en/login/':/\/en\/(?:request-consultation|student-guidance)\//.test(current)?'/en/request-consultation/':'/en/');
 active=qa('.app-dock a').find(a=>new URL(a.href,location.href).pathname.replace(/index\.html$/,'')===cluster)||null;
}
if(needDockEligible){
 // A deep public information page is not the /my-path/ page merely because
 // Explore is the nearest tab; only mark aria-current="page" for exact URLs.
 const realPage=qa('.app-dock a').find(a=>new URL(a.href,location.href).pathname.replace(/index\.html$/,'')===current);
 qa('.app-dock a').forEach(a=>{a.classList.remove('is-active');a.removeAttribute('aria-current')});
 if(realPage){realPage.classList.add('is-active');realPage.setAttribute('aria-current','page')}
 else{
  const explorer=qa('.app-dock a')[1];
  explorer?.classList.add('is-active');
 }
}else if(active){active.classList.add('is-active');active.setAttribute('aria-current','page')}
const syncCartBadge=()=>{
 let n=0;
 try{
  const rows=JSON.parse(localStorage.getItem('jr-book-cart-v1')||'[]');
  if(Array.isArray(rows))n=rows.reduce((sum,row)=>sum+(Number.isInteger(row?.quantity)&&row.quantity>0?Math.min(20,row.quantity):0),0);
 }catch(_){}
 qa('[data-app-cart-count]').forEach(b=>{b.textContent=String(n);b.hidden=n<1;b.setAttribute('aria-label',isFa?('تعداد کتاب در سبد: '+n):('Books in cart: '+n))});
};
syncCartBadge();
window.addEventListener('jr:cart-change',syncCartBadge);
window.addEventListener('storage',e=>{if(e.key==='jr-book-cart-v1')syncCartBadge()});
qa('.home-focus-strip a,.audience-gate').forEach(a=>{if(a.querySelector('.app-card-icon'))return;const s=document.createElement('span');s.className='app-card-icon';s.innerHTML=icon(iconFor(a.href,a.textContent||''));s.setAttribute('aria-hidden','true');a.prepend(s)});

/* v4.4.1 mobile sheet controller — accessible, back-button aware, app-like */
// site.js owns menu events when both scripts are loaded; avoid double-toggle.
if(document.documentElement.dataset.jrNavController!=='site'){

const menuTriggers=qa('[data-nav-toggle]');
const menuClose=q('[data-nav-close]');
let lastFocus=null;
const focusables=()=>qa('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])',panel).filter(el=>!el.hidden);
const setMenu=(open,{history=true}={})=>{
 if(open){
   lastFocus=document.activeElement;
   panel.hidden=false;
   requestAnimationFrame(()=>panel.classList.add('is-open'));
   document.documentElement.classList.add('nav-open');
   menuTriggers.forEach(t=>t.setAttribute('aria-expanded','true'));
   if(history && history!==false && !history.state?.mobileAppMenu) window.history.pushState({...history.state,mobileAppMenu:true},'');
   menuClose?.focus({preventScroll:true});
 }else{
   panel.classList.remove('is-open');
   document.documentElement.classList.remove('nav-open');
   menuTriggers.forEach(t=>t.setAttribute('aria-expanded','false'));
   window.setTimeout(()=>{panel.hidden=true},220);
   if(lastFocus&&document.contains(lastFocus)) lastFocus.focus({preventScroll:true});
 }
};
menuTriggers.forEach(t=>t.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();setMenu(panel.hidden||!panel.classList.contains('is-open'))}));
menuClose?.addEventListener('click',event=>{event.stopPropagation();setMenu(false)});
panel.addEventListener('click',e=>{if(e.target===panel){e.stopPropagation();setMenu(false)}});
panel.addEventListener('keydown',e=>{
 if(e.key==='Escape'){e.preventDefault();e.stopPropagation();setMenu(false);return}
 if(e.key!=='Tab')return;
 const f=focusables();if(!f.length)return;
 const first=f[0],last=f[f.length-1];
 if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
 else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
});
window.addEventListener('popstate',()=>{if(panel.classList.contains('is-open'))setMenu(false,{history:false})});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&panel.classList.contains('is-open'))setMenu(false,{history:false})});
}

})();
