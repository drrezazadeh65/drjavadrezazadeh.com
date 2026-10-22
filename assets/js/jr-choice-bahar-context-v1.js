/* JR Choice Studio ⇄ BAHAR contextual bridge, v1.
 * Import is user-initiated, strictly local and unverified: it adds no scores,
 * no automatic choice criterion, no eligibility finding, and no admission odds.
 * Never read cookies, local/session storage, personal accounts or network.
 */
(() => {
  'use strict';
  const fa=document.documentElement.lang!=='en';
  const T=(a,b)=>fa?a:b;
  const text=(tag,value,cls='')=>{
    const e=document.createElement(tag);
    if(cls)e.className=cls;
    e.textContent=value;
    return e;
  };
  const safe=(s,max)=>typeof s==='string'&&s.trim().length>0&&s.length<=max;
  const decisions={
    CONTINUE:T('ادامه','Continue'),CHANGE:T('اصلاح','Revise'),
    PAUSE:T('توقف موقت','Pause'),STOP:T('پایان','Stop'),
    INVESTIGATE:T('بررسی بیشتر','Investigate')
  };
  for(const root of document.querySelectorAll('[data-choice-studio]')){
    if(root.parentElement?.querySelector('[data-jr-bahar-context]'))continue;
    const wrapper=document.createElement('section');
    wrapper.className='jr-bahar-context';
    wrapper.dataset.jrBaharContext='v1';
    wrapper.setAttribute('aria-label',T('پیوند اختیاری کاربرگ BAHAR با تصمیم‌گیری','Optional BAHAR learning reflection context'));
    const heading=text('h3',T('در نظر گرفتن تجربه واقعی مطالعه، بدون نمره‌سازی','Consider study evidence without creating another score'));
    const expl=text('p',T(
      'اگر کاربرگ خصوصی BAHAR را روی دستگاه خود ذخیره کرده‌اید، می‌توانید داوطلبانه آن را اینجا بخوانید. یادداشت‌ها صرفاً برای تأمل شما نمایش داده می‌شوند و بر پنج معیار و نتیجه عددی استودیو هیچ اثری ندارند.',
      'You may voluntarily read a BAHAR private workbook saved on your own device. Its notes are only reflective context and do not affect the five criteria, numerical index or comparison outcome.'
    ));
    const go=document.createElement('a');
    go.href=fa?'/fa/bahar/':'/en/bahar/';
    go.textContent=T('آشنایی با BAHAR و ایجاد کاربرگ','Explore BAHAR and create a workbook');
    const consent=document.createElement('label');consent.className='jr-bahar-context__consent';
    const check=document.createElement('input');check.type='checkbox';
    consent.append(check,document.createTextNode(T(
      ' می‌دانم این اطلاعات خودگزارشی و پژوهشی هستند و هیچ نتیجه تأییدشده درباره شایستگی یا قبولی ایجاد نمی‌کنند.',
      ' I understand these are unverified, self-reported reflections and do not establish aptitude or admission eligibility.'
    )));
    const pick=document.createElement('label');pick.className='jr-bahar-context__picker';
    pick.textContent=T('انتخاب فایل خصوصی BAHAR','Choose private BAHAR workbook');
    const file=document.createElement('input');file.type='file';file.accept='.json,application/json';file.disabled=true;
    pick.append(file);
    const clear=document.createElement('button');clear.type='button';clear.className='jr-bahar-context__clear';
    clear.textContent=T('پاک‌کردن یادداشت‌ها','Clear imported notes');clear.disabled=true;
    const status=text('p',T('هیچ فایلی انتخاب نشده است.','No workbook imported.'),'jr-bahar-context__status');
    status.setAttribute('role','status');status.setAttribute('aria-live','polite');
    const view=document.createElement('div');view.hidden=true;view.className='jr-bahar-context__view';
    const actions=document.createElement('div');actions.className='jr-bahar-context__actions';
    actions.append(pick,clear);
    wrapper.append(heading,expl,go,consent,actions,status,view);
    root.after(wrapper);
    const clearView=()=>{
      view.replaceChildren();view.hidden=true;clear.disabled=true;
    };
    check.addEventListener('change',()=>{
      file.disabled=!check.checked;
      if(!check.checked){clearView();status.textContent=T('نمایش داده‌های BAHAR متوقف شد.','BAHAR context removed.');}
    });
    clear.addEventListener('click',()=>{
      clearView();file.value='';check.checked=false;file.disabled=true;
      status.textContent=T('یادداشت‌ها از حافظه این صفحه حذف شدند.','Imported notes were cleared from this page.');
    });
    file.addEventListener('change',async()=>{
      const selected=file.files?.[0];file.value='';
      if(!selected||!check.checked)return;
      if(selected.size===0||selected.size>30000){clearView();status.textContent=T('فایل معتبر نیست یا بیش از ۳۰ کیلوبایت است.','Invalid file or size above 30 KB.');return;}
      try{
        const data=JSON.parse(await selected.text());
        if(!data||typeof data!=='object'||Array.isArray(data)
          ||data.schema!=='jr.bahar.private-workbook.v1'
          ||data.version!=='1.0.0'||!Array.isArray(data.reflections)
          ||data.reflections.length>8)throw Error('invalid-workbook');
        const compass=data.compass;
        if(compass!==null && compass!==undefined &&
          (!safe(compass.goal,500)||!safe(compass.successEvidence,500)))throw Error('invalid-compass');
        if(data.reflections.some(e=>!e||typeof e!=='object'
          ||! /^\d{4}-\d{2}-\d{2}$/.test(e.date)
          ||!safe(e.note,500)||!Object.hasOwn(decisions,e.decision)))throw Error('invalid-reflection');
        // Minimize disclosure: only explicitly imported learning goal, declared
        // success evidence and last two reflections are displayed. No context,
        // other private fields, exported weekly plan or identifiers are retained.
        const fragment=document.createDocumentFragment();
        fragment.append(text('strong',T('یادداشت پژوهشی کاربر، فاقد تأیید مستقل','Self-reported research-stage note; not independently verified')));
        if(compass){
          fragment.append(text('p',T('هدف: ','Goal: ')+compass.goal));
          fragment.append(text('p',T('شاهد مطلوب: ','Observable evidence: ')+compass.successEvidence));
        }
        for(const item of data.reflections.slice(-2)){
          fragment.append(text('p',item.date+' · '+decisions[item.decision]+' — '+item.note));
        }
        if(!compass&&data.reflections.length===0)
          fragment.append(text('p',T('این پرونده شواهدی برای نمایش ندارد.','This workbook contains no observations to display.')));
        fragment.append(text('small',T(
          'این یادداشت‌ها رتبه، توانایی، تناسب رشته یا نمره استودیو را تعیین نمی‌کنند.',
          'These notes do not determine admission, aptitude, programme suitability or Choice Studio ratings.'
        )));
        view.replaceChildren(fragment);view.hidden=false;clear.disabled=false;
        status.textContent=T('اطلاعات انتخاب‌شده فقط در این صفحه نمایش داده شدند.','Selected reflections are shown in this page only.');
      }catch{
        clearView();status.textContent=T('این فایل BAHAR معتبر نیست و خوانده نشد.','The file was not recognized as a compatible BAHAR workbook.');
      }
    });
    window.addEventListener('pagehide',clearView,{once:true});
  }
})();