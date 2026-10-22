/* Privileged operations: server-authorized data only; no browser persistence or closure writes. */
(()=>{'use strict';
const root=document.getElementById('operations-control');if(!root)return;
const en=document.documentElement.lang==='en';let snapshot=null,csrf='',selected=null,expiryTimer=null,loadGeneration=0,actionRuns=[],sectionsExpanded=false,githubAuditState=null,githubAuditExpanded=false,collectionState=null,collectionExpanded=false,dbHealthCurrent=null,dbHealthExpanded=false;
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
/**
 * Export explicitly loaded, bounded admin rows only. Never fetches hidden
 * rows or stores export data on the server. Neutralise spreadsheet formulas.
 */
const workspaceVisibleForExport=()=>!!snapshot&&!$('ops-workspace')?.hidden;
function exportOperationsCsv(filename,headers,rows){
 if(!Array.isArray(rows)||rows.length>50)return;
 const escape=value=>{
   let v=String(value===null||value===undefined?'':value)
     .replace(/[\u0000-\u001F\u007F]/g,' ');
   if(/^\s*[=+\-@]/u.test(v))v="'"+v;
   return '"'+v.replace(/"/g,'""')+'"';
 };
 const csv=[headers,...rows].map(values=>values.map(escape).join(',')).join('\r\n');
 const url=URL.createObjectURL(new Blob(['\uFEFF',csv],{type:'text/csv;charset=utf-8'}));
 const link=document.createElement('a');link.href=url;link.download=filename;
 document.body.append(link);link.click();link.remove();
 window.setTimeout(()=>URL.revokeObjectURL(url),0);
}
// These panels exist only after the authenticated reporting model mounts.
// Keep source-HTML fragment links valid, then upgrade on actual interaction.
$('ops-workspace')?.addEventListener('click',event=>{
 // Four mobile shortcuts reuse existing MFA-protected module navigation.
 // Dynamic panels have a static link fallback for source-level fragment checks.
 const mobile=event.target?.closest?.('nav.ops-mobile-dock a');
 if(mobile&&$('ops-workspace').contains(mobile)){
   const selected=mobile.dataset.opsTarget||mobile.hash?.slice(1);
   const target=selected&&document.getElementById(selected);
   if(target&&target!=$('ops-command-center')){
     event.preventDefault();
     openExistingOperationalWorkspace(selected);
   }
   return;
 }
 const anchor=event.target?.closest?.('nav.ops-jump a[data-ops-target]');
 if(!anchor||!$('ops-workspace').contains(anchor))return;
 const target=anchor.getAttribute('data-ops-target');
 if(!['ops-alert-center','ops-page-quality'].includes(target))return;
 anchor.setAttribute('href',document.getElementById(target)
   ?'#'+target:'#ops-executive-stats');
});
async function api(path,options={}){const response=await fetch('/api/admin/operations'+path,{credentials:'same-origin',cache:'no-store',...options});const body=await response.json();if(!response.ok||body.ok!==true)throw new Error(body.error||'network_error');return body;}
function notice(text,error=false){$('ops-notice').textContent=text;$('ops-notice').classList.toggle('ops-error',error);}
function lock(message){clearTimeout(expiryTimer);loadGeneration++;snapshot=null;selected=null;csrf='';actionRuns=[];sectionsExpanded=false;githubAuditState=null;githubAuditExpanded=false;collectionState=null;collectionExpanded=false;dbHealthCurrent=null;dbHealthExpanded=false;alertCenterExpanded=true;alertCenterCurrent=null;httpHealthCurrent=null;responseMonitorCurrent=null;responseMonitorExpanded=false;alertScopeKind='engine';alertScopeQuery='';alertScopesExpanded=false;qualityExpanded=false;qualityResult=null;qualityDetail=null;qualityFilters={dimension:'onPageSeo',language:'all',index:'all',sort:'weakest',query:'',page:1};sourceDirectoryState=null;sourceControlState=null;sourceMetricState=null;sourceDirectoryExpanded=false;sourceDirectoryPage=0;sourceDirectoryFilter={kind:'',engine:'',query:''};$('ops-workspace').hidden=true;$('ops-auth').hidden=false;
// Notify private child workspaces immediately; hiding alone retains confidential DOM.
$('ops-command-center')?.remove();ownerCockpitFilter='all';ownerCockpitQuery='';ownerCockpitShowAll=false;ownerCockpitStopRequested=true;ownerCockpitPrivateEvidence=Object.create(null);ownerCockpitLastReadAt=null;ownerCockpitReadErrors=Object.create(null);$('ops-workspace').dispatchEvent(new Event('jr:operations-locked'));const auditHistory=$('ops-audit-timeline');if(auditHistory){auditHistory.open=false;auditHistory.querySelector('[aria-live]')?.replaceChildren();}const commerce=$('ops-commerce');if(commerce)commerce.open=false;$('ops-commerce-results')?.replaceChildren();for(const id of ['ops-cards','ops-detail','ops-sources','ops-reporting','ops-queue'])$(id)?.replaceChildren();$('ops-health-summary')?.remove();for(const id of ['ops-total','ops-verified','ops-coverage','ops-admin-score','ops-release','ops-checked'])$(id).textContent=t('نامشخص','Unknown');$('ops-engine').replaceChildren();$('ops-mfa-code').value='';reportingView={level:'executive',engine:'ENG-01',action:'',facet:'A'};notice(message,true);}
function errorMessage(error){return ({unauthorized:t('ابتدا با حساب تأییدشدهٔ مدیر وارد شوید.','Sign in with your verified administrator account.'),admin_forbidden:t('این حساب دسترسی مدیر ندارد؛ نقش باید در تنظیمات خصوصی سرور ثبت شود.','This account has no administrator permission. Provision its role privately on the server.'),operations_schema_unavailable:t('جداول مدیریتی هنوز در سرور آماده نیستند.','Operations database tables are not ready.'),admin_mfa_required:t('تأیید دومرحله‌ای منقضی شده است؛ دوباره تأیید کنید.','Your second-factor verification expired. Verify again.'),invalid_mfa:t('کد تأیید معتبر نیست.','Invalid verification code.'),mfa_replayed:t('این کد قبلاً استفاده شده؛ کد جدید را وارد کنید.','This code was already used. Enter the next code.'),rate_limited:t('درخواست‌های زیاد؛ چند دقیقه بعد دوباره امتحان کنید.','Too many attempts. Try again in a few minutes.')})[error.message]||t('دریافت داده ممکن نشد. وضعیت ثبت‌شده تغییر نکرده است.','Data could not be loaded. Recorded status has not changed.');}
async function load(){const generation=++loadGeneration;try{notice(t('در حال بررسی دسترسی و شواهد سرور…','Checking access and server evidence…'));const requestedAt=Date.now();const session=await api('/session');if(generation!==loadGeneration)return;csrf=session.csrfToken;$('ops-mfa-form').hidden=!session.mfaRequired;if(session.mfaRequired){lock(t('کد دومرحله‌ای مدیر را وارد کنید.','Enter your administrator second-factor code.'));csrf=session.csrfToken;return;}const deadline=requestedAt+Math.max(0,Number(session.mfaExpiresIn)||0)*1000;const expired=()=>lock(t('تأیید مدیر منقضی شد؛ دوباره بررسی کنید.','Administrator verification expired. Check access again.'));clearTimeout(expiryTimer);if(Date.now()>=deadline){expired();return;}expiryTimer=setTimeout(expired,deadline-Date.now());const data=await api('');if(generation!==loadGeneration)return;if(Date.now()>=deadline){expired();return;}alertCenterCurrent=null;httpHealthCurrent=null;qualityResult=null;qualityDetail=null;sourceDirectoryState=null;sourceControlState=null;sourceMetricState=null;sourceDirectoryPage=0;sourceDirectoryFilter={kind:'',engine:'',query:''};ownerCockpitPrivateEvidence=Object.create(null);ownerCockpitLastReadAt=null;ownerCockpitReadErrors=Object.create(null);snapshot=data;actionRuns=Array.isArray(data.reporting?.actionExecution?.recentRuns)?data.reporting.actionExecution.recentRuns:[];$('ops-auth').hidden=true;$('ops-workspace').hidden=false;render();notice(t('داده از سرور دریافت شد؛ برآوردهای تاریخی از پیشرفت تأییدشده جدا هستند.','Server data loaded. Historical estimates are separate from verified progress.'));}catch(error){if(generation===loadGeneration)lock(errorMessage(error));}}
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

/**
 * Mother database health is manually loaded by the MFA-protected owner.
 * It never queries the database during public requests or a dashboard render.
 */
function renderDatabaseHealth(host){
 const section=el('details',undefined,'ops-panel ops-database-health');
 section.id='ops-database-health';section.open=dbHealthExpanded;
 section.addEventListener('toggle',()=>{dbHealthExpanded=section.open;});
 section.append(el('summary',t('سلامت دیتابیس مادر و دفتر اختصاصی خطاها',
   'Mother database health and private error journal')));
 section.append(el('p',t(
   'بررسی سلامت تنها با فشردن دکمه مدیر انجام می‌شود. ثبت خطا و پایش خودکار به‌طور پیش‌فرض خاموش‌اند؛ هیچ تعمیر، حذف یا Cron به‌صورت خودکار اجرا نمی‌شود.',
   'Health is checked only on owner request. Error recording and scheduled checks default to off; no automatic repair, deletion or Cron runs.')));
 const scan=el('button',t('بررسی فوری و فقط‌خواندنی دیتابیس','Run on-demand read-only database check'));
 scan.type='button';scan.setAttribute('data-db-health-scan','');
 scan.addEventListener('click',async()=>{
   const generation=loadGeneration;scan.disabled=true;
   try{
     const data=await api('/database-health');
     if(generation!==loadGeneration||!snapshot)return;
     dbHealthCurrent=data;dbHealthExpanded=true;reportingRender();
   }catch(e){if(generation===loadGeneration)notice(errorMessage(e),true);}
   finally{if(scan.isConnected)scan.disabled=false;}
 });
 section.append(scan);
 const data=dbHealthCurrent;
 if(!data){section.append(el('small',t(
   'تا درخواست صریح مدیر، اطلاعات دیتابیس واکشی نمی‌شود.',
   'No database metadata is fetched until the owner requests it.')));host.append(section);return;}
 const settings=data.settings||{};
 const overall=el('div',undefined,'ops-db-health-summary');
 overall.setAttribute('data-db-health-summary','');
 const checks=Array.isArray(data.checks)?data.checks:[];
 const needsAttention=checks.filter(x=>x.state==='attention').length;
 const unavailable=checks.filter(x=>x.state==='unavailable').length;
 const inv=data.inventory;
 overall.append(el('p',t('اتصال: ','Connection: ')+(data.connection==='available'
   ?t('در بررسی اخیر پاسخ داده','Responded to the last check')
   :t('تأییدنشده','Not verified'))));
 overall.append(el('p',
   t('جدول‌های بررسی‌شده: ','Tables inventoried: ')+(inv?.tableCount??t('نامشخص','Unknown'))+
   ' · '+t('جدول‌های عملیاتی: ','Operations tables: ')+(inv?.operationsTableCount??t('نامشخص','Unknown'))+
   ' · '+t('موارد نیازمند بررسی: ','Attention checks: ')+needsAttention+
   ' · '+t('بررسی ناموفق/نامشخص: ','Unavailable checks: ')+unavailable));
 overall.append(el('small',t('آخرین درخواست بررسی: ','Last manual scan: ')+date(data.asOf)));
 section.append(overall);
 const healthStates={observed:t('مشاهده شد','Observed'),attention:t('نیازمند بررسی','Attention'),
   unavailable:t('نامشخص / در دسترس نیست','Unknown / unavailable')};
 for(const check of checks){
   const line=el('p');
   line.setAttribute('data-db-health-check',check.id);
   line.append(el('strong',check.id+' · '));
   line.append(el('span',healthStates[check.state]||t('نامشخص','Unknown')));
   if(Number.isInteger(check.count))line.append(el('small',' · '+check.count));
   section.append(line);
 }
 if(inv){
   if(Array.isArray(inv.missingOperationsTables)&&inv.missingOperationsTables.length){
     section.append(el('p',t('جدول‌های غایب: ','Missing required tables: ')+inv.missingOperationsTables.join('، ')));
   }
   const storage=el('details',undefined,'ops-db-health-storage');
   storage.append(el('summary',t('ابعاد و رشد قابل‌بررسی جداول عملیاتی',
     'Operational table sizes and capacity evidence')));
   storage.append(el('p',t(
     'تعداد ردیف‌ها و اندازه فایل‌ها از فراداده MySQL برآورد شده‌اند، نه شمارش دقیق یا ارزیابی سلامت فیزیکی صفحات.',
     'Row counts and storage sizes are information_schema estimates, not exact counts or physical page-integrity checks.')));
   const tbl=el('table',undefined,'ops-db-health-table');
   const head=el('tr');
   for(const textValue of [t('جدول','Table'),t('ردیف تخمینی','Estimated rows'),
     t('داده (KB)','Data (KB)'),t('ایندکس (KB)','Index (KB)')])head.append(el('th',textValue));
   const thead=el('thead');thead.append(head);tbl.append(thead);
   const tbody=el('tbody');
   for(const item of inv.largestOperationsTables||[]){
     const tr=el('tr');
     for(const value of [item.table,item.estimatedRows===null?'—':String(item.estimatedRows),
       String(Math.round(Number(item.dataBytes||0)/1024)),
       String(Math.round(Number(item.indexBytes||0)/1024))])
       tr.append(el('td',value));
     tbody.append(tr);
   }
   tbl.append(tbody);storage.append(tbl);section.append(storage);
 }
 const errors=el('details',undefined,'ops-db-health-errors');
 errors.setAttribute('data-db-health-errors','');
 const incidents=Array.isArray(data.errors?.rows)?data.errors.rows:[];
 errors.append(el('summary',t('دفتر خطاهای ناشناس‌سازی‌شده: ','Redacted error journal: ')+
   (data.errors?.status==='available'?String(incidents.length):t('در دسترس نیست','Unavailable'))));
 errors.append(el('p',t(
   'فقط نوع، کد غیرحساس، محل، تعداد و زمان وقوع ذخیره می‌شود. نبود خطا، اثبات سلامت کامل دیتابیس نیست.',
   'Only error class, safe code, component, count and timestamps are recorded. An empty journal is not proof of full database health.')));
 for(const incident of incidents.slice(0,60)){
   const item=el('p',incident.category+' / '+incident.component+
     ' · '+t('تکرار: ','Count: ')+incident.occurrences+
     ' · SQLSTATE '+(incident.sqlstateClass||'—')+
     ' · '+t('آخرین مشاهده: ','Last observed: ')+date(incident.lastAt));
   errors.append(item);
 }
 section.append(errors);
 if(settings.available!==true){
   section.append(el('p',t('جدول تنظیمات سلامت دیتابیس هنوز نصب یا قابل‌خواندن نیست؛ هیچ کنترلی فعال نخواهد شد.',
     'Database health settings table is absent or unreadable; no controls can be enabled.')));
   host.append(section);return;
 }
 const control=el('details',undefined,'ops-db-health-controls');
 control.append(el('summary',t('کنترل مدیر: زمان‌بندی، لاگ خطا و نگهداری',
   'Owner controls: schedule, error journal and retention')));
 control.append(el('p',t(
   'ذخیره یک ترجیح به‌تنهایی Cron ایجاد نمی‌کند. برای مانیتورینگ خودکار باید Worker اختصاصی نصب و توسط مدیر فعال شود.',
   'Saving a preference never installs Cron. Scheduled scans still require a separate owner-approved CLI worker.')));
 const monitor=el('input');monitor.type='checkbox';monitor.checked=settings.monitoringEnabled===true;
 const monitorLabel=el('label',t('اجازه پایش زمان‌بندی‌شده (فعلاً بدون Worker)',
   'Allow scheduled monitoring (no worker installed)'));monitorLabel.prepend(monitor);
 const logging=el('input');logging.type='checkbox';logging.checked=settings.errorLoggingEnabled===true;
 const loggingLabel=el('label',t('فعال‌سازی لاگ کدهای خطای دیتابیس',
   'Enable redacted database error logging'));loggingLabel.prepend(logging);
 const cadence=el('select');
 for(const [id,fa,enLabel] of [['manual','دستی','Manual'],['hourly','ساعتی','Hourly'],['daily','روزانه','Daily']]){
   const option=el('option',t(fa,enLabel));option.value=id;option.selected=settings.cadence===id;cadence.append(option);
 }
 const clock=el('input');clock.type='time';
 clock.value=String(Math.floor((settings.clockMinutes||0)/60)).padStart(2,'0')+':'+String((settings.clockMinutes||0)%60).padStart(2,'0');
 const retention=el('select');
 for(const d of [7,30,90,180,365]){
   const o=el('option',t('نگهداری ','Retain ')+d+t(' روز',' days'));
   o.value=String(d);o.selected=settings.retentionDays===d;retention.append(o);
 }
 const labels=[[t('تناوب','Cadence'),cadence],[t('ساعت تهران','Tehran time'),clock],
   [t('نگهداری لاگ','Error retention'),retention]];
 control.append(monitorLabel,loggingLabel);
 for(const [txt,input] of labels){const label=el('label',txt);label.append(input);control.append(label);}
 const save=el('button',t('ذخیره تنظیمات بدون اجرای خودکار','Save preferences without running jobs'));
 save.type='button';save.setAttribute('data-db-health-save','');
 save.addEventListener('click',async()=>{
   const parts=clock.value.split(':').map(Number);
   if(parts.length!==2||parts.some(x=>!Number.isInteger(x))||parts[0]>23||parts[1]>59){
     notice(t('ساعت معتبر وارد کنید.','Enter a valid time.'),true);return;
   }
   save.disabled=true;const generation=loadGeneration;
   try {
     await api('/database-health/settings',{method:'POST',
       headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},
       body:JSON.stringify({monitoringEnabled:monitor.checked,errorLoggingEnabled:logging.checked,
         cadence:cadence.value,clockMinutes:parts[0]*60+parts[1],retentionDays:Number(retention.value)})});
     if(generation!==loadGeneration||!snapshot)return;
     dbHealthCurrent=await api('/database-health');dbHealthExpanded=true;reportingRender();
     notice(t('تنظیمات ثبت شد؛ اجرای خودکار فعال یا نصب نشده است.',
       'Preferences saved; no automatic worker was installed or started.'));
   }catch(e){if(generation===loadGeneration)notice(errorMessage(e),true);}
   finally{if(save.isConnected)save.disabled=false;}
 });
 control.append(save);
 const preview=el('button',t('پیش‌نمایش حذف فقط خطاهای منقضی','Preview expired diagnostic log deletion'));
 preview.type='button';preview.setAttribute('data-db-health-purge-preview','');
 preview.addEventListener('click',async()=>{
   preview.disabled=true;const generation=loadGeneration;
   try {
     const result=await api('/database-health/purge-preview');
     if(generation!==loadGeneration||!snapshot)return;
     const count=result.eligibleCount;
     if(!Number.isInteger(count)||count===0){
       notice(t('خطای منقضی قابل حذف وجود ندارد.','No expired diagnostic error records are eligible.'));
       return;
     }
     if(!window.confirm(t('فقط '+count+' رکورد خطای منقضی واجد حذف شناسایی شده است. حداکثر ۱۰۰ مورد حذف شود؟ داده‌های تجاری و لاگ حسابرسی باقی می‌مانند.',
       'Up to '+Math.min(count,100)+' expired error groups can be deleted. Confirm deletion of at most 100? Commerce and audit records remain intact.')))return;
     const done=await api('/database-health/purge-expired',{method:'POST',
       headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},
       body:JSON.stringify({confirmation:'DELETE EXPIRED DATABASE LOGS'})});
     if(generation!==loadGeneration||!snapshot)return;
     dbHealthCurrent=await api('/database-health');dbHealthExpanded=true;reportingRender();
     notice(t('رکوردهای خطای منقضی حذف‌شده: ','Expired diagnostic error groups deleted: ')+done.deleted);
   }catch(e){if(generation===loadGeneration)notice(errorMessage(e),true);}
   finally{if(preview.isConnected)preview.disabled=false;}
 });
 control.append(preview);
 section.append(control);
 host.append(section);
}

async function collectionManualRefresh(scopeId,button){
 if(!snapshot||!csrf||collectionState?.canManage!==true||button.disabled)return;
 button.disabled=true;const generation=loadGeneration;
 try {
   const response=await api('/github-audits/refresh',{method:'POST',
     headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},
     body:JSON.stringify({scope:scopeId})});
   if(generation!==loadGeneration||!snapshot)return;
   githubAuditState=response.auditSnapshot;
   collectionState=githubAuditState.collection;
   collectionExpanded=true;githubAuditExpanded=true;
   reportingRender();
   notice(t('درخواست واکشی: ','Fetch attempts: ')+response.refresh.attempted+
     ' · '+t('ذخیره‌شده: ','Saved: ')+response.refresh.saved);
 }catch(e){if(generation===loadGeneration)notice(errorMessage(e),true);}
 finally{if(button.isConnected)button.disabled=false;}
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
  const automatic=collectionState.automaticCollection;
  const masterEnabled=automatic?.enabled===true;
  const master=el('p',t('کلید اصلی گردآوری خودکار: ','Automatic collector master switch: ')+
    (masterEnabled?t('روشن به تصمیم مدیر؛ Cron سرور همچنان تأییدنشده است',
      'Owner enabled; host Cron still unverified')
      :t('خاموش؛ Cron حتی با وجود تنظیمات قبلی نباید واکشی کند',
        'OFF; scheduled fetching remains blocked despite prior settings')));
  master.setAttribute('data-ops-collector-master-status',masterEnabled?'on':'off');
  box.append(master);
  const masterButton=el('button',masterEnabled?
    t('خاموش‌کردن گردآوری خودکار','Disable scheduled collection'):
    t('اجازه گردآوری خودکار (با تأیید مدیر)','Permit scheduled collection (owner confirmation)'));
  masterButton.type='button';masterButton.setAttribute('data-ops-collector-master-toggle','');
  masterButton.disabled=collectionState.canManage!==true;
  masterButton.addEventListener('click',async()=>{
    const enabled=!masterEnabled;
    if(!window.confirm(enabled?t(
      'برای فعال‌سازی نیاز به تصمیم صریح مدیر و Cron تأییدشده است. آیا اجازهٔ گردآوری زمان‌بندی‌شده را ثبت می‌کنید؟',
      'This enables the schedule policy only; host Cron still requires separate verification. Confirm owner permission?'):
      t('آیا کل گردآوری خودکار خاموش شود؟ واکشی دستی مستقل باقی می‌ماند.',
        'Disable all scheduled collection? Manual owner fetch remains available.')))return;
    masterButton.disabled=true;const generation=loadGeneration;
    try{
      collectionState=await api('/collection-automatic',{method:'POST',
        headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},
        body:JSON.stringify({enabled,confirmation:enabled?
          'ENABLE SCHEDULED COLLECTION':'DISABLE SCHEDULED COLLECTION'})});
      if(generation!==loadGeneration||!snapshot)return;
      collectionExpanded=true;reportingRender();
      notice(t('کلید اصلی ذخیره شد؛ نصب Cron همچنان جداگانه است.',
        'Owner master switch saved. Host Cron installation remains separate.'));
    }catch(e){if(generation===loadGeneration)notice(errorMessage(e),true);}
    finally{if(masterButton.isConnected)masterButton.disabled=false;}
  });
  box.append(masterButton);
  if(collectionState.attemptJournalStatus==='schema_not_provisioned')box.append(el('p',t('جدول ثبت تلاش‌های جمع‌آوری در این اتصال در دسترس نیست؛ نبود سابقه را نباید معادل اجرا نشدن دانست.','Collector attempt journal is unavailable on this connection; absence of history cannot prove a worker never ran.')));
  const collectors=Array.isArray(collectionState.rows)?collectionState.rows.filter(x=>x.type==='source'):[];
  const countState=(key,value)=>collectors.filter(x=>x[key]===value).length;
  const overview=el('p',t('منابع دارای گردآورنده: ','Registered collector sources: ')+collectors.length+
    ' · '+t('کش معتبر: ','Fresh cache: ')+countState('cacheState','fresh')+
    ' · '+t('کش منقضی: ','Expired cache: ')+countState('cacheState','stale')+
    ' · '+t('بدون تلاش ثبت‌شده: ','No recorded attempt: ')+countState('executionEvidence','never_observed')+
    ' · '+t('آخرین تلاش ناموفق: ','Last attempt failed: ')+countState('executionEvidence','last_attempt_failed')+
    ' · '+t('موعد گذشته، اجرای Cron تأییدنشده: ','Due, host Cron unverified: ')+countState('scheduleEvidence','due_unverified'));
  overview.className='ops-note';
  overview.setAttribute('data-ops-collector-summary','');
  box.append(overview);
  box.append(el('small',t('این ارقام فقط وضعیت رکوردهای ذخیره‌شده و زمان‌بندی منبع را نشان می‌دهند؛ نصب Cron، موفقیت اتصال خارجی یا دریافت ایمیل را تأیید نمی‌کنند.',
    'These counts describe stored records and source due dates only. They do not verify host Cron, provider connectivity or inbox delivery.')));
  const unmapped=collectionState.unmappedPolicies;
  if(unmapped?.status==='available'&&unmapped.count>0){
    const unknown=el('p',t('سیاست‌های ثبت‌شده بدون گردآورنده در این فهرست: ','Stored policies not consumed by these collectors: ')+
      unmapped.count+' · '+unmapped.ids.join('، '));
    unknown.className='ops-note';
    unknown.setAttribute('data-ops-unmapped-policies','');
    box.append(unknown);
    box.append(el('small',t('برای نمونه، http_access_log وظیفهٔ GitHub collector نیست. اجرای پایش لاگ به مسیر مجاز لاگ و Cron اختصاصی وابسته است؛ تنظیم ثبت‌شده آن را فعال نمی‌کند.',
      'For example, http_access_log is not a GitHub collector. Log monitoring requires a configured private log path and a separate CLI job; storing a policy does not activate it.')));
  }else if(unmapped?.status==='unavailable'){
    box.append(el('small',t('وجود سیاست‌های ناشناخته قابل بررسی نبود.','Unmapped policy inventory could not be checked.')));
  }


  const manual=el('button',t('تازه‌سازی فوری همهٔ منابع موجود',
    'Fetch all registered sources now'));manual.type='button';
  manual.setAttribute('data-ops-fetch-all','');
  manual.disabled=collectionState.canManage!==true;
  manual.addEventListener('click',()=>collectionManualRefresh('all',manual));
  box.append(manual);
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
   if(scope.type==='source'){
     const executionLabels={
       never_observed:[ 'هنوز تلاش ثبت‌شده‌ای ندارد', 'No attempt recorded yet' ],
       journal_unavailable:[ 'دفتر ثبت تلاش‌ها در دسترس نیست', 'Attempt journal unavailable' ],
       last_attempt_failed:[ 'آخرین تلاش ثبت‌شده ناموفق بود', 'Last recorded attempt failed' ],
       attempt_recorded:[ 'تلاش ثبت‌شده دارد؛ اجرای Cron ثابت نشده', 'Attempt recorded; Cron unverified' ],
       attempt_unknown:[ 'نتیجه تلاش ثبت‌شده نامشخص است', 'Recorded attempt outcome unknown' ]
     };
     const scheduleLabels={
       disabled:[ 'پایش این منبع غیرفعال است', 'This source is disabled' ],
       not_scheduled:[ 'برای این منبع موعد خودکار ثبت نشده', 'No automatic due time for this source' ],
       due_unverified:[ 'موعد گذشته؛ اجرای Cron تأیید نشده', 'Overdue; Cron execution unverified' ],
       scheduled_unverified:[ 'موعد آینده ثبت شده؛ Cron تأیید نشده', 'Future due time recorded; Cron unverified' ]
     };
     if(executionLabels[scope.executionEvidence]){
       const item=el('small',t(...executionLabels[scope.executionEvidence]));
       item.dataset.executionEvidence=scope.executionEvidence;line.append(item);
     }else{
       line.append(el('small',t('شاهد معتبر از اجرا در این پاسخ موجود نیست','Execution evidence not provided in this response')));
     }
     if(scheduleLabels[scope.scheduleEvidence]){
       const item=el('small',t(...scheduleLabels[scope.scheduleEvidence]));
       item.dataset.scheduleEvidence=scope.scheduleEvidence;line.append(item);
     }
     if(Number.isFinite(Number(scope.nextDue))&&Number(scope.nextDue)>0 &&
        scope.scheduleEvidence!=='disabled'){
       line.append(el('small',t('موعد ثبت‌شده: ','Recorded due: ')+date(scope.nextDue)));
     }
   }
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
   if(scope.type==='source'||(scope.type==='engine'&&scope.connected)){
     const single=el('button',scope.type==='engine'
       ?t('واکشی فوری فقط منابع این موتور','Fetch this engine’s sources now')
       :t('واکشی فوری فقط این منبع','Fetch only this source now'));
     single.type='button';single.setAttribute('data-ops-fetch-scope',scope.id);
     single.disabled=collectionState.canManage!==true;
     single.addEventListener('click',()=>collectionManualRefresh(scope.id,single));
     line.append(single);
     const purge=el('button',t('پیش‌نمایش حذف داده‌های تشخیصی این بخش',
       'Preview diagnostic data deletion for this scope'));
     purge.type='button';purge.disabled=collectionState.canManage!==true;
     purge.setAttribute('data-ops-delete-preview',scope.id);
     purge.addEventListener('click',async()=>{
       purge.disabled=true;const generation=loadGeneration;
       try{
         const preview=await api('/collection-data-preview?scope='+encodeURIComponent(scope.id));
         if(generation!==loadGeneration||!snapshot)return;
         const counts=preview.countsBounded||{};
         const total=(counts.cacheRows||0)+(counts.attemptRows||0)+(counts.metricRows||0);
         if(total===0){
           notice(t('دادهٔ تشخیصی برای حذف در این بخش موجود نیست.',
             'No disposable diagnostic records exist in this scope.'));
           return;
         }
         const message=t('فقط کش و سوابق تشخیصی '+scope.id+' حذف می‌شود. داده‌های تجاری، هویتی و لاگ حسابرسی محفوظ‌اند. تعداد قابل حذف (حداکثر): ',
           'Delete only caches and diagnostic history for '+scope.id+'. Business records, identities and audit logs are preserved. Eligible entries (bounded): ')+total+
           (preview.moreMayRemain?t(' یا بیشتر',' or more'):'');
         if(!window.confirm(message))return;
         const result=await api('/collection-data-delete',{method:'POST',
           headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},
           body:JSON.stringify({scope:scope.id,confirmation:'DELETE SOURCE DIAGNOSTICS:'+scope.id})});
         if(generation!==loadGeneration||!snapshot)return;
         collectionState=await api('/collection-settings');
         collectionExpanded=true;reportingRender();
         notice(t('حذف تشخیصی ثبت شد. مجموع ردیف‌ها: ','Scoped diagnostic cleanup complete. Rows: ')+
           Object.values(result.deleted||{}).reduce((sum,x)=>sum+Number(x||0),0));
       }catch(e){if(generation===loadGeneration)notice(errorMessage(e),true);}
       finally{if(purge.isConnected)purge.disabled=false;}
     });
     line.append(purge);
   }
   if(scope.lastFetchedAt)line.append(el('small',t('آخرین واکشی موفق: ','Last successful collection: ')+date(scope.lastFetchedAt)));
   if(scope.type==='source'&&scope.lastAttempt){
     const attempt=scope.lastAttempt;
     const outcome=attempt.result==='succeeded'
       ?t('داده پذیرفته و ذخیره شد','Result accepted and stored')
       :attempt.result==='failed'
         ?t('منبع داده معتبر نداد؛ نتیجه قبلی حفظ شد','Provider yielded no valid result; prior snapshot retained')
         :t('وضعیت نامشخص','Unknown result');
     line.append(el('small',t('آخرین تلاش: ','Last attempt: ')+date(attempt.attemptedAt)+' · '+outcome));
   }
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

let alertCenterExpanded=true,alertCenterCurrent=null,httpHealthCurrent=null;
let alertScopeKind='engine',alertScopeQuery='',alertScopesExpanded=false;
let responseMonitorCurrent=null,responseMonitorExpanded=false;
async function refreshAlertCenter(){
 const generation=loadGeneration;
 const next=await api('/alerts');
 if(generation!==loadGeneration||!snapshot)return;
 if(next.schema!=='operations-alert-center-v1')throw new Error('invalid_alert_center');
 alertCenterCurrent=next;alertCenterExpanded=true;reportingRender();
}
/**
 * Fixed-origin probes run from optional private Bertina Cron, never in page views.
 * The administrator can configure cadence, disable the sensor and request an
 * on-demand observation; historical data remains labeled as such.
 */
function renderResponseMonitor(host,model){
 const data=responseMonitorCurrent||model.responseHealth||null;
 const section=el('details',undefined,'ops-panel ops-response-monitor');
 section.id='ops-response-monitor';
 section.open=responseMonitorExpanded;
 section.addEventListener('toggle',()=>{responseMonitorExpanded=section.open;});
 section.append(el('summary',t('پایش امنیت HTTPS و ریدایرکت‌های تاریخی',
   'HTTPS security and historical redirect monitoring')));
 section.append(el('p',t(
   'این کنترل هدرها یا ریدایرکت‌های سایت را تغییر نمی‌دهد. تنها پاسخ آدرس‌های ازپیش‌تأییدشده را با زمان‌بندی خصوصی بررسی می‌کند.',
   'This control never changes live headers or redirects. It observes fixed approved URLs only through a private scheduled worker.')));
 const status=el('div',undefined,'ops-response-status');
 const policy=data?.settings;
 status.append(el('strong',t('وضعیت: ','State: ')+(data?.status||'not_available')),
   el('span',policy
     ?(policy.enabled?t('حسگر مجاز','Sensor enabled'):t('حسگر خاموش','Sensor disabled'))
     :t('جدول پایش نصب نشده','Monitor schema unavailable')));
 section.append(status);
 const reload=el('button',t('بارگیری شواهد ذخیره‌شده','Reload recorded observations'));
 reload.type='button';
 reload.addEventListener('click',async()=>{
   reload.disabled=true;const generation=loadGeneration;
   try{
     const result=await api('/response-health');
     if(generation!==loadGeneration||!snapshot)return;
     responseMonitorCurrent=result;responseMonitorExpanded=true;reportingRender();
   }catch(error){if(generation===loadGeneration)notice(errorMessage(error),true);}
   finally{if(reload.isConnected)reload.disabled=false;}
 });section.append(reload);
 if(policy&&data?.canManage===true){
   const settings=el('details',undefined,'ops-response-settings');
   settings.append(el('summary',t('تنظیم اختصاصی حسگر و زمان‌بندی','Configure this sensor and schedule')));
   const options=el('div',undefined,'ops-response-controls');
   const enabled=el('input');enabled.type='checkbox';enabled.checked=policy.enabled;
   const label=el('label',t('فعال بودن پایش','Enable observer'));label.prepend(enabled);
   const cadence=el('select');cadence.setAttribute('aria-label',t('تناوب','Cadence'));
   for(const [key,fa,enLabel] of [
     ['manual','فقط دستی','Manual only'],['daily','هر ۲۴ ساعت','Daily'],['weekly','هفتگی','Weekly']]){
     const item=el('option',t(fa,enLabel));item.value=key;cadence.append(item);
   }cadence.value=policy.cadence;
   const weekday=el('select');weekday.setAttribute('aria-label',t('روز هفته','Weekday'));
   for(let i=1;i<=7;i++){const option=el('option',t('روز ','Day ')+i);option.value=String(i);weekday.append(option);}
   weekday.value=String(policy.weekday);
   const clock=el('input');clock.type='time';
   clock.setAttribute('aria-label',t('زمان تهران','Tehran time'));
   clock.value=String(Math.floor(policy.clockMinutes/60)).padStart(2,'0')+':'+
     String(policy.clockMinutes%60).padStart(2,'0');
   const retention=el('select');retention.setAttribute('aria-label',t('روزهای نگهداری گزارش','Retention days'));
   for(const n of [7,30,90,180,365]){
     const item=el('option',t('نگهداری ','Keep ')+n+t(' روز',' days'));item.value=String(n);retention.append(item);
   }retention.value=String(policy.retentionDays);
   const save=el('button',t('ذخیره سیاست پایش','Save monitoring policy'));save.type='button';
   const request=el('button',t('درخواست بررسی در اجرای بعدی','Queue a new observation'));
   request.type='button';request.disabled=!policy.enabled;
   save.addEventListener('click',async()=>{
     const time=clock.value.split(':').map(Number);
     if(time.length!==2||time.some(n=>!Number.isInteger(n))||
        time[0]<0||time[0]>23||time[1]<0||time[1]>59){
       notice(t('ساعت انتخاب‌شده نامعتبر است','Invalid schedule time'),true);return;
     }
     const generation=loadGeneration;save.disabled=true;
     try{
       const result=await api('/response-health',{method:'POST',
         headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},
         body:JSON.stringify({enabled:enabled.checked,cadence:cadence.value,
           weekday:Number(weekday.value),clockMinutes:time[0]*60+time[1],
           retentionDays:Number(retention.value)})});
       if(generation!==loadGeneration||!snapshot)return;
       responseMonitorCurrent=result;responseMonitorExpanded=true;reportingRender();
       notice(t('سیاست حسگر ذخیره شد؛ اجرای CLI همچنان به تنظیم Cron نیاز دارد.',
         'Policy saved. Actual collection still requires the private Cron.'));
     }catch(error){if(generation===loadGeneration)notice(errorMessage(error),true);}
     finally{if(save.isConnected)save.disabled=false;}
   });
   request.addEventListener('click',async()=>{
     const generation=loadGeneration;request.disabled=true;
     try{
       const result=await api('/response-health',{method:'POST',
         headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},
         body:JSON.stringify({requestNow:true})});
       if(generation!==loadGeneration||!snapshot)return;
       responseMonitorCurrent=result;responseMonitorExpanded=true;reportingRender();
       notice(t('درخواست در صف ثبت شد؛ اجرای زنده هنوز رخ نداده است.',
         'Request queued. A live probe has not yet run.'));
     }catch(error){if(generation===loadGeneration)notice(errorMessage(error),true);}
     finally{if(request.isConnected)request.disabled=false;}
   });
   options.append(label,cadence,weekday,clock,retention,save,request);
   settings.append(options,el('small',t('ساعت بر اساس تهران است؛ داده قدیمی به‌معنای سلامت کنونی نیست.',
     'Schedule uses Tehran time. Historical observations are not current health.')));
   section.append(settings);
 }
 const recent=Array.isArray(data?.latest)?data.latest:[];
 if(recent.length){
   const list=el('ul',undefined,'ops-response-observations');
   for(const row of recent){
     const item=el('li');
     item.append(el('strong',row.id+' · '+(row.result||'unavailable')),
       el('small',t('آخرین بررسی: ','Last checked: ')+date(row.observedAt)+' · HTTP '+
         (row.responseCode??'—')+' · '+
         (row.fresh?t('داده تازه','Recent observation'):t('داده قدیمی','Stale observation'))));
     if(row.checks?.mandatory){
       const details=el('small',Object.entries(row.checks.mandatory)
         .map(([key,value])=>key+': '+(value?'pass':'missing')).join(' · '));
       item.append(details);
     }
     if(row.checks?.advisory){
       item.append(el('small',t('توصیه امنیتی: ','Security advisories: ')+
         Object.entries(row.checks.advisory)
           .map(([key,value])=>key+': '+(value?'present':'not observed')).join(' · ')));
     }
     list.append(item);
   }
   section.append(el('h4',t('نتیجه هفت بررسی از آخرین اجرای برنامه','Seven fixed probe observations from the last run')),list);
 }else section.append(el('p',t('هیچ مشاهده ثبت‌شده‌ای وجود ندارد؛ نتیجه نامعلوم است.',
   'No recorded observations. Actual runtime integrity is unknown.')));
 host.append(section);
}
function renderAlertCenter(host,model){
 const data=alertCenterCurrent||model.alertCenter||null;
 const activation=model.activationReadiness||null;
 const incidents=Array.isArray(data?.rows)?data.rows:[];
 const httpOverview=httpHealthCurrent||model.httpHealth||null;
 const newestHttpBatch=httpOverview?.state==='observed'&&httpOverview.batches?.length
   ?httpOverview.batches[0]:null;
 const weakPages=model.pageQualityOverview?.status==='source_only'
   ?model.pageQualityOverview.weakSeoPages:null;
 const critical=data?.openCounts?.critical??null;
 const warning=data?.openCounts?.warning??null;
 const section=el('details',undefined,'ops-panel');section.id='ops-alert-center';
 section.open=alertCenterExpanded;section.addEventListener('toggle',()=>{alertCenterExpanded=section.open;});
 section.append(el('summary',t('سلامت و اعلان‌های بحرانی سایت','Site health and critical incident alerts')));
 // Evidence-first P0 preflight (no implicit collection, DDL or host mutation).
 if(activation){
   const preflight=el('details',undefined,'ops-panel');
   preflight.append(el('summary',t('آمادگی دیتابیس مادر و Cron','Mother database and cron readiness')));
   const tables=activation.schemaInventory||{};
   preflight.append(el('p',t('جدول‌های موجود عملیات: ','Operations tables observed: ')+
     (tables.presentCount??'—')+' / '+(tables.requiredCount??'—')+
     ' · '+t('فقط بررسی نام جدول','table names only; not a migration check')));
   if(Array.isArray(tables.missing)&&tables.missing.length)
     preflight.append(el('p',t('جداول غایب: ','Missing tables: ')+tables.missing.join(', ')));
   const structure=tables.structure||{};
   preflight.append(el('p',t('بررسی ستون‌ها و ایندکس‌ها: ','Column/index preflight: ')+
     (structure.state||t('نامشخص','unknown'))+
     ' · '+t('ستون‌های بررسی‌شده: ','Columns inspected: ')+(structure.checkedColumns??'—')));
   for(const [key,titleFa,titleEn] of [
     ['missingColumns','ستون‌های غایب','Missing columns'],
     ['typeMismatches','مغایرت نوع ستون','Column type discrepancies'],
     ['missingIndexes','ایندکس‌های غایب','Missing indexes'],
     ['missingForeignKeys','کلیدهای خارجی غایب','Missing foreign keys'],
     ['storageDiscrepancies','مغایرت موتور ذخیره‌سازی یا Collation','Storage engine or collation discrepancies']
   ]){
     const problems=structure[key];
     if(Array.isArray(problems)&&problems.length){
       const group=el('details');
       group.append(el('summary',t(titleFa,titleEn)+' ('+problems.length+')'));
       const items=el('ul');
       for(const issue of problems.slice(0,80))items.append(el('li',issue));
       group.append(items);preflight.append(group);
     }
   }
   preflight.append(el('small',t(
     'این بررسی فقط تطبیق ساختاری است؛ سلامت داده‌ها، عملکرد برنامه و مهاجرت‌ها به آزمون نهایی نیاز دارند.',
     'Read-only source-schema shape comparison. Metadata matching does not prove data integrity, application behavior or successful migrations.')));
   const workerList=el('ul');
   for(const worker of activation.workers||[]){
     const last=worker.lastObservedAt===null?t('بدون شاهد','No evidence'):date(worker.lastObservedAt);
     workerList.append(el('li',worker.label+' — '+worker.state+' · '+
       t('آخرین شاهد: ','Latest observation: ')+last));
   }
   preflight.append(workerList,el('p',t(
     'شواهد موجود به معنی نصب Cron، تحویل ایمیل یا سلامت تأییدشده سرور نیست.',
     'Observations do not certify cron installation, inbox delivery or verified server health.')));
   section.append(preflight);
 }
 const first=el('div',undefined,'ops-alert-overview');
 const counts=[
   [t('رخداد بحرانی باز','Open critical incidents'),critical===null?'—':String(critical),'critical'],
   [t('هشدار باز','Open warnings'),warning===null?'—':String(warning),'warning'],
   [t('ایمیل و SMTP','Mail transport'),data?.mailReady?t('پیکربندی شده','Configured'):t('تأیید نشده','Unverified'),'neutral'],
   [t('مقصد ایمیل مدیر','Admin recipient'),data?.recipientConfigured?t('پیکربندی شده','Configured'):t('ثبت نشده','Not configured'),'neutral'],
   [t('صفحات سئوی ضعیف در کد','Weak source-SEO pages'),weakPages===null?'—':String(weakPages),'warning'],
   [t('خطاهای ۴۰۴ در آخرین خوانش','404 in last log batch'),newestHttpBatch?String(newestHttpBatch.notFound):'—','warning'],
   [t('خطاهای ۵۰۰ در آخرین خوانش','5xx in last log batch'),newestHttpBatch?String(newestHttpBatch.serverErrors):'—','critical']
 ];
 for(const [label,value,style] of counts){
   const box=el('div',undefined,'ops-alert-tile ops-alert-'+style);
   box.append(el('small',label),el('strong',value));first.append(box);
 }
 section.append(first);
 section.append(el('p',t(
   'رخدادها از جدول خصوصی ثبت می‌شوند و با نرخ محدود از طریق SMTP موجود اطلاع‌رسانی می‌شوند. وضعیت سلامت حقیقی تا تأیید پوشش هر حسگر معلوم نیست.',
   'Incidents are recorded in the private operations DB and sent through the existing SMTP transport with cooldown. Overall production health remains unknown until each sensor is verified.')));
 const button=el('button',t('تازه‌سازی خطاها و تاریخچه ایمیل','Refresh incidents and email history'));
 button.type='button';button.addEventListener('click',async()=>{
   button.disabled=true;try{await refreshAlertCenter();}
   catch(e){notice(errorMessage(e),true);}finally{if(button.isConnected)button.disabled=false;}
 });
 section.append(button);
 if(data?.status==='schema_not_provisioned'){
   section.append(el('p',t(
     'جداول اعلان در دیتابیس عملیاتی نصب نشده‌اند؛ هیچ هشدار فعالی فرض نمی‌شود.',
     'Alert tables are not provisioned. No operational email alert is claimed.')));
 }else if(data?.status==='available'){
   section.append(el('p',t('فعال‌سازی اعلان‌ها: ','Alert setting: ')+
     (data.enabled?t('مجاز؛ مشروط به حسگر و ارسال‌کننده','Enabled, subject to active sensors and worker'):t('خاموش','Disabled'))+
     ' · '+t('پردازش ایمیل: ','Mail worker: ')+(data.worker||'unknown')));
   const http=httpOverview;
   const httpPanel=el('details');httpPanel.id='ops-http-health';
   httpPanel.append(el('summary',t('خطاهای واقعی HTTP: ورودی‌های ۴۰۴ و خطاهای ۵۰۰',
     'Recorded HTTP errors: 404 entry routes and server 5xx')));
   httpPanel.append(el('p',t(
     'این بخش فقط داده‌های ثبت‌شده از لاگ خصوصی و مجاز برتینا را نمایش می‌دهد. بدون اتصال مسیر لاگ و فعال‌کردن پردازش CLI، پایش زنده انجام نمی‌شود.',
     'This panel displays only sanitized owner-authorized Bertina access-log data. Without a configured private log and CLI schedule there is no live monitoring.')));
   const indicator=http?.state==='observed'
     ?t('آخرین خوانش: ','Last processed: ')+date(http.lastObservedAt)
     :t('وضعیت حسگر: ','Sensor state: ')+(http?.state||t('نامشخص','Unknown'));
   httpPanel.append(el('p',indicator));
   const refreshHttp=el('button',t('دریافت وضعیت تازه لاگ ذخیره‌شده','Reload stored HTTP log status'));
   refreshHttp.type='button';refreshHttp.addEventListener('click',async()=>{
     refreshHttp.disabled=true;const generation=loadGeneration;
     try{
       const result=await api('/http-health');
       if(generation!==loadGeneration||!snapshot)return;
       httpHealthCurrent=result;alertCenterExpanded=true;reportingRender();
       $('ops-http-health').open=true;
     }catch(e){if(generation===loadGeneration)notice(errorMessage(e),true);}
     finally{if(refreshHttp.isConnected)refreshHttp.disabled=false;}
   });httpPanel.append(refreshHttp);
   if(['observed','stale'].includes(http?.state)&&Array.isArray(http.batches)){
     const chart=el('div',undefined,'ops-http-bars');
     chart.setAttribute('role','group');chart.setAttribute('aria-label',
       t('نمودار شمارش خطای ۴۰۴ و ۵۰۰','404 and 5xx error count chart'));
     const batches=http.batches.slice(0,12).reverse();
     const max=Math.max(1,...batches.flatMap(row=>[row.notFound||0,row.serverErrors||0]));
     for(const item of batches){
       const row=el('div',undefined,'ops-http-barrow');
       row.append(el('small',date(item.at)));
       for(const [value,label,klass] of [[item.notFound,t('۴۰۴','404'),'not-found'],
         [item.serverErrors,'5xx','server-error']]){
         const line=el('div',undefined,'ops-http-barline');
         line.append(el('small',label+': '+value));
         const track=el('div',undefined,'ops-http-track');
         const fill=el('span',undefined,'ops-http-fill ops-http-'+klass);
         fill.style.width=(Math.min(100,100*(value||0)/max))+'%';
         track.append(fill);line.append(track);row.append(line);
       }
       chart.append(row);
     }
     httpPanel.append(el('h4',t('۱۲ نوبت اخیر گردآوری','Last 12 collection batches')),chart);
     const list=el('ul',undefined,'ops-queue');
     for(const item of http.top404Routes||[]){
       const li=el('li');
       li.append(el('strong',item.route),el('small',
         t('تعداد: ','Count: ')+item.occurrences+' · '+
         t('آخرین رخداد: ','Last occurrence: ')+date(item.lastSeenAt)+' · '+
         (item.type==='scanner_probe'?t('اسکن مشکوک','Likely scanning probe'):
           t('نیازمند بررسی مقصد و ارزش بک‌لینک','Review for redirect or recovery'))));
       list.append(li);
     }
     httpPanel.append(el('h4',t('مسیرهای ۴۰۴ برای بررسی؛ بدون ریدایرکت خودکار',
       '404 routes to triage; no automatic redirects')),list);
   }
   section.append(httpPanel);
   if(data.canManage===true){
     const master=el('button',data.enabled?t('غیرفعال‌سازی ایمیل هشدار','Disable alert emails'):
       t('فعال‌سازی ایمیل هشدار','Enable alert emails'));
     master.type='button';master.addEventListener('click',async()=>{
       master.disabled=true;
       try{
         const next=await api('/alert-rules',{method:'POST',
           headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},
           body:JSON.stringify({eventCode:'all',enabled:!data.enabled,threshold:1,cooldownMinutes:60})});
         alertCenterCurrent=next;alertCenterExpanded=true;reportingRender();
       }catch(e){notice(errorMessage(e),true);}finally{if(master.isConnected)master.disabled=false;}
     });section.append(master);
   }
   const rules=el('details');
   rules.append(el('summary',t('نوع خطا، پوشش حسگر و تنظیم هر هشدار','Event types, sensor coverage and notification rules')));
   const ul=el('ul',undefined,'ops-queue');
   for(const rule of data.rules||[]){
     const li=el('li');
     li.append(el('strong',rule.name),el('small',
       ' · '+rule.severity+' · '+t('حسگر: ','Sensor: ')+rule.sensorState));
     li.append(el('small',t('آستانه: ','Threshold: ')+rule.threshold+
       ' · '+t('فاصله ایمیل: ','Email cooldown: ')+rule.cooldownMinutes+
       t(' دقیقه',' minutes')+' · '+(rule.enabled?t('فعال','Enabled'):t('غیرفعال','Disabled'))));
     if(data.canManage===true){
       const controls=el('div',undefined,'ops-toolbar');
       const toggle=el('input');toggle.type='checkbox';toggle.checked=rule.enabled;
       const label=el('label',t('فعال','Enabled'));label.prepend(toggle);
       const threshold=el('input');threshold.type='number';threshold.min='1';threshold.max='100';
       threshold.value=String(rule.threshold);
       threshold.setAttribute('aria-label',t('حداقل رخداد','Minimum events'));
       const cooldown=el('input');cooldown.type='number';cooldown.min='15';cooldown.max='1440';
       cooldown.value=String(rule.cooldownMinutes);
       cooldown.setAttribute('aria-label',t('فاصله ارسال به دقیقه','Cooldown minutes'));
       const save=el('button',t('ذخیره تنظیم هشدار','Save alert rule'));save.type='button';
       save.addEventListener('click',async()=>{
         const n=Number(threshold.value),m=Number(cooldown.value);
         if(!Number.isInteger(n)||n<1||n>100||!Number.isInteger(m)||m<15||m>1440){
           notice(t('حد آستانه یا فاصله ایمیل نامعتبر است.','Invalid threshold or cooldown.'),true);return;
         }
         save.disabled=true;try{
           alertCenterCurrent=await api('/alert-rules',{method:'POST',
             headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},
             body:JSON.stringify({eventCode:rule.code,enabled:toggle.checked,threshold:n,cooldownMinutes:m})});
           alertCenterExpanded=true;reportingRender();
         }catch(e){notice(errorMessage(e),true);}
         finally{if(save.isConnected)save.disabled=false;}
       });
       controls.append(label,threshold,cooldown,save);li.append(controls);
     }
     ul.append(li);
   }rules.append(ul);section.append(rules);
   const scopeData=data.scopeControls;
   const scopePanel=el('details',undefined,'ops-alert-scope-panel');
   scopePanel.id='ops-alert-email-controls';
   scopePanel.open=alertScopesExpanded;
   scopePanel.addEventListener('toggle',()=>{alertScopesExpanded=scopePanel.open;});
   scopePanel.append(el('summary',t('تنظیم مستقل ایمیل هر موتور، قابلیت و منبع',
     'Independent email controls for each engine, capability and source')));
   scopePanel.append(el('p',t(
     'خاموش‌کردن ایمیل، موتور یا ثبت رخداد را خاموش نمی‌کند. ایمیل هر بخش علاوه بر کلید عمومی و نوع خطا بررسی می‌شود. منابع بدون حسگر فعال ایمیل واقعی ارسال نمی‌کنند.',
     'Disabling email does not stop the engine or its incident ledger. A scope switch, global switch and event policy all gate delivery. Sources without an active sensor cannot generate an alert.')));
   if(scopeData?.status==='available'&&Array.isArray(scopeData.rows)){
     const items=scopeData.rows,controls=el('div',undefined,'ops-toolbar');
     const kind=el('select');kind.setAttribute('aria-label',t('گروه قابلیت','Scope group'));
     for(const [value,label] of [
       ['engine',t('۱۳ موتور اصلی','13 main engines')],
       ['feature',t('قابلیت‌های داخلی','Existing capabilities')],
       ['source',t('ابزارهای خارجی و منابع','External tools and feeds')]]){
       const opt=el('option',label);opt.value=value;kind.append(opt);
     }
     kind.value=alertScopeKind;
     const query=el('input');query.type='search';
     query.setAttribute('aria-label',t('جستجوی قابلیت','Search capability'));
     query.placeholder=t('نام قابلیت یا شناسه','Name or identifier');
     query.value=alertScopeQuery;
     controls.append(kind,query);scopePanel.append(controls);
     const list=el('div',undefined,'ops-alert-scope-list');
     const status=el('p',undefined,'ops-muted');scopePanel.append(status,list);
     const renderRows=()=>{
       list.replaceChildren();
       const q=alertScopeQuery.trim().toLocaleLowerCase();
       const filtered=items.filter(scope=>
         scope.kind===alertScopeKind &&
         (!q||(scope.id+' '+scope.nameFa+' '+scope.nameEn).toLocaleLowerCase().includes(q)));
       status.textContent=t('نتیجه: ','Showing: ')+filtered.length+'/'+
         items.filter(scope=>scope.kind===alertScopeKind).length+
         ' · '+t('خاموش/روشن‌کردن صرفاً مربوط به ارسال ایمیل است',
                'Toggle applies to email delivery only');
       for(const scope of filtered){
         const row=el('div',undefined,'ops-alert-scope-row');
         const label=el('div');
         label.append(el('strong',en?scope.nameEn:scope.nameFa),
           el('small',scope.id+' · '+(scope.parent||'ENG master')));
         label.append(el('small',scope.available
           ?t('قابلیت در کد تعریف شده؛ ایمیل وابسته به شواهد است',
              'Capability registered; emails still require incident evidence')
           :t('پایش زنده این بخش هنوز تأیید نشده',
              'No independently verified incident sensor for this component')));
         const indicator=el('span',scope.emailEnabled?
           t('ایمیل مجاز','Email allowed'):t('ایمیل خاموش','Email disabled'),
           'ops-alert-state');
         row.append(label,indicator);
         if(data.canManage===true){
           const toggle=el('button',scope.emailEnabled?
             t('خاموش کردن ایمیل','Turn off email'):t('روشن کردن ایمیل','Turn on email'));
           toggle.type='button';
           toggle.setAttribute('aria-label',(scope.emailEnabled?
             t('غیرفعال‌سازی اعلان ','Disable emails for '):
             t('فعال‌سازی اعلان ','Enable emails for '))+(en?scope.nameEn:scope.nameFa));
           toggle.addEventListener('click',async()=>{
             toggle.disabled=true;const generation=loadGeneration;
             try{
               const updated=await api('/alert-scopes',{method:'POST',
                 headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},
                 body:JSON.stringify({scopeId:scope.id,enabled:!scope.emailEnabled})});
               if(generation!==loadGeneration||!snapshot)return;
               alertCenterCurrent={...data,scopeControls:updated};
               alertScopesExpanded=true;reportingRender();
               $('ops-alert-email-controls')?.scrollIntoView({block:'nearest'});
             }catch(error){if(generation===loadGeneration)notice(errorMessage(error),true);}
             finally{if(toggle.isConnected)toggle.disabled=false;}
           });
           row.append(toggle);
         }
         list.append(row);
       }
       if(!filtered.length)list.append(el('p',t('موردی یافت نشد','No matching scope')));
     };
     kind.addEventListener('change',()=>{alertScopeKind=kind.value;renderRows();});
     query.addEventListener('input',()=>{alertScopeQuery=query.value;renderRows();});
     renderRows();
   }else scopePanel.append(el('p',t(
     'کنترل‌های ایمیل اختصاصی به نصب جدول مربوط در دیتابیس مادر نیاز دارند.',
     'Scope-level email controls require provisioning the unified database table.')));
   section.append(scopePanel);
   const history=el('details');history.append(el('summary',t('تاریخچه خطا و وضعیت ارسال','Incident and email delivery history')));
   const list=el('ul',undefined,'ops-queue');
   for(const incident of incidents.slice(0,30)){
     const li=el('li');
     li.append(el('strong',incident.eventCode+' · '+incident.severity),
       el('small',t('مؤلفه: ','Component: ')+incident.scope+
         ' · '+t('آخرین مشاهده: ','Last seen: ')+date(incident.lastSeenAt)+
         ' · '+t('تکرار: ','Occurrences: ')+incident.occurrences+
         ' · '+incident.state));list.append(li);
   }
   history.append(list);
   const emails=el('ul',undefined,'ops-queue');
   for(const mail of data.recentEmails||[]){
     const li=el('li',mail.eventCode+' · '+mail.state+' · '+
       date(mail.acceptedAt||mail.attemptedAt||mail.createdAt));emails.append(li);
   }
   history.append(el('h4',t('خروجی SMTP (نه تحویل قطعی صندوق)','SMTP outcomes, not inbox-delivery proof')),emails);
   section.append(history);
   const finder=el('details',undefined,'ops-panel');
   finder.append(el('summary',t('جستجو و فیلتر تاریخچه رخدادها','Search and filter incident history')));
   const toolbar=el('div',undefined,'ops-toolbar');
   const choices=(label,options)=>{
     const field=el('select');field.setAttribute('aria-label',label);
     for(const [value,title] of options){const item=el('option',title);item.value=value;field.append(item);}
     return field;
   };
   const severity=choices(t('شدت','Severity'),[
     ['all',t('همه شدت‌ها','All severities')],['critical','Critical'],['warning','Warning']]);
   const state=choices(t('وضعیت','State'),[
     ['all',t('همه وضعیت‌ها','All states')],['open','Open'],
     ['acknowledged','Acknowledged'],['resolved','Resolved']]);
   const days=choices(t('بازه زمانی','Time window'),[
     ['1',t('۲۴ ساعت','24 hours')],['7',t('۷ روز','7 days')],
     ['30',t('۳۰ روز','30 days')],['90',t('۹۰ روز','90 days')],
     ['180',t('۱۸۰ روز','180 days')],['365',t('یک سال','One year')]]);
   days.value='30';
   const search=el('button',t('نمایش رخدادها','Load incidents'));search.type='button';
   const results=el('div');results.setAttribute('aria-live','polite');
   let page=1;
   const searchHistory=async()=>{
     search.disabled=true;const generation=loadGeneration;
     const params=new URLSearchParams({severity:severity.value,state:state.value,
       days:days.value,page:String(page)});
     try{
       const data=await api('/alert-history?'+params);
       if(generation!==loadGeneration||!snapshot)return;
       if(data.schema!=='operations-incident-history-v1')throw Error('invalid_incident_history');
       results.replaceChildren();
       results.append(el('p',t('تعداد رخدادهای ثبت‌شده: ','Recorded incidents: ')+
         (data.total??'—')));
       const exportButton=el('button',t('خروجی CSV همین صفحه (حداکثر ۵۰ رخداد)',
           'Download this history page as CSV (max 50 incidents)'));
       exportButton.type='button';
       exportButton.addEventListener('click',()=>{
         if(workspaceVisibleForExport()){
           exportOperationsCsv('site-incidents-page-'+page+'.csv',
             ['event_code','scope','severity','state','occurrences','first_seen_at','last_seen_at'],
             (data.records||[]).map(item=>[
               item.eventCode,item.scope,item.severity,item.state,item.occurrences,
               item.firstSeenAt,item.lastSeenAt]));
         }
       });
       results.append(exportButton);
       const list=el('ul');
       for(const item of data.records||[]){
         list.append(el('li',item.eventCode+' · '+item.severity+' · '+item.state+
           ' · '+item.scope+' · '+date(item.lastSeenAt)+
           ' · '+t('دفعات: ','Count: ')+item.occurrences));
       }
       results.append(list);
       if(data.pageCount>1){
         const pager=el('nav',undefined,'ops-source-pager');
         const previous=el('button',t('قبلی','Previous'));previous.disabled=page<=1;
         previous.addEventListener('click',()=>{page--;searchHistory();});
         const next=el('button',t('بعدی','Next'));next.disabled=page>=data.pageCount;
         next.addEventListener('click',()=>{page++;searchHistory();});
         pager.append(previous,el('span',page+' / '+data.pageCount),next);results.append(pager);
       }
     }catch(e){if(generation===loadGeneration)notice(errorMessage(e),true);}
     finally{if(search.isConnected)search.disabled=false;}
   };
   search.addEventListener('click',()=>{page=1;searchHistory();});
   toolbar.append(severity,state,days,search);
   finder.append(toolbar,results,el('small',t(
     'این جستجو فقط رخدادهای ثبت‌شده در دیتابیس را نشان می‌دهد؛ لاگ خام یا شواهد مستقل سرور نیست.',
     'Search covers stored incident events only, not raw access logs or independent host evidence.')));
   section.append(finder);
 }
 host.append(section);
}
let qualityExpanded=false,qualityResult=null,qualityDetail=null;
let qualityFilters={dimension:'onPageSeo',language:'all',index:'all',sort:'weakest',query:'',page:1};
const qualityNames={
 content:['محتوا','Content'],image:['تصاویر','Images'],
 onPageSeo:['سئوی درون‌صفحه','On-page SEO'],technicalSeo:['سئوی فنی منبع','Source technical SEO'],
 ui:['رابط کاربری','UI'],ux:['تجربه کاربری','UX'],
 accessibility:['دسترس‌پذیری ساختاری','Source accessibility'],aiReadiness:['آمادگی AI','AI readiness'],
 geo:['GEO','GEO'],schema:['داده‌های ساخت‌یافته','Schema.org'],
 speed:['سرعت آزمایشگاهی معتبر','Observed lab speed'],
 mobile:['آمادگی موبایل','Mobile source readiness'],security:['هدرهای امنیتی','Security headers']
};
const qualityName=key=>t(...(qualityNames[key]||[key,key]));
const qualityScore=value=>typeof value==='number'&&Number.isFinite(value)?value.toFixed(1):'—';
async function loadQualityIndex(){
 const generation=loadGeneration;
 const qs=new URLSearchParams(Object.entries(qualityFilters).map(([key,value])=>[key,String(value)]));
 const result=await api('/page-quality?'+qs.toString());
 if(generation!==loadGeneration||!snapshot)return;
 if(result.schema!=='operations-page-quality-results-v1')throw new Error('invalid_quality_inventory');
 qualityResult=result;qualityDetail=null;qualityExpanded=true;reportingRender();
 $('ops-page-quality')?.scrollIntoView({block:'start'});
}
function renderPageQuality(host){
 const section=el('details',undefined,'ops-panel');section.id='ops-page-quality';
 section.open=qualityExpanded;section.addEventListener('toggle',()=>{qualityExpanded=section.open;});
 section.append(el('summary',t('امتیاز مستقل هر صفحه؛ محتوای فارسی و انگلیسی، سئو و تجربه کاربری',
   'Per-page quality: independent content, SEO, UX, AI and technical dimensions')));
 section.append(el('p',t(
   'امتیازها به‌جز سرعت آزمایشگاهی معتبر، برآورد ساختاری HTML مخزن هستند. نمره سرعت فقط برای صفحه‌ای نشان داده می‌شود که مشاهده تازه PageSpeed داشته باشد؛ داده واقعی کاربران، هدر HTTP و حضور در پاسخ AI بدون شاهد معتبر «—» است.',
   'Scores are static-source heuristics except valid dated PageSpeed mobile lab observations for explicitly measured pages. Real-user speed, HTTP security headers and AI appearances remain unavailable without evidence.')));
 const form=el('div',undefined,'ops-toolbar');
 function select(options,current,label,onChange){
   const element=el('select');element.setAttribute('aria-label',label);
   for(const [value,caption] of options){const option=el('option',caption);option.value=value;element.append(option);}
   element.value=current;element.addEventListener('change',()=>{onChange(element.value);});
   return element;
 }
 const categories=Object.keys(qualityNames).map(key=>[key,qualityName(key)]);
 const category=select(categories,qualityFilters.dimension,t('معیار مرتب‌سازی','Score dimension'),
   value=>{qualityFilters.dimension=value;qualityFilters.page=1;});
 const language=select([['all',t('همه زبان‌ها','All languages')],['fa','فارسی'],['en','English'],['other',t('سایر','Other')]],
   qualityFilters.language,t('زبان','Language'),value=>{qualityFilters.language=value;qualityFilters.page=1;});
 const index=select([['all',t('تمام صفحات','All pages')],['public',t('صفحات عمومی','Public pages')],
   ['private',t('صفحات خصوصی','Private pages')]],qualityFilters.index,t('نوع صفحه','Indexing scope'),
   value=>{qualityFilters.index=value;qualityFilters.page=1;});
 const sort=select([['weakest',t('ضعیف‌ترین نخست','Weakest first')],
   ['strongest',t('قوی‌ترین نخست','Strongest first')],
   ['route',t('ترتیب آدرس','Route order')],
   ['editorial_priority',t('اولویت موضوعی و نقص منبع','Route theme and source gap priority')]],
   qualityFilters.sort,t('ترتیب','Sort'),
   value=>{qualityFilters.sort=value;qualityFilters.page=1;});
 const search=el('input');search.type='search';search.value=qualityFilters.query;
 search.placeholder=t('جستجوی آدرس صفحه','Filter page URLs');
 search.setAttribute('aria-label',t('آدرس صفحه','Page URL'));
 search.addEventListener('input',()=>{qualityFilters.query=search.value;qualityFilters.page=1;});
 const load=el('button',t('نمایش فهرست و نمره‌های صفحات','Load page quality list'));load.type='button';
 load.addEventListener('click',async()=>{
   load.disabled=true;try{await loadQualityIndex();}
   catch(e){notice(errorMessage(e),true);}finally{if(load.isConnected)load.disabled=false;}
 });
 form.append(category,language,index,sort,search,load);section.append(form);
 if(qualityResult?.status==='source_only'){
   const data=qualityResult;
   const count=el('p',t('صفحات فهرست‌شده: ','Matching pages: ')+data.total+
     ' · '+t('کل صفحات HTML بررسی‌شده در مخزن: ','Source HTML pages: ')+data.pagesScanned+
     ' · '+t('صفحات عمومی با سئوی منبعی ضعیف (کمتر از ۶): ','Weak public source-SEO pages (<6): ')+data.weakSeoSourcePages);
   section.append(count);
   const exportButton=el('button',t('خروجی CSV همین صفحه از جدول کیفیت','Download this quality-table page as CSV'));
   exportButton.type='button';
   exportButton.addEventListener('click',()=>{
     if(!workspaceVisibleForExport())return;
     exportOperationsCsv('site-page-quality-'+data.page+'.csv',
       ['route','language','indexability',...data.dimensions],
       data.records.map(record=>[
         record.route,record.language,record.indexability,
         ...data.dimensions.map(key=>record.grades?.[key]??'')
       ]));
   });
   section.append(exportButton,el('small',t(
     'تنها ردیف‌های صفحه فعلی (حداکثر ۵۰ مورد) خروجی گرفته می‌شوند؛ مقادیر ناشناخته خالی می‌مانند.',
     'Exports currently loaded rows only (up to 50); unavailable grades remain blank.')));
   const wrap=el('div',undefined,'ops-table-wrap ops-page-quality-scroll');
   const table=el('table',undefined,'ops-table ops-quality-table');
   const heading=el('thead'),hr=el('tr');
   hr.append(el('th',t('صفحه','Page')));
   for(const dimension of data.dimensions)hr.append(el('th',qualityName(dimension)));
   heading.append(hr);table.append(heading);
   const body=el('tbody');
   for(const record of data.records){
     const row=el('tr');
     const urlCell=el('td');
     const open=el('button',record.route);open.type='button';
     open.className='ops-route-button';
     open.addEventListener('click',async()=>{
       open.disabled=true;
       const generation=loadGeneration;
       try{
         const result=await api('/page-quality/detail?route='+encodeURIComponent(record.route));
         if(generation!==loadGeneration||!snapshot)return;
         qualityDetail=result.record||null;qualityExpanded=true;reportingRender();
         $('ops-quality-detail')?.scrollIntoView({block:'nearest'});
       }catch(e){if(generation===loadGeneration)notice(errorMessage(e),true);}
       finally{if(open.isConnected)open.disabled=false;}
     });
     urlCell.append(open,el('small',record.language+' · '+(record.indexability||'')));
     if(record.editorialPriority){
       urlCell.append(el('small',t('اولویت بررسی منبع: ','Source review priority: ')+
         record.editorialPriority.reviewOrderValue+
         ' · '+record.editorialPriority.routeTheme));
     }
     row.append(urlCell);
     for(const dimension of data.dimensions){
       const score=record.grades?.[dimension];
       const cell=el('td');
       const chip=el('span',qualityScore(score),'ops-quality-score');
       chip.setAttribute('aria-label',qualityName(dimension)+': '+(score===null?t('اندازه‌گیری نشده','Not measured'):score+'/10'));
       cell.append(chip);
       if(typeof score==='number'){
         const gauge=el('div',undefined,'ops-quality-gauge');
         gauge.setAttribute('role','meter');gauge.setAttribute('aria-valuemin','0');
         gauge.setAttribute('aria-valuemax','10');gauge.setAttribute('aria-valuenow',String(score));
         gauge.setAttribute('aria-label',qualityName(dimension));
         const fill=el('span');fill.style.width=(score*10)+'%';gauge.append(fill);
         cell.append(gauge);
       }
       row.append(cell);
     }body.append(row);
   }table.append(body);wrap.append(table);section.append(wrap);
   const nav=el('nav',undefined,'ops-source-pager');
   const prev=el('button',t('قبلی','Previous'));prev.type='button';
   prev.disabled=data.page<=1;prev.addEventListener('click',async()=>{
      qualityFilters.page=data.page-1;try{await loadQualityIndex();}catch(e){notice(errorMessage(e),true);}
   });
   const next=el('button',t('بعدی','Next'));next.type='button';
   next.disabled=data.page>=data.pageCount;next.addEventListener('click',async()=>{
      qualityFilters.page=data.page+1;try{await loadQualityIndex();}catch(e){notice(errorMessage(e),true);}
   });
   nav.append(prev,el('span',t('صفحه ','Page ')+data.page+' / '+data.pageCount),next);section.append(nav);
 }
 if(qualityDetail){
   const detail=el('article',undefined,'ops-panel');detail.id='ops-quality-detail';
   detail.append(el('h3',t('بررسی مستقل: ','Page breakdown: ')+qualityDetail.route));
   detail.append(el('p',t('امتیاز کلی آمادگی منبعی: ','Overall source readiness: ')+
     qualityScore(qualityDetail.overallSourceReadiness)+' / 10'));
   const dims=el('div',undefined,'ops-grid');
   for(const key of Object.keys(qualityNames)){
      const grade=qualityDetail.grades?.[key];if(!grade)continue;
     const card=el('section',undefined,'ops-card');
     card.append(el('h3',qualityName(key)+' · '+qualityScore(grade.score)+' / 10'),
       el('small',t('نوع شاهد: ','Evidence: ')+(grade.source||'unavailable')));
     if(grade.findings?.length){
       const list=el('ul');
       for(const finding of grade.findings)list.append(el('li',finding));
       card.append(list);
     }else card.append(el('small',grade.score===null?t('داده موجود نیست','Not measured'):
       t('ایرادی در معیارهای بررسی‌شده ثبت نشده','No failed source check in this dimension')));
     dims.append(card);
   }
   const speed=qualityDetail.performanceReadiness?.score;
   detail.append(dims,el('p',t('آمادگی منبعی عملکرد (نه سرعت واقعی): ','Source performance readiness (not live speed): ')+
     qualityScore(speed)+' / 10'));
   detail.append(el('small',qualityDetail.limitations||''));
   section.append(detail);
 }
 if(qualityResult?.status==='unavailable')section.append(el('p',t(
   'فهرست امتیازها هنوز در بسته خصوصی سرور آماده نشده است.',
   'Private page-quality source inventory has not been generated.')));
 host.append(section);
}

let masterConsoleExpanded=false;
let sourceDirectoryState=null,sourceDirectoryExpanded=false,sourceDirectoryPage=0,sourceControlState=null,sourceMetricState=null;
let sourceDirectoryFilter={kind:'',engine:'',query:''};
async function fetchSourceDirectory(engineId=''){
 const generation=loadGeneration;
 if(engineId&&sourceDirectoryState?.schema==='operations-source-directory-v1'){
   sourceDirectoryFilter.engine=engineId;sourceDirectoryPage=0;sourceDirectoryExpanded=true;reportingRender();
   $('ops-source-directory')?.scrollIntoView({block:'start'});
   return;
 }
 const data=await api('/source-directory');
 if(generation!==loadGeneration||!snapshot)return;
 if(data.schema!=='operations-source-directory-v1'||!Array.isArray(data.sources))
   throw new Error('invalid_directory');
 sourceDirectoryState=data;
 if(engineId){sourceDirectoryFilter.engine=engineId;sourceDirectoryPage=0;}
 sourceDirectoryExpanded=true;reportingRender();
 $('ops-source-directory')?.scrollIntoView({block:'start'});
}
/**
 * The existing private operations controller owns this read-only source
 * directory. No separate dashboard, credential manager, or provider polling.
 */
function renderSourceDirectory(parent){
 const section=el('details',undefined,'ops-panel');
 section.id='ops-source-directory';
 section.open=sourceDirectoryExpanded;
 section.addEventListener('toggle',()=>{sourceDirectoryExpanded=section.open;});
 section.append(el('summary',t('دایرکتوری یکپارچه منابع، شبکه‌های اجتماعی و پایش‌ها',
   'Unified source directory: providers, social channels and monitors')));
 section.append(el('p',t(
   'این فهرست، منابع ثبت‌شده را از داده‌های واقعی جدا می‌کند. صرفاً با تعریف یک وب‌سایت یا حساب، آمار زنده ایجاد نمی‌شود.',
   'This inventory separates registered references from observed data. Listing a website or account does not create live statistics.')));
 const loadButton=el('button',t('دریافت وضعیت واقعی منابع از سرور','Load source status from server'));
 const loadControls=el('button',t('بارگیری تنظیمات فعال/غیرفعال و نگهداری منابع',
   'Load enable/disable and retention settings'));
 loadControls.type='button';
 loadControls.addEventListener('click',async()=>{
   loadControls.disabled=true;const generation=loadGeneration;
   try{
     const settings=await api('/source-controls');
     if(generation!==loadGeneration||!snapshot)return;
     sourceControlState=settings;sourceDirectoryExpanded=true;
     if(!sourceDirectoryState)await fetchSourceDirectory();
     else reportingRender();
   }catch(e){if(generation===loadGeneration)notice(errorMessage(e),true);}
   finally{if(loadControls.isConnected)loadControls.disabled=false;}
 });
 loadButton.type='button';
 const stats=el('p',undefined,'ops-muted');stats.setAttribute('aria-live','polite');
 const filters=el('div',undefined,'ops-toolbar');
 const list=el('div',undefined,'ops-grid');
 const pager=el('nav',undefined,'ops-source-pager');
 pager.setAttribute('aria-label',t('صفحه‌بندی منابع','Source pagination'));
 const metricDetail=el('div',undefined,'ops-source-metric-detail-wrap');
 function renderCards(){
   list.replaceChildren();metricDetail.replaceChildren();
   const data=sourceDirectoryState;
   if(!data||!Array.isArray(data.sources))return;
   const q=sourceDirectoryFilter.query.trim().toLocaleLowerCase();
   const matches=data.sources.filter(item=>
     (!sourceDirectoryFilter.kind||item.kind===sourceDirectoryFilter.kind)&&
     (!sourceDirectoryFilter.engine||item.engineId===sourceDirectoryFilter.engine)&&
     (!q||(item.name+' '+item.id+' '+item.engineId).toLocaleLowerCase().includes(q)));
   const perPage=12;
   const pageCount=Math.max(1,Math.ceil(matches.length/perPage));
   sourceDirectoryPage=Math.min(sourceDirectoryPage,pageCount-1);
   const visible=matches.slice(sourceDirectoryPage*perPage,(sourceDirectoryPage+1)*perPage);
   const counts=data.counts||{};
   stats.textContent=t('منابع ثبت‌شده: ','Registered entries: ')+(counts.total??'—')+
     ' · '+t('فیدهای GitHub با کش تازه: ','GitHub feeds with fresh cache: ')+
     (counts.freshGithubFeeds??'—')+' / '+(counts.githubCollectionFeeds??'—')+
     ' · '+t('اتصالات مستقل تأییدشده: ','Independently verified third-party connections: ')+
     (counts.verifiedThirdPartyConnections??'—')+
     ' · '+t('نمایش: ','Shown: ')+matches.length+
     (data.catalogueStatus!=='complete'
       ?' · '+t('فهرست ناقص است','Catalogue is incomplete'):'');
   for(const item of visible){
     const card=el('article',undefined,'ops-card');
     const kindLabel=item.kind==='social_channel'?t('شبکه اجتماعی','Social channel'):
       item.kind==='github_feed'?t('گزارش GitHub','GitHub feed'):
       t('مرجع خارجی','External reference');
     card.append(el('h3',item.name),el('small',item.engineId+' · '+kindLabel));
     const state=item.status==='cached_fresh'
       ?t('کش تاریخ‌دار موجود است؛ نه تأیید محیط تولید','Dated cache available; not production certification')
       :item.status==='disabled'?t('گردآوری غیرفعال','Collection disabled')
       :item.status==='not_fresh'?t('داده تازه موجود نیست','No fresh observation')
       :item.status==='unverified'?t('اتصال احراز نشده','Unverified integration')
       :t('داده معتبر موجود نیست','No verified data');
     card.append(el('p',state),el('small',t('آخرین دریافت: ','Last observation: ')+
       (item.observedAt?date(item.observedAt):t('ثبت نشده','Not recorded'))));
     if(item.adapterState)card.append(el('small',
       t('وضعیت اتصال فنی: ','Adapter: ')+item.adapterState));
     if(item.permissionState)card.append(el('small',
       t('مجوز اتصال: ','Provider permission: ')+item.permissionState));
     card.append(el('small',t('سهمیه API: ','API quota: ')+
       (item.apiQuota??t('تأیید نشده','Not verified'))));
     card.append(el('small',t('هزینه تأییدشده: ','Verified cost: ')+
       (item.verifiedCost??t('تأیید نشده','Not verified'))));
     if(item.accessPath)card.append(el('small',
       t('مسیر دسترسی موردنیاز: ','Required access path: ')+item.accessPath));
     if(item.kind==='social_channel'){
       const accounts=item.storedVerifiedStatusAccountRows;
       const recent=item.recentStoredDeliveryRecords;
       card.append(el('small',t('حساب‌های دارای پرچم تأیید در دیتابیس: ','Account rows marked verified: ')+
         (accounts===null||accounts===undefined?t('نامشخص','Unknown'):String(accounts))));
       card.append(el('small',t('رکورد ارسال از آخرین ۲۵ رکورد سامانه: ','Deliveries among latest 25 stored records: ')+
         (recent===null||recent===undefined?t('نامشخص','Unknown'):String(recent))));
       if(item.lastStoredDeliveryAt)card.append(el('small',t('آخرین رکورد داخلی: ','Last local record: ')+date(item.lastStoredDeliveryAt)));
       card.append(el('small',t(
         'این اعداد فقط وضعیت ثبت‌شده در دیتابیس‌اند، نه رسید رسمی پلتفرم یا آمار بازدید.',
         'Stored database counts are not provider receipts, verified access, or audience statistics.')));
     }
     if(item.kind==='github_feed'){
       if(item.lastAttemptAt)card.append(el('small',t('آخرین تلاش: ','Last attempt: ')+date(item.lastAttemptAt)+
         ' · '+(item.lastAttemptResult||t('نامشخص','Unknown'))));
       if(item.lastCollectedAt)card.append(el('small',t('آخرین ذخیره: ','Last stored: ')+date(item.lastCollectedAt)));
       if(item.nextDueAt)card.append(el('small',t('زمان برنامه‌ریزی‌شده: ','Scheduled due: ')+date(item.nextDueAt)));
       if(item.cadence)card.append(el('small',t('تناوب: ','Cadence: ')+item.cadence));
     }
     if(item.lastError)card.append(el('small',t('آخرین خطا: ','Last error: ')+item.lastError));
     if(item.limitation)card.append(el('p',item.limitation));
     const url=safeEvidenceUrl(item.url);
     if(url&&url.startsWith('https://')){
       const link=el('a',t('منبع رسمی','Official source'));link.href=url;
       link.target='_blank';link.rel='noopener noreferrer';card.append(link);
     }
     const control=sourceControlState?.rows?.find(row=>row.id===item.id);
     if(control){
       const editor=el('details',undefined,'ops-source-config');
       editor.append(el('summary',t('تنظیمات مستقل گردآوری، زمان‌بندی و نگهداری',
         'Independent collection, scheduling and retention controls')));
       editor.append(el('p',control.adapterAvailable
         ?t('گردآورنده GitHub تعریف شده است؛ اجرا به مجوز و Cron موجود وابسته است.',
            'GitHub collector exists; actual execution still requires permissions and the existing Cron.')
         :t('گردآورنده/API تأیید نشده است؛ روشن کردن فقط قصد پایش را ثبت می‌کند.',
            'No verified collector/API. Enabling records monitoring intent only.')));
       const enabled=el('input');enabled.type='checkbox';enabled.checked=control.enabled;
       enabled.disabled=sourceControlState.canManage!==true;
       const label=el('label',t('فعال','Enabled'));label.prepend(enabled);
       const cadence=el('select');cadence.setAttribute('aria-label',t('تناوب جمع‌آوری','Collection cadence'));
       for(const [id,fa,enLabel] of [['manual','دستی','Manual'],['daily','هر ۲۴ ساعت','Daily'],
         ['weekly','هفتگی','Weekly']]){
         const opt=el('option',t(fa,enLabel));opt.value=id;cadence.append(opt);
       }cadence.value=control.cadence;
       const weekday=el('select');weekday.setAttribute('aria-label',t('روز هفته','Day of week'));
       for(let n=1;n<=7;n++){const opt=el('option',t('روز ','Day ')+n);opt.value=String(n);weekday.append(opt);}
       weekday.value=String(control.weekday);
       const time=el('input');time.type='time';
       const min=Number(control.clockMinutes)||0;
       time.value=String(Math.floor(min/60)).padStart(2,'0')+':'+String(min%60).padStart(2,'0');
       time.setAttribute('aria-label',t('زمان تهران','Tehran schedule time'));
       const retention=el('select');retention.setAttribute('aria-label',t('روزهای نگهداری داده','Retention days'));
       for(const days of [7,30,90,180,365]){
         const opt=el('option',t('نگهداری ','Keep ')+days+t(' روز',' days'));opt.value=String(days);retention.append(opt);
       }retention.value=String(control.retentionDays);
       const save=el('button',t('ذخیره تنظیم این منبع','Save source policy'));save.type='button';
       save.disabled=sourceControlState.canManage!==true;
       save.addEventListener('click',async()=>{
         const parts=time.value.split(':').map(Number);
         if(parts.length!==2||parts.some(n=>!Number.isInteger(n))
            ||parts[0]<0||parts[0]>23||parts[1]<0||parts[1]>59){
           notice(t('ساعت انتخاب‌شده معتبر نیست','Invalid schedule time'),true);return;
         }
         const generation=loadGeneration;save.disabled=true;
         try{
           sourceControlState=await api('/source-controls',{method:'POST',
             headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},
             body:JSON.stringify({sourceId:item.id,enabled:enabled.checked,cadence:cadence.value,
               weekday:Number(weekday.value),clockMinutes:parts[0]*60+parts[1],
               retentionDays:Number(retention.value)})});
           if(generation!==loadGeneration||!snapshot)return;
           sourceDirectoryExpanded=true;reportingRender();
           notice(t('تنظیم منبع در دیتابیس مادر ذخیره شد.','Source setting saved in the primary database.'));
         }catch(e){if(generation===loadGeneration)notice(errorMessage(e),true);}
         finally{if(save.isConnected)save.disabled=false;}
       });
       const toolbar=el('div',undefined,'ops-toolbar');
       toolbar.append(label,cadence,weekday,time,retention,save);editor.append(toolbar);
       if(control.nextDueAt)editor.append(el('small',t('زمان بعدی: ','Next due: ')+date(control.nextDueAt)));
       editor.append(el('small',t('وضعیت اجرا: ','Runtime state: ')+control.runtimeState));
       if(sourceControlState.canManage===true){
         const purge=el('button',t('حذف فقط داده‌های تشخیصی منقضی‌شده','Purge eligible diagnostic data'));
         purge.type='button';
         purge.addEventListener('click',async()=>{
           if(!window.confirm(t('فقط داده‌های تشخیصی قدیمی و قابل حذف این منبع پاک شوند؟',
             'Purge only retention-eligible diagnostic data for this source?')))return;
           purge.disabled=true;
           try{
             const result=await api('/source-retention',{method:'POST',
               headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},
               body:JSON.stringify({sourceId:item.id})});
             notice(t('نمونه‌های پاک‌شده: ','Metric rows purged: ')+result.deletedMetrics+
               ' · '+t('تلاش‌های قدیمی: ','Old attempts: ')+result.deletedAttempts);
           }catch(e){notice(errorMessage(e),true);}
           finally{if(purge.isConnected)purge.disabled=false;}
         });editor.append(purge);
       }
       card.append(editor);
     }
     const metrics=el('button',t('آمار مستند و نمودار این منبع','Recorded metrics and chart'));
     metrics.type='button';
     metrics.addEventListener('click',async()=>{
       metrics.disabled=true;const generation=loadGeneration;
       try{
         const report=await api('/source-metrics?sourceId='+encodeURIComponent(item.id)+'&days=30');
         if(generation!==loadGeneration||!snapshot)return;
         sourceMetricState=report;sourceDirectoryExpanded=true;reportingRender();
         $('ops-source-metric-detail')?.scrollIntoView({block:'nearest'});
       }catch(e){if(generation===loadGeneration)notice(errorMessage(e),true);}
       finally{if(metrics.isConnected)metrics.disabled=false;}
     });card.append(metrics);
     if(item.kind==='github_feed'){
       const button=el('button',t('تنظیم و تاریخچه گردآوری','Collection policy and history'));
       button.type='button';button.addEventListener('click',async()=>{
         const generation=loadGeneration;button.disabled=true;
         try{
           collectionState=await api('/collection-settings');
           if(generation!==loadGeneration||!snapshot)return;
           collectionExpanded=true;sourceDirectoryExpanded=true;reportingRender();
           const scope=item.id.replace(/^collector:/,'');
           const row=[...document.querySelectorAll('[data-collector-scope]')]
             .find(element=>element.dataset.collectorScope===scope);
           if(row)row.scrollIntoView({block:'center'});
         }catch(e){if(generation===loadGeneration)notice(errorMessage(e),true);}
         finally{if(button.isConnected)button.disabled=false;}
       });card.append(button);
     }
     list.append(card);
   }
   if(!matches.length)list.append(el('p',t('منبعی مطابق فیلتر یافت نشد.','No matching sources.')));
   if(sourceMetricState&&sourceMetricState.sourceId&&visible.some(row=>row.id===sourceMetricState.sourceId)){
     const detail=el('article',undefined,'ops-panel');detail.id='ops-source-metric-detail';
     detail.append(el('h3',t('آمار ثبت‌شده: ','Recorded source metrics: ')+sourceMetricState.sourceId));
     detail.append(el('p',t('دوره: ','Period: ')+sourceMetricState.days+
       t(' روز؛ تعداد نمونه: ',' days; samples: ')+(sourceMetricState.samples?.length??0)));
     if(sourceMetricState.samples?.length){
       const samples=sourceMetricState.samples.slice(0,20).reverse();
       const chart=el('div',undefined,'ops-source-metric-chart');
       for(const sample of samples){
         const row=el('div',undefined,'ops-source-metric-row');
         const amount=Number(sample.metric_value);
         row.append(el('small',date(sample.observed_at)+' · '+sample.metric_key+' = '+amount+' '+sample.unit));
         if(sample.metric_key==='fetch_success'){
           const track=el('div',undefined,'ops-http-track');
           const fill=el('span',undefined,'ops-http-fill ops-http-not-found');
           fill.style.width=(amount>0?'100':'0')+'%';track.append(fill);row.append(track);
         }chart.append(row);
       }detail.append(chart);
     }else detail.append(el('p',t('نمونه‌ای ثبت نشده است؛ داده ناموجود صفر نیست.',
       'No observations recorded; missing data is not zero.')));
     detail.append(el('small',sourceMetricState.limitation||''));
     metricDetail.append(detail);
   }

   pager.replaceChildren();
   if(pageCount>1){
     const prev=el('button',t('صفحه قبل','Previous page'));prev.type='button';
     prev.disabled=sourceDirectoryPage===0;
     prev.addEventListener('click',()=>{sourceDirectoryPage--;renderCards();});
     const indicator=el('span',t('صفحه ','Page ')+(sourceDirectoryPage+1)+' / '+pageCount);
     indicator.setAttribute('aria-live','polite');
     const next=el('button',t('صفحه بعد','Next page'));next.type='button';
     next.disabled=sourceDirectoryPage>=pageCount-1;
     next.addEventListener('click',()=>{sourceDirectoryPage++;renderCards();});
     pager.append(prev,indicator,next);
   }
 }
 if(sourceDirectoryState?.schema==='operations-source-directory-v1'){
   const kind=el('select');kind.setAttribute('aria-label',t('نوع منبع','Source kind'));
   for(const [id,fa,enLabel] of [['','همه منابع','All sources'],
     ['external_reference','ابزارهای خارجی','External references'],
     ['social_channel','شبکه‌های اجتماعی','Social channels'],
     ['github_feed','پایش GitHub','GitHub monitoring']]){
       const option=el('option',t(fa,enLabel));option.value=id;kind.append(option);
   }
   kind.value=sourceDirectoryFilter.kind;
   kind.addEventListener('change',()=>{sourceDirectoryFilter.kind=kind.value;sourceDirectoryPage=0;renderCards();});
   const engines=el('select');engines.setAttribute('aria-label',t('موتور مسئول','Responsible engine'));
   const all=el('option',t('همه موتورها','All engines'));all.value='';engines.append(all);
   for(const engineId of [...new Set(sourceDirectoryState.sources.map(item=>item.engineId).filter(Boolean))].sort()){
     const opt=el('option',engineId);opt.value=engineId;engines.append(opt);
   }
   engines.value=sourceDirectoryFilter.engine;
   engines.addEventListener('change',()=>{sourceDirectoryFilter.engine=engines.value;sourceDirectoryPage=0;renderCards();});
   const search=el('input');search.type='search';
   search.placeholder=t('جستجو در نام و شناسه منبع','Search source names and IDs');
   search.setAttribute('aria-label',t('جستجوی منبع','Search sources'));
   search.value=sourceDirectoryFilter.query;
   search.addEventListener('input',()=>{sourceDirectoryFilter.query=search.value;sourceDirectoryPage=0;renderCards();});
   filters.append(kind,engines,search);
   renderCards();
 }else{
   stats.textContent=t('برای مشاهده وضعیت هر منبع، دریافت از سرور را انتخاب کنید.',
     'Load the private directory to view individual source states.');
 }
 loadButton.addEventListener('click',async()=>{
   const generation=loadGeneration;loadButton.disabled=true;
   stats.textContent=t('در حال دریافت داده محافظت‌شده…','Loading protected data…');
   try{
     await fetchSourceDirectory();
   }catch(error){
     if(generation===loadGeneration){
       stats.textContent=t('فهرست منابع در دسترس نیست. وضعیت قبلی تأیید نشده است.',
         'Source inventory unavailable. No previous state is certified.');
       notice(errorMessage(error),true);
     }
   }finally{if(loadButton.isConnected)loadButton.disabled=false;}
 });
 section.append(loadButton,loadControls,stats,filters,list,pager,metricDetail);
 parent.append(section);
}

/**
 * Engine command surface inside the EXISTING authenticated ENG-13 controller.
 * An eligible command uses the already-audited action-runs endpoint; every
 * unsupported command remains explicitly unavailable, never simulated.
 */
function renderMasterEngineConsole(host,model){
 const engines=Array.isArray(model.engines)?model.engines:[];
 const actions=Array.isArray(model.actionReports)?model.actionReports:[];
 const providers=Array.isArray(model.providerInventory?.providers)?model.providerInventory.providers:[];
 const directorySources=Array.isArray(sourceDirectoryState?.sources)?sourceDirectoryState.sources:[];
 const discovered=Array.isArray(model.existingFeatureInventory?.features)?model.existingFeatureInventory.features:[];
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
 wrap.append(el('p',t('قابلیت‌های پراکنده کشف‌شده از کد: ',
   'Existing features discovered in source: ')+
   (model.existingFeatureInventory?.status==='source_inventory'
     ?discovered.length:t('هنوز فهرست نشده','Not indexed'))+
   ' · '+t('این‌ها موتور جدید نیستند و حضور در کد به معنای سلامت عملیاتی نیست.',
   'These are not new engines and source presence does not certify runtime health.')));
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
   const allRegistered=directorySources.filter(source=>source.engineId===engine.id);
   const ownedFeatures=discovered.filter(feature=>feature.engineId===engine.id);
   card.append(el('h3',engine.id+' · '+engineName(engine)),
     el('p',t('گزارش تأییدشده: ','Verified reports: ')+
       (engine.completedReportIds?.length??0)+' / '+
       ((engine.completedReportIds?.length??0)+(engine.pendingReportIds?.length??0))),
     el('small',t('اقدام‌های دارای مجری: ','Executable observations: ')+
       executable.length+' / '+owned.length),
     el('small',t('منابع مرجع خارجی: ','External references: ')+
       candidateCount+' · '+t('اتصالات زنده تأییدنشده','No verified live connections')),
     el('small',t('منابع تجمیعی موتور: ','Aggregated source entries: ')+
       (sourceDirectoryState?.catalogueStatus==='complete'?String(allRegistered.length):t('برای مشاهده، فهرست را بارگیری کنید','Load source directory'))));
   const open=el('button',t('گزارش این موتور','Open engine report'));open.type='button';
   open.addEventListener('click',()=>{
     reportingView.level='engine';reportingView.engine=engine.id;
     reportingRender();
     $('ops-reporting')?.scrollIntoView({block:'start'});
   });card.append(open);
   const engineMailPolicy=(alertCenterCurrent?.scopeControls?.rows||
     model.alertCenter?.scopeControls?.rows||[])
       .find(scope=>scope.id==='engine:'+engine.id);
   if(engineMailPolicy){
     card.append(el('small',t('ایمیل رخداد این موتور: ','Incident email for this engine: ')+
       (engineMailPolicy.emailEnabled?t('مجاز','Allowed'):t('خاموش','Off'))));
     if((alertCenterCurrent||model.alertCenter)?.canManage===true){
       const mail=el('button',engineMailPolicy.emailEnabled?
         t('خاموش کردن ایمیل این موتور','Disable this engine’s emails'):
         t('فعال‌کردن ایمیل این موتور','Enable this engine’s emails'));
       mail.type='button';
       mail.addEventListener('click',async()=>{
         const generation=loadGeneration;mail.disabled=true;
         try{
           const updated=await api('/alert-scopes',{method:'POST',
             headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},
             body:JSON.stringify({scopeId:'engine:'+engine.id,
               enabled:!engineMailPolicy.emailEnabled})});
           if(generation!==loadGeneration||!snapshot)return;
           const current=alertCenterCurrent||model.alertCenter;
           alertCenterCurrent={...current,scopeControls:updated};
           reportingRender();
         }catch(error){if(generation===loadGeneration)notice(errorMessage(error),true);}
         finally{if(mail.isConnected)mail.disabled=false;}
       });card.append(mail);
     }
   }
   if(ownedFeatures.length){
     const hidden=el('details');hidden.className='ops-existing-features';
     hidden.append(el('summary',t('قابلیت‌های دیگر این موتور: ',
       'Other capabilities of this engine: ')+ownedFeatures.length));
     const features=el('ul',undefined,'ops-queue');
     for(const feature of ownedFeatures){
       const li=el('li');
       const jump=el('button',en?feature.nameEn:feature.nameFa);
       jump.type='button';
       jump.addEventListener('click',()=>{
         const target=$(feature.adminTarget);if(!target)return;
         for(let parent=target;parent;parent=parent.parentElement)
           if(parent.tagName==='DETAILS')parent.open=true;
         target.scrollIntoView({block:'start'});
       });
       li.append(jump,el('small',
         (feature.sourceState==='source_present'
           ?t('در کد شناسایی شده','Present in source'):t('منبع ناقص','Incomplete source'))+
         ' · '+t('اجرای زنده تأیید نشده','Runtime not verified')+
         ' · '+t('سیاست: ','Policy: ')+feature.controlPolicy));
       features.append(li);
     }
     hidden.append(features);card.append(hidden);
   }
   if(engine.id==='ENG-08'||engine.id==='ENG-09'){
     const editor=el('button',t('استودیوی ویرایش محتوا و رسانه','Content and media workbench'));
     editor.type='button';
     editor.addEventListener('click',()=>document.dispatchEvent(
       new Event('jr:open-editor-workbench')));
     card.append(editor);
   }
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
   const resources=el('button',t('منابع تجمیعی این موتور','Aggregated sources for this engine'));
   resources.type='button';
   resources.addEventListener('click',async()=>{
     const generation=loadGeneration;resources.disabled=true;
     try{await fetchSourceDirectory(engine.id);}
     catch(error){if(generation===loadGeneration)notice(errorMessage(error),true);}
     finally{if(resources.isConnected)resources.disabled=false;}
   });
   card.append(resources);
   if(candidateCount){
     const references=el('button',t('فهرست ابزارهای مرجع','Reference tools directory'));
     references.type='button';
     references.addEventListener('click',()=>{
       const panel=$('ops-free-resources');if(!panel)return;
       panel.open=true;document.dispatchEvent(new CustomEvent('jr:admin-provider-engine',
         {detail:{engineId:engine.id}}));
       panel.scrollIntoView({block:'start'});
     });
     card.append(references);
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

/**
 * Existing owner-MFA workspace, redesigned as a truthful command surface.
 * No visitors, Cron activation, background fetches, educational logic or
 * third-party integrations are started by rendering this overview.
 */
/**
 * Keep ONLY aggregate non-identifying fields in the extra command center.
 * Full MFA-only API results belong to their existing specialty workspaces.
 */
function ownerCockpitProject(id,raw){
 const r=raw&&typeof raw==='object'?raw:{};
 switch(id){
  case 'commerce':return {available:r.available===true,
    orders:{totalRows:r.orders?.totalRows??null},
    salesPipeline:{pendingOlderThan24Hours:r.salesPipeline?.pendingOlderThan24Hours??null}};
  case 'social':return {deliveryDataStatus:r.deliveryDataStatus,
    deliveryRows:{total:r.deliveryRows?.total??null,
      uncertain:r.deliveryRows?.uncertain??null,
      manualPending:r.deliveryRows?.manualPending??null}};
  case 'socialSettings':return {draftAllowedCount:r.settings&&typeof r.settings==='object'
    ?Object.values(r.settings).filter(x=>x?.draftEnabled===true).length:null};
  case 'gsc':return {status:r.status,metrics:{clicks:r.metrics?.clicks??null,
    impressions:r.metrics?.impressions??null},collectedAtUtc:r.collectedAtUtc??null,
    provenanceAttested:r.provenanceAttested===true};
  case 'ai':return {status:r.status,sampledAnswers:r.sampledAnswers??null,
    brandMentions:r.brandMentions??null,retrievedOn:r.retrievedOn??null};
  case 'audit':return {schema:r.schema,eventCount:Array.isArray(r.events)?r.events.length:null};
  case 'journal':return {schema:r.schema,
    evidenceReview:{unverifiedStageCount:r.evidenceReview?.unverifiedStageCount??null}};
  case 'growth':return {leadMetrics:{counts:{total:r.leadMetrics?.counts?.total??null}},
    serviceSalesPipeline:r.serviceSalesPipeline?{
      awaitingAction:r.serviceSalesPipeline.awaitingAction??null,
      awaitingOver24Hours:r.serviceSalesPipeline.awaitingOver24Hours??null}:null};
  case 'keyword':return {schema:r.schema,
    keywordCount:Array.isArray(r.keywords)?r.keywords.length:null};
  case 'free':return {schema:r.schema,
    referenceCount:Array.isArray(r.resources)?r.resources.length:null};
  default:return {schema:r.schema??null,status:'not_projected'};
 }
}
let ownerCockpitFilter='all',ownerCockpitQuery='',ownerCockpitShowAll=false;
let ownerCockpitPrivateEvidence=Object.create(null);
let ownerCockpitLastReadAt=null,ownerCockpitReadErrors=Object.create(null),
    ownerCockpitStopRequested=false;
function renderOwnerCommandCenter(){
 const workspace=$('ops-workspace'),model=snapshot?.reporting;
 if(!workspace||workspace.hidden||!model)return;
 let root=$('ops-command-center');
 if(!root){
  root=el('section',undefined,'ops-master-cockpit');
  root.id='ops-command-center';
  root.setAttribute('aria-label',t('فرماندهی یکپارچه مدیر سایت','Unified owner command center'));
  workspace.insertBefore(root,workspace.querySelector('.ops-jump')||workspace.firstChild);
 }
 root.replaceChildren();
 const state=(kind,metric,note)=>({kind,metric,note});
 const absent=(message=t('نیازمند بارگیری داده','Load recorded data'))=>
   state('unknown',message,t('هیچ وضعیت عملیاتی تأیید نشده است','No runtime state has been independently verified'));
 const alertData=alertCenterCurrent||model.alertCenter;
 const alertCritical=alertData?.openCounts?.critical;
 const alertWarning=alertData?.openCounts?.warning;
 const incident=(typeof alertCritical==='number'&&typeof alertWarning==='number')
   ?state(alertCritical>0||alertWarning>0?'attention':'recorded',
     t('بحرانی: ','Critical: ')+alertCritical+' · '+t('هشدار: ','Warnings: ')+alertWarning,
     t('تعداد رویدادهای ثبت‌شده؛ نه اثبات سلامت کل سایت',
       'Recorded incident counts, not proof of total site health')):absent();
 const db=dbHealthCurrent;
 const dbAttention=Array.isArray(db?.checks)
   ?db.checks.filter(x=>x.state==='attention').length:null;
 const dbOverview=db
   ?state(dbAttention>0?'attention':db?.connection==='available'?'recorded':'unknown',
     t('اتصال: ','Connection: ')+(db.connection==='available'
       ?t('پاسخ داده','Responded'):t('نامشخص','Unknown'))+
       ' · '+t('موارد قابل بررسی: ','Checks to review: ')+(dbAttention??'—'),
     t('نتیجه آخرین بررسی دستی؛ نه تأیید سلامت فیزیکی MySQL',
       'Last owner-requested metadata scan; not physical MySQL integrity proof'))
   :absent(t('هنوز بررسی دستی نشده','Not manually checked'));
 const response=responseMonitorCurrent||model.responseHealth;
 const responseOverview=response?.settings
   ?state(response.settings.enabled?'recorded':'paused',
      response.settings.enabled?t('سیاست حسگر مجاز؛ Cron تأییدنشده','Sensor policy allowed; Cron unverified'):
        t('حسگر غیرفعال','Sensor disabled'),
      t('نتیجه اجرای واقعی را از تاریخچه نمونه‌ها بررسی کنید',
        'Use dated samples, not the policy alone, to verify observations'))
   :absent(t('سیاست حسگر نامشخص','Sensor policy unknown'));
 const http=httpHealthCurrent||model.httpHealth;
 const httpOverview=http&&['observed','stale'].includes(http.state)
   ?state(http.state==='stale'?'attention':'recorded',
      http.state==='stale'?t('گزارش منقضی','Stale observations'):
      t('داده HTTP ثبت‌شده','HTTP observations recorded'),
      t('ثبت ۴۰۴ و خطاها وابسته به شواهد واقعی سرور است',
        '404 and error counts depend on real server evidence'))
   :absent(t('شاهد HTTP موجود نیست','HTTP evidence unavailable'));
 const collector=collectionState?.automaticCollection;
 const sources=Array.isArray(collectionState?.rows)
   ?collectionState.rows.filter(x=>x.type==='source'):[];
 const collectorOverview=collector
   ?state(collector.enabled?'attention':'paused',
      collector.enabled?t('کلید زمان‌بندی مجاز؛ Cron نامشخص','Schedule permitted; Cron unverified'):
        t('کلید اصلی جمع‌آوری خودکار خاموش','Automatic collection master is OFF'),
      t('گردآورنده‌های موجود: ','Registered collectors: ')+sources.length+
      ' · '+t('کش تازه: ','Fresh caches: ')+
      sources.filter(x=>x.cacheState==='fresh').length)
   :absent(t('کلید اصلی هنوز خوانده نشده','Master switch not loaded'));
 const directory=sourceDirectoryState;
 const sourcePolicies=Array.isArray(sourceControlState?.rows)?sourceControlState.rows:null;
 const policyEnabled=sourcePolicies?sourcePolicies.filter(x=>x.enabled===true).length:null;
 const directoryOverview=directory
   ?state('recorded',t('منابع فهرست‌شده: ','Catalogued sources: ')+
      (directory.counts?.total??directory.sources?.length??'—')+
      ' · '+t('منابع با گزینهٔ مجاز: ','Sources with allowed setting: ')+
      (policyEnabled===null?'—':policyEnabled),
     t('این تعداد ممکن است شامل مقدار پیش‌فرض باشد؛ بدون کلید اصلی و Cron تأییدشده هیچ واکشی خودکاری نتیجه نمی‌شود',
       'Counts may include default preferences; without owner master enable and verified Cron no automatic fetching is proven'))
   :absent(t('فهرست منابع بارگیری نشده','Source directory not loaded'));
 const quality=model.pageQualityOverview;
 const qualityOverview=quality?.status==='source_only'
   ?state((quality.weakSeoPages??0)>0?'attention':'recorded',
      t('صفحات: ','Pages: ')+(quality.pages??'—')+
      ' · '+t('سئوی منبعی ضعیف: ','Weak source SEO: ')+(quality.weakSeoPages??'—'),
      t('نمره‌ها صرفاً برآورد کد HTML هستند؛ نه رتبه گوگل',
        'Static HTML heuristics only; not verified Google rankings'))
   :absent(t('فهرست کیفیت تولید نشده','Page quality inventory unavailable'));
 const engines=Array.isArray(model.engines)?model.engines:[];
 const actions=Array.isArray(model.actionReports)?model.actionReports:[];
 const runnable=actions.filter(a=>a.supportedExecutor?.type==='readonly_snapshot'
       &&a.supportedExecutor?.writes===false).length;
 const engineOverview=state('recorded',
   t('موتورها: ','Engines: ')+engines.length+' · '+t('خوانش مجاز: ','Permitted reads: ')+runnable+
   ' / '+actions.length,
   t('ثبت یک اقدام به معنی وجود اجراکننده آن نیست',
     'Registered actions do not imply operational executors'));
 const verified=Number(snapshot.summary?.verified);
 const allReports=Number(snapshot.summary?.total);
 const reportingOverview=state('recorded',
   t('تکمیل تأییدشده: ','Verified complete: ')+
     (Number.isFinite(verified)?verified:'—')+' / '+
     (Number.isFinite(allReports)?allReports:'—'),
   t('مطابق شواهد نسخه و زمان گزارش؛ بدون حدس از وضعیت زنده',
     'From release-scoped recorded evidence, not inferred live completion'));
 const unknown=absent(t('داده عملیاتی بارگیری نشده','Operational data not loaded'));
 const commerce=ownerCockpitPrivateEvidence.commerce;
 const commerceOverview=commerce?.available===true&&commerce.orders?
   state((commerce.salesPipeline?.pendingOlderThan24Hours??0)>0?'attention':'recorded',
     t('سفارش‌های ثبت‌شده: ','Stored orders: ')+(commerce.orders.totalRows??'—')+
       ' · '+t('در انتظار قدیمی: ','Aged pending: ')+(commerce.salesPipeline?.pendingOlderThan24Hours??'—'),
     t('دفتر سفارش، گواه وصول قطعی بانکی نیست',
       'Order ledger is not independently verified bank settlement')):
   absent(t('گزارش داخلی فروش موجود نیست','Commerce ledger not available'));
 const social=ownerCockpitPrivateEvidence.social;
 const socialSettings=ownerCockpitPrivateEvidence.socialSettings;
 const optedDraftChannels=socialSettings?.draftAllowedCount??null;
 const socialOverview=social?.deliveryDataStatus==='stored_records_only'&&social.deliveryRows?
   state(social.deliveryRows.uncertain>0||social.deliveryRows.manualPending>0?'attention':'recorded',
     t('سوابق انتشار: ','Stored deliveries: ')+(social.deliveryRows.total??'—')+
       ' · '+t('نیازمند رسیدگی: ','Need review: ')+
       ((social.deliveryRows.uncertain??0)+(social.deliveryRows.manualPending??0))+
       ' · '+t('کانال‌های پیش‌نویس مجاز: ','Draft-permitted channels: ')+
       (optedDraftChannels===null?'—':optedDraftChannels),
     t('تنظیم پیش‌نویس، انتشار خودکار یا اتصال زنده را فعال نمی‌کند',
       'Draft preferences do not enable automatic publishing or live accounts')):
   absent(t('داده قابل‌اتکای انتشار موجود نیست','Social delivery evidence unavailable'));
 const gsc=ownerCockpitPrivateEvidence.gsc;
 const gscOverview=gsc?.status==='locally_validated_unattested'?
   state('recorded',
     t('کلیک ثبت‌شده: ','Recorded clicks: ')+(gsc.metrics?.clicks??'—')+
       ' · '+t('نمایش: ','Impressions: ')+(gsc.metrics?.impressions??'—'),
     t('فایل خصوصی محلی؛ منشأ گوگل مستقلاً تأیید نشده · زمان: ',
       'Privately supplied, Google provenance unattested · As of: ')+
       (gsc.collectedAtUtc||'—')):
   absent(t('گزارش مستقیم معتبر GSC موجود نیست','Verified direct GSC observations unavailable'));
 const ai=ownerCockpitPrivateEvidence.ai;
 const aiOverview=ai?.status==='provider_report_snapshot'?
   state('recorded',t('پاسخ‌های نمونه: ','Sampled answers: ')+(ai.sampledAnswers??'—')+
     ' · '+t('ذکر برند: ','Brand mentions: ')+(ai.brandMentions??'—'),
     t('نمونه محدود؛ استناد و سایر موتورهای AI اندازه‌گیری نشده · تاریخ: ',
       'Limited sample, citations and other AI tools unmeasured · Date: ')+
       (ai.retrievedOn||'—')):
   absent(t('نمونه معتبر حضور برند موجود نیست','AI visibility sample unavailable'));
 const journal=ownerCockpitPrivateEvidence.journal;
 const journalOverview=journal?.schema==='jhela-owner-maturity-snapshot-v1'
   ?state('paused',t('مرحله: پیش از انتشار','Status: prelaunch')+
       ' · '+t('مراحل مستقلِ تأییدنشده: ','Unverified milestones: ')+
       (journal.evidenceReview?.unverifiedStageCount??'—'),
     t('قرارداد منبع وجود دارد؛ آمار واقعی داوری و پذیرش تأیید نشده است',
       'Repository contract exists; live editorial operations are not independently proven'))
   :absent(t('وضعیت اجرایی نشریه هنوز خوانده نشده','Journal status not loaded'));
 const growth=ownerCockpitPrivateEvidence.growth;
 const growthCounts=growth?.leadMetrics?.counts;
 const growthPipeline=growth?.serviceSalesPipeline;
 const growthOverview=growthCounts&&growthPipeline
   ?state(growthPipeline.awaitingOver24Hours>0?'attention':'recorded',
       t('درخواست‌های دارای رضایت: ','Consented enquiries: ')+(growthCounts.total??'—')+
       ' · '+t('نیازمند رسیدگی: ','Awaiting action: ')+(growthPipeline.awaitingAction??'—'),
       t('درخواست خدمات نه فروش تأییدشده و نه اجازه بازاریابی است',
         'Service enquiries are neither verified sales nor marketing consent'))
   :absent(t('قیف خدمات هنوز مشاهده نشده','Services pipeline not observed'));
 const keyword=ownerCockpitPrivateEvidence.keyword;
 const keywordOverview=keyword?.schema==='jr-keyword-master-map-v1'
   ?state('recorded',t('کلیدواژه‌های تدوین‌شده: ','Mapped keywords: ')+
       (keyword.keywordCount??'—'),
     t('استراتژی مخزن؛ این عدد رتبه، کلیک یا ورودی گوگل نیست',
       'Repository keyword strategy, not ranking, traffic or GSC clicks'))
   :absent(t('نقشه کلیدواژه‌ها بارگیری نشده','Keyword strategy map not loaded'));
 const freeSources=ownerCockpitPrivateEvidence.free;
 const freeOverview=freeSources?.schema==='operations-free-resources-v1'?
   state('recorded',t('مراجع رایگان فهرست‌شده: ','Catalogued free references: ')+
       (freeSources.referenceCount??'—'),
     t('فهرست مخزن؛ اتصال و بازیابی زنده منابع خارجی تأیید نشده',
       'Repository catalogue; live external connections and retrieval unverified')):
   absent(t('فهرست منابع رایگان بارگیری نشده','Free-source catalogue not loaded'));
 const history=ownerCockpitPrivateEvidence.audit;
 const auditOverview=history?.schema==='operations-audit-timeline-v1'?
   state('recorded',t('رویدادهای اخیر: ','Recent audit events: ')+
     (history.eventCount??'—'),
     t('حداکثر ۵۰ رویداد ذخیره‌شده؛ نه پایش لحظه‌ای',
       'Up to 50 recorded events, not a live feed')):
   absent(t('تاریخچه هنوز دریافت نشده','Audit history not loaded'));
 const departments=[
  {id:'incidents',group:'health',fa:'هشدارها و خطاهای سایت',eng:'Incidents & alerts',
   target:'ops-alert-center',data:incident,load:'alerts',
   descFa:'رخدادهای بحرانی، قوانین هشدار، سوابق و کنترل ایمیل توسط مدیر',
   descEn:'Critical incidents, rule settings, history and owner-controlled email'},
  {id:'db',group:'health',fa:'سلامت دیتابیس مادر',eng:'Mother database health',
   target:'ops-database-health',data:dbOverview,load:'database',
   descFa:'اتصال، تطبیق ساختار جداول، حجم و دفتر خطای خصوصی با بررسی دستی',
   descEn:'Connection, table structure, sizes and private redacted error journal'},
  {id:'http',group:'health',fa:'لاگ خطاهای HTTP و ۴۰۴',eng:'HTTP errors & 404 logs',
   target:'ops-http-health',data:httpOverview,load:'http',
   descFa:'تاریخچه پاسخ‌های ثبت‌شده؛ بدون خواندن اطلاعات هویتی بازدیدکننده',
   descEn:'Recorded response evidence without exposing visitor identities'},
  {id:'response',group:'health',fa:'امنیت HTTPS و ریدایرکت',eng:'HTTPS & redirect integrity',
   target:'ops-response-monitor',data:responseOverview,load:'response',
   descFa:'وضعیت حسگر، نمونه‌های واقعی هدر و کنترل تناوب پایش',
   descEn:'Sensor policy, dated response headers and monitoring cadence'},
  {id:'quality',group:'seo',fa:'کیفیت صفحه‌به‌صفحه سایت',eng:'Per-page quality scores',
   target:'ops-page-quality',data:qualityOverview,load:'quality',
   descFa:'۱۳ معیار مستقل سئو، محتوا، تصویر، AI، GEO، امنیت و تجربه کاربری',
   descEn:'13 independent SEO, content, media, AI, GEO, security and UX dimensions'},
  {id:'schema',group:'seo',fa:'اسکیما و داده‌های ساختاریافته',eng:'Schema intelligence',
   target:'jr-intelligence',data:unknown,
   descFa:'تحلیل نمونه‌ای JSON-LD و canonical؛ دکمه ممیزی مستقل در همین بخش',
   descEn:'On-demand JSON-LD and canonical inspection in the existing module'},
  {id:'keyword',group:'seo',fa:'کلیدواژه‌ها و نقشه محتوایی',eng:'Keyword & content map',
   target:'jr-intelligence',data:keywordOverview,load:'keyword',
   descFa:'توزیع کلیدواژه و برنامه محتوایی مبتنی بر منبع، مجزا از رتبه واقعی',
   descEn:'Source-defined keyword planning, separately from measured search ranking'},
  {id:'gsc',group:'seo',fa:'سرچ کنسول و نمایه‌سازی',eng:'Search Console & indexing',
   target:'ops-gsc-direct',data:gscOverview,load:'gsc',
   descFa:'مشاهده دسترسی‌ها و شاخص‌های دارای منبع معتبر؛ بدون جعل داده گوگل',
   descEn:'Only verified provider observations; no fabricated Search Console data'},
  {id:'ai',group:'seo',fa:'حضور برند در AI و GEO',eng:'AI discovery & GEO',
   target:'ops-ai-visibility',data:aiOverview,load:'ai',
   descFa:'تفکیک آمادگی کد از حضور واقعی برند در پاسخ موتورهای هوش مصنوعی',
   descEn:'Separates source readiness from measured AI answer mentions'},
  {id:'collectors',group:'platform',fa:'گردآوری داده و زمان‌بندی',eng:'Data collection & schedules',
   target:'ops-collection-settings',data:collectorOverview,load:'collection',
   descFa:'کلید اصلی خاموش، زمان تهران، واکشی دستی هر منبع، حذف تشخیصی',
   descEn:'Owner master switch, Tehran schedule, scoped manual fetch and cleanup'},
  {id:'sources',group:'platform',fa:'منابع داده و اتصال‌ها',eng:'Sources & integrations',
   target:'ops-source-directory',data:directoryOverview,load:'sources',
   descFa:'تنظیم منابع، اتصال تأییدشده، نگهداری داده و سوابق هر منبع',
   descEn:'Source controls, evidence of connectivity, retention and histories'},
  {id:'commerce',group:'business',fa:'سفارش‌ها و پرداخت‌ها',eng:'Commerce & payments',
   target:'ops-commerce',data:commerceOverview,load:'commerce',
   descFa:'سوابق سفارش، وضعیت تراکنش و اختلاف میان ادعای پرداخت و تسویه واقعی',
   descEn:'Orders, claims and the distinction between gateway reports and settlement'},
  {id:'social',group:'business',fa:'شبکه‌های اجتماعی و انتشار',eng:'Social distribution',
   target:'ops-social',data:socialOverview,load:'social',
   descFa:'پیش‌نویس‌ها، کانال‌ها، تأیید مدیر و تنظیمات انتشار',
   descEn:'Drafts, connected-channel evidence, owner approval and publish policies'},
  {id:'journal',group:'business',fa:'مدیریت نشریه JHELA',eng:'JHELA journal operations',
   target:'ops-jhela-maturity',data:journalOverview,load:'journal',
   descFa:'گردش کار نشریه، پذیرش مقاله و وضعیت واقعی عملیات تحریریه',
   descEn:'Editorial workflows, manuscript intake and independently evidenced status'},
  {id:'growth',group:'business',fa:'رشد، محتوا و درآمد',eng:'Growth, content & revenue',
   target:'ops-organic-growth',data:growthOverview,load:'growth',
   descFa:'تولید محتوا، استراتژی رشد و تفکیک فرصت درآمد از درآمد وصول‌شده',
   descEn:'Growth planning with clear separation of opportunity and collected revenue'},
  {id:'free',group:'platform',fa:'منابع رایگان و پایگاه‌های مرجع',eng:'Free research & source references',
   target:'ops-free-resources',data:freeOverview,load:'free',
   descFa:'فهرست منابع معتبر و وضعیت گردآوری واقعی، بدون جعل اتصال',
   descEn:'Reference catalogue and verified collection evidence, with no invented connections'},
  {id:'content-editor',group:'business',fa:'میز تحریریه و ویرایش سایت',eng:'Website editorial workbench',
   target:'ops-editor-workbench',data:unknown,
   descFa:'پیش‌نویس، نسخه‌های قبلی و کنترل انتشار با اختیار مدیر',
   descEn:'Drafts, revisions and explicitly approved content publishing'},
  {id:'author',group:'business',fa:'مدیریت مؤلفان و نشر',eng:'Authors & publishing operations',
   target:'ops-author-real-view',data:unknown,
   descFa:'نمای مستقل مؤلف، مدارک، امور نشر و دسترسی‌های تأییدشده',
   descEn:'Owner-governed author views, documentation and permissions'},
  {id:'finance',group:'business',fa:'برنامه‌ریزی مالی و درآمد',eng:'Financial and revenue planning',
   target:'ops-revenue-planning',data:unknown,
   descFa:'سناریوهای درآمدی و بودجه؛ تفکیک پیش‌بینی از تراکنش تسویه‌شده',
   descEn:'Budget scenarios separated from independently bank-settled amounts'},
  {id:'community',group:'business',fa:'مدیریت دیدگاه‌ها و بازبینی محتوا',eng:'Comments & editorial moderation',
   target:'jr-community-admin',data:unknown,
   descFa:'صف بررسی محتوا و تأیید مدیر؛ بدون انتشار یا حذف خودکار',
   descEn:'Moderation queues and owner approval; no unattended deletion or publishing'},
  {id:'journal-work',group:'business',fa:'گردش کار تحریریه نشریه',eng:'Journal editorial workflow',
   target:'ops-jhela-workstream',data:unknown,
   descFa:'داشبورد نقش‌ها و مرحله‌ها؛ اعتبارسنجی فعالیت واقعی جدا از برنامه',
   descEn:'Role and stage workspaces; recorded intentions separate from live execution'},
  {id:'workspace-index',group:'platform',fa:'فهرست کامل صفحات پنل',eng:'All existing admin workspaces',
   target:'ops-navigator',data:state('recorded',
      t('فهرست ناوبری داخلی','Existing workspace index'),
      t('فقط میان‌بر بخش‌های موجود؛ عملکرد هر سرویس جداگانه سنجیده می‌شود',
        'Navigation links only; each subsystem requires separate runtime proof')),
   descFa:'برای یافتن و بازکردن سایر صفحه‌ها و پنل‌های موجود بدون ساخت داشبورد موازی',
   descEn:'Find and open existing workspaces without introducing a duplicate dashboard'},
  {id:'engines',group:'platform',fa:'مدیریت ۱۳ موتور عملیاتی',eng:'13-engine control',
   target:'ops-master-engine-control',data:engineOverview,
   descFa:'نمای مجری‌های واقعی، وابستگی‌ها، محدودیت مجوز و وضعیت هر موتور',
   descEn:'Registered executors, dependencies, permissions and evidence by engine'},
  {id:'audit',group:'platform',fa:'ثبت تغییرات و حسابرسی مدیر',eng:'Owner audit history',
   target:'ops-audit-timeline',data:auditOverview,load:'audit',
   descFa:'تاریخچه قابل جست‌وجوی تغییرات؛ بدون حذف لاگ غیرقابل‌تغییر',
   descEn:'Searchable change history; immutable audit records remain protected'},
  {id:'reports',group:'platform',fa:'۳۶ گزارش و کنترل کیفیت',eng:'36 reports & quality gates',
   target:'ops-reporting',data:reportingOverview,
   descFa:'شواهد معتبر، وابستگی‌ها و گزارش‌های مدیر؛ نه ادعای تکمیل ساختگی',
   descEn:'Release-scoped evidence, open dependencies and accountable reporting'}
 ];
 const heading=el('header',undefined,'oc-heading');
 const intro=el('div');
 intro.append(el('small',t('مرکز فرماندهی مدیر · نمای خصوصی','OWNER COMMAND CENTER · PRIVATE VIEW'),'oc-eyebrow'),
   el('h2',t('همه وضعیت‌ها و کنترل‌ها، در یک نگاه','Every status and control, in one view')),
   el('p',t('این نما بر اساس داده‌های موجود در نشست تأییدشده مدیر ساخته می‌شود. بازکردن بخش‌ها، موتور یا زمان‌بند را روشن نمی‌کند.',
     'This view uses stored evidence from your authenticated session. Opening a module does not enable its worker or schedule.')));
 const headingActions=el('div',undefined,'oc-heading-actions');
 const refresh=el('button',t('بازخوانی شواهد ثبت‌شده','Refresh stored server evidence'),'oc-button-primary');
 refresh.type='button';refresh.addEventListener('click',load);
 const all=el('button',t('بازکردن گزارش جامع','Open master report'));
 all.type='button';all.addEventListener('click',()=>{
   reportingView.level='master';reportingRender();
   openExistingOperationalWorkspace('ops-reporting');
 });
 const readAll=el('button',t('دریافت یکجای وضعیت ذخیره‌شده','Load all stored statuses'));
 readAll.type='button';readAll.dataset.ocReadAll='';
 readAll.addEventListener('click',async()=>{
   if(!snapshot||readAll.disabled)return;
   const confirmed=window.confirm(t(
     'فقط با درخواست شما، شواهد محرمانه ذخیره‌شده و فراداده سلامت دیتابیس خوانده شوند؟ این عملیات هیچ واکشی خارجی، Cron، ارسال پیام، پاک‌سازی یا تغییری در داده‌ها انجام نمی‌دهد.',
     'Read private stored observations and on-demand database metadata now? This action does not fetch external providers, run Cron, send mail, purge or modify data.'));
   if(!confirmed)return;
   ownerCockpitStopRequested=false;
   readAll.disabled=true;cancelBulk.hidden=false;bulkProgress.hidden=false;
   const generation=loadGeneration;
   const tasks=[
     ['alerts','/alerts'],['database','/database-health'],
     ['http','/http-health'],['response','/response-health'],
     ['collection','/collection-settings'],['sources','/source-directory'],
     ['sourceControls','/source-controls'],['socialSettings','/social/settings'],
     ['quality','/page-quality?'+new URLSearchParams(
       Object.entries(qualityFilters).map(([key,value])=>[key,String(value)]))],
     ['commerce','/commerce'],['social','/social'],
     ['gsc','/gsc-direct'],['ai','/ai-visibility'],['audit','/audit-timeline'],
     ['journal','/jhela/maturity'],['growth','/growth'],['keyword','/keyword-map'],
     ['free','/free-resources']
   ];
   let loaded=0,unavailable=0,processed=0;
   // Sequential, bounded owner-initiated reads reduce load on shared hosting.
   for(const [id,path] of tasks){
     if(generation!==loadGeneration||!snapshot||ownerCockpitStopRequested)break;
     bulkProgress.textContent=t('در حال خواندن مورد ','Reading item ')+
       (processed+1)+' / '+tasks.length+' · '+id;
     try{
       const response=await api(path);
       if(generation!==loadGeneration||!snapshot)break;
       if(id==='alerts')alertCenterCurrent=response;
       else if(id==='database')dbHealthCurrent=response;
       else if(id==='http')httpHealthCurrent=response;
       else if(id==='response')responseMonitorCurrent=response;
       else if(id==='collection')collectionState=response;
       else if(id==='sources'&&response.schema==='operations-source-directory-v1'
         &&Array.isArray(response.sources))sourceDirectoryState=response;
       else if(id==='sourceControls'&&response.schema==='operations-source-controls-v1')
         sourceControlState=response;
       else if(id==='socialSettings'&&response.schema==='social-channel-settings-v1')
         ownerCockpitPrivateEvidence.socialSettings=ownerCockpitProject('socialSettings',response);
       else if(id==='quality'&&response.schema==='operations-page-quality-results-v1')
         qualityResult=response;
       else ownerCockpitPrivateEvidence[id]=ownerCockpitProject(id,response);
       delete ownerCockpitReadErrors[id];loaded++;
     }catch(error){
       if(generation!==loadGeneration||!snapshot)break;
       if(['admin_mfa_required','unauthorized','admin_forbidden'].includes(error.message)){
         lock(t('دسترسی ایمن مدیر منقضی یا رد شده است؛ دوباره تأیید کنید.',
                'Your private administrator access expired or was denied. Verify again.'));
         break;
       }
       unavailable++;
       ownerCockpitReadErrors[id]='unavailable';
     }
     processed++;
   }
   if(generation===loadGeneration&&snapshot){
     bulkProgress.textContent=(ownerCockpitStopRequested
       ?t('دریافت داده با درخواست مدیر متوقف شد. ','Stopped at owner request. ')
       :t('بازخوانی تکمیل شد. ','Stored read finished. '))+
       loaded+' / '+tasks.length+
       t(' بخش دارای پاسخ',' responses');
     cancelBulk.hidden=true;
     ownerCockpitLastReadAt=Math.floor(Date.now()/1000);
     reportingRender();
     notice(t('وضعیت‌های خوانده‌شده: ','Stored statuses read: ')+loaded+
       ' · '+t('داده ناموجود یا مجوز ناکافی: ','Unavailable or unauthorized: ')+unavailable+
       t('؛ هیچ وظیفه خودکاری فعال نشد.','; no worker was activated.'));
   }
   if(readAll.isConnected)readAll.disabled=false;
 });
 const exportOverview=el('button',t('خروجی خلاصه CSV','Export summary CSV'));
 exportOverview.type='button';exportOverview.dataset.ocExport='';
 exportOverview.addEventListener('click',()=>{
   if(!workspaceVisibleForExport())return;
   const checked=ownerCockpitLastReadAt||snapshot.checkedAt||null;
   exportOperationsCsv('owner-command-center.csv',
     ['section','state','observation','limitation','evidence_timestamp','release_sha'],
     departments.map(item=>[
       item.id,
       ownerCockpitReadErrors[item.load]?'unavailable':item.data.kind,
       ownerCockpitReadErrors[item.load]?'Read unavailable':item.data.metric,
       item.data.note,
       checked?new Date(checked*1000).toISOString():'',
       snapshot.releaseSha||''
     ]));
 });
 const cancelBulk=el('button',t('توقف پس از درخواست جاری','Stop after current request'));
 cancelBulk.type='button';cancelBulk.hidden=true;
 cancelBulk.setAttribute('data-oc-cancel','');
 cancelBulk.addEventListener('click',()=>{
   ownerCockpitStopRequested=true;cancelBulk.disabled=true;
 });
 const bulkProgress=el('p',undefined,'oc-provenance');
 bulkProgress.hidden=true;bulkProgress.setAttribute('role','status');
 bulkProgress.setAttribute('aria-live','polite');
 bulkProgress.setAttribute('data-oc-progress','');
 headingActions.append(refresh,readAll,all,exportOverview,cancelBulk);
 heading.append(intro,headingActions);
 root.append(heading,bulkProgress);
 const note=el('p',undefined,'oc-provenance');
 note.append(el('strong',t('اصل کنترل مدیر: ','Owner control: ')),
   document.createTextNode(t('این نما فقط داده‌های ذخیره‌شده را نمایش می‌دهد؛ نبود شاهد، «نامشخص» است نه «موفق». گردآوری خودکار، ایمیل و Cron فقط با مجوز مستقل فعال می‌شوند.',
     'Stored observations only; missing evidence is UNKNOWN, never PASS. Collection, email delivery and Cron require separate explicit authorization.')));
 root.append(note);
 const latest=el('p',undefined,'oc-provenance');
 latest.append(el('strong',t('آخرین بازخوانی دستی: ','Last owner-requested read: ')),
   document.createTextNode(ownerCockpitLastReadAt?date(ownerCockpitLastReadAt):
     t('هنوز انجام نشده','Not requested yet')));
 latest.dataset.ocLastRead='';
 root.append(latest);
 const stats=el('div',undefined,'oc-stats');
 for(const [fa,label,value,caption] of [
  ['نسخه خوانده‌شده','Release evidence',snapshot.releaseSha?.slice(0,8)||'—',
   t('نه اثبات نسخه زنده','Not live deployment proof')],
  ['رخداد بحرانی','Critical incidents',typeof alertCritical==='number'?alertCritical:'—',
   t('بر اساس داده موجود','From loaded records')],
  ['کیفیت سئوی منبع','Weak source SEO',quality?.status==='source_only'?quality.weakSeoPages??'—':'—',
   t('معیار HTML، نه رتبه','HTML checks, not ranking')],
  ['زمان مشاهده','Evidence checked',snapshot.checkedAt?date(snapshot.checkedAt):'—',
   t('زمان گزارش سرور','Recorded server timestamp')]
 ]){const tile=el('div',undefined,'oc-stat');tile.append(el('small',t(fa,label)),
   el('strong',String(value)),el('span',caption));stats.append(tile);}
 root.append(stats);
 // Evidence-backed triage queue: does not fabricate unrecorded incidents.
 const queueItems=[];
 const action=(id,priority,fa,en,detailFa,detailEn)=>queueItems.push(
   {id,priority,title:t(fa,en),detail:t(detailFa,detailEn)});
 if(typeof alertCritical==='number'&&alertCritical>0)
   action('incidents',0,'رخداد بحرانی باز','Open critical incidents',
     alertCritical+' '+t('رخداد بحرانی ثبت شده','recorded critical incident(s)'),
     alertCritical+' recorded critical incident(s)');
 if(typeof alertWarning==='number'&&alertWarning>0)
   action('incidents',1,'هشدارهای نیازمند رسیدگی','Warnings to review',
     alertWarning+' '+t('هشدار ثبت شده','recorded warning(s)'),
     alertWarning+' recorded warning(s)');
 if(typeof dbAttention==='number'&&dbAttention>0)
   action('db',0,'مغایرت‌های دیتابیس','Database discrepancies',
     dbAttention+' '+t('بررسی نیازمند توجه در آخرین اسکن دستی','manual scan checks require attention'),
     dbAttention+' manual scan checks require attention');
 if(quality?.status==='source_only'&&typeof quality.weakSeoPages==='number'&&quality.weakSeoPages>0)
   action('quality',2,'صفحات دارای سئوی منبعی ضعیف','Pages with weak source SEO',
     quality.weakSeoPages+' '+t('صفحه از موجودی کد، نه داده رتبه‌بندی گوگل',
       'source HTML page(s), not measured Google ranking'),
     quality.weakSeoPages+' source HTML page(s), not measured Google ranking');
 if(Array.isArray(collectionState?.rows)){
   const overdue=collectionState.rows.filter(row=>
     row.type==='source'&&row.scheduleEvidence==='due_unverified').length;
   const failed=collectionState.rows.filter(row=>
     row.type==='source'&&row.executionEvidence==='last_attempt_failed').length;
   if(failed>0)action('collectors',1,'تلاش‌های ناموفق جمع‌آوری','Failed collector attempts',
     failed+' '+t('منبع با شکست ثبت‌شده در آخرین تلاش','source(s) with last attempt failed'),
     failed+' source(s) with last attempt failed');
   if(overdue>0)action('collectors',2,'موعدهای واکشی تأییدنشده','Unverified source schedules',
     overdue+' '+t('موعد گذشته؛ موفقیت یا نصب Cron تأیید نشده',
       'overdue source(s); Cron and execution unverified'),
     overdue+' overdue source(s); Cron and execution unverified');
 }
 if(http?.state==='stale')
   action('http',2,'نمونه‌های HTTP منقضی','Expired HTTP observations',
     'آخرین داده ثبت‌شده تازه نیست','Latest stored observation is no longer fresh');
 if(commerce?.available===true&&
     Number(commerce.salesPipeline?.pendingOlderThan24Hours||0)>0)
   action('commerce',1,'سفارش‌های معوق برای بازبینی','Aged pending orders',
     commerce.salesPipeline.pendingOlderThan24Hours+
      t(' سفارش معوق؛ به‌معنی تراکنش ناموفق قطعی نیست',
        ' pending order(s); not proof of failed payment'),
     commerce.salesPipeline.pendingOlderThan24Hours+
      ' pending order(s); not proof of failed payment');
 if(growthPipeline&&Number(growthPipeline.awaitingOver24Hours||0)>0)
   action('growth',1,'درخواست‌های خدمات معوق','Aged consented enquiries',
     growthPipeline.awaitingOver24Hours+
       t(' درخواست نیازمند بررسی انسانی',' enquiry/enquiries need human review'),
     growthPipeline.awaitingOver24Hours+' enquiries need human review');
 if(social?.deliveryRows&&
     Number(social.deliveryRows.uncertain||0)+Number(social.deliveryRows.manualPending||0)>0)
   action('social',1,'ارسال‌های اجتماعی نامشخص','Unconfirmed social deliveries',
     t('وضعیت انتشار تعدادی از رکوردها نیازمند تأیید است',
       'Some delivery records require independent provider verification'),
     'Some delivery records require independent provider verification');
 const triage=el('section',undefined,'oc-triage');
 triage.setAttribute('aria-label',t('اقدام‌های اولویت‌دار بر اساس شواهد','Evidence-based priorities'));
 const triageTop=el('div',undefined,'oc-triage-head');
 triageTop.append(el('h3',t('اولویت‌های قابل اقدام','Priorities backed by evidence')),
   el('span',t('موارد قابل بررسی: ','Review items: ')+queueItems.length));
 triage.append(triageTop);
 const triageList=el('div',undefined,'oc-triage-list');
 for(const item of queueItems.sort((a,b)=>a.priority-b.priority).slice(0,6)){
   const line=el('div',undefined,'oc-triage-row');
   const content=el('div');content.append(el('strong',item.title),el('small',item.detail));
   const open=el('button',t('بررسی بخش','Open section'));
   open.type='button';
   open.addEventListener('click',()=>{
     const target=departments.find(x=>x.id===item.id)?.target;
     if(target&&$(target))openExistingOperationalWorkspace(target);
     else notice(t('بخش مرتبط هنوز بارگذاری نشده','Related workspace is unavailable'),true);
   });
   line.append(content,open);triageList.append(line);
 }
 if(!queueItems.length)triageList.append(el('p',t(
   'از داده‌هایی که تاکنون بارگیری شده‌اند، مورد قابل‌اقدام مشخصی استخراج نشد. این به معنی سلامت کامل سایت نیست؛ برای پوشش بیشتر، «دریافت یکجای وضعیت» را انتخاب کنید.',
   'No actionable item can be derived from currently loaded evidence. This does not certify site health. Use “Load all stored statuses” to inspect additional modules.'),'oc-triage-empty'));
 triage.append(triageList);root.append(triage);
 // 13 distinct HTML-source quality dimensions. Null remains unmeasured.
 if(quality?.status==='source_only'&&quality.averages){
   const qualityPanel=el('section',undefined,'oc-quality-overview');
   qualityPanel.setAttribute('aria-label',t('وضعیت ۱۳ معیار مستقل صفحات','13 source-quality dimensions'));
   qualityPanel.append(el('h3',t('نقشه کیفیت ۱۳ معیار سایت','13-dimension quality map')),
     el('p',t('میانگین‌های فایل‌های HTML مخزن، از ۱۰؛ نه Core Web Vitals واقعی، رتبه گوگل یا رؤیت برند در AI.',
       'Average source HTML scores out of 10. Not field Core Web Vitals, Google rankings or verified AI appearances.')));
   const measures=Object.entries(quality.averages)
     .filter(([key])=>Object.prototype.hasOwnProperty.call(qualityNames,key))
     .sort((a,b)=>{
       if(a[1]===null)return 1;
       if(b[1]===null)return -1;
       return Number(a[1])-Number(b[1]);
     });
   const bars=el('div',undefined,'oc-quality-bars');
   for(const [dimension,average] of measures){
     const line=el('div',undefined,'oc-quality-item');
     const go=el('button',qualityName(dimension));
     go.type='button';go.setAttribute('aria-label',t('بررسی معیار ','Inspect dimension ')+qualityName(dimension));
     go.addEventListener('click',()=>{
       qualityFilters.dimension=dimension;qualityFilters.page=1;
       qualityResult=null;qualityDetail=null;qualityExpanded=true;
       reportingRender();openExistingOperationalWorkspace('ops-page-quality');
     });
     const track=el('div',undefined,'oc-quality-track');
     const fill=el('span');fill.setAttribute('aria-hidden','true');
     if(typeof average==='number'&&Number.isFinite(average)){
       fill.style.width=Math.max(0,Math.min(100,average*10))+'%';
       fill.dataset.band=average<6?'low':average<8?'medium':'high';
     }else{
       track.dataset.unmeasured='true';
     }
     track.append(fill);
     const value=el('strong',typeof average==='number'&&Number.isFinite(average)
       ?average.toFixed(1)+'/10':'—');
     line.append(go,track,value);bars.append(line);
   }
   qualityPanel.append(bars);
   qualityPanel.append(el('small',t(
     'انتخاب هر معیار، جدول صفحه‌به‌صفحه را برای بررسی دستی باز می‌کند؛ واکشی جدید تنها با دکمه همان جدول انجام می‌شود.',
     'Selecting a dimension opens its per-page controls. New data loads only when you request it in that section.')));
   root.append(qualityPanel);
 }
 const toolbar=el('div',undefined,'oc-toolbar');
 const filters=el('div',undefined,'oc-filter');
 const options=[
   ['all',t('همه بخش‌ها','All departments')],
   ['attention',t('نیازمند رسیدگی','Needs attention')],
   ['unknown',t('بدون داده کافی','Missing evidence')],
   ['paused',t('خاموش و در اختیار مدیر','Off / owner-controlled')],
   ['recorded',t('دارای شواهد ثبت‌شده','With stored evidence')],
   ['health',t('سلامت و امنیت','Health & security')],
   ['seo',t('سئو و دیده‌شدن','SEO & discoverability')],
   ['business',t('کسب‌وکار و محتوا','Business & content')],
   ['platform',t('زیرساخت و کنترل','Platform & controls')]
 ];
 const filterButtons=[];
 for(const [id,label] of options){const button=el('button',label);
   button.type='button';button.dataset.ocFilter=id;
   button.setAttribute('aria-pressed',String(ownerCockpitFilter===id));
   button.addEventListener('click',()=>{
    ownerCockpitFilter=id;
    for(const btn of filterButtons)btn.setAttribute('aria-pressed',
      String(btn.dataset.ocFilter===id));
    paintCards();
   });
   filterButtons.push(button);filters.append(button);}
 const search=el('input',undefined,'oc-search');
 search.type='search';search.maxLength=100;
 search.setAttribute('aria-label',t('جست‌وجوی بخش‌های مدیریت','Search management departments'));
 search.placeholder=t('جست‌وجوی بخش، موتور یا قابلیت…','Search a department or capability…');
 search.value=ownerCockpitQuery;
 search.addEventListener('input',()=>{ownerCockpitQuery=search.value;paintCards();});
 toolbar.append(filters,search);root.append(toolbar);
 const grid=el('div',undefined,'oc-departments');
 grid.setAttribute('aria-live','polite');root.append(grid);
 const expandList=el('button',t('نمایش تمام بخش‌های مدیریت','Show all management departments'));
 expandList.type='button';expandList.className='oc-list-toggle';
 expandList.setAttribute('aria-expanded',String(ownerCockpitShowAll));
 expandList.addEventListener('click',()=>{
   ownerCockpitShowAll=!ownerCockpitShowAll;
   paintCards();
 });
 root.append(expandList);
 function labelFor(kind){
  return kind==='attention'?t('نیازمند بررسی','Review'):
    kind==='recorded'?t('دارای داده','Evidence loaded'):
    kind==='paused'?t('غیرفعال','Paused'):t('نامشخص','Unknown');
 }
 async function loadModule(item,button){
  if(!snapshot||button.disabled||!item.load)return;
  const generation=loadGeneration;button.disabled=true;
  try{
   if(item.load==='alerts'){alertCenterCurrent=await api('/alerts');alertCenterExpanded=true;}
   else if(item.load==='database'){dbHealthCurrent=await api('/database-health');dbHealthExpanded=true;}
   else if(item.load==='http'){httpHealthCurrent=await api('/http-health');alertCenterExpanded=true;}
   else if(item.load==='response'){responseMonitorCurrent=await api('/response-health');responseMonitorExpanded=true;}
   else if(item.load==='collection'){collectionState=await api('/collection-settings');collectionExpanded=true;}
   else if(item.load==='sources'){const response=await api('/source-directory');
    if(response.schema!=='operations-source-directory-v1'||!Array.isArray(response.sources))
       throw new Error('invalid_source_directory');
    sourceDirectoryState=response;
    sourceControlState=await api('/source-controls');
    sourceDirectoryExpanded=true;}
   else if(item.load==='quality'){await loadQualityIndex();}
   else if(['commerce','social','gsc','ai','audit','journal','growth','keyword','free'].includes(item.load)){
     const routes={commerce:'/commerce',social:'/social',gsc:'/gsc-direct',
       ai:'/ai-visibility',audit:'/audit-timeline',journal:'/jhela/maturity',
       growth:'/growth',keyword:'/keyword-map',free:'/free-resources'};
     const response=await api(routes[item.load]);
     if(generation!==loadGeneration||!snapshot)return;
     ownerCockpitPrivateEvidence[item.load]=ownerCockpitProject(item.load,response);
     if(item.load==='social'){
       ownerCockpitPrivateEvidence.socialSettings=ownerCockpitProject(
         'socialSettings',await api('/social/settings'));
     }
     delete ownerCockpitReadErrors[item.load];
     ownerCockpitLastReadAt=Math.floor(Date.now()/1000);
   }
   if(generation!==loadGeneration||!snapshot)return;
   reportingRender();
   openExistingOperationalWorkspace(item.target);
   notice(t('داده‌های ذخیره‌شده دریافت شدند؛ این کار هیچ وظیفه خودکاری را فعال نکرد.',
     'Stored data loaded. No automatic task was enabled.'));
  }catch(error){if(generation===loadGeneration&&snapshot){
     if(['admin_mfa_required','unauthorized','admin_forbidden'].includes(error.message)){
       lock(t('برای مشاهده داده‌ها دوباره دسترسی مدیر را تأیید کنید.',
         'Verify administrator access again before reading private data.'));
     }else{
       ownerCockpitReadErrors[item.load]='unavailable';
       reportingRender();
       notice(errorMessage(error),true);
     }
   }}
   finally{if(button.isConnected)button.disabled=false;}
 }
 function paintCards(){
  grid.replaceChildren();
  const q=ownerCockpitQuery.trim().toLocaleLowerCase();
  const selected=departments.filter(item=>{
   const actual=ownerCockpitReadErrors[item.load]?'unknown':item.data.kind;
   const matching=ownerCockpitFilter==='all'||
     (ownerCockpitFilter==='attention'&&actual==='attention')||
     (ownerCockpitFilter==='unknown'&&actual==='unknown')||
     (ownerCockpitFilter==='paused'&&actual==='paused')||
     (ownerCockpitFilter==='recorded'&&actual==='recorded')||
     ownerCockpitFilter===item.group;
   return matching&&(!q||[item.fa,item.eng,item.id,item.descFa,item.descEn,item.data.metric]
     .join(' ').toLocaleLowerCase().includes(q));
  });
  const limited=ownerCockpitFilter==='all'&&!q&&!ownerCockpitShowAll;
  const displayRows=limited?selected.slice(0,9):selected;
  expandList.hidden=ownerCockpitFilter!=='all'||!!q||selected.length<=9;
  expandList.textContent=ownerCockpitShowAll?
    t('نمایش فقط بخش‌های اصلی','Show primary departments only'):
    t('نمایش همه '+selected.length+' بخش مدیریت',
      'Show all '+selected.length+' departments');
  expandList.setAttribute('aria-expanded',String(!limited));
  for(const item of displayRows){
   const error=ownerCockpitReadErrors[item.load];
   const display=error?state('unknown',
     error==='admin_mfa_required'?t('تأیید دومرحله‌ای لازم است','Fresh MFA required'):
       t('این داده از سرور دریافت نشد','Server observation unavailable'),
     t('درخواست خوانش نتیجه نداد؛ تنظیمات و داده‌های موجود تغییر نکردند',
       'Read failed; no stored settings or records were changed')):item.data;
   const card=el('article',undefined,'oc-department');
   card.dataset.ocDepartment=item.id;
   const head=el('div',undefined,'oc-department-head');
   head.append(el('h3',t(item.fa,item.eng)));
   const badge=el('span',labelFor(display.kind),'oc-status');
   badge.dataset.state=display.kind;head.append(badge);
   const description=el('p',t(item.descFa,item.descEn));
   const metric=el('p',display.metric,'oc-measure');
   const note=el('p',display.note);
   const foot=el('footer');
   const open=el('button',t('بازکردن و کنترل','Open controls'),'oc-open');
   open.type='button';open.addEventListener('click',()=>{
    if(!$(item.target)){notice(t('این ابزار در نسخه جاری سایت بارگذاری نشده است.',
      'This workspace is unavailable in the current release.'),true);return;}
    openExistingOperationalWorkspace(item.target);
   });
   foot.append(open);
   if(item.load){
    const reload=el('button',t('دریافت دستی داده','Load stored data'));
    reload.type='button';reload.addEventListener('click',()=>loadModule(item,reload));
    foot.append(reload);
   }
   card.append(head,description,metric,note,foot);grid.append(card);
  }
  if(!selected.length)grid.append(el('p',t('بخشی با این فیلتر و جست‌وجو پیدا نشد.',
    'No departments match this search and filter.'),'oc-empty'));
 }
 paintCards();
 root.append(el('p',t(
  'دسترسی‌های این مرکز همان مجوزهای قبلی سرور هستند. اگر اتصال، جدول، کلید سرویس یا اجراکننده‌ای وجود ندارد، کنترل مربوط آن به‌صورت واقعی «نامشخص» می‌ماند؛ این پنل شبیه‌ساز عملیات نیست.',
  'Existing server MFA/RBAC permissions still apply. If a connector, table, credential or worker is missing, its state remains UNKNOWN; this dashboard does not simulate operational readiness.'),'oc-guide'));
}
function reportingRender(){
 const model=snapshot?.reporting;if(!model)return;
 let healthHost=$('ops-health-summary');
 if(!healthHost){
   healthHost=el('section',undefined,'ops-health-first');
   healthHost.id='ops-health-summary';
   healthHost.setAttribute('aria-label',t('خلاصه سلامت فوری سایت','Immediate site-health summary'));
   $('ops-workspace').insertBefore(healthHost,$('jr-intelligence')||$('ops-cards'));
 }
 healthHost.replaceChildren();
 renderAlertCenter(healthHost,model);
 renderDatabaseHealth(healthHost);
 renderResponseMonitor(healthHost,model);
 let host=$('ops-reporting');if(!host){host=el('section',undefined,'ops-panel');host.id='ops-reporting';host.setAttribute('aria-label',t('گزارش‌های سیزده موتور','Thirteen-engine reporting'));$('ops-workspace').insertBefore(host,$('ops-cards'));}
 host.replaceChildren();host.append(el('h2',t('۱۳ موتور؛ یک مرکز مدیریت','13 engines, one administrative center')));
 const enabledActions=model.actionReports.filter(a=>a.supportedExecutor?.type==='readonly_snapshot'&&a.supportedExecutor?.writes===false).length;host.append(el('p',t('اقدام‌های ثبت‌شده: ','Registered actions: ')+model.actionReports.length+' · '+t('قرارداد فقط‌خواندنی فعال: ','Read-only executors: ')+enabledActions+' · '+t('فاقد قرارداد اجرایی: ','Without executor: ')+(model.actionReports.length-enabledActions)));
 renderMasterEngineConsole(host,model);
 renderPageQuality(host);
 renderSourceDirectory(host);

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
 if(reportingView.level==='action'){const pick=el('select');pick.id='ops-report-action-picker';pick.setAttribute('aria-label',t('انتخاب اقدام ثابت','Select permanent action'));for(const a of model.actionReports){const o=el('option',a.id+' · '+(en?a.canonicalName:a.displayNameFa));o.value=a.id;pick.append(o);}if(!model.actionReports.some(a=>a.id===reportingView.action))reportingView.action=model.actionReports[0]?.id||'';pick.value=reportingView.action;pick.addEventListener('change',()=>{reportingView.action=pick.value;reportingRender();});tools.append(pick);}
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
 const records=reportingRecords(),list=el('ul',undefined,'ops-queue');list.id='ops-report-records';
 for(const r of records){const item=el('li'),button=el('button',r.id+' · '+title(r));button.type='button';button.addEventListener('click',()=>show(r.id));item.append(button,el('small',' '+reportOwner(r)+' · '+statuses[r.status]+' · '+pct(r.measuredProgress)));list.append(item);}host.append(list);
 renderOwnerCommandCenter();
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
