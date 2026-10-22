/* Scientific and educational source readiness: private, owner-MFA,
 * on-demand read-only view. A source file is NOT a passed scientific gate.
 * No learner data, scheduled polling or checkout controls.
 */
(() => {
  'use strict';
  const root=document.getElementById('ops-education-readiness');
  const workspace=document.getElementById('ops-workspace');
  if(!root||!workspace)return;
  const fa=document.documentElement.lang==='fa';
  const T=(a,b)=>fa?a:b;
  const status=root.querySelector('[data-education-readiness-status]');
  const aggregate=root.querySelector('[data-education-readiness-summary]');
  const listing=root.querySelector('[data-education-readiness-engines]');
  const dependencies=root.querySelector('[data-education-readiness-dependencies]');
  const refresh=root.querySelector('[data-education-readiness-refresh]');
  if(!status||!aggregate||!listing||!dependencies||!refresh)return;
  let controller=null, serial=0, busy=false,loaded=false;
  const number=new Intl.NumberFormat(fa?'fa-IR':'en-US');
  const make=(tag,cls,textValue)=>{
    const el=document.createElement(tag);
    if(cls)el.className=cls;
    if(textValue!==undefined)el.textContent=String(textValue);
    return el;
  };
  const labelBool=(value)=>value===true?T('بله، صرفاً در محدوده گزارش','Yes, within reported scope'):
    value===false?T('خیر / تأییدنشده','No / not confirmed'):T('نامشخص','Unknown');
  function reset(){
    serial++;controller?.abort();controller=null;busy=false;loaded=false;
    refresh.disabled=false;
    aggregate.textContent='';
    listing.replaceChildren();dependencies.replaceChildren();
    status.textContent=T('برای دریافت وضعیت، این بخش را باز کنید.',
      'Expand to request the private readiness snapshot.');
  }
  function render(data){
    aggregate.textContent=T('موتورها: ','Engines: ')+number.format(data.summary.engines)+
      T(' · موتورها با اعتبارسنجی علمی ثبت‌شده: ',' · scientifically validated engines: ')+
      number.format(data.summary.scienceValidatedEngines)+
      T(' · بسته‌های تأییدشده این ماژول: ',' · approved offers in this module: ')+
      number.format(data.summary.approvedEducationPaidOffers);
    listing.replaceChildren();
    for(const engine of data.engines){
      const card=make('article','jr-edu-offers__card');
      card.append(make('strong','jr-edu-offers__title',fa?engine.labelFa:engine.labelEn));
      card.append(make('p','jr-edu-offers__price',
        T('فایل‌های منبع حاضر: ','Source files present: ')+
        number.format(engine.sourceFilesPresent)+' / '+
        number.format(engine.expectedSourceFiles)));
      card.append(make('p','jr-edu-offers__warning',
        T('وضعیت علمی: نیازمند تأیید مستقل','Scientific status: independent approval required')));
      card.append(make('p','jr-edu-offers__warning',
        T('وضعیت اجرا: تأیید نشده','Live execution: not verified')));
      card.append(make('p','jr-edu-offers__warning',
        T('گام بعدی: ','Next: ')+engine.nextRequirement));
      listing.append(card);
    }
    const deps=data.sourceDependencies;
    const things=[
      [T('شمار دفترچه‌های شناسایی‌شده در مانيفست','Guides inventoried in manifest'),
        deps.sourceGuidesIdentified===null?T('نامشخص','Unknown'):
          number.format(deps.sourceGuidesIdentified)],
      [T('صفحات PDF شناسایی‌شده','Inventoried PDF pages'),
        deps.sourceGuidePagesInventoried===null?T('نامشخص','Unknown'):
          number.format(deps.sourceGuidePagesInventoried)],
      [T('پیشنهادهای قیمت‌گذاری ثبت‌شده','Draft offer proposals'),
        deps.unapprovedOfferDrafts===null?T('نامشخص','Unknown'):
          number.format(deps.unapprovedOfferDrafts)],
      [T('ستون‌های مورد انتظار BAHAR در پایگاه داده مادر','Expected BAHAR mother-DB columns'),
        labelBool(deps.baharMotherDatabaseColumnsPresent)],
      [T('پایگاه داده پیش‌نویس قیمت آموزشی','Educational draft-pricing schema'),
        labelBool(deps.educationalDraftPricingStorageReady)],
      [T('پیشنهادهای ذخیره‌شده توسط مالک','Saved owner draft overrides'),
        deps.educationalDraftOverrides===null?T('نامشخص','Unknown'):
          number.format(deps.educationalDraftOverrides)]
    ];
    dependencies.replaceChildren();
    for(const [heading,value] of things){
      const row=make('div','jr-edu-offers__card');
      row.append(make('strong','jr-edu-offers__title',heading));
      row.append(make('p','jr-edu-offers__warning',value));
      dependencies.append(row);
    }
    if(Array.isArray(data.researchContracts) && data.researchContracts.length<=16){
      const heading=make('h3','jr-edu-offers__heading',
        T('قراردادهای علمی و داده‌ای موتورهای یکپارچه',
          'Scientific and data contracts of integrated engines'));
      dependencies.append(heading);
      for(const item of data.researchContracts){
        if(!item || typeof item.id!=='string'||typeof item.role!=='string')continue;
        const card=make('article','jr-edu-offers__card');
        card.append(make('strong','jr-edu-offers__title',item.id));
        card.append(make('p','jr-edu-offers__warning',
          T('قابلیت طراحی‌شده: ','Source contract: ')+item.role));
        card.append(make('p','jr-edu-offers__warning',
          T('فایل منبع در سرور: ','Source file on server: ')+
          labelBool(item.sourceFilePresent)));
        card.append(make('p','jr-edu-offers__warning',
          T('وضعیت علمی: ','Scientific state: ')+item.scienceStatus));
        card.append(make('p','jr-edu-offers__warning',
          T('انتشار و صحت عملکرد: تأیید نشده','Release and runtime: not verified')));
        dependencies.append(card);
      }
    }
    status.textContent=T(
      'این نما تنها گزارش آمادگی منبع و شِمای داده است؛ هیچ موتور، بسته پولی یا پیش‌بینی قبولی را تأیید نمی‌کند.',
      'This is a source and schema readiness snapshot. It does not certify any engine, paid offer or admission prediction.'
    );
  }
  async function load(){
    if(busy||workspace.hidden||!root.open)return;
    const id=++serial;
    controller?.abort();controller=new AbortController();
    busy=true;refresh.disabled=true;
    status.textContent=T('در حال خواندن وضعیت خصوصی…','Reading private readiness state…');
    try{
      const res=await fetch('/api/admin/operations/education-readiness',{
        method:'GET',credentials:'same-origin',cache:'no-store',
        headers:{Accept:'application/json'},signal:controller.signal
      });
      if(!res.ok)throw Error('unavailable');
      const data=await res.json();
      if(id!==serial||workspace.hidden||!root.open)return;
      if(data?.ok!==true||data.schema!=='jr.education-governance-admin-snapshot.v1'||
        data.state!=='UNVERIFIED_FOR_RELEASE'||data.readOnly!==true||
        data.canActivate!==false||data.canRelease!==false||
        !Array.isArray(data.engines)||data.engines.length!==6||
        data.summary?.endToEndReleaseCertified!==false||
        !data.sourceDependencies||!Array.isArray(data.researchContracts)||
        data.researchContracts.length>16||
        data.researchContracts.some(c=>!c||typeof c.id!=='string'||
          c.productionVerified!==false||c.releaseAuthorized!==false)||
        data.engines.some(e=>typeof e.labelFa!=='string'||typeof e.labelEn!=='string'||
          e.scientificallyValidated!==false||e.releaseApproved!==false))
        throw Error('invalid');
      render(data);loaded=true;
    }catch(error){
      if(id!==serial||error?.name==='AbortError')return;
      loaded=false;listing.replaceChildren();dependencies.replaceChildren();
      aggregate.textContent='';
      status.textContent=T('اطلاعات در دسترس نیست؛ مجوز علمی یا انتشار فرض نمی‌شود.',
        'Readiness status unavailable; no scientific or release approval is inferred.');
    }finally{
      if(id===serial){busy=false;refresh.disabled=false;controller=null;}
    }
  }
  root.addEventListener('toggle',()=>{
    if(root.open){if(!loaded)load();}
    else controller?.abort();
  });
  refresh.addEventListener('click',load);
  const observer=new MutationObserver(()=>{
    if(workspace.hidden)reset();
  });
  observer.observe(workspace,{attributes:true,attributeFilter:['hidden']});
  window.addEventListener('pagehide',()=>{reset();observer.disconnect();},{once:true});
})();