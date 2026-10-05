(()=>{
const q=(s,r=document)=>r.querySelector(s),qa=(s,r=document)=>[...r.querySelectorAll(s)];
const rawPath=location.pathname.replace(/index\.html$/,'');
const gh='/drjavadrezazadeh.com/';
const base=rawPath.includes(gh)?gh:'/';
const isFa=rawPath.startsWith(base+'fa/');
const isJournal=rawPath.startsWith(base+'journal/');
const isPrivateApp=rawPath.startsWith(base+'app/')||rawPath.startsWith(base+'fa/app/');
const isPersianStudentApp=rawPath.startsWith(base+'fa/app/student/')||rawPath.startsWith(base+'fa/assessments/golden-talent/start/');
const u=p=>base+p.replace(/^\//,'');
function ensureSkipLink(){
 const main=q('main');
 if(!main)return;
 if(!main.id)main.id='main';
 if(!q('.skip')){
   const a=document.createElement('a');
   a.className='skip';a.href='#'+main.id;
   a.textContent=isFa?'رفتن به محتوای اصلی':'Skip to content';
   document.body.insertBefore(a,document.body.firstChild);
 }
}
ensureSkipLink();
const icon=n=>{
 const d={
  home:'<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10"/><path d="M9 20v-6h6v6"/>',
  user:'<circle cx="12" cy="8" r="3.5"/><path d="M5 20c.7-4 3-6 7-6s6.3 2 7 6"/>',
  chat:'<path d="M4 5h16v11H9l-5 4z"/>',
  book:'<path d="M4 5.5c3-1 5.5-.6 8 1v13c-2.5-1.6-5-2-8-1z"/><path d="M20 5.5c-3-1-5.5-.6-8 1v13c2.5-1.6 5-2 8-1z"/>',
  menu:'<path d="M5 7h14M5 12h14M5 17h14"/>',
  star:'<path d="m12 3 2.7 5.4 6 .9-4.3 4.2 1 6-5.4-2.8-5.4 2.8 1-6-4.3-4.2 6-.9z"/>',
  test:'<path d="M7 3h10v4H7z"/><path d="M6 7h12v14H6z"/><path d="m9 12 2 2 4-4"/>',
  path:'<path d="M5 18c3-6 5-7 8-7 2.5 0 3.5-2 6-6"/><circle cx="5" cy="18" r="1.5"/><circle cx="13" cy="11" r="1.5"/><circle cx="19" cy="5" r="1.5"/>',
  news:'<path d="M5 4h14v16H5z"/><path d="M8 8h8M8 12h8M8 16h5"/>'
 };
 return '<svg class="app-icon" viewBox="0 0 24 24">'+(d[n]||d.menu)+'</svg>';
};
function ensureMobileNav(){
 if(q('.app-dock')||q('.gt-mobile-dock')||isPersianStudentApp) return;
 const nav=document.createElement('nav');nav.className='app-dock';nav.setAttribute('aria-label',isFa?'منوی موبایلی':'Mobile app navigation');
 let links=[],sheet=[];
 if(isJournal){
   links=[
    [u('journal/'),isFa?'ژورنال':'Journal','home'],
    [u('journal/current/'),isFa?'شماره جاری':'Current','book'],
    [u('journal/submission/'),isFa?'ارسال مقاله':'Submit','path'],
    [u('journal/call-for-reviewers/'),isFa?'داوری':'Review','user']
   ];
   sheet=[
    [u('journal/aims-scope/'),'Aims & Scope'],
    [u('journal/author-guidelines/'),'Author Guidelines'],
    [u('journal/peer-review/'),'Peer Review'],
    [u('journal/ethics/'),'Publication Ethics'],
    [u('journal/editorial-board/'),'Editorial Board'],
    [u('journal/archive/'),'Archive'],
    [u('publisher/'),'Rezazadeh Foundation Press']
   ];
 }else if(isPrivateApp){
   const appBase=isFa?u('fa/app/'):u('app/');
   links=[
    [appBase,isFa?'خانه':'Home','home'],
    [isFa?u('fa/golden-talent/'):u('golden-talent/'),isFa?'کشف':'Discover','star'],
    [isFa?u('fa/assessments/golden-talent/'):u('assessments/'),isFa?'آزمون‌ها':'Tests','test'],
    [appBase,isFa?'مسیر من':'My Path','path']
   ];
   sheet=[
    [appBase,isFa?'داشبورد':'Dashboard'],
    [isFa?u('fa/harim-khosusi/'):u('privacy/'),isFa?'حریم خصوصی':'Privacy'],
    [isFa?u('fa/darkhast-moshavere/'):u('fa/darkhast-moshavere/'),isFa?'مشاوره':'Consultation'],
    [isFa?u('fa/golden-talent/'):u('golden-talent/'),'Golden Talent']
   ];
 }else if(isFa){
   links=[
    [u('fa/'),'خانه','home'],
    [u('fa/moshavere-tahsili/'),'مشاوره','chat'],
    [u('fa/golden-talent/'),'Golden Talent','star'],
    [u('fa/akhbar/'),'مطالب','news']
   ];
   sheet=[
    [u('fa/darbare-man/'),'درباره من'],
    [u('fa/khadamat/'),'خدمات آموزشی'],
    [u('fa/tadris/'),'تدریس دانشگاهی'],
    [u('fa/ketab-ha/'),'کتاب‌ها'],
    [u('fa/amoozesh-zaban/'),'آموزش زبان انگلیسی'],
    [u('fa/pajouhesh/'),'پژوهش'],
    [u('fa/entesharat-elmi/'),'انتشارات علمی'],
    [u('fa/faaliat-haye-elmi/'),'فعالیت‌های علمی'],
    [u('fa/entekhab-reshteh/'),'انتخاب رشته'],
    [u('fa/estedaadyabi/'),'استعدادیابی'],
    [u('fa/moshavere-konkur/'),'مشاوره کنکور'],
    [u('fa/danesh-amoozan/'),'دانش‌آموزان'],
    [u('fa/rahnamaha/'),'راهنماها'],
    [u('fa/tamas/'),'تماس'],
    [u('fa/harim-khosusi/'),'حریم خصوصی'],
    [u('fa/jostojo/'),'جست‌وجو'],
    [u('publisher/'),'Rezazadeh Foundation Press'],
    [u('journal/'),'JHELA']
   ];
 }else{
   links=[
    [u('en/'),'Home','home'],
    [u('en/about/'),'About','user'],
    [u('en/golden-talent/'),'Golden Talent','star'],
    [u('en/research/'),'Research','book']
   ];
   sheet=[
    [u('en/about/'),'About'],
    [u('en/services/'),'Services'],
    [u('en/academic-profile/'),'Academic Profile'],
    [u('en/language-education/'),'Language Education'],
    [u('en/student-guidance/'),'Student Guidance'],
    [u('en/teacher-education/'),'Teacher Education'],
    [u('en/teaching/'),'University Teaching'],
    [u('en/books/'),'Books'],
    [u('en/publications/'),'Publications'],
    [u('en/academic-engagements/'),'Academic Engagements'],
    [u('en/research/'),'Research'],
    [u('en/projects/'),'Public Projects'],
    [u('en/collaboration/'),'International Collaboration'],
    [u('en/news-insights/'),'News & Insights'],
    [u('en/contact/'),'Contact'],
    [u('en/search/'),'Search'],
    [u('en/golden-talent/'),'Golden Talent'],
    [u('publisher/'),'Rezazadeh Foundation Press'],
    [u('journal/'),'JHELA'],
    [u('fa/'),'فارسی']
   ];
 }
 nav.innerHTML=links.map(([href,label,ic])=>'<a href="'+href+'">'+icon(ic)+'<span>'+label+'</span></a>').join('')+
 '<button type="button" class="dock-action" data-nav-toggle aria-controls="mobile-app-menu" aria-expanded="false">'+icon('menu')+'<span>'+(isFa?'منو':'Menu')+'</span></button>';
 document.body.appendChild(nav);
 if(!q('#mobile-app-menu')){
   const sheetEl=document.createElement('div');sheetEl.className='mobile-app-sheet';sheetEl.id='mobile-app-menu';sheetEl.hidden=true;
   sheetEl.innerHTML='<div class="app-sheet-panel"><div class="app-sheet-head"><strong>'+(isFa?'دسترسی سریع':'Explore')+'</strong><button type="button" class="app-sheet-close" data-nav-close aria-label="'+(isFa?'بستن منو':'Close menu')+'">×</button></div><div class="app-sheet-grid">'+sheet.map(([href,label])=>'<a href="'+href+'"><b>'+label+'</b></a>').join('')+'</div></div>';
   document.body.appendChild(sheetEl);
 }
}
ensureMobileNav();
let lastMenuTrigger=null;
function setSheet(open,trigger=null){
 const sheet=q('#mobile-app-menu'),btn=trigger||q('[data-nav-toggle]');
 if(!sheet||!btn)return;
 if(open) lastMenuTrigger=btn;
 sheet.hidden=!open;
 qa('[data-nav-toggle]').forEach(x=>x.setAttribute('aria-expanded',String(open)));
 sheet.setAttribute('aria-hidden',String(!open));
 document.documentElement.classList.toggle('nav-open',open);
 if(open){
   requestAnimationFrame(()=>sheet.classList.add('is-open'));
   const first=q('a,button',sheet); first&&first.focus();
 }else{
   sheet.classList.remove('is-open');
   if(lastMenuTrigger&&document.contains(lastMenuTrigger)) lastMenuTrigger.focus();
 }
}
document.addEventListener('click',e=>{
 const t=e.target.closest('[data-nav-toggle]');
 if(t){e.preventDefault();setSheet(t.getAttribute('aria-expanded')!=='true',t);return}
 if(e.target.closest('[data-nav-close]')||e.target.classList.contains('mobile-app-sheet'))setSheet(false);
 const link=e.target.closest('#mobile-app-menu a');if(link)setSheet(false);
});
document.addEventListener('keydown',e=>{
 const sheet=q('#mobile-app-menu');
 if(e.key==='Escape'&&sheet&&!sheet.hidden){setSheet(false);return}
 if(e.key==='Tab'&&sheet&&!sheet.hidden){
   const focusables=qa('a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])',sheet).filter(x=>!x.hidden);
   if(!focusables.length)return;
   const first=focusables[0],last=focusables[focusables.length-1];
   if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
   else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
 }
});
const path=location.pathname.replace(/index\.html$/,'');
qa('.app-dock a').forEach(a=>{
 try{const p=new URL(a.href,location.href).pathname.replace(/index\.html$/,'');if((p===base&&path===base)||(p!==base&&path.startsWith(p))){a.classList.add('is-active');a.setAttribute('aria-current','page')}}catch{}
});
})();

// PWA INSTALL FLOW v1
(function(){
  if(!('serviceWorker' in navigator)) return;
  window.addEventListener('load',()=>{
    const base=location.hostname.endsWith('github.io')?'/drjavadrezazadeh.com/':'/';
    navigator.serviceWorker.register(base+'sw.js').catch(()=>{});
  });

  let deferredPrompt=null;
  const privatePath=/\/(?:fa\/app|app|fa\/login|login|fa\/register|register|fa\/bazyabi-hesab|en\/login|en\/register|en\/recover|en\/account|fa\/assessments|assessments|fa\/shop|shop|en\/golden-talent\/(?:assessment|dashboard|observer|roles|student|checkout))\//.test(location.pathname);

  window.addEventListener('beforeinstallprompt',e=>{
    e.preventDefault();
    deferredPrompt=e;
    if(privatePath || document.querySelector('.pwa-install') || sessionStorage.getItem('pwa-install-dismissed')==='1') return;
    const isFa=document.documentElement.lang==='fa';
    const wrap=document.createElement('div');
    wrap.className='pwa-install';
    wrap.innerHTML='<button type="button" class="pwa-install-btn">'+(isFa?'نصب نسخه اپ‌مانند':'Install app experience')+'</button><button type="button" class="pwa-install-close" aria-label="'+(isFa?'بستن':'Close')+'">×</button>';
    document.body.appendChild(wrap);
    wrap.querySelector('.pwa-install-close')?.addEventListener('click',()=>{sessionStorage.setItem('pwa-install-dismissed','1');wrap.remove();});
    wrap.querySelector('.pwa-install-btn')?.addEventListener('click',async()=>{
      if(!deferredPrompt) return;
      deferredPrompt.prompt();
      try{await deferredPrompt.userChoice;}catch(e){}
      deferredPrompt=null;
      wrap.remove();
    });
  });
})();

// PWA HEAD METADATA v1
(function(){
  const base=location.hostname.endsWith('github.io')?'/drjavadrezazadeh.com/':'/';
  if(!document.querySelector('link[rel="manifest"]')){
    const l=document.createElement('link');
    l.rel='manifest'; l.href=base+'site.webmanifest';
    document.head.appendChild(l);
  }
  if(!document.querySelector('link[rel="apple-touch-icon"]')){
    const i=document.createElement('link');i.rel='apple-touch-icon';i.href=base+'assets/images/javad-rezazadeh-yazdeli-portrait-2026.webp';document.head.appendChild(i);
  }
  const metas=[
    ['apple-mobile-web-app-capable','yes'],
    ['apple-mobile-web-app-status-bar-style','black-translucent'],
    ['mobile-web-app-capable','yes'],
    ['apple-mobile-web-app-title',document.documentElement.lang==='fa'?'جواد رضازاده':'Javad Yazdeli']
  ];
  for(const [name,content] of metas){
    if(!document.querySelector('meta[name="'+name+'"]')){
      const m=document.createElement('meta');m.name=name;m.content=content;document.head.appendChild(m);
    }
  }
})();

// PERSIAN GOLDEN TALENT DOCK v1
(function(){
  const p=location.pathname;
  const isFaStudent=/\/fa\/app\/student(?:\/|$)/.test(p);
  const isFaRcas=/\/fa\/assessments\/golden-talent\/start(?:\/|$)/.test(p);
  if((!isFaStudent&&!isFaRcas)||document.querySelector('.gt-mobile-dock')) return;
  const base=location.hostname.endsWith('github.io')?'/drjavadrezazadeh.com/':'/';
  const nav=document.createElement('nav');
  nav.className='gt-mobile-dock';
  nav.setAttribute('aria-label','ناوبری موبایل Golden Talent');
  nav.innerHTML=
    '<a href="'+base+'fa/app/student/">خانه</a>'+
    '<a href="'+base+'fa/assessments/golden-talent/start/">RCAS</a>'+
    '<a href="'+base+'fa/app/student/integrated-profile/">شواهد</a>'+
    '<a href="'+base+'fa/app/student/golden-path/">مسیر</a>';
  document.body.appendChild(nav);
})();

// GOLDEN TALENT DOCK ACTIVE STATE v1
(function(){
  const current=location.pathname.replace(/index\.html$/,'');
  document.querySelectorAll('.gt-mobile-dock a').forEach(a=>{
    try{
      const target=new URL(a.href,location.href).pathname.replace(/index\.html$/,'');
      const exact=current===target;
      const nested=target.endsWith('/dashboard/')&&current.startsWith(target);
      if(exact||nested){
        a.classList.add('is-active');
        a.setAttribute('aria-current','page');
      }
    }catch(e){}
  });
})();

// STANDALONE APP MODE v1
(function(){
  const standalone=window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone===true;
  if(standalone){
    document.documentElement.classList.add('standalone-app');
    document.body?.classList.add('standalone-app-body');
  }
})();

// IOS HOME SCREEN HINT v1
(function(){
  const ua=navigator.userAgent||'';
  const ios=/iPhone|iPad|iPod/i.test(ua);
  const standalone=window.navigator.standalone===true || window.matchMedia?.('(display-mode: standalone)').matches;
  const privatePath=/\/(?:fa\/app|app|fa\/login|login|fa\/register|register|fa\/bazyabi-hesab|en\/login|en\/register|en\/recover|en\/account|fa\/assessments|assessments|fa\/shop|shop|en\/golden-talent\/(?:assessment|dashboard|observer|roles|student|checkout))\//.test(location.pathname);
  if(!ios||standalone||privatePath||sessionStorage.getItem('ios-install-dismissed')==='1'||document.querySelector('.pwa-install')) return;
  const isFa=document.documentElement.lang==='fa';
  window.addEventListener('load',()=>{
    setTimeout(()=>{
      if(document.querySelector('.pwa-install')) return;
      const wrap=document.createElement('div');
      wrap.className='pwa-install';
      wrap.innerHTML='<div class="pwa-install-btn" role="note">'+(isFa?'برای تجربه شبیه اپ: Share → Add to Home Screen':'For an app-like experience: Share → Add to Home Screen')+'</div><button type="button" class="pwa-install-close" aria-label="'+(isFa?'بستن':'Close')+'">×</button>';
      document.body.appendChild(wrap);
      wrap.querySelector('.pwa-install-close')?.addEventListener('click',()=>{sessionStorage.setItem('ios-install-dismissed','1');wrap.remove();});
    },1800);
  });
})();

// NETWORK STATUS UX v1
(function(){
  let timer=null;
  const isFa=document.documentElement.lang==='fa';
  function show(online){
    let el=document.querySelector('.network-status');
    if(!el){
      el=document.createElement('div');
      el.className='network-status';
      el.setAttribute('role','status');
      el.setAttribute('aria-live','polite');
      document.body.appendChild(el);
    }
    el.classList.toggle('offline',!online);
    el.classList.toggle('online',online);
    el.textContent=online
      ? (isFa?'اتصال اینترنت برقرار شد.':'You’re back online.')
      : (isFa?'آفلاین هستید؛ بخش‌های خصوصی تا اتصال مجدد در دسترس نیستند.':'You’re offline. Private areas require a connection.');
    el.classList.add('is-visible');
    clearTimeout(timer);
    timer=setTimeout(()=>el.classList.remove('is-visible'),online?2200:5200);
  }
  window.addEventListener('online',()=>show(true));
  window.addEventListener('offline',()=>show(false));
})();

// APP STATE CONTROLLER v1
(function(){
  let live=document.querySelector('[data-app-live]');
  if(!live){
    live=document.createElement('div');
    live.setAttribute('data-app-live','');
    live.setAttribute('role','status');
    live.setAttribute('aria-live','polite');
    live.setAttribute('aria-atomic','true');
    live.style.cssText='position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0';
    document.body.appendChild(live);
  }
  const allowed=new Set(['loading','empty','ready','error','offline','unauthenticated','forbidden','stale','preview']);
  window.JRAppState={
    set(target,state,message){
      const el=typeof target==='string'?document.querySelector(target):target;
      if(!el||!allowed.has(state)) return false;
      el.dataset.uiState=state;
      el.setAttribute('aria-busy',state==='loading'?'true':'false');
      if(message){
        live.textContent='';
        requestAnimationFrame(()=>{live.textContent=String(message)});
      }
      return true;
    },
    get(target){
      const el=typeof target==='string'?document.querySelector(target):target;
      return el?.dataset?.uiState||null;
    }
  };
})();

// SERVICE WORKER CACHE RESET RELOAD v1
(function(){
  if(!('serviceWorker' in navigator)) return;
  let refreshing=false;
  navigator.serviceWorker.addEventListener('controllerchange',()=>{
    if(refreshing) return;
    if(sessionStorage.getItem('sw-cache-reset-reloaded')==='1') return;
    refreshing=true;
    sessionStorage.setItem('sw-cache-reset-reloaded','1');
    location.reload();
  });
})();

// ONE-TIME SITE CACHE PURGE v3
(function(){
  const token='jr-site-cache-purge-v3-20261006';
  if(localStorage.getItem(token)==='1') return;
  const finish=()=>{try{localStorage.setItem(token,'1')}catch(e){}};
  Promise.resolve().then(async()=>{
    try{
      if('caches' in window){
        const keys=await caches.keys();
        await Promise.all(keys.filter(k=>k.startsWith('jr-site-')).map(k=>caches.delete(k)));
      }
      if('serviceWorker' in navigator){
        const regs=await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r=>r.update().catch(()=>{})));
      }
    }catch(e){}
    finish();
  });
})();