/**
 * JR EDUCATION x COMMERCE: READ-ONLY administrative evidence bridge v1.
 *
 * Authoritative source: already-existing /api/admin/operations/commerce.
 * Only aggregate observations are used; no account, gateway reference, email,
 * address, intake note, order UUID, commission or customer PII is rendered.
 * Educational proposed prices are NEVER transformed into live products.
 */
(() => {
  'use strict';
  const host=document.getElementById('ops-education-offers');
  const workspace=document.getElementById('ops-workspace');
  const panel=host?.querySelector('[data-jr-education-business-report]');
  if(!host||!workspace||!panel)return;
  const fa=document.documentElement.lang==='fa';
  const T=(a,b)=>fa?a:b;
  const reload=panel.querySelector('[data-jr-business-reload]');
  const mainButton=panel.querySelector('[data-jr-business-open-main]');
  const exportButton=panel.querySelector('[data-jr-business-export]');
  const status=panel.querySelector('[data-jr-business-status]');
  const cards=panel.querySelector('[data-jr-business-cards]');
  const week=panel.querySelector('[data-jr-business-week]');
  if(!reload||!mainButton||!exportButton||!status||!cards||!week)return;
  const n=new Intl.NumberFormat(fa?'fa-IR':'en-US');
  let controller=null,request=0,busy=false,exportRows=[];
  const visible=()=>!workspace.hidden&&host.open&&!document.hidden;
  const text=(tag,value,cls)=>{
    const element=document.createElement(tag);
    element.textContent=String(value);
    if(cls)element.className=cls;
    return element;
  };
  function reset(){
    request++;controller?.abort();controller=null;busy=false;
    reload.disabled=false;exportButton.disabled=true;exportRows=[];
    cards.replaceChildren();week.replaceChildren();
    status.textContent=T('برای مشاهده شواهد تجاری، دریافت اطلاعات را خودتان آغاز کنید.',
      'Request the private business evidence when needed.');
  }
  function card(title,value,explanation){
    exportRows.push([title,String(value),explanation]);
    const entry=document.createElement('article');
    entry.className='jr-edu-owner-command__card';
    entry.append(text('h4',title,'jr-edu-owner-command__title'));
    entry.append(text('strong',value,'jr-edu-owner-command__number'));
    entry.append(text('p',explanation,'jr-edu-owner-command__description'));
    cards.append(entry);
  }
  const count=value=>Number.isSafeInteger(value)&&value>=0?n.format(value):
    T('نامشخص','Unknown');
  function render(data,interest=null){
    const sales=data.salesPipeline,fulfil=data.fulfilment;
    const claims=data.claims,orders=data.orders,notice=data.notifications;
    if(data.ok!==true||data.schema!=='operations-commerce-evidence-v1'||
       data.available!==true||!sales||!fulfil||!claims||!orders||!notice||
       sales.status!=='INTERNAL_ORDER_LEDGER_ONLY'||
       sales.recordedOrderShareIsNotVisitorConversion!==true||
       sales.verifiedNetRevenueToman!==null||
       sales.verifiedBankSettlementToman!==null||
       data.providerBankSettlementVerified!==null||
       data.customerDetailsExposed!==false){
      throw Error('UNVERIFIED_OR_UNAVAILABLE_LEDGER');
    }
    cards.replaceChildren();exportRows=[];
    card(T('سفارش‌های پرداخت‌شده در دیتابیس','Paid-state order records'),
      count(orders.paidStateRecords),
      T('ثبت داخلی پرداخت؛ تسویه بانکی از این عدد قابل استنتاج نیست.',
        'Internal paid state only; settlement is not independently confirmed.'));
    card(T('پرداخت‌های دارای تطبیق ادعای درگاهی','Orders with matched provider claims'),
      count(sales.providerClaimMatchedOrderCount),
      T('تطبیق سوابق درگاهی با دفتر سفارش؛ نه سود و نه تسویه.',
        'Provider-claim matches, not verified bank settlement or profit.'));
    card(T('سفارش‌های پرداخت‌شده طی ۳۰ روز','Paid-state orders in last 30 days'),
      count(sales.paidStateOrdersLast30Days),
      T('شمار رکوردها؛ نرخ تبدیل بازدیدکننده نیست.',
        'Recorded order count; not a visitor conversion rate.'));
    card(T('درخواست‌های باز خدمات','Open service delivery cases'),
      count(fulfil.activeServiceCaseCount),
      T('بررسی و تحویل نیازمند اقدام مستند اپراتور است.',
        'These are actionable internal cases, not completed deliveries.'));
    card(T('درخواست‌های باز بازپرداخت','Refund requests awaiting review'),
      count(sales.refundRequestsAwaitingAction),
      T('وضعیت درخواست، پرداخت واقعی وجه به مشتری را ثابت نمی‌کند.',
        'Refund request status is not proof of disbursement.'));
    card(T('پرداخت‌های نیازمند تطبیق مستقل','Paid orders needing reconciliation'),
      count(claims.paidRowsRequiringIndependentProviderReconciliation),
      T('پیش از هر تحویل یا نتیجه‌گیری مالی، بررسی مستقل لازم است.',
        'Reconcile independently before fulfilment or financial conclusions.'));
    const consentObserved=interest?.ok===true &&
      interest.schema==='jr.education-interest-owner-snapshot.v1'&&
      interest.countsState==='OBSERVED_MOTHER_DATABASE'&&
      interest.contacts===null&&interest.containsUnverifiedAddresses===false;
    card(T('علاقه‌مندان آموزش با ایمیل تأییدشده',
        'Opt-in educational interests with verified email'),
      consentObserved?count(interest.verifiedCount):T('نامشخص','Unknown'),
      T('فقط عضویت داوطلبانه در موضوع آموزشی؛ این افراد خریدار تأییدشده نیستند.',
        'Separate opt-in, verified educational interest. Not a count of paying customers.'));
    card(T('درخواست‌های تأیید ایمیل در انتظار',
        'Pending educational email confirmations'),
      consentObserved?count(interest.pendingCount):T('نامشخص','Unknown'),
      T('این افراد تا تأیید ایمیل، مخاطب قابل ارسال نیستند.',
        'Pending email verification is not permission to send marketing.'));
    card(T('نوبت‌های آیندهٔ ثبت‌شده داخلی','Upcoming internal consultation bookings'),
      count(fulfil.internalCalendar?.totalUpcoming),
      T('فقط تقویم داخلی یک مشاور؛ تقویم خارجی تأیید نشده است.',
        'Internal single-owner bookings; external availability not confirmed.'));
    card(T('درخواست‌های پرداخت‌شده با ایمیل رسید ثبت‌نشده',
        'Paid-state orders without recorded receipt email'),
      count(notice.paidOrderRowsWithoutReceiptEmailTimestamp),
      T('نبود زمان ارسال رسید، تأیید عدم دریافت یا نیازمند ارسال مجدد نیست.',
        'Missing receipt timestamp does not establish failed inbox delivery.'));
    const ready=fulfil.internalAvailability?.schemaReady===true;
    exportButton.disabled=false;
    status.textContent=T(
      'این اعداد فقط از دفتر عملیاتی سایت استخراج شده‌اند. پیشنهادهای جدید آموزشی همچنان غیرقابل خرید هستند. ظرفیت مشاوره: ',
      'Figures are internal ledger observations. Educational proposals remain unpurchasable. Consultation capacity: ')+
      (ready?T('پنجره‌های داخلی موجود','internal windows configured'):
        T('داده معتبر در دسترس نیست','not available'))+'.';
  }

  function renderWeek(payload){
    week.replaceChildren();
    if(!payload||payload.ok!==true||
      payload.schema!=='consultation-week-v1'||
      payload.timezone!=='Asia/Tehran'||payload.slotMinutes!==60||
      payload.maxPublishedDailyHours!==4||
      payload.externalCalendarConfirmed!==false||
      payload.customerReservationEnabled!==false||
      !Array.isArray(payload.days)||payload.days.length!==7){
      week.append(text('p',T(
        'جدول هفتگی تأیید نشده است؛ برای تنظیم ظرفیت از مدیریت اصلی مشاوره استفاده کنید.',
        'Weekly capacity is not available. Use the established consultation manager to set owner hours.')));
      return;
    }
    const dateFormatter=new Intl.DateTimeFormat(
      fa?'fa-IR-u-ca-persian':'en-US',{
        timeZone:'Asia/Tehran',weekday:'short',month:'short',day:'numeric'
      });
    const timeFormatter=new Intl.DateTimeFormat(
      fa?'fa-IR':'en-US',{
        timeZone:'Asia/Tehran',hour:'2-digit',minute:'2-digit',hour12:false
      });
    const used=new Set();
    for(const day of payload.days){
      if(!day||typeof day.date!=='string'||
        !/^\d{4}-\d{2}-\d{2}$/.test(day.date)||
        used.has(day.date)||
        !Number.isSafeInteger(day.totalSlots)||day.totalSlots<0||
        day.totalSlots>4||
        !Number.isSafeInteger(day.remainingSlots)||day.remainingSlots<0||
        day.remainingSlots>day.totalSlots||
        !Array.isArray(day.slots)||day.slots.length!==day.totalSlots){
        week.replaceChildren();
        week.append(text('p',T('دادهٔ زمان‌بندی معتبر نیست.',
          'Consultation-week data is not valid.')));
        return;
      }
      used.add(day.date);
      const item=document.createElement('article');
      item.className='jr-edu-business-week__day';
      const stamp=new Date(day.date+'T12:00:00Z');
      if(Number.isNaN(stamp.valueOf()))continue;
      item.append(text('h5',dateFormatter.format(stamp)));
      item.append(text('p',
        T('ساعت قابل درخواست: ','Internally available slots: ')+
        n.format(day.remainingSlots)+' / '+n.format(day.totalSlots),
        'jr-edu-business-week__count'));
      if(day.totalSlots===0){
        item.append(text('p',T('زمانی اعلام نشده','No owner-published hours'),
          'jr-edu-business-week__empty'));
      }
      const seenSlots=new Set();
      for(const slot of day.slots){
        if(!slot||typeof slot.startUtc!=='string'||
          !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(slot.startUtc)||
          seenSlots.has(slot.startUtc)||
          !['FULL','AVAILABLE'].includes(slot.status)){
          week.replaceChildren();
          week.append(text('p',T('بازه‌های ثبت‌شده قابل تأیید نیستند.',
            'Recorded weekly slots could not be verified.')));
          return;
        }
        seenSlots.add(slot.startUtc);
        const time=new Date(slot.startUtc.replace(' ','T')+'Z');
        if(Number.isNaN(time.valueOf()))continue;
        const chip=text('span',
          timeFormatter.format(time)+' · '+
            (slot.status==='FULL'?T('پر','Full'):T('قابل درخواست','Requestable')),
          'jr-edu-business-week__slot');
        chip.dataset.status=slot.status;
        chip.title=T(
          'این وضعیت صرفاً از زمان‌بندی داخلی سایت است؛ رزرو یا موجودی قطعی نیست.',
          'Owner-published internal availability only, not a confirmed reservation.');
        item.append(chip);
      }
      week.append(item);
    }
  }

  async function load(){
    if(!visible()||busy)return;
    const generation=++request;
    controller?.abort();controller=new AbortController();busy=true;
    reload.disabled=true;exportButton.disabled=true;exportRows=[];
    cards.replaceChildren();week.replaceChildren();
    status.textContent=T('در حال دریافت دفتر موجود سفارش‌ها و خدمات…',
      'Reading the established orders and service ledger…');
    try{
      // Independently read the already-existing OPTIONAL interest service.
      // No includeContacts flag is ever sent; the endpoint returns aggregates
      // only. A failed interest read never masks the commerce ledger.
      const [commerce,interests,consultation]=await Promise.allSettled([
        fetch('/api/admin/operations/commerce',{
          method:'GET',credentials:'same-origin',cache:'no-store',
          headers:{Accept:'application/json'},signal:controller.signal
        }).then(async response=>{
          if(!response.ok)throw Error('COMMERCE_ACCESS_OR_SCHEMA_UNAVAILABLE');
          return response.json();
        }),
        fetch('/api/admin/operations/education-interests',{
          method:'GET',credentials:'same-origin',cache:'no-store',
          headers:{Accept:'application/json'},signal:controller.signal
        }).then(async response=>response.ok?response.json():null),
        fetch('/api/commerce/consultation-week',{
          method:'GET',credentials:'same-origin',cache:'no-store',
          headers:{Accept:'application/json'},signal:controller.signal
        }).then(async response=>response.ok?response.json():null)
      ]);
      if(generation!==request||!visible())return;
      if(commerce.status!=='fulfilled')
        throw Error('COMMERCE_ACCESS_OR_SCHEMA_UNAVAILABLE');
      render(commerce.value,interests.status==='fulfilled'?interests.value:null);
      renderWeek(consultation.status==='fulfilled'?consultation.value:null);
    }catch(error){
      if(generation!==request||error?.name==='AbortError')return;
      cards.replaceChildren();week.replaceChildren();
      exportRows=[];exportButton.disabled=true;
      status.textContent=T(
        'وضعیت سفارش‌ها از پایگاه داده مادر قابل تأیید نیست. هیچ عدد صفر یا موفقیت ساختگی نمایش نمی‌دهیم.',
        'Commerce ledger is unavailable or not verified; unknown values will not be displayed as zero or success.');
    }finally{
      if(generation===request){controller=null;busy=false;reload.disabled=false;}
    }
  }
  exportButton.addEventListener('click',()=>{
    if(busy||!visible()||!exportRows.length)return;
    // This intentionally exports only the already-visible aggregate cards.
    // The source endpoints' private claim/order/customer data are excluded.
    const safeCell=value=>{
      const str=String(value).replace(/[\u0000-\u001f\u007f]/g,' ').slice(0,520);
      // Prevent spreadsheet formula interpretation even after opening in Excel.
      const safe=/^[=+\-@\t\r]/.test(str)?'\''+str:str;
      return '"'+safe.replace(/"/g,'""')+'"';
    };
    const headers=[
      T('شاخص','Metric'),T('مقدار مشاهده‌شده','Observed value'),
      T('محدودیت تفسیر','Interpretation limitation')
    ];
    const lines=[headers,...exportRows].map(row=>row.map(safeCell).join(','));
    lines.push([T('منبع','Source'),'existing_admin_commerce_and_education_interest',
      'INTERNAL_ONLY_NOT_A_BANK_SETTLEMENT_OR_VISITOR_CONVERSION'].map(safeCell).join(','));
    const blob=new Blob(['\uFEFF'+lines.join('\r\n')+'\r\n'],{
      type:'text/csv;charset=utf-8'
    });
    const objectUrl=URL.createObjectURL(blob);
    const link=document.createElement('a');
    link.href=objectUrl;link.hidden=true;
    link.download='jr-owner-education-commerce-aggregates-'+
      new Date().toISOString().slice(0,10)+'.csv';
    document.body.append(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(objectUrl),10000);
  });
  reload.addEventListener('click',load);
  mainButton.addEventListener('click',()=>{
    const commerce=document.getElementById('ops-commerce');
    if(!commerce||workspace.hidden)return;
    if(commerce.tagName==='DETAILS')commerce.open=true;
    commerce.scrollIntoView({block:'start',behavior:'auto'});
    commerce.querySelector('summary,button,a,[tabindex]')?.focus({preventScroll:true});
  });
  host.addEventListener('toggle',()=>{if(!host.open)reset();});
  const watcher=new MutationObserver(()=>{if(workspace.hidden)reset();});
  watcher.observe(workspace,{attributes:true,attributeFilter:['hidden']});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)reset();});
  window.addEventListener('pagehide',()=>{reset();watcher.disconnect();},{once:true});
})();
