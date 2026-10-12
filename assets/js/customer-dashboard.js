(()=>{'use strict';
const API='/api';
const lang=document.documentElement.lang==='en'?'en':'fa';
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const copy={
 fa:{
  guest:'پیش‌نمایش امن',signed:'حساب تأییدشده',authOff:'اتصال امن به سامانه حساب در دسترس نیست',
  empty:'پس از ورود، اطلاعات واقعی حساب و دسترسی‌های شما در همین داشبورد نمایش داده می‌شود.',
  checking:'در حال بررسی اتصال…',connected:'اتصال امن برقرار است',offline:'اینترنت قطع است',
  commerceReady:'آماده',commerceWaiting:'در انتظار فعال‌سازی',commerceCopyReady:'درگاه و خرید مستقیم آماده‌اند',
  commerceCopyWaiting:'کاتالوگ فعال است؛ خرید مستقیم هنوز فعال نشده',
  authReady:'سامانه حساب آماده',authGuest:'وارد حساب نشده‌اید',authSigned:'ورود امن تأیید شد',
  networkReady:'آنلاین',networkOffline:'آفلاین',privateMode:'حالت خصوصی',
  lastSync:'آخرین بررسی',noCommand:'میانبر مرتبطی پیدا نشد.',
  offlineBanner:'اتصال اینترنت قطع است؛ داده خصوصی از حافظه محلی جایگزین نمی‌شود.'
 },
 en:{
  guest:'Secure preview',signed:'Verified account',authOff:'A secure connection to the account service is unavailable',
  empty:'After sign-in, your real account data and entitlements will appear in this dashboard.',
  checking:'Checking connection…',connected:'Secure connection ready',offline:'You are offline',
  commerceReady:'Ready',commerceWaiting:'Awaiting activation',commerceCopyReady:'Gateway and direct checkout are ready',
  commerceCopyWaiting:'Catalogue is available; direct checkout is not live yet',
  authReady:'Account service ready',authGuest:'Not signed in',authSigned:'Secure sign-in verified',
  networkReady:'Online',networkOffline:'Offline',privateMode:'Private mode',
  lastSync:'Last checked',noCommand:'No matching shortcut found.',
  offlineBanner:'Internet connection is unavailable; private data will not fall back to local cache.'
 }
}[lang];

function initial(email){return String(email||'JR').trim().charAt(0).toUpperCase()||'JR'}
function localNumber(n){return lang==='fa'?new Intl.NumberFormat('fa-IR').format(n):new Intl.NumberFormat('en-US').format(n)}
function nowLabel(){return new Intl.DateTimeFormat(lang==='fa'?'fa-IR':'en-US',{hour:'2-digit',minute:'2-digit'}).format(new Date())}
function normalize(v){return String(v||'').trim().toLocaleLowerCase(lang==='fa'?'fa':'en').normalize('NFKC').replace(/[يى]/g,'ی').replace(/ك/g,'ک')}
function esc(v){return String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))}

async function jsonRequest(url,options={},timeout=9000){
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),timeout);
 try{
  const r=await fetch(url,{cache:'no-store',...options,signal:controller.signal});
  let data=null;try{data=await r.json()}catch{}
  return {ok:r.ok,status:r.status,data};
 }catch(error){
  return {ok:false,status:0,data:null,error};
 }finally{clearTimeout(timer)}
}

function runtimeRow(key,state,value,detail){
 const row=$('[data-runtime-key="'+key+'"]');if(!row)return;
 row.dataset.state=state||'';
 const v=$('[data-runtime-value]',row),d=$('[data-runtime-detail]',row);
 if(v&&value!=null)v.textContent=value;
 if(d&&detail!=null)d.textContent=detail;
}
function livePill(state,label){
 const el=$('[data-dashboard-live-state]');if(!el)return;
 el.dataset.state=state||'';
 el.textContent=label;
}
function updateSync(){
 $$('[data-runtime-sync]').forEach(el=>el.textContent=nowLabel());
}

async function operationalStatus(){
 const [auth,commerce,catalog]=await Promise.all([
  jsonRequest(API+'/auth/health',{credentials:'include'}),
  jsonRequest(API+'/commerce/health',{credentials:'omit'}),
  jsonRequest('/assets/data/service-catalog.json',{credentials:'omit'})
 ]);
 const services=(catalog.ok&&Array.isArray(catalog.data?.services)?catalog.data.services:[]).filter(s=>s?.sellable===true);
 $$('[data-service-catalog-count]').forEach(el=>el.textContent=services.length?localNumber(services.length):'—');

 const commerceReady=commercialReady(commerce);
 const cs=$('[data-commerce-status]'),cc=$('[data-commerce-copy]');
 if(cs)cs.textContent=commerceReady?copy.commerceReady:copy.commerceWaiting;
 if(cc)cc.textContent=commerceReady?copy.commerceCopyReady:copy.commerceCopyWaiting;
 runtimeRow('commerce',commerceReady?'ready':'warning',commerceReady?copy.commerceReady:copy.commerceWaiting,commerceReady?copy.commerceCopyReady:copy.commerceCopyWaiting);

 const authReady=auth.ok&&auth.data?.ready===true;
 runtimeRow('auth',authReady?'ready':'warning',authReady?copy.authReady:copy.authOff,authReady?copy.authGuest:copy.authOff);
 if(navigator.onLine)livePill(authReady?'ready':'',''+(authReady?copy.connected:copy.checking));
 updateSync();
 return {auth,commerce,catalog,services,commerceReady};
}
function commercialReady(r){return !!(r?.ok&&r.data?.checkout===true)}

async function hydrate(preloadedAuth){
 const status=$('[data-account-status]'),email=$('[data-account-email]'),avatar=$('[data-account-avatar]'),dot=$('[data-live-dot]');
 delete document.documentElement.dataset.customerAuthenticated;
 dot?.classList.remove('ready');
 if(status)status.textContent=copy.guest;
 if(email)email.textContent=copy.empty;
 if(avatar)avatar.textContent='JR';
 const auth=preloadedAuth||await jsonRequest(API+'/auth/health',{credentials:'include'});
 if(!auth.ok||auth.data?.ready!==true){
  if(status)status.textContent=copy.authOff;
  if(email)email.textContent=copy.empty;
  runtimeRow('auth','warning',copy.authOff,copy.empty);
  return false;
 }
 if(status)status.textContent=copy.guest;
 if(email)email.textContent=copy.empty;
 const me=await jsonRequest(API+'/auth/me',{credentials:'include'});
 if(me.status===401){
  runtimeRow('auth','ready',copy.authReady,copy.authGuest);
  return false;
 }
 if(!me.ok||me.data?.ok!==true){
  runtimeRow('auth','warning',copy.authReady,copy.authGuest);
  return false;
 }
 const user=me.data.user||{};
 dot?.classList.add('ready');
 if(status)status.textContent=copy.signed;
 if(email)email.textContent=user.email||copy.signed;
 if(avatar)avatar.textContent=initial(user.email);
 document.documentElement.dataset.customerAuthenticated='true';
 $$('[data-auth-only]').forEach(el=>{el.removeAttribute('aria-disabled');el.removeAttribute('data-locked')});
 runtimeRow('auth','ready',copy.authSigned,user.email||copy.signed);
 return true;
}

function nav(){
 // One active workspace at a time; the original modules remain in the DOM.
 // Tab choice is navigation only, never proof of role, entitlement or identity.
 const links=$$('.cd-nav a[data-section],.cd-mobile-dock a[data-section]');
 const panels=$$('[data-dashboard-panel]');
 const label=$('[data-dashboard-active-label]');
 const caption=$('.cd-view-context-caption');
 const labels={
  fa:{
   overview:['نمای کلی','وضعیت حساب، خدمات و مسیرهای سریع شما در یک نگاه'],
   'student-support':['حمایت تحصیلی و حامیان','اطلاعات خصوصی فقط با رضایت و دسترسی تأییدشده'],
   ecosystem:['اکوسیستم من','خدمات و مسیرهای در دسترس حساب'],
   journey:['مسیر خدمت','شفافیت خدمات، مراحل اجرا و ضوابط اعتماد'],
   'academic-profile':['پرونده تحصیلی','سوابق آموزشی فقط با مجوز معتبر'],
   progress:['رشد و پیشرفت','گزارش‌های واقعی و نقاط عطف'],
   consultations:['مشاوره‌ها','درخواست‌ها، نوبت‌ها و پیگیری'],
   records:['گزارش‌ها و اسناد','سوابق معتبر اختصاصی حساب'],
   account:['حساب و حریم خصوصی','مشخصات، رضایت‌ها و دسترسی']
  },
  en:{
   overview:['Overview','Your account, service status and next action'],
   'student-support':['Student support','Safeguarded giving, consent and approved access'],
   ecosystem:['My ecosystem','Services and features connected to your account'],
   journey:['Service journey','Delivery, accountability and transparent outcomes'],
   'academic-profile':['Academic profile','Evidence-led records with verified permission'],
   progress:['Development','Evidence-based progress and milestones'],
   consultations:['Consultations','Cases, appointments and follow-up'],
   records:['Reports & records','Your verified documents and order history'],
   account:['Account & privacy','Profile, consents and access preferences']
  }
 };
 const meta=labels[lang];
 const current=()=>{try{return decodeURIComponent((location.hash||'#overview').slice(1))}catch{return 'overview'}};
 const activate=(targetId,scroll=false)=>{
  const target=document.getElementById(targetId);
  const section=target?.closest('[data-dashboard-panel]');
  const view=section?.dataset.dashboardPanel||'overview';
  const active=Object.prototype.hasOwnProperty.call(meta,view)?view:'overview';
  panels.forEach(p=>{p.hidden=p.dataset.dashboardPanel!==active});
  links.forEach(a=>{
   const on=a.dataset.section===active;
   a.classList.toggle('is-active',on);
   if(on)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');
  });
  document.documentElement.dataset.dashboardActiveView=active;
  if(label)label.textContent=meta[active][0];
  if(caption)caption.textContent=meta[active][1];
  if(scroll){
   const destination=active==='overview'&&targetId==='overview'
     ?$('.cd-view-context'):(target&&target.closest('[data-dashboard-panel]')?target:document.querySelector('[data-dashboard-panel="'+active+'"]'));
   requestAnimationFrame(()=>{
    destination?.scrollIntoView({behavior:'instant',block:'start'});
    const focused=document.activeElement;
    if(focused?.closest?.('.cd-sheet')||focused?.closest?.('[data-dashboard-panel][hidden]')){
     const focusTarget=target?.closest('[data-dashboard-panel]')===document.querySelector('[data-dashboard-panel="'+active+'"]')?target:destination;
     if(focusTarget){focusTarget.setAttribute('tabindex','-1');focusTarget.focus({preventScroll:true})}
    }
   });
  }
 };
 // Intercept only same-page anchors. External account, commerce and help links
 // continue navigating normally, without changing their destination.
 document.addEventListener('click',e=>{
  const a=e.target.closest('a[href^="#"]');
  if(!a||e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
  const hash=a.getAttribute('href');
  if(!hash||hash==='#')return;
  let id;
  try{id=decodeURIComponent(hash.slice(1))}catch{return}
  if(!document.getElementById(id))return;
  e.preventDefault();
  if(location.hash!==hash)history.pushState(null,'',hash);
  activate(id,true);
  if(a.classList.contains('cd-skip')){
   const target=document.getElementById(id);
   target?.setAttribute('tabindex','-1');
   target?.focus({preventScroll:true});
  }
 });
 document.addEventListener('dashboard:open',event=>{
  const id=event.detail?.id;
  if(typeof id!=='string'||!document.getElementById(id))return;
  const hash='#'+encodeURIComponent(id);
  if(location.hash!==hash)history.pushState(null,'',hash);
  activate(id,true);
 });
 addEventListener('popstate',()=>activate(current(),true));
 addEventListener('hashchange',()=>activate(current(),true));
 activate(current(),Boolean(location.hash));
}

function sheet(){
 const sheet=$('[data-dashboard-sheet]'),open=$('[data-dashboard-more]'),close=$('[data-dashboard-close]');
 if(!sheet||!open||!close)return;
 let previous=null;
 const focusables=()=>$$('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled])',sheet).filter(x=>!x.hidden);
 const shut=(restoreFocus=true)=>{sheet.classList.remove('is-open');open.setAttribute('aria-expanded','false');document.documentElement.style.overflow='';if(restoreFocus)previous?.focus?.()};
 const show=()=>{previous=document.activeElement;sheet.classList.add('is-open');open.setAttribute('aria-expanded','true');document.documentElement.style.overflow='hidden';close.focus()};
 open.addEventListener('click',show);close.addEventListener('click',shut);
 sheet.addEventListener('click',e=>{if(e.target===sheet)shut();else if(e.target.closest('a[href]'))shut(false)});
 sheet.addEventListener('keydown',e=>{
  if(e.key==='Escape'){shut();return}
  if(e.key!=='Tab')return;
  const nodes=focusables();if(!nodes.length)return;
  const first=nodes[0],last=nodes[nodes.length-1];
  if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
  else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
 });
}

function commandCenter(){
 const input=$('[data-dashboard-command-search]'),cards=$$('[data-command-item]'),empty=$('[data-command-empty]');
 const modes=$$('[data-command-path]'),note=$('[data-command-path-note]');
 if(!input||!cards.length)return;
 let active='all';
 const messages={
  all:'این انتخاب فقط میانبرها را تنظیم می‌کند و به معنی اعطای نقش یا دسترسی نیست.',
  learning:'مسیر دانش‌آموز و یادگیری انتخاب شد؛ پرونده خصوصی همچنان نیازمند مجوز سمت سرور است.',
  shopping:'مسیر خرید و خدمات انتخاب شد؛ سفارش و پرداخت باید مستقل از سمت سرور تأیید شوند.',
  sponsorship:'مسیر حامیان انتخاب شد؛ نمایش هویت و نیازها به رضایت و مجوز معتبر وابسته است.'
 };
 const render=()=>{
  const q=normalize(input.value);let shown=0;
  cards.forEach(card=>{
   const groups=(card.dataset.commandGroup||'learning shopping sponsorship').split(/\s+/);
   const hit=(active==='all'||groups.includes(active))&&(!q||normalize(card.textContent).includes(q));
   card.hidden=!hit;if(hit)shown++;
  });
  empty?.classList.toggle('is-visible',shown===0);
  if(empty)empty.textContent=copy.noCommand;
 };
 modes.forEach(b=>b.addEventListener('click',()=>{
  const requested=b.dataset.commandPath;
  if(!Object.prototype.hasOwnProperty.call(messages,requested))return;
  active=requested;
  modes.forEach(item=>item.setAttribute('aria-pressed',String(item===b)));
  if(note)note.textContent=messages[active];
  render();
 }));
 input.addEventListener('input',render);
 addEventListener('keydown',e=>{
  const tag=(document.activeElement?.tagName||'').toLowerCase();
  if(e.key==='/'&&!['input','textarea','select'].includes(tag)){e.preventDefault();if(input.closest('[data-dashboard-panel]')?.hidden)document.dispatchEvent(new CustomEvent('dashboard:open',{detail:{id:'command-center'}}));requestAnimationFrame(()=>{input.focus();input.select()})}
  if(e.key==='Escape'&&document.activeElement===input&&input.value){input.value='';render()}
 });
 render();
}

function network(){
 let banner=$('[data-offline-banner]');
 if(!banner){
  banner=document.createElement('div');banner.className='cd-offline-banner';banner.dataset.offlineBanner='';banner.setAttribute('role','status');
  banner.textContent=copy.offlineBanner;document.body.appendChild(banner);
 }
 const update=()=>{
  const online=navigator.onLine;
  document.documentElement.dataset.network=online?'online':'offline';
  banner.classList.toggle('is-visible',!online);
  runtimeRow('network',online?'ready':'error',online?copy.networkReady:copy.networkOffline,online?copy.connected:copy.offline);
  if(!online)livePill('offline',copy.offline);
 };
 addEventListener('online',()=>{update();refresh().catch(()=>{})});
 addEventListener('offline',update);
 update();
}

function serviceMarketplace(runtime,authenticated){
 const host=$('[data-dashboard-services]'),search=$('[data-dashboard-service-search]'),count=$('[data-dashboard-service-count]'),status=$('[data-dashboard-service-status]');
 if(!host)return;
 const money=n=>localNumber(n)+(lang==='fa'?' تومان':' IRT');
 let services=[],purchaseReady=false;
 const render=()=>{
  const q=normalize(search?.value);
  const rows=services.filter(s=>normalize([s.title_fa,s.fit_fa,s.outcome_fa].join(' ')).includes(q));
  if(count)count.textContent=localNumber(services.length);
  host.innerHTML=rows.length?rows.map(s=>{
    const id=encodeURIComponent(s.id);
    const duration=Number.isInteger(s.duration_minutes)?localNumber(s.duration_minutes)+(lang==='fa'?' دقیقه':' min'):(lang==='fa'?'دامنه اختصاصی خدمت':'Service-specific scope');
    const label=purchaseReady?(lang==='fa'?'خرید و افزودن به داشبورد':'Purchase & add'):(authenticated?(lang==='fa'?'مشاهده شرایط خرید':'View purchase terms'):(lang==='fa'?'ورود و ادامه':'Sign in to continue'));
    const checkoutHref=authenticated?('/fa/services/checkout/?service='+id):(lang==='fa'?'/fa/login/':'/en/login/');
    const outcome=s.outcome_fa?'<p class="cd-service-outcome"><b>'+(lang==='fa'?'خروجی روشن:':'Defined outcome:')+'</b> '+esc(s.outcome_fa)+'</p>':'';
    const boundary=s.boundary_fa?'<details class="cd-service-boundary"><summary>'+(lang==='fa'?'دامنه و مرز خدمت':'Scope & boundary')+'</summary><p>'+esc(s.boundary_fa)+'</p></details>':'';
    return '<article class="cd-service-card" data-purchase-ready="'+purchaseReady+'"><h3>'+esc(s.title_fa)+'</h3><div class="cd-service-price">'+money(s.price)+'</div><span class="cd-service-duration">'+duration+'</span><p class="cd-service-fit">'+esc(s.fit_fa||'')+'</p>'+outcome+boundary+'<div class="cd-service-actions"><a class="cd-service-buy" href="'+checkoutHref+'">'+label+'</a><a class="cd-service-more" href="/fa/services/'+id+'/" aria-label="'+(lang==='fa'?'معرفی بیشتر':'More information')+'">↗</a></div></article>';
  }).join(''):'<div class="cd-service-empty">'+(lang==='fa'?'خدمتی با این عبارت پیدا نشد.':'No matching service found.')+'</div>';
 };
 const apply=data=>{
  services=(data?.services||[]).filter(s=>s.sellable===true&&Number.isSafeInteger(s.price)&&typeof s.id==='string');
  purchaseReady=runtime?.commerceReady===true&&runtime?.commerce?.data?.capabilities?.services===true&&authenticated===true;
  if(status)status.textContent=purchaseReady?(lang==='fa'?'مسیر پرداخت این خدمت فعال است؛ تخصیص نوبت و تحویل فقط پس از تأیید جداگانه انجام می‌شود.':'This service checkout can start; booking and delivery require separate verification.'):(lang==='fa'?'همه خدمات قابل مشاهده‌اند؛ خرید امن پس از آماده‌شدن کامل حساب و درگاه از همین مسیر انجام می‌شود.':'The catalogue is visible; secure checkout activates when account and gateway readiness are confirmed.');
  render();
 };
 if(runtime?.catalog?.ok)apply(runtime.catalog.data);
 else jsonRequest('/assets/data/service-catalog.json',{credentials:'omit'}).then(r=>{if(r.ok)apply(r.data);else throw Error('catalog')}).catch(()=>{
  if(status)status.textContent=lang==='fa'?'فهرست خدمات موقتاً در دسترس نیست.':'Service catalogue is temporarily unavailable.';
  host.innerHTML='<div class="cd-service-empty">'+(lang==='fa'?'بارگذاری خدمات انجام نشد. از کاتالوگ رسمی خدمات استفاده کنید.':'Services could not be loaded. Use the official catalogue.')+'</div>';
 });
 if(search)search.oninput=render;
}

function authNavigation(authenticated){
 const login=lang==='en'?'/en/login/':'/fa/login/';
 $$('[data-dashboard-logout]').forEach(b=>{b.hidden=!authenticated});
 const primary=$('[data-dashboard-primary]');
 if(primary){
  if(!primary.dataset.defaultHref){primary.dataset.defaultHref=primary.getAttribute('href')||'#ecosystem';primary.dataset.defaultText=primary.textContent||''}
  if(authenticated){primary.setAttribute('href',primary.dataset.defaultHref);primary.textContent=primary.dataset.defaultText}
  else{primary.setAttribute('href',login);primary.textContent=lang==='en'?'Sign in':'ورود به حساب'}
 }
 const selectors=lang==='en'?'a[href^="/en/account/"],[data-private-route]':'a[href^="/fa/app/account/"],[data-private-route]';
 $$(selectors).forEach(a=>{
  if(!a.dataset.privateHref)a.dataset.privateHref=a.getAttribute('href')||'';
  if(authenticated&&a.dataset.privateHref){a.setAttribute('href',a.dataset.privateHref);a.removeAttribute('aria-disabled');a.dataset.access='authenticated'}
  else if(!authenticated){a.setAttribute('href',login);a.removeAttribute('aria-disabled');a.dataset.access='signin-required'}
 });
 $$('[data-auth-state-copy]').forEach(el=>{el.textContent=authenticated?(lang==='fa'?'ورود امن تأیید شده؛ مسیرهای خصوصی حساب باز هستند.':'Secure sign-in verified; private account routes are available.'):(lang==='fa'?'برای مشاهده پرونده‌ها، اسناد و مسیرهای خصوصی وارد حساب شوید.':'Sign in to access private records, documents and workspaces.')});
 const homeTitle=$('[data-home-heading]'),homeCopy=$('[data-home-copy]'),homeAction=$('[data-home-action]');
 if(homeTitle&&homeCopy&&homeAction){
  if(authenticated){
   homeTitle.textContent=lang==='en'?'Your verified account is connected.':'حساب تأییدشده شما متصل است.';
   homeCopy.textContent=lang==='en'?'Choose an area to review services and authorised records. If a service has no confirmed record yet, it remains clearly marked as unavailable.':'برای مشاهده خدمات و سوابق مجاز، بخش موردنظر را انتخاب کنید. نبود داده معتبر به‌صورت شفاف نمایش داده می‌شود.';
   homeAction.href='#ecosystem';homeAction.textContent=lang==='en'?'Open my services':'مشاهده خدمات من';
  }else{
   homeTitle.textContent=lang==='en'?'Sign in to view your personal status.':'برای مشاهده وضعیت شخصی، وارد حساب شوید.';
   homeCopy.textContent=lang==='en'?'No private records, activity counts or entitlements are inferred for a guest.':'برای مهمان، هیچ سابقه، آمار فعالیت یا دسترسی خصوصی به‌صورت فرضی نمایش داده نمی‌شود.';
   homeAction.href=login;homeAction.textContent=lang==='en'?'Sign in':'ورود به حساب';
  }
 }

}

function logout(){
 $$('[data-dashboard-logout]').forEach(b=>b.addEventListener('click',async()=>{
  b.disabled=true;
  const result=await jsonRequest(API+'/auth/logout',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:'{}'});
  if(result.ok){location.assign(lang==='en'?'/en/login/':'/fa/login/');return}
  b.disabled=false;
  const notice=$('[data-auth-state-copy]');
  if(notice)notice.textContent=lang==='fa'?'خروج امن تأیید نشد. اتصال را بررسی کنید و دوباره تلاش کنید.':'Sign-out was not confirmed. Check your connection and retry.';
 }));
}


async function supportEnglishHealth(authenticated){
 const status=$('[data-support-english-state]');
 if(!status)return;
 const health=await jsonRequest(API+'/student-support/health',{credentials:'include'});
 if(!health.ok||health.data?.ok!==true){
  status.textContent='Student support readiness could not be verified. No private records are displayed.';
 }else if(health.data.caseSchemaReady!==true||health.data.privatePortal!==true){
  status.textContent='Public contributions may be available. The private sponsorship workspace is not active until the case database, safeguarding approvals and access rules are ready.';
 }else if(!authenticated){
  status.textContent='Private student records require a verified account and an explicitly approved, consent-based relationship.';
 }else{
  status.textContent='Your account is connected. Student information is available only through the authorised private sponsorship process; no records are displayed here without a verified case grant.';
 }
}

async function refresh(){
 const runtime=await operationalStatus();
 const authenticated=await hydrate(runtime.auth);
 authNavigation(authenticated);
 serviceMarketplace(runtime,authenticated);
 await supportEnglishHealth(authenticated);
}

document.addEventListener('DOMContentLoaded',async()=>{
 network();nav();sheet();commandCenter();logout();
 await refresh();
});
})();
