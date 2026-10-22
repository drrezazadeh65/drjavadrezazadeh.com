/* Stage 13: read-only social readiness, loaded only inside the existing MFA admin workspace. */
(() => {
  'use strict';
  const workspace=document.getElementById('ops-workspace');
  const panel=document.getElementById('ops-social');
  const status=document.getElementById('ops-social-status');
  const results=document.getElementById('ops-social-results');
  const refresh=document.getElementById('ops-social-refresh');
  if(!workspace || !panel || !status || !results || !refresh) return;
  const isFa=document.documentElement.lang==='fa';
  const t=(fa,en)=>isFa?fa:en;
  const node=(tag,content,className)=>{
    const e=document.createElement(tag);
    if(content!==undefined)e.textContent=String(content);
    if(className)e.className=className;
    return e;
  };
  const count=v=>Number.isSafeInteger(v) && v>=0;
  let inFlight=false;
  let epoch=0;
  function clear(){
    epoch++; results.replaceChildren();
    status.textContent='';
  }
  const observer=new MutationObserver(()=>{
    if(workspace.hidden)clear();
  });
  observer.observe(workspace,{attributes:true,attributeFilter:['hidden']});
  // Explicit owner sign-out clears sensitive social observations immediately.
  workspace.addEventListener('jr:operations-locked',()=>{
    panel.open=false;clear();
  });
  function card(title,lines) {
    const e=node('section',undefined,'ops-card');
    e.append(node('h3',title));
    for (const line of lines) e.append(node('p',line,'ops-muted'));
    return e;
  }
  async function load(){
    if(workspace.hidden || !panel.open || inFlight)return;
    const thisEpoch=++epoch;
    inFlight=true;refresh.disabled=true;
    results.replaceChildren();
    status.textContent=t('در حال خواندن شواهد محافظت‌شده…','Reading protected evidence…');
    try {
      const response=await fetch('/api/admin/operations/social',{
        method:'GET',credentials:'same-origin',cache:'no-store',
        headers:{Accept:'application/json'}
      });
      if(!response.ok)throw Error('HTTP '+response.status);
      const data=await response.json();
      if(workspace.hidden || thisEpoch!==epoch)return;
      if(!data?.ok || data.schema!=='operations-social-readiness-v1')
        throw Error('Unexpected server response');
      const records=data.deliveryRows;
      results.append(card(t('وضعیت موتور','Engine status'),[
        data.enabledForAutomaticPublication===false
          ?t('انتشار خودکار غیرفعال است.','Automatic publishing is disabled.')
          :t('مجوز انتشار را مستقلاً بررسی کنید.','Verify publication authorization independently.'),
        records && count(records.total)
          ?t('ردیف‌های ثبت‌شده در صف: ','Recorded queue rows: ')+records.total
          :t('آمار صف هنوز در پایگاه داده قابل بررسی نیست.','Queue statistics are not yet available from the database.'),
        records && count(records.uncertain)
          ?t('ارسال‌های نامطمئن نیازمند بررسی: ','Uncertain deliveries requiring review: ')+records.uncertain
          :t('وضعیت ارسال‌های نامطمئن قابل تأیید نیست.','Uncertain-delivery status is not verified.')
      ]));
      for(const [provider,info] of Object.entries(data.channels||{})){
        const n=data.verifiedStatusAccountRows?.[provider];
        const state=count(n)
          ?t('رکوردهای دارای وضعیت verified در دیتابیس: ','Stored verified-status account records: ')+n
          :t('وضعیت حساب در دیتابیس نامشخص است.','Database account status is unavailable.');
        results.append(card(isFa?info.fa:info.en,[
          t('مسیر اتصال: ','Connection mechanism: ')+String(info.mode||'—'),
          state,
          t('فعال‌شدن ارسال و اعتبار واقعی مجوزها تأیید نشده است.',
            'Real provider permissions and publication have not been verified.')
        ]));
      }
      const deliveryRows=data.recentDeliveries;
      const deliveryBox=document.createElement('section');
      deliveryBox.className='ops-card';
      deliveryBox.append(node('h3',t('آخرین سوابق ثبت‌شدهٔ ارسال','Latest stored delivery records')));
      if(deliveryRows===null || !Array.isArray(deliveryRows)){
        deliveryBox.append(node('p',t('جدول صف هنوز آماده نیست؛ وضعیت نامشخص است.',
          'Delivery table unavailable; status is unknown.'),'ops-muted'));
      }else if(!deliveryRows.length){
        deliveryBox.append(node('p',t('هیچ رکوردی در صف ثبت نشده است.',
          'No delivery records in the database.'),'ops-muted'));
      }else{
        const list=document.createElement('ul');
        list.className='ops-queue';
        for(const record of deliveryRows.slice(0,25)){
          const li=document.createElement('li');
          const confirmed=record.status==='confirmed' && record.confirmationMethod;
          li.append(node('strong',String(record.provider||'?')+' · '+String(record.status||'?')));
          li.append(node('p',confirmed
            ?t('رسید ثبت‌شده: ','Stored receipt: ')+String(record.confirmationMethod)
              +(record.providerId?' · '+String(record.providerId):'')
            :t('بدون تأیید مستقل انتشار','No independently verified publication'),'ops-muted'));
          list.append(li);
        }
        deliveryBox.append(list);
      }
      results.append(deliveryBox);
      const metricsBox=document.createElement('section');
      metricsBox.className='ops-card';
      metricsBox.append(node('h3',t('مشاهده‌های واقعی عملکرد','Observed performance records')));
      if(!Array.isArray(data.recentMetrics)){
        metricsBox.append(node('p',t('داده‌های عملکرد در سرور قابل دسترسی نیستند.',
          'Performance data is not available on the server.'),'ops-muted'));
      }else if(!data.recentMetrics.length){
        metricsBox.append(node('p',t('هنوز هیچ مشاهدهٔ مستند ثبت نشده است.',
          'No documented provider observations have been stored yet.'),'ops-muted'));
      }else{
        for(const metric of data.recentMetrics.slice(0,10)){
          const date=Number.isSafeInteger(metric.observedAt)
            ?new Date(metric.observedAt*1000).toLocaleString(isFa?'fa-IR':'en-US')
            :t('زمان نامشخص','Unknown date');
          const clicks=Number.isSafeInteger(metric.clicks)
            ?String(metric.clicks):t('نامشخص','unknown');
          metricsBox.append(node('p',String(metric.source||'unknown')+' · '+date
             +' · '+t('کلیک‌های ثبت‌شده: ','Recorded clicks: ')+clicks,'ops-muted'));
        }
      }
      results.append(metricsBox);
      status.textContent=t('گزارش سرور خوانده شد؛ هیچ ارسال یا اتصال تازه‌ای انجام نشد.',
        'Server report loaded; no accounts were connected and no posts sent.');
    } catch(error) {
      if(!workspace.hidden && thisEpoch===epoch)
        status.textContent=t('گزارش در دسترس نیست؛ نشست مدیر یا دیتابیس را بررسی کنید. ',
          'Report unavailable; check admin session or database. ')+String(error.message||'');
    } finally {
      inFlight=false;refresh.disabled=false;
    }
  }
  panel.addEventListener('toggle',()=>{if(panel.open)load();else clear();});
  refresh.addEventListener('click',load);
})();
