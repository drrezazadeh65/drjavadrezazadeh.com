/* JREI V5 owner-only learning evidence. Source-only until final accepted
 * Windows worker, host migration and independent scientific evaluation.
 * Existing SUPER_ADMIN + recent TOTP + exact-origin CSRF apply server-side.
 * All user-facing assertions distinguish a due tick from genuine learning.
 */
(() => {
  'use strict';
  const root=document.getElementById('ops-jrei-learning');
  const workspace=document.getElementById('ops-workspace');
  if(!root||!workspace)return;
  const en=document.documentElement.lang==='en';
  const T=(fa,english)=>en?english:fa;
  const facts=root.querySelector('[data-jrei-learning-facts]');
  const cycles=root.querySelector('[data-jrei-learning-cycles]');
  const state=root.querySelector('[data-jrei-learning-state]');
  const refresh=root.querySelector('[data-jrei-learning-refresh]');
  const controls=root.querySelector('[data-jrei-learning-controls]');
  if(!facts||!cycles||!state||!refresh||!controls)return;
  const endpoint='/api/admin/operations/jrei-learning';
  const fmt=new Intl.NumberFormat(en?'en-US':'fa-IR');
  let serial=0,controller=null,busy=false;
  const open=()=>root.open&&!workspace.hidden&&!document.hidden&&navigator.onLine;
  const text=(tag,cls,value)=>{
    const e=document.createElement(tag);
    if(cls)e.className=cls;
    if(value!==undefined)e.textContent=String(value);
    return e;
  };
  const say=t=>{state.textContent=t;};
  const time=secs=>{
    if(!Number.isSafeInteger(secs)||secs<=0)return T('نامعلوم','Unknown');
    const dt=new Date(secs*1000);
    return Number.isFinite(dt.getTime())?dt.toLocaleString(en?'en-US':'fa-IR'):
      T('نامعلوم','Unknown');
  };
  const wipe=()=>{
    facts.replaceChildren();cycles.replaceChildren();controls.replaceChildren();
  };
  function clear(){
    serial++;controller?.abort();controller=null;busy=false;
    refresh.disabled=false;wipe();
    say(T('داده خصوصی فقط با بازکردن این بخش و احراز دومرحله‌ای خوانده می‌شود.',
      'Private status is loaded only after opening this section with recent MFA.'));
  }
  function fact(label,value){
    const box=text('div','jr-jrei-learning-fact');
    box.append(text('strong','',label),text('span','',value));
    facts.append(box);
  }
  function render(data) {
    wipe();
    const c=data.controls||null;
    fact(T('فعال‌سازی خصوصی در سرور','Private server enable flag'),
      data.privateGlobalFlagEnabled
        ?T('مجاز در تنظیمات خصوصی؛ به‌تنهایی اجرا نمی‌شود','Permitted by private config; not sufficient to run')
        :T('خاموش؛ هیچ یادگیری زمان‌بندی‌شده‌ای مجاز نیست','OFF; no scheduled learning authorized'));
    fact(T('جدول‌های دیتابیس مادر','Mother database tables'),
      data.motherDbSchemaReady
        ?T('وجود دارد؛ اجرای واقعی تأیید نشده','Present; runtime not independently verified')
        :T('Migration نصب نشده یا قابل مشاهده نیست','Migration absent or unavailable'));
    fact(T('وضعیت مدل روی رایانه ویندوز','Windows model worker'),
      T('تأیید نشده','Not verified'));
    fact(T('تعداد پیشنهادهای منتظر بررسی','Proposals awaiting review'),
      data.motherDbSchemaReady?fmt.format(data.proposalCounts?.pending??0):
        T('نامعلوم','Unknown'));
    fact(T('تعداد پیشنهادهای تأییدشده در دیتابیس','DB-approved proposals'),
      data.motherDbSchemaReady?fmt.format(data.proposalCounts?.approved??0):
        T('نامعلوم','Unknown'));
    fact(T('وضعیت ارتقای خودکار مدل','Automatic model upgrades'),
      T('غیرفعال؛ انتشار و تغییر وزن مدل مجاز نشده',
        'OFF; no publication or model-weight modifications are authorized'));
    const evaluation=data.recordedEvaluationAccountability;
    if(evaluation?.schema==='jr.jrei.learning-comparison-accountability.v1'){
      const heading=text('p','jr-jrei-learning-note',T(
        'ممیزی صرفاً آماریِ داده‌های ثبت‌شدهٔ مقایسهٔ مدل پایه و مدل پیشنهادی؛ این اعداد اثبات نمی‌کنند که نمونه‌ها واقعی یا ارزیابی مستقل انجام شده است.',
        'Recorded baseline-vs-challenger aggregate audit only. Counts do not prove real, independently evaluated benchmarks or model improvement.'));
      facts.append(heading);
      const metrics=[
        [T('مجموع پیشنهادهای ثبت‌شده','Recorded proposed changes'),evaluation.recordedProposals],
        [T('نمونه کمتر از حداقل سیاست','Below minimum required sample count'),evaluation.sampleBelowPolicyMinimum],
        [T('گزارش‌های دارای رخداد حریم خصوصی','Proposals reporting privacy incidents'),evaluation.privacyIncidentsReported],
        [T('بدترشدن استناد یا شواهد','More unsupported evidence claims'),evaluation.unsupportedEvidenceRegressions],
        [T('افزایش شکاف انصاف','Worsened reported fairness gap'),evaluation.fairnessGapRegressions],
        [T('بدترشدن تأخیر پاسخ','Reported latency regression'),evaluation.latencyRegressions],
        [T('نبود بهبود شمار پاسخ درست','No recorded accuracy improvement'),evaluation.accuracyNotImproved],
        [T('تأییدشده با وجود خطر ثبت‌شده','Approved despite recorded risk'),evaluation.acceptedDespiteRecordedHazard]
      ];
      for(const [label,n] of metrics){
        fact(label,evaluation.available&&Number.isSafeInteger(n)?
          fmt.format(n):T('نامعلوم؛ ثبت معتبر در دسترس نیست','Unknown; original evidence unavailable'));
      }
    }
    if(Array.isArray(data.recentCycles)&&data.recentCycles.length){
      const list=text('ol','jr-jrei-learning-history');
      const labels={
        NO_APPROVED_EVALUATION:T('فاقد ارزیابی معتبرِ تأییدشده','No independently approved evaluation'),
        PROPOSAL_REVIEW_REQUIRED:T('پیشنهاد موجود؛ بازبینی علمی لازم است','Proposal exists; scientific review required'),
        NOT_EVALUATED:T('ارزیابی انجام نشده','Not evaluated')
      };
      for(const cycle of data.recentCycles.slice(0,14)){
        const li=text('li','');
        const name=labels[cycle.status]||T('وضعیت نامشخص','Unrecognised state');
        li.append(text('strong','',String(cycle.day||'—')+' — '+name));
        li.append(text('span','',
          T(' پیشنهادها: ',' Proposals: ')+fmt.format(cycle.candidateCount??0)+
          T(' · آخرین ثبت: ',' · Last recorded: ')+time(cycle.lastFinishedAt)));
        list.append(li);
      }
      cycles.append(list);
    }else{
      cycles.append(text('p','',data.motherDbSchemaReady
        ?T('هنوز چرخه روزانه ثبت نشده؛ صفر به‌معنای یادگیری کامل نیست.',
          'No daily cycle has been recorded. An empty history is not proof of improvement.')
        :T('تا نصب مجاز Migration، وضعیت چرخه‌های روزانه نامعلوم است.',
          'Cycle status remains unknown until the approved additive migration.')));
    }
    const hazard=data.humanHazardReviewQueue;
    if(hazard?.schema==='jr.jrei.learning-owner-hazard-queue.v1'){
      fact(T('پیشنهادهای نیازمند توقف انسانی بر اساس خطر ثبت‌شده',
        'Recorded learning hazards awaiting explicit human decision'),
        hazard.available&&Number.isSafeInteger(hazard.totalRecordedHazardProposals)?
          fmt.format(hazard.totalRecordedHazardProposals):T('نامعلوم','Unknown'));
      const panel=text('details','jr-jrei-learning-hazard-panel');
      panel.append(text('summary','',T(
        'تعلیق علمی پیشنهادهای پرخطر؛ بدون تغییر مدل یا کد',
        'Independent owner veto of risky learning proposals — no model/code changes')));
      panel.append(text('p','jr-jrei-learning-note',T(
        'در هر پرونده فقط داده‌های آماری ثبت‌شده دیده می‌شود؛ صحت تجربی داده‌ها باید جداگانه بررسی شود. رد یک پیشنهاد، نتیجهٔ اصلی آزمایش را حذف یا مدل منتشرشده را به‌روز نمی‌کند.',
        'These are recorded aggregate metrics, not independently authenticated benchmark results. Rejecting a proposal preserves all original metrics; it neither changes model weights nor releases research output.')));
      if(!hazard.available){
        panel.append(text('p','',T(
          'جدول شواهد تصمیم‌های انسانی هنوز نصب یا تأیید نشده است.',
          'Human intervention ledger unavailable; status UNKNOWN.')));
      }else{
        const queue=Array.isArray(hazard.items)?hazard.items.slice(0,20):[];
        if(!queue.length)panel.append(text('p','',T(
          'پروندهٔ پرخطر ثبت‌شده‌ای برای این بازه دیده نشد؛ این به معنای اعتبار تجربی مدل نیست.',
          'No recorded risky proposal in the bounded view; empirical validity is not proven.')));
        const uuid=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
        for(const entry of queue){
          if(!uuid.test(entry.id||'')||
             !['PENDING','REVIEWED','APPROVED'].includes(entry.reviewState))continue;
          const box=text('div','jr-jrei-learning-fact');
          box.append(text('strong','',
            String(entry.changeType||'').slice(0,48)+
            ' · '+String(entry.reviewState).slice(0,24)));
          const choices=[
            ['INSUFFICIENT_EVALUATION_SAMPLE',entry.insufficientSample,
              T('نمونهٔ ناکافی','Insufficient evaluated cases')],
            ['REPORTED_PRIVACY_INCIDENT',entry.reportedPrivacyIncident,
              T('رخداد حریم خصوصی','Recorded privacy incident')],
            ['UNSUPPORTED_SOURCE_REGRESSION',entry.unsupportedCitationsIncreased,
              T('استناد نامعتبر بیشتر','Increased unsupported citations')],
            ['FAIRNESS_GAP_REGRESSION',entry.fairnessGapIncreased,
              T('بدتر شدن شکاف انصاف','Reported fairness regression')],
            ['LATENCY_REGRESSION',entry.p95LatencyIncreased,
              T('افزایش تأخیر','Recorded latency regression')],
            ['NO_ACCURACY_IMPROVEMENT',entry.correctAnswersNotImproved,
              T('دقت پاسخ بهبود نیافته','No measured accuracy improvement')]
          ].filter(a=>a[1]===true);
          if(!choices.length)continue;
          const reason=text('select','');
          for(const [value,_,description] of choices){
            const opt=text('option','',description);opt.value=value;
            reason.append(opt);
          }
          const reasonLabel=text('label','',T(
            'دلیل مستند رد پیشنهاد','Documented reason for human rejection'));
          reasonLabel.append(reason);
          const stop=text('button','jr-jrei-learning-danger',T(
            'رد پیشنهاد خطرناک با تأیید دومرحله‌ای',
            'Reject risky proposal using owner MFA'));
          stop.type='button';
          stop.addEventListener('click',()=>{
            if(!open()||busy)return;
            if(!window.confirm(T(
              'پیشنهاد ثبت‌شده رد و تصمیم در دفتر شواهد دائمی ثبت شود؟ داده‌های اصلی حذف نمی‌شوند و هیچ مدل یا وجهی تغییر نمی‌کند.',
              'Reject this proposal and append a permanent human decision? Original evidence, model weights and money remain unchanged.')))return;
            change({action:'reject_hazard_proposal',proposalId:entry.id,
              expectedReviewState:entry.reviewState,reasonCode:reason.value,
              confirmation:'REJECT_RISKY_LEARNING_PROPOSAL_WITH_ORIGINAL_EVIDENCE'});
          });
          box.append(reasonLabel,stop);panel.append(box);
        }
        if(hazard.truncated)panel.append(text('p','jr-jrei-learning-note',T(
          'این فهرست حداکثر ۲۰ پرونده را نشان می‌دهد و کل خطرها جداگانه شمرده می‌شوند.',
          'Only 20 cases are shown; the total comes from the full mother-DB relation.')));
      }
      controls.append(panel);
    }
    if(!c){
      controls.append(text('p','',T('کنترل فعال‌سازی تا وجود جدول معتبر در دسترس نیست.',
        'Enablement is unavailable until the verified policy row exists.')));
      say(T('سورس آماده ثبت وضعیت است؛ سرویس فعال یا تأییدشده نیست.',
        'The source can expose metadata, but no active or verified runtime is established.'));
      return;
    }
    const label=text('label','jr-jrei-learning-toggle');
    const checkbox=document.createElement('input');
    checkbox.type='checkbox';checkbox.checked=c.enabled===true;
    checkbox.disabled=!data.privateGlobalFlagEnabled&&!c.enabled;
    label.append(checkbox,text('span','',T(
      'اجازه بررسی روزانه فراداده‌های غیرشخصی (نه آموزش مدل)',
      'Allow daily nonpersonal metadata review (NOT model training)')));
    const save=text('button','',T('ثبت سیاست با تأیید دومرحله‌ای','Save policy with fresh MFA'));
    save.type='button';save.disabled=checkbox.disabled;
    save.addEventListener('click',()=>{
      if(!open()||busy)return;
      const enabled=checkbox.checked;
      if(enabled){
        if(!data.privateGlobalFlagEnabled)return;
        if(!window.confirm(T(
          'این مجوز فقط بررسی فراداده‌های غیرشخصی را پس از راه‌اندازی واقعی Worker ممکن می‌کند؛ آموزش مدل، تغییر قواعد علمی یا انتشار خودکار مجاز نیست. ادامه می‌دهید؟',
          'After actual worker setup this authorizes nonpersonal metadata reviews only, not model training, scientific changes or automatic publication. Continue?')))return;
      }
      change({action:'set_enabled',enabled,revision:c.revision,
        confirmation:enabled?'APPROVE_METADATA_ONLY_DAILY_LEARNING':''});
    });
    controls.append(label,save,text('p','jr-jrei-learning-note',T(
      'شواهد علمی، داده رسمی پذیرش، امتیازدهی RCAS/BAHAR و تغییر کد همچنان نیازمند تأیید مستقل هستند.',
      'Scientific evidence, official admission data, RCAS/BAHAR scoring and code changes still require independent approval.')));
    say(T('داده نمایش‌داده‌شده فقط گزارش سیاست و چرخه‌های ثبت‌شده است؛ پیشرفت مدل تأیید نشده.',
      'These are recorded policy and cycle facts only; model improvement is not verified.'));
  }
  async function refreshState(){
    if(!open()||busy)return;
    const thisRequest=++serial;
    controller?.abort();controller=new AbortController();
    const active=controller;busy=true;refresh.disabled=true;wipe();
    const timeout=setTimeout(()=>active.abort(),15000);
    say(T('در حال دریافت وضعیت معتبر از دیتابیس مادر…',
      'Reading authoritative mother-database learning metadata…'));
    try {
      const res=await fetch(endpoint,{credentials:'same-origin',cache:'no-store',
        headers:{Accept:'application/json'},signal:active.signal});
      if(!res.ok)throw Error(res.status===403?'MFA':'SERVER');
      const result=await res.json();
      if(thisRequest!==serial||!open())return;
      if(result?.ok!==true||result.schema!=='jr.jrei.learning-owner.v1'||
         !Array.isArray(result.recentCycles))throw Error('CONTRACT');
      render(result);
    }catch(e){
      if(thisRequest!==serial||!open())return;
      wipe();say(T('دریافت وضعیت یادگیری تأیید نشد؛ اطلاعات قدیمی حذف شدند. پس از تأیید دومرحله‌ای دوباره بخوانید.',
        'Learning status is unavailable; stale controls were removed. Recheck MFA and retry.'));
    }finally{
      clearTimeout(timeout);
      if(thisRequest===serial){controller=null;busy=false;refresh.disabled=false;}
    }
  }
  async function change(payload){
    if(!open()||busy)return;
    const thisRequest=++serial;
    controller?.abort();controller=new AbortController();
    const active=controller;busy=true;refresh.disabled=true;wipe();
    const timeout=setTimeout(()=>active.abort(),18000);
    say(T('در حال ثبت سیاست مدیر با تأیید دومرحله‌ای…',
      'Saving owner policy with recent MFA…'));
    try {
      const sess=await fetch('/api/admin/operations/session',{
        credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'},
        signal:active.signal});
      if(!sess.ok)throw Error('MFA');
      const auth=await sess.json();
      if(auth?.ok!==true||auth.mfaRequired!==false||
        !/^[a-f0-9]{64}$/i.test(auth.csrfToken||''))throw Error('MFA');
      const res=await fetch(endpoint,{method:'POST',credentials:'same-origin',
        cache:'no-store',headers:{'Content-Type':'application/json',
          Accept:'application/json','X-CSRF-Token':auth.csrfToken},
        body:JSON.stringify(payload),signal:active.signal});
      if(!res.ok)throw Error('WRITE');
      const result=await res.json();
      if(thisRequest!==serial||!open())return;
      if(result?.ok!==true||result.schema!=='jr.jrei.learning-owner.v1')
        throw Error('CONTRACT');
      render(result);
    }catch(e){
      if(thisRequest!==serial||!open())return;
      wipe();say(T('نتیجه ذخیره قطعی نیست؛ ممکن است سرور تغییر را ثبت کرده باشد. پیش از اقدام دوباره، وضعیت را تازه بخوانید.',
        'Save outcome is uncertain and might have committed. Reread the server state before retrying.'));
    }finally{
      clearTimeout(timeout);
      if(thisRequest===serial){controller=null;busy=false;refresh.disabled=false;}
    }
  }
  refresh.addEventListener('click',refreshState);
  root.addEventListener('toggle',()=>{if(open())refreshState();else clear();});
  new MutationObserver(()=>{if(workspace.hidden)clear();})
    .observe(workspace,{attributes:true,attributeFilter:['hidden']});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)clear();});
  window.addEventListener('offline',clear);
  window.addEventListener('jr:account-logout',clear);
  window.addEventListener('pagehide',clear);
})();
