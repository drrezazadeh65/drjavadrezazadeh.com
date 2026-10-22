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
 // Private callers can abort reads on sign-out/pagehide; keep the
 // established per-request timeout as a separate upper bound.
 const upstream=options.signal;
 const cancel=()=>controller.abort();
 if(upstream?.aborted)cancel();
 else upstream?.addEventListener?.('abort',cancel,{once:true});
 const timer=setTimeout(cancel,timeout);
 try{
  const r=await fetch(url,{cache:'no-store',...options,signal:controller.signal});
  let data=null;try{data=await r.json()}catch{}
  return {ok:r.ok,status:r.status,data};
 }catch(error){
  return {ok:false,status:0,data:null,error};
 }finally{
  clearTimeout(timer);
  upstream?.removeEventListener?.('abort',cancel);
 }
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
function commercialReady(r){return !!(r?.ok&&r.data?.ok===true&&r.data?.checkout===true&&r.data?.capabilities?.services===true)}

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
 const focusables=()=>$('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled])',sheet).filter(x=>!x.hidden);
 // Keep private workspace shortcuts out of the tab order when the mobile
 // sheet is closed. "aria-modal" describes only an ACTUALLY open dialog.
 sheet.inert=true;sheet.setAttribute('aria-hidden','true');
 sheet.removeAttribute('aria-modal');
 const shut=(restoreFocus=true)=>{
  sheet.classList.remove('is-open');sheet.inert=true;
  sheet.setAttribute('aria-hidden','true');sheet.removeAttribute('aria-modal');
  open.setAttribute('aria-expanded','false');
  document.documentElement.style.overflow='';
  if(restoreFocus)previous?.focus?.({preventScroll:true});
 };
 const show=()=>{
  previous=document.activeElement;
  sheet.inert=false;sheet.removeAttribute('aria-hidden');
  sheet.setAttribute('aria-modal','true');
  sheet.classList.add('is-open');
  open.setAttribute('aria-expanded','true');
  document.documentElement.style.overflow='hidden';
  close.focus({preventScroll:true});
 };
 open.setAttribute('aria-haspopup','dialog');
 open.addEventListener('click',show);
 close.addEventListener('click',()=>shut());
 sheet.addEventListener('click',e=>{
  if(e.target===sheet){shut();return}
  // Leave keyboard focus on a visible control when following a shortcut:
  // making a focused link inert without restoring it loses tab position.
  if(e.target.closest('a[href]'))shut(true);
 });
 sheet.addEventListener('keydown',e=>{
  if(e.key==='Escape'){e.preventDefault();shut();return}
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
 const messages=lang==='en'?{
  all:'These shortcuts change the view only; they do not grant account access or prove service availability.',
  learning:'Learning and development selected. Private activities still require server-authorised access.',
  shopping:'Orders and services selected. Payment, delivery and appointments require independent server verification.',
  sponsorship:'Student support selected. Case records, identities and benefits require verified permission and consent.'
 }:{
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

let serviceMarketplaceGeneration=0;
function serviceMarketplace(runtime,authenticated){
 const host=$('[data-dashboard-services]'),search=$('[data-dashboard-service-search]'),
       count=$('[data-dashboard-service-count]'),status=$('[data-dashboard-service-status]');
 if(!host)return;
 const stamp=++serviceMarketplaceGeneration;
 const isEnglish=lang==='en';
 const money=n=>localNumber(n)+(isEnglish?' toman':' تومان');
 let services=[],english={},purchaseReady=false;
 const render=()=>{
  if(stamp!==serviceMarketplaceGeneration)return;
  const q=normalize(search?.value);
  const terms=s=>{
   const t=english[s.id];
   return isEnglish?[s.id,t?.title,t?.fit,t?.outcome,t?.boundary]:
     [s.title_fa,s.fit_fa,s.outcome_fa,s.boundary_fa];
  };
  const rows=services.filter(s=>normalize(terms(s).join(' ')).includes(q));
  if(count)count.textContent=localNumber(services.length);
  host.innerHTML=rows.length?rows.map(s=>{
    const id=encodeURIComponent(s.id),translation=english[s.id];
    const title=isEnglish?translation.title:s.title_fa;
    const fit=isEnglish?translation.fit:s.fit_fa;
    const outcomeText=isEnglish?translation.outcome:s.outcome_fa;
    const boundaryText=isEnglish?translation.boundary:s.boundary_fa;
    const duration=Number.isInteger(s.duration_minutes)?localNumber(s.duration_minutes)+(isEnglish?' min':' دقیقه'):
      (isEnglish?'Service-specific scope':'دامنه اختصاصی خدمت');
    // English customers now use the genuine localized secure service
    // checkout, backed by the same server-verified payment engine.
    // Payment never claims scheduling, professional delivery or settlement.
    const checkoutHref=isEnglish
      ?(purchaseReady?'/en/services/checkout/?service='+id:'/en/request-consultation/?service='+id)
      :(purchaseReady?'/fa/services/checkout/?service='+id:'/fa/services/'+id+'/');
    const label=isEnglish
      ?(purchaseReady?'Secure service checkout':'Enquire about this service')
      :(purchaseReady?'خرید امن خدمت':'مشاهده شرایط خدمت');
    const outcome=outcomeText?'<p class="cd-service-outcome"><b>'+
      (isEnglish?'Defined outcome:':'خروجی روشن:')+'</b> '+esc(outcomeText)+'</p>':'';
    const boundary=boundaryText?'<details class="cd-service-boundary"><summary>'+
      (isEnglish?'Scope & boundary':'دامنه و مرز خدمت')+'</summary><p>'+esc(boundaryText)+'</p></details>':'';
    const infoHref=(isEnglish?'/en/services/':'/fa/services/')+id+'/';
    return '<article class="cd-service-card" data-purchase-ready="'+purchaseReady+'"><h3>'+
      esc(title)+'</h3><div class="cd-service-price">'+money(s.price)+'</div>'+
      '<span class="cd-service-duration">'+duration+'</span><p class="cd-service-fit">'+
      esc(fit||'')+'</p>'+outcome+boundary+'<div class="cd-service-actions"><a class="cd-service-buy" href="'+
      checkoutHref+'"'+(isEnglish?' hreflang="en"':'')+'>'+label+'</a><a class="cd-service-more" href="'+infoHref+'" aria-label="'+
      (isEnglish?'Review public service information':'معرفی بیشتر')+'">↗</a></div></article>';
  }).join(''):'<div class="cd-service-empty">'+
    (isEnglish?'No services match this search.':'خدمتی با این عبارت پیدا نشد.')+'</div>';
 };
 if(search)search.oninput=render;
 const catalogue=runtime?.catalog?.ok
   ?Promise.resolve({ok:true,data:runtime.catalog.data})
   :jsonRequest('/assets/data/service-catalog.json',{credentials:'omit'});
 const translated=isEnglish
   ?jsonRequest('/assets/data/service-descriptions-en.json',{credentials:'omit'})
   :Promise.resolve({ok:true,data:null});
 Promise.all([catalogue,translated]).then(([catalogueResult,translationResult])=>{
  if(stamp!==serviceMarketplaceGeneration)return;
  if(!catalogueResult.ok||!Array.isArray(catalogueResult.data?.services))throw Error('catalogue_unavailable');
  services=catalogueResult.data.services.filter(s=>s.sellable===true&&
    Number.isSafeInteger(s.price)&&s.price>=0&&typeof s.id==='string');
  if(isEnglish){
    const descriptions=translationResult.data;
    if(!translationResult.ok||descriptions?.schema_version!=='1.0'||
       descriptions.language!=='en'||!descriptions.services||
       Array.isArray(descriptions.services)||typeof descriptions.services!=='object'||
       Object.keys(descriptions.services).length!==catalogueResult.data.services.length||
       services.some(s=>{
         const t=descriptions.services[s.id];
         return !t||['title','fit','outcome','boundary'].some(key=>
           typeof t[key]!=='string'||!t[key].trim()||t[key].length>1200);
       }))throw Error('translation_unavailable');
    english=descriptions.services;
  }
  // Guest purchases are supported by the existing server-verified checkout.
  // Never infer a completed payment, booking, or account entitlement here.
  purchaseReady=runtime?.commerceReady===true&&
    runtime?.commerce?.data?.capabilities?.services===true;
  if(status)status.textContent=purchaseReady
    ?(isEnglish?'Secure checkout is available in English. Appointment confirmation and service delivery require separate verification.':
      'پرداخت امن خدمت در دسترس است؛ پرداخت به‌تنهایی رزرو قطعی نوبت یا تأیید تحویل نیست.')
    :(isEnglish?'Browse verified catalogue descriptions; use the English enquiry route until secure checkout is confirmed. An enquiry is not a booking.':
      'خدمات قابل مشاهده‌اند؛ تا تأیید آمادگی درگاه، پرداخت آغاز نمی‌شود. شرایط هر خدمت را در صفحه اختصاصی آن بخوانید.');
  render();
 }).catch(()=>{
  if(stamp!==serviceMarketplaceGeneration)return;
  // Unavailable source means UNKNOWN, not evidence of zero products.
  if(count)count.textContent='—';
  if(status)status.textContent=isEnglish
    ?'The service catalogue or its English descriptions cannot be verified at the moment.'
    :'فهرست خدمات موقتاً در دسترس نیست.';
  host.innerHTML='<div class="cd-service-empty">'+
    (isEnglish?'Service descriptions could not be loaded. Please use the official English services page.':
      'بارگذاری خدمات انجام نشد. از کاتالوگ رسمی خدمات استفاده کنید.')+'</div>';
 });
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
 $('[data-dashboard-logout]').forEach(b=>b.addEventListener('click',async()=>{
  b.disabled=true;
  // Clear on-screen private BAHAR and guardian observations immediately on
  // the user's sign-out intent; the API still independently proves whether
  // the server session was actually terminated.
  window.dispatchEvent(new Event('jr:account-logout'));
  forgetPrivateNextAction();
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

// A verified session alone never certifies an order, payment or booking.
// This overview consumes the existing owner-scoped history contract only.
// No private order details are stored in browser persistence or URL parameters.
let nextActionRequest=0;
let nextActionController=null;
function forgetPrivateNextAction(){
 ++nextActionRequest;
 nextActionController?.abort();
 nextActionController=null;
 const heading=$('[data-home-heading]'),description=$('[data-home-copy]'),
       action=$('[data-home-action]');
 if(heading&&description&&action){
  heading.textContent=lang==='en'?'Private overview cleared.':'نمای خصوصی پاک شد.';
  description.textContent=lang==='en'
   ?'Account-specific order details are no longer displayed. Verify your account to retrieve current records.'
   :'جزئیات سفارش اختصاصی دیگر نمایش داده نمی‌شود. برای دریافت اطلاعات تازه، وضعیت حساب را تأیید کنید.';
  action.textContent=lang==='en'?'Account sign-in':'ورود به حساب';
  action.href=lang==='en'?'/en/login/':'/fa/login/';
 }
}
async function verifiedCustomerNextAction(authenticated){
 const stamp=++nextActionRequest;
 nextActionController?.abort();
 nextActionController=new AbortController();
 const activeController=nextActionController;
 const heading=$('[data-home-heading]'),description=$('[data-home-copy]'),action=$('[data-home-action]');
 if(!heading||!description||!action||!authenticated)return;
 const isEnglish=lang==='en';
 const ordersHref=isEnglish?'/en/account/orders/':'/fa/app/account/orders/';
 const set=(title,detail,label,href)=>{
  if(stamp!==nextActionRequest||document.hidden||
     document.documentElement.dataset.customerAuthenticated!=='true')return;
  heading.textContent=title;description.textContent=detail;
  action.textContent=label;action.setAttribute('href',href);
 };
 // A successful authentication request is not proof that commerce history
 // is available. Keep error, empty and unauthorised states distinct.
 set(isEnglish?'Checking your next verified action…':'در حال بررسی اقدام بعدی تأییدشده…',
     isEnglish?'Only your authorised order history can determine a personal action.':'اقدام شخصی فقط با تاریخچه سفارش مجاز سمت سرور مشخص می‌شود.',
     isEnglish?'Open orders':'مشاهده سفارش‌ها',ordersHref);
 const response=await jsonRequest(API+'/commerce/history',{
  method:'GET',credentials:'include',cache:'no-store',signal:activeController.signal
 });
 if(stamp!==nextActionRequest||document.hidden||
    document.documentElement.dataset.customerAuthenticated!=='true')return;
 if(response.status===401||response.status===403){
  set(isEnglish?'Order access requires verification.':'دسترسی به سفارش‌ها نیازمند تأیید است.',
      isEnglish?'Your account session or order access could not be verified. Sign in again to review private orders.':'نشست حساب یا مجوز مشاهده سفارش‌ها تأیید نشد؛ برای بررسی سوابق خصوصی دوباره وارد شوید.',
      isEnglish?'Sign in':'ورود به حساب',isEnglish?'/en/login/':'/fa/login/');
  return;
 }
 if(!response.ok||response.data?.ok!==true||!Array.isArray(response.data.orders)){
  set(isEnglish?'Order status is temporarily unavailable.':'وضعیت سفارش‌ها موقتاً در دسترس نیست.',
      isEnglish?'No payment, booking or service entitlement is assumed. Review the private order page when the connection is restored.':'هیچ پرداخت، رزرو یا دسترسی خدمتی فرض نمی‌شود. پس از برقراری اتصال، سوابق خصوصی را بررسی کنید.',
      isEnglish?'Review orders':'بررسی سفارش‌ها',ordersHref);
  return;
 }
 // An incompatible/corrupted private-history payload must not be
 // filtered down to an invented "no orders" state. The authoritative API
 // returns at most 50 typed, owned order summaries with bounded safe items.
 const reported=response.data.orders;
 if(reported.length>50||reported.some(order=>
   !order||typeof order!=='object'||
   typeof order.id!=='string'||
   !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(order.id)||
   typeof order.state!=='string'||
   typeof order.paymentVerified!=='boolean'||
   !Array.isArray(order.items)||order.items.length>20||
   order.items.some(item=>!item||typeof item.sku!=='string')
 )){
  set(isEnglish?'Order records could not be verified.':'سوابق سفارش‌ها قابل تأیید نیست.',
      isEnglish?'The private history format is incomplete or incompatible. An empty account, payment or delivery state is not assumed.':
        'ساختار تاریخچه خصوصی ناقص یا ناسازگار است. خالی‌بودن حساب، پرداخت یا تحویل فرض نمی‌شود.',
      isEnglish?'Review orders':'بررسی سفارش‌ها',ordersHref);
  return;
 }
 const orders=reported;
 if(!orders.length){
  set(isEnglish?'Explore your first service.':'خدمت مناسب خود را انتخاب کنید.',
      isEnglish?'No orders are recorded for this verified account. Compare the available services before deciding.':'در حساب تأییدشده شما سفارشی ثبت نشده است. پیش از تصمیم، خدمات موجود را مقایسه کنید.',
      isEnglish?'Explore services':'مشاهده خدمات',isEnglish?'/en/services/':'/fa/services/');
  return;
 }
 const needReview=orders.filter(o=>o.paymentVerified!==true&&['created','pending','paid'].includes(o.state));
 const providerMatched=orders.filter(o=>o.paymentVerified===true);
 const total=localNumber(orders.length);
 if(needReview.length){
  set(isEnglish?'Review an order awaiting payment verification.':'وضعیت تأیید پرداخت سفارش را بررسی کنید.',
      isEnglish?
       total+' recorded order(s). '+localNumber(needReview.length)+' require payment-status review. An order or gateway return does not prove payment or fulfilment.':
       total+' سفارش ثبت‌شده؛ '+localNumber(needReview.length)+' مورد نیازمند بررسی وضعیت پرداخت است. ثبت سفارش یا بازگشت از درگاه، اثبات پرداخت و تحویل نیست.',
      isEnglish?'Review payment status':'بررسی وضعیت پرداخت',ordersHref);
  return;
 }
 // A provider-matched service can have a separate, authoritative appointment
 // or coordination state. Read just one owned order; never infer a booking
 // from payment or query-string parameters. Every destination rechecks access.
 const appointmentOrder=providerMatched.find(o=>
  o.state==='paid' && typeof o.id==='string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(o.id) &&
  Array.isArray(o.items) && o.items.some(i=>typeof i?.sku==='string' &&
   /^(service|vip):[a-z0-9_-]+$/.test(i.sku)));
 if(appointmentOrder){
  const evidence=await jsonRequest(API+'/commerce/fulfilment?order='+encodeURIComponent(appointmentOrder.id),
   {method:'GET',credentials:'include',cache:'no-store',signal:activeController.signal});
  if(stamp!==nextActionRequest || document.hidden ||
     document.documentElement.dataset.customerAuthenticated!=='true')return;
  if(evidence.ok && evidence.data?.ok===true &&
     evidence.data.paymentRecord==='provider_verified_not_bank_settlement' &&
     Array.isArray(evidence.data.serviceCases) && evidence.data.serviceCases.length<=20){
   const purchased=new Set(appointmentOrder.items
    .filter(i=>typeof i?.sku==='string' && /^(service|vip):[a-z0-9_-]+$/.test(i.sku))
    .map(i=>i.sku));
   const cases=evidence.data.serviceCases.filter(c=>c&&purchased.has(c.sku));
   const appointmentsHref=isEnglish?'/en/account/appointments/':'/fa/app/account/appointments/';
   const choice=cases.find(c=>['awaiting_contact','scheduling'].includes(c.status) &&
     c.customerChoiceEnabled===true && Array.isArray(c.allowedDeliveryModes) &&
     c.allowedDeliveryModes.some(mode=>['PHONE','VOICE','VIDEO','IN_PERSON'].includes(mode)));
   if(choice){
    set(isEnglish?'Choose a preferred consultation format.':'روش پیشنهادی مشاوره را انتخاب کنید.',
     isEnglish?
      'Your purchased service has an authorised coordination option. You may record a format preference; no appointment time or bank settlement is implied.':
      'برای خدمت خریداری‌شده امکان ثبت روش پیشنهادی جلسه تأیید شده است؛ این انتخاب به معنی رزرو قطعی زمان یا تسویه بانکی نیست.',
     isEnglish?'Review appointment options':'بررسی گزینه‌های نوبت',appointmentsHref);
    return;
   }
   if(cases.some(c=>c.status==='booked' && c.bookingStart && c.bookingEnd)){
    set(isEnglish?'Review your recorded appointment.':'نوبت ثبت‌شده را بررسی کنید.',
     isEnglish?
      'An authorised service case has a recorded booking window. Verify the exact local time and delivery format in your private appointment details; bank settlement is separate.':
      'در پرونده مجاز خدمت، بازه زمانی نوبت ثبت شده است. ساعت محلی و روش برگزاری را در جزئیات خصوصی بررسی کنید؛ تسویه بانکی مستقل است.',
     isEnglish?'View appointment details':'مشاهده جزئیات نوبت',appointmentsHref);
    return;
   }
  }
 }
 if(providerMatched.length){
  set(isEnglish?'Follow up your provider-verified order.':'پیگیری سفارش دارای تأیید درگاه',
      isEnglish?
       localNumber(providerMatched.length)+' of '+total+' orders have provider-matched payment evidence. Bank settlement, appointment confirmation and fulfilment remain separate checks.':
       localNumber(providerMatched.length)+' مورد از '+total+' سفارش دارای سند تطبیق‌یافته با درگاه است. تسویه بانکی، تأیید نوبت و تحویل همچنان بررسی‌های مستقل دارند.',
      isEnglish?'Track service and receipt':'پیگیری خدمت و رسید',ordersHref);
  return;
 }
 set(isEnglish?'Review your recorded orders.':'سوابق سفارش‌های خود را بررسی کنید.',
     isEnglish?'There are '+total+' recorded order(s), but no current provider-verified payment is established in this summary.':
       total+' سفارش ثبت شده است؛ با این حال، در این خلاصه هیچ پرداخت تأییدشده‌ای از سوی درگاه احراز نشده است.',
     isEnglish?'Open order history':'مشاهده تاریخچه سفارش‌ها',ordersHref);
}

async function refresh(){
 const runtime=await operationalStatus();
 const authenticated=await hydrate(runtime.auth);
 authNavigation(authenticated);
 void verifiedCustomerNextAction(authenticated);
 serviceMarketplace(runtime,authenticated);
 await supportEnglishHealth(authenticated);
}

document.addEventListener('DOMContentLoaded',async()=>{
 network();nav();sheet();commandCenter();logout();
 await refresh();
});
// Owned commerce details cannot reappear after the tab becomes private-inactive.
document.addEventListener('visibilitychange',()=>{
 if(document.hidden)forgetPrivateNextAction();
});
window.addEventListener('offline',forgetPrivateNextAction);
window.addEventListener('pagehide',forgetPrivateNextAction);
})();
