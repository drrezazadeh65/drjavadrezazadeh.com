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
  const commander=root.querySelector('[data-education-command-overview]');
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
    if(commander)commander.replaceChildren();
    status.textContent=T('برای دریافت وضعیت، این بخش را باز کنید.',
      'Expand to request the private readiness snapshot.');
  }
  // Build an actionable overview from the existing *observed* API fields.
  // This is NOT a second audit, health check, source approval or launch score.
  function renderOwnerCommand(data){
    if(!commander)return;
    commander.replaceChildren();
    const deps=data.sourceDependencies||{};
    const items=[
      {
        title:T('منابع رسمی ۱۴۰۵','Official 1405 guides'),
        count:deps.sourceGuidePagesInventoried,
        state:deps.guideManifestReadAvailable===true
          ?T('فهرست موجود · تأیید نشده','Inventory present · unreviewed')
          :T('منبع قابل دریافت نیست','Source inventory unavailable'),
        detail:T('نخست بررسی صفحه‌های اصلی و اصلاحیه‌ها؛ هیچ احتمال قبولی منتشر نشود.',
          'Review original pages and amendments before publishing any programme claims.'),
        button:T('مشاهده دفترچه‌ها','Review guide inventory'),
        target:'ops-education-source-review'
      },
      {
        title:T('زیرساخت داده BAHAR','BAHAR mother database'),
        count:null,
        state:deps.baharMotherDatabaseColumnsPresent===true
          ?T('ستون‌های پایه حاضر · اجرا آزموده نشده','Core columns present · runtime unverified')
          :deps.baharMotherDatabaseColumnsPresent===false
            ?T('نیازمند تکمیل ستون‌های پایه','Base schema needs work')
            :T('وضعیت جدول‌ها نامشخص','Table availability unknown'),
        detail:T('برای ذخیره امن، فعال‌سازی مدیر، رضایت و تأیید مستقل لازم است.',
          'Encrypted saving requires owner opt-in, consent and separate approval.'),
        button:T('کنترل ذخیره خصوصی','Private storage controls'),
        target:'jr-bahar-owner-policy'
      },
      {
        title:T('قیمت‌های پیشنهادی','Proposed educational prices'),
        count:deps.unapprovedOfferDrafts,
        state:deps.educationalDraftPricingStorageReady===true
          ?T('پیش‌نویس‌ها قابل مدیریت‌اند · فروش غیرفعال','Owner drafts manageable · sale OFF')
          :T('آمادگی ثبت پیش‌نویس تأیید نشده','Draft storage not verified'),
        detail:T('همه قیمت‌ها پیشنهادی‌اند؛ مراحل مقدماتی رایگان باقی می‌مانند.',
          'All prices are proposals. Introductory stages stay free.'),
        button:T('مدیریت پیشنهادها','Manage draft proposals'),
        target:'ops-education-offers'
      },
      {
        title:T('آماده‌سازی خدمات برای عرضه','Educational offer release preparation'),
        count:deps.educationalPreparationReadyForReview,
        state:deps.educationalPreparationLedgerReady===true
          ?T('دفتر پیشرفت مدیر موجود است · انتشار غیرفعال',
              'Owner preparation available · publication OFF')
          :T('دفتر پیشرفت هنوز در دیتابیس آماده نیست',
              'Preparation ledger not yet provisioned'),
        detail:T('برای هر بسته آموزشی شش بخش محتوا، علم، تحویل، حریم خصوصی، پرداخت و کیفیت موبایل را جداگانه مدیریت کنید؛ علامت‌گذاری، تأیید نهایی نیست.',
          'Track six preparation areas per offer: science, content, delivery, privacy, payment and UX. Owner progress is not independent approval.'),
        button:T('مدیریت آمادگی ۱۲ خدمت','Manage all 12 offers'),
        target:'ops-education-release-gates'
      },
      {
        title:T('کیفیت صفحات و سئوی قابل اصلاح','Page quality & SEO priorities'),
        count:deps.pageQualityWeakOnPageSeoPages,
        state:deps.pageQualitySourceInventoryAvailable===true
          ?T('برآورد از کد صفحات؛ نه رتبه واقعی گوگل',
              'Committed HTML heuristics, not live Google rankings')
          :T('گزارش امتیاز ساختاری موجود نیست',
              'Static quality inventory unavailable'),
        detail:T('مشاهده امتیاز مجزای محتوا، تصویر، سئو، UI/UX، AI/GEO، دسترس‌پذیری و سرعت در پنل اصلی.',
          'Review per-page content, image, SEO, UI/UX, AI/GEO, accessibility and speed signals in the canonical dashboard.'),
        button:T('بازکردن جدول امتیاز صفحات','Open per-page quality scores'),
        target:'ops-page-quality'
      },
      {
        title:T('مخاطبان تأییدشده مسیرهای آموزشی','Verified education-interest audience'),
        count:deps.eduInterestVerifiedContacts,
        state:deps.eduInterestObserved===true
          ?(deps.eduInterestCaptureAvailable===true
              ?T('ثبت اختیاری با تأیید ایمیل فعال است',
                  'Optional double opt-in is enabled')
              :T('فهرست واقعی ثبت‌شده · دعوت جدید غیرفعال',
                  'Existing verified contacts · new capture OFF'))
          :T('آمار واقعی مخاطبان در دسترس نیست',
              'Actual consented-audience figures unavailable'),
        detail:T('فقط ایمیل‌های تأییدشده و موضوع انتخابی کاربر؛ آدرس‌های خصوصی تنها با درخواست مستقیم مدیر دیده می‌شوند.',
          'Mailbox-verified, purpose-limited educational interests only. Private email details require a separate owner action.'),
        button:T('مدیریت مخاطبان داوطلب','Manage opt-in audience'),
        target:'jr-education-interests'
      },
      {
        title:T('درآمد و تحویل؛ فقط شواهد واقعی','Commerce and delivery evidence'),
        count:null,
        state:T('فروش بسته‌های پیشنهادی غیرفعال','Proposed offers are NOT live for sale'),
        detail:T('مقایسه سفارش‌های واقعی، تطبیق ادعای درگاه، خدمات باز و تقاضای ایمیلی داوطلبانه؛ بدون ادعای سود یا تسویه.',
          'Inspect existing orders, payment-claim matches, service backlog and consented interest; no invented profit or settlement.'),
        button:T('مشاهده وضعیت تجارت','Open actual commerce evidence'),
        target:'jr-education-business-report'
      },
      {
        title:T('درخواست‌های حذف خصوصی BAHAR','BAHAR privacy erasure requests'),
        count:deps.pendingBaharPrivacyErasureRequests,
        state:deps.pendingBaharPrivacyErasureRequests===null
          ?T('وضعیت صف حریم خصوصی نامشخص','Privacy request ledger unavailable')
          :T('درخواست‌های واقعی ثبت‌شده در دیتابیس مادر',
              'Observed mother-database privacy requests'),
        detail:deps.baharPrivacyErasureLegalHolds>0
          ?T('برخی درخواست‌ها محدودیت قانونی دارند. تکمیل فقط پس از رفع محدودیت مجاز است.',
              'Some requests are held for lawful retention; no override is allowed.')
          :T('درخواست‌ها فقط به کاربرگ رمزگذاری‌شده همان حساب مربوط‌اند.',
              'Each request concerns only its owner’s encrypted workbook.'),
        button:T('رسیدگی به درخواست‌های حذف','Review privacy erasures'),
        target:'jr-bahar-erasure-queue'
      },
      {
        title:T('درخواست‌های تأیید بزرگسالی','Adult eligibility review queue'),
        count:deps.pendingIndependentAdultReviewRequests,
        state:deps.adultReviewQueueVisible===true
          ?T('تعداد درخواست‌ها از دیتابیس مادر دریافت شد',
              'Pending request count loaded from the mother database')
          :T('موجودی صف درخواست‌ها نامشخص','Request queue count unknown'),
        detail:T('بررسی مدارک فقط توسط مدیر احراز‌شده؛ هیچ مدرکی روی سرور دریافت نمی‌شود.',
          'Owner reviews age eligibility independently. No identity files are uploaded.'),
        button:T('رسیدگی به درخواست‌ها','Review applications'),
        target:'jr-bahar-adult-review'
      },
      {
        title:T('اعتبار علمی شش موتور','Six-engine scientific readiness'),
        count:data.summary?.scienceValidatedEngines,
        state:T('اعتبارسنجی مستقل ثبت نشده','No independent validation registered'),
        detail:T('وجود فایل یا موتور، گواه اعتبار علمی، عملکرد زنده یا انتشار نیست.',
          'Source presence does not certify scientific validity or live readiness.'),
        button:T('مشاهده شش موتور','Inspect six engines'),
        target:'education-engines'
      }
    ];
    for(const item of items){
      const card=make('article','jr-edu-owner-command__card');
      const heading=make('h4','jr-edu-owner-command__title',item.title);
      const state=make('p','jr-edu-owner-command__state',item.state);
      const detail=make('p','jr-edu-owner-command__description',item.detail);
      card.append(heading);
      if(Number.isSafeInteger(item.count)&&item.count>=0){
        const quantity=make('strong','jr-edu-owner-command__number',
          number.format(item.count));
        quantity.title=T('تعداد ثبت‌شده در محدوده همین گزارش؛ تأیید علمی نیست',
          'Reported count only; not a scientific or release approval');
        card.append(quantity);
      }
      card.append(state,detail);
      const action=make('button','jr-edu-owner-command__action',item.button);
      action.type='button';
      action.addEventListener('click',()=>{
        const panel=item.target==='jr-bahar-owner-policy'
          ?root.querySelector('[data-jr-bahar-owner-policy]')
          :item.target==='education-engines'
            ?listing:document.getElementById(item.target);
        if(!panel)return;
        if(panel.tagName==='DETAILS')panel.open=true;
        if(!panel.closest('details')?.open&&panel.closest('details')){
          panel.closest('details').open=true;
        }
        panel.scrollIntoView({block:'start',behavior:'auto'});
        if(panel.tagName==='DETAILS'){
          panel.querySelector('summary')?.focus({preventScroll:true});
        }else{
          const first=panel.querySelector('button,a,summary,[tabindex]');
          if(first)first.focus({preventScroll:true});
        }
      });
      card.append(action);commander.append(card);
    }
  }
  function render(data){
    renderOwnerCommand(data);
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
      [T('آمادگی دفتر پیشرفت خدمات آموزشی','Educational offer preparation ledger ready'),
        labelBool(deps.educationalPreparationLedgerReady)],
      [T('بخش‌های تهیه‌شده برای بازبینی مستقل','Offer steps ready for independent review'),
        Number.isSafeInteger(deps.educationalPreparationReadyForReview)
          ?number.format(deps.educationalPreparationReadyForReview)+' / '+
            number.format(deps.educationalPreparationGateCount??0)
          :T('نامشخص','Unknown')],
      [T('پیشنهادهای ذخیره‌شده توسط مالک','Saved owner draft overrides'),
        deps.educationalDraftOverrides===null?T('نامشخص','Unknown'):
          number.format(deps.educationalDraftOverrides)],
      [T('مخاطبان ایمیلی آموزشی تأییدشده','Verified education email subscribers'),
        deps.eduInterestVerifiedContacts===null?T('نامشخص','Unknown'):
          number.format(deps.eduInterestVerifiedContacts)],
      [T('ایمیل‌های آموزشی در انتظار تأیید','Educational email verifications pending'),
        deps.eduInterestPendingVerification===null?T('نامشخص','Unknown'):
          number.format(deps.eduInterestPendingVerification)],
      [T('فعال بودن دعوت اختیاری','Optional learning-interest opt-in enabled'),
        labelBool(deps.eduInterestCaptureAvailable)],
      [T('صفحات دارای سئوی ضعیف در ممیزی کد','Weak SEO pages in source review'),
        deps.pageQualityWeakOnPageSeoPages===null?T('نامشخص','Unknown'):
          number.format(deps.pageQualityWeakOnPageSeoPages)],
      [T('تعداد صفحات HTML در ممیزی کد','HTML pages in static quality inventory'),
        deps.pageQualityScoredHtmlPages===null?T('نامشخص','Unknown'):
          number.format(deps.pageQualityScoredHtmlPages)],
      [T('درخواست‌های حذف BAHAR در انتظار پیگیری','Pending BAHAR erasure requests'),
        deps.pendingBaharPrivacyErasureRequests===null?T('نامشخص','Unknown'):
          number.format(deps.pendingBaharPrivacyErasureRequests)],
      [T('درخواست‌های دارای محدودیت نگهداری قانونی','Privacy requests under legal holds'),
        deps.baharPrivacyErasureLegalHolds===null?T('نامشخص','Unknown'):
          number.format(deps.baharPrivacyErasureLegalHolds)],
      [T('درخواست‌های بزرگسال در انتظار بررسی','Adult review applications pending'),
        deps.pendingIndependentAdultReviewRequests===null?T('نامشخص','Unknown'):
          number.format(deps.pendingIndependentAdultReviewRequests)],
      [T('وضعیت واقعی ذخیره رمزگذاری‌شده BAHAR','BAHAR private workbook currently enabled'),
        labelBool(deps.privateAdultWorkbookEffectiveEnabled)],
      [T('شواهد بررسی مستقل توسط مالک','Recorded independent review evidence'),
        labelBool(deps.privateAdultWorkbookEvidenceRecorded)],
      [T('متن‌های رضایت جاری فارسی/انگلیسی','Current bilingual consent notices'),
        labelBool(deps.privateAdultWorkbookBilingualNoticesReady)]
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
      if(commander)commander.replaceChildren();
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
  let workspaceFirstOpen=false;
  const observer=new MutationObserver(()=>{
    if(workspace.hidden){
      reset();
      workspaceFirstOpen=false;
      root.open=false;
      return;
    }
    // First MFA-authorized display opens ONE meaningful owner command view.
    // This performs one normal read-only application API GET at user login;
    // it does not perform a test, collection cycle or publication.
    if(!workspaceFirstOpen){
      workspaceFirstOpen=true;
      if(!root.open)root.open=true;
      else if(!loaded)load();
    }
  });
  observer.observe(workspace,{attributes:true,attributeFilter:['hidden']});
  window.addEventListener('pagehide',()=>{reset();observer.disconnect();},{once:true});
})();