/* JR owner verified education-interest control — read only until explicit MFA.
 * The first view is aggregate. Actual contact details require a separate
 * intentional click, and the browser clears them when the panel closes.
 * No newsletter is sent and no learner evidence is accessed here.
 */
(() => {
  'use strict';
  const root=document.querySelector('[data-jr-edu-interest-admin]');
  const container=document.getElementById('ops-education-readiness');
  const workspace=document.getElementById('ops-workspace');
  if(!root||!container||!workspace)return;
  const en=document.documentElement.lang==='en';
  const T=(fa,english)=>en?english:fa;
  const part=id=>root.querySelector('[data-jr-edu-interest-'+id+']');
  const status=part('status'),stats=part('stats'),refresh=part('refresh');
  const toggle=part('toggle'),save=part('save'),reveal=part('reveal');
  const contacts=part('contacts');
  if(!status||!stats||!refresh||!toggle||!save||!reveal||!contacts)return;
  const formatter=new Intl.NumberFormat(en?'en-US':'fa-IR');
  const interestNames={
    TALENT:T('شناخت استعداد','Talent discovery'),
    STUDY:T('یادگیری و مطالعه','Study skills'),
    SCORES:T('تحلیل کارنامه','Scorecard guidance'),
    UNIVERSITY:T('دانشگاه و انتخاب رشته','University guidance'),
    GROWTH:T('برنامه رشد','Personal development'),
    CHOICES:T('استودیوی انتخاب','Decision comparison')
  };
  let policy=null,epoch=0,busy=false,controller=null,contactsVisible=false;
  const permitted=()=>container.open&&!workspace.hidden&&!document.hidden;
  const el=(tag,content,cls)=>{
    const node=document.createElement(tag);
    if(cls)node.className=cls;
    if(content!==undefined)node.textContent=String(content);
    return node;
  };
  const number=n=>Number.isSafeInteger(n)&&n>=0?formatter.format(n):T('نامشخص','Unknown');
  function clear(){
    epoch++;controller?.abort();controller=null;busy=false;policy=null;
    contactsVisible=false;contacts.replaceChildren();stats.replaceChildren();
    toggle.checked=false;toggle.disabled=true;save.disabled=true;
    refresh.disabled=false;reveal.disabled=true;
    status.textContent=T('ابتدا این بخش را باز کنید تا فقط آمار واقعی دریافت شود.',
      'Open this panel to request the real aggregate counts.');
  }
  function render(snapshot,withContacts=false){
    if(!snapshot||snapshot.ok!==true||
       snapshot.schema!=='jr.education-interest-owner-snapshot.v1'||
       snapshot.automaticEmailCampaignEnabled!==false||
       snapshot.scienceOrCustomerEntitlementValidated!==false||
       !Array.isArray(snapshot.countByNeed)||
       snapshot.countByNeed.length>6)
      throw Error('UNTRUSTED_ADMIN_RESPONSE');
    policy=snapshot;
    stats.replaceChildren();
    const box=el('div',undefined,'jr-edu-interests__stats');
    const pairs=[
      [T('تأییدشده با رضایت‌نامه فعلی','Verified under current notice'),number(snapshot.verifiedCount)],
      [T('تأییدهای نسخه قدیمی؛ غیرمجاز برای تماس جدید','Retired-notice opt-ins; not contactable'),number(snapshot.legacyVerifiedCount)],
      [T('در انتظار تأیید با متن فعلی','Pending current-notice verification'),number(snapshot.pendingCount)],
      [T('درخواست‌های متن قدیمی؛ نیازمند درخواست جدید','Outdated pending requests; require fresh opt-in'),number(snapshot.stalePendingCount)],
      [T('وضعیت واقعی جمع‌آوری','Capture state'),
        snapshot.effectiveCaptureEnabled===true?T('با اجازه مدیر فعال','Owner enabled'):
          T('خاموش یا آماده نشده','Disabled or not provisioned')],
      [T('پایگاه داده و داده‌های مشاهده‌شده','Source of numbers'),
        snapshot.countsState==='OBSERVED_MOTHER_DATABASE'
         ?T('مشاهده از دیتابیس مادر','Observed in mother DB')
         :T('نامشخص، اطلاعات کافی نیست','Unknown, not enough evidence')]
    ];
    for(const [label,value] of pairs){
      const card=el('div',undefined,'jr-edu-interests__metric');
      card.append(el('strong',label),el('span',value));
      box.append(card);
    }
    stats.append(box);
    if(snapshot.countsState==='OBSERVED_MOTHER_DATABASE'){
      const list=el('ul',undefined,'jr-edu-interests__needs');
      for(const row of snapshot.countByNeed){
        if(!row||!Object.hasOwn(interestNames,row.need)||
          !Number.isSafeInteger(row.verifiedCount)||row.verifiedCount<0)continue;
        list.append(el('li',interestNames[row.need]+': '+number(row.verifiedCount)));
      }
      stats.append(list);
    }
    toggle.checked=snapshot.ownerSwitchEnabled===true;
    toggle.disabled=!(snapshot.canEnable===true||
      snapshot.ownerSwitchEnabled===true)||busy;
    save.disabled=toggle.disabled;
    reveal.disabled=snapshot.verifiedCount===null||
      snapshot.verifiedCount<1||busy;
    if(!withContacts)contacts.replaceChildren();
    if(withContacts && Array.isArray(snapshot.contacts)){
      contactsVisible=true;
      contacts.replaceChildren();
      for(const item of snapshot.contacts){
        if(!item||typeof item.email!=='string'||item.email.length>254||
          item.isEmailVerified!==true||
          !Object.hasOwn(interestNames,item.interest)||
          typeof item.id!=='string')continue;
        const card=el('article',undefined,'jr-edu-interests__contact');
        const heading=el('strong',item.email);
        heading.dir='ltr';heading.style.overflowWrap='anywhere';
        const label=el('p',interestNames[item.interest]+
          ' · '+(item.locale==='en'?'EN':'FA'));
        const copy=el('button',T('کپی ایمیل','Copy email'));
        copy.type='button';
        copy.addEventListener('click',()=>{
          if(navigator.clipboard?.writeText){
            navigator.clipboard.writeText(item.email).then(()=>{
              status.textContent=T('ایمیل به حافظه دستگاه مدیر کپی شد.',
                'The verified email address was copied for owner use.');
            }).catch(()=>{
              status.textContent=T('کپی خودکار ممکن نشد.','Automatic copying was unavailable.');
            });
          }
        });
        const stop=el('button',T('لغو عضویت این مخاطب','Suppress this contact'));
        stop.type='button';stop.className='secondary';
        stop.addEventListener('click',()=>suppress(item.id,item.email));
        card.append(heading,label,copy,stop);
        contacts.append(card);
      }
      if(snapshot.contactsTruncated===true){
        contacts.append(el('p',T(
          'فقط ۵۰ مخاطب نخست نشان داده شده‌اند؛ این فهرست جایگزین صادرات بررسی‌شده نیست.',
          'The first 50 contacts are shown; this is not a full reviewed export.'
        )));
      }
    }
    status.textContent=T('فقط اشتراک‌های دارای تأیید ایمیل و نسخه فعلی رضایت‌نامه برای تماس آموزشی مجازند. سوابق قدیمی از فهرست تماس حذف می‌شوند و این پنل ایمیل خودکار نمی‌فرستد.',
      'Only email-verified, current-notice topic opt-ins are eligible for educational contact. Retired consent is excluded from the contact list; this panel sends no automatic email.');
  }
  async function getSnapshot(includeContacts=false){
    if(!permitted()||busy)return false;
    const serial=++epoch;
    controller?.abort();controller=new AbortController();busy=true;
    refresh.disabled=true;save.disabled=true;toggle.disabled=true;
    reveal.disabled=true;
    status.textContent=T('در حال دریافت اطلاعات واقعی با مجوز مدیر…',
      'Reading real mother-database records under owner authorization…');
    try{
      const suffix=includeContacts?'?includeContacts=1':'';
      const res=await fetch('/api/admin/operations/education-interests'+suffix,{
        credentials:'same-origin',cache:'no-store',
        headers:{Accept:'application/json'},signal:controller.signal
      });
      if(!res.ok)throw Error('OWNER_AUTH_REQUIRED');
      const payload=await res.json();
      if(serial!==epoch||!permitted())return false;
      render(payload,includeContacts);
      return true;
    }catch(error){
      if(serial!==epoch||error?.name==='AbortError')return false;
      contacts.replaceChildren();contactsVisible=false;
      status.textContent=T('مجوز یا گزارش پایگاه داده تأیید نشد؛ اطلاعات مخاطب نمایش داده نمی‌شود.',
        'Owner permission or database evidence was unavailable. No contact details are displayed.');
      return false;
    }finally{
      if(serial===epoch){controller=null;busy=false;refresh.disabled=false;}
    }
  }
  async function ownerCommand(body){
    if(!permitted()||busy)return null;
    const serial=++epoch;controller?.abort();
    controller=new AbortController();busy=true;
    toggle.disabled=true;save.disabled=true;reveal.disabled=true;
    status.textContent=T('در حال دریافت مجوز دومرحله‌ای و ثبت تصمیم…',
      'Verifying recent owner MFA and recording the decision…');
    try{
      const session=await fetch('/api/admin/operations/session',{
        credentials:'same-origin',cache:'no-store',
        headers:{Accept:'application/json'},signal:controller.signal
      });
      if(!session.ok)throw Error('MFA_REQUIRED');
      const verified=await session.json();
      if(serial!==epoch||!permitted())return null;
      if(verified?.ok!==true||verified.mfaRequired!==false||
        !/^[a-f0-9]{64}$/i.test(verified.csrfToken||''))
        throw Error('MFA_REQUIRED');
      const r=await fetch('/api/admin/operations/education-interests',{
        method:'POST',credentials:'same-origin',cache:'no-store',
        headers:{Accept:'application/json','Content-Type':'application/json',
          'X-CSRF-Token':verified.csrfToken},
        body:JSON.stringify(body),signal:controller.signal
      });
      if(!r.ok)throw Error('NOT_AUTHORIZED');
      const result=await r.json();
      if(serial!==epoch||!permitted())return null;
      return result;
    }catch(error){
      if(serial===epoch&&error?.name!=='AbortError')
        status.textContent=T('این تغییر هنوز تأیید نشده است؛ مجوز مدیر یا شواهد معتبر کافی نیست.',
          'The change could not be confirmed. Owner privileges or prerequisites may be unavailable.');
      return null;
    }finally{
      if(serial===epoch){
        busy=false;controller=null;
        if(policy){toggle.disabled=!policy.canEnable&&!policy.ownerSwitchEnabled;
          save.disabled=toggle.disabled;reveal.disabled=!policy.verifiedCount;}
      }
    }
  }
  async function refreshAfterChange(){
    contactsVisible=false;contacts.replaceChildren();
    await getSnapshot(false);
  }
  async function suppress(id,email){
    if(!policy||!permitted())return;
    if(!window.confirm(T(
      'عضویت تأییدشده '+email+' لغو و نسخه فعال نشانی ایمیل از دیتابیس پاک شود؟',
      'Suppress '+email+' and clear its active encrypted email address?'
    )))return;
    const outcome=await ownerCommand({
      action:'suppressContact',leadId:id,
      confirmation:'SUPPRESS EDUCATIONAL CONTACT'
    });
    if(outcome?.ok===true&&outcome.suppressed===true){
      await refreshAfterChange();
      status.textContent=T('لغو عضویت در پایگاه داده ثبت شد؛ مخاطب دیگر برای ارسال مجاز نیست.',
        'The contact was suppressed and is no longer eligible for educational messages.');
    }
  }
  refresh.addEventListener('click',()=>getSnapshot(false));
  reveal.addEventListener('click',()=>getSnapshot(true));
  save.addEventListener('click',async()=>{
    if(!policy||!permitted())return;
    const desired=toggle.checked===true;
    if(desired&&!policy.canEnable){
      status.textContent=T('سرویس ایمیل، رمزگذاری یا دیتابیس هنوز آماده نیست.',
        'SMTP, encryption or the unified database is not ready.');
      return;
    }
    if(!window.confirm(desired
      ?T('آیا جمع‌آوری داوطلبانه ایمیل آموزشی با تأیید مالکیت را فعال می‌کنید؟',
        'Enable voluntary, email-verified first-party educational interests?')
      :T('آیا جمع‌آوری درخواست‌های جدید را متوقف می‌کنید؟ اشتراک‌های قبلی خودکار حذف نمی‌شوند.',
        'Stop new educational email requests? Existing verified interests are retained under their consent.'))){
      toggle.checked=policy.ownerSwitchEnabled;return;
    }
    const change=await ownerCommand({
      action:'setEnabled',enabled:desired,
      confirmation:desired?'ENABLE EDUCATIONAL EMAIL INTEREST':
        'DISABLE EDUCATIONAL EMAIL INTEREST'
    });
    if(change?.ok===true&&change.schema===
      'jr.education-interest-owner-snapshot.v1'&&
      change.ownerSwitchEnabled===desired){
      await refreshAfterChange();
      status.textContent=desired
        ?T('مدیر جمع‌آوری درخواست داوطلبانه را روشن کرد؛ هیچ ارسال تبلیغاتی خودکار فعال نشده است.',
          'Opt-in capture was enabled. No automatic advertising campaign was activated.')
        :T('درخواست‌های جدید غیرفعال شدند. انصراف مخاطبان و نگهداری داده مستقل مدیریت می‌شود.',
          'New requests are disabled. Contact opt-outs and retention remain independent.');
    }
  });
  container.addEventListener('toggle',()=>{
    if(container.open)getSnapshot(false);
    else clear();
  });
  const observer=new MutationObserver(()=>{if(workspace.hidden)clear();});
  observer.observe(workspace,{attributes:true,attributeFilter:['hidden']});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)clear();});
  window.addEventListener('pagehide',()=>{clear();observer.disconnect();},{once:true});
  clear();
})();
