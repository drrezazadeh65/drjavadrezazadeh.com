document.documentElement.classList.add('js');
const JR_ROUTE_POLICY=Object.freeze({
noStore:Object.freeze(['/api/','/fa/services/checkout/','/fa/shop/golden-talent/checkout/','/fa/app/','/fa/customer-dashboard/','/app/','/en/account/','/fa/login/','/login/','/en/login/','/fa/register/','/register/','/en/register/','/en/recover/','/fa/bazyabi-hesab/','/fa/assessments/','/assessments/','/en/golden-talent/assessment/','/en/golden-talent/dashboard/','/en/golden-talent/observer/','/en/golden-talent/roles/','/en/golden-talent/student/','/fa/shop/cart/','/fa/shop/checkout/','/fa/shop/payment-start/','/fa/shop/payment-return/','/fa/shop/payment-result/','/en/shop/cart/','/en/shop/checkout/','/en/golden-talent/checkout/','/en/golden-talent/plans/','/fa/darkhast-moshavere/','/en/request-consultation/']),app:Object.freeze(['/fa/app/','/fa/customer-dashboard/','/app/','/en/account/','/fa/assessments/','/assessments/','/en/golden-talent/assessment/','/en/golden-talent/dashboard/','/en/golden-talent/observer/','/en/golden-talent/roles/','/en/golden-talent/student/'])});const JR_PRIV=p=>JR_ROUTE_POLICY.noStore.some(s=>p+'/'===s||p.startsWith(s));
(()=>{
const q=(s,r=document)=>r.querySelector(s),qa=(s,r=document)=>[...r.querySelectorAll(s)];
const rawPath=location.pathname.replace(/index\.html$/,'');
const gh='/drjavadrezazadeh.com/';
const base=rawPath.includes(gh)?gh:'/';
const relativePath=base==='/'?rawPath:'/'+rawPath.slice(base.length);
const isFa=relativePath.startsWith('/fa/');
const isJournal=relativePath.startsWith('/journal/');
const isPrivateApp=JR_ROUTE_POLICY.app.some(prefix=>relativePath.startsWith(prefix));
const isPersianStudentApp=relativePath.startsWith('/fa/app/student/')||relativePath.startsWith('/fa/assessments/golden-talent/start/');
const u=p=>base+p.replace(/^\//,'');
function ensurePwaHead(){
const head=document.head;
if(!head)return;
if(!q('link[rel="manifest"]',head)){
const link=document.createElement('link');link.rel='manifest';link.href=u('site.webmanifest');head.appendChild(link);
}
if(!q('link[rel="apple-touch-icon"]',head)){
const iconLink=document.createElement('link');iconLink.rel='apple-touch-icon';iconLink.href=u('assets/images/pwa-icon-192.png');head.appendChild(iconLink);
}
if(!q('meta[name="mobile-web-app-capable"]',head)){
const meta=document.createElement('meta');meta.name='mobile-web-app-capable';meta.content='yes';head.appendChild(meta);
}
if(!q('meta[name="color-scheme"]',head)){
const meta=document.createElement('meta');meta.name='color-scheme';meta.content='dark';head.appendChild(meta);
}
}
ensurePwaHead();
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
function ensureTabletMenuTrigger(){
 if(isPrivateApp||q('.tablet-menu-trigger')) return;
 const header=q('.site-header');
 if(!header) return;
 const tabletTrigger=document.createElement('button');
 tabletTrigger.type='button';
 tabletTrigger.className='tablet-menu-trigger';
 tabletTrigger.setAttribute('data-nav-toggle','');
 tabletTrigger.setAttribute('aria-controls','mobile-app-menu');
 tabletTrigger.setAttribute('aria-expanded','false');
 tabletTrigger.setAttribute('aria-label',isFa?'بازکردن منو':'Open menu');
 tabletTrigger.innerHTML=icon('menu')+'<span>'+(isFa?'منو':'Menu')+'</span>';
 header.appendChild(tabletTrigger);
}
function ensureMobileNav(){
if(document.body.classList.contains('dashboard-shell-page')) q('.gt-mobile-dock')?.remove();
ensureTabletMenuTrigger();
if(q('.app-dock')) return;
if(isPrivateApp) q('.gt-mobile-dock')?.remove();
else if(q('.gt-mobile-dock')) return;
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
const privateNavConfigs=[
{prefixes:['/fa/app/student/','/fa/assessments/golden-talent/'],tabs:['fa/app/student/','fa/golden-talent/','fa/assessments/golden-talent/','fa/app/student/golden-path/','fa/app/account/']},
{prefixes:['/fa/app/valed/'],tabs:['fa/app/valed/','fa/app/valed/resources/','fa/assessments/golden-talent/observer/?role=parent','fa/app/valed/my-path/','fa/app/account/']},
{prefixes:['/fa/app/moallem/'],tabs:['fa/app/moallem/','fa/app/moallem/resources/','fa/assessments/golden-talent/observer/?role=teacher','fa/app/moallem/my-path/','fa/app/account/']},
{prefixes:['/fa/app/moshaver/'],tabs:['fa/app/moshaver/','fa/golden-talent/ravesh-shenasi/','fa/app/moshaver/case-preview/','fa/app/moshaver/my-path/','fa/app/account/']},
{prefixes:['/en/golden-talent/roles/parent/'],tabs:['en/golden-talent/roles/parent/','en/golden-talent/roles/parent/resources/','en/golden-talent/observer/?role=parent','en/golden-talent/roles/parent/my-path/','en/account/']},
{prefixes:['/en/golden-talent/roles/teacher/'],tabs:['en/golden-talent/roles/teacher/','en/golden-talent/roles/teacher/resources/','en/golden-talent/observer/?role=teacher','en/golden-talent/roles/teacher/my-path/','en/account/']},
{prefixes:['/en/golden-talent/roles/adviser/'],tabs:['en/golden-talent/roles/adviser/','en/golden-talent/methodology/','en/golden-talent/roles/adviser/case-preview/','en/golden-talent/roles/adviser/my-path/','en/account/']},
{prefixes:['/en/golden-talent/student/','/en/golden-talent/dashboard/','/en/golden-talent/assessment/'],tabs:['en/golden-talent/student/','en/golden-talent/','en/golden-talent/assessment/','en/golden-talent/dashboard/golden-path/','en/account/']},
{prefixes:['/fa/app/'],tabs:['fa/app/','fa/golden-talent/','fa/assessments/golden-talent/','fa/app/','fa/app/account/']},
{prefixes:['/en/account/','/en/golden-talent/roles/','/en/golden-talent/observer/'],tabs:['en/account/','en/golden-talent/','en/golden-talent/assessment/','en/golden-talent/dashboard/golden-path/','en/account/']}
];
const cfg=privateNavConfigs.find(c=>c.prefixes.some(p=>relativePath.startsWith(p)))||privateNavConfigs[privateNavConfigs.length-1];
const labels=isFa?['خانه','کشف','آزمون‌ها','مسیر من','حساب']:['Home','Discover','Tests','My Path','Account'];
const icons=['home','star','test','path','user'];
links=cfg.tabs.map((route,i)=>[u(route),labels[i],icons[i]]);
}else if(isFa){
links=[
[u('fa/'),'خانه','home'],
[u('fa/moshavere-tahsili/'),'مشاوره','chat'],
[u('fa/golden-talent/'),'Golden Talent','star'],
[u('fa/akhbar/'),'مطالب','news']
];
sheet=[
[u('fa/darbare-man/'),'درباره من'],
[u('fa/rezome/'),'رزومه علمی'],
[u('fa/khadamat/'),'خدمات آموزشی'],
[u('fa/tadris/'),'تدریس دانشگاهی'],
[u('fa/ketab-ha/'),'کتاب‌ها'],
[u('fa/shop/'),'فروشگاه کتاب'],
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
[u('en/cv/'),'Public CV'],
[u('en/services/'),'Services'],
[u('en/academic-profile/'),'Academic Profile'],
[u('en/language-education/'),'Language Education'],
[u('en/student-guidance/'),'Student Guidance'],
[u('en/teacher-education/'),'Teacher Education'],
[u('en/teaching/'),'University Teaching'],
[u('en/books/'),'Books'],
[u('en/shop/'),'Bookstore'],
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
const menuButton=isPrivateApp?'':'<button type="button" class="dock-action" data-nav-toggle aria-controls="mobile-app-menu" aria-expanded="false">'+icon('menu')+'<span>'+(isFa?'منو':'Menu')+'</span></button>';
nav.innerHTML=links.map(([href,label,ic])=>'<a href="'+href+'">'+icon(ic)+'<span>'+label+'</span></a>').join('')+menuButton;
document.body.appendChild(nav);
if(!isPrivateApp&&!q('#mobile-app-menu')){
const sheetEl=document.createElement('div');sheetEl.className='mobile-app-sheet';sheetEl.id='mobile-app-menu';sheetEl.hidden=true;
sheetEl.setAttribute('role','dialog');sheetEl.setAttribute('aria-modal','true');sheetEl.setAttribute('aria-label',isFa?'دسترسی سریع':'Explore');
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
function markActiveDockItem(){
const candidates=qa('.app-dock a').map(a=>{
try{
const p=new URL(a.href,location.href).pathname.replace(/index\.html$/,'');
const exact=p===path;
const nested=!exact&&p!==base&&path.startsWith(p);
return (exact||nested)?{a,p,exact}:null;
}catch{return null}
}).filter(Boolean);
if(!candidates.length)return;
candidates.sort((x,y)=>(Number(y.exact)-Number(x.exact))||(y.p.length-x.p.length));
const bestMatch=candidates[0].a;
qa('.app-dock a').forEach(a=>{a.classList.remove('is-active');a.removeAttribute('aria-current')});
bestMatch.classList.add('is-active');bestMatch.setAttribute('aria-current','page');
}
markActiveDockItem();
function markCurrentDesktopNavigation(){
const normalize=p=>{
let x=(p||'/').replace(/\/index\.html$/,'');
if(!x.endsWith('/')) x+='/';
return x;
};
const current=normalize(location.pathname);
const candidates=qa('.site-header nav a, .journal-header nav a').filter(a=>{
try{
const url=new URL(a.href,location.href);
return url.origin===location.origin && normalize(url.pathname)===current;
}catch{return false}
});
if(!candidates.length)return;
candidates.forEach(a=>{
if(!a.hasAttribute('aria-current')) a.setAttribute('aria-current','page');
a.classList.add('is-current');
});
}
markCurrentDesktopNavigation();
})();
(function(){
if(!('serviceWorker' in navigator)) return;
window.addEventListener('load',()=>{
const base=location.hostname.endsWith('github.io')?'/drjavadrezazadeh.com/':'/';
navigator.serviceWorker.register(base+'sw.js?v=20261010-bertina-cache-v4',{updateViaCache:'none'}).then(reg=>{
  reg.update().catch(()=>{});
  if(reg.waiting) reg.waiting.postMessage({type:'SKIP_WAITING'});
  reg.addEventListener('updatefound',()=>{
    const worker=reg.installing;
    if(!worker) return;
    worker.addEventListener('statechange',()=>{
      if(worker.state==='installed' && navigator.serviceWorker.controller){
        worker.postMessage({type:'SKIP_WAITING'});
      }
    });
  });
}).catch(()=>{});
});
let deferredPrompt=null;
const raw=location.pathname.replace(/index\.html$/,'');
const gh='/drjavadrezazadeh.com/';
const base=raw.includes(gh)?gh:'/';
const relative=base==='/'?raw:'/'+raw.slice(base.length);
const privatePath=JR_PRIV(relative);
window.addEventListener('beforeinstallprompt',e=>{
e.preventDefault();
deferredPrompt=e;
const openAssistantPanel=document.querySelector('#jr-assistant-panel');
const assistantLauncher=document.querySelector('.jr-assistant-launcher');
if(openAssistantPanel&&!openAssistantPanel.hidden){
openAssistantPanel.hidden=true;
assistantLauncher?.setAttribute('aria-expanded','false');
}
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
(function(){
const p=location.pathname;
const isFaStudent=/\/fa\/app\/student(?:\/|$)/.test(p);
const isFaRcas=/\/fa\/assessments\/golden-talent\/start(?:\/|$)/.test(p);
if((!isFaStudent&&!isFaRcas)||document.querySelector('.gt-mobile-dock')||document.querySelector('.app-dock')) return;
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
(function(){
const standalone=window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone===true;
if(standalone){
document.documentElement.classList.add('standalone-app');
document.body?.classList.add('standalone-app-body');
}
})();
(function(){
const ua=navigator.userAgent||'';
const ios=/iPhone|iPad|iPod/i.test(ua);
const standalone=window.navigator.standalone===true || window.matchMedia?.('(display-mode: standalone)').matches;
const raw=location.pathname.replace(/index\.html$/,'');
const gh='/drjavadrezazadeh.com/';
const base=raw.includes(gh)?gh:'/';
const relative=base==='/'?raw:'/'+raw.slice(base.length);
const privatePath=JR_PRIV(relative);
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
(function(){
window.JRCacheControl=Object.freeze({
  async refresh(){
    if('caches' in window){
      const keys=await caches.keys();
      await Promise.all(keys.filter(k=>k.startsWith('jr-site-') && k.endsWith('-runtime')).map(k=>caches.delete(k)));
    }
    if('serviceWorker' in navigator){
      const reg=await navigator.serviceWorker.getRegistration();
      await reg?.update().catch(()=>{});
      navigator.serviceWorker.controller?.postMessage({type:'PURGE_RUNTIME'});
    }
  }
});
})();
(function(){
document.addEventListener('click',e=>{
const el=e.target.closest('[data-conversion-event]');
if(!el) return;
const event_key=String(el.dataset.conversionEvent||'').trim();
if(!event_key) return;
const detail={
event_key,
surface:String(el.dataset.conversionSurface||'unknown'),
locale:document.documentElement.lang||'und',
route:location.pathname,
target_kind:el.matches('a[href^="mailto:"]')?'EMAIL':(el.tagName==='A'?'LINK':'ACTION')
};
window.dispatchEvent(new CustomEvent('JR_CONVERSION_INTENT',{detail}));
},{capture:true});
})();
(()=>{let s=document.createElement('script');s.src='/assets/js/analytics-adapter.js?v=430';document.head.append(s)})();
(function(){
if(document.querySelector('script[data-jr-assistant]')) return;
const scripts=[...document.scripts];
const siteScript=scripts.find(s=>/\/assets\/js\/site\.js(?:\?|$)/.test(s.src));
if(!siteScript?.src) return;
const cssHref=new URL('../css/assistant.css?v=56',siteScript.src).href;
if(!document.querySelector('link[data-jr-assistant-style]')){
const link=document.createElement('link');
link.rel='stylesheet';
link.href=cssHref;
link.dataset.jrAssistantStyle='1';
document.head.appendChild(link);
}
const script=document.createElement('script');
script.src=new URL('assistant.js?v=1',siteScript.src).href;
script.defer=true;
script.dataset.jrAssistant='1';
document.head.appendChild(script);
})();
document.addEventListener('click',async e=>{const t=e.target.closest('[data-print-cv],[data-copy-citation]');if(!t)return;if(t.hasAttribute('data-print-cv')){e.preventDefault();return print()}const v=t.dataset.copyCitation;if(!v)return;e.preventDefault();const o=t.textContent,n=document.documentElement.lang==='fa'?'کپی شد':'Copied';try{await navigator.clipboard.writeText(v)}catch(_){const a=document.createElement('textarea');a.value=v;a.hidden=true;document.body.appendChild(a);a.select();try{document.execCommand('copy')}catch(_e){}a.remove()}t.classList.add('is-copied');t.textContent=n;setTimeout(()=>{t.classList.remove('is-copied');t.textContent=o},1800)});
(()=>{let h=document.head,a=(r,u)=>{if(!h.querySelector('link[rel="'+r+'"]')){let l=document.createElement('link');l.rel=r;l.href=u;h.append(l)}};a('icon','/favicon.png?v=42');a('apple-touch-icon','/assets/images/pwa-icon-192.png?v=42')})();

(function(){
if(document.querySelector('.enamad-visible-seal, a[href="https://trustseal.enamad.ir/?id=8075712&Code=sealMJydDpzqNid1Ty82Y90Ef6SZLah1"]')) return;
const footer=document.querySelector('footer');
if(!footer) return;
const holder=document.createElement('div');
holder.innerHTML="<a referrerpolicy='origin' target='_blank' href='https://trustseal.enamad.ir/?id=8075712&Code=sealMJydDpzqNid1Ty82Y90Ef6SZLah1'><img src='/assets/images/enamad-trust-symbol.svg' alt='نماد اعتماد الکترونیکی' style='cursor:pointer;max-width:110px;height:auto' code='sealMJydDpzqNid1Ty82Y90Ef6SZLah1'></a>";
footer.appendChild(holder);
})();

import('/assets/js/mobile-app-v431.js?v=431d');
