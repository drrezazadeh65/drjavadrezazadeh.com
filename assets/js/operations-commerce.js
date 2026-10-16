/* V5 owner commerce monitor; private no-store GET only, no payment initiation. */
(()=>{
  'use strict';
  const panel=document.getElementById('ops-commerce');
  if(!panel)return;
  const en=document.documentElement.lang==='en';
  const text=(fa,eng)=>en?eng:fa;
  const status=document.getElementById('ops-commerce-status');
  const results=document.getElementById('ops-commerce-results');
  const refresh=document.getElementById('ops-commerce-refresh');
  const workspace=document.getElementById('ops-workspace');
  const readiness=document.createElement('section');
  readiness.className='ops-grid';
  readiness.setAttribute('aria-label',text('آمادگی فعال‌سازی فروش','Commerce activation readiness'));
  status.after(readiness);
  let seq=0;
  function node(tag,value,cls){
    const n=document.createElement(tag);
    if(value!==undefined)n.textContent=String(value);
    if(cls)n.className=cls;
    return n;
  }
  function toman(value){
    if(value===null||value===undefined||!/^\d+$/.test(String(value)))
      return text('نامشخص','Unknown');
    try{return new Intl.NumberFormat(en?'en-GB':'fa-IR').format(BigInt(String(value)))+
      text(' تومان',' toman');}
    catch{return text('نامشخص','Unknown');}
  }
  const NEXT_SERVICE_STATE={
    awaiting_contact:'scheduling',scheduling:'booked',booked:'in_progress'
  };
  const MODE_LABELS={
    PHONE:text('تلفنی','Telephone'),
    VOICE:text('تماس صوتی آنلاین','Online voice call'),
    VIDEO:text('آنلاین تصویری','Online video'),
    IN_PERSON:text('حضوری ویژه','In person (eligible VIP)')
  };
  const CITY_LABELS={
    TEHRAN:text('تهران','Tehran'),
    KASHAN:text('کاشان','Kashan')
  };
  const timezone=Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC';
  function utcLabel(value){
    if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value))return null;
    const d=new Date(value.replace(' ','T')+'Z');
    if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,19)!==value.replace(' ','T'))return null;
    return new Intl.DateTimeFormat(en?'en-GB':'fa-IR',
      {dateStyle:'medium',timeStyle:'short',timeZone:timezone}).format(d);
  }
  function bookingField(label){
    const wrapper=node('label',label,'ops-muted');
    const input=document.createElement('input');
    input.type='datetime-local';input.step='60';input.required=true;
    wrapper.append(input);
    return {wrapper,input};
  }
  function bookingUtc(input){
    if(!input.value)return null;
    const parsed=new Date(input.value);
    if(!Number.isFinite(parsed.getTime()))return null;
    return parsed.toISOString().replace('T',' ').slice(0,19);
  }
  async function advanceService(entry,button,begin,end){
    if(workspace.hidden||!panel.open||document.hidden)return;
    const next=NEXT_SERVICE_STATE[entry.status];
    if(!next||entry.orderPaidState!==true||entry.providerClaimMatchesOrder!==true)return;
    // UI reflects server authority; it never overrides missing buyer consent.
    if(next==='booked'&&(entry.customerPreferenceRecorded!==true||
       !Object.hasOwn(MODE_LABELS,String(entry.deliveryMode||'')))){
      status.textContent=text('ابتدا مشتری باید روش جلسه را در حساب خود ثبت کند.',
        'The buyer must choose a valid session format in their account before booking.');
      return;
    }
    const bookingStart=next==='booked'?bookingUtc(begin):null;
    const bookingEnd=next==='booked'?bookingUtc(end):null;
    if(next==='booked'&&(!bookingStart||!bookingEnd||
      new Date(bookingEnd.replace(' ','T')+'Z')<=new Date(bookingStart.replace(' ','T')+'Z'))){
      status.textContent=text('بازه زمان معتبر را وارد کنید.','Enter a valid booking time window.');
      return;
    }
    if(!window.confirm(text(
       'تأیید تغییر وضعیت خدمت '+String(entry.sku||'')+' از '+String(entry.status)+' به '+next+'؟ ظرفیت تقویم خارجی، اطلاع‌رسانی به خریدار، تحویل خدمت و تسویه بانکی با این اقدام تأیید نمی‌شوند.',
       'Confirm '+String(entry.sku||'')+' transition from '+String(entry.status)+' to '+next+'? This does not verify external availability, customer notification, service delivery or bank settlement.'
    )))return;
    const stamp=seq;
    button.disabled=true;
    status.textContent=text('در حال ثبت کنترل‌شده وضعیت خدمت…','Submitting authorised service update…');
    try{
      const session=await fetch('/api/admin/operations/session',{
        method:'GET',credentials:'same-origin',cache:'no-store'
      });
      if(!session.ok)throw Error('authorization');
      const mfa=await session.json();
      if(stamp!==seq||workspace.hidden||!panel.open||document.hidden)return;
      if(mfa.ok!==true||mfa.mfaRequired===true||
        !/^[a-f0-9]{64}$/i.test(String(mfa.csrfToken||'')))throw Error('authorization');
      const response=await fetch('/api/admin/operations/commerce/service-advance',{
        method:'POST',credentials:'same-origin',cache:'no-store',
        headers:{'Content-Type':'application/json','X-CSRF-Token':mfa.csrfToken},
        body:JSON.stringify({orderId:entry.orderId,sku:entry.sku,
          expectedState:entry.status,nextState:next,
          bookingStart,bookingEnd})
      });
      const result=await response.json();
      if(stamp!==seq||workspace.hidden||!panel.open||document.hidden)return;
      if(!response.ok||result?.ok!==true||
        result?.schema!=='commerce-service-transition-v1')throw Error('conflict');
      await load(); // Refresh private, current state after the server commits.
    }catch(_error){
      if(stamp===seq&&!workspace.hidden&&panel.open){
        status.textContent=text('ثبت انجام نشد یا اعتبار مدیر منقضی شده است. وضعیت قبلی را بررسی و گزارش را تازه‌سازی کنید.',
          'No confirmed change. Verify MFA, payment evidence and current state, then refresh.');
      }
    }finally{
      if(stamp===seq)button.disabled=false;
    }
  }
  function card(label,value,detail){
    const n=node('article',undefined,'ops-card');
    n.append(node('small',label),node('div',value??text('نامشخص','Unknown'),'ops-number'));
    if(detail)n.append(node('p',detail,'ops-muted'));
    results.append(n);
  }

  // Translate Tehran wall-clock selections to UTC using the IANA zone, never
  // the administrator's device time zone or a fixed offset.
  function tehranWallToUtc(day,time){
    const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(day||'');
    const tm=/^(\d{2}):00$/.exec(time||'');
    if(!match||!tm)return null;
    const year=Number(match[1]),month=Number(match[2]),date=Number(match[3]),hour=Number(tm[1]);
    if(hour>23)return null;
    const target=Date.UTC(year,month-1,date,hour,0,0);
    if(!Number.isFinite(target))return null;
    const f=new Intl.DateTimeFormat('en-GB',{
      timeZone:'Asia/Tehran',year:'numeric',month:'2-digit',
      day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'
    });
    const wall=t=>{
      const bits=f.formatToParts(new Date(t)),part=n=>bits.find(x=>x.type===n)?.value;
      return [Number(part('year')),Number(part('month')),Number(part('day')),
        Number(part('hour')),Number(part('minute'))];
    };
    let guess=target;
    for(let attempt=0;attempt<3;attempt++){
      const [y,m,d,h,min]=wall(guess);
      guess+=target-Date.UTC(y,m-1,d,h,min,0);
    }
    const [y,m,d,h,min]=wall(guess);
    if(y!==year||m!==month||d!==date||h!==hour||min!==0)return null;
    return guess;
  }
  async function changeAvailability(action,windowId,startUtc,endUtc,submit){
    if(workspace.hidden||!panel.open||document.hidden)return;
    const stamp=seq;
    if(!window.confirm(action==='open'
      ?text('این ساعت‌ها واقعاً در برنامه شما قابل ارائه‌اند و برای درخواست عمومی منتشر شوند؟',
        'Publish these genuinely available internal hours for public requests?')
      :text('این بازه از تقویم درخواست برداشته شود؟ رزرو موجود در سرور محافظت می‌شود.',
        'Close this published window? Existing bookings remain protected by the server.')))return;
    submit.disabled=true;
    status.textContent=text('در حال اعمال تغییر ظرفیت با تأیید سرور…',
      'Authorising and updating published capacity…');
    try{
      const response=await fetch('/api/admin/operations/session',{
        method:'GET',credentials:'same-origin',cache:'no-store'
      });
      if(!response.ok)throw Error('owner_auth_required');
      const auth=await response.json();
      if(stamp!==seq||workspace.hidden||!panel.open||document.hidden)return;
      if(auth.ok!==true||auth.mfaRequired!==false||
        !/^[a-f0-9]{64}$/i.test(String(auth.csrfToken||'')))throw Error('owner_mfa_required');
      const changed=await fetch('/api/admin/operations/commerce/availability',{
        method:'POST',credentials:'same-origin',cache:'no-store',
        headers:{'Content-Type':'application/json','Accept':'application/json',
          'X-CSRF-Token':auth.csrfToken},
        body:JSON.stringify({action,windowId,startUtc,endUtc})
      });
      const result=await changed.json();
      if(stamp!==seq||workspace.hidden||!panel.open||document.hidden)return;
      if(!changed.ok||result?.ok!==true||
        result?.schema!=='commerce-consultation-capacity-v1')
        throw Error('capacity_not_confirmed');
      await load();
    }catch{
      if(stamp===seq&&!workspace.hidden&&panel.open)
        status.textContent=text('تغییر ظرفیت تأیید نشد. احراز هویت دومرحله‌ای، سقف چهار ساعت هر روز و تداخل ساعات را بررسی کنید.',
        'Capacity change not confirmed. Check MFA, the four-hour daily limit and overlaps.');
    }finally{if(stamp===seq)submit.disabled=false;}
  }
  function renderCapacity(capacity){
    const wrapper=node('details');wrapper.className='ops-calendar ops-capacity';
    wrapper.append(node('summary',text('تنظیم ظرفیت هفتگی مشاوره',
      'Manage published consultation hours')));
    const note=node('p',text(
      'برای هر روز فقط ساعت‌هایی را منتشر کنید که خودتان واقعاً برای مشاوره اختصاص داده‌اید؛ جمع زمان‌های منتشرشده هر روز حداکثر چهار ساعت است. ساعت ورودی به وقت تهران است. خریدار با انتخاب ساعت رزرو قطعی نمی‌کند؛ تداخل در سمت سرور دوباره کنترل می‌شود.',
      'Publish only genuinely reserved consulting hours (at most four hours per Tehran day). Times entered here use Tehran time. A visitor request is not a reservation; the server rechecks overlaps.'),'ops-muted');
    wrapper.append(note);
    if(capacity?.schemaReady!==true){
      wrapper.append(node('p',text(
        'جدول ظرفیت در پایگاه‌داده برتینا تأیید نشده است؛ انتشار ساعت فعلاً غیرفعال است.',
        'The Bertina capacity table is not verified; publishing hours is disabled.'
      ),'ops-muted'));
      results.append(wrapper);return;
    }
    const editor=node('div',undefined,'ops-capacity-editor');
    const label=(caption,type)=>{
      const container=node('label',caption,'ops-muted');
      const input=document.createElement('input');input.type=type;
      container.append(input);editor.append(container);
      return input;
    };
    const date=label(text('تاریخ روز (تقویم میلادی)','Date (Gregorian)'),'date');
    const start=label(text('ساعت شروع، به وقت تهران','Start hour, Tehran'),'time');
    // Owner preference: 17:00–18:00 Tehran is a draft, not auto-published.
    start.step='3600';start.value='17:00';
    const lengthLabel=node('label',text('ساعت قابل انتشار در این روز','Hours to publish on this day'),'ops-muted');
    const duration=document.createElement('select');
    for(const hours of [1,2,3,4]){
      const option=document.createElement('option');option.value=String(hours);
      option.textContent=String(hours)+text(' ساعت',' hours');duration.append(option);
    }
    duration.value='1';lengthLabel.append(duration);editor.append(lengthLabel);
    const hourPreset=node('button',text('انتخاب ساعت ۱۷ تا ۱۸','Select 17:00–18:00'),'button');
    hourPreset.type='button';
    hourPreset.dataset.consultationEveningPreset='1700-1800';
    hourPreset.addEventListener('click',()=>{
      // Preserve the owner's selected Gregorian day; require a separate save.
      start.value='17:00';duration.value='1';
      status.textContent=text(
        'بازهٔ ۱۷ تا ۱۸ به وقت تهران انتخاب شد. روز موردنظر را مشخص و انتشار را جداگانه تأیید کنید؛ هنوز ساعتی منتشر نشده است.',
        '17:00–18:00 Tehran time selected. Choose a date and confirm publication separately; no hour has been published.'
      );
    });
    editor.append(hourPreset);
    const publish=node('button',text('انتشار این بازه','Publish genuine capacity'),'button');
    publish.type='button';editor.append(publish);
    const hint=node('p',text(
      'برای روزهای مختلف، جداگانه بازه ثبت کنید: مثلاً شنبه دو ساعت، یکشنبه چهار ساعت. امکان افزودن بازه دوم به همان روز فقط تا سقف چهار ساعت وجود دارد.',
      'Set each day independently, for example two hours Saturday and four Sunday. A second window is allowed only within the four-hour daily maximum.'),'ops-muted');
    editor.append(hint);
    // A seven-day planner is an owner convenience only: choosing a day fills
    // the editor; NOTHING is published before explicit owner confirmation.
    const planner=node('section',undefined,'ops-week-planner');
    planner.append(node('h4',text('برنامهٔ هفت روز آینده','Next seven days')));
    planner.append(node('p',text(
      'برای هر روز فقط زمان‌های واقعاً قابل ارائه را منتشر کنید؛ آمار زیر ساعات منتشرشده است، نه تعداد مشتریان یا رزروهای واقعی.',
      'Publish only actual consulting hours. Counts below are owner-published hours, not purchases, bookings or live external availability.'),'ops-muted'));
    const weekGrid=node('div',undefined,'ops-week-grid');
    const zoneParts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Tehran',
      year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
    const part=key=>Number(zoneParts.find(p=>p.type===key)?.value);
    const year=part('year'),month=part('month'),day=part('day');
    const midnight=Date.UTC(year,month-1,day);
    const goodWindows=Array.isArray(capacity.windows)&&capacity.truncated!==true;
    for(let i=0;i<7;i++){
      const utcDay=new Date(midnight+i*86400000);
      const key=utcDay.toISOString().slice(0,10);
      const nextKey=new Date(midnight+(i+1)*86400000).toISOString().slice(0,10);
      const dayName=new Intl.DateTimeFormat(en?'en-GB':'fa-IR',
        {timeZone:'UTC',weekday:'long',day:'numeric',month:'long'}).format(utcDay);
      const card=node('div',undefined,'ops-week-day');
      card.append(node('strong',dayName));
      const begin=tehranWallToUtc(key,'00:00');
      const end=tehranWallToUtc(nextKey,'00:00');
      if(goodWindows&&begin!==null&&end!==null){
        const count=capacity.windows.reduce((total,w)=>{
          const start=utcLabel(w?.startUtc)?new Date(w.startUtc.replace(' ','T')+'Z').getTime():NaN;
          const finish=utcLabel(w?.endUtc)?new Date(w.endUtc.replace(' ','T')+'Z').getTime():NaN;
          if(!Number.isFinite(start)||!Number.isFinite(finish))return total;
          return total+Math.max(0,Math.min(finish,end)-Math.max(start,begin));
        },0)/3600000;
        card.append(node('p',text('ساعت منتشرشده: ','Published hours: ')+
          String(Math.round(count*100)/100)+' / 4','ops-muted'));
      }else card.append(node('p',text('آمار این روز قابل تأیید نیست',
        'Daily published hours unverified'),'ops-muted'));
      const selectDay=node('button',text('تنظیم ساعت این روز','Set hours for this day'),'button');
      selectDay.type='button';
      selectDay.addEventListener('click',()=>{
        date.value=key;date.focus();
        editor.scrollIntoView({behavior:'smooth',block:'nearest'});
      });
      card.append(selectDay);weekGrid.append(card);
    }
    planner.append(weekGrid);wrapper.append(planner,editor);
    publish.addEventListener('click',()=>{
      const t=tehranWallToUtc(date.value,start.value);
      const hours=Number(duration.value);
      if(t===null||!Number.isInteger(hours)||hours<1||hours>4){
        status.textContent=text('تاریخ و ساعت شروع معتبر و کامل انتخاب کنید.',
          'Choose a valid Tehran date and whole-hour start time.');return;
      }
      const from=new Date(t).toISOString().slice(0,19).replace('T',' ');
      const to=new Date(t+hours*3600000).toISOString().slice(0,19).replace('T',' ');
      changeAvailability('open',null,from,to,publish);
    });
    const list=node('ul',undefined,'ops-queue');
    const windows=Array.isArray(capacity.windows)?capacity.windows:[];
    for(const w of windows.slice(0,100)){
      if(typeof w?.id!=='string'||typeof w.startUtc!=='string'||typeof w.endUtc!=='string')continue;
      const a=utcLabel(w.startUtc),b=utcLabel(w.endUtc);
      if(!a||!b)continue;
      const item=node('li');item.append(node('span',a+' – '+b));
      const close=node('button',text('بستن ظرفیت','Close window'),'button');
      close.type='button';
      close.addEventListener('click',()=>changeAvailability('close',w.id,null,null,close));
      item.append(close);list.append(item);
    }
    wrapper.append(node('p',text(
      'بازه‌های آیندهٔ منتشرشده: ','Published upcoming windows: ')+
      String(capacity.openWindowCount??'—'),'ops-muted'));
    if(capacity.truncated===true)wrapper.append(node('p',text(
      'فهرست خلاصه است؛ تا بررسی همه ساعت‌ها، از بازنویسی برنامه خودداری کنید.',
      'List is truncated; review all published hours before changing the programme.'),'ops-muted'));
    if(list.childElementCount)wrapper.append(list);
    else wrapper.append(node('p',text('هنوز ساعتی منتشر نشده است.',
      'No hours have been published.'),'ops-muted'));
    results.append(wrapper);
  }

  function present(data){
    results.replaceChildren();
    if(!data.available){
      status.textContent=text(
        'داده‌های ساختار مرحلهٔ ۹ هنوز از سرور قابل تأیید نیستند؛ نبود داده به معنای صفر سفارش نیست.',
        'Stage 9 database data is unavailable; unknown is not zero orders.');
      return;
    }
    const orders=data.orders||{},claims=data.claims||{},stock=data.stock||{},
      notices=data.notifications||{},fulfilment=data.fulfilment||{};
    card(text('سفارش‌های معلق','Pending orders'),orders.pendingRecords);
    card(text('ردیف‌های پرداخت‌شده','Paid-state records'),orders.paidStateRecords,
      text('تسویهٔ بانکی از این تعداد قابل استنتاج نیست.','This does not prove bank settlement.'));
    const giving=data.donations||null;
    if(giving&&giving.scope==='all_time_internal_donation_ledger'){
      const h=node('h3',text('حمایت مالی تحصیلی — گزارش مستقل','Student support — separate ledger'));
      h.style.gridColumn='1 / -1';results.append(h);
      card(text('کمک‌های در انتظار پرداخت (تمام سوابق)','Pending donations (all time)'),giving.pendingOrders);
      card(text('کمک‌های دارای وضعیت پرداخت‌شده (تمام سوابق)','Paid-state donations (all time)'),giving.paidStateOrders);
      card(text('کمک‌های تطبیق‌یافته با سند درگاه (تمام سوابق)','Provider-claim-matched donations (all time)'),giving.claimMatchedOrders);
      card(text('مبلغ کمک‌های تطبیق‌یافته با درگاه (تمام سوابق)','Provider-claim-matched donation value (all time)'),
        toman(giving.claimMatchedAmountToman),
        text('صرفاً شواهد داخلی؛ تسویه بانکی و تخصیص کمک تأیید نشده است.',
          'Internal evidence only; bank settlement and allocation are not verified.'));
    }
    const sales=data.salesPipeline||null;
    if(sales && sales.status==='INTERNAL_ORDER_LEDGER_ONLY'){
      const heading=node('h3',text('مسیر فروش و پیگیری درآمد','Sales pipeline and revenue follow-up'));
      heading.style.gridColumn='1 / -1';results.append(heading);
      card(text('ارزش سفارش‌های دارای وضعیت پرداخت‌شده','Paid-state order value'),
        toman(sales.paidStateAmountToman),
        text('جمع ثبت داخلی، نه مبلغ تسویه بانکی.','Internal ledger total, not bank-settled revenue.'));
      card(text('ارزش دارای تطبیق ادعای درگاه','Provider-claim-matched order value'),
        toman(sales.providerClaimMatchedAmountToman),
        text('تطبیق فنی درگاه؛ تسویه بانکی همچنان نامشخص است.',
          'Gateway claim match only; bank settlement remains unverified.'));
      card(text('ارزش ۳۰ روز اخیر با وضعیت پرداخت‌شده','Last 30 days paid-state order value'),
        toman(sales.paidStateAmountLast30DaysToman),
        text('مبنای تاریخ پرداخت ثبت‌شده، نه رسید بانکی.',
          'Based on recorded paid date, not bank statements.'));
      card(text('سفارش‌های دارای وضعیت پرداخت‌شده در ۳۰ روز','Paid-state orders in 30 days'),
        sales.paidStateOrdersLast30Days);
      card(text('پرداخت‌های معلق بیش از ۲۴ ساعت','Pending payments older than 24 hours'),
        sales.pendingOlderThan24Hours,
        text('برای بررسی فنی؛ مجوز ارسال پیام بازاریابی نیست.',
          'Operational review only; not permission for marketing outreach.'));
      card(text('پرداخت‌های معلق بیش از ۷ روز','Pending payments older than 7 days'),
        sales.pendingOlderThan7Days);
      card(text('سفارش‌های ایجادشده بیش از ۲۴ ساعت','Unpaid created orders older than 24 hours'),
        sales.createdOlderThan24Hours);
      card(text('درخواست‌های بازپرداخت نیازمند اقدام','Refund requests awaiting action'),
        sales.refundRequestsAwaitingAction,
        text('وضعیت درخواست، دلیل بر بازگشت وجه نیست.',
          'A refund request status is not evidence of a bank disbursement.'));
    }
    card(text('پرداخت‌های نیازمند تطبیق مستقل','Paid records requiring review'),
      claims.paidRowsRequiringIndependentProviderReconciliation);
    card(text('مغایرت دفتر رزرو کتاب','Book reservation ledger discrepancies'),
      stock.ledgerDiscrepancies);
    card(text('موجودی‌های فاقد تاریخ تطبیق','Stock rows without reconciliation date'),
      stock.rowsWithoutReconciliationTimestamp);
    card(text('رسیدهای ایمیلی فاقد زمان ثبت‌شده','Receipts without recorded email timestamp'),
      notices.paidOrderRowsWithoutReceiptEmailTimestamp);
    const orderStates=orders.states||{},outbox=notices.outboxStates||{},
      service=fulfilment.serviceCaseStates||{},parcels=fulfilment.parcelStates||{};
    card(text('کل سفارش‌های ثبت‌شده','Recorded order rows'),orders.totalRows);
    card(text('اعلان‌های در انتظار یا نامطمئن','Pending / failed outbox events'),
      (outbox.pending||0)+(outbox.failed||0)+(outbox.processing||0),
      text('ارسال واقعی ایمیل جداگانه بررسی می‌شود.','Actual email delivery requires separate verification.'));
    card(text('پرونده‌های خدمات در انتظار تماس','Service cases awaiting contact'),
      service.awaiting_contact??0);
    card(text('پرونده‌های فعال نیازمند پیگیری','Active service cases awaiting action'),
      fulfilment.activeServiceCaseCount??null);
    if(fulfilment.customerPreferenceSchemaReady===false){
      card(text('وضعیت انتخاب روش مشاوره','Consultation preference availability'),
        text('جداول انتخاب روش قابل تأیید نیستند','Preference database not verified'),
        text('تا تأیید ساختار دیتابیس، ثبت نوبت جدید مجاز نیست.',
          'New appointment booking is not permitted until the schema is verified.'));
    }
    card(text('مرسوله‌های در حال آماده‌سازی','Parcels being prepared'),
      parcels.preparing??0);
    card(text('مرسوله‌های دارای وضعیت باز','Open parcel fulfilment records'),
      fulfilment.activeParcelCount??null,
      text('این تعداد به معنای ارسال یا تحویل تأییدشده نیست.',
        'Open records do not prove shipping or delivery.'));
    card(text('مرسوله‌های آماده‌سازی معطل بیش از ۴۸ ساعت','Parcels preparing for over 48 hours'),
      fulfilment.preparingOlderThan48Hours??null,
      text('نیازمند بررسی کارشناس ارسال، بدون اعلان خودکار به مشتری.',
        'Dispatch follow-up only; no automatic customer notification.'));
    card(text('مرسوله‌های ارسال‌شده با عدم تغییر وضعیت بیش از ۷ روز',
      'Dispatched / in-transit records unchanged for over 7 days'),
      fulfilment.inShippingOlderThan7Days??null);
    if(Array.isArray(fulfilment.parcelActionQueue)&&fulfilment.parcelActionQueue.length){
      const detail=node('details');
      detail.append(node('summary',text('فهرست مرسوله‌های نیازمند پیگیری',
        'View pending parcel fulfilment worklist')));
      detail.append(node('p',text(
        'شناسه سفارش و وضعیت ثبت‌شده فقط برای مدیر است. نشانی، کد رهگیری و اطلاعات خریدار نمایش داده نمی‌شوند؛ تطبیق فنی درگاه تسویه بانکی را اثبات نمی‌کند.',
        'Order identifiers and ledger status are owner-only. No delivery address, tracking code or customer data is shown; provider claim equality does not prove settlement.'
      ),'ops-muted'));
      if(fulfilment.parcelQueueTruncated)detail.append(node('p',text(
        'فقط ۵۰ مورد با قدیمی‌ترین زمان به‌روزرسانی نمایش داده شده است.',
        'Only the 50 least recently updated parcels are shown.'
      ),'ops-muted'));
      const list=node('ul',undefined,'ops-queue');
      list.style.maxHeight='20rem';list.style.overflowY='auto';
      for(const entry of fulfilment.parcelActionQueue){
        const item=node('li');
        const id=String(entry.orderId||'').slice(0,8);
        const match=entry.providerClaimMatchesOrder===true?
          text('ادعای پرداخت تطبیق دارد؛ تسویه نامشخص',
               'Provider claim matches; settlement unknown'):
          text('نیازمند بررسی مستقل اصالت پرداخت',
               'Independent payment evidence review required');
        item.append(node('span',id+'… · '+String(entry.state||'')+
          ' · '+String(entry.updatedAt||'')+' · '+match));
        list.append(item);
      }
      detail.append(list);results.append(detail);
    }
    if(fulfilment.internalAvailability)renderCapacity(fulfilment.internalAvailability);
    const calendar=fulfilment.internalCalendar||null;
    if(calendar && Array.isArray(calendar.windows)){
      const calendarSection=node('details');
      calendarSection.className='ops-calendar';
      calendarSection.append(node('summary',
        text('تقویم داخلی نوبت‌های ثبت‌شده ('+String(calendar.totalUpcoming??'?')+')',
          'Internal confirmed appointment windows ('+String(calendar.totalUpcoming??'?')+')')));
      calendarSection.append(node('p',text(
        'زمان‌ها براساس منطقه زمانی مرورگر شما ('+timezone+') نمایش داده می‌شوند. این فقط نوبت‌های ثبت‌شده در سامانه داخلی است؛ همگام‌سازی با تقویم خارجی یا اعلام ظرفیت انجام نشده است.',
        'Times use your browser time zone ('+timezone+'). This is the internal booked-case ledger only; no external calendar sync or availability claim.'),'ops-muted'));
      if(calendar.truncated===true)calendarSection.append(node('p',text(
        'فقط صد نوبت اول نمایش داده شده‌اند؛ برای ثبت زمان، کنترل قطعی تداخل در سرور انجام می‌شود.',
        'Only the first 100 windows are visible; the server makes the final conflict decision.'),'ops-muted'));
      const calList=node('ul',undefined,'ops-queue');
      for(const w of calendar.windows.slice(0,100)){
        if(!['booked','in_progress'].includes(w?.state))continue;
        const a=utcLabel(w.startUtc),b=utcLabel(w.endUtc);
        if(a&&b)calList.append(node('li',
          a+' – '+b+' · '+(w.state==='booked'?
           text('رزرو قطعی داخلی','Internally booked'):
           text('خدمت در حال ارائه','Service in progress'))));
      }
      if(calList.childElementCount)calendarSection.append(calList);
      else calendarSection.append(node('p',text(
        'نوبت آینده‌ای در دفتر داخلی نمایش داده نمی‌شود؛ این به معنای آزادبودن قطعی زمان نیست.',
        'No upcoming internal window is shown; this does not confirm an available slot.'),'ops-muted'));
      results.append(calendarSection);
    }
    if(Array.isArray(fulfilment.serviceActionQueue)&&fulfilment.serviceActionQueue.length){
      const detail=node('details'),label=node('summary',
        text('مشاهدهٔ فهرست پرونده‌های قابل پیگیری','View service fulfilment worklist'));
      detail.className='ops-service-queue';
      detail.append(label);
      const note=node('p',text(
        'شناسه‌ها فقط ارجاع داخلی مدیر هستند؛ تطبیق درگاه با سفارش به معنای تسویهٔ بانکی یا ارائهٔ خدمت نیست.',
        'Internal case references only. Matching payment claims does not prove bank settlement or service delivery. Owner-only progress actions require fresh MFA and never mark delivery.'),'ops-muted');
      detail.append(note);
      if(fulfilment.queueTruncated)detail.append(node('p',text(
        'فقط ۵۰ پروندهٔ قدیمی‌تر نشان داده شده‌اند؛ برای باقی پرونده‌ها گزارش بعدی لازم است.',
        'Only the oldest 50 cases are shown; further cases require a separate review.'),'ops-muted'));
      const list=node('ul',undefined,'ops-queue');
      list.style.maxHeight='20rem';list.style.overflowY='auto';
      for(const entry of fulfilment.serviceActionQueue){
        const item=node('li');
        const id=String(entry.orderId||'').slice(0,8);
        const claim=entry.providerClaimMatchesOrder===true?
          text('تطبیق ثبت داخلی: دارد؛ تسویه نامشخص','Internal claim matches; settlement unknown'):
          text('نیازمند بررسی اصالت پرداخت','Payment evidence needs review');
        item.append(node('span',String(entry.sku||'')+' · '+String(entry.status||'')+
          ' · '+id+'… · '+claim));
        if(Object.hasOwn(MODE_LABELS,String(entry.deliveryMode||'')) &&
           entry.customerPreferenceRecorded===true){
          const mode=MODE_LABELS[entry.deliveryMode];
          const city=entry.deliveryMode==='IN_PERSON'&&Object.hasOwn(CITY_LABELS,entry.meetingCity)
            ?' · '+CITY_LABELS[entry.meetingCity]:'';
          item.append(node('p',text('انتخاب ثبت‌شده خریدار: ','Buyer-selected format: ')+mode+city,'ops-muted'));
        }else if(entry.status==='awaiting_contact'||entry.status==='scheduling'){
          item.append(node('p',text(
            'روش جلسه توسط مشتری ثبت یا تأیید نشده؛ ثبت زمان مجاز نیست.',
            'Buyer format is absent or unverified; a booking cannot be made.'),'ops-muted'));
        }
        if(entry.bookingStart&&entry.bookingEnd){
          const a=utcLabel(entry.bookingStart),b=utcLabel(entry.bookingEnd);
          if(a&&b)item.append(node('p',text('نوبت داخلی: ','Internal booking: ')+a+' – '+b,'ops-muted'));
        }
        const next=NEXT_SERVICE_STATE[entry.status];
        if(next && entry.orderPaidState===true && entry.providerClaimMatchesOrder===true
          && (next!=='booked'||entry.customerPreferenceRecorded===true)){
          const action=node('button',text('ثبت مرحله: ','Advance to: ')+next);
          action.type='button';action.className='button';
          let begin=null,end=null;
          if(next==='booked'){
            item.append(node('small',text('منطقه زمانی مرورگر: ','Browser timezone: ')+timezone));
            const start=bookingField(text('شروع جلسه (زمان محلی)','Start (local time)'));
            const finish=bookingField(text('پایان جلسه (زمان محلی)','End (local time)'));
            item.append(start.wrapper,finish.wrapper);
            begin=start.input;end=finish.input;
          }
          item.append(action);
          action.addEventListener('click',()=>advanceService(entry,action,begin,end));
        }
        list.append(item);
      }
      detail.append(list);results.append(detail);
    }
    for(const row of stock.rows||[]){
      const drift=row.ledgerDiscrepancy;
      card(row.sku,
        text('موجودی ثبت‌شده: ','Recorded available: ')+row.availableRecorded,
        text('رزرو ثبت‌شده: ','Stock holds: ')+row.reservedRecorded+
        text('؛ رزروهای واقعی: ','; ledger units: ')+row.reservationUnitsHeld+
        (drift?text('؛ مغایرت نیازمند بررسی','; DISCREPANCY NEEDS REVIEW'):''));
    }
    status.textContent=text(
      'گزارش فقط‌خواندنی پایگاه داده؛ هیچ پرداخت، تسویه، شمارش فیزیکی یا تحویلی از این اعداد تأیید نمی‌شود.',
      'Read-only database report. These counts do not certify payment settlement, physical inventory or delivery.');
  }
  // Capability diagnostics are public booleans from the canonical API, not
  // an attempted payment, a secret dump or a verified bank transaction.
  async function loadReadiness(stamp){
    try{
      const response=await fetch('/api/commerce/health',{
        method:'GET',credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}
      });
      const data=await response.json();
      if(stamp!==seq||workspace.hidden||!panel.open||document.hidden)return;
      if(!response.ok||data.ok!==true||data.service!=='commerce'||typeof data.checkout!=='boolean'
        ||!data.requirements||!data.capabilities)throw new Error('unavailable');
      readiness.replaceChildren();
      const title=node('h3',text('وضعیت فعال‌سازی فروش واقعی','Live checkout activation readiness'));
      title.style.gridColumn='1 / -1';readiness.append(title);
      const state=ok=>ok===true?text('آماده (طبق API)','Ready (API)'):ok===false?
        text('مسدود / غیرفعال','Blocked / disabled'):text('نامشخص','Unknown');
      const add=(label,value)=>{const c=node('article',undefined,'ops-card');
        c.append(node('small',label),node('div',state(value),'ops-number'));readiness.append(c);};
      add(text('دریافت پرداخت','Checkout'),data.checkout);
      const caps=data.capabilities;
      add(text('فروش خدمات','Services checkout'),caps.services);
      add(text('فروش خدمات ویژه','VIP checkout'),caps.vip);
      add(text('فروش کتاب','Books checkout'),caps.books);
      const flags=[
        ['database',text('اتصال دیتابیس','Database')],
        ['schema',text('جداول سفارش','Commerce schema')],
        ['paymentClaimSchemaReady',text('ساختار امن پرداخت','Payment integrity schema')],
        ['publicTlsConfirmed',text('گواهی و TLS عمومی','Public TLS')],
        ['commerceEnabled',text('فعال‌سازی فروش در سرور','Server commerce switch')],
        ['gatewayKeyConfigured',text('پیکربندی کلید درگاه','Payment gateway key configured')],
        ['amountMultiplierValid',text('واحد مبلغ درگاه','Payment amount unit')],
        ['orderEmailFulfilmentConfirmed',text('ارسال و پیگیری سفارش','Order email and fulfilment')],
        ['inventoryReconciled',text('دفتر موجودی کتاب','Book inventory ledger')],
        ['bookShippingConfirmed',text('آمادگی ارسال کتاب','Book shipping')],
        ['serviceBookingConfirmed',text('آمادگی ارائه خدمات','Service booking')],
        ['vipBookingConfirmed',text('آمادگی خدمات ویژه','VIP booking')],
        ['receiptAccessReady',text('دسترسی امن رسید','Secure receipt access')]
      ];
      const blockers=flags.filter(([key])=>data.requirements[key]===false);
      if(blockers.length){
        const detail=node('details');detail.style.gridColumn='1 / -1';
        detail.append(node('summary',text('موانع و تنظیمات نیازمند بررسی','Checkout prerequisites requiring review')));
        const list=node('ul');
        for(const [key,label] of blockers)list.append(node('li',label));
        detail.append(list);readiness.append(detail);
      }
      const note=node('p',text(
        'این وضعیت از API سایت خوانده شده است؛ «آماده» به معنای موفقیت پرداخت آزمایشی، تسویه بانکی یا تحویل واقعی نیست.',
        'These are server API flags, not a verified test payment, bank settlement or fulfilment.'),'ops-muted');
      note.style.gridColumn='1 / -1';readiness.append(note);
    }catch{
      if(stamp!==seq||workspace.hidden||!panel.open||document.hidden)return;
      readiness.replaceChildren(node('p',text(
        'آمادگی فروش از API قابل تأیید نیست؛ فعال‌بودن درگاه را فرض نکنید.',
        'Commerce readiness API unavailable; checkout activation is unverified.'),'ops-muted'));
    }
  }
  async function load(){
    if(workspace.hidden||!panel.open)return;
    const stamp=++seq;refresh.disabled=true;
    readiness.replaceChildren();
    void loadReadiness(stamp);
    status.textContent=text('در حال دریافت شواهد سرور…','Reading server evidence…');
    try{
      const response=await fetch('/api/admin/operations/commerce',{
        method:'GET',credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}
      });
      const data=await response.json();
      // A request may finish after the owner closes the panel or TOTP expires.
      // Never paint old protected order references back into a locked DOM.
      if(stamp!==seq||workspace.hidden||!panel.open)return;
      if(!response.ok||data.ok!==true||data.schema!=='operations-commerce-evidence-v1')
        throw new Error('unauthorized_or_unavailable');
      present(data);
    }catch{
      if(stamp!==seq||workspace.hidden||!panel.open)return;
      results.replaceChildren();
      status.textContent=text('دسترسی دومرحله‌ای منقضی شده یا گزارش قابل دریافت نیست؛ هیچ عددی فرض نشد.',
        'MFA access expired or evidence is unavailable. No counts were assumed.');
    }finally{if(stamp===seq)refresh.disabled=false;}
  }
  panel.addEventListener('toggle',()=>{if(panel.open)load();else{seq++;results.replaceChildren();readiness.replaceChildren();}});
  refresh.addEventListener('click',load);
  document.addEventListener('visibilitychange',()=>{if(document.hidden){seq++;results.replaceChildren();readiness.replaceChildren();
    status.textContent=text('برای دریافت شواهد جدید، بخش را دوباره باز کنید.','Reopen to refresh protected evidence.');}});
})();
