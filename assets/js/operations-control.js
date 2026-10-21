/* Privileged operations: server-authorized data only; no browser persistence or closure writes. */
(()=>{'use strict';
const root=document.getElementById('operations-control');if(!root)return;
const en=document.documentElement.lang==='en';let snapshot=null,csrf='',selected=null,expiryTimer=null,loadGeneration=0,actionRuns=[],sectionsExpanded=false,githubAuditState=null,githubAuditExpanded=false,collectionState=null,collectionExpanded=false;
const t=(fa,eng)=>en?eng:fa,$=id=>document.getElementById(id);
const statuses={not_started:t('شواهد ثبت نشده','No evidence'),in_progress:t('در حال انجام','In progress'),blocked:t('وابستگی باز','Blocked'),ready_for_verification:t('نیازمند آزمون مجدد','Recheck required'),verified_complete:t('تکمیل تأییدشده','Verified complete'),regressed:t('خطای جدید','Regressed')};
const gates={unknown:t('نامشخص','Unknown'),stale:t('قدیمی؛ نیازمند بررسی','Stale'),pass:t('موفق','Pass'),fail:t('ناموفق','Fail'),blocked:t('مسدود','Blocked')};
const date=epoch=>epoch?new Date(epoch*1000).toLocaleString(en?'en-GB':'fa-IR'):t('ثبت نشده','Not recorded');
const pct=value=>value===null||value===undefined?t('نامشخص','Unknown'):value+'%';
const title=r=>en?r.title:r.titleFa;
const signalValue=s=>s.value===null||s.value===undefined?t('نامشخص','Unknown'):typeof s.value==='boolean'?t(s.value?'بله':'خیر',s.value?'Yes':'No'):String(s.value);
const signalLabel=s=>en?s.labelEn:s.labelFa;
function el(tag,txt,cls){const node=document.createElement(tag);if(txt!==undefined)node.textContent=txt;if(cls)node.className=cls;return node;}
// Never treat a registry or database evidence string as a trusted link.
// Preserve its label as text when the URL has an executable/unsafe scheme.
function safeEvidenceUrl(value){
 if(typeof value!=='string'||value.length>2048)return null;
 const source=value.toLowerCase();
 if(!(source.startsWith('https://')||source.startsWith('http://')||
     (value.startsWith('/')&&!value.startsWith('//'))))return null;
 try{
  const url=new URL(value,window.location.origin);
  if(!['http:','https:'].includes(url.protocol)||url.username||url.password)return null;
  return url.href;
 }catch{return null;}
}
async function api(path,options={}){const response=await fetch('/api/admin/operations'+path,{credentials:'same-origin',cache:'no-store',...options});const body=await response.json();if(!response.ok||body.ok!==true)throw new Error(body.error||'network_error');return body;}
function notice(text,error=false){$('ops-notice').textContent=text;$('ops-notice').classList.toggle('ops-error',error);}
function lock(message){clearTimeout(expiryTimer);loadGeneration++;snapshot=null;selected=null;csrf='';actionRuns=[];sectionsExpanded=false;githubAuditState=null;githubAuditExpanded=false;collectionState=null;collectionExpanded=false;$('ops-workspace').hidden=true;$('ops-auth').hidden=false;
// Notify private child workspaces immediately; hiding alone retains confidential DOM.
$('ops-workspace').dispatchEvent(new Event('jr:operations-locked'));const auditHistory=$('ops-audit-timeline');if(auditHistory){auditHistory.open=false;auditHistory.querySelector('[aria-live]')?.replaceChildren();}const commerce=$('ops-commerce');if(commerce)commerce.open=false;$('ops-commerce-results')?.replaceChildren();for(const id of ['ops-cards','ops-detail','ops-sources','ops-reporting','ops-queue'])$(id)?.replaceChildren();for(const id of ['ops-total','ops-verified','ops-coverage','ops-admin-score','ops-release','ops-checked'])$(id).textContent=t('نامشخص','Unknown');$('ops-engine').replaceChildren();$('ops-mfa-code').value='';reportingView={level:'executive',engine:'ENG-01',action:'',facet:'A'};notice(message,true);}
function errorMessage(error){return ({unauthorized:t('ابتدا با حساب تأییدشدهٔ مدیر وارد شوید.','Sign in with your verified administrator account.'),admin_forbidden:t('این حساب دسترسی مدیر ندارد؛ نقش باید در تنظیمات خصوصی سرور ثبت شود.','This account has no administrator permission. Provision its role privately on the server.'),operations_schema_unavailable:t('جداول مدیریتی هنوز در سرور آماده نیستند.','Operations database tables are not ready.'),admin_mfa_required:t('تأیید دومرحله‌ای منقضی شده است؛ دوباره تأیید کنید.','Your second-factor verification expired. Verify again.'),invalid_mfa:t('کد تأیید معتبر نیست.','Invalid verification code.'),mfa_replayed:t('این کد قبلاً استفاده شده؛ کد جدید را وارد کنید.','This code was already used. Enter the next code.'),rate_limited:t('درخواست‌های زیاد؛ چند دقیقه بعد دوباره امتحان کنید.','Too many attempts. Try again in a few minutes.')})[error.message]||t('دریافت داده ممکن نشد. وضعیت ثبت‌شده تغییر نکرده است.','Data could not be loaded. Recorded status has not changed.');}
async function load(){const generation=++loadGeneration;try{notice(t('در حال بررسی دسترسی و شواهد سرور…','Checking access and server evidence…'));const requestedAt=Date.now();const session=await api('/session');if(generation!==loadGeneration)return;csrf=session.csrfToken;$('ops-mfa-form').hidden=!session.mfaRequired;if(session.mfaRequired){lock(t('کد دومرحله‌ای مدیر را وارد کنید.','Enter your administrator second-factor code.'));csrf=session.csrfToken;return;}const deadline=requestedAt+Math.max(0,Number(session.mfaExpiresIn)||0)*1000;const expired=()=>lock(t('تأیید مدیر منقضی شد؛ دوباره بررسی کنید.','Administrator verification expired. Check access again.'));clearTimeout(expiryTimer);if(Date.now()>=deadline){expired();return;}expiryTimer=setTimeout(expired,deadline-Date.now());const data=await api('');if(generation!==loadGeneration)return;if(Date.now()>=deadline){expired();return;}snapshot=data;actionRuns=Array.isArray(data.reporting?.actionExecution?.recentRuns)?data.reporting.actionExecution.recentRuns:[];$('ops-auth').hidden=true;$('ops-workspace').hidden=false;render();notice(t('داده از سرور دریافت شد؛ برآوردهای تاریخی از پیشرفت تأییدشده جدا هستند.','Server data loaded. Historical estimates are separate from verified progress.'));}catch(error){if(generation===loadGeneration)lock(errorMessage(error));}}
function progress(value){const bar=el('div',undefined,'ops-progress');const fill=el('span');fill.style.width=(value??0)+'%';bar.append(fill);bar.setAttribute('aria-label',t('پیشرفت اندازه‌گیری‌شده: ','Measured progress: ')+pct(value));return bar;}
function render(){const sum=snapshot.summary;$('ops-total').textContent=String(sum.total);$('ops-verified').textContent=String(sum.verified);$('ops-coverage').textContent=sum.measuredCoverage+'/36';$('ops-admin-score').textContent=pct(snapshot.dashboard.measuredProgress);$('ops-release').textContent=snapshot.releaseSha||t('ثبت نشده','Not recorded');$('ops-checked').textContent=date(snapshot.checkedAt);
 const select=$('ops-engine'),old=select.value;select.replaceChildren(el('option',t('همهٔ موتورها','All engines')));select.firstChild.value='';for(const engine of (snapshot.reporting?.engines||[...new Set(snapshot.reports.map(r=>r.engine))].sort())){const option=el('option',typeof engine==='string'?engine:engine.id+' · '+engineName(engine));option.value=typeof engine==='string'?engine:engine.id;select.append(option);}select.value=old;
 const queue=$('ops-queue');queue.replaceChildren();for(const r of snapshot.reports.filter(r=>!r.closed).sort((a,b)=>a.priority.localeCompare(b.priority)||(['OP-02','OP-36','OP-03','OP-01','OP-04','OP-05','OP-06','OP-07','OP-08','OP-10'].indexOf(a.id)+1||99)-(['OP-02','OP-36','OP-03','OP-01','OP-04','OP-05','OP-06','OP-07','OP-08','OP-10'].indexOf(b.id)+1||99)).slice(0,10)){const li=el('li');const button=el('button',r.priority+' · '+title(r));button.addEventListener('click',()=>show(r.id));li.append(button,el('small',' '+statuses[r.status]));queue.append(li);}
 const sources=$('ops-sources');sources.replaceChildren();for(const s of snapshot.sourceSections){const complete=s.operations.every(id=>snapshot.reports.find(r=>r.id===id)?.closed)&&(!s.includesAdmin||snapshot.dashboard.closed);const li=el('li',s.number+'. '+s.title+' · '+t(complete?'پوشش تأیید شده':'کارهای باز',complete?'Verified coverage':'Open work'));li.append(el('small',' '+s.operations.join(', ')));sources.append(li);}reportingRender();cards();if(selected)show(selected,false);
}
function cards(){if(!snapshot)return;const search=$('ops-search').value.trim().toLocaleLowerCase(),engine=$('ops-engine').value,priority=$('ops-priority').value;const box=$('ops-cards');box.replaceChildren();
 const filterActive=Boolean(search||engine||priority),visible=sectionsExpanded||filterActive;box.hidden=!visible;
 const toggle=$('ops-section-toggle');if(toggle){toggle.disabled=filterActive;toggle.setAttribute('aria-expanded',String(visible));toggle.textContent=filterActive?t('نتایج فیلتر نمایش داده می‌شوند','Filtered results are shown'):visible?t('بستن فهرست تفصیلی','Collapse detailed sections'):t('نمایش ۳۶ بخش تفصیلی','Show 36 detailed sections');}
const records=snapshot.reports.filter(r=>(!engine||reportOwner(r)===engine)&&(!priority||r.priority===priority)&&(!search||[r.id,r.title,r.titleFa,r.engine].join(' ').toLocaleLowerCase().includes(search)));
 for(const r of records){const card=el('article',undefined,'ops-card');card.append(el('small',r.id+' · '+reportOwner(r)+' · '+r.priority),el('h3',title(r)),el('span',statuses[r.status],'ops-badge'),el('p',t('اندازه‌گیری‌شده: ','Measured: ')+pct(r.measuredProgress)),progress(r.measuredProgress),el('small',t('برآورد تاریخی: ','Historical estimate: ')+pct(r.estimatedProgress)));const button=el('button',t('صفحهٔ موتور و گزارش','Engine page and report'));button.addEventListener('click',()=>show(r.id));card.append(button);box.append(card);}if(!records.length)box.append(el('p',t('موردی یافت نشد.','No matching sections.')));}
// Report-to-workspace links are navigation into existing owner-MFA panels,
// never action execution or a claim that a registered Action is implemented.
const operationalWorkspaceByReport=Object.freeze({
 'OP-07':'ops-commerce','OP-08':'ops-commerce','OP-09':'ops-commerce',
 'OP-10':'ops-commerce','OP-11':'ops-commerce','OP-22':'ops-commerce',
 'OP-23':'ops-commerce','OP-24':'ops-commerce',
 'OP-29':'jr-intelligence','OP-31':'ops-social','OP-33':'ops-organic-growth'
});
function openExistingOperationalWorkspace(id){
 const workspace=$('ops-workspace');
 if(!snapshot||workspace.hidden)return;
 const target=$(id);
 if(!target||!workspace.contains(target))return;
 let parent=target.parentElement?.closest('details');
 while(parent&&workspace.contains(parent)){parent.open=true;parent=parent.parentElement?.closest('details');}
 if(target.matches('details'))target.open=true;
 const focus=target.matches('details')?target.querySelector(':scope > summary'):
    target.querySelector(':scope > h2')||target;
 if(!focus)return;
 if(!focus.hasAttribute('tabindex'))focus.setAttribute('tabindex','-1');
 focus.focus({preventScroll:true});
 target.scrollIntoView({behavior:'auto',block:'start'});
}
function show(id,focus=true){if(!snapshot)return;const r=id==='ADM-01'?snapshot.dashboard:snapshot.reports.find(row=>row.id===id);if(!r)return;selected=id;const panel=$('ops-detail');panel.replaceChildren();panel.hidden=false;const header=el('div',undefined,'ops-title-row');header.append(el('h2',r.id+' · '+title(r)));const report=el('button',t('دریافت گزارش مکتوب','Download written report'));report.addEventListener('click',()=>download(r));header.append(report);
 const workspaceId=operationalWorkspaceByReport[r.id];
 if(workspaceId&&$(workspaceId)&&$('ops-workspace').contains($(workspaceId))){
  const jump=el('button',t('بازکردن بخش مدیریتی مرتبط','Open related admin workspace'));
  jump.type='button';jump.dataset.opsWorkspaceJump=workspaceId;
  jump.addEventListener('click',()=>openExistingOperationalWorkspace(workspaceId));
  header.append(jump);
 }
 panel.append(header,el('p',statuses[r.status]+' · '+pct(r.measuredProgress)),progress(r.measuredProgress),el('p',t('معیار پذیرش: ','Acceptance: ')+r.acceptance),el('p',t('شروط باز فعلی: ','Current open gates: ')+(r.openWork?.join('؛ ')||t('ندارد','None'))),el('p',t('مانع فعلی: ','Current blocker: ')+(r.currentBlocker||t('ثبت نشده؛ شروط و وابستگی‌ها را بررسی کنید.','No separate blocker recorded; inspect gates and dependencies.'))),el('p',t('وابستگی‌های باز: ','Open dependencies: ')+(r.openDependencies?.join(', ')||t('ندارد','None'))));
 const grid=el('div',undefined,'ops-gates');for(const gate of r.verifiedGates){const item=el('article',undefined,'ops-gate');item.append(el('h3',gate.label),el('p',gates[gate.state],gate.state==='pass'?'ops-pass':gate.state==='fail'?'ops-fail':''));if(gate.evidence){const e=gate.evidence;const safeUrl=safeEvidenceUrl(e.source_url);const link=el(safeUrl?'a':'span',e.test_name);if(safeUrl){link.href=safeUrl;link.target='_blank';link.rel='noopener noreferrer';}item.append(link,el('p',e.environment+' · '+date(e.checked_at)),el('small',t('اعتبار تا: ','Valid until: ')+date(e.expires_at)));}grid.append(item);}panel.append(grid);signals(panel,r);panel.append(el('h3',t('روند شواهد این نسخه','Evidence trend for this release')));trend(panel,r);
 panel.append(el('h3',t('تاریخچهٔ آزمون‌ها و خطاها','Test and error history')));const wrap=el('div',undefined,'ops-table-wrap'),table=el('table',undefined,'ops-table'),head=el('tr');for(const label of [t('زمان','Time'),t('شرط','Gate'),t('نتیجه','Result'),t('آزمون و منبع','Test and source')])head.append(el('th',label));table.append(head);const events=snapshot.history.filter(e=>e.section_id===r.id);for(const e of events){const row=el('tr');for(const txt of [date(e.checked_at),e.gate_id,gates[e.result],e.test_name])row.append(el('td',txt));table.append(row);}if(!events.length){const row=el('tr'),cell=el('td',t('هنوز شواهد واقعی ثبت نشده‌اند.','No actual evidence has been recorded.'));cell.colSpan=4;row.append(cell);table.append(row);}wrap.append(table);panel.append(wrap,el('p',t('آخرین بررسی: ','Last checked: ')+date(events.length?Math.max(...events.map(e=>Number(e.checked_at))):null)),el('details',undefined,'ops-muted'));
 const details=panel.lastChild;details.append(el('summary',t('ادعاهای گزارش تاریخی؛ تأیید عملیاتی نیستند','Historical report claims; operational verification pending')),el('p',t('برنامهٔ پایه: ','Baseline plan: ')+r.remaining),el('p',r.historicalClaims));if(focus){panel.tabIndex=-1;panel.focus();panel.scrollIntoView({behavior:'auto',block:'start'});} }
function signals(panel,r){if(!r.signals?.length)return;panel.append(el('h3',t('شاخص‌های مشاهده‌شدهٔ موتور','Observed engine signals')),el('p',t('آمادگی فنی و وضعیت تنظیمات، به‌تنهایی گواه دریافت ایمیل، پرداخت، تحویل یا تکمیل مرحله نیستند.','Runtime readiness and configuration alone do not prove email delivery, payment, fulfilment or section completion.')));const grid=el('div',undefined,'ops-gates ops-signals');for(const s of r.signals){const item=el('article',undefined,'ops-gate');item.append(el('h4',signalLabel(s)),el('p',signalValue(s)),el('small',s.source+' · '+date(s.checkedAt)),el('p',s.limitation),el('small',t('اعتبار مشاهده تا: ','Observation valid until: ')+date(s.expiresAt)+(s.expiresAt<=Date.now()/1000?' · '+gates.stale:'')));grid.append(item);}panel.append(grid);}
function trend(panel,r){const events=snapshot.history.filter(e=>e.section_id===r.id).sort((a,b)=>Number(a.sequence_id)-Number(b.sequence_id));if(!events.length){panel.append(el('p',t('پس از ثبت نخستین شاهد، روند نمایش داده می‌شود.','The trend appears after the first recorded evidence.')));return;}const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 600 160');svg.classList.add('ops-trend');svg.setAttribute('role','img');svg.setAttribute('aria-label',t('تعداد شروط موفق در تاریخچهٔ ثبت شواهد','Passed gates over recorded evidence history'));const current=new Map(),points=[];events.forEach((e,i)=>{current.set(e.gate_id,e.result);const score=[...current.values()].filter(x=>x==='pass').length/r.verifiedGates.length*100;points.push((20+i*560/Math.max(1,events.length-1))+','+(140-score*1.2));});const line=document.createElementNS(svg.namespaceURI,'polyline');line.setAttribute('points',points.join(' '));line.setAttribute('fill','none');line.setAttribute('stroke','#83dec3');line.setAttribute('stroke-width','3');svg.append(line);panel.append(svg,el('small',t('نمودار تاریخچهٔ نتیجهٔ شروط است؛ انقضا و وابستگی‌ها در درصد فعلی اعمال می‌شوند.','This chart shows recorded gate outcomes. Expiry and dependencies affect the current score.')));}
function download(record=null){if(!snapshot)return;const records=record?[record]:[snapshot.dashboard,...snapshot.reports];let text=t('گزارش مرکز مدیریت عملیات','Operations Control Center Report')+'\n'+date(snapshot.checkedAt)+'\nRelease: '+snapshot.releaseSha+'\n\n';for(const r of records){text+=r.id+' — '+title(r)+'\n'+statuses[r.status]+' | '+pct(r.measuredProgress)+'\n'+t('برآورد تاریخی: ','Historical estimate: ')+pct(r.estimatedProgress)+'\n'+t('معیار پذیرش: ','Acceptance: ')+r.acceptance+'\n'+t('شروط باز: ','Open gates: ')+(r.openWork?.join('; ')||t('ندارد','None'))+'\n'+t('وابستگی: ','Dependencies: ')+r.dependencies.join(', ')+'\n';for(const g of r.verifiedGates)text+=g.id+': '+gates[g.state]+(g.evidence?' | '+g.evidence.test_name+' | '+g.evidence.source_url+' | '+date(g.evidence.checked_at):'')+'\n';for(const s of r.signals||[])text+=signalLabel(s)+': '+signalValue(s)+' | '+s.source+' | '+date(s.checkedAt)+' | '+s.limitation+' | '+t('اعتبار تا: ','Valid until: ')+date(s.expiresAt)+(s.expiresAt<=Date.now()/1000?' | '+gates.stale:'')+'\n';text+='\n';}const url=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));const link=el('a');link.href=url;link.download='operations-'+(record?.id||'all')+'.txt';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
/* Insert inside the operations-control IIFE. Uses its authenticated snapshot and safe DOM helpers. */
let reportingView={level:'executive',engine:'ENG-01',action:'',facet:'A'};
const reportOwners=()=>snapshot?.reporting?.masterReport?.ownerByReportId||{};
const reportOwner=r=>reportOwners()[r.id]||r.engine;
const engineName=e=>en?e.canonicalName:e.displayNameFa;
function reportingRecords(){
 const model=snapshot?.reporting;if(!model)return [];
 if(reportingView.level==='engine'){const engine=model.engines.find(e=>e.id===reportingView.engine);return [...snapshot.reports,snapshot.dashboard].filter(r=>engine?.reportIds.includes(r.id));}
 if(reportingView.level==='action'){const action=model.actionReports.find(a=>a.id===reportingView.action);return [...snapshot.reports,snapshot.dashboard].filter(r=>action?.legacyReportIds.includes(r.id));}
 return snapshot.reports;
}
function reportingMetrics(panel,metrics){
 if(!metrics)return;const list=el('dl',undefined,'ops-report-metrics');
 for(const [label,value] of [[t('برآورد تاریخی','Historical estimate'),pct(metrics.estimatedCompletion)],[t('تکمیل اندازه‌گیری‌شده','Measured completion'),pct(metrics.measuredCompletion)],[t('پوشش شواهد معتبر','Current evidence coverage'),pct(metrics.verificationCoverage)],[t('گزارش‌های تأییدشده','Verified reports'),metrics.verifiedReports+'/'+metrics.totalReports],[t('آمادگی production','Production readiness'),metrics.productionReadiness.status],[t('آمادگی تجاری','Commercial readiness'),metrics.commercialReadiness?.status||t('تأیید نشده','Unverified')]])list.append(el('dt',label),el('dd',String(value)));
 panel.append(list,progress(metrics.measuredCompletion),el('p',t('امتیاز از همهٔ شروط لازم محاسبه می‌شود؛ فقط شواهد معتبر امتیاز دارند. نامشخص با صفر یکسان نیست. وابستگی‌های باز می‌توانند تکمیل را متوقف کنند.','The score uses every required acceptance gate. Only current evidence earns credit. Unknown differs from zero; open dependencies can prevent completion.')));
}
const runState={running:t('در حال اجرا','Running'),succeeded:t('خوانش انجام شد','Observation completed'),failed:t('اجرای ناموفق','Failed'),blocked:t('دادهٔ کافی در دسترس نیست','Insufficient current evidence'),interrupted:t('اجرا قطع شده؛ نیازمند بررسی','Interrupted; inspect required')};
function actionRecent(id){return actionRuns.filter(r=>r.actionId===id).slice(0,5);}
function actionRunHistory(host,runs){
 if(!runs.length){host.append(el('p',t('اجرای ثبت‌شده‌ای برای این محدوده وجود ندارد.','No server-recorded runs for this scope.')));return;}
 const list=el('ul',undefined,'ops-queue');
 for(const r of runs){const li=el('li');li.append(el('strong',r.actionId+' · '+(runState[r.status]||r.status)),el('small',' · '+date(r.createdAt)+' · '+(r.runId||'').slice(0,12)));
 const detail=r.result||{};
 if(detail.kind==='github_ci_audit'){
   li.append(el('p',t('وضعیت درخواست ممیزی GitHub: ','GitHub audit request: ')+(detail.dispatchState||'unconfirmed')+
     ' · '+t('شناسهٔ اجرای واقعی تا تأیید خارجی: ','Independently verified CI run ID: ')+
     String(detail.githubRunId||t('هنوز دریافت نشده','Not yet confirmed'))));
 }else li.append(el('p',t('سیگنال تازه: ','Fresh signals: ')+String(detail.freshSignalCount??0)+'/'+String(detail.expectedSignalCount??'?')+' · '+t('وضعیت مشاهده: ','Observation: ')+(detail.status||'unknown')));
 list.append(li);}host.append(list);
}
async function runReadonlyAction(actionId,button){
 if(!snapshot||!csrf||button.disabled)return;
 const generation=loadGeneration;
 if(typeof crypto==='undefined'||typeof crypto.getRandomValues!=='function'){notice(t('ایجاد شناسهٔ امن درخواست ممکن نیست.','A secure request ID could not be generated.'),true);return;}
 const bytes=new Uint8Array(16);crypto.getRandomValues(bytes);
 const requestKey=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
 button.disabled=true;notice(t('در حال اجرای مشاهدهٔ فقط‌خواندنی و ثبت شواهد…','Running the read-only observation and recording evidence…'));
 try{
  const response=await api('/action-runs',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify({actionId,requestKey})});
  if(generation!==loadGeneration||!snapshot)return;
  const run=response.run;
  if(run?.runId){actionRuns=[run,...actionRuns.filter(x=>x.runId!==run.runId)].slice(0,50);}
  notice(t('نتیجهٔ واقعی اجرا ثبت شد؛ موفقیت خوانش، پذیرش نهایی موتور نیست.','The real run result was recorded; a successful read is not engine acceptance.'));
  reportingRender();
  try{const history=await api('/action-runs');if(generation===loadGeneration&&snapshot){actionRuns=history.runs||[];reportingRender();}}catch(_){}
 }catch(e){
  if(generation!==loadGeneration)return;
  const message=({
   action_journal_schema_unavailable:t('جدول ثبت اجرای Action هنوز در نسخهٔ سرور فعال نیست.','The action journal has not been provisioned on this server release.'),
   action_executor_unavailable:t('این Action اجراکنندهٔ مجاز ندارد.','This action has no authorized executor.'),
   action_request_conflict:t('شناسهٔ درخواست قبلاً برای اقدام دیگری استفاده شده است.','Request ID already belongs to a different action.'),
   action_execution_unavailable:t('اجرای سروری تأیید نشد؛ تاریخچه را بررسی کنید.','Server execution could not be confirmed; inspect history.'),
   csrf_forbidden:t('نشست یا تأیید امنیتی منقضی شده است.','Session or CSRF proof has expired.')
  })[e.message]||errorMessage(e);
  notice(message,true);
 }finally{if(generation===loadGeneration&&button.isConnected)button.disabled=false;}
}


async function githubAuditDispatch(item,button){
 if(!snapshot||!csrf||button.disabled||!githubAuditState?.summary?.dispatchReady)return;
 const approval=t('فقط ممیزی رسمی و بدون انتشار اجرا شود؟ این درخواست از سهمیهٔ GitHub Actions استفاده می‌کند و هیچ تغییری را تأیید یا منتشر نمی‌کند.','Run this approved audit-only GitHub workflow? It consumes GitHub Actions minutes and does not publish or certify changes.');
 if(!window.confirm(approval))return;
 if(!crypto?.getRandomValues){notice(t('شناسهٔ امن درخواست موجود نیست.','Secure request ID unavailable.'),true);return;}
 const bytes=new Uint8Array(16);crypto.getRandomValues(bytes);
 const requestKey=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
 const generation=loadGeneration;button.disabled=true;
 try{
  const result=await api('/github-audits/dispatch',{
   method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},
   body:JSON.stringify({actionId:item.actionId,requestKey,approval:'APPROVE_READONLY_AUDIT'})});
  if(generation!==loadGeneration||!snapshot)return;
  githubAuditExpanded=true;
  if(result.run?.runId){
   const entry={actionId:item.actionId,requestRunId:result.run.runId,
      dispatchState:result.run.result?.dispatchState||'submission_unconfirmed',
      status:'awaiting_external_run_correlation',github:null};
   githubAuditState.ownerSubmissions=[entry,...(githubAuditState.ownerSubmissions||[]).filter(x=>x.requestRunId!==entry.requestRunId)].slice(0,30);
  }
  notice(t('درخواست ثبت شد؛ پذیرش GitHub به‌تنهایی موفقیت آزمون نیست. برای پیگیری، وضعیت رسمی را تازه‌سازی کنید.','Request logged. GitHub dispatch acknowledgement is not an audit result. Refresh official status to verify.'));
  reportingRender();
 }catch(e){
  if(generation!==loadGeneration)return;
  notice(({
    audit_dispatch_not_configured:t('دسترسی خصوصی Actions هنوز روی سرور فعال نیست.','Private Actions authorization is not configured.'),
    audit_owner_approval_required:t('این درخواست فقط برای مدیر ارشد مجاز است.','Only SUPER_ADMIN can approve this audit.'),
    audit_not_allowlisted:t('این گردش‌کار در فهرست امن ممیزی نیست.','This workflow is not audit-allowlisted.')
   })[e.message]||errorMessage(e),true);
 }finally{if(generation===loadGeneration&&button.isConnected)button.disabled=false;}
}

async function githubAuditReconcile(button){
 if(!snapshot||!csrf||button.disabled||!githubAuditState?.summary?.canReconcile)return;
 const generation=loadGeneration;button.disabled=true;
 try{
  const result=await api('/github-audits/reconcile',{method:'POST',
    headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:'{}'});
  if(generation!==loadGeneration||!snapshot)return;
  githubAuditState=result.auditSnapshot||githubAuditState;
  actionRuns=Array.isArray(result.runs)?result.runs:actionRuns;
  githubAuditExpanded=true;
  notice(t('تنها نتایج دارای شناسه و تطبیق معتبر GitHub در سوابق ثبت شدند.','Only independently correlated GitHub results were recorded in the existing action journal.'));
  reportingRender();
 }catch(e){
  if(generation!==loadGeneration)return;
  notice(errorMessage(e),true);
 }finally{if(generation===loadGeneration&&button.isConnected)button.disabled=false;}
}

function collectionControlsRender(parent){
 const box=el('details',undefined,'ops-collection-settings');box.open=collectionExpanded;
 box.addEventListener('toggle',()=>{collectionExpanded=box.open;});
 box.append(el('summary',t('زمان‌بندی و کنترل منابع ۱۳ موتور','Schedule and control 13-engine data collection')));
 box.append(el('p',t('نمایش داشبورد فقط از دیتابیس مادر می‌خواند؛ منابع بیرونی فقط طبق زمان‌بندی یا درخواست صریح مدیر واکشی می‌شوند.','The dashboard reads only private database snapshots; external providers run only on a schedule or on explicit administrator request.')));
 const fetch=el('button',t('نمایش تنظیمات و آخرین وضعیت','Load controls and current status'));fetch.type='button';
 fetch.addEventListener('click',async()=>{
  fetch.disabled=true;try{collectionState=await api('/collection-settings');collectionExpanded=true;reportingRender();}
  catch(error){notice(errorMessage(error),true);}finally{fetch.disabled=false;}
 });box.append(fetch);
 if(collectionState?.schema==='operations-collection-controls-v1'){
  box.append(el('p',t('منطقهٔ زمانی اجرا: تهران. فعال بودن تنظیم بدون نصب Cron در برتینا، به معنی اجرای خودکار نیست.','Schedule timezone: Tehran. Enabled settings do not run unattended until the Bertina cron job is installed.')));
  const manual=el('button',t('تازه‌سازی فوری همهٔ منابع فعال','Refresh all enabled sources now'));manual.type='button';
  manual.addEventListener('click',async()=>{
   manual.disabled=true;try{
    const response=await api('/github-audits/refresh',{method:'POST',
     headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},
     body:JSON.stringify({scope:'all'})});
    githubAuditState=response.auditSnapshot;
    collectionState=githubAuditState.collection;
    collectionExpanded=true;githubAuditExpanded=true;
    reportingRender();notice(t('تعداد منابع واکشی‌شده: ','Sources requested: ')+response.refresh.attempted+' · '+t('ذخیره‌شده: ','Saved: ')+response.refresh.saved);
   }catch(error){notice(errorMessage(error),true);}finally{manual.disabled=false;}
  });box.append(manual);
  const catalogue=el('div',undefined,'ops-collector-list');
  for(const scope of collectionState.rows){
   const line=el('div',undefined,'ops-collector-item');
   line.dataset.collectorScope=scope.id;
   const name=el('strong',scope.id+(scope.type==='engine'?' · '+t('موتور','Engine'):' · '+scope.engineId));
   line.append(name);
   const state=scope.type==='source'
     ? (scope.cacheState==='fresh'?t('ذخیرهٔ معتبر','Fresh cache'):scope.cacheState==='stale'?t('قدیمی','Stale'):scope.cacheState==='disabled'?t('غیرفعال','Disabled'):t('بدون داده','No cache'))
     : (scope.connected?t('قرارداد منبع تعریف شده؛ اتصال زنده تأیید نشده','Source contract defined; live connection unverified'):t('گردآورندهٔ مستقلی هنوز ندارد','No collector implemented'));
   line.append(el('small',state));
   const enabled=el('input');enabled.type='checkbox';enabled.checked=scope.enabled;
   const label=el('label',t('فعال','Enabled'));label.prepend(enabled);line.append(label);
   const cadence=el('select');
   for(const [value,fa,enLabel] of [['manual','فقط دستی','Manual'],['hourly','ساعتی','Hourly'],['daily','روزانه','Daily'],['live','رویداد لحظه‌ای داخلی','Local event-driven']]){
    if(scope.type==='source'&&value==='live')continue;
    const option=el('option',t(fa,enLabel));option.value=value;option.selected=scope.cadence===value;cadence.append(option);
   }line.append(cadence);
   const clock=el('input');clock.type='time';
   const minute=Number(scope.clockMinutes)||0;
   clock.value=String(Math.floor(minute/60)).padStart(2,'0')+':'+String(minute%60).padStart(2,'0');
   clock.title=t('ساعت محلی تهران','Tehran local schedule time');line.append(clock);
   const save=el('button',t('ذخیره','Save'));save.type='button';save.disabled=collectionState.canManage===false;
   save.addEventListener('click',async()=>{
    const parts=clock.value.split(':').map(Number),minutes=parts[0]*60+parts[1];
    save.disabled=true;try{
     collectionState=await api('/collection-settings',{method:'POST',
      headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},
      body:JSON.stringify({key:scope.id,enabled:enabled.checked,cadence:cadence.value,clockMinutes:minutes})});
     collectionExpanded=true;reportingRender();
    }catch(error){notice(errorMessage(error),true);}finally{save.disabled=false;}
   });
   line.append(save);
   if(scope.lastFetchedAt)line.append(el('small',t('آخرین واکشی: ','Last collected: ')+date(scope.lastFetchedAt)));
   catalogue.append(line);
  }box.append(catalogue);
 }
 parent.append(box);
}

function githubAuditRender(host){
 const section=el('details',undefined,'ops-github-audits');section.open=githubAuditExpanded;
 section.addEventListener('toggle',()=>{githubAuditExpanded=section.open;});
 section.append(el('summary',t('پایش آزمون‌های واقعی GitHub (فقط‌خواندنی)','Live GitHub audit runs (read-only)')));
 const info=el('p',t('نتایج آزمون‌های اصلی، لینک اجرای واقعی و نسخهٔ آزمایش‌شده؛ این گزارش اجازهٔ انتشار یا تأیید نهایی اقدام را صادر نمی‌کند.','Real audit run links, status and tested source SHA. This does not dispatch releases or certify action completion.'));
 section.append(info);
 collectionControlsRender(host);
 section.append(el('p',t('دکمهٔ گزارش فقط آخرین دادهٔ ذخیره‌شده را نمایش می‌دهد و به GitHub درخواست جدید نمی‌فرستد.','Report view displays saved evidence only and makes no new GitHub request.')));
 const button=el('button',t('دریافت آخرین وضعیت رسمی GitHub','Fetch verified GitHub workflow status'));button.type='button';
 button.addEventListener('click',async()=>{
  button.disabled=true;
  const generation=loadGeneration;
  try{
   const response=await api('/github-audits');
   if(generation!==loadGeneration||!snapshot)return;
   githubAuditExpanded=true;githubAuditState=response;reportingRender();
  }catch(error){
   if(generation!==loadGeneration)return;
   githubAuditExpanded=true;githubAuditState={audits:[],summary:null,error:true};reportingRender();
  }finally{if(generation===loadGeneration&&button.isConnected)button.disabled=false;}
 });section.append(button);
 if(githubAuditState){
  if(githubAuditState.error)section.append(el('p',t('دسترسی به گزارش رسمی GitHub برقرار نبود؛ نتیجه‌ای جعل نشد.','GitHub observations unavailable; no results inferred.')));
  else{

   // OP-02 and OP-36: observed public policy metadata, not completion gates.
   const governance=githubAuditState.governance;
   if(governance?.schema==='operations-github-governance-v1'){
    const policy=el('section',undefined,'ops-branch-governance');
    policy.append(el('h4',t('OP-02 · حاکمیت شاخهٔ اصلی و OP-36 · وضعیت بازگشت','OP-02 · Branch governance and OP-36 · Rollback readiness')));
    const fmt=v=>v===true?t('بله','Yes'):v===false?t('خیر','No'):t('نامشخص','Unknown');
    policy.append(el('p',t('شاخهٔ اصلی مورد انتظار: ','Expected production branch: ')+governance.canonicalBranch));
    policy.append(el('p',t('شاخهٔ پیش‌فرض GitHub: ','GitHub default branch: ')+(governance.defaultBranch||t('نامشخص','Unknown'))));
    policy.append(el('p',t('محافظت رسمی شاخه: ','Branch protection: ')+fmt(governance.canonicalBranchProtected)));
    policy.append(el('p',t('انطباق شاخهٔ پیش‌فرض: ','Default branch matches: ')+fmt(governance.defaultMatchesCanonical)));
    policy.append(el('p',governance.canonicalBranchProtected===false
     ?t('اقدام لازم: محافظت از شاخه را در تنظیمات GitHub فعال و قواعد آن را مستقلاً بررسی کنید.','Action required: enable branch protection in GitHub and independently inspect its rules.')
     :t('پوشش دقیق Rulesetها و مجوزهای انتشار هنوز مستقلاً تأیید نشده است.','Ruleset scope and deployment permissions are not independently certified.')));
    policy.append(el('p',t('آزمایش مستقل بازیابی بکاپ و بازگشت نسخه (OP-36): تأییدنشده','Independent backup restoration and rollback drill (OP-36): unverified')));

    const restore=governance.restoreReadiness;
    if(restore?.scope==='isolated_recovery_tooling_ci'){
     policy.append(el('h4',t('OP-36 · آزمون ابزار بازیابی در GitHub','OP-36 · GitHub recovery-tool CI')));
     const state={
      isolated_ci_pass:t('آزمون ابزار بازیابی موفق؛ بازیابی واقعی تأییدنشده','Recovery-tool CI passed; real restore unverified'),
      isolated_ci_not_passed:t('آزمون ابزار بازیابی موفق نبوده است','Recovery-tool CI did not pass'),
      pending:t('آزمون ابزار بازیابی هنوز در جریان است','Recovery-tool CI is pending'),
      stale:t('آخرین آزمون ابزار بازیابی قدیمی است','Recovery-tool CI observation is stale'),
      unavailable:t('نتیجهٔ معتبر GitHub در دسترس نیست','Verified GitHub recovery CI unavailable')
     }[restore.status]||t('نامشخص','Unknown');
     policy.append(el('p',state));
     if(restore.sourceSha)policy.append(el('small',t('نسخهٔ آزمون‌شده: ','Tested SHA: ')+restore.sourceSha.slice(0,12)));
     if(restore.createdAt)policy.append(el('small',t('تاریخ اجرا: ','Run date: ')+restore.createdAt));
     if(/^https:\/\/github\.com\/drrezazadeh65\/drjavadrezazadeh\.com\/actions\/runs\/[0-9]+$/.test(restore.url||'')){
      const ciLink=el('a',t('مشاهدهٔ گزارش آزمون بازیابی','View official recovery CI result'));
      ciLink.href=restore.url;ciLink.target='_blank';ciLink.rel='noopener noreferrer';policy.append(ciLink);
     }
     policy.append(el('p',t('موفقیت CI به معنی وجود بکاپ واقعی، بازیابی مستقل یا آزمایش بازگشت نسخهٔ زنده نیست.','CI success cannot certify an actual backup, independent restoration or live production rollback.')));
    }


    const releaseTrace=governance.releaseTrace;
    if(releaseTrace?.schema==='operations-github-release-trace-v1'){
     policy.append(el('h4',t('OP-36 · تطبیق انتشار و پذیرش همان نسخه','OP-36 · Matched release and post-release acceptance')));
     const releaseLabel={
      release_ci_accepted:t('انتشار و پذیرش مستقل همان نسخه موفق بوده‌اند','Same-release deployment and independent acceptance passed'),
      acceptance_not_observed:t('سند پذیرش همین انتشار هنوز مشاهده نشده است','Post-release acceptance not observed for this deployment'),
      acceptance_pending:t('پذیرش مستقل این نسخه در جریان است','Independent acceptance is pending'),
      acceptance_not_successful:t('پذیرش مستقل این نسخه موفق نبوده است','Independent acceptance did not pass'),
      deploy_pending:t('انتشار نسخهٔ جاری در جریان است','Current release deployment pending'),
      deploy_not_successful:t('انتشار نسخهٔ جاری موفق نبوده است','Current release deployment did not pass'),
      deploy_run_not_observed:t('اجرای انتشار نسخهٔ جاری در تاریخچهٔ محدود GitHub پیدا نشد','Current-release deployment not observed in limited GitHub history'),
      server_release_missing:t('شناسهٔ نسخهٔ معتبر در سرور موجود نیست','Valid server release identity missing'),
      unavailable:t('شواهد رسمی انتشار در دسترس نیست','Verified release-run history unavailable')
     }[releaseTrace.status]||t('نامشخص','Unknown');
     policy.append(el('p',releaseLabel));
     if(/^[a-f0-9]{40}$/.test(releaseTrace.releaseSha||''))policy.append(el('small',t('نسخهٔ ثبت‌شده در سرور: ','Server release: ')+releaseTrace.releaseSha.slice(0,12)));
     for(const [kind,fa,enLabel] of [['deploy','گزارش انتشار GitHub','GitHub deploy run'],['acceptance','گزارش پذیرش مستقل','Independent acceptance run']]){
      const item=releaseTrace[kind];
      if(!item||!/^https:\/\/github\.com\/drrezazadeh65\/drjavadrezazadeh\.com\/actions\/runs\/[0-9]+$/.test(item.url||''))continue;
      const link=el('a',t(fa,enLabel));link.href=item.url;link.target='_blank';link.rel='noopener noreferrer';
      policy.append(el('p',item.status+' · '+(item.conclusion||t('در انتظار','Pending'))+' · '+(item.createdAt||'')),link);
     }
     policy.append(el('p',t('تأیید انتشار، جایگزین آزمون بازگشت نسخه و بازیابی بکاپ نیست.','A certified deployment is not evidence of production rollback or backup restoration.')));
    }
    const manage=el('a',t('تنظیمات محافظت از شاخه در GitHub','GitHub branch-protection settings'));
    manage.href='https://github.com/drrezazadeh65/drjavadrezazadeh.com/settings/branches';
    manage.target='_blank';manage.rel='noopener noreferrer';policy.append(manage);section.append(policy);
   }
   section.append(el('p',t('گردش‌کارهای مشاهده‌شده: ','Workflows observed: ')+
    githubAuditState.summary?.observableWorkflows+'/'+githubAuditState.summary?.registeredAllowlistedWorkflows));
   section.append(el('p',githubAuditState.summary?.dispatchReady
    ?t('اجرای ممیزی فقط پس از تأیید مدیر ارشد فعال است؛ نتیجه را جداگانه از GitHub کنترل کنید.','Audits require explicit SUPER_ADMIN approval; verify the independent CI result separately.')
    :t('اتصال مجاز اجرای ممیزی در تنظیمات خصوصی سرور تأیید نشده است. مشاهدهٔ گزارش‌ها همچنان ممکن است.','Authorized dispatch has not been verified in private host configuration. Read-only CI reports remain available.')));
   const list=el('ul',undefined,'ops-queue');
   for(const item of githubAuditState.audits||[]){
    const li=el('li');li.append(el('strong',(en?item.labelEn:item.labelFa)+' · '+item.actionId),
     el('p',t('دسترسی به منبع: ','Source status: ')+item.status));
    for(const run of (item.runs||[]).slice(0,2)){
     const p=el('p',run.status+' · '+(run.conclusion||t('در انتظار نتیجه','No conclusion yet'))+' · '+(run.sourceSha||'').slice(0,12)+' · '+(run.createdAt||''));
     if(/^https:\/\/github\.com\/drrezazadeh65\/drjavadrezazadeh\.com\/actions\/runs\/[0-9]+$/.test(run.url||'')){
      const link=el('a',t('مشاهده گزارش معتبر','View actual CI run'));link.href=run.url;link.target='_blank';link.rel='noopener noreferrer';p.append(' ',link);
     }
     li.append(p);
    }
    if(githubAuditState.summary?.dispatchReady){
      const trigger=el('button',t('درخواست اجرای ممیزی بدون انتشار','Request audit-only workflow'));
      trigger.type='button';trigger.addEventListener('click',()=>githubAuditDispatch(item,trigger));li.append(trigger);
    }
    list.append(li);
   }section.append(list);
   if(Array.isArray(githubAuditState.ownerSubmissions) && githubAuditState.ownerSubmissions.length){
     if(githubAuditState.summary?.canReconcile){
       const reconcile=el('button',t('راستی‌آزمایی و ثبت نتیجهٔ GitHub','Verify and record provider run result'));
       reconcile.type='button';reconcile.addEventListener('click',()=>githubAuditReconcile(reconcile));
       section.append(reconcile);
     }
     section.append(el('h4',t('درخواست‌های دارای شناسهٔ پیگیری','Owner-approved audit request history')));
     const history=el('ul',undefined,'ops-queue');
     for(const item of githubAuditState.ownerSubmissions.slice(0,10)){
       const li=el('li',item.actionId+' · '+item.status+' · '+(item.dispatchState||''));
       if(item.github){
         li.append(el('p',item.github.status+' · '+(item.github.conclusion||t('در انتظار','Pending'))+' · '+(item.github.sourceSha||'').slice(0,12)));
         if(/^https:\/\/github\.com\/drrezazadeh65\/drjavadrezazadeh\.com\/actions\/runs\/[0-9]+$/.test(item.github.url||'')){
           const link=el('a',t('گزارش رسمی این درخواست','Official request result'));link.href=item.github.url;link.target='_blank';link.rel='noopener noreferrer';li.append(link);
         }
       }history.append(li);
     }section.append(history);
   }
  }
 }
 host.append(section);
}

let masterConsoleExpanded=false;
/**
 * Engine command surface inside the EXISTING authenticated ENG-13 controller.
 * An eligible command uses the already-audited action-runs endpoint; every
 * unsupported command remains explicitly unavailable, never simulated.
 */
function renderMasterEngineConsole(host,model){
 const engines=Array.isArray(model.engines)?model.engines:[];
 const actions=Array.isArray(model.actionReports)?model.actionReports:[];
 const providers=Array.isArray(model.providerInventory?.providers)?model.providerInventory.providers:[];
 const readOnly=action=>action?.supportedExecutor?.type==='readonly_snapshot'
   &&action.supportedExecutor.writes===false;
 const supported=actions.filter(readOnly);
 const wrap=el('details',undefined,'ops-panel');
 wrap.id='ops-master-engine-control';
 wrap.open=masterConsoleExpanded;
 wrap.addEventListener('toggle',()=>{masterConsoleExpanded=wrap.open;});
 wrap.append(el('summary',t('فرماندهی ۱۳ موتور و پوشش واقعی اقدام‌ها',
   'Master control: 13 engines and verified action coverage')));
 const summary=el('p',t('موتورها: ','Engines: ')+engines.length+
   ' · '+t('اقدام‌های تعریف‌شده: ','Defined actions: ')+actions.length+
   ' · '+t('مشاهده‌های قابل اجرا: ','Runnable observations: ')+supported.length+
   ' · '+t('اقدام‌های بدون مجری عملیاتی: ','Without operational executor: ')+(actions.length-supported.length));
 wrap.append(summary);
 const references=el('p',t('منابع ثبت‌شده: ','Catalogued providers: ')+
   (model.providerInventory?.status==='catalogue_only'?providers.length:t('نامشخص','Unknown'))+
   ' · '+t('اتصال خارجی تأییدشده: ','Verified provider connections: ')+
   (model.providerInventory?.status==='catalogue_only'?'0':t('نامشخص','Unknown')));
 wrap.append(references,el('p',t(
   'این وضعیت از شواهد خصوصی سرور محاسبه شده است؛ وجود کارت، اسکریپت یا منبع خارجی به معنای اجرای موفق یا اتصال زنده نیست.',
   'This view uses private server records. A card, script or provider listing does not prove a live connection or successful execution.')));
 const grid=el('div',undefined,'ops-grid');
 for(const engine of engines){
   const card=el('article',undefined,'ops-card');
   const owned=actions.filter(a=>a.responsibleEngine===engine.id);
   const executable=owned.filter(readOnly);
   const candidateCount=providers.filter(p=>p.engineId===engine.id).length;
   card.append(el('h3',engine.id+' · '+engineName(engine)),
     el('p',t('گزارش تأییدشده: ','Verified reports: ')+
       (engine.completedReportIds?.length??0)+' / '+
       ((engine.completedReportIds?.length??0)+(engine.pendingReportIds?.length??0))),
     el('small',t('اقدام‌های دارای مجری: ','Executable observations: ')+
       executable.length+' / '+owned.length),
     el('small',t('منابع مرجع خارجی: ','External references: ')+
       candidateCount+' · '+t('اتصالات زنده تأییدنشده','No verified live connections')));
   const open=el('button',t('گزارش این موتور','Open engine report'));open.type='button';
   open.addEventListener('click',()=>{
     reportingView.level='engine';reportingView.engine=engine.id;
     reportingRender();
     $('ops-reporting')?.scrollIntoView({block:'start'});
   });card.append(open);
   const policy=collectionState?.rows?.find(r=>r.type==='engine'&&r.id===engine.id);
   card.append(el('small',policy
     ?t('گردآوری: ','Collection: ')+(policy.enabled
        ?t('طبق تنظیمات فعال','Policy enabled'):t('متوقف','Disabled'))
     :t('وضعیت گردآوری هنوز خوانده نشده است','Collection policy not loaded')));
   const configure=el('button',t('تنظیم گردآوری این موتور','Manage this engine collection'));
   configure.type='button';
   configure.addEventListener('click',async()=>{
     const generation=loadGeneration;configure.disabled=true;
     try{
       collectionState=await api('/collection-settings');
       if(generation!==loadGeneration||!snapshot)return;
       collectionExpanded=true;reportingRender();
       const row=[...document.querySelectorAll('[data-collector-scope]')]
         .find(element=>element.dataset.collectorScope===engine.id);
       if(row){row.scrollIntoView({block:'center'});row.querySelector('input')?.focus();}
       else $('ops-reporting')?.scrollIntoView({block:'start'});
     }catch(error){if(generation===loadGeneration)notice(errorMessage(error),true);}
     finally{if(configure.isConnected)configure.disabled=false;}
   });card.append(configure);
   if(candidateCount){
     const resources=el('button',t('منابع خارجی این موتور','External references for this engine'));
     resources.type='button';
     resources.addEventListener('click',()=>{
       const panel=$('ops-free-resources');
       if(!panel)return;
       panel.open=true;
       document.dispatchEvent(new CustomEvent('jr:admin-provider-engine',
         {detail:{engineId:engine.id}}));
       panel.scrollIntoView({block:'start'});
     });
     card.append(resources);
   }
   if(executable.length){
     const controls=el('div',undefined,'ops-toolbar');
     for(const action of executable){
       const button=el('button',t('مشاهده: ','Observe: ')+action.id);button.type='button';
       button.setAttribute('title',en?action.canonicalName:action.displayNameFa);
       button.addEventListener('click',()=>runReadonlyAction(action.id,button));
       controls.append(button);
     }
     card.append(controls);
   }else card.append(el('small',t(
     'اجرای خودکار این موتور هنوز مجری مجاز ندارد؛ گزارش و شواهد آن قابل مشاهده‌اند.',
     'No authorized automatic executor for this engine yet; its reporting remains accessible.')));
   if(owned.length){
     const actionList=el('details');
     actionList.append(el('summary',t('فهرست اقدامات و وضعیت اجرا',
       'Registered actions and execution availability')));
     const ul=el('ul',undefined,'ops-queue');
     for(const action of owned){
       const li=el('li');
       const btn=el('button',action.id+' · '+(en?action.canonicalName:action.displayNameFa));
       btn.type='button';
       btn.addEventListener('click',()=>{
         reportingView.level='action';reportingView.action=action.id;
         reportingRender();
         $('ops-reporting')?.scrollIntoView({block:'start'});
       });
       li.append(btn,el('small',readOnly(action)
         ?t(' · مشاهده امن قابل اجرا',' · Secure observation available')
         :t(' · مجری عملیاتی تأییدنشده',' · No verified executor')));
       ul.append(li);
     }
     actionList.append(ul);card.append(actionList);
   }
   grid.append(card);
 }
 wrap.append(grid);host.append(wrap);
}
function reportingRender(){
 const model=snapshot?.reporting;if(!model)return;
 let host=$('ops-reporting');if(!host){host=el('section',undefined,'ops-panel');host.id='ops-reporting';host.setAttribute('aria-label',t('گزارش‌های سیزده موتور','Thirteen-engine reporting'));$('ops-workspace').insertBefore(host,$('ops-cards'));}
 host.replaceChildren();host.append(el('h2',t('۱۳ موتور؛ یک مرکز مدیریت','13 engines, one administrative center')));
 const enabledActions=model.actionReports.filter(a=>a.supportedExecutor?.type==='readonly_snapshot'&&a.supportedExecutor?.writes===false).length;host.append(el('p',t('اقدام‌های ثبت‌شده: ','Registered actions: ')+model.actionReports.length+' · '+t('قرارداد فقط‌خواندنی فعال: ','Read-only executors: ')+enabledActions+' · '+t('فاقد قرارداد اجرایی: ','Without executor: ')+(model.actionReports.length-enabledActions)));
 renderMasterEngineConsole(host,model);

 // Four current-release acceptance gates per report; never conflate absence of evidence with failure.
 const coverage=snapshot.summary?.gateCoverage;
 if(coverage&&['code','tests','production','evidence'].every(id=>coverage[id])){
  const matrix=el('details',undefined,'ops-evidence-matrix');
  matrix.append(el('summary',t('ماتریس شواهد ۳۶ گزارش (۱۴۴ شرط)','36-report evidence matrix (144 gates)')),
   el('p',t('شمارش صرفاً از شواهد معتبر نسخهٔ فعلی است؛ نامشخص و منقضی به معنای شکست قطعی نیستند.','Counts use current-release evidence; unknown and expired are not proven failures.')));
  const tiles=el('div',undefined,'ops-gates');
  for(const [id,fa,label] of [['code','کد','Code'],['tests','آزمون‌ها','Tests'],['production','محیط عملیاتی','Production'],['evidence','شواهد تکمیلی','Evidence']]){
   const counts=coverage[id],tile=el('article',undefined,'ops-gate');
   tile.append(el('h3',t(fa,label)),el('p',t('موفق: ','Pass: ')+Number(counts.pass||0)+' / 36'),
    el('small',t('ناموفق: ','Fail: ')+Number(counts.fail||0)+' · '+t('مسدود: ','Blocked: ')+Number(counts.blocked||0)),
    el('small',t('منقضی: ','Stale: ')+Number(counts.stale||0)+' · '+t('نامشخص: ','Unknown: ')+Number(counts.unknown||0)));
   tiles.append(tile);
  }
  matrix.append(tiles);host.append(matrix);
 }
 // An inventory for the 45 non-executable contracts, not a shortcut around manual approval.
 const backlog=model.actionReports.filter(a=>!a.supportedExecutor);
 if(backlog.length){
  const triage=el('details',undefined,'ops-executor-backlog');
  triage.append(el('summary',t('صف اقدامات فاقد اجراکننده: ','Actions awaiting executors: ')+backlog.length),
   el('p',t('این موارد صرفاً برای بررسی اولویت و قراردادهای اجرا فهرست شده‌اند؛ انتخاب آن‌ها هیچ عملیات تولیدی را اجرا نمی‌کند.','This is a planning queue only. Selecting an action does not execute production operations.')));
  const riskGroups=[
   [t('نیازمند تأیید مستقل','Independent approval required'),backlog.filter(a=>a.executionType==='approval-required')],
   [t('بحرانی، اجرای دستی','Critical manual'),backlog.filter(a=>a.executionType!=='approval-required'&&a.riskCategory==='CRITICAL')],
   [t('ریسک بالا، اجرای دستی','High-risk manual'),backlog.filter(a=>a.executionType!=='approval-required'&&a.riskCategory!=='CRITICAL')]
  ];
  for(const [label,items] of riskGroups){
   if(!items.length)continue;
   const section=el('section',undefined,'ops-backlog-group'),list=el('ol');
   section.append(el('h3',label+' · '+items.length));
   for(const action of items){
    const li=el('li'),button=el('button',action.id+' · '+(en?action.canonicalName:action.displayNameFa));
    button.type='button';button.addEventListener('click',()=>{reportingView.level='action';reportingView.action=action.id;reportingRender();});
    li.append(button);list.append(li);
   }
   section.append(list);triage.append(section);
  }
  host.append(triage);
 }

 // Derived from live, release-scoped server evidence; visible only inside MFA workspace.
 const path=model.criticalPath;
 if(path?.schema==='operations-critical-path-v1'){
  const panel=el('details',undefined,'ops-critical-path');
  panel.append(el('summary',t('مسیر بحرانی رفع موانع ۳۶ گزارش','Critical path for 36 operational reports')),
   el('p',t('گزارش‌های باز: ','Open reports: ')+path.totalOpen+' · '+t('بدون وابستگی باز: ','Without open dependencies: ')+path.withoutOpenDependencies+' · '+t('منتظر وابستگی: ','Waiting for dependencies: ')+path.waitingOnDependencies),
   el('p',t('معیارهای نامشخص: ','Unknown gates: ')+path.unknownGates+' · '+t('شواهد منقضی: ','Stale gates: ')+path.staleGates+' · '+t('ناموفق: ','Failed gates: ')+path.failedGates));
  panel.append(el('p',t('رفع وابستگی به معنی تأیید آزمون، مجوز اجرا یا آمادگی محیط عملیاتی نیست.','Clearing dependencies does not certify testing, authorize execution or prove production readiness.')));
  const list=el('ol',undefined,'ops-critical-list');
  for(const item of path.items){
   const li=el('li'),btn=el('button',item.id+' · '+(en?item.title:item.titleFa));
   btn.type='button';btn.addEventListener('click',()=>show(item.id));
   li.append(btn,el('small',' · '+item.priority+' · '+t('گزارش‌های وابسته: ','Downstream reports: ')+item.downstreamOpenReports));
   li.append(el('small',(item.openDependencies.length?t('منتظر: ','Waiting for: ')+item.openDependencies.join(', '):t('وابستگی باز ندارد','No open dependencies'))+' · '+t('معیار نامشخص: ','Unknown gates: ')+item.gateStates.unknown));
   list.append(li);
  }
  panel.append(list);host.append(panel);
 }
 githubAuditRender(host);
 const nav=el('nav',undefined,'ops-toolbar');nav.setAttribute('aria-label',t('موتورهای مدیریتی','Administrative engines'));
 for(const engine of model.engines){const button=el('button',engine.id+' · '+engineName(engine));button.type='button';button.setAttribute('aria-pressed',String(reportingView.level==='engine'&&reportingView.engine===engine.id));button.addEventListener('click',()=>{reportingView.level='engine';reportingView.engine=engine.id;reportingRender();});nav.append(button);}host.append(nav);
 const tools=el('div',undefined,'ops-toolbar'),level=el('select');level.id='ops-report-level';level.setAttribute('aria-label',t('سطح گزارش','Report level'));
 for(const [value,label] of [['executive',t('۱: نمای مدیریتی','1: Executive overview')],['engine',t('۲: گزارش موتور','2: Engine report')],['action',t('۳: گزارش اقدام','3: Action report')],['master',t('۴: گزارش جامع ۳۶بخشی','4: 36-report master')]]){const option=el('option',label);option.value=value;level.append(option);}level.value=reportingView.level;level.addEventListener('change',()=>{reportingView.level=level.value;reportingRender();});tools.append(level);
 if(reportingView.level==='engine'){const pick=el('select');pick.setAttribute('aria-label',t('انتخاب موتور','Select engine'));for(const e of model.engines){const o=el('option',e.id+' · '+engineName(e));o.value=e.id;pick.append(o);}pick.value=reportingView.engine;pick.addEventListener('change',()=>{reportingView.engine=pick.value;reportingRender();});tools.append(pick);}
 if(reportingView.level==='action'){const pick=el('select');pick.setAttribute('aria-label',t('انتخاب اقدام ثابت','Select permanent action'));for(const a of model.actionReports){const o=el('option',a.id+' · '+(en?a.canonicalName:a.displayNameFa));o.value=a.id;pick.append(o);}if(!model.actionReports.some(a=>a.id===reportingView.action))reportingView.action=model.actionReports[0]?.id||'';pick.value=reportingView.action;pick.addEventListener('change',()=>{reportingView.action=pick.value;reportingRender();});tools.append(pick);}
 for(const format of ['txt','csv','json']){const button=el('button',t('دریافت ','Download ')+format.toUpperCase());button.type='button';button.addEventListener('click',()=>reportingDownload(format));tools.append(button);}const print=el('button',t('چاپ / ذخیرهٔ PDF','Print / save PDF'));print.type='button';print.addEventListener('click',()=>window.print());tools.append(print);host.append(tools);
 if(reportingView.level==='action'){
  const action=model.actionReports.find(a=>a.id===reportingView.action);if(!action)return;host.append(el('h3',action.id+' · '+(en?action.canonicalName:action.displayNameFa)),el('p',action.description),el('p',t('وضعیت خود اقدام: ','Action status: ')+(statuses[action.currentStatus]||action.currentStatus)),el('p',t('تکمیل خود اقدام: ','Action completion: ')+pct(action.measuredProgress)),el('p',action.completionClaim),el('p',t('مجوز لازم: ','Required authorization: ')+action.authorizationLevel),el('p',t('نوع اجرا: ','Execution type: ')+action.executionType));
  const ready=action.supportedExecutor?.type==='readonly_snapshot'&&action.supportedExecutor?.writes===false;host.append(el('p',ready?t('اجرای فقط‌خواندنی با تأیید دومرحله‌ای مدیر در دسترس است؛ نتیجهٔ مشاهده به معنی تکمیل اقدام نیست.','Read-only execution is available with administrator MFA; an observation does not complete the action.'):t('اجرا هنوز فعال نشده است؛ این اقدام نیازمند قرارداد اجرایی مستقل و مجوزهای لازم است.','Execution is not enabled; this action requires its own executor contract and authorization.')));
  // Detailed contract is collapsed by default: no long initial mobile scroll.
  // All values are text nodes from the immutable, server-owned registry.
  const contract=el('details',undefined,'ops-action-contract');
  contract.append(el('summary',t('قرارداد اجرا، وابستگی‌ها و بازبینی امنیتی','Execution contract, dependencies and safeguards')));
  for(const [fa,enLabel,value] of [
   ['هویت دائمی','Permanent identity',action.identityKey],
   ['اولویت و ریسک','Priority and risk',action.priority+' · '+action.riskCategory],
   ['وابستگی‌های اقدام','Action dependencies',(action.dependencies||[]).join(', ')||t('ندارد','None')],
   ['ورودی‌های مجاز','Required inputs',(action.requiredInputs||[]).join('; ')||t('تعریف نشده','Not defined')],
   ['خروجی مورد انتظار','Expected output',action.expectedOutput||t('تعریف نشده','Not defined')],
   ['دامنهٔ اثر','Target scope',action.targetScope||'unknown'],
   ['محیط اجرا','Execution environment',action.executionEnvironment||'unknown'],
   ['مجوز و تأیید مستقل','Authorization and approval',action.authorizationLevel+' · '+(action.approvalPolicy?.required?'approval required':'read-only MFA scope')],
   ['محدودیت اجرا','Execution timeout',action.maximumExecutionDurationSeconds==null?'not specified':String(action.maximumExecutionDurationSeconds)+'s'],
   ['تلاش خودکار مجدد','Automatic retries',String(action.retryPolicy?.automaticRetries??0)],
   ['کنترل عدم تکرار','Idempotency',action.idempotencyPolicy||'not specified'],
   ['راستی‌آزمایی','Verification',(action.verificationProcedure||[]).join('; ')||'not defined'],
   ['بازیابی پس از خطا','Recovery',action.errorRecovery?.recovery||'not defined'],
   ['بازگشت ایمن','Rollback',action.rollbackStrategy||'not defined']
  ])contract.append(el('p',t(fa,enLabel)+': '+String(value??'unknown')));
  host.append(contract);
  const collector=action.collectorObservation;
  const registered=action.supportedExecutor?.type==='readonly_snapshot'&&action.supportedExecutor?.writes===false;
  host.append(el('h4',t('اجرا و شواهد اقدام','Execution and action evidence')));
  if(registered){
   host.append(el('p',t('گردآورندهٔ موجود: فقط‌خواندنی؛ وضعیت مشاهده: ','Existing collector: read-only; observation: ')+(collector?.status||'unavailable')),
    el('p',t('داده‌های تازه: ','Fresh observations: ')+String(collector?.freshSignalCount??0)+'/'+String(collector?.expectedSignalCount??'?')));
   if(Array.isArray(collector?.signals)){const signals=el('ul');for(const row of collector.signals)signals.append(el('li',signalLabel(row)+' · '+signalValue(row)+' · '+row.status+' · '+row.source+' · '+date(row.checkedAt)));host.append(signals);}
   const trigger=el('button',t('اجرای مشاهده و ثبت نتیجه','Run observation and record result'));trigger.type='button';trigger.addEventListener('click',()=>runReadonlyAction(action.id,trigger));host.append(trigger);
  }else host.append(el('p',t('اجراکنندهٔ مجاز برای این Action هنوز موجود نیست. این مورد فقط در رجیستری ثبت شده است.','This Action has no authorized executor yet. Registry presence is not execution.')));
  actionRunHistory(host,actionRecent(action.id));
  host.append(el('h4',t('معیار پذیرش اقدام','Action acceptance criteria')));for(const criterion of action.acceptanceCriteria||[])host.append(el('p',typeof criterion==='string'?criterion:JSON.stringify(criterion)));
  host.append(el('p',action.scoringScope==='legacy_acceptance'?t('این اقدام دقیقاً معیارهای کامل گزارش اصلی را ارزیابی می‌کند؛ وابستگی‌ها و شواهد معتبر آن اعمال می‌شوند.','This action evaluates the exact full original report scope, including its dependencies and current evidence.'):t('پیشرفت گزارش‌های مرتبط، تأیید خود این اقدام نیست.','Progress in related legacy reports does not certify this action.')));
 }else if(reportingView.level==='engine'){
  const engine=model.engines.find(e=>e.id===reportingView.engine);host.append(el('h3',engine.id+' · '+engineName(engine)),el('p',engine.responsibility));reportingMetrics(host,engine.metrics);
  host.append(el('h4',t('تاریخچهٔ اجراهای مشاهده‌ای این موتور','Recent observational runs in this engine')));
  actionRunHistory(host,actionRuns.filter(r=>r.actionId.startsWith(engine.id+'.')).slice(0,5));
  host.append(el('p',t('آخرین شاهد معتبر: ','Last current verification: ')+date(engine.lastVerificationTimestamp)),el('p',t('وابستگی‌های باز: ','Open dependencies: ')+(engine.openDependencies.join(', ')||t('ندارد','None'))));
  if(engine.kind!=='reporting'){
   const facets=el('div',undefined,'ops-toolbar');facets.setAttribute('aria-label',t('سه گزارش AWOSE','Three AWOSE report views'));
   for(const [type,label] of [['A',t('A: سلامت و آمادگی','A: Health and readiness')],['B',t('B: اجرا و بازیابی','B: Execution and recovery')],['C',t('C: یادگیری و بهبود','C: Learning and improvement')]]){const button=el('button',label);button.type='button';button.setAttribute('aria-pressed',String(reportingView.facet===type));button.addEventListener('click',()=>{reportingView.facet=type;reportingRender();});facets.append(button);}host.append(facets);
   const view=model.awoseDomainViews?.find(v=>v.engineId===engine.id&&v.type===reportingView.facet);
   if(view){host.append(el('h4',view.id+' · '+view.name));if(view.type==='B'){host.append(el('p',t('صف پایدار اجرای کارها: هنوز پیاده‌سازی نشده','Durable job execution: not implemented')));const list=el('ul');for(const a of view.actionStatuses){list.append(el('li',a.id+' · '+(statuses[a.status]||a.status)+' · '+(a.blocker||t('شاهد تکمیل این اقدام هنوز ثبت نشده','No completion evidence recorded for this action'))));}host.append(list);}if(view.type==='C')host.append(el('p',t('حافظهٔ پایدار تجربه و یادگیری: هنوز پیاده‌سازی نشده','Persisted experience and learning: not implemented')),el('p',view.permissionPolicy));host.append(el('p',view.limitation));}
  }
  if(engine.kind==='reporting')host.append(el('p',t('این موتور گزارش و بررسی شواهد را مدیریت می‌کند؛ کارهای عملیاتی در مالکیت موتورهای ۱ تا ۱۲ باقی می‌مانند.','This engine owns report generation and evidence verification. Operational work remains owned by engines 1–12.')));
 }else{
  host.append(el('h3',reportingView.level==='master'?t('گزارش جامع: ۳۶ گزارش، هر کدام یک بار','Master report: 36 reports, counted once'):t('نمای مدیریتی اکوسیستم','Executive ecosystem overview')));reportingMetrics(host,model.executiveReport.metrics);
  const chart=el('div',undefined,'ops-grid ops-engine-aggregate');for(const engine of model.engines){const card=el('article',undefined,'ops-card');card.append(el('h4',engine.id+' · '+engineName(engine)),el('p',t('اندازه‌گیری‌شده: ','Measured: ')+pct(engine.metrics.measuredCompletion)),progress(engine.metrics.measuredCompletion),el('small',t('پوشش شواهد: ','Evidence coverage: ')+pct(engine.metrics.verificationCoverage)),el('p',t('وضعیت محیط عملیاتی: ','Production status: ')+({verified:t('تأییدشده','Verified'),unverified:t('تأییدنشده','Unverified'),unscoped:t('بدون گزارش تخصیص‌یافته','No assigned report')}[engine.metrics.productionReadiness.status]||t('نامشخص','Unknown'))));card.append(el('small',engine.id==='ENG-12'?t('این امتیاز فقط به گزارش مستقل مدیریت ADM-01 مربوط است؛ تأیید ۱۲ موتور دیگر نیست.','This score covers only the separate ADM-01 governance report; it does not certify other engines.'):engine.metrics.totalReports===0?t('هیچ گزارش OP به این موتور تخصیص نیافته است؛ صفر درصد به معنی شکست نیست.','No OP report is assigned to this engine; absence of scope is not failure.'):t('گزارش‌های تأییدشده: ','Verified reports: ')+engine.metrics.verifiedReports+' / '+engine.metrics.totalReports));const stats=engine.metrics;card.append(el('small',t('شواهد موفق: ','Passed gates: ')+stats.passedGates+' / '+stats.requiredGates+' · '+t('شواهد بررسی‌شده: ','Observed gates: ')+stats.observedGates));if(engine.pendingReportIds?.length){card.append(el('small',t('گزارش‌های باز: ','Open reports: ')+engine.pendingReportIds.join('، ')));}if(engine.openDependencies?.length)card.append(el('small',t('وابستگی‌های باز: ','Open dependencies: ')+engine.openDependencies.join('، ')));if(engine.lastVerificationTimestamp)card.append(el('small',t('آخرین شاهد معتبر: ','Latest evidence: ')+date(engine.lastVerificationTimestamp)));chart.append(card);}host.append(chart);
  const collectors=model.actionReports.filter(a=>a.supportedExecutor?.type==='readonly_snapshot'&&a.supportedExecutor?.writes===false);
  host.append(el('p',t('مشاهده‌گرهای سروری ثبت‌شده: ','Registered server read-only observers: ')+collectors.length+' / '+model.actionReports.length),
      el('p',t('تاریخچهٔ اجرای فقط‌خواندنی در همین نشست: ','Server-backed read-only run history in this session: ')+actionRuns.length));
  actionRunHistory(host,actionRuns.slice(0,5));
  host.append(el('p',t('درآمد تأییدشده و پیش‌بینی مالی: نامشخص تا زمان تطبیق مستقل تراکنش‌ها.','Certified revenue and financial forecast: unknown until independently reconciled.')));
 }
 const records=reportingRecords(),list=el('ul',undefined,'ops-queue');
 for(const r of records){const item=el('li'),button=el('button',r.id+' · '+title(r));button.type='button';button.addEventListener('click',()=>show(r.id));item.append(button,el('small',' '+reportOwner(r)+' · '+statuses[r.status]+' · '+pct(r.measuredProgress)));list.append(item);}host.append(list);
}
function reportingExport(){
 const model=snapshot.reporting;
 const rows=reportingRecords().map(r=>({reportId:r.id,responsibleEngine:reportOwner(r),name:title(r),priority:r.priority,status:r.status,estimatedCompletion:r.estimatedProgress,measuredCompletion:r.measuredProgress,closed:r.closed,acceptance:r.acceptance,pendingGates:r.openWork,blocked:r.currentBlocker||null,dependencies:r.dependencies,openDependencies:r.openDependencies,recommendedNextActions:[...(r.openWork||[]),r.remaining],operationalImpact:r.remaining,financialImpact:null,
  completedActionIds:model.actionReports.filter(a=>a.legacyReportIds?.includes(r.id)&&a.closed===true).map(a=>a.id),pendingActionIds:model.actionReports.filter(a=>a.legacyReportIds?.includes(r.id)&&a.closed!==true).map(a=>a.id),
  historicalChanges:snapshot.history.filter(e=>e.section_id===r.id).map(e=>({gate:e.gate_id,result:e.result,testName:e.test_name,sourceUrl:e.source_url,checkedAt:e.checked_at,expiresAt:e.expires_at})),
  evidence:(r.verifiedGates||[]).map(g=>({gate:g.id,state:g.state,testName:g.evidence?.test_name||null,sourceUrl:g.evidence?.source_url||null,environment:g.evidence?.environment||null,checkedAt:g.evidence?.checked_at||null,expiresAt:g.evidence?.expires_at||null})),
  observations:(r.signals||[]).map(s=>({id:s.id,label:signalLabel(s),value:s.value,source:s.source,limitation:s.limitation,checkedAt:s.checkedAt,expiresAt:s.expiresAt,stale:s.expiresAt<=Date.now()/1000}))}));
 const engine=reportingView.level==='engine'?model.engines.find(e=>e.id===reportingView.engine):null;
 const action=reportingView.level==='action'?model.actionReports.find(a=>a.id===reportingView.action):null;
 return {schema:'operations-report-export-v1',githubAuditObservation:githubAuditState?.error?null:githubAuditState,recentActionRuns:actionRuns.filter(r=>!action||(r.actionId===action.id)).slice(0,50),reportingEngine:'ENG-13',level:reportingView.level,language:en?'en':'fa',period:model.reportingPeriod,metrics:engine?.metrics||(action?{actionCompletion:action.measuredProgress,status:action.currentStatus,claim:action.completionClaim}:model.executiveReport.metrics),awoseDomainView:engine?model.awoseDomainViews?.find(v=>v.engineId===engine.id&&v.type===reportingView.facet)||null:null,selectedEngine:engine?{id:engine.id,name:engineName(engine),responsibility:engine.responsibility}:null,selectedAction:action?{id:action.id,name:en?action.canonicalName:action.displayNameFa,criteria:action.acceptanceCriteria,status:action.currentStatus,completion:action.measuredProgress,claim:action.completionClaim,scoringScope:action.scoringScope,executionType:action.executionType,authorizationLevel:action.authorizationLevel}:null,reports:rows,freeSourceRegistry:model.freeSourceRegistry||null,freeScholarlyObservation:model.freeScholarlyObservation||null,freePerformanceObservation:model.freePerformanceObservation||null,manualPagespeedObservation:model.manualPagespeedObservation||null};
}
function reportingCsvCell(value){let txt=value===null||value===undefined?'':typeof value==='object'?JSON.stringify(value):String(value);if(/^[\s]*[=+@-]/.test(txt)||/^[\t\r]/.test(txt))txt="'"+txt;return '"'+txt.replaceAll('"','""')+'"';}
function reportingDownload(format){
 if(!snapshot?.reporting)return;const data=reportingExport();let text,mime;
 if(format==='json'){text=JSON.stringify(data,null,2);mime='application/json;charset=utf-8';}
 else if(format==='csv'){const cols=['awoseDomainViewId','selectedActionId','actionStatus','actionCompletion','acceptanceContext','reportId','responsibleEngine','name','priority','status','estimatedCompletion','measuredCompletion','closed','blocked','pendingGates','openDependencies','evidence','latestActionRunStatus','latestActionRunAt'];text='\ufeff'+[cols.map(reportingCsvCell).join(','),...data.reports.map(r=>cols.map(c=>reportingCsvCell(({awoseDomainViewId:data.awoseDomainView?.id||null,selectedActionId:data.selectedAction?.id||null,actionStatus:data.selectedAction?.status||null,actionCompletion:data.selectedAction?.completion??null,latestActionRunStatus:data.recentActionRuns?.[0]?.status||null,latestActionRunAt:data.recentActionRuns?.[0]?.createdAt??null,acceptanceContext:data.selectedAction?.claim||null,...r})[c])).join(','))].join('\r\n');mime='text/csv;charset=utf-8';}
 else{text=t('گزارش مدیریتی سایت','Website management report')+'\n'+date(snapshot.checkedAt)+'\nRelease: '+snapshot.releaseSha+'\nLevel: '+data.level+'\n\n'+JSON.stringify(data.metrics,null,2)+'\n\n';if(data.awoseDomainView)text+=JSON.stringify(data.awoseDomainView,null,2)+'\n\n';if(data.recentActionRuns?.length)text+=t('تاریخچهٔ اجرای ثبت‌شده','Recorded action runs')+'\n'+data.recentActionRuns.map(r=>r.actionId+' | '+r.status+' | '+date(r.createdAt)+' | '+r.runId.slice(0,12)+' | '+String(r.result?.freshSignalCount??0)+'/'+String(r.result?.expectedSignalCount??'?')).join('\n')+'\n\n';if(data.selectedAction)text+='Action: '+data.selectedAction.id+' — '+data.selectedAction.name+'\n'+data.selectedAction.status+' | '+pct(data.selectedAction.completion)+'\n'+data.selectedAction.claim+'\n'+data.selectedAction.criteria.join('\n')+'\n\n';for(const r of data.reports){text+=r.reportId+' — '+r.name+'\n'+r.responsibleEngine+' | '+r.status+' | '+pct(r.measuredCompletion)+'\n'+t('برآورد تاریخی: ','Historical estimate: ')+pct(r.estimatedCompletion)+'\n'+t('معیار پذیرش: ','Acceptance: ')+r.acceptance+'\n'+t('کارهای باز: ','Open work: ')+(r.pendingGates||[]).join('; ')+'\n'+t('وابستگی‌های باز: ','Open dependencies: ')+(r.openDependencies||[]).join(', ')+'\n';for(const g of r.evidence)text+=g.gate+': '+g.state+' | '+(g.testName||'')+' | '+(g.sourceUrl||'')+' | '+date(g.checkedAt)+' | '+date(g.expiresAt)+'\n';text+='\n';}mime='text/plain;charset=utf-8';}
 const url=URL.createObjectURL(new Blob([text],{type:mime})),link=el('a');link.href=url;link.download='operations-'+data.level+(data.selectedEngine?'-'+data.selectedEngine.id:data.selectedAction?'-'+data.selectedAction.id:'')+'.'+format;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}

$('ops-mfa-form').addEventListener('submit',async event=>{event.preventDefault();try{const code=$('ops-mfa-code').value;$('ops-mfa-code').value='';await api('/mfa',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify({code})});await load();}catch(error){notice(errorMessage(error),true);}});
for(const id of ['ops-search','ops-engine','ops-priority'])$(id).addEventListener(id==='ops-search'?'input':'change',cards);
$('ops-refresh').addEventListener('click',load);$('ops-refresh-data').addEventListener('click',load);$('ops-report').addEventListener('click',()=>download());$('ops-print').addEventListener('click',()=>window.print());$('ops-admin-detail').addEventListener('click',()=>show('ADM-01'));document.addEventListener('visibilitychange',()=>{if(document.hidden)lock(t('برای مشاهدهٔ مجدد، شواهد را تازه‌سازی کنید.','Refresh evidence to view the workspace again.'));});
// Stage 7: on-demand private audit history; never poll or imply live notifications.
const auditPanel=el('details',undefined,'ops-panel');auditPanel.id='ops-audit-timeline';
const auditSummary=el('summary',t('تاریخچهٔ حسابرسی مدیر (۵۰ رویداد اخیر)','Administrator audit history (latest 50 events)'));
const auditDescription=el('p',t('فقط سوابق ثبت‌شده؛ این بخش پایش لحظه‌ای یا اعلان خودکار نیست.','Recorded audit events only; not real-time monitoring or automatic alerts.'),'ops-muted');
const auditRefresh=el('button',t('دریافت تاریخچه','Load audit history'));auditRefresh.type='button';
const auditContent=el('div');auditContent.setAttribute('aria-live','polite');
auditPanel.append(auditSummary,auditDescription,auditRefresh,auditContent);
$('ops-refresh-data').parentElement.after(auditPanel);
auditRefresh.addEventListener('click',async()=>{
  if(!snapshot){auditContent.textContent=t('ابتدا دسترسی مدیر را تأیید کنید.','Verify administrator access first.');return;}
  const generation=loadGeneration;
  auditRefresh.disabled=true;auditContent.textContent=t('در حال دریافت…','Loading…');
  try{
    const result=await api('/audit-timeline');
    if(generation!==loadGeneration||!snapshot)return;
    auditContent.replaceChildren();
    const events=Array.isArray(result.events)?result.events:[];
    if(!events.length){auditContent.textContent=t('رویدادی ثبت نشده است.','No events recorded.');return;}
    // Local-only filtering: do not send audit references to third-party services.
    const toolbar=el('div',undefined,'ops-audit-toolbar');
    const search=el('input');search.type='search';search.placeholder=t('جست‌وجوی رویداد یا شناسه','Search event or reference');search.setAttribute('aria-label',search.placeholder);
    const typeFilter=el('select');typeFilter.setAttribute('aria-label',t('نوع رویداد','Event type'));
    const all=el('option',t('همهٔ رویدادها','All event types'));all.value='';typeFilter.append(all);
    for(const type of [...new Set(events.map(item=>String(item.type||'unknown')))].sort()){const option=el('option',type);option.value=type;typeFilter.append(option);}
    const count=el('span',undefined,'ops-muted');count.setAttribute('role','status');
    toolbar.append(search,typeFilter,count);
    const wrap=el('div',undefined,'ops-table-wrap'),table=el('table',undefined,'ops-table ops-audit-table');
    const caption=el('caption',t('سوابق حسابرسی مدیر، فقط خواندنی','Administrator audit records, read-only'));
    const head=el('thead'),header=el('tr');
    for(const label of [t('زمان','Time'),t('رویداد','Event'),t('شناسه / مرجع','Reference')])header.append(el('th',label));
    head.append(header);const body=el('tbody');table.append(caption,head,body);wrap.append(table);
    const render=()=>{
      const q=search.value.trim().toLocaleLowerCase();
      const matched=events.filter(item=>(!typeFilter.value||String(item.type||'unknown')===typeFilter.value)&&(!q||(String(item.type||'')+' '+String(item.reference||'')).toLocaleLowerCase().includes(q)));
      body.replaceChildren();
      for(const item of matched){
        const row=el('tr');
        row.append(el('td',date(Number(item.occurredAt)||0)),el('td',String(item.type||'unknown')),el('td',String(item.reference||'')));
        body.append(row);
      }
      count.textContent=t('نمایش ','Showing ')+matched.length+t(' از ',' of ')+events.length;
      if(!matched.length){const row=el('tr'),cell=el('td',t('موردی یافت نشد.','No matching records.'));cell.colSpan=3;row.append(cell);body.append(row);}
    };
    search.addEventListener('input',render);typeFilter.addEventListener('change',render);
    auditContent.append(toolbar,wrap);render();
  }catch(error){if(generation===loadGeneration)auditContent.textContent=errorMessage(error);}
  finally{auditRefresh.disabled=false;}
});
const sectionToggle=el('button',t('نمایش ۳۶ بخش تفصیلی','Show 36 detailed sections'));sectionToggle.id='ops-section-toggle';sectionToggle.type='button';sectionToggle.setAttribute('aria-controls','ops-cards');sectionToggle.setAttribute('aria-expanded','false');sectionToggle.addEventListener('click',()=>{sectionsExpanded=!sectionsExpanded;cards();});$('ops-refresh-data').parentElement.append(sectionToggle);
load();
})();
