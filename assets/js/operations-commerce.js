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
  let seq=0;
  function node(tag,value,cls){
    const n=document.createElement(tag);
    if(value!==undefined)n.textContent=String(value);
    if(cls)n.className=cls;
    return n;
  }
  function card(label,value,detail){
    const n=node('article',undefined,'ops-card');
    n.append(node('small',label),node('div',value??text('نامشخص','Unknown'),'ops-number'));
    if(detail)n.append(node('p',detail,'ops-muted'));
    results.append(n);
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
    card(text('مرسوله‌های در حال آماده‌سازی','Parcels being prepared'),
      parcels.preparing??0);
    if(Array.isArray(fulfilment.serviceActionQueue)&&fulfilment.serviceActionQueue.length){
      const detail=node('details'),label=node('summary',
        text('مشاهدهٔ فهرست پرونده‌های قابل پیگیری','View service fulfilment worklist'));
      detail.append(label);
      const note=node('p',text(
        'شناسه‌ها فقط ارجاع داخلی مدیر هستند؛ تطبیق درگاه با سفارش به معنای تسویهٔ بانکی یا ارائهٔ خدمت نیست.',
        'Internal case references only. Matching payment claims does not prove bank settlement or service delivery.'),'ops-muted');
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
  async function load(){
    if(workspace.hidden||!panel.open)return;
    const stamp=++seq;refresh.disabled=true;
    status.textContent=text('در حال دریافت شواهد سرور…','Reading server evidence…');
    try{
      const response=await fetch('/api/admin/operations/commerce',{
        method:'GET',credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}
      });
      const data=await response.json();
      if(stamp!==seq)return;
      if(!response.ok||data.ok!==true||data.schema!=='operations-commerce-evidence-v1')
        throw new Error('unauthorized_or_unavailable');
      present(data);
    }catch{
      if(stamp!==seq)return;
      results.replaceChildren();
      status.textContent=text('دسترسی دومرحله‌ای منقضی شده یا گزارش قابل دریافت نیست؛ هیچ عددی فرض نشد.',
        'MFA access expired or evidence is unavailable. No counts were assumed.');
    }finally{if(stamp===seq)refresh.disabled=false;}
  }
  panel.addEventListener('toggle',()=>{if(panel.open)load();else{seq++;results.replaceChildren();}});
  refresh.addEventListener('click',load);
  document.addEventListener('visibilitychange',()=>{if(document.hidden){seq++;results.replaceChildren();
    status.textContent=text('برای دریافت شواهد جدید، بخش را دوباره باز کنید.','Reopen to refresh protected evidence.');}});
})();
