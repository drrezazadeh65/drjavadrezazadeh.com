/* JR Choice Studio v4.0 | Non-regressive progressive upgrade of the established studio.
 * Pathway names, impressions and reports are MEMORY-ONLY and never transmitted.
 * Explicit opt-in stores ONLY five weights + display order in tab sessionStorage.
 * Never infer admissions, aptitude, diagnosis, talent norms or career prescriptions.
 * Reorder with keyboard buttons or touch/pen/mouse handle; no node cloning.
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
      sensitivityWarning:'هشدار حساسیت: تغییر فقط یک درجه در یک برآورد می‌تواند نتیجه مقایسه را برابر یا معکوس کند. شواهد مستقل بیشتری بررسی کنید.',
      sensitivityStable:'با تغییر یک‌درجه‌ای مجاز در هر برآورد، جهت این مقایسه تغییر نمی‌کند؛ بااین‌حال این نتیجه اعتبار علمی یا پیش‌بینی آینده نیست.',
      sensitivityTie:'دو مسیر فعلاً برابرند؛ حتی یک تغییر کوچک در برآوردها می‌تواند ترتیب را تغییر دهد.',
      formula:'روش محاسبه: مجموع (اهمیت × برآورد هر معیار) تقسیم بر مجموع اهمیت معیارهای فعال. معیارهایی که اهمیت صفر دارند در محاسبه وارد نمی‌شوند.',
      actions:'گام بعدی',next:'پیش از تصمیم، ضوابط رسمی ورود، محتوای دوره و هزینه واقعی هر گزینه را بررسی کنید؛ شواهد مخالف، دیدگاه خانواده و یک تجربه کوتاهِ قابل بازنگری را نیز ثبت کنید.',
      limitation:'این عدد بازتاب ترجیحات و برآوردهای خود شماست؛ آزمون روان‌سنجی، تشخیص استعداد، پیش‌بینی قبولی یا تضمین آینده نیست.',
      privacy:'نام مسیرها، ارزیابی‌ها و گزارش‌ها تنها در حافظه صفحه پردازش می‌شوند و به سرور ارسال یا در مرورگر ذخیره نمی‌شوند.',
      reset:'پاک کردن داده‌های این جلسه',cleared:'همه پاسخ‌ها و وزن‌های ذخیره‌شده در این نشست پاک شدند.',
      scale:'مقیاس ارزیابی: ۱ = بسیار نامتناسب، ۵ = بسیار متناسب',
      compared:'معیار فعال تکمیل‌شده',of:'از',empty:'—',
      steps:['اهمیت معیارها','بررسی دو مسیر','خوانش نتیجه'],
      stepGuide:'راهنمای سه‌مرحله‌ای کاربرگ؛ وضعیت ورود اطلاعات، نه نمره استعداد',
      remember:'ذخیره اختیاری فقط وزن‌ها در نشست این زبانه',
      privacyExtra:'فقط در صورت انتخاب شما، پنج وزن و ترتیب نمایش آن‌ها در حافظه نشست این زبانه نگهداری می‌شوند؛ نام رشته‌ها، ارزیابی‌ها و نتیجه هرگز ذخیره نمی‌شوند.',
      up:'انتقال به بالا',down:'انتقال به پایین',drag:'جابجایی با لمس یا ماوس',
      orderChanged:'ترتیب معیارها تغییر کرد.',
      storageUnavailable:'ذخیره نشست مرورگر در دسترس نیست؛ داده‌ها در حافظه همین صفحه می‌مانند.',
      saved:'تنظیمات وزن‌ها در همین نشست ذخیره شدند.',forgotten:'ذخیره اختیاری وزن‌ها متوقف و داده‌های آن پاک شد.'
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
      sensitivityWarning:'Sensitivity warning: changing one impression by a single scale point can tie or reverse the comparison. Seek additional independent evidence.',
      sensitivityStable:'Changing any single impression by one valid scale point does not reverse this comparison, but this is not scientific validation or prediction.',
      sensitivityTie:'The pathways currently tie. A small change in your impressions can change the ordering.',
      formula:'Method: sum of (importance × impression) divided by the total importance of active criteria. A criterion with zero importance is excluded.',
      actions:'Constructive next step',next:'Before deciding, verify official entry requirements, course content and actual costs. Record counter-evidence, family perspectives and one small, revisable experience that could inform the choice.',
      limitation:'This number describes your own preferences and judgements. It is not a validated psychometric assessment, diagnosis, admission prediction or guarantee of future success.',
      privacy:'Pathway names, ratings and reports remain in this page’s memory only; nothing is sent to the server or saved in browser storage.',
      reset:'Clear this session',cleared:'All answers and any remembered weights were cleared.',
      scale:'Impression scale: 1 = very poor fit, 5 = very good fit',
      compared:'Active criteria completed',of:'of',empty:'—',
      steps:['Set priorities','Explore two pathways','Read the reflection'],
      stepGuide:'Three worksheet steps; progress reflects only form entries, never assessed aptitude',
      remember:'Optionally remember weights in this tab session',
      privacyExtra:'Only if you opt in, the five weights and display order remain in this tab session. Pathway names, impressions and results are never stored.',
      up:'Move up',down:'Move down',drag:'Drag to reorder',
      orderChanged:'Criterion order changed.',
      storageUnavailable:'Tab session storage is unavailable; data remain in page memory.',
      saved:'Weights saved for this tab session.',forgotten:'Optional weight storage stopped and prior weights removed.'
    }
  };

  // The identity check prevents comparing the SAME option twice by using
  // Persian/Arabic spelling variants, Unicode compatibility forms or
  // multiple whitespace characters. Display labels remain user-authored.
  const pathwayIdentity=value=>String(value).normalize('NFKC')
    .replace(/[يى]/gu,'ی').replace(/ك/gu,'ک')
    .replace(/\s+/gu,' ').trim().toLocaleLowerCase();

  function node(tag,text,className){
    const n=document.createElement(tag);
    if(text!==undefined&&text!==null)n.textContent=text;
    if(className)n.className=className;
    return n;
  }
  function option(value,text){const n=node('option',text);n.value=String(value);return n;}
  function initialize(root,index){
    const isFa=root.dataset.locale==='fa',T=labels[isFa?'fa':'en'];
    root.classList.add('jr-choice-studio','jr-cs-v4');
    if(isFa)root.dir='rtl';
    const ident='jr-choice-'+index+'-';
    const header=node('div',null,'jr-cs-intro');
    header.append(node('span',isFa?'INTERACTIVE · REFLECTION':'INTERACTIVE · REFLECTION','jr-cs-eyebrow'),
      node('h3',T.heading),node('p',T.subtitle));
    // Visual navigation represents form readiness only, not a talent score.
    // It is informational; keyboard navigation stays in the native controls.
    const journey=node('ol',null,'jr-cs-journey');
    journey.setAttribute('aria-label',T.stepGuide);
    const journeySteps=T.steps.map((title,i)=>{
      const item=node('li',null,'jr-cs-journey-step');
      item.dataset.step=String(i+1);
      const number=node('span',String(i+1).padStart(2,'0'),'jr-cs-journey-index');
      number.setAttribute('aria-hidden','true');
      const description=node('span',title,'jr-cs-journey-label');
      item.append(number,description);
      journey.append(item);return item;
    });
    const form=node('form',null,'jr-cs-form');form.noValidate=true;
    const groupWeights=node('fieldset',null,'jr-cs-weights');
    groupWeights.append(node('legend',T.weights),node('p',T.help,'jr-cs-help'));
    const weightGrid=node('div',null,'jr-cs-weight-grid');const weights=[];
    for(const f of factors){
      const item=node('div',null,'jr-cs-weight');
      item.dataset.factorId=f.id;
      item.dataset.factorIndex=String(factors.indexOf(f));
      const label=node('label',f[isFa?'fa':'en']);label.htmlFor=ident+'w-'+f.id;
      const line=node('div',null,'jr-cs-weight-line');
      const orderControls=node('div',null,'jr-cs-order-controls');
      const up=node('button','↑','jr-cs-move-up');
      up.type='button';up.setAttribute('aria-label',T.up+' — '+f[isFa?'fa':'en']);up.title=T.up;
      const down=node('button','↓','jr-cs-move-down');
      down.type='button';down.setAttribute('aria-label',T.down+' — '+f[isFa?'fa':'en']);down.title=T.down;
      const drag=node('button','⋮⋮','jr-cs-drag-handle');
      drag.type='button';drag.setAttribute('aria-label',T.drag+' — '+f[isFa?'fa':'en']);
      drag.title=T.drag;
      orderControls.append(up,down,drag);
      item.append(orderControls);
      const range=node('input');range.type='range';range.id=label.htmlFor;range.min='0';range.max='5';range.step='1';range.value='3';
      range.setAttribute('aria-label',f[isFa?'fa':'en']+' — '+T.importance);
      const number=node('output','3','jr-cs-number');number.htmlFor=range.id;
      line.append(range,number);item.append(label,line);weightGrid.append(item);
      weights.push({factor:f,item,input:range,output:number,up,down,drag});
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
    const sensitivity=node('p',null,'jr-cs-sensitivity');sensitivity.hidden=true;
    const advice=node('div',null,'jr-cs-next');
    advice.append(node('strong',T.actions),node('p',T.next));
    const limitation=node('p',T.limitation,'jr-cs-limitation');
    const reset=node('button',T.reset,'jr-cs-reset');reset.type='reset';
    const privacy=node('p',T.privacy+' '+T.privacyExtra,'jr-cs-privacy');
    const persistLabel=node('label',null,'jr-cs-persist-label');
    const persistInput=node('input');persistInput.type='checkbox';persistInput.checked=false;
    persistInput.setAttribute('aria-label',T.remember);
    persistLabel.append(persistInput,node('span',T.remember));
    const orderAnnounce=node('p','','jr-cs-order-live');
    orderAnnounce.setAttribute('role','status');orderAnnounce.setAttribute('aria-live','polite');
    result.append(announce,metrics,contrast,sensitivity,explanatory,advice,limitation);
    form.append(result,reset,persistLabel,orderAnnounce,privacy);
    root.replaceChildren(header,journey,form);

    // Canonical weight identity is factors[].id, regardless of visual order.
    // Existing feedback/report modules also use this stable factor identity.
    const storageKey='jr-choice-weights-v4-'+(isFa?'fa':'en')+'-'+index;
    const safeStore=(operation,data)=>{
      try{
        if(typeof sessionStorage==='undefined')return null;
        if(operation==='get')return sessionStorage.getItem(storageKey);
        if(operation==='remove'){sessionStorage.removeItem(storageKey);return true;}
        sessionStorage.setItem(storageKey,JSON.stringify(data));return true;
      }catch{return null;}
    };
    let order=factors.map(f=>f.id);
    const validSnapshot=s=>s&&s.version===4&&Array.isArray(s.order)&&
      s.order.length===factors.length&&new Set(s.order).size===factors.length&&
      factors.every(f=>s.order.includes(f.id))&&Array.isArray(s.weights)&&
      s.weights.length===factors.length&&s.weights.every(v=>Number.isInteger(v)&&v>=0&&v<=5);
    const load=()=>{
      const saved=safeStore('get');
      if(!saved)return;
      try{
        const value=JSON.parse(saved);
        if(!validSnapshot(value)){safeStore('remove');return;}
        order=[...value.order];
        weights.forEach((w,i)=>{w.input.value=String(value.weights[i]);});
        persistInput.checked=true;
      }catch{safeStore('remove');}
    };
    const save=()=>{
      if(!persistInput.checked)return;
      const snapshot={version:4,weights:weights.map(w=>Number(w.input.value)),order:[...order]};
      if(safeStore('set',snapshot)!==true)orderAnnounce.textContent=T.storageUnavailable;
    };
    const displayOrder=()=>{
      const elements=new Map(weights.map(w=>[w.factor.id,w.item]));
      order.forEach(id=>weightGrid.append(elements.get(id))); // MOVE real controls; never clone.
      weights.forEach(w=>{
        const i=order.indexOf(w.factor.id);
        w.up.disabled=i===0;
        w.down.disabled=i===order.length-1;
      });
    };
    const move=(id,target)=>{
      const from=order.indexOf(id);
      if(from<0||target<0||target>=order.length||from===target)return;
      order.splice(from,1);order.splice(target,0,id);
      displayOrder();
      orderAnnounce.textContent=T.orderChanged;
      save();
      redraw();
    };
    weights.forEach(w=>{
      w.up.addEventListener('click',()=>{move(w.factor.id,order.indexOf(w.factor.id)-1);w.up.focus();});
      w.down.addEventListener('click',()=>{move(w.factor.id,order.indexOf(w.factor.id)+1);w.down.focus();});
      w.drag.addEventListener('keydown',event=>{
        if(event.key!=='ArrowUp'&&event.key!=='ArrowDown')return;
        event.preventDefault();
        move(w.factor.id,order.indexOf(w.factor.id)+(event.key==='ArrowUp'?-1:1));
      });
      // Pointer events work with touch, mouse and pen. Only the dedicated
      // handle starts the gesture; sliders and their keyboard support stay intact.
      let start=null,dropTarget=null;
      const clearDrop=()=>{
        if(dropTarget)dropTarget.classList.remove('jr-cs-drop-target');
        dropTarget=null;w.item.classList.remove('jr-cs-dragging');
      };
      const targetAt=(x,y)=>{
        // Captured pointer events still carry viewport coordinates. Hit-test
        // the actual stack, excluding the dragged control and its descendants.
        const stack=typeof document.elementsFromPoint==='function'?
          document.elementsFromPoint(x,y):[document.elementFromPoint(x,y)];
        for(const hit of stack){
          const item=hit&&hit.closest&&hit.closest('.jr-cs-weight');
          if(item&&item!==w.item&&weightGrid.contains(item))return item;
        }
        return null;
      };
      w.drag.addEventListener('pointerdown',event=>{
        if(event.pointerType==='mouse'&&event.button!==0)return;
        start={id:event.pointerId,x:event.clientX,y:event.clientY,moved:false};
        if(w.drag.setPointerCapture)w.drag.setPointerCapture(event.pointerId);
      });
      w.drag.addEventListener('pointermove',event=>{
        if(!start||start.id!==event.pointerId)return;
        if(Math.hypot(event.clientX-start.x,event.clientY-start.y)<9&&!start.moved)return;
        start.moved=true;w.item.classList.add('jr-cs-dragging');
        const target=targetAt(event.clientX,event.clientY);
        if(target===dropTarget)return;
        if(dropTarget)dropTarget.classList.remove('jr-cs-drop-target');
        dropTarget=target;
        if(dropTarget)dropTarget.classList.add('jr-cs-drop-target');
      });
      w.drag.addEventListener('pointerup',event=>{
        if(!start||start.id!==event.pointerId)return;
        const dragged=start.moved;
        start=null;
        const target=dragged?targetAt(event.clientX,event.clientY):null;
        clearDrop();
        if(target)move(w.factor.id,order.indexOf(target.dataset.factorId));
      });
      w.drag.addEventListener('pointercancel',()=>{start=null;clearDrop();});
      w.drag.addEventListener('lostpointercapture',()=>{start=null;clearDrop();});
      w.input.addEventListener('input',save);
      w.input.addEventListener('change',save);
    });
    persistInput.addEventListener('change',()=>{
      if(persistInput.checked){save();orderAnnounce.textContent=T.saved;}
      else {safeStore('remove');orderAnnounce.textContent=T.forgotten;}
    });
    load();displayOrder();

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
      else if(pathwayIdentity(names[0])===pathwayIdentity(names[1]))error=T.duplicate;
      else if(active.some(w=>entries.some(e=>e.selects[factors.indexOf(w.factor)].value==='')))error=T.incomplete;
      const completeNames=names.every(Boolean)&&pathwayIdentity(names[0])!==pathwayIdentity(names[1]);
      const reviewReady=active.length>0&&completeNames&&!error;
      const currentStep=active.length===0?0:reviewReady?2:1;
      journeySteps.forEach((step,i)=>{
        step.dataset.state=i<currentStep?'complete':i===currentStep?'active':'pending';
        if(i===currentStep)step.setAttribute('aria-current','step');
        else step.removeAttribute('aria-current');
      });
      if(error){
        metrics.hidden=true;metrics.replaceChildren();contrast.hidden=true;contrast.textContent='';sensitivity.hidden=true;sensitivity.textContent='';
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
      // Exact local one-point perturbation of an individual subjective rating.
      // A changing lead is decision fragility, not psychometric uncertainty.
      const baseline=scores[0]-scores[1];
      let canChangeOrder=false;
      for(const w of active){
        const weight=Number(w.input.value);
        const k=factors.indexOf(w.factor);
        for(let optionIndex=0;optionIndex<2;optionIndex++){
          const rating=Number(entries[optionIndex].selects[k].value);
          for(const change of [-1,1]){
            if(rating+change<1||rating+change>5)continue;
            const shifted=baseline+(optionIndex===0?1:-1)*weight*change/sum;
            if(Math.sign(shifted)!==Math.sign(baseline)){
              canChangeOrder=true;
              break;
            }
          }
        }
      }
      sensitivity.hidden=false;
      sensitivity.textContent=Math.abs(baseline)<1e-10?T.sensitivityTie:
        canChangeOrder?T.sensitivityWarning:T.sensitivityStable;
    }
    form.addEventListener('input',()=>redraw());
    form.addEventListener('change',()=>redraw());
    form.addEventListener('submit',event=>event.preventDefault());
    form.addEventListener('reset',()=>{
      safeStore('remove');
      persistInput.checked=false;
      order=factors.map(f=>f.id);
      window.setTimeout(()=>{
        displayOrder();orderAnnounce.textContent='';
        redraw(T.cleared);
      },0);
    });
    redraw();
  }
  document.querySelectorAll('[data-choice-studio]').forEach(initialize);
})();
