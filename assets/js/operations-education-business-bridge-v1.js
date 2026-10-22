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
  const status=panel.querySelector('[data-jr-business-status]');
  const cards=panel.querySelector('[data-jr-business-cards]');
  if(!reload||!mainButton||!status||!cards)return;
  const n=new Intl.NumberFormat(fa?'fa-IR':'en-US');
  let controller=null,request=0,busy=false;
  const visible=()=>!workspace.hidden&&host.open&&!document.hidden;
  const text=(tag,value,cls)=>{
    const element=document.createElement(tag);
    element.textContent=String(value);
    if(cls)element.className=cls;
    return element;
  };
  function reset(){
    request++;controller?.abort();controller=null;busy=false;
    reload.disabled=false;cards.replaceChildren();
    status.textContent=T('برای مشاهده شواهد تجاری، دریافت اطلاعات را خودتان آغاز کنید.',
      'Request the private business evidence when needed.');
  }
  function card(title,value,explanation){
    const entry=document.createElement('article');
    entry.className='jr-edu-owner-command__card';
    entry.append(text('h4',title,'jr-edu-owner-command__title'));
    entry.append(text('strong',value,'jr-edu-owner-command__number'));
    entry.append(text('p',explanation,'jr-edu-owner-command__description'));
    cards.append(entry);
  }
  const count=value=>Number.isSafeInteger(value)&&value>=0?n.format(value):
    T('نامشخص','Unknown');
  function render(data){
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
    cards.replaceChildren();
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
    status.textContent=T(
      'این اعداد فقط از دفتر عملیاتی سایت استخراج شده‌اند. پیشنهادهای جدید آموزشی همچنان غیرقابل خرید هستند. ظرفیت مشاوره: ',
      'Figures are internal ledger observations. Educational proposals remain unpurchasable. Consultation capacity: ')+
      (ready?T('پنجره‌های داخلی موجود','internal windows configured'):
        T('داده معتبر در دسترس نیست','not available'))+'.';
  }
  async function load(){
    if(!visible()||busy)return;
    const generation=++request;
    controller?.abort();controller=new AbortController();busy=true;
    reload.disabled=true;cards.replaceChildren();
    status.textContent=T('در حال دریافت دفتر موجود سفارش‌ها و خدمات…',
      'Reading the established orders and service ledger…');
    try{
      const response=await fetch('/api/admin/operations/commerce',{
        method:'GET',credentials:'same-origin',cache:'no-store',
        headers:{Accept:'application/json'},
        signal:controller.signal
      });
      if(!response.ok)throw Error('OWNER_ACCESS_OR_SCHEMA_UNAVAILABLE');
      const data=await response.json();
      if(generation!==request||!visible())return;
      render(data);
    }catch(error){
      if(generation!==request||error?.name==='AbortError')return;
      cards.replaceChildren();
      status.textContent=T(
        'وضعیت سفارش‌ها از پایگاه داده مادر قابل تأیید نیست. هیچ عدد صفر یا موفقیت ساختگی نمایش نمی‌دهیم.',
        'Commerce ledger is unavailable or not verified; unknown values will not be displayed as zero or success.');
    }finally{
      if(generation===request){controller=null;busy=false;reload.disabled=false;}
    }
  }
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
