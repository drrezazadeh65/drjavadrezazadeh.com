/* Privileged operations: server-authorized data only; no browser persistence or closure writes. */
(()=>{'use strict';
const root=document.getElementById('operations-control');if(!root)return;
const en=document.documentElement.lang==='en';let snapshot=null,csrf='',selected=null,expiryTimer=null,loadGeneration=0,actionRuns=[],sectionsExpanded=false,githubAuditState=null,githubAuditExpanded=false;
const t=(fa,eng)=>en?eng:fa,$=id=>document.getElementById(id);
const statuses={not_started:t('شواهد ثبت نشده','No evidence'),in_progress:t('در حال انجام','In progress'),blocked:t('وابستگی باز','Blocked'),ready_for_verification:t('نیازمند آزمون مجدد','Recheck required'),verified_complete:t('تکمیل تأییدشده','Verified complete'),regressed:t('خطای جدید','Regressed')};
const gates={unknown:t('نامشخص','Unknown'),stale:t('قدیمی؛ نیازمند بررسی','Stale'),pass:t('موفق','Pass'),fail:t('ناموفق','Fail'),blocked:t('مسدود','Blocked')};
const date=epoch=>epoch?new Date(epoch*1000).toLocaleString(en?'en-GB':'fa-IR'):t('ثبت نشده','Not recorded');
const pct=value=>value===null||value===undefined?t('نامشخص','Unknown'):value+'%';
const title=r=>en?r.title:r.titleFa;
const signalValue=s=>s.value===null||s.value===undefined?t('نامشخص','Unknown'):typeof s.value==='boolean'?t(s.value?'بله':'خیر',s.value?'Yes':'No'):String(s.value);
const signalLabel=s=>en?s.labelEn:s.labelFa;
function el(tag,txt,cls){const node=document.createElement(tag);if(txt!==undefined)node.textContent=txt;if(cls)node.className=cls;return node;}
async function api(path,options={}){const response=await fetch('/api/admin/operations'+path,{credentials:'same-origin',cache:'no-store',...options});const body=await response.json();if(!response.ok||body.ok!==true)throw new Error(body.error||'network_error');return body;}
function notice(text,error=false){$('ops-notice').textContent=text;$('ops-notice').classList.toggle('ops-error',error);}
function lock(message){clearTimeout(expiryTimer);loadGeneration++;snapshot=null;selected=null;csrf='';actionRuns=[];sectionsExpanded=false;githubAuditState=null;githubAuditExpanded=false;$('ops-workspace').hidden=true;$('ops-auth').hidden=false;for(const id of ['ops-cards','ops-detail','ops-sources','ops-reporting','ops-queue'])$(id)?.replaceChildren();for(const id of ['ops-total','ops-verified','ops-coverage','ops-admin-score','ops-release','ops-checked'])$(id).textContent=t('نامشخص','Unknown');$('ops-engine').replaceChildren();$('ops-mfa-code').value='';reportingView={level:'executive',engine:'ENG-01',action:'',facet:'A'};notice(message,true);}
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
function show(id,focus=true){if(!snapshot)return;const r=id==='ADM-01'?snapshot.dashboard:snapshot.reports.find(row=>row.id===id);if(!r)return;selected=id;const panel=$('ops-detail');panel.replaceChildren();panel.hidden=false;const header=el('div',undefined,'ops-title-row');header.append(el('h2',r.id+' · '+title(r)));const report=el('button',t('دریافت گزارش مکتوب','Download written report'));report.addEventListener('click',()=>download(r));header.append(report);panel.append(header,el('p',statuses[r.status]+' · '+pct(r.measuredProgress)),progress(r.measuredProgress),el('p',t('معیار پذیرش: ','Acceptance: ')+r.acceptance),el('p',t('شروط باز فعلی: ','Current open gates: ')+(r.openWork?.join('؛ ')||t('ندارد','None'))),el('p',t('مانع فعلی: ','Current blocker: ')+(r.currentBlocker||t('ثبت نشده؛ شروط و وابستگی‌ها را بررسی کنید.','No separate blocker recorded; inspect gates and dependencies.'))),el('p',t('وابستگی‌های باز: ','Open dependencies: ')+(r.openDependencies?.join(', ')||t('ندارد','None'))));
 const grid=el('div',undefined,'ops-gates');for(const gate of r.verifiedGates){const item=el('article',undefined,'ops-gate');item.append(el('h3',gate.label),el('p',gates[gate.state],gate.state==='pass'?'ops-pass':gate.state==='fail'?'ops-fail':''));if(gate.evidence){const e=gate.evidence;const link=el('a',e.test_name);link.href=e.source_url;link.target='_blank';link.rel='noopener noreferrer';item.append(link,el('p',e.environment+' · '+date(e.checked_at)),el('small',t('اعتبار تا: ','Valid until: ')+date(e.expires_at)));}grid.append(item);}panel.append(grid);signals(panel,r);panel.append(el('h3',t('روند شواهد این نسخه','Evidence trend for this release')));trend(panel,r);
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
 const detail=r.result||{};li.append(el('p',t('سیگنال تازه: ','Fresh signals: ')+String(detail.freshSignalCount??0)+'/'+String(detail.expectedSignalCount??'?')+' · '+t('وضعیت مشاهده: ','Observation: ')+(detail.status||'unknown')));
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

function githubAuditRender(host){
 const section=el('details',undefined,'ops-github-audits');section.open=githubAuditExpanded;
 section.addEventListener('toggle',()=>{githubAuditExpanded=section.open;});
 section.append(el('summary',t('پایش آزمون‌های واقعی GitHub (فقط‌خواندنی)','Live GitHub audit runs (read-only)')));
 const info=el('p',t('نتایج آزمون‌های اصلی، لینک اجرای واقعی و نسخهٔ آزمایش‌شده؛ این گزارش اجازهٔ انتشار یا تأیید نهایی اقدام را صادر نمی‌کند.','Real audit run links, status and tested source SHA. This does not dispatch releases or certify action completion.'));
 section.append(info);
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

function reportingRender(){
 const model=snapshot?.reporting;if(!model)return;
 let host=$('ops-reporting');if(!host){host=el('section',undefined,'ops-panel');host.id='ops-reporting';host.setAttribute('aria-label',t('گزارش‌های سیزده موتور','Thirteen-engine reporting'));$('ops-workspace').insertBefore(host,$('ops-cards'));}
 host.replaceChildren();host.append(el('h2',t('۱۳ موتور؛ یک مرکز مدیریت','13 engines, one administrative center')));
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
  const chart=el('div',undefined,'ops-grid ops-engine-aggregate');for(const engine of model.engines){const card=el('article',undefined,'ops-card');card.append(el('h4',engine.id+' · '+engineName(engine)),el('p',t('اندازه‌گیری‌شده: ','Measured: ')+pct(engine.metrics.measuredCompletion)),progress(engine.metrics.measuredCompletion),el('small',t('پوشش شواهد: ','Evidence coverage: ')+pct(engine.metrics.verificationCoverage)),el('p',t('وضعیت production: ','Production: ')+engine.metrics.productionReadiness.status));chart.append(card);}host.append(chart);
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
const sectionToggle=el('button',t('نمایش ۳۶ بخش تفصیلی','Show 36 detailed sections'));sectionToggle.id='ops-section-toggle';sectionToggle.type='button';sectionToggle.setAttribute('aria-controls','ops-cards');sectionToggle.setAttribute('aria-expanded','false');sectionToggle.addEventListener('click',()=>{sectionsExpanded=!sectionsExpanded;cards();});$('ops-refresh-data').parentElement.append(sectionToggle);
load();
})();
