/* JR Education Interest v1 — one optional, benefit-led email popup.
 * No SDK, analytics, cookies, autosubscription, learner scores or raw text.
 * One affirmative click expresses ONLY scoped educational-email interest.
 * Email control is confirmed through a single link sent by site-owned SMTP.
 */
(() => {
  'use strict';
  const launch=document.querySelector('[data-jr-interest-open]');
  const status=document.querySelector('[data-jr-interest-status]');
  const container=document.querySelector('[data-jr-interest-cta]');
  if(!launch||!status||!container)return;
  const en=document.documentElement.lang==='en';
  const T=(fa,english)=>en?english:fa;
  const endpoint='/api/education-interest/';
  const NEEDS=[
    ['TALENT',T('شناخت استعداد و توانایی‌ها','Talent and strengths')],
    ['STUDY',T('روش مطالعه و یادگیری','Learning and study methods')],
    ['SCORES',T('شناخت کارنامه و عملکرد آزمون','Scorecard understanding')],
    ['UNIVERSITY',T('دانشگاه و انتخاب رشته','University and program choices')],
    ['GROWTH',T('برنامه رشد فردی','Personal growth planning')],
    ['CHOICES',T('مقایسه و تصمیم‌گیری','Comparing options and decisions')]
  ];
  const defaultNeed=NEEDS.some(x=>x[0]===launch.dataset.jrInterestDefault)
    ?launch.dataset.jrInterestDefault:'STUDY';
  let dialogOpen=false,processing=false,controller=null,capabilitiesState=null;
  // An unready optional campaign must not show a dead-end button. This
  // read-only capability request transmits no email, identity or student data.
  launch.hidden=true;container.hidden=true;
  const noticeHash=async value=>{
    if(!crypto?.subtle||typeof TextEncoder==='undefined')return null;
    const buf=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));
    return [...new Uint8Array(buf)].map(n=>n.toString(16).padStart(2,'0')).join('');
  };
  const setStatus=(value,alert=false)=>{
    status.textContent=value;
    status.hidden=false;
    status.setAttribute('role',alert?'alert':'status');
  };
  const post=async(path,body,signal)=>{
    const r=await fetch(endpoint+path,{
      method:'POST',credentials:'same-origin',cache:'no-store',
      headers:{Accept:'application/json','Content-Type':'application/json'},
      body:JSON.stringify(body),signal
    });
    if(!r.ok)throw Error(r.status===429?'RATE_LIMIT':
      r.status===410?'EXPIRED':'UNAVAILABLE');
    return r.json();
  };
  function popup(capabilities){
    if(dialogOpen||processing)return;
    if(!capabilities||capabilities.available!==true||
      capabilities.schema!=='jr.education-interest-capabilities.v1'||
      capabilities.marketingWithoutConsentEnabled!==false||
      !capabilities.subscriptionRequiresMailVerification)return;
    const locale=en?'en':'fa';
    const originalNotice=capabilities.notices?.[locale];
    if(typeof originalNotice!=='string'||originalNotice.length<70||
       originalNotice.length>2800||
       capabilities.consentNoticeVersion!=='2026-10-edu-interest-v1')return;
    dialogOpen=true;
    const dialog=document.createElement('dialog');
    dialog.className='jr-interest-dialog';
    dialog.id='jr-education-single-popup';
    dialog.setAttribute('aria-labelledby','jr-interest-popup-heading');
    dialog.setAttribute('aria-describedby','jr-interest-popup-explain');
    const heading=document.createElement('h2');
    heading.id='jr-interest-popup-heading';
    heading.textContent=T('✨ راهنمای مناسب مسیر خودت را دریافت کن',
      '✨ Get guidance tailored to your next step');
    const explain=document.createElement('p');
    explain.id='jr-interest-popup-explain';
    explain.textContent=T(
      'فقط موضوع موردنیازت و ایمیلت را وارد کن. پس از تأیید ایمیل، گاهی راهنماهای آموزشی مرتبط برایت می‌فرستیم. اطلاعاتت را برای تبلیغ دیگران یا فروش داده استفاده نمی‌کنیم. این عضویت اختیاری است و تمام آموزش‌های رایگان بدون آن در دسترس‌اند.',
      'Choose what you want to learn and enter your email. After you verify the address, we may send occasional relevant educational guidance. We do not sell your data or share it for third-party advertising. Joining is optional; free learning stays accessible.'
    );
    const form=document.createElement('form');
    form.method='dialog';form.noValidate=true;
    const needLabel=document.createElement('label');
    needLabel.textContent=T('موضوع موردنیاز من','My learning interest');
    const need=document.createElement('select');
    need.name='interest';need.required=true;
    for(const [value,label] of NEEDS){
      const option=document.createElement('option');
      option.value=value;option.textContent=label;
      if(value===defaultNeed)option.selected=true;
      need.append(option);
    }
    needLabel.append(need);
    const emailLabel=document.createElement('label');
    emailLabel.textContent=T('ایمیل من','My email');
    const email=document.createElement('input');
    email.type='email';email.autocomplete='email';email.required=true;
    email.inputMode='email';email.maxLength=254;
    email.placeholder=T('name@example.com','name@example.com');
    email.name='email';email.dir='ltr';
    emailLabel.append(email);
    const details=document.createElement('details');
    const summary=document.createElement('summary');
    summary.textContent=T('حریم خصوصی و نحوه استفاده از ایمیل',
      'Privacy and how we use your email');
    const full=document.createElement('p');
    full.textContent=originalNotice;
    full.lang=locale;full.dir=locale==='fa'?'rtl':'ltr';
    details.append(summary,full);
    const actions=document.createElement('div');
    actions.className='jr-interest-dialog__actions';
    const yes=document.createElement('button');
    yes.type='submit';yes.textContent=T('موافقم، راهنما را دریافت می‌کنم',
      'Yes, send me relevant guidance');
    const skip=document.createElement('button');
    skip.type='button';skip.className='secondary';
    skip.textContent=T('فعلاً خودم ادامه می‌دهم','Continue learning without joining');
    actions.append(yes,skip);
    const inlineError=document.createElement('p');
    inlineError.className='jr-interest-dialog__error';
    inlineError.setAttribute('aria-live','polite');
    inlineError.hidden=true;
    form.append(needLabel,emailLabel,details,actions,inlineError);
    dialog.append(heading,explain,form);
    const dismiss=()=>dialog.close();
    skip.addEventListener('click',dismiss);
    dialog.addEventListener('close',()=>{
      dialogOpen=false;dialog.remove();controller?.abort();controller=null;
      // Do not immediately reopen the popup after a deliberate decline.
    },{once:true});
    form.addEventListener('submit',async event=>{
      event.preventDefault();
      if(processing||!email.validity.valid||!need.value||
         !NEEDS.some(pair=>pair[0]===need.value)){
        inlineError.hidden=false;
        inlineError.textContent=T('یک ایمیل معتبر و موضوع آموزشی انتخاب کنید.',
          'Please provide a valid email and select your learning topic.');
        return;
      }
      processing=true;yes.disabled=true;skip.disabled=true;
      inlineError.hidden=true;
      try{
        const hash=await noticeHash(originalNotice);
        if(!hash)throw Error('CRYPTO');
        controller=new AbortController();
        const response=await post('subscribe',{
          email:email.value.trim(),interest:need.value,locale,
          purpose:'EDUCATIONAL_INFORMATION_EMAIL',
          consent:true,noticeVersion:'2026-10-edu-interest-v1',
          noticeSha256:hash,marketingForOtherPurposes:false
        },controller.signal);
        if(response?.ok!==true||
          response.schema!=='jr.education-interest-submission.v1'||
          response.verifiedByThisRequest!==false||
          response.marketingActivated!==false)throw Error('UNVERIFIED');
        dialog.close();
        setStatus(T('درخواست دریافت شد. برای فعال‌کردن راهنماهای مرتبط، پیوند تأیید ایمیل را بررسی کن.',
          'Request received. Check your email for the verification link to activate these educational updates.'));
      }catch(error){
        if(error?.name==='AbortError')return;
        inlineError.hidden=false;
        inlineError.textContent=error?.message==='RATE_LIMIT'
          ?T('برای حفاظت از ایمیل، چند دقیقه بعد دوباره امتحان کنید.',
            'Please try again later. A short email safety limit is in effect.')
          :T('امکان ارسال تأییدیه در حال حاضر فراهم نشد؛ عضویت فعال نشده است.',
            'Email confirmation could not be arranged; your subscription is not active.');
      }finally{
        processing=false;yes.disabled=false;skip.disabled=false;
      }
    });
    document.body.append(dialog);
    if(typeof dialog.showModal==='function')dialog.showModal();
    else{dialog.open=true;dialog.setAttribute('role','dialog');}
    email.focus();
  }
  async function discoverInterestAvailability(){
    try{
      const response=await fetch(endpoint+'capabilities',{
        method:'GET',credentials:'same-origin',cache:'no-store',
        headers:{Accept:'application/json'}
      });
      if(!response.ok)return;
      const config=await response.json();
      if(config?.ok!==true||
        config.schema!=='jr.education-interest-capabilities.v1'||
        config.available!==true||config.marketingWithoutConsentEnabled!==false||
        config.subscriptionRequiresMailVerification!==true||
        !['fa','en'].every(code=>typeof config.notices?.[code]==='string'))
        return;
      capabilitiesState=config;
      container.hidden=false;launch.hidden=false;
    }catch(_){
      // Free first steps remain uninterrupted when optional email service
      // or mother DB is unavailable. No error popup is ever forced.
    }
  }
  launch.addEventListener('click',()=>{
    if(processing||dialogOpen||!capabilitiesState)return;
    popup(capabilitiesState);
  });
  discoverInterestAvailability();
  // Verification links store secrets only in a same-origin fragment. Never
  // place them in HTTP query strings, logs, external script parameters or UI.
  const currentHash=location.hash;
  const m=/^#edu-interest-(confirm|withdraw)=([a-f0-9]{64})$/.exec(currentHash);
  if(m){
    const action=m[1],token=m[2];
    history.replaceState(null,'',location.pathname+location.search);
    // Email click is already the explicit confirmation/withdrawal action.
    // This is NOT a blanket marketing opt-in: only this one verified topic.
    setStatus(action==='confirm'?T('در حال تأیید ایمیل…','Confirming your email…'):
      T('در حال لغو عضویت…','Withdrawing your subscription…'));
    post(action==='confirm'?'verify':'withdraw',{token})
      .then(result=>{
        if(result?.ok!==true||
          result.schema!=='jr.education-interest-email-action.v1'||
          result.action!==(action==='confirm'?'VERIFIED':'WITHDRAWN'))throw Error('UNVERIFIED');
        setStatus(action==='confirm'
          ?T('ایمیل شما تأیید شد؛ از این پس فقط راهنماهای موضوع انتخابی‌تان قابل ارسال هستند.',
            'Email verified. You may now receive guidance about your selected topic only.')
          :T('عضویت شما لغو و اطلاعات تماس ذخیره‌شده از رکورد حذف شد.',
            'Your subscription was withdrawn and the stored contact address was erased.'));
      })
      .catch(error=>setStatus(error?.message==='EXPIRED'
        ?T('این پیوند منقضی شده است؛ در صورت تمایل دوباره درخواست بده.',
          'This link expired. Request a fresh one if you still want updates.')
        :T('تأیید این اقدام در دسترس نیست؛ بعداً دوباره امتحان کنید.',
          'The requested email action could not be confirmed. Please try again later.'),true));
  }
})();
