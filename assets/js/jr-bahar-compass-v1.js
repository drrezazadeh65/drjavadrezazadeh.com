/* BAHAR eight-week learning compass — privacy-first, opt-in portable workbook.
 * No analytics, network, account storage, cookies or automatic persistence.
 * Evidence, constraints and plans remain memory-only until user explicitly exports JSON.
 * Research-stage human reflections; NOT a validated diagnostic instrument.
 */
(() => {
  'use strict';
  const root=document.getElementById('bahar-compass');
  if(!root) return;
  const en=document.documentElement.lang==='en';
  const messages=en?{
    required:'Complete your learning goal and the evidence you will review.',
    invalid:'Please use bounded entries, with a valid calendar date where required.',
    prepared:'Your eight-week compass is prepared locally. You can revise it at any time.',
    evidence:'The reflection was added only to this page.',
    limit:'A maximum of eight weekly reflections is supported here.',
    empty:'Create a plan or reflection before exporting.',
    exported:'The learning workbook file was prepared on this device. Keep it private.',
    imported:'The workbook was imported into this page only. No data was sent to the website.',
    badFile:'This is not a compatible BAHAR workbook, or it exceeds the size limit.',
    removed:'Your workbook has been cleared from this page.',
    week:'Reflection',date:'Date',decision:'Next step',note:'Observed evidence',
    draft:'Eight-week compass',goal:'Learning goal',success:'Observable evidence',
    context:'Context and constraints',weekly:'Weekly study plan',none:'Not yet prepared',
    disclosure:'Self-authored educational reflection. No diagnosis or prediction.',
    edited:'The compass was edited. Prepare the new version before printing it.',
    incompleteExport:'Complete or clear a partially edited form before exporting your workbook.'
  }:{
    required:'هدف یادگیری و شواهد قابل مشاهده را تکمیل کنید.',
    invalid:'ورودی‌ها باید در اندازه مجاز باشند و تاریخ معتبر وارد شود.',
    prepared:'قطب‌نمای هشت‌هفته‌ای در همین صفحه آماده شد و می‌توانید آن را بازنگری کنید.',
    evidence:'یادداشت بازنگری فقط به حافظه همین صفحه اضافه شد.',
    limit:'در این کاربرگ حداکثر هشت یادداشت هفتگی ثبت می‌شود.',
    empty:'پیش از خروجی گرفتن، برنامه یا یادداشت بازنگری ایجاد کنید.',
    exported:'پرونده کاربرگ روی دستگاه شما آماده شد. آن را محرمانه نگهداری کنید.',
    imported:'پرونده به همین صفحه وارد شد و هیچ داده‌ای به سایت ارسال نشد.',
    badFile:'پرونده با قالب BAHAR سازگار نیست یا از محدودیت حجم بیشتر است.',
    removed:'تمام داده‌های کاربرگ از این صفحه پاک شد.',
    week:'بازنگری',date:'تاریخ',decision:'گام بعدی',note:'شواهد مشاهده‌شده',
    draft:'قطب‌نمای هشت‌هفته‌ای',goal:'هدف یادگیری',success:'نشانه موفقیت قابل مشاهده',
    context:'شرایط و محدودیت‌ها',weekly:'برنامه هفتگی',none:'هنوز آماده نشده است',
    disclosure:'بازنگری آموزشی خودنوشته؛ بدون تشخیص یا پیش‌بینی.',
    edited:'قطب‌نما تغییر کرده است. پیش از چاپ، نسخه جدید را آماده کنید.',
    incompleteExport:'پیش از دریافت فایل، فرم نیمه‌تمام را تکمیل یا پاک کنید.'
  };
  const $=id=>document.getElementById(id);
  const form=$('bahar-compass-form'),reflectionForm=$('bahar-reflection-form');
  const status=$('bahar-compass-status'),preview=$('bahar-compass-preview');
  const evidenceList=$('bahar-reflection-list');
  const fileInput=$('bahar-workbook-file');
  const entries=[];
  let compass=null;
  let compassDirty=false;
  let importGeneration=0;
  const text=(node,value)=>{node.textContent=value;};
  const bounded=(s,max=500)=>typeof s==='string'&&s.trim().length>0&&s.trim().length<=max;
  const optional=(s,max=500)=>typeof s==='string'&&s.length<=max;
  const dateOK=s=>{
    if(typeof s!=='string'||! /^\d{4}-\d{2}-\d{2}$/.test(s))return false;
    const [year,month,day]=s.split('-').map(Number);
    const date=new Date(Date.UTC(year,month-1,day));
    return date.getUTCFullYear()===year&&date.getUTCMonth()+1===month&&date.getUTCDate()===day;
  };
  const choices=new Set(['CONTINUE','CHANGE','PAUSE','STOP','INVESTIGATE']);
  const fields={
    goal:'bahar-compass-goal',
    successEvidence:'bahar-compass-success',
    context:'bahar-compass-context'
  };
  const readCompass=()=>({
    goal:$(fields.goal).value.trim(),
    successEvidence:$(fields.successEvidence).value.trim(),
    context:$(fields.context).value.trim()
  });
  function notify(message,invalid=false){
    status.hidden=false;
    status.setAttribute('role',invalid?'alert':'status');
    text(status,message);
  }
  function entryValid(record){
    return record!==null && typeof record==='object'&&!Array.isArray(record)
      && dateOK(record.date)&&bounded(record.note,500)
      && choices.has(record.decision);
  }
  function compassValid(record){
    return record!==null&&typeof record==='object'&&!Array.isArray(record)
      && bounded(record.goal,500)&&bounded(record.successEvidence,500)
      && optional(record.context,500);
  }
  function weeklySnapshot(includeCompleteDraft=false){
    const form=$('bahar-plan'),summary=$('plan-summary');
    if(!form||!summary||(!includeCompleteDraft&&summary.hidden))return null;
    const date=$('week-start')?.value??'';
    const goal=$('learning-goal')?.value?.trim()??'';
    const action=$('learning-action')?.value?.trim()??'';
    const evidence=$('learning-evidence')?.value?.trim()??'';
    if(!dateOK(date)||!bounded(goal)||!bounded(action)||!bounded(evidence))return null;
    return {weekStart:date,goal,action,evidence};
  }
  function appendLine(container,label,value){
    const row=document.createElement('p');
    const strong=document.createElement('strong');
    strong.textContent=label+': ';
    row.append(strong,document.createTextNode(value||messages.none));
    container.append(row);
  }
  function render(){
    preview.replaceChildren();
    const preparedCompass=compass&&!compassDirty?compass:null;
    if(preparedCompass){
      const heading=document.createElement('h3');text(heading,messages.draft);preview.append(heading);
      appendLine(preview,messages.goal,preparedCompass.goal);
      appendLine(preview,messages.success,preparedCompass.successEvidence);
      if(preparedCompass.context)appendLine(preview,messages.context,preparedCompass.context);
    }
    if(entries.length){
      const heading=document.createElement('h3');
      text(heading,(en?'Weekly reflections':'بازنگری‌های هفتگی')+' ('+entries.length+'/8)');
      preview.append(heading);
      for(const [i,entry] of entries.entries()){
        appendLine(preview,messages.week+' '+(i+1)+' · '+messages.date+' '+entry.date,
          entry.note+' · '+messages.decision+': '+entry.decision);
      }
    }
    if(preparedCompass||entries.length){
      const note=document.createElement('p');note.className='hint';text(note,messages.disclosure);
      preview.append(note);preview.hidden=false;
    }else preview.hidden=true;
    evidenceList.replaceChildren();
    entries.forEach((entry,index)=>{
      const item=document.createElement('li');
      const strong=document.createElement('strong');
      text(strong,entry.date+' · '+entry.decision);
      item.append(strong,document.createTextNode(' — '+entry.note));
      const remove=document.createElement('button');
      remove.type='button';
      remove.className='secondary';
      remove.style.marginInlineStart='10px';
      remove.textContent=en?'Remove':'حذف';
      remove.setAttribute('aria-label',(en?'Remove reflection ':'حذف بازنگری ')+(index+1));
      remove.addEventListener('click',()=>{
        entries.splice(index,1);render();
        notify(en?'Reflection removed.':'یادداشت حذف شد.');
      });
      item.append(remove);evidenceList.append(item);
    });
  }
  const compassEdited=()=>{
    if(!compass)return;
    const draft=readCompass();
    const dirty=draft.goal!==compass.goal||
      draft.successEvidence!==compass.successEvidence||
      draft.context!==compass.context;
    if(dirty===compassDirty)return;
    compassDirty=dirty;render();
    if(dirty)notify(messages.edited);
  };
  form.addEventListener('input',compassEdited);
  form.addEventListener('change',compassEdited);
  form.addEventListener('submit',event=>{
    event.preventDefault();
    const value=readCompass();
    if(!value.goal||!value.successEvidence){notify(messages.required,true);return;}
    if(!compassValid(value)){notify(messages.invalid,true);return;}
    compass=value;compassDirty=false;render();notify(messages.prepared);
    preview.focus();
  });
  reflectionForm.addEventListener('submit',event=>{
    event.preventDefault();
    if(entries.length>=8){notify(messages.limit,true);return;}
    const value={
      date:$('bahar-reflection-date').value,
      note:$('bahar-reflection-note').value.trim(),
      decision:$('bahar-reflection-decision').value
    };
    if(!entryValid(value)){notify(messages.invalid,true);return;}
    entries.push(value);reflectionForm.reset();render();notify(messages.evidence);
  });
  // Only user-authored, validated fields enter the optional export or
  // in-tab continuation. No background collection or account upload.
  function workbookSnapshot(){
    // When the learner has completed a valid form, saving should not require
    // an extra 'prepare' click. A partial draft is still rejected clearly.
    // Any edited formerly prepared compass must be explicitly re-prepared,
    // even if the new values are blank: never silently omit prior work.
    if(compassDirty)return null;
    // The reflection form is a separate uncommitted scratchpad until the
    // learner clicks Add reflection. Do not export while it holds a draft
    // that would otherwise disappear without a warning.
    if($('bahar-reflection-date').value.trim()||
       $('bahar-reflection-note').value.trim())return null;
    const draft=readCompass();
    const hasPartialCompass=Object.values(draft).some(value=>value!=='');
    if(hasPartialCompass&&!compassValid(draft))return null;
    const selectedCompass=compassValid(draft)?draft:(compassDirty?null:compass);
    // A partially filled weekly plan must not be silently omitted from an
    // optional exported private workbook or same-tab continuation.
    const weeklyFields=['week-start','learning-goal','learning-action','learning-evidence']
      .map(id=>String($(id)?.value??'').trim());
    const weekly=weeklySnapshot(true);
    if(weeklyFields.some(Boolean)&&!weekly)return null;
    if(!selectedCompass&&entries.length===0&&!weekly)return null;
    return {
      schema:'jr.bahar.private-workbook.v1',
      version:'1.0.0',
      exportedAt:new Date().toISOString(),
      compass:selectedCompass?{...selectedCompass}:null,
      weeklyPlan:weekly,
      reflections:entries.map(item=>({...item})),
      status:'SELF_REPORTED_RESEARCH_STAGE'
    };
  }
  function missingWorkbookMessage(){
    const entered=Boolean(compassDirty)||
      Object.values(readCompass()).some(Boolean)||
      ['week-start','learning-goal','learning-action','learning-evidence',
       'bahar-reflection-date','bahar-reflection-note']
        .some(id=>String($(id)?.value??'').trim()!=='');
    return entered?messages.incompleteExport:messages.empty;
  }
  $('bahar-export-workbook').addEventListener('click',()=>{
    const workbook=workbookSnapshot();
    if(!workbook){notify(missingWorkbookMessage(),true);return;}
    const blob=new Blob([JSON.stringify(workbook,null,2)],{type:'application/json;charset=utf-8'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;a.download='bahar-private-workbook.json';a.hidden=true;
    document.body.append(a);a.click();a.remove();
    window.setTimeout(()=>URL.revokeObjectURL(url),10000);
    notify(messages.exported);
  });
  $('bahar-continue-in-account')?.addEventListener('click',()=>{
    const workbook=workbookSnapshot();
    if(!workbook){
      notify(missingWorkbookMessage(),true);
      $(fields.goal)?.focus();return;
    }
    // Consent to this *ephemeral same-tab transfer* follows from the
    // explicit button click. Consent to SEND or STORE on the server is
    // separately requested by one optional popup after login.
    const pending={
      schema:'jr.bahar.same-tab-continuation.v1',
      issuedAt:Date.now(),
      expiresAt:Date.now()+5*60*1000,
      workbook
    };
    const key='jr.bahar.pending-account-transfer.v1';
    try{
      sessionStorage.setItem(key,JSON.stringify(pending));
    }catch(_){
      notify(en?
        'Private tab storage is unavailable; please save your workbook file instead.':
        'انتقال موقت در این مرورگر در دسترس نیست؛ لطفاً فایل خصوصی کاربرگ را ذخیره کنید.',true);
      return;
    }
    // The route already exists; the fragment does not rename, redirect,
    // canonicalize or change any previously published page URL.
    location.assign(en?
      '/en/golden-talent/dashboard/bahar/#jr-bahar-account':
      '/fa/app/student/bahar/#jr-bahar-account');
  });
  // A selected JSON workbook is PREVIEWED, never silently allowed to
  // overwrite an in-progress local plan. The only apply action is a clearly
  // labeled user click; there is no consent popup or external file transfer.
  const importPanel=document.createElement('div');
  importPanel.className='bahar-workbook-import-preview';
  importPanel.hidden=true;
  const importSummary=document.createElement('p');
  importSummary.setAttribute('role','status');
  importSummary.setAttribute('aria-live','polite');
  const importApply=document.createElement('button');
  importApply.type='button';importApply.className='secondary';
  importApply.textContent=en?'Replace my current workbook with previewed file':
    'جایگزینی کاربرگ فعلی با پرونده بررسی‌شده';
  const importCancel=document.createElement('button');
  importCancel.type='button';importCancel.className='secondary';
  importCancel.textContent=en?'Keep my current workbook':'حفظ کاربرگ فعلی';
  importPanel.append(importSummary,importApply,importCancel);
  fileInput.closest('label')?.insertAdjacentElement('afterend',importPanel);
  let pendingImport=null;
  function discardPendingImport(){
    pendingImport=null;
    importPanel.hidden=true;
    importSummary.textContent='';
  }
  importCancel.addEventListener('click',()=>{
    importGeneration++;discardPendingImport();
    notify(en?'Current workbook kept; no import applied.':
      'کاربرگ فعلی بدون هیچ تغییری حفظ شد.');
    fileInput.focus();
  });
  fileInput.addEventListener('change',async()=>{
    const thisImport=++importGeneration;
    discardPendingImport();
    const file=fileInput.files?.[0];
    fileInput.value='';
    if(!file)return;
    if(file.size>30000||file.size===0){
      notify(messages.badFile,true);return;
    }
    try{
      const raw=JSON.parse(await file.text());
      if(thisImport!==importGeneration)return;
      if(!raw||typeof raw!=='object'||Array.isArray(raw)
        ||raw.schema!=='jr.bahar.private-workbook.v1'
        ||raw.version!=='1.0.0'
        ||(raw.compass!==null&&raw.compass!==undefined&&!compassValid(raw.compass))
        ||!Array.isArray(raw.reflections)||raw.reflections.length>8
        ||!raw.reflections.every(entryValid))
        throw new Error('invalid-workbook');
      const weekly=raw.weeklyPlan;
      if(weekly!==null&&weekly!==undefined&&
         (!weekly||typeof weekly!=='object'||Array.isArray(weekly)||
          !dateOK(weekly.weekStart)||!bounded(weekly.goal)||
          !bounded(weekly.action)||!bounded(weekly.evidence)))
        throw new Error('invalid-weekly');
      // Reject syntactically plausible EMPTY files; applying one would
      // otherwise erase an actual local workbook without importing content.
      if(!raw.compass&&!weekly&&raw.reflections.length===0)
        throw new Error('empty-workbook');
      // Keep only allowlisted validated fields in memory; imported JSON is
      // not merged with private, scientific, account or marketing records.
      pendingImport={
        compass:raw.compass?{
          goal:raw.compass.goal,successEvidence:raw.compass.successEvidence,
          context:raw.compass.context
        }:null,
        weekly:weekly?{
          weekStart:weekly.weekStart,goal:weekly.goal,
          action:weekly.action,evidence:weekly.evidence
        }:null,
        reflections:raw.reflections.map(entry=>({
          date:entry.date,note:entry.note,decision:entry.decision
        }))
      };
      importSummary.textContent=(en?
        'This private file is valid. It contains: ':
        'قالب پرونده بررسی شد. محتوای آن: ')+
        (pendingImport.compass?(en?'a compass; ':'یک قطب‌نما؛ '):'')+
        (pendingImport.weekly?(en?'a weekly plan; ':'یک برنامه هفتگی؛ '):'')+
        (en?'reflections: ':'بازنگری‌ها: ')+
        pendingImport.reflections.length+
        (en?'. Apply will replace all unsaved work on this page; nothing is uploaded.':
          '؛ دکمه جایگزینی تمام داده‌های ذخیره‌نشده فعلی این صفحه را جایگزین می‌کند؛ چیزی بارگذاری نمی‌شود.');
      importPanel.hidden=false;
      notify(en?'File reviewed. Choose whether to apply it.':
        'پرونده بررسی شد؛ جایگزینی یا حفظ کاربرگ فعلی با انتخاب شماست.');
      importApply.focus();
    }catch{
      if(thisImport===importGeneration){
        discardPendingImport();notify(messages.badFile,true);
      }
    }
  });
  importApply.addEventListener('click',()=>{
    if(!pendingImport)return;
    const incoming=pendingImport;
    importGeneration++;discardPendingImport();
    // The only destructive operation occurs AFTER the explicit Apply click.
    $('clear-plan')?.click();
    compass=incoming.compass;
    compassDirty=false;
    for(const id of Object.values(fields))$(id).value='';
    if(compass)for(const [key,id] of Object.entries(fields))
      $(id).value=compass[key]??'';
    entries.splice(0,entries.length,...incoming.reflections);
    if(incoming.weekly){
      $('week-start').value=incoming.weekly.weekStart;
      $('learning-goal').value=incoming.weekly.goal;
      $('learning-action').value=incoming.weekly.action;
      $('learning-evidence').value=incoming.weekly.evidence;
      $('bahar-plan').dispatchEvent(new Event('submit',{
        cancelable:true,bubbles:true
      }));
    }
    render();notify(messages.imported);preview.focus();
  });
  $('bahar-print-workbook')?.addEventListener('click',()=>{
    const hasWeekly=Boolean($('plan-summary')&&!$('plan-summary').hidden);
    if(compassDirty){notify(messages.edited,true);return;}
    // A completed but unprepared new section cannot be represented by an
    // older on-screen print preview, even when export would be otherwise
    // possible. Ask for the explicit local Prepare action first.
    const hasCompassDraft=Object.values(readCompass()).some(Boolean);
    const hasWeeklyDraft=['week-start','learning-goal','learning-action',
      'learning-evidence'].some(id=>String($(id)?.value??'').trim()!=='');
    if((hasCompassDraft&&!compass)||(hasWeeklyDraft&&!hasWeekly)||
       !workbookSnapshot()){
      notify(missingWorkbookMessage(),true);
      return;
    }
    // User-initiated print is a browser operation; the application never
    // uploads, stores or converts learning evidence on the server.
    window.print();
  });
  $('bahar-clear-workbook').addEventListener('click',()=>{
    discardPendingImport();
    importGeneration++;
    compass=null;compassDirty=false;entries.splice(0,entries.length);
    $('clear-plan')?.click();
    form.reset();reflectionForm.reset();
    render();notify(messages.removed);
    $(fields.goal).focus();
  });
  window.addEventListener('pagehide',()=>{
    importGeneration++;discardPendingImport();
  },{once:true});
  render();
})();