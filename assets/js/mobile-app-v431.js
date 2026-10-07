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
const u=p=>base+p.replace(/^\//,'');
if(!q('link[data-v431-mobile-shell]')){
 const l=document.createElement('link');l.rel='stylesheet';l.href=u('assets/css/mobile-app-v431.css?v=431b');l.dataset.v431MobileShell='1';document.head.appendChild(l);
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
const tabs=isFa?[
 [u('fa/'),'خانه','home'],[u('fa/golden-talent/'),'استعداد','spark'],[u('fa/shop/'),'فروشگاه','bag'],[u('fa/darkhast-moshavere/'),'مشاوره','chat'],[u('fa/login/'),'حساب','user']
]:[
 [u('en/'),'Home','home'],[u('en/golden-talent/'),'Talent','spark'],[u('en/shop/'),'Shop','bag'],[u('en/request-consultation/'),'Consult','chat'],[u('en/login/'),'Account','user']
];
const sheet=isFa?[
 [u('fa/darbare-man/'),'درباره من'],[u('fa/rezome/'),'رزومه علمی'],[u('fa/khadamat/'),'خدمات آموزشی'],[u('fa/tadris/'),'تدریس دانشگاهی'],[u('fa/ketab-ha/'),'کتاب‌ها'],[u('fa/shop/'),'فروشگاه کتاب'],[u('fa/amoozesh-zaban/'),'آموزش زبان انگلیسی'],[u('fa/pajouhesh/'),'پژوهش'],[u('fa/entesharat-elmi/'),'انتشارات علمی'],[u('fa/faaliat-haye-elmi/'),'فعالیت‌های علمی'],[u('fa/entekhab-reshteh/'),'انتخاب رشته'],[u('fa/estedaadyabi/'),'استعدادیابی'],[u('fa/moshavere-konkur/'),'مشاوره کنکور'],[u('fa/danesh-amoozan/'),'دانش‌آموزان'],[u('fa/rahnamaha/'),'راهنماها'],[u('fa/tamas/'),'تماس'],[u('fa/harim-khosusi/'),'حریم خصوصی'],[u('fa/jostojo/'),'جست‌وجو'],[u('publisher/'),'Rezazadeh Foundation Press'],[u('journal/'),'JHELA']
]:[
 [u('en/about/'),'About'],[u('en/cv/'),'Public CV'],[u('en/services/'),'Services'],[u('en/academic-profile/'),'Academic Profile'],[u('en/language-education/'),'Language Education'],[u('en/student-guidance/'),'Student Guidance'],[u('en/teacher-education/'),'Teacher Education'],[u('en/teaching/'),'University Teaching'],[u('en/books/'),'Books'],[u('en/shop/'),'Bookstore'],[u('en/publications/'),'Publications'],[u('en/academic-engagements/'),'Academic Engagements'],[u('en/research/'),'Research'],[u('en/projects/'),'Public Projects'],[u('en/collaboration/'),'International Collaboration'],[u('en/news-insights/'),'News & Insights'],[u('en/contact/'),'Contact'],[u('en/search/'),'Search'],[u('en/golden-talent/'),'Golden Talent'],[u('publisher/'),'Rezazadeh Foundation Press'],[u('journal/'),'JHELA'],[u('fa/'),'فارسی']
];
q('.app-dock')?.remove();
q('#mobile-app-menu')?.remove();
const header=q('.site-header');
if(header&&!q('.mobile-menu-trigger',header)){
 const trigger=document.createElement('button');trigger.type='button';trigger.className='mobile-menu-trigger';trigger.setAttribute('data-nav-toggle','');trigger.setAttribute('aria-controls','mobile-app-menu');trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-label',isFa?'بازکردن منو':'Open menu');trigger.innerHTML=icon('menu');header.appendChild(trigger);
}
const nav=document.createElement('nav');nav.className='app-dock';nav.setAttribute('aria-label',isFa?'منوی اصلی اپ':'App navigation');
nav.innerHTML=tabs.map(([h,l,i])=>'<a href="'+h+'">'+icon(i)+'<span>'+l+'</span></a>').join('');
document.body.appendChild(nav);
const panel=document.createElement('div');panel.className='mobile-app-sheet';panel.id='mobile-app-menu';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label',isFa?'دسترسی سریع':'Explore');
panel.innerHTML='<div class="app-sheet-panel"><div class="app-sheet-head"><div><small>'+(isFa?'ناوبری اپ':'APP NAVIGATION')+'</small><strong>'+(isFa?'دسترسی سریع':'Explore')+'</strong></div><button type="button" class="app-sheet-close" data-nav-close aria-label="'+(isFa?'بستن منو':'Close menu')+'">×</button></div><div class="app-sheet-grid">'+sheet.map(([h,l])=>'<a href="'+h+'"><span class="sheet-icon">'+icon(iconFor(h,l))+'</span><b>'+l+'</b><span class="sheet-chevron" aria-hidden="true">›</span></a>').join('')+'</div></div>';
document.body.appendChild(panel);
const current=location.pathname.replace(/index\.html$/,'');
const matches=qa('.app-dock a').map(a=>{try{const p=new URL(a.href,location.href).pathname.replace(/index\.html$/,'');const exact=p===current,nested=!exact&&p!=='/'&&current.startsWith(p);return exact||nested?{a,p,exact}:null}catch{return null}}).filter(Boolean).sort((a,b)=>(Number(b.exact)-Number(a.exact))||(b.p.length-a.p.length));
let active=matches[0]?.a||null;
if(!active){
 const cluster=isFa
  ?(/\/fa\/(?:login|register|bazyabi-hesab)\//.test(current)?'/fa/login/':/\/fa\/(?:darkhast-moshavere|moshavere-tahsili|moshavere-konkur|entekhab-reshteh)\//.test(current)?'/fa/darkhast-moshavere/':null)
  :(/\/en\/(?:login|register|recover)\//.test(current)?'/en/login/':/\/en\/(?:request-consultation|student-guidance)\//.test(current)?'/en/request-consultation/':null);
 if(cluster)active=qa('.app-dock a').find(a=>new URL(a.href,location.href).pathname.replace(/index\.html$/,'')===cluster)||null;
}
if(active){active.classList.add('is-active');active.setAttribute('aria-current','page')}
qa('.home-focus-strip a,.audience-gate').forEach(a=>{if(a.querySelector('.app-card-icon'))return;const s=document.createElement('span');s.className='app-card-icon';s.innerHTML=icon(iconFor(a.href,a.textContent||''));s.setAttribute('aria-hidden','true');a.prepend(s)});
})();