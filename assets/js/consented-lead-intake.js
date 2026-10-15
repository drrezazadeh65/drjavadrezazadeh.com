/* Stage14: optional, bilingual, first-party lead capture for VERIFIED accounts.
 * The server alone authorises requests and their visibility. No personal free text,
 * payment information, sensitive records, persistent browser storage or analytics.
 * Email draft/contact paths remain available when verified intake is unavailable.
 */
(() => {
  'use strict';
  const form=document.querySelector('[data-stage14-consent-lead]');
  if(!form)return;
  const fa=document.documentElement.lang==='fa';
  const t=(persian,english)=>fa?persian:english;
  const choice=form.querySelector('[name="serviceId"]');
  const consent=form.querySelector('[name="consentGiven"]');
  const status=form.querySelector('[data-stage14-lead-status]');
  const mine=form.querySelector('[data-stage14-lead-mine]');
  const list=form.querySelector('[data-stage14-lead-list]');
  const submit=form.querySelector('[type="submit"]');
  const consentVersion='stage14-consultation-v1';
  const serviceLabels=new Map();
  // Context links carry only a public catalogue identifier, never a customer
  // identifier, private questionnaire response, consent, or payment instruction.
  const requested=(()=>{
    const value=new URLSearchParams(location.search).get('service');
    if(typeof value!=='string'||value.length>84)return null;
    const key=/^(?:service|vip):[A-Za-z0-9_-]{3,64}$/.test(value)
      ?value:(/^[A-Za-z0-9_-]{3,64}$/.test(value)?'service:'+value:null);
    return key;
  })();
  const vipEnglish=Object.freeze({
    'academic-direction':'Personal academic pathway guidance',
    'university-selection':'VIP university major selection',
    'golden-talent-signature':'Signature Golden Talent guidance',
    'research-publication':'Research and publication advisory',
    'educator-development':'Educator professional development',
    'institutional-advisory':'Institutional educational advisory'
  });
  // One authoritative catalogue controls IDs/fees; the separate locale file
  // provides English labels and bounded scope only. Neither proves checkout.
  const serviceDetails=new Map();
  let englishServices=null;
  let priceCurrency=null;
  const details=document.createElement('div');
  details.className='jr2-service-consent-context';
  details.setAttribute('data-stage14-service-summary','');
  details.setAttribute('role','region');
  details.setAttribute('aria-label',t('اطلاعات خدمت انتخاب‌شده','Selected service details'));
  details.hidden=true;
  choice.closest('label')?.insertAdjacentElement('afterend',details);
  function renderDetails(){
    details.replaceChildren();
    const service=serviceDetails.get(choice.value);
    const localized=fa?null:englishServices?.[service?.id];
    if(!service||(!fa&&!localized)){details.hidden=true;return;}
    details.hidden=false;
    const heading=document.createElement('h3');
    heading.textContent=fa?service.title_fa:localized.title;
    details.append(heading);
    const fee=priceCurrency==='IRT'&&Number.isSafeInteger(service.price)&&service.price>=0
      ?new Intl.NumberFormat(fa?'fa-IR':'en-US').format(service.price)+t(' تومان',' toman')
      :t('تعرفه نیازمند تأیید است','Fee requires confirmation');
    const fields=fa?[
      ['تعرفه اعلام‌شده',fee],
      ['مناسب برای',service.fit_fa],
      ['خروجی مورد انتظار',service.outcome_fa],
      ['محدوده خدمت',service.boundary_fa]
    ]:[
      ['Listed fee',fee],
      ['Suitable for',localized.fit],
      ['Expected outcome',localized.outcome],
      ['Scope and limits',localized.boundary]
    ];
    for(const [label,value] of fields){
      if(typeof value!=='string'||!value.trim())continue;
      const p=document.createElement('p');
      const b=document.createElement('strong');
      b.textContent=label+': ';
      p.append(b,document.createTextNode(value));
      details.append(p);
    }
    const note=document.createElement('p');
    note.className='jr2-service-consent-note';
    note.textContent=t(
      'این اطلاعات از کاتالوگ خدمات است. ثبت علاقه‌مندی به معنی پرداخت، تأیید خدمت یا رزرو جلسه نیست.',
      'This is catalogue information only. Recording interest is not payment, service acceptance or a confirmed appointment.'
    );
    details.append(note);
  }
  choice.addEventListener('change',()=>{
    // Consent must apply to the service visible at the moment it is given.
    consent.checked=false;
    renderDetails();
    say(t('خدمت انتخاب‌شده را بررسی کنید و سپس رضایت خود را ثبت کنید.',
      'Review the selected service and then give your consent.'));
  });
  const say=message=>{status.textContent=message};
  const titleFor=service=>fa?service.title_fa:englishServices?.[service.id]?.title;
  async function loadCatalog(){
    try{
      const [response,localeResponse]=await Promise.all([
        fetch('/assets/data/service-catalog.json',{credentials:'same-origin',cache:'no-store'}),
        fa?Promise.resolve(null):fetch('/assets/data/service-descriptions-en.json',{
          credentials:'same-origin',cache:'no-store'
        })
      ]);
      if(!response.ok||(!fa&&!localeResponse?.ok))throw new Error('catalog');
      const catalog=await response.json();
      const sellable=(Array.isArray(catalog.services)?catalog.services:[]).filter(
        item=>item?.sellable===true&&typeof item.id==='string'
      );
      if(!fa){
        const localized=await localeResponse.json();
        if(localized?.language!=='en'||!localized.services||
          sellable.some(service=>!['title','fit','outcome','boundary'].every(
            field=>typeof localized.services[service.id]?.[field]==='string'&&
              localized.services[service.id][field].trim()
          )))throw new Error('localized_catalog_unavailable');
        englishServices=localized.services;
      }
      priceCurrency=catalog.currency;
      for(const service of sellable){
        serviceDetails.set('service:'+service.id,service);
        const option=document.createElement('option');
        option.value='service:'+service.id;
        option.textContent=titleFor(service);
        serviceLabels.set(option.value,option.textContent);
        choice.append(option);
      }
      // VIP offers use the EXISTING catalogue and server-authoritative
      // service IDs; a displayed option does not activate a payment gateway.
      try{
        const vipResponse=await fetch('/assets/data/vip-catalog.json',{
          credentials:'same-origin',cache:'reload'
        });
        if(vipResponse.ok){
          const vipCatalog=await vipResponse.json();
          for(const offer of (vipCatalog.services||[])){
            if(offer.sellable!==true||offer.checkout_enabled!==true||
               typeof offer.id!=='string'||!vipEnglish[offer.id])continue;
            const option=document.createElement('option');
            option.value='vip:'+offer.id;
            option.textContent=fa?offer.title_fa:vipEnglish[offer.id];
            serviceLabels.set(option.value,option.textContent);
            choice.append(option);
          }
        }
      }catch(_){/* ordinary services and email remain available */}
      if(requested && serviceLabels.has(requested)){
        choice.value=requested;
        say(t('خدمت مرتبط از صفحه قبل انتخاب شد. لطفاً آن را بررسی کنید و سپس رضایت را ثبت کنید.',
          'The related service was selected from your previous page. Review it before consenting.'));
      }
      choice.disabled=choice.options.length<=1;
      submit.disabled=choice.disabled;
      renderDetails();
      if(choice.disabled)say(t('فهرست خدمات اکنون در دسترس نیست؛ از مسیر ایمیل استفاده کنید.',
        'The service catalogue is unavailable; please use the email contact option.'));
    }catch(_){say(t('فهرست خدمات در دسترس نیست؛ درخواست اولیه را از طریق ایمیل ارسال کنید.',
      'The service catalogue is unavailable. You can still enquire by email.'));}
  }
  async function callApi(url,body=null){
    const response=await fetch(url,{
      method:body===null?'GET':'POST',credentials:'same-origin',cache:'no-store',
      headers:body===null?{'Accept':'application/json'}:{'Accept':'application/json','Content-Type':'application/json'},
      ...(body===null?{}:{body:JSON.stringify(body)})
    });
    const data=await response.json().catch(()=>({ok:false}));
    if(!response.ok||data.ok!==true)throw {status:response.status,code:data.error||'unavailable'};
    return data;
  }
  function describe(error){
    if(error?.status===401)return t(
      'ثبت امن نیازمند ورود به حساب دارای ایمیل تأییدشده است. می‌توانید وارد حساب شوید یا از ایمیل جایگزین استفاده کنید.',
      'Sign in with a verified email account to submit securely, or use the email contact option.');
    if(error?.status===429)return t(
      'تعداد درخواست‌های اخیر بیش از حد مجاز است؛ از ارسال مجدد سریع خودداری کنید.',
      'Too many recent enquiries. Please do not resubmit rapidly.');
    if(error?.status===409)return t(
      'درخواست قبلی این خدمت در این ماه لغو شده است. برای پیگیری ضروری از ایمیل استفاده کنید.',
      'A request for this service was withdrawn this month. Use email for essential follow-up.');
    if(error?.status===503)return t(
      'زیرساخت ثبت امن درخواست در سرور هنوز فعال یا تأیید نشده است؛ مسیر ایمیل همچنان در دسترس است.',
      'Secure account intake is currently unavailable. The email contact route remains available.');
    return t('ثبت یا مشاهده درخواست انجام نشد. بدون تأیید سرور هیچ درخواستی را ثبت‌شده فرض نکنید.',
      'The server did not confirm the request. Do not assume it was received.');
  }
  form.addEventListener('submit',async e=>{
    e.preventDefault();
    if(!form.reportValidity()||choice.disabled||!consent.checked)return;
    submit.disabled=true;
    say(t('در حال دریافت تأیید سرور…','Awaiting server confirmation…'));
    try{
      const result=await callApi('/api/growth/leads',{
        serviceId:choice.value,purpose:'CONSULTATION_CONTACT',
        consentGiven:true,consentVersion,marketingOptIn:false
      });
      say(result.duplicate
        ?t('درخواست این خدمت قبلاً در حساب شما ثبت شده است؛ ثبت تکراری انجام نشد.',
           'This service enquiry is already recorded in your account; no duplicate was created.')
        :t('درخواست با رضایت صریح شما در سرور پذیرفته شد. این تأیید به معنی رزرو، خرید یا پرداخت نیست.',
           'The server received your consented enquiry. This is not a confirmed booking, purchase or payment.'));
      consent.checked=false;
    }catch(error){say(describe(error));}
    finally{submit.disabled=false;}
  });
  // Keep every active consent record accessible without a bulk private response.
  // No browser storage or automatic follow-up is introduced.
  const more=document.createElement('button');
  more.type='button';
  more.hidden=true;
  more.textContent=t('نمایش درخواست‌های قدیمی‌تر','Show older enquiries');
  list.insertAdjacentElement('afterend',more);
  let leadCursor=null,leadGeneration=0,loadingLeads=false;
  function clearMine(){
    leadGeneration++;
    leadCursor=null;
    list.replaceChildren();
    more.hidden=true;
    mine.disabled=false;
    loadingLeads=false;
  }
  async function loadMine(next=null){
    if(loadingLeads||document.hidden)return;
    const generation=++leadGeneration;
    loadingLeads=true;
    mine.disabled=true;more.disabled=true;more.hidden=true;
    if(next===null){leadCursor=null;list.replaceChildren();}
    say(t('در حال دریافت درخواست‌های متعلق به حساب شما…',
      'Retrieving enquiries for your verified account…'));
    try{
      const data=await callApi('/api/growth/leads/mine'+
        (next===null?'':'?cursor='+encodeURIComponent(next)));
      if(generation!==leadGeneration||document.hidden)return;
      if(data.evidenceScope!=='OWNER_ONLY_NO_PAYMENT_CLAIMS'||
         !Array.isArray(data.requests)||data.requests.length>20||
         (data.nextCursor!==null&&
          (typeof data.nextCursor!=='string'||
           !/^[0-9]{1,10}:[a-f0-9-]{36}$/i.test(data.nextCursor)))||
         (data.nextCursor!==null&&data.requests.length!==20))
        throw {status:503,code:'invalid_private_page'};
      if(data.requests.length===0&&next===null){
        say(t('در این حساب، درخواست فعال و قابل مشاهده‌ای گزارش نشد.',
          'There are no visible active enquiries for this account.'));
        return;
      }
      for(const r of data.requests){
        if(typeof r.id!=='string'||!/^[a-f0-9-]{36}$/i.test(r.id)||
           typeof r.service_id!=='string'||!r.service_id.match(/^(service|vip):[A-Za-z0-9_-]{3,64}$/))
          throw {status:503,code:'invalid_private_record'};
        const entry=document.createElement('li');
        const span=document.createElement('span');
        const serviceId=r.service_id;
        const serviceTitle=serviceLabels.get(serviceId)||serviceId;
        const state=String(r.state||t('نامشخص','Unknown'));
        span.textContent=serviceTitle+' — '+state+' ';
        entry.append(span);
        if(r.state!=='WITHDRAWN'){
          const button=document.createElement('button');
          button.type='button';
          button.textContent=t('لغو رضایت این درخواست','Withdraw consent for this enquiry');
          button.addEventListener('click',async()=>{
            button.disabled=true;
            try{
              const out=await callApi('/api/growth/leads/withdraw',{leadId:r.id});
              if(out.state==='WITHDRAWN'){
                span.textContent=serviceTitle+' — WITHDRAWN ';
                button.remove();
                say(t('رضایت این درخواست لغو شد؛ داده باید طبق سیاست نگهداری پردازش شود.',
                  'Consent was withdrawn. The record remains subject to the stated retention policy.'));
              }else button.disabled=false;
            }catch(error){button.disabled=false;say(describe(error));}
          });
          entry.append(button);
        }
        list.append(entry);
      }
      leadCursor=data.nextCursor;
      more.hidden=leadCursor===null;
      say(t('نمایش '+list.children.length+' درخواست متعلق به حساب شما'+
        (leadCursor===null?'؛ پایان سوابق قابل مشاهده.':'؛ سوابق بیشتری وجود دارد.'),
        'Showing '+list.children.length+' enquiries owned by your account'+
        (leadCursor===null?'; end of visible history.':'; more history is available.')));
    }catch(error){
      if(generation!==leadGeneration||document.hidden)return;
      // On malformed or unavailable pages, do not infer an empty history.
      if(next===null)list.replaceChildren();
      leadCursor=null;
      more.hidden=true;
      say(describe(error));
    }finally{
      if(generation===leadGeneration){
        loadingLeads=false;
        mine.disabled=false;more.disabled=false;
      }
    }
  }
  mine.addEventListener('click',()=>loadMine());
  more.addEventListener('click',()=>{if(leadCursor!==null)loadMine(leadCursor)});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)clearMine()});
  window.addEventListener('pagehide',clearMine);
  loadCatalog();
})();
