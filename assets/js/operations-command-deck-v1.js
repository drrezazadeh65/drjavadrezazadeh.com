/* JR Owner Command Deck v1 — a private, evidence-bound interface over existing
 * MFA-guarded operations. No new endpoints, writes, persistent storage, polling,
 * account elevation, synthetic uptime or payment/editorial state changes.
 * Panels stay in the original DOM: existing event handlers and IDs survive.
 */
(()=>{
'use strict';
const workspace=document.getElementById('ops-workspace');
const auth=document.getElementById('ops-auth');
const notice=document.getElementById('ops-notice');
if(!workspace||!auth||!notice||document.getElementById('ops-command-deck'))return;
const fa=document.documentElement.lang==='fa';
const tr=(persian,english)=>fa?persian:english;
const make=(tag,className,textContent)=>{
 const element=document.createElement(tag);
 if(className)element.className=className;
 if(textContent!==undefined)element.textContent=textContent;
 return element;
};
const ZONES=[
 ['overview',tr('نبض مجموعه','Overview'),'activity','cyan'],
 ['engines',tr('موتورها و گزارش‌ها','Engines & reports'),'cpu','gold'],
 ['ai',tr('هوش مصنوعی و JREI','AI & JREI'),'brain','blue'],
 ['seo',tr('سئو و رشد','SEO & growth'),'trending-up','cyan'],
 ['education',tr('آموزش و ارزیابی','Education'),'graduation-cap','gold'],
 ['commerce',tr('فروش و درآمد','Commerce'),'wallet','green'],
 ['journal',tr('مجله و نشر','Journal & publishing'),'book-open','blue'],
 ['media',tr('رسانه و انتشار','Media & social'),'radio','violet'],
 ['systems',tr('سامانه و تنظیمات','System & tools'),'settings','red']
];
const ZONE_IDS=Object.freeze({
 'ops-executive-stats':'overview',
 'ops-immediate-triage':'overview','ops-health-summary':'overview',
 'ops-detail':'engines','ops-cards':'engines','ops-reporting':'engines',
 'ops-audit-timeline':'systems','ops-stage7-blueprint':'systems',
 'ops-social':'media','ops-social-composer':'media','ops-social-review':'media',
 'ops-social-settings':'media','ops-organic-growth':'seo',
 'ops-free-resources':'systems','ops-jhela-workstream':'journal',
 'ops-jhela-maturity':'journal','ops-jhela-roadmap':'journal',
 'ops-jhela-architecture':'journal','ops-author-dashboard-preview':'journal',
 'ops-author-real-view':'journal','ops-publishing-author-review':'journal',
 'ops-gsc-direct':'seo','ops-ai-visibility':'seo',
 'ops-commerce':'commerce','ops-revenue-planning':'commerce',
 'ops-scientific-readiness':'education','ops-education-readiness':'education',
 'ops-education-source-review':'education','ops-education-offers':'education',
 'ops-education-release-gates':'education','jr-intelligence':'ai',
 'ops-jrei-hybrid-nodes':'ai','ops-jrei-learning':'ai',
 'ops-jrei-exam-research':'ai','ops-jrei-newsroom':'ai',
 'ops-cron-master':'systems','ops-jrei-independent-source-review':'education',
 'ops-workspace-index-v1':'systems','ops-navigator':'systems',
 'ops-keyword-master':'seo','ops-page-quality':'seo',
 'ops-response-monitor':'overview','ops-alert-center':'overview',
 'ops-http-health':'overview','ops-sources':'engines','ops-queue':'engines'
});
const ICONS={
 'activity':['M3 12h4l3 6 4-12 3 6h4'],
 'cpu':['M6 6h12v12H6z','M9 1v5 M15 1v5 M9 18v5 M15 18v5 M1 9h5 M1 15h5 M18 9h5 M18 15h5'],
 'brain':['M12 5a4 4 0 0 0-7 2 4 4 0 0 0-1 7 4 4 0 0 0 3 6h1 M12 5a4 4 0 0 1 7 2 4 4 0 0 1 1 7 4 4 0 0 1-3 6h-1 M12 5v14 M8 8v3 M16 8v3'],
 'trending-up':['M3 17l6-6 4 4 8-8','M15 7h6v6'],
 'graduation-cap':['M2 9l10-5 10 5-10 5-10-5z','M6 12v5c4 3 8 3 12 0v-5 M22 9v7'],
 'wallet':['M4 6h16v13H4a2 2 0 0 1-2-2V7a3 3 0 0 1 3-3h13','M15 12h7v5h-7a2 2 0 0 1 0-5z'],
 'book-open':['M12 5c-3-2-7-2-10-1v15c3-1 7-1 10 1 3-2 7-2 10-1V4c-3-1-7-1-10 1z','M12 5v15'],
 'radio':['M5 16a9 9 0 0 1 0-8 M19 8a9 9 0 0 1 0 8','M8 13a4 4 0 0 1 0-2 M16 11a4 4 0 0 1 0 2','M12 12v8 M9 20h6'],
 'settings':['M12 3l2 1 2-1 2 2-1 2 1 2 3 1v4l-3 1-1 2 1 2-2 2-2-1-2 1-2-1-2 1-2-2 1-2-1-2-3-1v-4l3-1 1-2-1-2 2-2 2 1z','M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z']
};
function icon(name){
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
 svg.setAttribute('viewBox','0 0 24 24');
 svg.setAttribute('aria-hidden','true');
 svg.setAttribute('fill','none');
 svg.setAttribute('stroke','currentColor');
 svg.setAttribute('stroke-width','1.7');
 svg.setAttribute('stroke-linecap','round');
 svg.setAttribute('stroke-linejoin','round');
 for(const d of ICONS[name]||ICONS.activity){
  const p=document.createElementNS('http://www.w3.org/2000/svg','path');
  p.setAttribute('d',d);svg.append(p);
 }
 return svg;
}
const shell=make('section','ops-command-deck');
shell.id='ops-command-deck';
shell.setAttribute('aria-label',tr('مرکز فرمان یکپارچه مدیر','Owner unified command deck'));
const heading=make('div','ops-command-heading');
const identity=make('div','ops-command-identity');
const crest=make('span','ops-command-crest');crest.append(icon('activity'));
const overline=make('span','ops-command-overline','JR / PRIVATE OPERATIONS');
const title=make('h2','ops-command-title',tr('مرکز فرمان اکوسیستم','Ecosystem Command Centre'));
identity.append(crest,overline,title);
const badges=make('div','ops-command-signals');
const signal=make('div','ops-command-signal');
signal.dataset.signal='unknown';signal.setAttribute('role','status');signal.setAttribute('aria-live','polite');
const signalDot=make('span','ops-command-signal-dot');signalDot.setAttribute('aria-hidden','true');
const signalCopy=make('span','ops-command-signal-copy');
const signalHeading=make('strong',null,tr('وضعیت ارتباط با سرور','Server connection'));
const signalText=make('small',null,tr('هنوز تأیید نشده','Not yet verified'));
signalCopy.append(signalHeading,signalText);signal.append(signalDot,signalCopy);
const freshness=make('div','ops-command-freshness');
const freshnessLabel=make('small',null,tr('آخرین گزارش احرازشده','Last authenticated report'));
const freshnessValue=make('strong',null,'—');
freshness.append(freshnessLabel,freshnessValue);
const refresh=make('button','ops-command-refresh',tr('تازه‌سازی داده‌ها','Refresh evidence'));
refresh.type='button';refresh.append(icon('activity'));
refresh.addEventListener('click',()=>{
 if(workspace.hidden)return;
 const original=document.getElementById('ops-refresh-data');
 if(original&&!original.disabled)original.click(); // existing authenticated server action
});
badges.append(signal,freshness,refresh);
heading.append(identity,badges);
const timeline=make('div','ops-command-network-timeline');
timeline.setAttribute('role','img');
timeline.setAttribute('aria-label',tr('هنوز سابقه‌ای از بررسی ارتباط ثبت نشده است',
 'No connection observations have been recorded'));
const timelineLabel=make('span','ops-command-timeline-label',
 tr('توالی مشاهده‌های واقعی ارتباط','Recent observed API responses'));
const timelineBars=make('div','ops-command-timeline-bars');
const timelineLegend=make('small','ops-command-timeline-legend',
 tr('سبز: پاسخ واقعی · قرمز: تلاش ناموفق · این نمودار سلامت کل سایت نیست',
    'Green: real response · red: failed attempt · not a whole-site health score'));
timeline.append(timelineLabel,timelineBars,timelineLegend);
const nav=make('nav','ops-command-tabs');
nav.setAttribute('aria-label',tr('گروه‌های اصلی مدیریت','Main administration categories'));
const tabs=new Map();
for(const [id,label,symbol,tone] of ZONES){
 const b=make('button','ops-command-tab');
 b.type='button';b.dataset.opsZone=id;b.dataset.tone=tone;
 b.setAttribute('aria-pressed','false');
 b.append(icon(symbol),make('span',null,label));
 if(id==='overview'){
  const pill=make('span','ops-command-mini-pulse');
  pill.setAttribute('aria-hidden','true');b.append(pill);
 }
 b.addEventListener('click',()=>activate(id,{focus:true}));
 nav.append(b);tabs.set(id,b);
}
const subtitle=make('div','ops-command-subheading');
const breadcrumb=make('div','ops-command-breadcrumb');
const eyebrow=make('span','ops-command-breadcrumb-label','WORKSPACE');
const sectionTitle=make('strong',null,ZONES[0][1]);
breadcrumb.append(eyebrow,sectionTitle);
const disclaimer=make('small','ops-command-disclaimer',
 tr('هر چراغ فقط شواهد همان بخش را نشان می‌دهد؛ نبود هشدار به معنای سلامت قطعی کل سایت نیست.',
    'Signals reflect their evidence scope; no alerts does not certify total site health.'));
subtitle.append(breadcrumb,disclaimer);
const moduleBar=make('nav','ops-command-modules');
moduleBar.setAttribute('aria-label',tr('زیرمجموعه‌های بخش انتخاب‌شده','Subsections of selected category'));
const moduleTitle=make('small','ops-command-module-label',
 tr('زیرمجموعه‌های عملیاتی','Operational modules'));
const moduleButtons=make('div','ops-command-module-buttons');
moduleBar.append(moduleTitle,moduleButtons);
const overview=make('section','ops-command-overview');
overview.setAttribute('aria-label',tr('خلاصه شواهد واقعی','Real evidence summary'));
const score=make('div','ops-command-progress');
const ring=document.createElementNS('http://www.w3.org/2000/svg','svg');
ring.setAttribute('viewBox','0 0 100 100');ring.setAttribute('aria-hidden','true');
for(const klass of ['track','fill']){
 const circle=document.createElementNS('http://www.w3.org/2000/svg','circle');
 circle.setAttribute('cx','50');circle.setAttribute('cy','50');circle.setAttribute('r','42');
 circle.setAttribute('class','ops-command-ring-'+klass);
 ring.append(circle);
}
const ringNumber=make('strong',null,'—');
const ringCaption=make('span',null,tr('بخش‌های تأییدشده','Verified sections'));
const scoreCopy=make('div','ops-command-progress-copy');
scoreCopy.append(ringNumber,ringCaption);score.append(ring,scoreCopy);
const readings=make('div','ops-command-readings');
const metricNodes={};
for(const [key,label] of [
 ['total',tr('کل بخش‌های گزارش','Reporting sections')],
 ['coverage',tr('پوشش اندازه‌گیری','Measured coverage')],
 ['critical',tr('رخداد بحرانی ثبت‌شده','Recorded critical incidents')],
 ['warning',tr('هشدار ثبت‌شده','Recorded warning incidents')]
]){
 const card=make('article','ops-command-reading');card.dataset.metric=key;
 const caption=make('span',null,label);
 const value=make('strong',null,'—');
 const scope=make('small',null,key==='critical'||key==='warning'
  ?tr('فقط داده حسگرِ موجود','Only available sensor evidence')
  :tr('بر اساس گزارش سرور','From server reporting'));
 card.append(caption,value,scope);readings.append(card);metricNodes[key]=value;
}
const quick=make('div','ops-command-shortcuts');
const quickHeader=make('small',null,tr('رفتن به بخش عملیاتی','Jump to an operational area'));
quick.append(quickHeader);
for(const [zone,label] of [
 ['ai',tr('کنترل JREI','JREI controls')],
 ['seo',tr('سئو و صفحات','SEO & pages')],
 ['commerce',tr('سفارش‌ها','Orders')],
 ['journal',tr('نشریه','Journal')]
]){
 const b=make('button','ops-command-shortcut',label);b.type='button';
 b.addEventListener('click',()=>activate(zone,{focus:true}));quick.append(b);
}
overview.append(score,readings,quick);
shell.append(heading,timeline,nav,subtitle,moduleBar,overview);
workspace.prepend(shell);
let active='overview';
const selectedModules=new Map();
let moduleSequence=0;
let lastSuccess=0;
let connectionError=false;
let heartbeat=0;
let heartbeatBusy=false;
const observations=[];
const formatNumber=value=>new Intl.NumberFormat(fa?'fa-IR':'en-US').format(value);
function zoneOf(element){
 if(element===shell)return null;
 if(element.classList.contains('ops-workspace-index'))return 'systems';
 if(element.classList.contains('ops-jump'))return 'systems';
 if(element.classList.contains('ops-immediate-triage')||
    element.classList.contains('ops-stats'))return 'overview';
 if(element.classList.contains('ops-toolbar'))return 'engines';
 if(element.classList.contains('ops-footer'))return 'systems';
 if(element.id&&ZONE_IDS[element.id])return ZONE_IDS[element.id];
 if(element.querySelector(':scope > #ops-queue,:scope > #ops-sources'))return 'engines';
 const text=(element.id||'')+' '+(element.className||'');
 if(/jrei|hybrid|intelligence|learning|newsroom/.test(text))return 'ai';
 if(/gsc|seo|quality|keyword|growth|search|visibility/.test(text))return 'seo';
 if(/education|bahar|source-review|interest/.test(text))return 'education';
 if(/jhela|journal|author|publishing|reviewer|manuscript/.test(text))return 'journal';
 if(/commerce|revenue|orders|shop/.test(text))return 'commerce';
 if(/social|composer|media/.test(text))return 'media';
 return 'systems';
}
function candidates(zone){
 return [...workspace.children].filter(child=>child!==shell&&
  !child.classList.contains('ops-jump')&&
  zoneOf(child)===zone&&!child.hidden);
}
function moduleId(child){
 if(!child.dataset.opsCommandItemId)
  child.dataset.opsCommandItemId='jr-module-'+(++moduleSequence);
 return child.dataset.opsCommandItemId;
}
function moduleName(child){
 const title=child.querySelector(':scope > summary,:scope > h2,:scope > h3');
 if(title?.textContent?.trim())return title.textContent.trim().slice(0,84);
 if(child.classList.contains('ops-workspace-index'))
  return tr('فهرست جامع همه ابزارها','Full index of all tools');
 if(child.classList.contains('ops-toolbar'))return tr('جست‌وجو و خروجی گزارش','Search and report exports');
 if(child.classList.contains('ops-stats'))return tr('شاخص‌های گزارش','Report metrics');
 if(child.id==='ops-cards')return tr('فهرست موتورهای عملیاتی','Operational engines');
 if(child.id==='ops-detail')return tr('گزارش موتور انتخاب‌شده','Selected engine report');
 return child.getAttribute('aria-label')||child.id||
  tr('ابزار مدیریتی','Admin workspace');
}
function renderModules(){
 moduleButtons.replaceChildren();
 const nodes=candidates(active);
 moduleBar.hidden=active==='overview'||active==='engines'||nodes.length<2;
 if(moduleBar.hidden)return;
 const selected=selectedModules.get(active);
 if(!nodes.some(node=>moduleId(node)===selected)){
  selectedModules.set(active,moduleId(nodes[0]));
 }
 for(const node of nodes){
  const button=make('button','ops-command-module',moduleName(node));
  button.type='button';
  button.dataset.moduleId=moduleId(node);
  button.setAttribute('aria-pressed',String(selectedModules.get(active)===moduleId(node)));
  button.addEventListener('click',()=>{
   selectedModules.set(active,moduleId(node));
   if(node.tagName==='DETAILS')node.open=true;
   annotate();
   workspace.scrollTo({top:0,behavior:'instant'});
  });
  moduleButtons.append(button);
 }
}
function annotate(){
 if(workspace.hidden)return;
 const nodes=candidates(active);
 const selected=selectedModules.get(active);
 if(active!=='overview'&&active!=='engines'&&nodes.length&&!nodes.some(el=>moduleId(el)===selected)){
  selectedModules.set(active,moduleId(nodes[0]));
 }
 for(const child of workspace.children){
  if(child===shell)continue;
  const zone=zoneOf(child);
  const currentModule=moduleId(child);
  const subgroupHidden=active!=='overview'&&active!=='engines'&&
    zone===active&&selectedModules.get(active)!==currentModule;
  const inactive=zone!==active||subgroupHidden||
    child.classList.contains('ops-jump');
  child.dataset.opsCommandZone=zone;
  child.classList.toggle('ops-command-inactive',inactive);
  // CSS concealment and inert affordance are NOT authorization boundaries.
  child.inert=inactive;
 }
 for(const button of moduleButtons.children){
  button.setAttribute('aria-pressed',String(button.dataset.moduleId===selectedModules.get(active)));
 }
}
function selectModule(element){
 if(!element||element.parentElement!==workspace)return;
 const zone=zoneOf(element);
 if(zone!=='overview'&&zone!=='engines'){
  selectedModules.set(zone,moduleId(element));
 }
 activate(zone);
}
function activate(next,{focus=false}={}){
 if(workspace.hidden||!tabs.has(next))return;
 active=next;
 workspace.dataset.opsActiveZone=next;
 for(const [id,button] of tabs){
  button.setAttribute('aria-pressed',id===next?'true':'false');
  if(id===next)button.setAttribute('aria-current','page');
  else button.removeAttribute('aria-current');
 }
 sectionTitle.textContent=ZONES.find(([id])=>id===next)?.[1]||'';
 overview.hidden=next!=='overview';
 renderModules();annotate();
 // Internal viewport, not a 200-kilometre document scrollbar.
 workspace.scrollTo({top:0,behavior:'instant'});
 if(focus)tabs.get(next).focus({preventScroll:true});
}
function readNumber(id){
 const raw=document.getElementById(id)?.textContent?.trim()||'';
 const latin=raw.replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
   .replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d));
 const m=latin.match(/^\d+/);
 return m?Number(m[0]):null;
}
function incident(kind){
 // Published owner readings are allowed only when the original sensor tiles
 // provide a real numeric value. Do not reinterpret a dash as zero.
 const values=[...workspace.querySelectorAll('.ops-immediate-triage__tile[data-evidence-kind="'+kind+'"]')]
  .map(tile=>tile.querySelector('.ops-immediate-triage__value')?.textContent?.trim())
  .filter(Boolean)
  .map(v=>Number(v.replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d))));
 if(!values.length||values.some(n=>!Number.isFinite(n)))return null;
 // A single triage category might mix HTTP 5xx with verified incidents.
 // Show existence of observations, not a fabricated unique incident total.
 return Math.max(...values);
}
function metrics(){
 if(workspace.hidden)return;
 const total=readNumber('ops-total');
 const verified=readNumber('ops-verified');
 const coverage=document.getElementById('ops-coverage')?.textContent?.trim()||'—';
 metricNodes.total.textContent=total===null?'—':formatNumber(total);
 metricNodes.coverage.textContent=/\d/.test(coverage)?coverage:'—';
 ringNumber.textContent=verified===null?'—':formatNumber(verified);
 const fraction=total&&verified!==null?Math.min(1,Math.max(0,verified/total)):0;
 score.style.setProperty('--ops-ring-completion',String(fraction));
 score.setAttribute('aria-label',verified===null||total===null
   ?tr('پوشش تأییدشده نامشخص','Verified coverage unknown')
   :tr(verified+' بخش از '+total+' بخش تأیید شده',
       verified+' of '+total+' sections verified'));
 for(const kind of ['critical','warning']){
  const value=incident(kind);
  metricNodes[kind].textContent=value===null?'—':formatNumber(value);
  metricNodes[kind].parentElement.dataset.state=value===null?'unknown':value>0?(kind==='critical'?'alert':'warning'):'observed-zero';
 }
 const checked=document.getElementById('ops-checked')?.textContent?.trim()||'';
 if(checked&&checked!=='—')freshnessValue.textContent=checked;
}
function recordObservation(ok,kind){
 if(workspace.hidden)return;
 observations.push({ok,kind,at:Date.now()});
 if(observations.length>12)observations.shift();
 timelineBars.replaceChildren();
 for(const entry of observations){
  const segment=make('span','ops-command-timeline-bar');
  segment.dataset.result=entry.ok?'pass':'fail';
  segment.title=(entry.ok?tr('پاسخ موفق','Successful response'):
    tr('تلاش ناموفق','Failed request'))+' · '+
    new Date(entry.at).toLocaleTimeString(fa?'fa-IR':'en-US',{hour:'2-digit',minute:'2-digit'});
  timelineBars.append(segment);
 }
 timeline.setAttribute('aria-label',tr(
   observations.length+' بررسی واقعی ارتباط در این نشست، '+observations.filter(x=>!x.ok).length+' تلاش ناموفق',
   observations.length+' real session observations, '+observations.filter(x=>!x.ok).length+' failed attempts'));
}
async function heartbeatProbe(){
 if(workspace.hidden||auth.hidden!==true||document.hidden||heartbeatBusy)return;
 heartbeatBusy=true;
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),9000);
 try{
  const response=await fetch('/api/admin/operations/session',{
   credentials:'same-origin',cache:'no-store',
   headers:{'Accept':'application/json'},signal:controller.signal
  });
  const body=await response.json();
  if(workspace.hidden)return;
  if((response.status===401||response.status===403)||
     (response.ok&&body?.ok===true&&body.mfaRequired===true)){
   workspace.dispatchEvent(new Event('jr:operations-session-invalid'));
   return;
  }
  const success=response.ok&&body?.ok===true&&body.mfaRequired===false;
  recordObservation(success,'session');
  if(success){
   lastSuccess=Date.now();
   // A successful session probe confirms the account endpoint only. It cannot
   // erase a separately recorded failed reporting refresh.
  }else connectionError=true;
  pulse();
 }catch(_){
  if(!workspace.hidden){
   recordObservation(false,'session');
   connectionError=true;pulse();
  }
 }finally{
  clearTimeout(timer);heartbeatBusy=false;
 }
}
function pulse(){
 if(workspace.hidden)return;
 const age=lastSuccess?Date.now()-lastSuccess:Infinity;
 const state=connectionError?'error':!lastSuccess?'unknown':age<=60000?'fresh':'stale';
 signal.dataset.signal=state;
 signalHeading.textContent=({
  fresh:tr('ارتباط مدیریتی تأیید شد','Admin connection verified'),
  stale:tr('گزارش نیازمند تازه‌سازی','Report needs refreshing'),
  error:tr('تازه‌سازی با خطا روبه‌رو شد','Report refresh failed'),
  unknown:tr('وضعیت هنوز مشخص نیست','Connection not confirmed')
 })[state];
 signalText.textContent=({
  fresh:tr('پاسخ موفق از API خصوصی · نه تأیید سلامت کل سایت',
           'Private API responded · not a whole-site uptime claim'),
  stale:tr('آخرین پاسخ قدیمی است؛ برای وضعیت تازه بررسی کنید',
           'Last successful response is ageing; request fresh evidence'),
  error:tr('گزارش قبلی ممکن است قدیمی باشد؛ خطا را بررسی کنید',
           'Previous evidence may be stale; inspect the error'),
  unknown:tr('تا دریافت گزارش واقعی هیچ وضعیت سالمی فرض نمی‌شود',
             'No positive status without actual evidence')
 })[state];
}
function locked(){
 lastSuccess=0;connectionError=false;selectedModules.clear();
 observations.length=0;timelineBars.replaceChildren();
 timeline.setAttribute('aria-label',tr('سابقه ارتباط پاک شد','Connection history cleared'));
 moduleButtons.replaceChildren();moduleBar.hidden=true;
 clearInterval(heartbeat);heartbeat=0;
 freshnessValue.textContent='—';
 ringNumber.textContent='—';score.style.setProperty('--ops-ring-completion','0');
 for(const node of Object.values(metricNodes))node.textContent='—';
 for(const child of workspace.children){
  if(child===shell)continue;
  child.inert=false;child.classList.remove('ops-command-inactive');
  delete child.dataset.opsCommandZone;
 }
 workspace.classList.remove('ops-command-deck-ready');
 document.querySelector('main.ops')?.classList.remove('ops-console-layout');
 pulse();
}
function unlocked(){
 if(workspace.hidden||auth.hidden!==true)return;
 lastSuccess=Date.now();connectionError=false;
 recordObservation(true,'report');
 workspace.classList.add('ops-command-deck-ready');
 document.querySelector('main.ops')?.classList.add('ops-console-layout');
 metrics();activate(active);
 pulse();
 if(!heartbeat)heartbeat=setInterval(()=>{
  pulse();
  if(!document.hidden&&Date.now()-lastSuccess>=60000)void heartbeatProbe();
},15000); // bounded 1-minute owner session observation; no external probes
}
// Existing internal links and report-to-panel navigation need to activate their
// owning category BEFORE legacy focus/scroll behaviour runs.
document.addEventListener('click',event=>{
 if(workspace.hidden)return;
 const link=event.target?.closest?.('a[href^="#"],button[data-ops-target],button[data-ops-workspace-jump]');
 if(!link||!workspace.contains(link)||shell.contains(link))return;
 const id=link.dataset.opsWorkspaceJump||link.dataset.opsTarget||
  decodeURIComponent((link.getAttribute('href')||'').replace(/^#/,''))||'';
 const target=document.getElementById(id);
 if(!target||!workspace.contains(target))return;
 let direct=target;
 while(direct&&direct.parentElement!==workspace)direct=direct.parentElement;
 if(direct&&direct!==shell)selectModule(direct);
},true);
workspace.addEventListener('jr:ops-workspace-activate',event=>{
 if(workspace.hidden)return;
 const target=document.getElementById(String(event.detail?.id||''));
 if(!target||!workspace.contains(target))return;
 let direct=target;
 while(direct&&direct.parentElement!==workspace)direct=direct.parentElement;
 if(direct)selectModule(direct);
});
workspace.addEventListener('jr:operations-ready',()=>{
 unlocked();
 // The original read model updates the notice immediately after this event.
 queueMicrotask(()=>{connectionError=notice.classList.contains('ops-error');pulse();});
});
workspace.addEventListener('jr:operations-locked',locked);
// New operational tiles and panels may be appended after an authenticated
// response. Observe direct children only: never re-render the entire dashboard.
const observer=new MutationObserver(changes=>{
 if(workspace.hidden)return;
 if(changes.some(change=>change.type==='childList')){
  renderModules();annotate();metrics();
 }
});
observer.observe(workspace,{childList:true});
const noticeObserver=new MutationObserver(()=>{
 if(workspace.hidden)return;
 connectionError=notice.classList.contains('ops-error');
 pulse();
});
noticeObserver.observe(notice,{attributes:true,attributeFilter:['class']});
document.addEventListener('visibilitychange',()=>{
 if(!document.hidden&&!workspace.hidden&&Date.now()-lastSuccess>=60000)
  void heartbeatProbe();
});
window.addEventListener('online',()=>{if(!workspace.hidden)pulse()});
window.addEventListener('offline',()=>{
 if(workspace.hidden)return;
 connectionError=true;pulse();
});
if(!workspace.hidden&&!auth.hidden)unlocked();
})();