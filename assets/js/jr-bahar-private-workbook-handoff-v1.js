/* JR BAHAR voluntary private-workbook continuity v1.
 * The person initiates import; read happens in this browser tab only.
 * No fetch, cookies, analytics, persistence, account writing or automation.
 * Existing authored form values and reviewer workflows are never overwritten.
 */
(() => {
  'use strict';
  for (const root of document.querySelectorAll('[data-bahar-workbook-handoff]')) {
    const en=document.documentElement.lang==='en';
    const translate=(fa,eng)=>en?eng:fa;
    const check=root.querySelector('[data-workbook-consent]');
    const file=root.querySelector('[data-workbook-file]');
    const output=root.querySelector('[data-workbook-preview]');
    const state=root.querySelector('[data-workbook-state]');
    const apply=root.querySelector('[data-workbook-apply]');
    const clear=root.querySelector('[data-workbook-clear]');
    const form=document.querySelector('[data-bahar-formative] [data-bahar-plan-form]');
    if(!check||!file||!output||!state||!apply||!clear||!form)return;
    let summary=null;
    const finiteString=(value,max=500)=>typeof value==='string'&&
      value.trim().length>0&&value.length<=max;
    const optionalString=(value,max=500)=>value===undefined||
      (typeof value==='string'&&value.length<=max);
    const isoDate=value=>{
      if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
      const [y,m,d]=value.split('-').map(Number);
      const parsed=new Date(Date.UTC(y,m-1,d));
      return parsed.getUTCFullYear()===y&&parsed.getUTCMonth()===m-1&&
        parsed.getUTCDate()===d;
    };
    const decisions=new Set(['CONTINUE','CHANGE','PAUSE','STOP','INVESTIGATE']);
    function message(value){state.textContent=value;}
    function reset(clearConsent=false) {
      summary=null;file.value='';output.replaceChildren();output.hidden=true;
      apply.disabled=true;clear.disabled=true;
      if(clearConsent){check.checked=false;file.disabled=true;}
    }
    function addPreview(label,value) {
      const row=document.createElement('p');
      const strong=document.createElement('strong');strong.textContent=label+': ';
      row.append(strong,document.createTextNode(value));
      output.append(row);
    }
    check.addEventListener('change',()=>{
      reset();
      file.disabled=!check.checked;
      message(check.checked?translate(
        'اکنون می‌توانید فایل خصوصی خود را به‌صورت محلی انتخاب کنید.',
        'You may now choose your own private file to read locally.'
      ):translate('مجوز خواندن فایل لغو شد؛ اطلاعات از این صفحه پاک شدند.',
        'File permission withdrawn and imported information cleared.'));
    });
    file.addEventListener('change',async()=>{
      reset();
      if(!check.checked)return;
      const chosen=file.files?.[0];
      if(!chosen)return;
      if(chosen.size===0||chosen.size>30000){
        message(translate('حجم یا قالب پرونده مجاز نیست.','Unsupported file size or type.'));
        return;
      }
      try{
        const data=JSON.parse(await chosen.text());
        if(!data||typeof data!=='object'||Array.isArray(data)||
          data.schema!=='jr.bahar.private-workbook.v1'||data.version!=='1.0.0'||
          (data.compass!==null&&data.compass!==undefined&&
            (!finiteString(data.compass?.goal)||!finiteString(data.compass?.successEvidence)||
             !optionalString(data.compass.context)))||
          (data.weeklyPlan!==null&&data.weeklyPlan!==undefined&&
            (!isoDate(data.weeklyPlan?.weekStart)||
             !finiteString(data.weeklyPlan.goal)||
             !finiteString(data.weeklyPlan.action)||
             !finiteString(data.weeklyPlan.evidence)))||
          !Array.isArray(data.reflections)||data.reflections.length>8||
          data.reflections.some(x=>!x||typeof x!=='object'||Array.isArray(x)||
             !isoDate(x.date)||!finiteString(x.note)||!decisions.has(x.decision)))
          throw Error('invalid');
        // Only a small, explicitly selected subset is retained in page memory.
        // Do not hold the original parsed object, other keys, student metadata
        // or more than two reflection notes.
        summary={
          goal:(data.compass?.goal||data.weeklyPlan?.goal||'').slice(0,480),
          action:(data.weeklyPlan?.action||'').slice(0,480),
          evidence:(data.compass?.successEvidence||data.weeklyPlan?.evidence||'').slice(0,480),
          context:(data.compass?.context||'').slice(0,480),
          notes:data.reflections.slice(-2).map(x=>({date:x.date,note:x.note.slice(0,480)}))
        };
        output.replaceChildren();
        if(summary.goal)addPreview(translate('هدف آموزشی','Learning goal'),summary.goal);
        if(summary.action)addPreview(translate('اقدام هفتگی','Weekly action'),summary.action);
        if(summary.evidence)addPreview(translate('شواهد پیشنهادی','Observable evidence'),summary.evidence);
        for(const x of summary.notes)addPreview(translate('بازنگری','Reflection')+' '+x.date,x.note);
        if(!output.childNodes.length)addPreview(
          translate('وضعیت','Status'),translate('پرونده شاهد قابل نمایش ندارد.','No displayable evidence.'));
        output.hidden=false;clear.disabled=false;
        apply.disabled=!(summary.goal||summary.action||summary.evidence);
        message(translate(
          'مرور خودنوشته فقط در همین صفحه نمایش داده شد؛ هنوز چیزی به کاربرگ موجود منتقل نشده است.',
          'Your self-authored reflection is displayed in this tab only; the existing form has not changed.'
        ));
      }catch{
        reset();
        message(translate('فایل BAHAR معتبر نیست و داده‌ای وارد نشد.',
          'The file is not a compatible BAHAR workbook. No information was imported.'));
      }
    });
    apply.addEventListener('click',()=>{
      if(!summary||!check.checked)return;
      let copied=0,kept=0;
      for(const [name,value] of Object.entries({
        goal:summary.goal,action:summary.action,success:summary.evidence,why:summary.context
      })){
        if(!value)continue;
        const control=form.elements.namedItem(name);
        if(!(control instanceof HTMLInputElement||control instanceof HTMLTextAreaElement)){
          continue;
        }
        if(control.value.trim()){kept++;continue;}
        control.value=value.slice(0,Math.min(control.maxLength>0?control.maxLength:480,480));
        control.dispatchEvent(new Event('input',{bubbles:true}));
        copied++;
      }
      message(translate(
        copied+' فیلد خالی از پرونده شما پر شد؛ '+kept+' فیلد نوشته‌شده بدون تغییر ماند. شواهد هنوز نیاز به بازبینی انسانی دارند.',
        copied+' empty fields populated; '+kept+' existing entries preserved. Evidence still needs human review.'
      ));
    });
    clear.addEventListener('click',()=>{
      reset(true);
      message(translate('یادداشت واردشده از حافظه این صفحه پاک شد.',
        'Imported reflections were cleared from this page.'));
    });
    window.addEventListener('pagehide',()=>reset(true),{once:true});
    reset(true);
  }
})();