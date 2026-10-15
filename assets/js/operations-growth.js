/* Stage14: MFA-only read-only growth report. Unknown != zero. */
(() => {
  'use strict';
  const button=document.querySelector('[data-ops-growth-refresh]');
  const status=document.querySelector('[data-ops-growth-status]');
  const view=document.querySelector('[data-ops-growth-results]');
  if(!button||!status||!view)return;
  let requestGeneration=0;
  const workspace=document.getElementById('ops-workspace');
  const fa=document.documentElement.lang==='fa';
  const t=(a,b)=>fa?a:b;
  const cell=(title,value,source)=>{
    const article=document.createElement('article');article.className='ops-card';
    const label=document.createElement('small');label.textContent=title;
    const n=document.createElement('div');n.className='ops-number';
    n.textContent=(value===null||value===undefined)?t('نامشخص','Unknown'):String(value);
    const cite=document.createElement('small');cite.textContent=source;
    article.append(label,n,cite);return article;
  };
  const number=value=>Number.isSafeInteger(value)?value.toLocaleString(fa?'fa-IR':'en-US'):null;
  button.addEventListener('click',async()=>{
    if(workspace?.hidden)return;
    const generation=++requestGeneration;
    button.disabled=true;view.replaceChildren();status.textContent=t('در حال بررسی شواهد واقعی سرور…','Checking server evidence…');
    try{
      const response=await fetch('/api/admin/operations/growth',{credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}});
      if(!response.ok)throw new Error(response.status===401||response.status===403?'MFA':'UNAVAILABLE');
      const data=await response.json();
      if(generation!==requestGeneration||workspace?.hidden||document.hidden)return;
      if(!data.ok||data.schema!=='stage14-growth-evidence-v1')throw new Error('UNAVAILABLE');
      const counts=data.leadMetrics?.counts||null;
      const pipeline=data.serviceSalesPipeline||null;
      view.append(
        cell(t('درخواست‌های ثبت‌شده با رضایت','Consented intake records'),number(counts?.total),data.leadMetrics?.source||'UNAVAILABLE'),
        cell(t('درخواست‌های نیازمند بررسی','New intake requests'),number(counts?.new),data.leadMetrics?.source||'UNAVAILABLE'),
        cell(t('درخواست‌های واجد شرایط','Qualified intake requests'),number(counts?.qualified),data.leadMetrics?.source||'UNAVAILABLE'),
        cell(t('لغو رضایت','Consent withdrawals'),number(counts?.withdrawn),data.leadMetrics?.source||'UNAVAILABLE'),
        cell(t('درخواست‌های خدمات منتظر اقدام','Service enquiries awaiting action'),number(pipeline?.awaitingAction),
          t('تنها درخواست‌های دارای رضایت معتبر','Only active consented enquiries')),
        cell(t('درخواست‌های معطل بیش از ۲۴ ساعت','Service enquiries older than 24 hours'),number(pipeline?.awaitingOver24Hours),
          t('نیازمند بررسی پیگیری؛ نه مجوز تبلیغات','Follow-up review needed; no marketing permission')),
        cell(t('درخواست‌های معطل بیش از ۷۲ ساعت','Service enquiries older than 72 hours'),number(pipeline?.awaitingOver72Hours),
          t('اولویت بالاتر برای رسیدگی','Higher operational follow-up priority')),
        cell(t('درخواست‌های نیازمند اطلاعات تکمیلی','Enquiries needing more information'),number(pipeline?.needsAdditionalInformation),
          t('بدون ادعای رزرو یا خرید','Not evidence of booking or purchase')),
        cell(t('درآمد خالص تسویه‌شده (تومان)','Net bank-settled revenue (toman)'),number(data.revenue?.netSettledToman),data.revenue?.status||'UNVERIFIED'),
        cell(t('سفارش‌های واقعاً تسویه‌شده','Reconciled paid orders'),number(data.revenue?.paidOrderCount),data.revenue?.status||'UNVERIFIED'),
        cell(t('خدمات و کتاب تحویل‌شده','Verified fulfilments'),number(data.revenue?.verifiedDeliveredCount),data.revenue?.status||'UNVERIFIED'),
        cell(t('نرخ تبدیل ارگانیک','Verified organic conversion rate'),data.organicTraffic?.qualifiedConversionRate,data.organicTraffic?.source||'UNVERIFIED')
      );
      if(pipeline && Array.isArray(pipeline.topServiceQueues) && pipeline.topServiceQueues.length){
        const detail=document.createElement('details');
        detail.className='ops-panel';
        const summary=document.createElement('summary');
        summary.textContent=t('خدمات دارای درخواست منتظر پیگیری','Services with outstanding enquiries');
        detail.append(summary);
        const list=document.createElement('ol');
        for(const item of pipeline.topServiceQueues){
          const row=document.createElement('li');
          row.textContent=String(item.serviceId||'')+' — '+String(number(item.awaitingAction)??t('نامشخص','Unknown'));
          list.append(row);
        }
        detail.append(list);
        if(pipeline.topServiceQueuesTruncated){
          const note=document.createElement('small');
          note.textContent=t('فهرست به ۶ خدمت محدود است.','The list is limited to six services.');
          detail.append(note);
        }
        view.append(detail);
      }
      status.textContent=t('آخرین پاسخ سرور: ','Server observation: ')+String(data.asOf||'')
        +' — '+t('کلیک، پیش‌نویس ایمیل یا آغاز پرداخت، درآمد قطعی محسوب نمی‌شود.','Clicks, email drafts and payment starts are never settled revenue.');
    }catch(e){
      if(generation!==requestGeneration||workspace?.hidden||document.hidden)return;
      view.replaceChildren();status.textContent=e.message==='MFA'
        ?t('ورود مدیر یا تأیید دومرحله‌ای لازم است.','Administrator session or recent MFA required.')
        :t('داده معتبر دریافت نشد؛ هیچ رقم تخمینی نمایش داده نمی‌شود.','Verified data unavailable; no estimates are shown.');
    }finally{if(generation===requestGeneration)button.disabled=false;}
  });
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){
      requestGeneration++;
      view.replaceChildren();
      status.textContent=t('برای مشاهده دوباره، شواهد درآمد را تازه‌سازی کنید.','Refresh protected sales evidence to view again.');
      button.disabled=false;
    }
  });
  // A worklist is not an additional CRM. It is a bounded view of the
  // existing consented Stage14 requests, restricted to fresh owner MFA.
  const growthPanel=document.getElementById('ops-organic-growth');
  if(growthPanel){
    const leadPanel=document.createElement('details');
    leadPanel.className='ops-panel';
    const leadHeading=document.createElement('summary');
    leadHeading.textContent=t('صف پیگیری درخواست‌های دارای رضایت',
      'Consented service enquiries requiring human follow-up');
    const explanation=document.createElement('p');
    explanation.className='ops-muted';
    explanation.textContent=t(
      'فقط مدیر ارشد دارای تأیید دومرحله‌ای تازه می‌تواند حداکثر ۲۰ درخواست فعال را ببیند. وضعیت بررسی، به معنی تماس انجام‌شده، پذیرش خدمت، رزرو یا دریافت وجه نیست. رضایت تبلیغاتی از این مسیر صادر نمی‌شود.',
      'Fresh-MFA super-admin only. Up to 20 active consented enquiries. Updating a review status does not send an email, accept a client, reserve time or prove payment. Never treat consent to an enquiry as marketing opt-in.');
    const refreshLeads=document.createElement('button');
    refreshLeads.type='button';refreshLeads.textContent=t('دریافت صف واقعی پیگیری','Load current follow-up queue');
    const leadStatus=document.createElement('p');
    leadStatus.className='ops-muted';leadStatus.setAttribute('role','status');
    leadStatus.setAttribute('aria-live','polite');
    const leadList=document.createElement('ol');
    leadList.className='ops-source-list';
    leadPanel.append(leadHeading,explanation,refreshLeads,leadStatus,leadList);
    growthPanel.append(leadPanel);
    let leadGeneration=0;
    const canShow=()=>!workspace?.hidden && growthPanel.open &&
      leadPanel.open && !document.hidden;
    const clearSensitive=()=>{
      leadGeneration++;
      leadList.replaceChildren();
      leadStatus.textContent=t('نمایش اطلاعات تماس بسته شد؛ برای مشاهده دوباره وارد شوید یا تازه‌سازی کنید.',
        'Contact details have been cleared. Reopen and refresh with current owner MFA.');
      refreshLeads.disabled=false;
    };
    const elem=(tag,content)=>{
      const n=document.createElement(tag);
      if(content!==undefined)n.textContent=String(content);
      return n;
    };
    const allowedTransitions={
      NEW:['QUALIFIED','NEEDS_INFO','CLOSED'],
      NEEDS_INFO:['QUALIFIED','CLOSED'],
      QUALIFIED:['NEEDS_INFO','CLOSED']
    };
    const stateLabel=state=>({
      NEW:t('جدید','New'),
      NEEDS_INFO:t('نیازمند اطلاعات','Needs information'),
      QUALIFIED:t('واجد شرایط بررسی','Qualified for review'),
      CLOSED:t('بسته','Closed')
    })[state]||t('نامشخص','Unknown');
    async function loadLeads(){
      if(!canShow())return;
      const generation=++leadGeneration;
      leadList.replaceChildren();refreshLeads.disabled=true;
      leadStatus.textContent=t('در حال دریافت رکوردهای دارای رضایت معتبر…',
        'Retrieving records with current consent…');
      try{
        const response=await fetch('/api/admin/operations/growth/leads',{
          credentials:'same-origin',cache:'no-store',
          headers:{Accept:'application/json'}
        });
        if(!response.ok)throw Error(response.status===401||response.status===403
          ?'OWNER_MFA':'UNAVAILABLE');
        const data=await response.json();
        if(generation!==leadGeneration||!canShow())return;
        if(data.ok!==true||data.schema!=='stage14-owner-lead-worklist-v1'
          ||!Array.isArray(data.items)||data.items.length>20)throw Error('UNAVAILABLE');
        if(data.items.length===0){
          leadStatus.textContent=t('درخواست فعال و واجد شرایط پیگیری گزارش نشده است.',
            'No current, consenting enquiries require follow-up.');
          return;
        }
        for(const entry of data.items){
          const id=String(entry.id||''),service=String(entry.serviceId||''),
                state=String(entry.state||''),contact=String(entry.contactEmail||'');
          if(!/^[a-f0-9-]{36}$/i.test(id)||!/^service:[A-Za-z0-9_-]{3,64}$/.test(service)&&
             !/^vip:[A-Za-z0-9_-]{3,64}$/.test(service)||
             !allowedTransitions[state]||contact.length>254||
             !/^[^\s@?#]+@[^\s@?#]+\.[^\s@?#]+$/.test(contact))
            throw Error('UNAVAILABLE');
          const row=elem('li');
          const title=elem('strong',service+' · '+stateLabel(state));
          const label=elem('p',t('ایمیل حساب تأییدشده: ','Verified account email: ')+contact);
          label.className='ops-muted';
          const contactLink=elem('a',t('آماده‌سازی ایمیل پیگیری (ارسال خودکار نیست)',
            'Prepare follow-up email (not sent automatically)'));
          contactLink.href='mailto:'+encodeURIComponent(contact)+
            '?subject='+encodeURIComponent('Service enquiry: '+service);
          const select=elem('select');
          select.setAttribute('aria-label',t('وضعیت بعدی برای ','Next review status for ')+service);
          for(const next of allowedTransitions[state]){
            const option=elem('option',stateLabel(next));
            option.value=next;select.append(option);
          }
          const change=elem('button',t('ثبت نتیجه بررسی','Save review status'));
          change.type='button';
          change.addEventListener('click',async()=>{
            if(!canShow())return;
            const next=select.value;
            if(!allowedTransitions[state].includes(next))return;
            if(!window.confirm(t(
              'تغییر وضعیت درخواست '+service+' به '+stateLabel(next)+'؟ این کار پیام، رزرو یا پرداخت ایجاد نمی‌کند.',
              'Change '+service+' to '+stateLabel(next)+'? No email, booking or payment will be created.'
            )))return;
            const stamp=leadGeneration;
            change.disabled=true;
            try{
              const ses=await fetch('/api/admin/operations/session',{
                credentials:'same-origin',cache:'no-store',
                headers:{Accept:'application/json'}
              });
              if(!ses.ok)throw Error('OWNER_MFA');
              const auth=await ses.json();
              if(stamp!==leadGeneration||!canShow())return;
              if(auth.ok!==true||auth.mfaRequired!==false||
                !/^[a-f0-9]{64}$/i.test(String(auth.csrfToken||'')))throw Error('OWNER_MFA');
              const response=await fetch('/api/admin/operations/growth/leads/transition',{
                method:'POST',credentials:'same-origin',cache:'no-store',
                headers:{Accept:'application/json','Content-Type':'application/json',
                  'X-CSRF-Token':auth.csrfToken},
                body:JSON.stringify({leadId:id,expectedState:state,nextState:next})
              });
              const result=await response.json().catch(()=>null);
              if(stamp!==leadGeneration||!canShow())return;
              if(!response.ok||result?.ok!==true||
                result?.schema!=='stage14-lead-transition-v1')throw Error('CONFLICT');
              await loadLeads();
            }catch(error){
              if(stamp===leadGeneration&&canShow()){
                leadStatus.textContent=error.message==='OWNER_MFA'
                  ?t('برای اصلاح وضعیت، ورود مدیر ارشد و تأیید دومرحله‌ای تازه لازم است.',
                    'Fresh super-admin MFA is required to change the review status.')
                  :t('به‌روزرسانی تأیید نشد. وضعیت معتبر را دوباره دریافت کنید.',
                    'No state change was confirmed. Refresh the worklist before retrying.');
                change.disabled=false;
              }
            }
          });
          row.append(title,label,contactLink,select,change);
          leadList.append(row);
        }
        leadStatus.textContent=t('نمایش حداکثر ۲۰ درخواست قدیمی‌تر با رضایت معتبر؛ هیچ پیام خودکاری ارسال نشده است.',
          'Showing up to 20 oldest actively consented enquiries. No follow-up messages were sent.');
      }catch(error){
        if(generation!==leadGeneration||!canShow())return;
        leadList.replaceChildren();
        leadStatus.textContent=error.message==='OWNER_MFA'
          ?t('دسترسی مدیر ارشد با تأیید دومرحله‌ای تازه لازم است.',
            'Super-admin access with fresh MFA is required.')
          :t('صف معتبر قابل دریافت نیست؛ هیچ داده‌ای تخمین زده نمی‌شود.',
            'Current worklist unavailable; no records are inferred.');
      }finally{
        if(generation===leadGeneration)refreshLeads.disabled=false;
      }
    }
    refreshLeads.addEventListener('click',loadLeads);
    growthPanel.addEventListener('toggle',()=>{if(!growthPanel.open)clearSensitive()});
    leadPanel.addEventListener('toggle',()=>{if(!leadPanel.open)clearSensitive()});
    document.addEventListener('visibilitychange',()=>{if(document.hidden)clearSensitive()});
    if(workspace)new MutationObserver(()=>{
      if(workspace.hidden)clearSensitive();
    }).observe(workspace,{attributes:true,attributeFilter:['hidden']});
  }

})();
