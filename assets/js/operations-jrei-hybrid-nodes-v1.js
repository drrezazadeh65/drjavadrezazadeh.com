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
   NEEDS_REVIEW:T('نتیجه نامعلوم؛ بررسی مدیر','Unknown outcome; owner review'),
   REVIEW_REQUIRED:T('نیازمند بررسی','Requires review'),
   CANCELLED:T('لغو شده','Cancelled'),EXPIRED:T('منقضی','Expired')
 })[s]||String(s||'UNKNOWN').slice(0,80);
 const confirmAction=(fa,e)=>window.confirm(T(fa,e));
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
   actions.append(form);
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
