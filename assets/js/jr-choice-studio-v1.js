/* JR Choice Studio v1.0 | Educational reflection, not an aptitude test.
 * Privacy: transient in-memory inputs, no fetch, localStorage, cookies or
 * analytics events. Never derive admission odds, diagnostic labels or norms.
 * Accessibility: labelled native controls, live feedback, reduced motion.
 */
(() => {
  'use strict';
  const factors=[
    {id:'interest',fa:'علاقه و تجربه واقعی',en:'Interest and experience'},
    {id:'requirements',fa:'پیش‌نیازها و شرایط ورود',en:'Requirements and eligibility'},
    {id:'finances',fa:'هزینه و امکانات مالی',en:'Financial feasibility'},
    {id:'location',fa:'موقعیت و شرایط زندگی',en:'Location and life circumstances'},
    {id:'flexibility',fa:'انعطاف و امکان بازنگری',en:'Flexibility and alternatives'}
  ];
  const labels={
    fa:{
      heading:'استودیوی تعاملی انتخاب مسیر',subtitle:'پنج معیار؛ دو مسیر؛ یک گفت‌وگوی دقیق‌تر با شواهد',
      one:'مسیر نخست',two:'مسیر دوم',name:'نام رشته یا مسیر',weights:'اهمیت معیارها',
      help:'اهمیت هر معیار را تغییر دهید؛ صفر یعنی فعلاً در مقایسه دخالت نکند و پنج یعنی بسیار مهم.',
      impressions:'برآورد اولیه شما',choose:'هنوز بررسی نشده',importance:'اهمیت',
      rating:'میزان تناسب از دید شما',
      ratings:['بسیار نامتناسب','نسبتاً نامتناسب','نامشخص یا متوسط','نسبتاً متناسب','بسیار متناسب'],
      result:'خوانش توصیفی مقایسه',awaiting:'برای مقایسه، دو نام متفاوت و ارزیابی معیارهای فعال برای هر دو مسیر را وارد کنید.',
      duplicate:'برای دو گزینه نام‌های متفاوت وارد کنید.',zero:'حداقل یک معیار باید اهمیت بیشتر از صفر داشته باشد.',
      incomplete:'معیارهای فعال هنوز برای هر دو مسیر بررسی نشده‌اند.',
      compare:'مقایسه کنونی',equal:'برآوردهای واردشده دو شاخص یکسان ایجاد کرده‌اند.',
      preferred:'شاخص توصیفیِ بالاتر با ورودی‌های فعلی: ',index:'شاخص ترجیح شخصی',outOf:' از ۵',
      greatest:'بیشترین اختلاف در برآوردهای شما مربوط به «',greatestEnd:'» است.',
      formula:'روش محاسبه: مجموع (اهمیت × برآورد هر معیار) تقسیم بر مجموع اهمیت معیارهای فعال. معیارهایی که اهمیت صفر دارند در محاسبه وارد نمی‌شوند.',
      actions:'گام بعدی',next:'پیش از تصمیم، ضوابط رسمی ورود، محتوای دوره و هزینه واقعی هر گزینه را بررسی کنید؛ شواهد مخالف، دیدگاه خانواده و یک تجربه کوتاهِ قابل بازنگری را نیز ثبت کنید.',
      limitation:'این عدد بازتاب ترجیحات و برآوردهای خود شماست؛ آزمون روان‌سنجی، تشخیص استعداد، پیش‌بینی قبولی یا تضمین آینده نیست.',
      privacy:'این اطلاعات تنها در حافظه همین صفحه پردازش می‌شوند؛ به سرور ارسال یا در مرورگر ذخیره نمی‌شوند.',
      reset:'پاک کردن داده‌های این جلسه',cleared:'همه پاسخ‌ها پاک شدند؛ داده‌ای ذخیره نشد.',
      scale:'مقیاس ارزیابی: ۱ = بسیار نامتناسب، ۵ = بسیار متناسب',
      compared:'معیار فعال تکمیل‌شده',of:'از',empty:'—'
    },
    en:{
      heading:'Interactive Study-Path Studio',subtitle:'Five criteria, two pathways, a more evidence-aware conversation',
      one:'First pathway',two:'Second pathway',name:'Study major or pathway',weights:'Criterion priorities',
      help:'Adjust the importance of each criterion. Zero excludes it from this comparison; five indicates high importance.',
      impressions:'Your provisional judgement',choose:'Not yet examined',importance:'Importance',
      rating:'Your impression of fit',
      ratings:['Very poor fit','Rather poor fit','Uncertain or mixed','Rather good fit','Very good fit'],
      result:'A descriptive reading of your comparison',awaiting:'Enter two distinct pathway names and assess every active criterion for both pathways.',
      duplicate:'Give the two pathways different names.',zero:'At least one criterion must have importance above zero.',
      incomplete:'Some active criteria are not yet assessed for both pathways.',
      compare:'Current comparison',equal:'Your entries produce equal descriptive indices.',
      preferred:'Higher descriptive index given your current entries: ',index:'Personal preference index',outOf:' out of 5',
      greatest:'The largest difference in your entries concerns “',greatestEnd:'”.',
      formula:'Method: sum of (importance × impression) divided by the total importance of active criteria. A criterion with zero importance is excluded.',
      actions:'Constructive next step',next:'Before deciding, verify official entry requirements, course content and actual costs. Record counter-evidence, family perspectives and one small, revisable experience that could inform the choice.',
      limitation:'This number describes your own preferences and judgements. It is not a validated psychometric assessment, diagnosis, admission prediction or guarantee of future success.',
      privacy:'Inputs are processed in this page’s memory only; nothing is sent to the server or saved in browser storage.',
      reset:'Clear this session',cleared:'All answers cleared; no data were stored.',
      scale:'Impression scale: 1 = very poor fit, 5 = very good fit',
      compared:'Active criteria completed',of:'of',empty:'—'
    }
  };

  function node(tag,text,className){
    const n=document.createElement(tag);
    if(text!==undefined&&text!==null)n.textContent=text;
    if(className)n.className=className;
    return n;
  }
  function option(value,text){const n=node('option',text);n.value=String(value);return n;}
  function initialize(root,index){
    const isFa=root.dataset.locale==='fa',T=labels[isFa?'fa':'en'];
    root.classList.add('jr-choice-studio');
    const ident='jr-choice-'+index+'-';
    const header=node('div',null,'jr-cs-intro');
    header.append(node('span',isFa?'INTERACTIVE · REFLECTION':'INTERACTIVE · REFLECTION','jr-cs-eyebrow'),
      node('h3',T.heading),node('p',T.subtitle));
    const form=node('form',null,'jr-cs-form');form.noValidate=true;
    const groupWeights=node('fieldset',null,'jr-cs-weights');
    groupWeights.append(node('legend',T.weights),node('p',T.help,'jr-cs-help'));
    const weightGrid=node('div',null,'jr-cs-weight-grid');const weights=[];
    for(const f of factors){
      const item=node('div',null,'jr-cs-weight');
      const label=node('label',f[isFa?'fa':'en']);label.htmlFor=ident+'w-'+f.id;
      const line=node('div',null,'jr-cs-weight-line');
      const range=node('input');range.type='range';range.id=label.htmlFor;range.min='0';range.max='5';range.step='1';range.value='3';
      range.setAttribute('aria-label',f[isFa?'fa':'en']+' — '+T.importance);
      const number=node('output','3','jr-cs-number');number.htmlFor=range.id;
      line.append(range,number);item.append(label,line);weightGrid.append(item);
      weights.push({factor:f,input:range,output:number});
    }
    groupWeights.append(weightGrid);form.append(groupWeights);
    const groupOptions=node('fieldset',null,'jr-cs-pathways');groupOptions.append(node('legend',T.impressions),node('p',T.scale,'jr-cs-help'));
    const cards=node('div',null,'jr-cs-path-grid');const entries=[];
    for(let i=0;i<2;i++){
      const card=node('div',null,'jr-cs-path');
      const heading=node('h4',i===0?T.one:T.two);
      const id=ident+'name-'+i;
      const label=node('label',T.name);label.htmlFor=id;
      const name=node('input');name.type='text';name.id=id;name.maxLength=90;name.autocomplete='off';name.placeholder=T.name;name.setAttribute('aria-label',(i===0?T.one:T.two)+' — '+T.name);
      card.append(heading,label,name);
      const selects=[];
      for(const f of factors){
        const row=node('div',null,'jr-cs-rating-row');
        const text=node('label',f[isFa?'fa':'en']);text.htmlFor=ident+'r-'+i+'-'+f.id;
        const select=node('select');select.id=text.htmlFor;
        select.append(option('',T.choose));
        T.ratings.forEach((v,j)=>select.append(option(j+1,(j+1)+' · '+v)));
        row.append(text,select);card.append(row);selects.push(select);
      }
      cards.append(card);entries.push({name,selects});
    }
    groupOptions.append(cards);form.append(groupOptions);
    const result=node('section',null,'jr-cs-result');result.setAttribute('aria-label',T.result);
    result.append(node('h4',T.result));
    const announce=node('p',T.awaiting,'jr-cs-live');announce.setAttribute('role','status');announce.setAttribute('aria-live','polite');
    const metrics=node('div',null,'jr-cs-metrics');metrics.hidden=true;
    const explanatory=node('p',T.formula,'jr-cs-formula');
    const contrast=node('p',null,'jr-cs-contrast');contrast.hidden=true;
    const advice=node('div',null,'jr-cs-next');
    advice.append(node('strong',T.actions),node('p',T.next));
    const limitation=node('p',T.limitation,'jr-cs-limitation');
    const reset=node('button',T.reset,'jr-cs-reset');reset.type='reset';
    const privacy=node('p',T.privacy,'jr-cs-privacy');
    result.append(announce,metrics,contrast,explanatory,advice,limitation);
    form.append(result,reset,privacy);
    root.replaceChildren(header,form);

    function redraw(message){
      weights.forEach(w=>{
        w.output.value=w.input.value;
        w.output.textContent=w.input.value;
      });
      const active=weights.filter(w=>Number(w.input.value)>0);
      const names=entries.map(e=>e.name.value.trim());
      let error='';
      if(active.length===0)error=T.zero;
      else if(names.some(n=>!n))error=T.awaiting;
      else if(names[0].toLocaleLowerCase()===names[1].toLocaleLowerCase())error=T.duplicate;
      else if(active.some(w=>entries.some(e=>e.selects[factors.indexOf(w.factor)].value==='')))error=T.incomplete;
      if(error){
        metrics.hidden=true;metrics.replaceChildren();contrast.hidden=true;contrast.textContent='';
        announce.textContent=message||error;return;
      }
      const sum=active.reduce((acc,w)=>acc+Number(w.input.value),0);
      const scores=entries.map(e=>active.reduce((acc,w)=>acc+
        Number(w.input.value)*Number(e.selects[factors.indexOf(w.factor)].value),0)/sum);
      metrics.replaceChildren();
      scores.forEach((v,i)=>{
        const panel=node('div',null,'jr-cs-metric');
        panel.append(node('strong',names[i]),node('span',T.index,'jr-cs-metric-label'),
          node('b',v.toLocaleString(isFa?'fa-IR':'en-US',{maximumFractionDigits:2})+T.outOf));
        metrics.append(panel);
      });
      metrics.hidden=false;
      if(Math.abs(scores[0]-scores[1])<1e-10)announce.textContent=T.equal;
      else announce.textContent=T.preferred+names[scores[0]>scores[1]?0:1];
      const delta=active.map(w=>({w,d:Math.abs(
        Number(entries[0].selects[factors.indexOf(w.factor)].value)-
        Number(entries[1].selects[factors.indexOf(w.factor)].value))*Number(w.input.value)}));
      const top=delta.sort((a,b)=>b.d-a.d)[0];
      contrast.hidden=!top||top.d===0;
      contrast.textContent=top&&top.d>0?T.greatest+top.w.factor[isFa?'fa':'en']+T.greatestEnd:'';
    }
    form.addEventListener('input',()=>redraw());
    form.addEventListener('change',()=>redraw());
    form.addEventListener('submit',event=>event.preventDefault());
    form.addEventListener('reset',()=>window.setTimeout(()=>redraw(T.cleared),0));
    redraw();
  }
  document.querySelectorAll('[data-choice-studio]').forEach(initialize);
})();
