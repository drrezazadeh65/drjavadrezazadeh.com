/* Two independent JREI Windows nodes; original bilingual SUPER_ADMIN session.
 * Server enforces MFA/role/CSRF, and every node begins DISABLED.
 * No private key, learner record, GPU performance assumption or local command.
 */
(()=>{
 'use strict';
 const root=document.getElementById('ops-jrei-hybrid-nodes');
 const ws=document.getElementById('ops-workspace');
 if(!root||!ws)return;
 const en=document.documentElement.lang==='en',T=(fa,e)=>en?e:fa;
 const url='/api/admin/operations/jrei-hybrid';
 const state=root.querySelector('[data-hybrid-state]');
 const refresh=root.querySelector('[data-hybrid-refresh]');
 const listing=root.querySelector('[data-hybrid-nodes]');
 const tasks=root.querySelector('[data-hybrid-jobs]');
 const actions=root.querySelector('[data-hybrid-register]');
 if(!state||!refresh||!listing||!tasks||!actions)return;
 let seq=0,controller=null,busy=false,newNodeId=null;
 const fmt=new Intl.NumberFormat(en?'en-US':'fa-IR');
 const visible=()=>root.open&&!ws.hidden&&!document.hidden&&navigator.onLine;
 const el=(tag,txt,cls='')=>{const e=document.createElement(tag);
   if(cls)e.className=cls;if(txt!==undefined)e.textContent=String(txt);return e;};
 const btn=(title,fn)=>{const b=el('button',title);b.type='button';b.addEventListener('click',fn);return b;};
 const say=x=>state.textContent=x;
 const mountForm=(host,title,form)=>{
   const details=el('details',undefined,'jr-hybrid-jobs jr-hybrid-form-panel');
   details.append(el('summary',title),form);
   host.append(details);
 };
 const blank=()=>{listing.replaceChildren();tasks.replaceChildren();actions.replaceChildren();};
 const clean=()=>{seq++;controller?.abort();controller=null;busy=false;
   newNodeId=null;refresh.disabled=false;blank();say(T('برای دریافت اطلاعات، این بخش را باز کنید.',
   'Open this panel for authenticated node status.'));};
 const date=x=>Number.isSafeInteger(x)&&x>0?
   new Date(x*1000).toLocaleString(en?'en-US':'fa-IR'):T('نامعلوم','Unknown');
 const number=x=>Number.isSafeInteger(x)&&x>=0?fmt.format(x):T('نامعلوم','Unknown');
 const cell=(node,label,value)=>{const d=el('div',undefined,'jr-hybrid-cell');
   d.append(el('strong',label),el('span',value));node.append(d);};
 const statusLabel=s=>({
   ONLINE:T('متصل','Online'),BUSY:T('مشغول','Busy'),
   DEGRADED:T('محدود','Degraded'),OFFLINE:T('آفلاین','Offline'),
   MAINTENANCE:T('غیرفعال','Maintenance'),
   REVOKED:T('کلید لغو شده','Revoked'),
   LEASED:T('در حال اجرا','Leased'),QUEUED:T('در صف','Queued'),
   PENDING:T('در انتظار تأیید','Pending review'),
   APPROVED:T('مجاز برای ارزیابی','Approved for evaluation'),
   SUSPENDED:T('تعلیق‌شده','Suspended'),
   PENDING_REVIEW:T('در انتظار بررسی نسخه','Version pending review'),
   METADATA_REVIEWED:T('فراداده بازبینی شد','Metadata reviewed'),
   RIGHTS_REVIEWED:T('حقوق استفاده بررسی شد','Licence rights reviewed'),
   REVIEWED:T('بازبینی مدیریتی ثبت شد','Owner-reviewed'),
   REJECTED:T('نتیجه رد شد','Rejected'),
   CLOSED_UNKNOWN:T('نتیجه نامعلوم بسته شد','Unknown outcome closed'),
   NEEDS_REVIEW:T('نتیجه نامعلوم؛ بررسی مدیر','Unknown outcome; owner review'),
   REVIEW_REQUIRED:T('نیازمند بررسی','Requires review'),
   CANCELLED:T('لغو شده','Cancelled'),EXPIRED:T('منقضی','Expired')
 })[s]||String(s||'UNKNOWN').slice(0,80);
 const confirmAction=(fa,e)=>window.confirm(T(fa,e));



 function renderReviewHistory(d){
   const entries=Array.isArray(d.reviewHistory)?d.reviewHistory:[];
   if(!d.reviewLedgerReady){
     tasks.append(el('p',T(
       'ثبت دلایل کدگذاری‌شده به جدول افزایشی نیاز دارد؛ حسابرسی اصلی مدیریت محفوظ است.',
       'The coded review ledger awaits its additive table; the original owner audit remains.')));
     return;
   }
   const panel=el('details',undefined,'jr-hybrid-jobs');
   panel.append(el('summary',T('تاریخچهٔ تصمیم‌های مدیریتی','Owner evaluation review history')+
     ' · '+number(entries.length)));
   if(!entries.length)panel.append(el('p',T(
     'تاکنون بازبینی کدگذاری‌شده‌ای ثبت نشده است.',
     'No coded owner review has been recorded.')));
   const reasons={
     METRICS_INSPECTED_NO_PUBLICATION:T('آمار بررسی شد؛ بدون انتشار','Metrics inspected, no publication'),
     RESEARCH_VERIFICATION_OUTSTANDING:T('تأیید پژوهشی مستقل باقی است','Independent research review outstanding'),
     UNSUPPORTED_EVALUATION_METRICS:T('آمار بدون پشتیبانی کافی','Unsupported evaluation metrics'),
     CORPUS_APPROVAL_REVOKED:T('مجوز داده معلق شد','Corpus approval revoked'),
     UNKNOWN_OUTCOME_NOT_RETRIED:T('اجرای نامعلوم؛ بدون تکرار','Unknown outcome; never replayed'),
     PROTOCOL_MISMATCH:T('عدم تطبیق قرارداد ارزیابی','Evaluation protocol mismatch'),
     LEGACY_REVIEW_NO_REASON:T('ثبت قدیمی؛ بدون دلیل استاندارد','Legacy review; no standardized rationale')
   };
   for(const row of entries.slice(0,40)){
     const entry=el('article',undefined,'jr-hybrid-job');
     entry.append(el('span',statusLabel(row.decision)));
     entry.append(el('small',T('کار: ','Job: ')+String(row.jobId||'—')));
     entry.append(el('small',reasons[row.rationaleCode]||String(row.rationaleCode||'—')));
     entry.append(el('small',date(row.reviewedAt)));
     entry.append(el('small',T('هش نتیجه: ','Result digest: ')+
       (typeof row.resultDigest==='string'?row.resultDigest.slice(0,16)+'…':
         T('فاقد نتیجهٔ دریافت‌شده','No received aggregate'))));
     panel.append(entry);
   }
   tasks.append(panel);
 }

 function renderModels(d) {
   if(!d.modelRegistryReady){
     tasks.append(el('p',T('ثبت مدل‌های محلی در انتظار مهاجرت افزایشی پایگاه داده است.',
       'Local model registry awaits the staged additive mother-DB migration.')));
     return;
   }
   const models=Array.isArray(d.registeredModels)?d.registeredModels:[];
   const wrapper=el('details',undefined,'jr-hybrid-jobs');
   wrapper.append(el('summary',T('ثبت مدل‌های محلی و مجوزهای استفاده','Local model inventory and licences')+
     ' · '+number(models.length)));
   wrapper.append(el('p',T(
     'ثبت یا تأیید مجوز یک مدل به معنای نصب وزن‌ها، قابلیت استفاده از GPU، اجرای استنتاج یا آماده‌بودن دستیار عمومی نیست.',
     'A reviewed model licence is not evidence of downloaded weights, GPU compatibility, live inference or public assistant readiness.')));
   for(const model of models){
     const item=el('article',undefined,'jr-hybrid-node');
     item.append(el('h4',String(model.modelId)+' / '+String(model.modelVersion)));
     cell(item,T('وضعیت مجوز','Rights status'),statusLabel(model.status));
     cell(item,T('هش فایل وزن‌ها','Model artifact SHA-256'),model.artifactSha256);
     cell(item,T('نسخه کوانتیزه','Quantization'),model.quantization);
     cell(item,T('حداقل RAM اعلامی (MB)','Declared minimum RAM (MB)'),
       number(model.requiredRamMb));
     cell(item,T('مجوز','Licence'),model.licenceCode);
     cell(item,T('فایل مدل تأییدشده روی رایانه','Weights installed and verified'),
       model.weightsInstalledVerified?T('بله؛ نیازمند سند پذیرش','Reported verified; see acceptance'):
         T('تأیید نشده','Not verified'));
     cell(item,T('استنتاج واقعی تأییدشده','Runtime verified'),
       model.runtimeVerified?T('با گزارش پذیرش بررسی شود','Check acceptance evidence'):
         T('تأیید نشده','Not verified'));
     cell(item,T('سرعت واقعی (توکن/ثانیه)','Measured tokens per second'),
       typeof model.measuredTokensPerSecond==='number'?
         fmt.format(model.measuredTokensPerSecond):T('نامعلوم','Unknown'));
     cell(item,'p95 latency (ms)',Number.isSafeInteger(model.measuredP95LatencyMs)?
       number(model.measuredP95LatencyMs):T('نامعلوم','Unknown'));
     const provenance=el('a',T('صفحهٔ منتشرکنندهٔ مدل','Official model source'));
     provenance.href=model.sourceUrl;provenance.target='_blank';
     provenance.rel='noopener noreferrer';item.append(provenance);
     const licence=el('a',T('شرایط حقوقی مدل','Model licence terms'));
     licence.href=model.licenceUrl;licence.target='_blank';
     licence.rel='noopener noreferrer';item.append(licence);
     if(model.status==='PENDING')item.append(btn(
       T('ثبت بازبینی مجوز؛ بدون فعال‌سازی','Record licence review only'),()=>{
         if(!confirmAction(
           'آیا شرایط صدور مجوز و منشأ مدل را جداگانه بررسی کرده‌اید؟ وزن‌ها بارگیری یا فعال نمی‌شوند.',
           'Have you reviewed the model issuer and licence? This never installs or activates the model.'))return;
         mutate({action:'approve_model_rights',modelId:model.modelId,
           modelVersion:model.modelVersion,revision:model.revision,
           confirmation:'RIGHTS_REVIEWED_NO_MODEL_ACTIVATION'});
       }));
     if(model.status==='PENDING'||model.status==='RIGHTS_REVIEWED')
       item.append(btn(T('تعلیق نسخهٔ مدل','Suspend model version'),()=>{
         if(!confirmAction('آیا نسخهٔ مدل از دفتر مجوزهای مجاز تعلیق شود؟',
           'Suspend this model version from the authorised inventory?'))return;
         mutate({action:'suspend_model_version',modelId:model.modelId,
           modelVersion:model.modelVersion,revision:model.revision,
           confirmation:'SUSPEND_LOCAL_MODEL_METADATA'});
       }));
     if(model.status==='RIGHTS_REVIEWED'&&!model.runtimeVerified){
       const candidates=Array.isArray(d.nodes)?d.nodes.filter(
         n=>n.ownerEnabled===true&&n.revoked!==true):[];
       const acceptance=el('details',undefined,'jr-hybrid-form-panel');
       acceptance.append(el('summary',T(
         'ثبت شواهد اجرای واقعی مدل روی Windows',
         'Attest measured Windows model inference')));
       acceptance.append(el('p',T(
         'این فرم تنها پس از بررسی هش واقعی فایل GGUF، اجرای محلی مدل و ارزیابی مستقل پاسخ‌ها مجاز است. هیچ فایلی بارگذاری نمی‌شود؛ صرفاً هش شواهد ثبت خواهد شد.',
         'Complete only after checking the actual GGUF digest, local inference and independent quality evaluation. Only evidence hashes are recorded; files stay on the Windows PC.')));
       if(!candidates.length){
         acceptance.append(el('p',T(
           'ابتدا یک Worker امضاشده را ثبت و فعال کنید.',
           'Register and enable a signed Windows worker first.')));
       }else{
         const att=el('form',undefined,'jr-hybrid-form');
         const choose=el('label',T('رایانهٔ تأییدشده','Reviewed Windows node'));
         const nodeSelect=document.createElement('select');
         for(const n of candidates){
           const option=el('option',String(n.name||n.nodeId)+' / '+n.nodeId);
           option.value=n.nodeId;nodeSelect.append(option);
         }
         choose.append(nodeSelect);att.append(choose);
         const addField=(label,type,placeholder,min,max)=>{
           const l=el('label',label),input=document.createElement('input');
           input.type=type;input.placeholder=placeholder;input.required=true;
           if(type==='number'){
             input.min=String(min);input.max=String(max);input.step='any';
           }else if(type==='text'){
             input.pattern='[a-f0-9]{64}';input.minLength=64;input.maxLength=64;
             input.dir='ltr';input.spellcheck=false;
           }
           l.append(input);att.append(l);return input;
         };
         const fixture=addField('Reviewed evaluation fixture SHA-256',
           'text','64 hexadecimal characters');
         const report=addField('Local benchmark report SHA-256',
           'text','64 hexadecimal characters');
         const tokens=addField(T('توکن بر ثانیه','Measured tokens / second'),
           'number','5.2',0.1,1000);
         const p95=addField('Measured p95 latency (ms)',
           'number','6000',100,120000);p95.step='1';
         const peak=addField('Measured peak RAM (MB)',
           'number','8192',256,131072);peak.step='1';
         const consent=el('label');
         const checked=document.createElement('input');checked.type='checkbox';
         checked.required=true;
         consent.append(checked,document.createTextNode(T(
           ' هش وزن‌ها، آزمون واقعی محلی، ارزیابی مستقل کیفیت و عدم استفاده از مدل ابری را شخصاً بررسی کرده‌ام.',
           ' I personally checked the model artifact hash, real local inference, independent quality evaluation and no cloud invocation.')));
         att.append(consent);
         const submit=el('button',T('ثبت پذیرش اندازه‌گیری‌شدهٔ مدل',
           'Record measured runtime acceptance'));submit.type='submit';
         att.append(submit);
         att.addEventListener('submit',event=>{
           event.preventDefault();
           if(!visible()||busy||!att.reportValidity())return;
           if(!confirmAction(
             'تأیید می‌کنید اجرای واقعی مدل محلی و شواهد کیفیت مستقل بررسی شده‌اند؟ ثبت این گزارش به معنای فعال‌سازی خودکار عمومی نیست.',
             'Confirm you personally reviewed genuine local model inference and independent quality evidence? This does NOT activate public AI automatically.'))return;
           mutate({action:'attest_local_model_runtime',
             modelId:model.modelId,modelVersion:model.modelVersion,
             nodeId:nodeSelect.value,artifactSha256:model.artifactSha256,
             revision:model.revision,
             evaluationFixtureSha256:fixture.value.trim(),
             runEvidenceSha256:report.value.trim(),
             measuredTokensPerSecond:Number(tokens.value),
             measuredP95LatencyMs:Number(p95.value),
             measuredPeakRamMb:Number(peak.value),
             realLocalGGUFHashChecked:true,
             independentLanguageQualityReviewed:true,
             ownerReviewedNoCloudExecution:true,
             confirmation:'OWNER_ACCEPTS_MEASURED_LOCAL_MODEL_NOT_CLOUD'});
         });
         acceptance.append(att);
       }
       item.append(acceptance);
     }
     wrapper.append(item);
   }
   tasks.append(wrapper);
   const propose=el('form',undefined,'jr-hybrid-form');
   propose.append(el('h4',T('پیشنهاد مدل محلی با مجوز قابل بررسی','Propose an auditable local model')));
   const field=(title,placeholder,type='text',max=500)=>{
     const label=el('label',title),input=document.createElement('input');
     input.type=type;input.placeholder=placeholder;input.required=true;
     if(type!=='number')input.maxLength=max;
     label.append(input);propose.append(label);return input;
   };
   const id=field('Model ID','multilingual-local-model', 'text',64);
   const version=field(T('نسخه مدل','Model version'),'gguf-q4-v1','text',64);
   const hash=field('Model artifact SHA-256','64 lowercase hexadecimal characters','text',64);
   hash.pattern='[a-f0-9]{64}';hash.minLength=64;hash.dir='ltr';
   hash.spellcheck=false;
   const source=field(T('منبع رسمی مدل','Official model source'),'https://...','url');
   const licence=field(T('کد مجوز','Licence code'),'Apache-2.0','text',80);
   const licenceUrl=field(T('پیوند متن مجوز','Licence terms URL'),'https://...','url');
   const quant=field(T('نسخه کم‌حجم‌سازی','Quantization'),'Q4_K_M','text',40);
   const ram=field(T('حداقل RAM بر حسب مگابایت','Required RAM (MB)'),'8192','number');
   ram.min='256';ram.max='131072';ram.step='1';
   // This owner-PC candidate is sourced from the actual October 25
   // SHA-256-verified GGUF and the official Qwen model/license pages.
   // One click PREFILLS editable metadata only. It does not submit,
   // certify licence compliance, or activate a model or public service.
   const ownerCandidate=Object.freeze({
     modelId:'jrei-qwen3-4b-q4km',
     modelVersion:'qwen3-4b-q4km-20261025',
     artifactSha256:'7485fe6f11af29433bc51cab58009521f205840f5b4ae3a32fa7f92e8534fdf5',
     sourceUrl:'https://huggingface.co/Qwen/Qwen3-4B-GGUF',
     licenceCode:'Apache-2.0',
     licenceUrl:'https://huggingface.co/Qwen/Qwen3-4B-GGUF/blob/main/LICENSE',
     quantization:'Q4_K_M',
     // Conservative OWNER REVIEW estimate, not an observed process peak.
     requiredRamMb:8192
   });
   const prefill=document.createElement('button');
   prefill.type='button';
   prefill.textContent=T(
     'پرکردن فرم با مدل آزموده‌شدهٔ Qwen در رایانهٔ اول',
     'Prefill the owner Node A Qwen candidate'
   );
   prefill.addEventListener('click',()=>{
     if(!visible()||busy)return;
     id.value=ownerCandidate.modelId;
     version.value=ownerCandidate.modelVersion;
     hash.value=ownerCandidate.artifactSha256;
     source.value=ownerCandidate.sourceUrl;
     licence.value=ownerCandidate.licenceCode;
     licenceUrl.value=ownerCandidate.licenceUrl;
     quant.value=ownerCandidate.quantization;
     ram.value=String(ownerCandidate.requiredRamMb);
   });
   propose.append(prefill);
   propose.append(el('p',T(
     '۸۱۹۲ مگابایت صرفاً برآورد محافظه‌کارانهٔ RAM است، نه اندازه‌گیری واقعی. مجوز، منشأ فایل و گزارش کیفیت را پیش از ثبت نهایی جداگانه بررسی کنید.',
     '8192 MB is a conservative RAM estimate, not a measured peak. Independently review licence, artifact provenance and quality before approval.'
   )));
   const button=document.createElement('button');button.type='submit';
   button.textContent=T('ثبت پیشنهادی؛ بدون دانلود مدل','Propose metadata; do not download');
   propose.append(button);
   propose.addEventListener('submit',event=>{
     event.preventDefault();if(!visible()||busy||!propose.reportValidity())return;
     if(!confirmAction('فقط متادیتا و مجوز مدل ثبت شود؟ هیچ مدل اجرایی نصب نخواهد شد.',
       'Register only model metadata and rights? No runtime will be installed.'))return;
     mutate({action:'propose_local_model',modelId:id.value.trim(),
       modelVersion:version.value.trim(),artifactSha256:hash.value.trim(),
       sourceUrl:source.value.trim(),licenceCode:licence.value.trim(),
       licenceUrl:licenceUrl.value.trim(),quantization:quant.value.trim(),
       requiredRamMb:Number(ram.value),
       confirmation:'PROPOSE_LICENSED_LOCAL_MODEL_METADATA'});
   });
   mountForm(actions,T('پیشنهاد نسخهٔ مدل','Propose model version'),propose);
 }

 function renderSources(d){
   if(!d.sourceRegistryReady){
     tasks.append(el('p',T('دفتر منابع آموزشی نیز منتظر مهاجرت افزایشی مرحلهٔ انتشار است.',
       'The educational source registry requires the staged additive mother-DB migration.')));
     return;
   }
   const sources=Array.isArray(d.sources)?d.sources:[];
   const versions=Array.isArray(d.sourceVersions)?d.sourceVersions:[];
   const approved=sources.filter(x=>x.status==='APPROVED');
   const panel=el('details',undefined,'jr-hybrid-jobs');
   panel.append(el('summary',T('منابع شواهد آموزشی و نسخه‌های پیشنهادی','Educational evidence sources and proposed versions')+
     ' · '+number(sources.length)));
   panel.append(el('p',T('ثبت منبع یا هش به معنای دریافت خودکار، صحت‌سنجی مستقل یا انتشار محتوای آن نیست.',
     'Registering a source or digest does not download, independently validate or publish it.')));
   for(const s of sources){
     const item=el('article',undefined,'jr-hybrid-node');
     item.append(el('h4',String(s.issuer||s.sourceId).slice(0,160)));
     cell(item,'Source ID',s.sourceId);
     cell(item,T('وضعیت','Status'),statusLabel(s.status));
     cell(item,T('نوع و زبان','Type / language'),s.contentType+' / '+s.language);
     cell(item,T('حقوق استفاده','Usage rights'),s.usageRights);
     cell(item,T('روش گردآوری مجاز','Acquisition method'),s.acquisitionMethod);
     cell(item,T('مجوز','Licence'),s.licenceCode);
     cell(item,T('آخرین دریافت تأییدشده','Last verified fetch'),date(s.lastSuccessfulFetchAt));
     const link=el('a',T('نشانی ثبت‌شده','Registered canonical URL'));
     link.href=s.url;link.rel='noopener noreferrer';link.target='_blank';
     item.append(link);
     if(s.status==='PENDING')item.append(btn(
       T('تأیید منبع پس از بررسی حقوق و ناشر','Approve issuer and reuse rights'),()=>{
         if(!confirmAction('آیا اعتبار ناشر و حقوق دسترسی را خارج از سامانه تأیید کرده‌اید؟',
           'Did you independently check the issuer, permissions and source terms?'))return;
         mutate({action:'approve_public_source',sourceId:s.sourceId,revision:s.revision,
           confirmation:'APPROVE_LICENSED_SOURCE'});
       }));
     if(s.status==='PENDING'||s.status==='APPROVED')
       item.append(btn(T('تعلیق منبع','Suspend source'),()=>{
         if(!confirmAction('دسترسی به نسخه‌های بعدی این منبع متوقف شود؟',
           'Suspend new versions and pending proposals from this source?'))return;
         mutate({action:'suspend_public_source',sourceId:s.sourceId,revision:s.revision,
           confirmation:'SUSPEND_SOURCE_AND_PROPOSALS'});
       }));
     panel.append(item);
   }
   for(const v of versions){
     const item=el('article',undefined,'jr-hybrid-job');
     item.append(el('span',v.sourceId+' · '+v.observedChange+' · '+v.status));
     item.append(el('small',v.documentSha256));
     item.append(el('small',T('زمان گردآوری اعلام‌شده: ','Declared retrieval: ')+date(v.declaredRetrievedAt)));
     if(v.status==='PENDING_REVIEW'){
       for(const [decision,title] of [
         ['ACCEPT_METADATA',T('ثبت تأیید صرفاً فراداده','Accept metadata only')],
         ['REJECT',T('رد نسخه','Reject version')]
       ])item.append(btn(title,()=>{
         if(!confirmAction('این تصمیم فقط فرادادهٔ نسخه را ثبت می‌کند، نه اعتبار علمی یا انتشار محتوای آن را.',
           'This records provenance metadata only; no scientific certification or content publication.'))return;
         mutate({action:'review_source_version',proposalId:v.proposalId,
           revision:v.revision,decision,confirmation:'REVIEW_SOURCE_PROVENANCE_ONLY'});
       }));
     }
     panel.append(item);
   }
   tasks.append(panel);
   const field=(form,title,type='text',placeholder='')=>{
     const label=el('label',title),input=document.createElement('input');
     input.type=type;input.required=true;input.placeholder=placeholder;
     label.append(input);form.append(label);return input;
   };
   const choice=(form,title,entries)=>{
     const wrap=el('label',title),select=document.createElement('select');
     for(const [value,name] of entries){
       const option=el('option',name);option.value=value;select.append(option);
     }
     wrap.append(select);form.append(wrap);return select;
   };
   const proposal=el('form',undefined,'jr-hybrid-form');
   proposal.append(el('h4',T('پیشنهاد منبع آموزشی مجاز','Propose an educational source')));
   const id=field(proposal,'Source ID','text','official-education-source-v1');id.maxLength=64;
   const issuer=field(proposal,T('ناشر/مرجع','Publisher / issuer'));issuer.maxLength=160;
   const address=field(proposal,T('نشانی HTTPS رسمی','Canonical HTTPS URL'),'url','https://...');
   address.maxLength=600;
   const licence=field(proposal,T('مجوز قابل استناد','Recorded reuse licence'),
     'text','PUBLIC-DOCUMENTATION');licence.maxLength=80;
   const kind=choice(proposal,T('نوع فایل','Format'),
     ['HTML','TEXT','PDF','JSON'].map(x=>[x,x]));
   const language=choice(proposal,T('زبان','Language'),
     [['fa','فارسی'],['en','English'],['mixed',T('دوزبانه','Mixed')]]);
   const trust=choice(proposal,T('نوع مرجع','Issuing authority'),
     [['OFFICIAL',T('رسمی','Official')],['INSTITUTIONAL',T('دانشگاهی','Institutional')],
      ['PEER_REVIEWED',T('پژوهش داوری‌شده','Peer-reviewed')]]);
   const rights=choice(proposal,T('حدود اجازهٔ استفاده','Use permission'),
     [['METADATA_ONLY',T('فقط فراداده','Metadata only')],
      ['PUBLIC_REUSE_APPROVED',T('استفاده از متن مجاز است','Public reuse approved')]]);
   const method=choice(proposal,T('روش مجاز','Acquisition method'),
     [['OWNER_MANUAL_INTAKE',T('دستی با بازبینی','Owner manual intake')],
      ['PUBLIC_HTTPS',T('HTTPS عمومی با کنترل محدودیت‌ها','Governed public HTTPS')]]);
   const interval=field(proposal,T('تناوب بررسی، ساعت','Review interval, hours'),'number','24');
   interval.min='12';interval.max='2160';interval.step='1';interval.value='168';
   const save=document.createElement('button');save.type='submit';
   save.textContent=T('پیشنهاد منبع (تأیید نشده)','Propose source (unapproved)');
   proposal.append(save);
   proposal.addEventListener('submit',event=>{
     event.preventDefault();if(!visible()||busy||!proposal.reportValidity())return;
     if(!confirmAction('منبع فقط برای بررسی انسانی ثبت می‌شود. ادامه؟',
       'This source stays pending human review. Continue?'))return;
     mutate({action:'propose_public_source',sourceId:id.value.trim(),
       issuer:issuer.value.trim(),canonicalUrl:address.value.trim(),
       licenceCode:licence.value.trim(),contentType:kind.value,
       language:language.value,trustClass:trust.value,usageRights:rights.value,
       acquisitionMethod:method.value,
       updateIntervalHours:Number(interval.value),
       confirmation:'REGISTER_SOURCE_PENDING_REVIEW'});
   });
   mountForm(actions,T('ثبت پیشنهاد جدید','Add a new proposal'),proposal);
   if(approved.length){
     const sourceVersion=el('form',undefined,'jr-hybrid-form');
     sourceVersion.append(el('h4',T('ثبت فرادادهٔ نسخهٔ تازه برای بازبینی','Stage version metadata for review')));
     const sourcePick=choice(sourceVersion,T('منبع مجاز','Approved source'),
       approved.map((s,i)=>[String(i),s.sourceId+' · '+s.issuer]));
     const digest=field(sourceVersion,'Document SHA-256','text','64 lowercase hex');
     digest.pattern='[a-f0-9]{64}';digest.minLength=64;digest.maxLength=64;
     digest.dir='ltr';digest.spellcheck=false;
     const byteCount=field(sourceVersion,T('حجم فایل، بایت','Retrieved document bytes'),'number','2048');
     byteCount.min='1';byteCount.max=String(8*1024*1024);byteCount.step='1';
     const retrievedAt=field(sourceVersion,T('زمان واقعی دریافت اعلام‌شده','Declared actual retrieval time'),'datetime-local');
     const submit=document.createElement('button');submit.type='submit';
     submit.textContent=T('ثبت نسخه در صف بررسی','Stage version for human review');
     sourceVersion.append(submit);
     sourceVersion.addEventListener('submit',event=>{
       event.preventDefault();if(!visible()||busy||!sourceVersion.reportValidity())return;
       const source=approved[Number(sourcePick.value)];
       const reportedAt=Date.parse(retrievedAt.value);
       if(!source||!Number.isFinite(reportedAt)||reportedAt>Date.now()+90000)return;
       const mime={HTML:'text/html',TEXT:'text/plain',PDF:'application/pdf',
         JSON:'application/json'}[source.contentType];
       if(!confirmAction('هش و حجم نسخه را مستقل از سامانه بررسی کرده‌اید؟ این ثبت اثبات دانلود نیست.',
         'Have you independently verified the version hash and size? This does not prove a fetch.'))return;
       mutate({action:'propose_source_version',sourceId:source.sourceId,
         documentSha256:digest.value.trim(),byteCount:Number(byteCount.value),
         retrievedAt:Math.floor(reportedAt/1000),publicationAt:null,
         declaredMime:mime,confirmation:'STAGE_SOURCE_DIGEST_FOR_REVIEW'});
     });
     mountForm(actions,T('ثبت نسخهٔ منبع جدید','Register source version'),sourceVersion);
   }
 }

 function renderCorpus(d){
   if(!d.catalogueReady){
     tasks.append(el('p',T('دفتر ثبت مجموعه‌داده‌ها هنوز در دیتابیس مادر ایجاد نشده است؛ مهاجرت فقط در مرحلهٔ انتشار نهایی و با اجازه مدیر انجام می‌شود.',
       'The governed corpus tables are not installed in the mother database. Their additive migration awaits owner-authorized release.')));
     return;
   }
   const records=Array.isArray(d.datasets)?d.datasets:[];
   const approved=records.filter(x=>x.status==='APPROVED');
   const panel=el('details',undefined,'jr-hybrid-jobs');
   panel.append(el('summary',T('دفتر داده‌های عمومی، نسخه‌ها و مجوزها','Reviewed-public corpus versions and rights')+
     ' · '+number(records.length)));
   panel.append(el('p',T(
     '«تأیید مدیر» فقط یک مجوز اجرایی ثبت‌شده است؛ تأیید مستقل صحت علمی، کیفیت سؤال‌ها یا حق نشر را اثبات نمی‌کند.',
     'Owner approval is a recorded operational permission, not independent scientific or licensing verification.')));
   if(!records.length)panel.append(el('p',T('هنوز هیچ مجموعه‌داده‌ای پیشنهاد نشده است.',
     'No public holdout dataset has been proposed.')));
   for(const corpus of records){
     const item=el('article',undefined,'jr-hybrid-node');
     item.append(el('h4',String(corpus.sourceLabel||corpus.datasetId).slice(0,160)));
     cell(item,T('شناسه و نسخه','Dataset and version'),
       String(corpus.datasetId)+' / '+String(corpus.evaluationVersion));
     cell(item,T('وضعیت','Status'),statusLabel(corpus.status));
     cell(item,T('مجوز ثبت‌شده','Recorded licence'),corpus.licenceCode||'—');
     cell(item,T('تعداد موارد مرورشدهٔ اعلامی','Declared reviewed cases'),
       number(corpus.reviewedCaseCount));
     cell(item,'Dataset SHA-256',corpus.datasetSha256||'—');
     cell(item,'Evidence SHA-256',corpus.evidenceSha256||'—');
     cell(item,T('هش سیاست پایه','Baseline policy SHA-256'),
       corpus.activePolicySha256||'—');
     const link=el('a',T('منبع معرفی‌شده','Declared source'));
     link.href=String(corpus.sourceUrl||'');
     link.target='_blank';link.rel='noopener noreferrer';
     item.append(link);
     if(corpus.status==='PENDING'){
       item.append(btn(T('تأیید مستقلِ بررسی و مجوز استفاده','Approve reviewed public version'),()=>{
         if(!confirmAction(
           'آیا مجوز استفاده، اصالت داده، برچسب‌های پاسخ مستقل و حداقل ۲۰۰ مورد بازبینی‌شده را خارج از سامانه بررسی کرده‌اید؟ هیچ انتشار خودکاری انجام نمی‌شود.',
           'Have you independently reviewed reuse rights, provenance and at least 200 human-labelled holdouts? No automatic publication.'))return;
         mutate({action:'approve_public_dataset',datasetId:corpus.datasetId,
           evaluationVersion:corpus.evaluationVersion,revision:corpus.revision,
           confirmation:'APPROVE_REVIEWED_PUBLIC_CORPUS'});
       }));
     }
     if(corpus.status==='PENDING'||corpus.status==='APPROVED'){
       item.append(btn(T('تعلیق این نسخه و قرنطینهٔ کارهای جاری','Suspend version and quarantine jobs'),()=>{
         if(!confirmAction(
           'تمام کارهای در صف این نسخه لغو و نتایج اجراهای نامعلوم برای بررسی نگهداری شوند؟',
           'Cancel queued jobs and quarantine in-flight outcomes for this version?'))return;
         mutate({action:'suspend_public_dataset',datasetId:corpus.datasetId,
           evaluationVersion:corpus.evaluationVersion,revision:corpus.revision,
           confirmation:'SUSPEND_PUBLIC_CORPUS_VERSION'});
       }));
     }
     panel.append(item);
   }
   tasks.append(panel);
   const proposal=el('form',undefined,'jr-hybrid-form');
   proposal.append(el('h4',T('پیشنهاد نسخهٔ دادهٔ عمومی برای بررسی','Propose an owner-reviewed public corpus')));
   const field=(form,title,placeholder,type='text')=>{
     const label=el('label',title),input=document.createElement('input');
     input.type=type;input.required=true;input.placeholder=placeholder;
     if(type==='text'||type==='url')input.maxLength=500;
     label.append(input);form.append(label);return input;
   };
   const id=field(proposal,T('شناسه یکتا','Dataset ID'),'reviewed-public-holdout-v1');
   id.maxLength=64;
   const version=field(proposal,T('نسخه ارزیابی','Evaluation version'),'reviewed-bm25-v1');
   version.maxLength=64;
   const source=field(proposal,T('صادرکننده و نام منبع','Source issuer and title'),
     T('منبع رسمی دارای اجازه','Authorised official source'));source.maxLength=160;
   const sourceUrl=field(proposal,T('نشانی HTTPS منبع','Public HTTPS source'),'https://...','url');
   const licence=field(proposal,T('مجوز استفاده','Reuse licence / authority'),'CC-BY-4.0');
   licence.maxLength=80;
   const datasetHash=field(proposal,'Held-out cases SHA-256','64 hexadecimal characters');
   const evidenceHash=field(proposal,'Evidence SHA-256','64 hexadecimal characters');
   for(const e of [datasetHash,evidenceHash]){e.minLength=64;e.maxLength=64;
     e.pattern='[a-f0-9]{64}';e.dir='ltr';e.spellcheck=false;}
   const cases=field(proposal,T('موارد بازبینی‌شده','Independently labelled case count'),
     '200','number');
   cases.min='200';cases.max='10000';cases.step='1';
   proposal.append(el('p',T(
     'سیاست بازیابی پایهٔ این نسخه؛ هش SHA-256 به‌صورت قطعی در سرور محاسبه می‌شود.',
     'Baseline retrieval policy. The server derives its canonical SHA-256, never trusting a submitted policy digest.')));
   const k1=field(proposal,'BM25 k1','1.2','number');k1.value='1.2';
   k1.min='0.8';k1.max='2.2';k1.step='0.001';
   const b=field(proposal,'BM25 b','0.75','number');b.value='0.75';
   b.min='0.2';b.max='0.9';b.step='0.001';
   const maxEvidence=field(proposal,'Maximum evidence','20','number');
   maxEvidence.value='20';maxEvidence.min='8';maxEvidence.max='40';maxEvidence.step='1';
   const submit=document.createElement('button');submit.type='submit';
   submit.textContent=T('ثبت پیشنهاد (در انتظار بررسی)','Propose (pending approval)');
   proposal.append(submit);
   proposal.addEventListener('submit',event=>{
     event.preventDefault();if(!visible()||busy||!proposal.reportValidity())return;
     if(!confirmAction('آیا فقط اطلاعات کتاب‌شناختی، مجوز و هش دادهٔ عمومی ثبت شوند؟',
       'Record only public provenance, rights and digest metadata as a pending proposal?'))return;
     mutate({action:'propose_public_dataset',datasetId:id.value.trim(),
       evaluationVersion:version.value.trim(),sourceLabel:source.value.trim(),
       sourceUrl:sourceUrl.value.trim(),licenceCode:licence.value.trim(),
       datasetSha256:datasetHash.value.trim(),
       evidenceSha256:evidenceHash.value.trim(),
       reviewedCaseCount:Number(cases.value),
       currentPolicy:{k1:Number(k1.value),b:Number(b.value),
         maxEvidence:Number(maxEvidence.value)},
       confirmation:'PROPOSE_PUBLIC_HOLDOUT_FOR_REVIEW'});
   });
   mountForm(actions,T('ثبت پیشنهاد جدید','Add a new proposal'),proposal);
   if(!approved.length){
     tasks.append(el('p',T('هیچ نسخهٔ تأییدشده‌ای برای تشکیل صف وجود ندارد.',
       'No approved corpus version is available for queueing.')));
     return;
   }
   const queue=el('form',undefined,'jr-hybrid-form');
   queue.append(el('h4',T('تشکیل صف ارزیابی با مجوز مدیر','Queue approved retrieval evaluation')));
   const select=document.createElement('select');
   for(let i=0;i<approved.length;i++){
     const r=approved[i],option=el('option',r.datasetId+' / '+r.evaluationVersion);
     option.value=String(i);select.append(option);
   }
   const label=el('label',T('مجموعه‌دادهٔ تأییدشده','Approved corpus version'));
   label.append(select);queue.append(label);
   queue.append(el('p',T('سیاست پایه فقط از دفتر نسخه‌ها دریافت می‌شود؛ مقادیر زیر سیاست آزمایشی رقیب هستند.',
     'The baseline is taken from the approved version; the fields below define the challenger policy.')));
   const candidateK=field(queue,'Challenger BM25 k1','1.3','number');
   candidateK.min='0.8';candidateK.max='2.2';candidateK.step='0.001';candidateK.value='1.3';
   const candidateB=field(queue,'Challenger BM25 b','0.75','number');
   candidateB.min='0.2';candidateB.max='0.9';candidateB.step='0.001';candidateB.value='0.75';
   const candidateMax=field(queue,'Challenger maximum evidence','20','number');
   candidateMax.min='8';candidateMax.max='40';candidateMax.step='1';candidateMax.value='20';
   const queueSubmit=document.createElement('button');queueSubmit.type='submit';
   queueSubmit.textContent=T('افزودن کار به صف کنترل‌شده','Queue governed evaluation');
   queue.append(queueSubmit);
   queue.addEventListener('submit',event=>{
     event.preventDefault();if(!visible()||busy||!queue.reportValidity())return;
     const row=approved[Number(select.value)];
     if(!row||!row.currentPolicy)return;
     const candidatePolicy={k1:Number(candidateK.value),b:Number(candidateB.value),
       maxEvidence:Number(candidateMax.value)};
     if(!confirmAction('ارزیابی به نود مجاز واگذار می‌شود؛ نتیجه فقط برای بررسی مدیر است. ادامه؟',
       'An eligible worker may receive this job. Results remain owner-review-only. Continue?'))return;
     mutate({action:'queue_reviewed_retrieval',datasetId:row.datasetId,
       evaluationVersion:row.evaluationVersion,
       currentPolicy:row.currentPolicy,candidatePolicy,
       confirmation:'QUEUE_PUBLIC_REVIEWED_DATASET'});
   });
   mountForm(tasks,T('فرم تشکیل صف ارزیابی','Queue an evaluation'),queue);
 }

 function render(d){
   blank();
   if(!d.motherDbSchemaReady){
     say(T('جداول Worker در دیتابیس مادر هنوز تأیید نشده‌اند؛ هیچ اتصال واقعی ادعا نمی‌شود.',
       'Worker tables are unavailable. No real connection is claimed.'));
     return;
   }
   const summary=el('div',undefined,'jr-hybrid-grid');
   cell(summary,T('مجوز خصوصی سرور','Private backend switch'),d.backendEnabled?
     T('مجاز؛ سلامت هنوز تأیید نشده','Permitted; health not independently verified'):
     T('خاموش','OFF'));
   cell(summary,T('نودهای ثبت‌شده','Registered nodes'),number(d.nodes?.length));
   cell(summary,T('کارهای در صف','Queued jobs'),number(d.counts?.queued));
   cell(summary,T('کارهای واگذارشده','Leased jobs'),number(d.counts?.leased));
   cell(summary,T('نیازمند بررسی','Review required'),number(d.counts?.reviewRequired));
   cell(summary,T('مدل زبانی واقعاً آزموده‌شده','Independently verified LLM'),
     d.modelInferenceVerified?T('نیازمند گزارش پذیرش','See acceptance evidence'):
     T('تأیید نشده؛ فقط بازیابی شواهد','Unverified; evidence retrieval only'));
   const lm=d.jreiLocalGenerative;
   if(lm&&lm.schema==='jr.jrei.local-generative-owner.v1'){
     cell(summary,T('جداول صف مکالمه JREI-LM','JREI-LM chat queue tables'),
       lm.motherDatabaseSchemaReady?T('در دیتابیس مادر موجود','Available in mother database'):
         T('مهاجرت هنوز اجرا نشده','Pending additive migration'));
     cell(summary,T('مراقب خودکار جداول JREI-LM','JREI-LM schema caretaker'),
       lm.schemaCaretakerEnabled===true?
         T('مجوز خصوصی روشن؛ اجرای واقعی هنوز نیازمند تأیید','Owner switch on; execution not verified'):
         T('مجوز خصوصی خاموش','Owner switch off'));
     cell(summary,T('ارجاع پشتیبان خصوصی مادر','Mother DB private backup reference'),
       lm.schemaCaretakerBackupReferenceConfigured===true?
         T('تنظیم شده؛ اصالت پشتیبان هنوز بررسی نشده','Configured; backup not verified'):
         T('تنظیم نشده','Not configured'));
     cell(summary,T('اتصال مدل محلی','Local model pathway'),
       lm.live===true?T('آمادهٔ دریافت کار؛ آزمون مکالمه ضروری است',
         'Eligible for jobs; real dialogue test still required'):
         T('غیرفعال یا بدون Worker تأییدشده','Offline or not approved'));
     // Owner-visible source-of-truth blockers, computed by PHP from the
     // existing mother DB and private server policies. Never invite the
     // owner to manipulate phpMyAdmin or copy secret keys into the browser.
     const readiness=lm.readinessGates;
     if(readiness&&Array.isArray(readiness.gates)){
       const labels={
         mother_db_schema:['ساختار دیتابیس مادر','Mother DB AI schema'],
         hybrid_private_switch:['مجوز خصوصی Hybrid','Hybrid private authorization'],
         local_chat_private_switch:['مجوز خصوصی مکالمه','Local chat private authorization'],
         owner_public_release:['پذیرش انتشار عمومی','Owner public-release acceptance'],
         private_queue_encryption:['رمزگذاری خصوصی صف','Private queue encryption'],
         approved_public_evidence_index:['نمایه شواهد عمومی','Approved public-evidence index'],
         privacy_retention_worker:['پاکسازی دوره‌ای واقعی','Verified privacy retention execution'],
         registered_local_model:['مدل ثبت‌شده در دیتابیس','Registered local model'],
         rights_reviewed_model:['حقوق استفاده بررسی‌شده','Reviewed model rights'],
         independently_accepted_model:['کیفیت مدل مستقلاً پذیرفته‌شده','Independent model quality acceptance'],
         authorized_generative_node:['مجوز مستقل Worker مکالمه','Generative node permission'],
         recent_signed_generative_poll:['امضای تازه Worker مکالمه','Recent signed chat worker poll']
       };
       const states={
         PASS:T('تأیید ساختاری/سیاستی','Server gate satisfied'),
         BLOCKED:T('مانع مشخص شناسایی شد','Confirmed blocker'),
         UNKNOWN:T('داده کافی نیست','Unknown; unavailable evidence')
       };
       const blockers=readiness.gates.filter(x=>x&&x.state!=='PASS');
       cell(summary,T('موانع واقعی فعال‌سازی هوش مصنوعی','AI activation blockers'),
         blockers.length?number(blockers.length)+T(' مانع/نامعلوم',' blocked/unknown'):
           T('گیت‌های سرور آماده؛ آزمون واقعی سایت هنوز لازم است',
             'Server gates satisfied; real dialogue acceptance still required'));
       for(const gate of blockers){
         if(!Object.hasOwn(labels,gate.id))continue;
         const label=labels[gate.id];
         cell(summary,T(label[0],label[1]),
           states[gate.state]||states.UNKNOWN);
       }
     }
     cell(summary,T('مجوزهای Worker گفت‌وگو','Approved generative nodes'),
       number(lm.authorizedNodes));
     // Registration and evaluation-mode heartbeats cannot masquerade as
     // a live GGUF conversational backend. These numbers come from the
     // server's independent signed generative-only timestamps.
     cell(summary,T('Workerهای مکالمه با امضای تازه',
       'Recently signed generative workers'),
       Number.isSafeInteger(lm.recentlySignedGenerativeWorkers)?
         number(lm.recentlySignedGenerativeWorkers):
         T('نامعلوم؛ دادهٔ معتبر در دسترس نیست','Unknown; authoritative data unavailable'));
     if(Array.isArray(lm.generativeWorkerStates)){
       for(const worker of lm.generativeWorkerStates.slice(0,8)){
         if(typeof worker.nodeId!=='string')continue;
         const state=worker.state==='RECENT_SIGNED_CHAT_POLL'?
           T('امضای تازه؛ آزمون مدل همچنان ضروری است',
             'Recent signature; model dialogue still requires acceptance'):
           worker.state==='NO_RECENT_SIGNED_CHAT_POLL'?
             T('بدون امضای مکالمه تازه','No recent signed chat poll'):
           worker.state==='MODEL_REVIEW_REQUIRED'?
             T('مدل نیازمند تأیید مستقل','Model independent review required'):
           worker.state==='NODE_DISABLED_OR_REVOKED'?
             T('نود اصلی غیرفعال یا لغوشده','Original node disabled or revoked'):
           T('مجوز مکالمه خاموش','Generative permission disabled');
         const seen=Number.isSafeInteger(worker.lastSignedAt)?
           T('؛ آخرین امضا: ','; last signed: ')+date(worker.lastSignedAt):'';
         cell(summary,T('Worker مکالمه','Generative worker')+' '+
           worker.nodeId.slice(0,8),state+seen);
       }
     }
     cell(summary,T('پیام‌های در صف JREI-LM','JREI-LM queued and leased requests'),
       number(lm.pendingOrLeasedJobs));
     if(lm.liveJobStates&&typeof lm.liveJobStates==='object'){
       const labels=[
         ['queued',T('درخواست‌های مکالمه در انتظار','Unexpired queued dialogues')],
         ['leased',T('در حال پردازش در رایانه','Leased to Windows model')],
         ['completed',T('پاسخ آماده و هنوز دریافت‌نشده','Response ready for collection')],
         ['blocked',T('پاسخ مسدودشده توسط کنترل شواهد','Blocked by evidence gate')],
         ['failed',T('پردازش ناموفق؛ هنوز پاک‌سازی‌نشده','Failed awaiting erasure')]
       ];
       for(const [key,label] of labels){
         const count=lm.liveJobStates[key];
         cell(summary,label,Number.isSafeInteger(count)&&count>=0?
           number(count):T('نامعلوم','Unknown'));
       }
     }
     cell(summary,T('کلید رمزگذاری خصوصی','Private message encryption key'),
       lm.privateEncryptionKeyConfigured===true?
         T('پیکربندی شده؛ اعتبارسنجی محیط هنوز مستقل است',
           'Configured; deployment verification remains separate'):
         T('نصب نشده','Not provisioned'));
     cell(summary,T('پاک‌سازی امن صف مکالمه','Encrypted queue retention janitor'),
       lm.privateRetentionWorkerReady===true?
         T('آخرین اجرای Cron معتبر و تازه؛ پذیرش نهایی باقی است',
           'Recent successful Cron; final acceptance pending'):
         T('اجرای معتبر اخیر تأیید نشده','Recent successful cleanup not confirmed'));
     cell(summary,T('فهرست عمومی شواهد','Approved public evidence index'),
       lm.approvedPublicEvidenceIndexReadable===true?
         T('فایل قابل‌خواندن؛ اعتبار علمی جداگانه بررسی شود',
           'Index readable; independent scientific review outstanding'):
         T('فایل در دسترس نیست','Public evidence index unavailable'));
     if(lm.motherDatabaseSchemaReady!==true){
       listing.append(el('p',T(
         'پردازش گفت‌وگوی اختصاصی تا اجرای مهاجرت افزایشی، اتصال مدل واقعی و پذیرش مجزا غیرفعال می‌ماند.',
         'JREI-LM chat stays OFF until its additive migration, measured local model runtime and separate approval are complete.')));
     }
   }else{
     cell(summary,T('وضعیت هوش مصنوعی اختصاصی','Owned JREI-LM status'),
       T('نامعلوم؛ هنوز دادهٔ معتبر دریافت نشده','Unknown; no verified state received'));
   }
   const monitor=d.incidentMonitoring;
   if(monitor&&monitor.schema==='jr.jrei.incident-monitor-status.v1'){
     const counts=monitor.incidentCounts||{};
     cell(summary,T('هشدارهای باز JREI','Open JREI incidents'),number(counts.open));
     cell(summary,T('هشدارهای بحرانی JREI','Critical JREI incidents'),
       number(counts.critical));
     cell(summary,T('مجوز خصوصی حسگر','Private sensor opt-in'),
       monitor.privateOptIn===true?
         T('مجاز؛ اجرا مستقل بررسی شود','Permitted; check actual execution'):
         T('خاموش','OFF'));
     const sensor=monitor.cronNeedsReview===true?
       T('نیازمند بازبینی مدیر','Owner review required'):
       !monitor.cronRegistered?T('در Cron ثبت نشده','Not registered in Cron'):
       !monitor.cronEnabled?T('Cron غیرفعال','Cron disabled'):
       !Number.isSafeInteger(monitor.cronLastFinishedAt)?
         T('اجرای ثبت‌شده ندارد','No recorded execution'):
         T('آخرین گزارش Cron: ','Last Cron report: ')+date(monitor.cronLastFinishedAt);
     cell(summary,T('وضعیت حسگر رخداد','Incident observer'),sensor);
     const emailCandidate=monitor.privateOptIn===true&&
       monitor.globalEmailEnabled===true&&monitor.featureEmailOptIn===true&&
       monitor.cronEnabled===true;
     cell(summary,T('اعلان‌های ایمیلی JREI','JREI incident emails'),
       emailCandidate?T('بررسی مجوز هر رخداد؛ ارسال تأیید نشده',
         'Check individual rule; delivery unverified'):
         T('غیرفعال یا ناقص','Disabled or incomplete'));
   }else{
     cell(summary,T('وضعیت هشدارها','Incident status'),
       T('نامعلوم؛ دادهٔ معتبر دریافت نشده','Unknown; unavailable data'));
   }
   const queue=d.queueHealth;
   if(queue&&queue.schema==='jr.jrei.queue-health.v1'){
     const q=queue.counts||{};
     const maybe=n=>Number.isSafeInteger(n)?number(n):
       T('نامعلوم','Unknown');
     cell(summary,T('در صف و منقضی نشده','Unexpired queued jobs'),
       maybe(q.readyQueued));
     cell(summary,T('اجاره‌های منقضی‌شده و رسیدگی‌نشده',
       'Expired leases awaiting reconciliation'),maybe(q.staleLeasedUnreconciled));
     cell(summary,T('کارهای صف منقضی‌شده و رسیدگی‌نشده',
       'Expired queued jobs awaiting reconciliation'),maybe(q.expiredQueuedUnreconciled));
     cell(summary,T('نتیجهٔ نامعلوم در انتظار مدیر',
       'Unknown job outcomes awaiting owner'),maybe(q.unknownOutcomeAwaitingOwner));
     cell(summary,T('بازبینی نتایج عقب‌افتاده',
       'Overdue aggregate reviews'),maybe(q.aggregateReviewOverdue));
     const reconcileStatus=!queue.reconciliationPolicyEnabled?
       T('اجازهٔ خصوصی خاموش','Private policy OFF'):
       !queue.reconciliationCronRegistered?
       T('Cron ثبت نشده','Cron not registered'):
       !queue.reconciliationCronEnabled?
       T('Cron غیرفعال','Cron disabled'):
       queue.reconciliationNeedsOwnerReview?
       T('نیازمند بازبینی مدیر','Owner review required'):
       Number.isSafeInteger(queue.reconciliationLastFinishedAt)?
       T('آخرین گزارش: ','Last reported: ')+date(queue.reconciliationLastFinishedAt):
       T('اجرا هنوز گزارش نشده','No reported execution');
     cell(summary,T('رسیدگی ایمن به اجاره‌های منقضی',
       'Safe lease reconciliation'),reconcileStatus);
     listing.append(el('p',T(
       'اجارهٔ منقضی نشان‌دهندهٔ نتیجهٔ نامعلوم است؛ بازیابی خودکار یا تأیید علمی از روی این اعداد انجام نمی‌شود.',
       'Expired leases indicate unknown execution outcomes; no automatic replay or scientific validation follows from these counts.')));
   }
   const readiness=d.readiness;
   if(readiness&&readiness.schema==='jr.jrei.owner-readiness.v1'){
     cell(summary,T('آمادگی دریافت کار پژوهشی','Research job readiness'),
       readiness.status==='CANDIDATE_FOR_GOVERNED_EVALUATION'?
         T('فقط نامزد ارزیابی؛ اجرای واقعی هنوز تأیید نشده',
           'Evaluation candidate; real execution not yet verified'):
         T('هنوز آماده نیست','Not ready'));
     cell(summary,T('نسخه‌های مجاز دادهٔ عمومی',
       'Approved public corpus versions'),number(readiness.approvedCorpusVersions));
     cell(summary,T('رایانه‌های با اعلام موجودی منطبق',
       'Nodes declaring a matching version'),
       number(readiness.declaringMatchedCorpusCount));
     cell(summary,T('وضعیت دستیار گفت‌وگومحور عمومی','Public conversational AI'),
       T('فعال‌سازی و پذیرش انجام نشده','Activation and acceptance not established'));
     const blockers=Array.isArray(readiness.blockedReasons)?
       readiness.blockedReasons:[];
     if(blockers.length){
       const cause={
         HYBRID_TABLES_UNAVAILABLE:T('جداول پایه Worker در دیتابیس موجود نیست',
           'Base Worker tables unavailable'),
         PRIVATE_HYBRID_SWITCH_OFF:T('مجوز خصوصی اتصال سرور خاموش است',
           'Private hybrid worker switch is OFF'),
         GOVERNED_CORPUS_MIGRATION_REQUIRED:T('مهاجرت افزایشی دفتر داده اجرا نشده',
           'Governed corpus migration is pending'),
         NO_APPROVED_PUBLIC_HOLDOUT_VERSION:T('هیچ نسخهٔ پژوهشی عمومی بازبینی و تأیید نشده',
           'No independently reviewed public holdout has been approved'),
         NO_CONNECTED_ELIGIBLE_SIGNED_NODE:T('Worker امضاشدهٔ آماده در لحظه مشاهده نشده',
           'No currently eligible signed worker observed'),
         NODE_DECLARATION_REGISTRY_UNAVAILABLE:T('دفتر اعلام موجودی Worker نصب نشده',
           'Signed local offer registry unavailable'),
         NO_MATCHING_SIGNED_LOCAL_CORPUS_DECLARATION:T('هیچ Worker نسخهٔ منطبق اعلام نکرده',
           'No worker advertises the exact approved corpus'),
         UNKNOWN_JOB_OUTCOME_NEEDS_MANUAL_REVIEW:T('نتیجهٔ نامعلوم نیازمند تصمیم مدیر است',
           'Unknown job outcomes require owner review'),
         QUEUE_HEALTH_NOT_OBSERVABLE:T('سلامت صف هنوز قابل مشاهده نیست',
           'Queue health cannot be established')
       };
       const details=el('details',undefined,'jr-hybrid-jobs');
       details.append(el('summary',
         T('موانع عملیاتی تأییدنشده','Operational readiness blockers')+
           ' · '+number(blockers.length)));
       for(const reason of blockers)details.append(el('p',
         cause[reason]||String(reason).slice(0,90)));
       listing.append(details);
     }
   }
   listing.append(summary);
   if(newNodeId){
     const note=el('p',T('نود جدید غیرفعال ثبت شد؛ شناسه زیر را در پیکربندی خصوصی همان رایانه وارد کنید:',
       'A new DISABLED node was registered. Enter its ID into that computer’s private config:'));
     note.append(el('code',newNodeId));listing.append(note);
   }
   const nodes=Array.isArray(d.nodes)?d.nodes:[];
   if(!nodes.length)listing.append(el('p',T('هنوز هیچ کلید عمومی ثبت نشده است.',
     'No public keys registered yet.')));
   for(const n of nodes.slice(0,20)){
     const box=el('article',undefined,'jr-hybrid-node');
     box.append(el('h4',String(n.name||'Node').slice(0,80)));
     cell(box,T('نوع','Type'),String(n.providerType||'—'));
     cell(box,T('وضعیت','Status'),statusLabel(n.state));
     cell(box,T('آخرین ضربان امضاشده','Last signed heartbeat'),date(n.lastSeenAt));
     cell(box,'CPU',typeof n.reportedCpuPercent==='number'?
       fmt.format(n.reportedCpuPercent)+'%':T('نامعلوم','Unknown'));
     cell(box,'RAM',typeof n.reportedRamPercent==='number'?
       fmt.format(n.reportedRamPercent)+'%':T('نامعلوم','Unknown'));
     cell(box,'GPU',typeof n.reportedGpuPercent==='number'?
       fmt.format(n.reportedGpuPercent)+'%':T('نامعلوم؛ RX 580 آزموده نشده','Unknown; RX 580 untested'));
     cell(box,T('مدل','Model'),n.modelId||T('بارگذاری نشده یا تأیید نشده','No verified loaded model'));
     cell(box,T('شناسه برتینا','Node ID'),n.nodeId||'—');
     if(lm?.motherDatabaseSchemaReady===true&&n.ownerEnabled===true&&!n.revoked){
       // First authorization must NOT require n.modelId from a prior chat
       // poll: a node cannot poll for its model until that permission exists.
       const verifiedModels=Array.isArray(d.registeredModels)?
         d.registeredModels.filter(m=>m.status==='RIGHTS_REVIEWED'&&
           m.weightsInstalledVerified===true&&m.runtimeVerified===true&&
           m.independentQualityAccepted===true):[];
       if(verifiedModels.length&&lm.privateSwitchEnabled===true){
         const holder=el('label',T('مدل مورد تأیید برای این Worker',
           'Approved model for this Windows worker'));
         const choice=document.createElement('select');
         for(const model of verifiedModels){
           const option=el('option',model.modelId+' / '+model.modelVersion);
           option.value=model.modelId+'|'+model.modelVersion;
           choice.append(option);
         }
         holder.append(choice);box.append(holder);
         box.append(btn(T('تأیید جداگانهٔ Worker مکالمه JREI-LM',
           'Authorize this JREI-LM conversational worker'),()=>{
           const chosen=verifiedModels.find(m=>
             m.modelId+'|'+m.modelVersion===choice.value);
           if(!chosen)return;
           if(!confirmAction(
             'آیا صحت فایل مدل روی همین رایانه، کیفیت مستقل و حقوق استفاده را بررسی کرده‌اید؟ این اقدام فقط مجوز جداگانهٔ نود است، نه انتشار عمومی.',
             'Have you reviewed the actual model on this exact Windows PC, its independent quality evidence and rights? This grants only a node-specific permission, not public release.'))return;
           mutate({action:'set_local_chat_node',nodeId:n.nodeId,revision:n.revision,
             enabled:true,modelId:chosen.modelId,modelVersion:chosen.modelVersion,
             modelSha256:chosen.artifactSha256,
             confirmation:'OWNER_APPROVE_JREI_LOCAL_INFERENCE'});
         }));
       }
       box.append(btn(T('لغو مجوز مکالمه محلی این Worker',
         'Disable this worker\'s local chat permission'),()=>{
         if(!confirmAction(
           'مجوز استفاده از این رایانه برای پاسخ‌گویی محلی لغو شود؟ درخواست‌های فعال ممکن است نامعلوم بمانند.',
           'Disable local conversation permission on this computer? In-flight work may be uncertain.'))return;
         mutate({action:'set_local_chat_node',nodeId:n.nodeId,
           revision:n.revision,enabled:false,
           confirmation:'OWNER_DISABLE_JREI_LOCAL_INFERENCE'});
       }));
     }
      // Eligibility comes from the signed offers and actual Bertina queue.
      const report=(Array.isArray(d.dispatchDiagnostics)?
        d.dispatchDiagnostics:[]).find(item=>item.nodeId===n.nodeId);
      const message={
        BACKEND_DISABLED:T('موتور خصوصی سرور خاموش است','Private backend is disabled'),
        NODE_REVOKED:T('کلید لغو شده','Node key revoked'),
        OWNER_DISABLED:T('مدیر نود را غیرفعال کرده','Node disabled by owner'),
        NODE_OFFLINE:T('ضربان امضاشدهٔ اخیر وجود ندارد','No recent signed heartbeat'),
        NODE_REPORTS_BUSY:T('نود مشغول است یا فشار منابع دارد',
          'Worker reports busy or resource pressure'),
        NODE_NOT_ELIGIBLE:T('وضعیت نود برای دریافت کار مناسب نیست',
          'Node state does not permit new work'),
        CATALOGUE_NOT_MIGRATED:T('جدول داده‌های تأییدشده نصب نشده',
          'Approved dataset schema unavailable'),
        OFFER_RECORDS_NOT_AVAILABLE:T('ثبت موجودی محلی نصب نشده',
          'Signed local-offer registry unavailable'),
        WORKER_HAS_ACTIVE_LEASE:T('کار دیگری به این رایانه واگذار شده',
          'This worker already holds a job lease'),
        NO_APPROVED_LOCAL_CORPUS:T('هیچ نسخه محلی مطابق تأیید مدیر ثبت نشده',
          'No locally offered dataset matches an approved version'),
        NO_QUEUED_JOB_FOR_LOCAL_CORPUS:T('داده مجاز حاضر است ولی کار منطبق در صف نیست',
          'Approved local corpus available, but no matching queued job'),
        APPROVED_JOB_WAITING_FOR_POLL:T('کار منطبق در صف است؛ انتظار برای درخواست نود',
          'Eligible job queued; awaiting the next worker poll')
      }[report?.reasonCode]||T('آمادگی تخصیص هنوز معلوم نیست',
        'Dispatch eligibility has not yet been established');
      cell(box,T('علت وضعیت تخصیص کار','Job dispatch status'),message);
      if(report?.reasonCode==='APPROVED_JOB_WAITING_FOR_POLL')
        cell(box,T('تعداد کارهای منطبق','Eligible queued jobs'),
          number(report.matchingQueuedJobCount));
      if(d.nodeOffersAvailable){
        const offers=(Array.isArray(d.nodeOffers)?d.nodeOffers:[])
          .filter(o=>o.nodeId===n.nodeId);
        const good=offers.filter(o=>o.matchesApprovedVersion===true);
        cell(box,T('مجموعه‌داده‌های اعلام‌شده','Recently advertised corpora'),
          offers.length?number(good.length)+' / '+number(offers.length)+
          T(' نسخه مورد تأیید',' matching approved versions'):
          T('هیچ نسخهٔ محلی اخیراً اعلام نشده','No recent local corpus advertisement'));
        if(offers.length&&!good.length)
          box.append(el('p',T('هیچ‌یک از هش‌ها و نسخه‌های اعلام‌شده مجوز اعزام کار ندارند.',
            'No advertised digest and version currently match an approved corpus.')));
      }else{
        cell(box,T('امکان بررسی مجموعه‌داده','Corpus readiness'),
          T('نیازمند مهاجرت افزایشی','Additive migration not applied'));
      }
     if(n.revoked!==true){
       const enable=!n.ownerEnabled;
       const toggle=btn(enable?T('فعال‌سازی پس از پذیرش','Enable after acceptance'):
         T('توقف کارهای آینده','Disable future work'),()=>{
         if(enable&&!d.backendEnabled)return;
         if(!confirmAction(enable?
           'فعال‌سازی فقط پس از پذیرش نهایی، بررسی امنیت و اجازه انتشار انجام شود؟':
           'توقف نود ممکن است نتیجه کار در حال اجرا را نامعلوم بگذارد. ادامه؟',
           enable?'Enable ONLY after final security and release approval?':
           'Disabling may leave in-flight work unconfirmed. Continue?'))return;
         mutate({action:'set_node',nodeId:n.nodeId,revision:n.revision,
           enabled:enable,confirmation:enable?'ACTIVATE_APPROVED_SIGNED_WORKER':''});
       });
       toggle.disabled=enable&&!d.backendEnabled;box.append(toggle);
       const revoke=btn(T('لغو دائمی کلید','Permanently revoke key'),()=>{
         if(confirmAction('این کلید دیگر قابل فعال‌سازی نخواهد بود. تأیید؟',
           'This key cannot be reactivated. Confirm?'))
           mutate({action:'revoke_node',nodeId:n.nodeId,revision:n.revision,
             confirmation:'IRREVOCABLY_REVOKE_WORKER_KEY'});
       });
       box.append(revoke);
     }
     listing.append(box);
   }
   const recent=Array.isArray(d.jobs)?d.jobs:[];
   const detail=el('details',undefined,'jr-hybrid-jobs');
   detail.append(el('summary',T('کارهای موجود در صف برتینا','Existing Bertina jobs')));
   if(!recent.length)detail.append(el('p',T('هنوز کار ثبت نشده است.',
     'No jobs recorded.')));
   for(const j of recent.slice(0,30)){
     const r=el('div',undefined,'jr-hybrid-job');
     r.append(el('span',statusLabel(j.status)+' · '+String(j.datasetId||'—').slice(0,64)));
     r.append(el('small',date(j.queuedAt)));
      if(j.failureCode)r.append(el('small',
        T('علت: ','Reason: ')+String(j.failureCode).slice(0,70)));
      const aggregate=j.unverifiedAggregate;
      if(aggregate&&typeof aggregate==='object'){
        r.append(el('small',T('خلاصهٔ گزارش‌شدهٔ Worker؛ هنوز تأیید علمی مستقل نشده: ',
            'Worker-reported aggregate, not independently validated: ')+
          String(aggregate.baselineCorrect)+' → '+String(aggregate.candidateCorrect)+
          ' / '+String(aggregate.caseCount)+' · '+String(aggregate.reason||'').slice(0,70)));
      }
      if(j.status==='REVIEW_REQUIRED'||j.status==='NEEDS_REVIEW'){
        const decisions=j.status==='NEEDS_REVIEW'?
          [['CLOSE_UNKNOWN',T('بستن نتیجهٔ نامعلوم','Close unknown outcome')]]:
          [['ACKNOWLEDGE',T('ثبت بازبینی بدون انتشار','Acknowledge, do not publish')],
           ['REJECT',T('رد نتیجه','Reject result')]];
        const reasonOptions={
          ACKNOWLEDGE:[
            ['METRICS_INSPECTED_NO_PUBLICATION',T('آمار بررسی شد؛ بدون انتشار','Metrics examined, no publication')],
            ['RESEARCH_VERIFICATION_OUTSTANDING',T('تأیید پژوهشی همچنان باقی است','Independent research review outstanding')]
          ],
          REJECT:[
            ['UNSUPPORTED_EVALUATION_METRICS',T('آمار ادعاشده پشتیبانی ندارد','Reported metrics unsupported')],
            ['PROTOCOL_MISMATCH',T('عدم انطباق قرارداد ارزیابی','Evaluation protocol mismatch')],
            ['CORPUS_APPROVAL_REVOKED',T('مجوز مجموعه‌داده لغو شده','Corpus approval revoked')]
          ],
          CLOSE_UNKNOWN:[
            ['UNKNOWN_OUTCOME_NOT_RETRIED',T('نتیجه نامعلوم؛ اجرای مجدد ممنوع','Unknown execution, no replay')],
            ['CORPUS_APPROVAL_REVOKED',T('مجوز مجموعه‌داده لغو شده','Corpus approval revoked')]
          ]
        };
        for(const [decision,label] of decisions){
          const wrap=el('label',T('دلیل تصمیم مدیر','Owner decision reason'));
          const reasonSelect=document.createElement('select');
          for(const [code,title] of reasonOptions[decision]||[]){
            const option=el('option',title);option.value=code;
            reasonSelect.append(option);
          }
          wrap.append(reasonSelect);r.append(wrap);
          r.append(btn(label,()=>{
            if(!confirmAction(
              'بازبینی فقط در سوابق مدیریتی ثبت می‌شود؛ هیچ نتیجه‌ای منتشر یا به‌طور علمی تأیید نخواهد شد. ادامه؟',
              'Record an audited owner decision only; no publication or scientific validation. Continue?'))return;
            mutate({action:'record_job_review',jobId:j.jobId,
              revision:j.revision,decision,rationaleCode:reasonSelect.value,
              confirmation:'REVIEW_AGGREGATE_WITHOUT_PUBLICATION'});
          }));
        }
      }
     if(j.status==='QUEUED'||j.status==='LEASED'){
       r.append(btn(T('لغو کار','Cancel job'),()=>{
         if(!confirmAction('ممکن است اجرای محلی کامل شده باشد؛ نتیجه نیازمند بررسی می‌شود. ادامه؟',
           'Local work may already have finished. Outcome needs review. Continue?'))return;
         mutate({action:'cancel_job',jobId:j.jobId,revision:j.revision,
           confirmation:'CANCEL_FUTURE_JOB_PROCESSING'});
       }));
     }
     detail.append(r);
   }
   tasks.append(detail);
   renderCorpus(d);
   renderSources(d);
   renderModels(d);
   renderReviewHistory(d);
   const form=document.createElement('form');form.className='jr-hybrid-form';
   form.append(el('h4',T('ثبت کلید عمومی مستقل','Register separate public key')));
   const field=(title,widget)=>{const wrap=el('label',title);wrap.append(widget);
     form.append(wrap);return widget;};
   const name=field(T('نام نمایشی','Display name'),document.createElement('input'));
   name.required=true;name.maxLength=80;name.placeholder='JREI-NODE-A';
   const select=document.createElement('select');
   for(const [value,label] of [
     ['LOCAL_WINDOWS_WORKER',T('سیستم اول Ryzen 5600G / 32GB','First PC: Ryzen 5600G / 32GB')],
     ['LOCAL_SECONDARY_WORKER',T('سیستم دوم Ryzen 5600X / 16GB','Second PC: Ryzen 5600X / 16GB')]
   ]){const o=el('option',label);o.value=value;select.append(o);}
   field(T('نوع نود','Worker type'),select);
   const publicKey=field(T('فقط کلید عمومی Ed25519','Ed25519 PUBLIC key only'),
     document.createElement('input'));
   publicKey.required=true;publicKey.autocomplete='off';publicKey.maxLength=44;
   publicKey.dir='ltr';publicKey.spellcheck=false;publicKey.placeholder='44-character Ed25519 public key';
   form.append(el('p',T('کلید خصوصی همیشه روی همان رایانه و رمزگذاری‌شده باقی می‌ماند.',
     'The encrypted private key stays exclusively on its own PC.')));
   const save=document.createElement('button');
   save.type='submit';save.textContent=T('ثبت کلید عمومی (نود خاموش می‌ماند)','Register public key (worker stays OFF)');
   form.append(save,el('p',T('این دکمه فعال است. ثبت کلید فقط هویت رایانه را ذخیره می‌کند و اجرای آن را روشن نمی‌کند.','This button is active. Registering the public key does not enable the worker.')));
   form.addEventListener('submit',ev=>{
     ev.preventDefault();
     if(!visible()||busy||!form.reportValidity()||
        !/^[A-Za-z0-9+/]{43}=$/.test(publicKey.value.trim()))return;
     if(!confirmAction('کلید عمومی صرفاً با وضعیت غیرفعال ثبت شود؟',
       'Register this public key as DISABLED?'))return;
     mutate({action:'register_node',label:name.value.trim(),
       providerType:select.value,publicKeyB64:publicKey.value.trim(),
       confirmation:'REGISTER_PUBLIC_KEY_DISABLED'});
   });
   mountForm(actions,T('ثبت نود جدید؛ فقط در صورت نیاز','Register another node only when needed'),form);
   say(T('این‌ها فقط داده‌های سرور هستند. عکس رایانه روشن، اتصال واقعی به برتینا را اثبات نمی‌کند.',
     'These are server records. A powered-on computer is not evidence of a Bertina worker connection.'));
 }
 async function load(){
   if(!visible()||busy)return;
   const token=++seq;controller?.abort();controller=new AbortController();
   const current=controller,timer=setTimeout(()=>current.abort(),15000);
   busy=true;refresh.disabled=true;blank();
   say(T('در حال دریافت وضعیت از دیتابیس مادر…','Loading mother-database status…'));
   try{
     const response=await fetch(url,{credentials:'same-origin',cache:'no-store',
       headers:{Accept:'application/json'},signal:current.signal});
     if(!response.ok)throw Error('READ_FAILED');
     const data=await response.json();
     if(token!==seq||!visible())return;
     if(data?.ok!==true||data.schema!=='jr.jrei.hybrid-owner.v1'||
        !Array.isArray(data.nodes)||!Array.isArray(data.jobs))
       throw Error('CONTRACT_INVALID');
     render(data);
   }catch{
     if(token!==seq||!visible())return;
     blank();say(T('داده تأیید نشد. احراز دومرحله‌ای را بررسی و دوباره تلاش کنید.',
       'Cannot verify the current state. Check MFA and retry.'));
   }finally{clearTimeout(timer);
     if(token===seq){controller=null;busy=false;refresh.disabled=false;}
   }
 }
 async function mutate(payload){
   if(!visible()||busy)return;
   const token=++seq;controller?.abort();controller=new AbortController();
   const current=controller,timer=setTimeout(()=>current.abort(),20000);
   busy=true;refresh.disabled=true;blank();newNodeId=null;
   let succeeded=false;
   say(T('در حال ثبت درخواست دارای احراز دومرحله‌ای…',
     'Submitting owner-authenticated operation…'));
   try{
     const check=await fetch('/api/admin/operations/session',{
       credentials:'same-origin',cache:'no-store',
       headers:{Accept:'application/json'},signal:current.signal});
     if(!check.ok)throw Error('MFA_REQUIRED');
     const auth=await check.json();
     if(auth?.ok!==true||auth.mfaRequired!==false||
        !/^[a-f0-9]{64}$/i.test(auth.csrfToken||''))throw Error('MFA_REQUIRED');
     const r=await fetch(url,{method:'POST',credentials:'same-origin',
       cache:'no-store',headers:{'Content-Type':'application/json',
         Accept:'application/json','X-CSRF-Token':auth.csrfToken},
       body:JSON.stringify(payload),signal:current.signal});
     if(!r.ok)throw Error('OWNER_WRITE_UNCONFIRMED');
     const d=await r.json();
     if(token!==seq||!visible())return;
     if(d?.ok!==true)throw Error('OWNER_WRITE_UNCONFIRMED');
     succeeded=true;
     if(payload.action==='register_node'&&
        /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(d.nodeId||''))
       newNodeId=d.nodeId;
   }catch{
     if(token!==seq||!visible())return;
     blank();say(T('نتیجه عملیات قطعی نیست؛ قبل از تکرار، وضعیت واقعی سرور را مجدداً بخوانید.',
       'Outcome may have committed. Reread authoritative state before retrying.'));
   }finally{
     clearTimeout(timer);
     if(token===seq){controller=null;busy=false;refresh.disabled=false;}
   }
   if(succeeded&&token===seq&&visible())await load();
 }
 refresh.addEventListener('click',load);
 root.addEventListener('toggle',()=>{if(visible())load();else clean();});
 ws.addEventListener('jr:operations-ready',()=>{if(visible())load();});
 new MutationObserver(()=>{if(ws.hidden)clean();})
   .observe(ws,{attributes:true,attributeFilter:['hidden']});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)clean();});
 window.addEventListener('offline',clean);
 window.addEventListener('jr:account-logout',clean);
 window.addEventListener('pagehide',clean);
})();
