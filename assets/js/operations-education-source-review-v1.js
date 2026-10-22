/* JR 1405 official-admissions source review: MFA-only historical evidence UI.
 * No candidate data, approval toggles, crawler, payment, schedule or background polling.
 */
(() => {
  'use strict';
  const panel=document.getElementById('ops-education-source-review');
  const workspace=document.getElementById('ops-workspace');
  if(!panel||!workspace)return;
  const fa=document.documentElement.lang==='fa';
  const T=(a,b)=>fa?a:b;
  const summary=panel.querySelector('[data-source-review-summary]');
  const status=panel.querySelector('[data-source-review-status]');
  const guides=panel.querySelector('[data-source-review-guides]');
  const gaps=panel.querySelector('[data-source-review-gaps]');
  const reload=panel.querySelector('[data-source-review-refresh]');
  const numeral=new Intl.NumberFormat(fa?'fa-IR':'en-US');
  let controller=null,serial=0,busy=false,loaded=false;
  const node=(name,className,content)=>{
    const el=document.createElement(name);
    if(className)el.className=className;
    if(content!==undefined)el.textContent=String(content);
    return el;
  };
  const categoryLabels={
    HUMANITIES:[ 'علوم انسانی','Humanities' ],
    EXPERIMENTAL_SCIENCES:[ 'علوم تجربی','Experimental sciences' ],
    MATHEMATICS:[ 'ریاضی و فنی','Mathematics' ],
    ARTS:[ 'هنر','Arts' ],
    INSTITUTIONAL_APPENDICES:[ 'پیوست‌های مؤسسه‌ها','Institutional appendices' ],
    RECORDS_BASED_ADMISSION:[ 'پذیرش صرفاً بر اساس سوابق تحصیلی','Records-based admission' ],
    FOREIGN_LANGUAGES:[ 'راهنمای زبان‌های خارجی','Foreign languages guide' ],
    OFFICIAL_AMENDMENTS:[ 'اصلاحیه‌های رسمی','Official amendments' ],
    TEACHER_TRAINING_SUPPLEMENTS:[ 'پیوست‌های تربیت معلم','Teacher-training supplements' ]
  };
  function label(key){
    const names=categoryLabels[key];
    return names?(fa?names[0]:names[1]):key.replaceAll('_',' ');
  }
  const clear=()=>{
    serial++;
    controller?.abort();controller=null;loaded=false;busy=false;
    reload.disabled=false;guides.replaceChildren();gaps.replaceChildren();
    summary.textContent='';
    status.textContent=T('هنوز اطلاعاتی درخواست نشده است.','No source inventory has been requested.');
  };
  function render(data){
    guides.replaceChildren();gaps.replaceChildren();
    summary.textContent=T('راهنماهای شناخته‌شده: ','Identified guides: ')+numeral.format(data.summary.guideCount)+
      T(' · صفحات PDF ثبت‌شده: ',' · inventoried PDF pages: ')+numeral.format(data.summary.sourcePdfPages)+
      T(' · ردیف رشته‌محل تأییدشده: ',' · approved programme rows: ')+numeral.format(0);
    for(const row of data.guides){
      const card=node('article','jr-edu-offers__card');
      card.append(node('strong','jr-edu-offers__title',label(row.category)));
      card.append(node('p','jr-edu-offers__price',
        T('تعداد صفحه ثبت‌شده: ','Recorded pages: ')+numeral.format(row.pdfPageCount)));
      card.append(node('p','jr-edu-offers__warning',
        T('بررسی جدول‌ها: ','Table review: ')+row.criticalTablesReview));
      card.append(node('small','jr-edu-offers__warning',
        T('صرفاً شناسایی منبع؛ مجوز انتشار یا ارزیابی قبولی وجود ندارد.',
          'Source inventory only; admission use and publication remain disabled.')));
      guides.append(card);
    }
    for(const row of data.gaps){
      const card=node('li','jr-edu-offers__card');
      card.append(node('strong','jr-edu-offers__title',label(row.kind)));
      card.append(node('p','jr-edu-offers__warning',row.status));
      gaps.append(card);
    }
    status.textContent=T(
      'این گزارش از مانيفستِ بازبینی‌نشده ساخته شده است؛ نتیجه بررسی زنده پایگاه داده یا اعتبارسنجی دفترچه‌ها نیست.',
      'This comes from an unreviewed source manifest, not a live database audit or verified admissions dataset.'
    );
  }
  async function load(){
    if(busy||workspace.hidden||!panel.open)return;
    const id=++serial;
    controller?.abort();
    controller=new AbortController();
    busy=true;reload.disabled=true;
    status.textContent=T('در حال دریافت وضعیت خصوصی منابع…','Retrieving private source-review state…');
    try{
      const result=await fetch('/api/admin/operations/educational-source-review',{
        method:'GET',credentials:'same-origin',cache:'no-store',
        headers:{Accept:'application/json'},signal:controller.signal
      });
      if(!result.ok)throw Error('not-available');
      const data=await result.json();
      if(id!==serial||!panel.open||workspace.hidden)return;
      if(data?.ok!==true||data.schema!=='jr-1405-official-guides-admin-readonly-v1'
        ||data.readonly!==true||data.canApprove!==false
        ||data.canActivate!==false||data.state!=='SOURCE_METADATA_UNREVIEWED'
        ||!Array.isArray(data.guides)||!Array.isArray(data.gaps)
        ||data.guides.length>60||data.gaps.length>30
        ||data.summary?.officialAdmissionsActive!==false
        ||data.summary?.admissionProbabilitiesAvailable!==false
        ||data.summary?.approvedProgrammeRows!==0)throw Error('untrusted-data');
      loaded=true;render(data);
    }catch(e){
      if(id!==serial||e?.name==='AbortError')return;
      loaded=false;guides.replaceChildren();gaps.replaceChildren();summary.textContent='';
      status.textContent=T('گزارش منابع در دسترس نیست؛ همه نتایج رسمی همچنان تأییدنشده تلقی می‌شوند.',
        'Source report is unavailable; official admission evidence remains unverified.');
    }finally{
      if(id===serial){busy=false;reload.disabled=false;controller=null;}
    }
  }
  panel.addEventListener('toggle',()=>{
    if(panel.open){if(!loaded)load();}
    else {controller?.abort();}
  });
  reload.addEventListener('click',load);
  const observer=new MutationObserver(()=>{
    if(workspace.hidden)clear();
  });
  observer.observe(workspace,{attributes:true,attributeFilter:['hidden']});
  window.addEventListener('pagehide',()=>{clear();observer.disconnect();},{once:true});
})();