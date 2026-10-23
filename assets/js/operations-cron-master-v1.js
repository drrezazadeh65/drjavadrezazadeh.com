/* JR Master Cron owner console (source only). No execution in the browser.
 * Reuses the original admin login, 10-minute TOTP and exact-origin CSRF.
 * Aborts private reads on hide/offline/logout; never represents host Cron as
 * installed without operator evidence; only owner-authorised rows are editable.
 */
(() => {
  'use strict';
  const root=document.getElementById('ops-cron-master');
  const workspace=document.getElementById('ops-workspace');
  if(!root||!workspace)return;
  const en=document.documentElement.lang==='en';
  const T=(fa,english)=>en?english:fa;
  const status=root.querySelector('[data-cron-status]');
  const summary=root.querySelector('[data-cron-summary]');
  const jobs=root.querySelector('[data-cron-jobs]');
  const refresh=root.querySelector('[data-cron-refresh]');
  if(!status||!summary||!jobs||!refresh)return;
  const api='/api/admin/operations/cron-master';
  const fmt=new Intl.NumberFormat(en?'en-US':'fa-IR');
  let generation=0,controller=null,busy=false,observed=null;
  const open=()=>root.open&&!workspace.hidden&&!document.hidden&&navigator.onLine;
  const el=(tag,cls,content)=>{
    const node=document.createElement(tag);
    if(cls)node.className=cls;
    if(content!==undefined)node.textContent=String(content);
    return node;
  };
  const clock=(seconds)=>{
    if(!Number.isSafeInteger(seconds)||seconds<=0)return T('تأیید نشده','Unverified');
    const date=new Date(seconds*1000);
    return Number.isFinite(date.valueOf())
      ?date.toLocaleString(en?'en-US':'fa-IR')
      :T('نامشخص','Unknown');
  };
  const message=text=>{status.textContent=text;};
  function clearPrivate(){
    generation++;controller?.abort();controller=null;busy=false;observed=null;
    jobs.replaceChildren();summary.replaceChildren();
    refresh.disabled=false;
    message(T('برای خواندن وضعیت واقعی، این بخش را باز و تازه‌سازی کنید.',
      'Open and refresh this area to retrieve current private source evidence.'));
  }
  function render(snapshot){
    observed=snapshot;jobs.replaceChildren();summary.replaceChildren();
    const facts=[
      [T('وضعیت دیتابیس مادر','Mother-DB scheduling policy'),
       snapshot.schemaReady?T('جدول وجود دارد؛ آزمون نشده','Table present; not tested'):
         T('Migration تکمیلی لازم است','Additive migration required')],
      [T('کلید خصوصی زمان‌بند','Private scheduler master flag'),
       snapshot.masterEnabled?T('در پیکربندی مجاز شده','Permitted in private config'):
         T('خاموش؛ هیچ موتور خودکار اجرا نمی‌شود','OFF; workers cannot be scheduled')],
      [T('نسخه PHP CLI و مجوز فرایند فرزند','Host CLI and subprocess entitlement'),
       T('تأیید نشده؛ وضعیت PHP وب دلیل بر مجوز CLI نیست',
         'UNVERIFIED: web PHP settings do not establish CLI subprocess permissions')],
      [T('نصب Cron در برتینا','Bertina host schedule'),
       T('تأیید نشده؛ نصب نشده فرض شود','NOT VERIFIED; never assume installed')]
    ];
    for(const [label,value] of facts){
      const item=el('div','jr-cron-fact');
      item.append(el('strong','',label),el('span','',value));
      summary.append(item);
    }
    if(!Array.isArray(snapshot.jobs))return;
    for(const job of snapshot.jobs){
      if(!job||!/^[-_a-z0-9]{1,64}$/.test(job.jobId||''))continue;
      const card=el('article','jr-cron-job');
      const header=el('div','jr-cron-head');
      const title=el('h3','',en?job.nameEn:job.nameFa);
      const subtitle=el('span','jr-cron-id',job.jobId);
      header.append(title,subtitle);card.append(header);
      const state=el('p','jr-cron-state',T('وضعیت آخر: ','Last recorded state: ')+
          String(job.lastState||'unknown')+' · '+
          T('آخرین پایان: ','Last finish: ')+clock(job.lastFinishedAt));
      card.append(state);
      if(job.needsOwnerReview){
        card.append(el('p','jr-cron-warning',
          T('اجرای قبلی ناموفق یا نامطمئن است. صرف ذخیره تنظیمات مجوز تکرار نمی‌دهد؛ باید ابتدا نتیجه خارجی کار مستقل بررسی و ثبت شود.',
            'A previous run was failed or uncertain. Saving schedule settings does not permit retry; reconcile the actual external outcome first.')));
        if(job.enabled!==true&&
           ['failed','unknown','blocked'].includes(job.lastState)){
          const review=el('div','jr-cron-review');
          const reviewLabel=el('label','',
            T('نتیجه بررسی مستقل پیش از هر تکرار','Outcome independently verified before retry'));
          const outcome=document.createElement('select');
          const opts=[
            ['',T('انتخاب نتیجه بررسی','Choose review finding')],
            ['confirmed_no_external_effect',T('تأیید شده: هیچ اثر خارجی رخ نداده','Confirmed: no external side effect occurred')],
            ['manually_reconciled',T('اثر خارجی دستی تطبیق و رفع مغایرت شد','External effects manually reconciled')]];
          for(const [value,title] of opts){
            const option=el('option','',title);option.value=value;
            outcome.append(option);
          }
          const acknowledge=el('button','',
            T('ثبت بررسی؛ موتور خاموش می‌ماند','Record review; leave worker OFF'));
          acknowledge.type='button';
          acknowledge.disabled=true;
          outcome.addEventListener('change',()=>{
            acknowledge.disabled=!(outcome.value&&Number.isSafeInteger(job.rowRevision));
          });
          acknowledge.addEventListener('click',()=>{
            if(!open()||busy||!outcome.value)return;
            const accepted=window.confirm(T(
              'من نتیجه واقعی اجرای قبلی و پیامدهای احتمالی (از جمله ایمیل ارسال‌شده) را مستقل بررسی کرده‌ام. ثبت این تصمیم موتور را روشن نمی‌کند. تأیید می‌کنید؟',
              'I independently checked the prior job outcome and potential external side effects, including possible email acceptance. This does not enable the worker. Confirm?'));
            if(!accepted)return;
            write({action:'reconcile',jobId:job.jobId,
              rowRevision:job.rowRevision,reviewOutcome:outcome.value,
              confirmation:'ACKNOWLEDGE_PRIOR_JOB_OUTCOME'});
          });
          reviewLabel.append(outcome);
          review.append(reviewLabel,acknowledge);card.append(review);
        }
      }
      if(!job.sourceAvailable){
        card.append(el('p','jr-cron-warning',
          T('فایل معتبر موتور در سورس موجود نیست؛ اجرا ممنوع است.',
            'Allowlisted worker file unavailable; execution prohibited.')));
      }
      if(!job.registered){
        const register=el('button','',T('ثبت موتور (پیش‌فرض خاموش)','Register worker (disabled)'));
        register.type='button';
        register.disabled=!snapshot.schemaReady||!job.sourceAvailable;
        register.addEventListener('click',()=>write({
          action:'register',jobId:job.jobId
        }));
        card.append(register);jobs.append(card);continue;
      }
      const controls=el('div','jr-cron-controls');
      const switchLabel=el('label','jr-cron-switch');
      const toggle=document.createElement('input');
      toggle.type='checkbox';toggle.checked=job.enabled===true;
      toggle.setAttribute('aria-label',T('فعال بودن ','Enable ')+(en?job.nameEn:job.nameFa));
      const switchText=el('span','',T('فعال‌سازی این موتور','Enable this worker'));
      switchLabel.append(toggle,switchText);
      const cadenceLabel=el('label','jr-cron-interval-label',
        T('تناوب داخلی','Internal cadence'));
      const cadence=document.createElement('select');
      const values=new Set([60,300,600,900,1800,3600,21600,43200,86400,
        job.defaultCadenceSeconds,job.cadenceSeconds]);
      const options=[...values].filter(n=>Number.isSafeInteger(n)&&
        n>=job.minimumCadenceSeconds&&n<=86400&&n%60===0)
        .sort((a,b)=>a-b);
      for(const seconds of options){
        const choice=document.createElement('option');
        choice.value=String(seconds);
        choice.textContent=seconds>=3600
          ?fmt.format(seconds/3600)+' '+T('ساعت','hours')
          :fmt.format(seconds/60)+' '+T('دقیقه','minutes');
        if(seconds===job.cadenceSeconds)choice.selected=true;
        cadence.append(choice);
      }
      cadenceLabel.append(cadence);
      const save=el('button','',T('ثبت تنظیمات','Save policy'));
      save.type='button';
      const permitted=Boolean(snapshot.schemaReady&&job.sourceAvailable);
      // Do not invite an owner to re-enable an unresolved failed or
      // unknown attempt. They may still disable an already-running worker.
      toggle.disabled=!permitted||(!snapshot.masterEnabled&&!job.enabled)||
        (job.needsOwnerReview&&!job.enabled);
      cadence.disabled=!permitted;
      save.disabled=!permitted;
      save.addEventListener('click',()=>{
        if(!open()||busy)return;
        const enabled=toggle.checked;
        if(enabled){
          if(!snapshot.masterEnabled||job.needsOwnerReview||
             job.lastState==='running')return;
          const accept=window.confirm(T(
            'این موتور پس از نصب واقعی Cron و فراهم بودن وابستگی‌های اختصاصی ممکن است وظایف زمان‌بندی‌شده اجرا کند. تأیید می‌کنید؟',
            'After actual host Cron activation and worker prerequisites, this schedule may run jobs. Confirm?'));
          if(!accept)return;
        }
        write({action:'configure',jobId:job.jobId,enabled,
          cadenceSeconds:Number(cadence.value),rowRevision:job.rowRevision,
          confirmation:enabled?'ENABLE_APPROVED_CLI_WORKER':''});
      });
      controls.append(switchLabel,cadenceLabel,save);card.append(controls);
      jobs.append(card);
    }
    message(T(
      'نمایش سیاست سورس و دیتابیس؛ اجرای Cron هاست، ارسال ایمیل و موفقیت موتور هنوز تأیید نشده‌اند.',
      'Displaying source and mother-DB policy only; host execution, email delivery and worker success remain unverified.'));
  }
  async function pull(){
    if(!open()||busy)return;
    const epoch=++generation;
    controller?.abort();controller=new AbortController();busy=true;
    const activeController=controller;
    const timeout=setTimeout(()=>activeController.abort(),15000);
    refresh.disabled=true;observed=null;jobs.replaceChildren();summary.replaceChildren();
    message(T('در حال دریافت وضعیت از API حفاظت‌شده مدیر…',
      'Reading current owner-MFA scheduling policy…'));
    try{
      const r=await fetch(api,{credentials:'same-origin',cache:'no-store',
        headers:{Accept:'application/json'},signal:activeController.signal});
      if(!r.ok)throw Error(r.status===403?'MFA':'READ');
      const data=await r.json();
      if(epoch!==generation||!open())return;
      if(data?.ok!==true||data.schema!=='jr.operations-cron-owner.v1'||
        !Array.isArray(data.jobs))throw Error('CONTRACT');
      render(data);
    }catch(error){
      if(epoch!==generation||!open())return;
      observed=null;jobs.replaceChildren();summary.replaceChildren();
      message(error?.name==='AbortError'
        ?T('مهلت خواندن به پایان رسید؛ اطلاعات قبلی پاک شدند. دوباره تلاش کنید.',
          'The read timed out; stale controls were cleared. Retry.')
        :error?.message==='MFA'
          ?T('اعتبار دومرحله‌ای مدیر لازم است. اطلاعات قبلی پاک شدند.',
            'Recent owner MFA is required. Earlier controls were cleared.')
          :T('وضعیت زمان‌بند از سرور تأیید نشد؛ هیچ موتوری فعال فرض نمی‌شود.',
            'Scheduler policy could not be verified. No worker is assumed active.'));
    }finally{
      clearTimeout(timeout);
      if(epoch===generation){controller=null;busy=false;refresh.disabled=false;}
    }
  }
  async function write(body){
    if(!open()||busy||!observed)return;
    const epoch=++generation;
    controller?.abort();controller=new AbortController();busy=true;
    const activeController=controller;
    const timeout=setTimeout(()=>activeController.abort(),20000);
    refresh.disabled=true;jobs.replaceChildren();summary.replaceChildren();observed=null;
    message(T('در حال بررسی مجوز دومرحله‌ای و ثبت سیاست…',
      'Verifying recent MFA and saving the policy…'));
    try{
      const session=await fetch('/api/admin/operations/session',{
        credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'},
        signal:activeController.signal
      });
      if(!session.ok)throw Error('MFA');
      const proof=await session.json();
      if(epoch!==generation||!open())return;
      if(proof?.ok!==true||proof.mfaRequired!==false||
         !/^[a-f0-9]{64}$/i.test(proof.csrfToken||''))throw Error('MFA');
      const r=await fetch(api,{method:'POST',credentials:'same-origin',cache:'no-store',
        headers:{Accept:'application/json','Content-Type':'application/json',
          'X-CSRF-Token':proof.csrfToken},
        body:JSON.stringify(body),signal:activeController.signal
      });
      if(!r.ok)throw Error(r.status===409?'CONFLICT':r.status===403?'MFA':'WRITE');
      const result=await r.json();
      if(epoch!==generation||!open())return;
      if(result?.ok!==true||result.schema!=='jr.operations-cron-owner.v1'||
         !Array.isArray(result.jobs))throw Error('CONTRACT');
      render(result);
    }catch(error){
      if(epoch!==generation||!open())return;
      observed=null;jobs.replaceChildren();summary.replaceChildren();
      message(error?.name==='AbortError'
        ?T('مهلت ثبت تمام شد؛ نتیجه ممکن است نامشخص باشد. وضعیت سرور را تازه‌سازی کنید.',
          'The write timed out and may have committed. Refresh authoritative state.')
        :error?.message==='CONFLICT'
          ?T('نسخه سیاست تغییر کرده یا تأیید صریح لازم است؛ وضعیت تازه را بخوانید.',
            'The policy revision changed or explicit approval is required. Refresh.')
          :T('ثبت از سوی سرور تأیید نشد؛ هیچ وضعیت قدیمی نمایش داده نمی‌شود.',
            'The write was not confirmed; stale controls have been cleared.'));
    }finally{
      clearTimeout(timeout);
      if(epoch===generation){controller=null;busy=false;refresh.disabled=false;}
    }
  }
  refresh.addEventListener('click',pull);
  root.addEventListener('toggle',()=>{if(open())pull();else clearPrivate();});
  new MutationObserver(()=>{if(workspace.hidden)clearPrivate();})
    .observe(workspace,{attributes:true,attributeFilter:['hidden']});
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden)clearPrivate();
  });
  window.addEventListener('offline',clearPrivate);
  window.addEventListener('pagehide',clearPrivate);
  window.addEventListener('jr:account-logout',clearPrivate);
})();
