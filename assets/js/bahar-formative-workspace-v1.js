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
  const status=root.querySelector('[data-bahar-status]');
  if(!form||!result||!addEvidence||!evidenceList||!erase||!copyButton||!count||!status)return;

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
  }
  function extractEvidence(){
    return [...evidenceList.querySelectorAll('[data-bahar-evidence-entry]')]
       .map(field=>({
         source:safeValue(field.querySelector('input')),
         observation:safeValue(field.querySelector('textarea'))
       }))
       .filter(item=>item.source||item.observation);
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
    panel.append(make('p',fa?
      'پیش‌اعتبارسنجی · بازبینی توصیفی و آموزشی، بدون نمره و بدون ذخیره‌سازی در سرور.':
      'PREVALIDATION · Educational description only; no score or server storage.','jr-bahar-summary-note'));
    lastSummary=(fa?'BAHAR | کاربرگ رشد و اقدام':'BAHAR | Learning and action worksheet')+'\n\n'+lines.join('\n\n')+
      '\n\n'+(fa?'وضعیت علمی: پیش‌اعتبارسنجی، غیرتشخیصی.':'Scientific status: PREVALIDATION, non-diagnostic.');
    result.replaceChildren(panel);
    result.hidden=false;
    copyButton.hidden=false;
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
  evidenceList.addEventListener('input',()=>{
    if(lastSummary)clearResult();
  });
  addEvidence.addEventListener('click',evidenceEntry);
  erase.addEventListener('click',()=>{
    form.reset();
    evidenceList.replaceChildren();
    evidenceSerial=0;
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
  updateCount();
  clearResult();
  setStatus(messages.ready);
})();
