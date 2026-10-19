/* JR BAHAR formative worksheet v1 — in-memory only, not an assessment score. */
(()=>{
  'use strict';
  const root=document.querySelector('[data-bahar-formative]');
  if(!root)return;
  const form=root.querySelector('[data-bahar-plan-form]');
  const result=root.querySelector('[data-bahar-plan-result]');
  const addEvidence=root.querySelector('[data-bahar-add-evidence]');
  const evidenceList=root.querySelector('[data-bahar-evidence-list]');
  const erase=root.querySelector('[data-bahar-clear]');
  const copyButton=root.querySelector('[data-bahar-copy]');
  const count=root.querySelector('[data-bahar-evidence-count]');
  const weekList=root.querySelector('[data-bahar-week-list]');
  const weekCount=root.querySelector('[data-bahar-week-count]');
  const printButton=root.querySelector('[data-bahar-print]');
  const status=root.querySelector('[data-bahar-status]');
  if(!form||!result||!addEvidence||!evidenceList||!erase||!copyButton||!count||!status||!weekList||!weekCount||!printButton)return;

  const fa=document.documentElement.lang==='fa';
  const messages=fa?{
    ready:'کاربرگ آماده است؛ اطلاعات شما فقط در همین صفحه و تا زمانی که آن را ببندید در حافظه می‌ماند.',
    needGoal:'برای ساخت مرور، ابتدا یک هدف آموزشی مشخص بنویسید.',
    built:'مرور توصیفی آماده شد. این نتیجه تشخیص، نمره یا توصیه قطعی نیست.',
    cleared:'محتوای کاربرگ از این صفحه پاک شد.',
    copied:'متن مرور کپی شد. مراقب محل ذخیره یا ارسال آن باشید.',
    copyError:'کپی خودکار ممکن نشد؛ متن مرور را انتخاب و دستی کپی کنید.',
    maxEvidence:'حداکثر پنج شاهد برای این کاربرگ نمونه قابل ثبت است.',
    empty:'برای این بخش شواهدی ثبت نشده است.',
    titles:{goal:'هدف',why:'چرایی و زمینه',action:'اقدام هفته',success:'نشانه قابل مشاهده پیشرفت',barrier:'محدودیت‌ها و موانع',revision:'بازبینی و اصلاح',evidence:'شواهد ثبت‌شده'},
    source:'منبع شاهد',observation:'آنچه مشاهده شد',evidenceLabel:'شاهد',remove:'حذف'
  }:{
    ready:'Worksheet ready. Everything stays in page memory only until you leave or reset it.',
    needGoal:'Enter a specific learning goal before preparing the review.',
    built:'Descriptive review prepared. This is not a diagnosis, score or definitive recommendation.',
    cleared:'Worksheet content cleared from this page.',
    copied:'Review copied. Be mindful where you store or share it.',
    copyError:'Automatic copy was unavailable. Select the review text and copy it manually.',
    maxEvidence:'This introductory worksheet supports up to five evidence entries.',
    empty:'No evidence recorded for this section.',
    titles:{goal:'Learning goal',why:'Context and relevance',action:'This week’s action',success:'Observable evidence of progress',barrier:'Constraints and barriers',revision:'Review and revision',evidence:'Recorded evidence'},
    source:'Evidence source',observation:'What was observed',evidenceLabel:'Evidence',remove:'Remove'
  };
  const fieldNames=['goal','why','action','success','barrier','revision'];
  const maxItems=5;
  const maxValueLength=480;
  const weekLength=240;
  let lastSummary='';
  let evidenceSerial=0;
  function safeValue(input){
    return String(input?.value||'').trim().slice(0,maxValueLength);
  }
  function setStatus(message){
    status.textContent=message;
  }
  function make(tag,copy,cls){
    const el=document.createElement(tag);
    if(cls)el.className=cls;
    if(copy!==undefined)el.textContent=copy;
    return el;
  }
  function evidenceEntry(){
    if(evidenceList.querySelectorAll('[data-bahar-evidence-entry]').length>=maxItems){
      setStatus(messages.maxEvidence);
      return;
    }
    evidenceSerial++;
    const entry=make('fieldset',undefined,'jr-bahar-evidence-entry');
    entry.dataset.baharEvidenceEntry=String(evidenceSerial);
    const legend=make('legend',messages.evidenceLabel+' '+String(evidenceSerial).padStart(2,'0'));
    const grid=make('div',undefined,'jr-bahar-field-grid');
    for(const [name,labelText] of [['source',messages.source],['observation',messages.observation]]){
      const label=make('label',undefined,'jr-bahar-field');
      const title=make('span',labelText);
      const input=document.createElement(name==='source'?'input':'textarea');
      input.name='evidence-'+evidenceSerial+'-'+name;
      input.maxLength=maxValueLength;
      if(name==='source'){
        input.type='text';
        input.autocomplete='off';
      } else input.rows=2;
      label.append(title,input);
      grid.append(label);
    }
    const del=make('button',messages.remove,'jr-bahar-action jr-bahar-action--quiet');
    del.type='button';
    del.setAttribute('data-bahar-remove-evidence','');
    del.addEventListener('click',()=>{
      entry.remove();
      updateCount();
      clearResult();
    });
    entry.append(legend,grid,del);
    evidenceList.append(entry);
    updateCount();
    entry.querySelector('input')?.focus();
  }
  function updateCount(){
    const entries=evidenceList.querySelectorAll('[data-bahar-evidence-entry]').length;
    count.textContent=String(entries)+' / '+String(maxItems);
    addEvidence.disabled=entries>=maxItems;
  }
  function clearResult(){
    lastSummary='';
    result.replaceChildren();
    result.hidden=true;
    copyButton.hidden=true;
    printButton.hidden=true;
  }
  function extractEvidence(){
    return [...evidenceList.querySelectorAll('[data-bahar-evidence-entry]')]
       .map(field=>({
         source:safeValue(field.querySelector('input')),
         observation:safeValue(field.querySelector('textarea'))
       }))
       .filter(item=>item.source||item.observation);
  }

  /* Seven-day descriptive observation log. A count of filled notes is not
   * an outcome, score, growth trend or judgement of ability. */
  function weekRecords(){
    return [...weekList.querySelectorAll('[data-bahar-week-day]')].map((entry,index)=>({
      day:index+1,
      tried:safeValue(entry.querySelector('[data-bahar-week-tried]')).slice(0,weekLength),
      observed:safeValue(entry.querySelector('[data-bahar-week-observed]')).slice(0,weekLength),
      uncertain:safeValue(entry.querySelector('[data-bahar-week-uncertain]')).slice(0,weekLength)
    })).filter(item=>item.tried||item.observed||item.uncertain);
  }
  function weekUpdate(){
    const recorded=weekRecords().length;
    weekCount.textContent=fa?
      recorded.toLocaleString('fa-IR')+' / ۷ روز دارای یادداشت':
      recorded+' / 7 days with notes';
  }
  function renderWeekInputs(){
    for(let day=1;day<=7;day++){
      const entry=make('fieldset',undefined,'jr-bahar-week-day');
      entry.setAttribute('data-bahar-week-day',String(day));
      entry.append(make('legend',fa?'روز '+day.toLocaleString('fa-IR'):'Day '+day));
      const grid=make('div',undefined,'jr-bahar-week-fields');
      for(const [field,label] of [
        ['tried',fa?'آنچه امتحان کردم':'What I tried'],
        ['observed',fa?'آنچه واقعاً مشاهده شد':'What actually happened'],
        ['uncertain',fa?'تردید، مانع یا توضیح رقیب':'Uncertainty, barrier or rival explanation']
      ]){
        const wrapper=make('label',undefined,'jr-bahar-field');
        wrapper.append(make('span',label));
        const area=document.createElement('textarea');
        area.name='week-'+day+'-'+field;
        area.setAttribute('data-bahar-week-'+field,'');
        area.rows=2;area.maxLength=weekLength;area.autocomplete='off';
        wrapper.append(area);grid.append(wrapper);
      }
      entry.append(grid);weekList.append(entry);
    }
    weekUpdate();
  }
  function build(){
    const values={};
    for(const key of fieldNames)values[key]=safeValue(form.elements.namedItem(key));
    if(!values.goal){
      setStatus(messages.needGoal);
      form.elements.namedItem('goal')?.focus();
      clearResult();
      return;
    }
    const observations=extractEvidence();
    const weekly=weekRecords();
    // Completion and evidence quality are distinct. Do not turn field counts,
    // unobserved attempts or blank days into ability scores or progress claims.
    const reviewGaps=[];
    if(!values.action)reviewGaps.push(fa?'یک اقدام کوچک و قابل انجام برای این هفته تعیین کنید.':'Specify one small, feasible action for this week.');
    if(!values.success)reviewGaps.push(fa?'برای این اقدام، یک نشانه مشاهده‌پذیر و قابل بازبینی مشخص کنید.':'Identify an observable sign that could inform a later review.');
    if(!values.revision)reviewGaps.push(fa?'زمان یا ملاک بازبینی و امکان تغییر برنامه را روشن کنید.':'State when or how you will review and, if needed, revise the plan.');
    if(!observations.some(item=>item.source&&item.observation)){
      reviewGaps.push(fa?'برای دست‌کم یک مشاهده، هم منشأ شاهد و هم آنچه واقعاً رخ داده ثبت کنید.':'Record at least one observation with both its source and what happened.');
    }
    if(!weekly.length)reviewGaps.push(fa?'دفتر هفت‌روزه هنوز خالی است؛ این موضوع به معنای شکست نیست.':'The seven-day log has no entries yet; this is not a failure.');
    else if(weekly.some(day=>day.tried&&!day.observed)){
      reviewGaps.push(fa?'برای اقدام‌های ثبت‌شده بدون مشاهده، نتیجه را پس از اجرای واقعی ثبت کنید.':'For logged actions without observations, note what happened only after trying them.');
    }
    if(weekly.some(day=>day.observed&&!day.tried)){
      reviewGaps.push(fa?'برای مشاهده‌های روزانه، اقدام یا زمینه مربوط را روشن کنید.':'Add the action or context behind daily observations.');
    }
    const panel=make('div',undefined,'jr-bahar-summary');
    const title=make('h3',fa?'مرور توصیفیِ برنامه اقدام':'Descriptive action-plan review');
    panel.append(title);
    const lines=[];
    for(const key of fieldNames){
      if(!values[key])continue;
      const section=make('div',undefined,'jr-bahar-summary-row');
      section.append(make('strong',messages.titles[key]),make('p',values[key]));
      panel.append(section);
      lines.push(messages.titles[key]+': '+values[key]);
    }
    const evidenceHeading=make('h4',messages.titles.evidence);
    panel.append(evidenceHeading);
    if(observations.length){
      const list=make('ol');
      for(const item of observations){
        const line=[item.source,item.observation].filter(Boolean).join(' — ');
        list.append(make('li',line));
        lines.push(messages.evidenceLabel+': '+line);
      }
      panel.append(list);
    }else panel.append(make('p',messages.empty));

    const weeklySection=make('section',undefined,'jr-bahar-weekly-review');
    weeklySection.append(make('h4',fa?'دفتر اقدام هفت‌روزه (بدون نمره)':'Seven-day observation log (unscored)'));
    if(weekly.length){
      const dailyList=make('ol');
      for(const entry of weekly){
        const row=make('li');
        row.append(make('strong',fa?'روز '+entry.day.toLocaleString('fa-IR'):'Day '+entry.day));
        for(const [key,label] of [
          ['tried',fa?'اقدام':'Action'],['observed',fa?'مشاهده':'Observation'],
          ['uncertain',fa?'محدودیت':'Uncertainty']
        ]){
          if(!entry[key])continue;
          row.append(make('p',label+': '+entry[key]));
          lines.push((fa?'روز '+entry.day.toLocaleString('fa-IR'):'Day '+entry.day)+' · '+label+': '+entry[key]);
        }
        dailyList.append(row);
      }
      weeklySection.append(dailyList);
    }else weeklySection.append(make('p',fa?'هنوز هیچ روزی ثبت نشده است.':'No daily observations have been entered yet.'));
    weeklySection.append(make('p',fa?
      'روزهای خالی به معنی شکست یا نبود توانایی نیستند. یادداشت‌ها صرفاً خودگزارشی‌اند و روند رشد معتبر، تشخیص یا گزارش حرفه‌ای تولید نمی‌کنند.':
      'Missing days are not failure or lack of ability. Self-reported notes do not establish a validated growth trend, diagnosis or professional report.',
      'jr-bahar-summary-note'));
    panel.append(weeklySection);
    const review=make('section',undefined,'jr-bahar-summary-gaps');
    review.dataset.baharReviewGaps='';
    review.append(make('h4',fa?'شواهدی که هنوز باید بررسی شوند':'Evidence to revisit'));
    if(reviewGaps.length){
      const prompts=make('ul');
      for(const gap of reviewGaps)prompts.append(make('li',gap));
      review.append(prompts);
    }else{
      review.append(make('p',fa?
        'ورودی‌های پایه برای یک مرور توصیفی حاضرند؛ کیفیت، استقلال و اعتبار شواهد همچنان نیازمند بررسی انسانی است.':
        'Core descriptive inputs are present. Evidence quality, independence and validity still require human review.'));
    }
    panel.append(review);
    lines.push((fa?'شواهد نیازمند بازبینی: ':'Evidence to revisit: ')+
      (reviewGaps.length?reviewGaps.join(' | '):(fa?'اعتبار شواهد هنوز تأیید نشده است.':'Evidence validity is not established.')));
    lines.push(fa?'روزهای بدون یادداشت، شواهد ناموجودند؛ نه ضعف یا شکست.':
      'Unlogged days are missing evidence, not failure or a deficit.');
    panel.append(make('p',fa?
      'پیش‌اعتبارسنجی · بازبینی توصیفی و آموزشی، بدون نمره و بدون ذخیره‌سازی در سرور.':
      'PREVALIDATION · Educational description only; no score or server storage.','jr-bahar-summary-note'));
    lastSummary=(fa?'BAHAR | کاربرگ رشد و اقدام':'BAHAR | Learning and action worksheet')+'\n\n'+lines.join('\n\n')+
      '\n\n'+(fa?'وضعیت علمی: پیش‌اعتبارسنجی، غیرتشخیصی.':'Scientific status: PREVALIDATION, non-diagnostic.');
    result.replaceChildren(panel);
    result.hidden=false;
    copyButton.hidden=false;
    printButton.hidden=false;
    setStatus(messages.built);
    result.scrollIntoView({behavior:'auto',block:'nearest'});
  }
  form.addEventListener('submit',event=>{
    event.preventDefault();
    build();
  });
  form.addEventListener('input',()=>{
    if(lastSummary){
      clearResult();
      setStatus(messages.ready);
    }
  });
  weekList.addEventListener('input',()=>{
    weekUpdate();
    if(lastSummary){clearResult();setStatus(messages.ready);}
  });
  evidenceList.addEventListener('input',()=>{
    if(lastSummary)clearResult();
  });
  addEvidence.addEventListener('click',evidenceEntry);
  erase.addEventListener('click',()=>{
    form.reset();
    evidenceList.replaceChildren();
    evidenceSerial=0;
    weekUpdate(); // reset() does not emit input; avoid a stale diary counter.
    updateCount();
    clearResult();
    setStatus(messages.cleared);
  });
  copyButton.addEventListener('click',async()=>{
    if(!lastSummary)return;
    try{
      if(!navigator.clipboard?.writeText)throw Error('clipboard_unavailable');
      await navigator.clipboard.writeText(lastSummary);
      setStatus(messages.copied);
    }catch{
      setStatus(messages.copyError);
      result.focus();
    }
  });
  printButton.addEventListener('click',()=>{if(lastSummary&&!result.hidden)window.print();});
  renderWeekInputs();
  updateCount();
  clearResult();
  setStatus(messages.ready);
})();
