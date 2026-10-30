// Dr. Javad Rezazadeh site assistant — public concierge UI.
// No private records are read. Conversation text is kept in-memory for the current page only.
(function(){
  const PRIVATE_PREFIXES=[
    '/fa/app/','/app/','/en/account/','/fa/assessments/','/assessments/',
    '/en/golden-talent/assessment/','/en/golden-talent/dashboard/','/en/golden-talent/observer/',
    '/en/golden-talent/roles/','/en/golden-talent/student/','/fa/login/','/login/','/en/login/','/fa/register/','/register/','/en/register/','/en/recover/','/fa/bazyabi-hesab/','/fa/shop/cart/','/fa/shop/checkout/','/fa/shop/payment-','/en/shop/cart/','/en/shop/checkout/','/en/shop/payment-','/shop/checkout/',
    '/en/golden-talent/checkout/','/en/golden-talent/plans/'
  ];
  const rawPath=location.pathname.replace(/index\.html$/,'');
  const gh='/drjavadrezazadeh.com/';
  const base=rawPath.includes(gh)?gh:'/';
  const route=base==='/'?rawPath:'/'+rawPath.slice(base.length);
  if(PRIVATE_PREFIXES.some(p=>route.startsWith(p))) return;

  const isFa=document.documentElement.lang==='fa';
  const endpoint=document.querySelector('meta[name="jr-assistant-endpoint"]')?.content?.trim()||'';
  // Public assistant requests may go only through this site's approved
  // same-origin API. An arbitrary metadata URL must never receive visitor
  // messages, contact details or a browser-generated correlation token.
  const trustedEndpoint=(()=>{
    try{
      if(!endpoint)return '';
      const target=new URL(endpoint,location.origin);
      return target.origin===location.origin &&
        target.pathname==='/api/assistant/v1/chat' &&
        target.search==='' && target.hash==='' ? target.href:'';
    }catch{return '';}
  })();
  const labels=isFa?{
    open:'چت‌بات JREI',title:'JREI | هوش مصنوعی سایت',subtitle:'راهنمای سایت • وضعیت اتصال در حال بررسی',
    greeting:'سلام. من JREI، دستیار اختصاصی سایت هستم. درباره خدمات، Golden Talent، پژوهش‌ها و مسیرهای آموزشی سایت می‌توانم راهنمایی‌تان کنم.',
    notice:'اطلاعات حساس یا رمز عبور نفرستید. گفتگوها به‌طور خودکار به دانش یا آموزش مدل JREI تبدیل نمی‌شوند؛ فقط اطلاعات بررسی‌شده و دارای مجوز می‌توانند وارد حافظه شوند.',
    placeholder:'سؤال‌تان را بنویسید…',send:'ارسال',close:'بستن',reset:'گفت‌وگوی جدید',copy:'کپی پاسخ',copied:'کپی شد',stop:'توقف',stopped:'پاسخ به درخواست شما متوقف شد.',thinking:'در حال بررسی…',
    error:'ارتباط زنده با دستیار هنوز برقرار نیست. می‌توانید از راهنماهای زیر استفاده کنید یا دوباره تلاش کنید.',
    reviewRequired:'JREI هنوز پاسخ قابل انتشاری دریافت نکرده است؛ ممکن است تولید پاسخ کامل نشده یا کنترل کیفیت آن را رد کرده باشد. لطفاً دوباره تلاش کنید یا از منابع بررسی‌شدهٔ سایت کمک بگیرید.',
    retry:'تلاش دوباره',offline:'راهنمای سریع',leadOpen:'درخواست تماس',leadTitle:'اگر مایلید با شما تماس بگیریم',leadEmail:'ایمیل',leadMobile:'شماره موبایل',leadValue:'راه ارتباط',leadIntent:'موضوع اصلی',leadConsent:'با ذخیره این راه ارتباط برای پاسخ‌گویی به همین درخواست موافقم.',leadWhatsApp:'اگر واتس‌اپ بیزنس فعال شود، تماس در واتس‌اپ را هم می‌پذیرم.',leadSend:'ثبت درخواست تماس',leadSaved:'درخواست تماس ثبت شد.',leadError:'ثبت درخواست تماس انجام نشد؛ لطفاً بعداً دوباره تلاش کنید.',
    chips:['برای انتخاب رشته از کجا شروع کنم؟','Golden Talent چیست؟','چه خدمات تخصصی دارید؟']
  }:{
    open:'JREI Chat',title:'JREI | Site Intelligence',subtitle:'Site guide • connection status pending',
    greeting:'Hello. I am JREI, the website’s own assistant. I can guide you through services, Golden Talent, research and educational site content.',
    notice:'Do not share sensitive information or passwords. Chats do not automatically train JREI; only reviewed and authorised knowledge may enter its memory.',
    placeholder:'Ask a question…',send:'Send',close:'Close',reset:'New chat',copy:'Copy answer',copied:'Copied',stop:'Stop',stopped:'Response stopped at your request.',thinking:'Checking…',
    error:'The live assistant is not connected yet. You can use the quick guidance below or try again.',
    reviewRequired:'JREI did not obtain a releasable answer. Generation may have been incomplete or the quality check may have rejected it. Please try again or consult reviewed site information.',
    retry:'Try again',offline:'Quick guidance',leadOpen:'Request contact',leadTitle:'Would you like us to contact you?',leadEmail:'Email',leadMobile:'Mobile',leadValue:'Contact detail',leadIntent:'Main topic',leadConsent:'I agree that this contact detail may be stored to respond to this request.',leadWhatsApp:'If WhatsApp Business is activated, I also consent to contact through WhatsApp.',leadSend:'Save contact request',leadSaved:'Your contact request has been saved.',leadError:'The contact request could not be saved. Please try again later.',
    chips:['Which service fits my needs?','What is Golden Talent?','What professional services do you offer?']
  };

  // Only PUBLIC URL context; never infer identity, learning level or private records.
  const publicContext=(()=>{
    if(/\/(?:exams|konkur-ai-lab|entekhab-reshteh|student-guidance|moshavere-tahsili)\//.test(route))
      return isFa?'آزمون‌ها و راهنمای تحصیلی':'exams and student guidance';
    if(/\/(?:akhbar|news-insights|news)\//.test(route))
      return isFa?'اخبار آموزشی':'educational news';
    if(/\/(?:golden-talent|bahar|rcas)\//.test(route))
      return isFa?'رشد و یادگیری':'learning and development';
    if(/\/(?:services)\//.test(route))
      return isFa?'خدمات تخصصی':'professional services';
    if(/\/(?:journal|publications|research)\//.test(route))
      return isFa?'پژوهش و انتشارات':'research and publications';
    return isFa?'بخش‌های عمومی سایت':'the public website';
  })();
  const contextIntroduction=isFa?
    ' اگر دربارهٔ '+publicContext+' پرسشی دارید، می‌توانم راهنمایی‌تان کنم.':
    ' I can help you explore '+publicContext+'.';
  // Local-only consent preference: NOT a server consent ledger, permission
  // to ingest transcripts, consent for minors or an activated learning pipeline.
  const CONSENT_KEY='jr.jrei.feedback-preference.v1';
  const CONSENT_POLICY='jr.jrei.feedback-notice.v1';
  const CONSENT_MAX_AGE_MS=180*24*60*60*1000;
  const readConsentPreference=()=>{
    try{
      const raw=localStorage.getItem(CONSENT_KEY);
      if(!raw)return null;
      const c=JSON.parse(raw);
      return c?.version===CONSENT_POLICY&&
        ['ACCEPTED','DECLINED'].includes(c.choice)&&
        Number.isSafeInteger(c.at)&&c.at<=Date.now()&&
        Date.now()-c.at<CONSENT_MAX_AGE_MS?c.choice:null;
    }catch{return null;}
  };
  const saveConsentPreference=choice=>{
    try{
      localStorage.setItem(CONSENT_KEY,JSON.stringify({
        version:CONSENT_POLICY,choice,at:Date.now()
      }));
    }catch(_){/* Private browsing can refuse storage: keep choice only this page. */}
  };
  const staticGreeting=isFa
    ?'سلام. من JREI هستم. اکنون راهنمای صفحات عمومی سایت فعال است؛ اتصال مدل گفت‌وگوی زنده هنوز تأیید نشده است. می‌توانید درباره خدمات و مسیرهای منتشرشده سایت سؤال کنید.'+contextIntroduction
    :'Hello, I am JREI. The public-site navigation guide is available; live AI inference has not been confirmed. Ask about published services and educational pathways.'+contextIntroduction;
  // Topic cues are derived only from the published page route.
  const liveGreeting=isFa
    ?'JREI به مدل گفت‌وگوی زنده متصل شده است. سؤال خود را مستقیم بپرسید. متن سؤال برای تولید پاسخ روی رایانهٔ پردازشی اختصاصی JREI پردازش می‌شود. پاسخ ممکن است خطا داشته باشد و تأیید علمی محسوب نمی‌شود.'
    :'JREI is connected to a live model. Ask directly. Your submitted question is processed on a dedicated JREI computer; answers may be inaccurate and are not independently scientifically validated.';
  let history=[];
  let busy=false;
  let lastQuery='';
  let activeRequest=null;
  let pendingLocalJob=null;
  let providerMode='OFFLINE_GUIDE';
  let requestGeneration=0;
  // Never create a persistent cross-visit pseudonymous identifier merely
  // for opening public guidance or voluntarily asking a question. The legacy
  // request header remains available for rate-limiting/deduplication, but is
  // now an ephemeral per-page token, erased on navigation or unload.
  let ephemeralVisitorId=null;
  function visitorId(){
    if(ephemeralVisitorId!==null)return ephemeralVisitorId;
    try{
      ephemeralVisitorId=window.crypto?.randomUUID?.()||
        ('v-'+Date.now()+'-'+Math.random().toString(36).slice(2));
    }catch(e){
      ephemeralVisitorId='v-'+Date.now()+'-'+Math.random().toString(36).slice(2);
    }
    return ephemeralVisitorId.slice(0,80);
  }
  const rootPath=p=>{
    const clean=String(p||'').replace(/^\/+/, '');
    return (base==='/'?'/':base)+clean;
  };
  const quickLinks=()=>{
    if(isFa) return [
      {label:'مشاوره تحصیلی',url:rootPath('fa/moshavere-tahsili/')},
      {label:'انتخاب رشته',url:rootPath('fa/entekhab-reshteh/')},
      {label:'Golden Talent',url:rootPath('fa/golden-talent/')},
      {label:'درخواست مشاوره',url:rootPath('fa/darkhast-moshavere/')},
      {label:'جست‌وجوی سایت',url:rootPath('fa/jostojo/')},
      {label:'جست‌وجوی مجله JHELA',url:rootPath('journal/fa/search/')},
      {label:'BAHAR؛ برنامه‌ریزی مطالعه رایگان',url:rootPath('fa/bahar/')},
      {label:'بررسی مقدماتی کارنامه',url:rootPath('fa/konkur-ai-lab/')},
      {label:'مسیر رشد و Golden Path',url:rootPath('fa/golden-talent/')}
    ];
    return [
      {label:'Student Guidance',url:rootPath('en/student-guidance/')},
      {label:'Golden Talent',url:rootPath('en/golden-talent/')},
      {label:'Services',url:rootPath('en/services/')},
      {label:'Request Consultation',url:rootPath('en/request-consultation/')},
      {label:'Search the website',url:rootPath('en/search/')},
      {label:'Search JHELA journal',url:rootPath('journal/search/')},
      {label:'BAHAR: free study planner',url:rootPath('en/bahar/')},
      {label:'Self-reported scorecard review',url:rootPath('en/student-guidance/')},
      {label:'Explore a developmental pathway',url:rootPath('en/golden-talent/')}
    ];
  };

  const wrap=document.createElement('div');
  wrap.className='jr-assistant';
  wrap.innerHTML=
    '<button class="jr-assistant-launcher" type="button" aria-expanded="false" aria-controls="jr-assistant-panel">'+
      '<span class="jr-assistant-spark" aria-hidden="true">✦</span><span>'+labels.open+'</span>'+
    '</button>'+
    '<section class="jr-assistant-panel" id="jr-assistant-panel" hidden aria-label="'+labels.title+'">'+
      '<div class="jr-assistant-head"><div><strong>'+labels.title+'</strong><small>'+labels.subtitle+'</small></div>'+
      '<div class="jr-assistant-head-actions"><button class="jr-assistant-reset" type="button">'+labels.reset+'</button>'+
      '<button class="jr-assistant-close" type="button" aria-label="'+labels.close+'">×</button></div></div>'+
      '<div class="jr-assistant-thread" role="log" aria-live="polite" aria-relevant="additions"></div>'+
      '<div class="jr-assistant-chips"></div>'+
      '<form class="jr-assistant-form"><label class="sr-only" for="jr-assistant-input">'+labels.placeholder+'</label>'+
      '<textarea id="jr-assistant-input" rows="2" maxlength="1600" placeholder="'+labels.placeholder+'"></textarea>'+
      '<div class="jr-assistant-form-actions"><button type="submit">'+labels.send+'</button>'+
      '<button type="button" class="jr-assistant-stop" hidden>'+labels.stop+'</button></div></form>'+
      '<p class="jr-assistant-privacy">'+labels.notice+'</p>'+
    '</section>';
  document.body.appendChild(wrap);

  // One gentle invitation on first PUBLIC visit; no forced modal and no
  // collection of conversations, user identity, scorecards or minors' data.
  // Actual data use needs separate server-enforced, scoped age/guardian,
  // retention/deletion, security and consent gates.
  const welcome=document.createElement('section');
  welcome.className='jr-assistant-onboarding';
  welcome.hidden=true;
  welcome.setAttribute('role','dialog');
  welcome.setAttribute('aria-modal','false');
  welcome.setAttribute('aria-label',isFa?'آشنایی با JREI و انتخاب حریم خصوصی':'Meet JREI and privacy choice');
  const welcomeHeading=document.createElement('strong');
  welcomeHeading.textContent=isFa?'سلام، من JREI هستم ✦':'Hello, I am JREI ✦';
  const welcomeCopy=document.createElement('p');
  welcomeCopy.textContent=isFa?
    'در '+publicContext+' کمکی لازم دارید؟ می‌توانید رایگان از راهنمای سایت بپرسید. اگر مایل باشید، در آینده می‌توانیم از بازخورد مجاز و بررسی‌شده برای بهترشدن JREI استفاده کنیم.':
    'Need help with '+publicContext+'? Ask the site guide for free. You may opt in to future use of permitted, reviewed feedback to improve JREI.';
  const welcomeDetails=document.createElement('details');
  const detailsTitle=document.createElement('summary');
  detailsTitle.textContent=isFa?'جزئیات حریم خصوصی و استفاده از داده':'Privacy and data-use details';
  const detailsBody=document.createElement('p');
  detailsBody.textContent=isFa?
    'انتخاب مشارکت در بهبود سامانه فقط در همین مرورگر ذخیره می‌شود و متن گفت‌وگو به‌طور خودکار برای آموزش مدل استفاده نمی‌شود. ارسال پرسش برای پاسخ‌گویی در رایانهٔ JREI پردازش می‌شود؛ استفادهٔ پژوهشی یا ذخیره‌سازی اطلاعات شخصی سیاست جداگانه دارد. لطفاً اطلاعات حساس نفرستید.':
    'Feedback preferences are stored only in this browser. Chat transcripts are not automatically used for model training or JREI memory. Submitting a question sends it for processing on a JREI computer; research use and retention of personal information are separate. Do not send sensitive details.';
  welcomeDetails.append(detailsTitle,detailsBody);
  const choiceActions=document.createElement('div');
  choiceActions.className='jr-assistant-onboarding-actions';
  const agree=document.createElement('button'),decline=document.createElement('button');
  agree.type='button';decline.type='button';
  agree.textContent=isFa?'مایلم؛ فعلاً راهنمای سایت را باز کن':'I agree; open the site guide';
  decline.textContent=isFa?'فعلاً خیر؛ ادامه بدون مشارکت':'Not now; continue without sharing';
  choiceActions.append(agree,decline);
  welcome.append(welcomeHeading,welcomeCopy,welcomeDetails,choiceActions);
  wrap.append(welcome);
  const openWelcome=()=>{welcome.hidden=false;};
  const hideWelcome=()=>{welcome.hidden=true;};
  const recordPreference=choice=>{
    saveConsentPreference(choice);
    hideWelcome();
    if(choice==='ACCEPTED'&&panel.hidden)launcher.click();
  };
  agree.addEventListener('click',()=>recordPreference('ACCEPTED'));
  decline.addEventListener('click',()=>recordPreference('DECLINED'));
  // A user may review/revoke a previous preference without withdrawing
  // their free access or changing independent cloud/local inference consent.
  const privacyChoice=document.createElement('button');
  privacyChoice.type='button';privacyChoice.className='jr-assistant-privacy-choice';
  privacyChoice.textContent=isFa?'تنظیم مشارکت در بهبود JREI':'JREI feedback preference';
  privacyChoice.addEventListener('click',openWelcome);
  wrap.querySelector('.jr-assistant-privacy').after(privacyChoice);
  let privateNoStorageChoice=null;
  // Optional feedback preference is available from the privacy button;
  // never interrupt the user with an onboarding consent popup.
  const initialPreference=readConsentPreference();
  if(initialPreference===null)welcome.hidden=true;
  // If storage is unavailable, a choice still suppresses repeated prompts
  // within the same page lifetime.
  for(const button of [agree,decline])
    button.addEventListener('click',()=>{privateNoStorageChoice=true;});

  const launcher=wrap.querySelector('.jr-assistant-launcher');
  const panel=wrap.querySelector('.jr-assistant-panel');
  const close=wrap.querySelector('.jr-assistant-close');
  const thread=wrap.querySelector('.jr-assistant-thread');
  const chips=wrap.querySelector('.jr-assistant-chips');
  const form=wrap.querySelector('.jr-assistant-form');
  const input=wrap.querySelector('textarea');
  const stopButton=wrap.querySelector('.jr-assistant-stop');
  // Actual inference is optional and cannot be switched on by a page's
  // arbitrary metadata: the same-origin server must report ready, and the
  // visitor explicitly submits a question; only OPTIONAL CLOUD needs another checkbox.
  let approvedLiveEndpoint='';
  let liveCapabilitiesChecked=false;
  const providerLabel=document.createElement('div');
  providerLabel.className='jr-assistant-provider-consent';
  providerLabel.hidden=true;
  const providerConsent=document.createElement('input');
  providerConsent.type='checkbox';
  providerConsent.checked=false;
  providerConsent.autocomplete='off';
  const providerConsentText=document.createTextNode('');
  providerLabel.append(providerConsent,providerConsentText);
  form.before(providerLabel);
  async function discoverLiveAssistant(){
    if(liveCapabilitiesChecked)return;
    liveCapabilitiesChecked=true;
    try{
      const controller=new AbortController();
      const stop=setTimeout(()=>controller.abort(),5000);
      try{
        const res=await fetch('/api/assistant/v1/capabilities',{
          method:'GET',credentials:'omit',cache:'no-store',
          headers:{Accept:'application/json'},signal:controller.signal
        });
        if(!res.ok)return;
        const policy=await res.json();
        if(policy?.schema!=='jr.jrei.assistant-capability.v1'||policy.live!==true)return;
        const mode=policy.providerMode;
        if(!['JREI_LM_LOCAL_WINDOWS','OPTIONAL_OPENAI'].includes(mode)||
           (mode==='OPTIONAL_OPENAI'&&policy.providerConsentRequired!==true))return;
        providerMode=mode;
        approvedLiveEndpoint=location.origin+'/api/assistant/v1/chat';
        providerConsent.hidden=mode==='JREI_LM_LOCAL_WINDOWS';
        providerConsent.checked=false;
        providerConsentText.textContent=mode==='JREI_LM_LOCAL_WINDOWS'
          ?(isFa?
            ' با ارسال سؤال، متن آن روی رایانهٔ پردازشی اختصاصی JREI پردازش می‌شود. پاسخ ممکن است خطا داشته باشد و اعتبار علمی مستقل ندارد. لطفاً اطلاعات حساس نفرستید. مکالمه به‌طور خودکار برای آموزش مدل استفاده نمی‌شود.':
            ' Submitting your question sends it to a dedicated JREI computer for a response. Answers may be inaccurate and are not independently scientifically validated. Do not share sensitive information; messages are not automatically used to train the model.')
          :(isFa?
            ' استفاده اختیاری از مدل ابری؛ متن گفت‌وگو برای پردازش به ارائه‌دهندهٔ API خارجی ارسال می‌شود.':
            ' Optional external-cloud AI: this conversation is sent to an external API provider for processing.');
        providerLabel.hidden=false;
        // Update only the untouched welcome message: never change
        // an answer to a real visitor or create a false ready state.
        if(thread.childElementCount===1&&
           thread.firstElementChild?.classList.contains('is-assistant')&&
           !history.length&&!busy){
          const welcome=thread.firstElementChild.querySelector('.jr-assistant-bubble');
          if(welcome&&welcome.textContent===staticGreeting)
            welcome.textContent=liveGreeting;
        }
      }finally{clearTimeout(stop);}
    }catch(_){
      // Offline or unaccepted providers retain local, no-network guidance.
      approvedLiveEndpoint='';providerMode='OFFLINE_GUIDE';providerLabel.hidden=true;
    }
  }
  const leadEndpoint=trustedEndpoint?trustedEndpoint.replace(/\/v1\/chat$/,'/v1/leads'):'';
  const leadBox=document.createElement('div');
  leadBox.className='jr-assistant-lead';
  leadBox.innerHTML='<button class="jr-assistant-lead-toggle" type="button">'+labels.leadOpen+'</button>'+
    '<form class="jr-assistant-lead-form" hidden>'+
      '<strong>'+labels.leadTitle+'</strong>'+
      '<label>'+labels.leadValue+'<select name="contact_type"><option value="EMAIL">'+labels.leadEmail+'</option><option value="MOBILE">'+labels.leadMobile+'</option></select></label>'+
      '<label><input name="contact_value" type="email" autocomplete="email" maxlength="180" required placeholder="name@example.com"></label>'+
      '<label>'+labels.leadIntent+'<select name="intent"><option value="GENERAL">General</option><option value="ACADEMIC_COUNSELLING">Academic counselling</option><option value="FIELD_SELECTION">Field / major selection</option><option value="GOLDEN_TALENT">Golden Talent</option><option value="LANGUAGE_EDUCATION">Language education</option><option value="COLLABORATION">Academic collaboration</option></select></label>'+
      '<label class="jr-assistant-check"><input name="contact_consent" type="checkbox" required><span>'+labels.leadConsent+'</span></label>'+
      '<label class="jr-assistant-check jr-assistant-whatsapp" hidden><input name="whatsapp_opt_in" type="checkbox"><span>'+labels.leadWhatsApp+'</span></label>'+
      '<button class="jr-assistant-lead-submit" type="submit">'+labels.leadSend+'</button>'+
      '<small class="jr-assistant-lead-status" role="status" aria-live="polite"></small>'+
    '</form>';
  form.before(leadBox);
  if(!endpoint) leadBox.hidden=true;
  if(!leadEndpoint) leadBox.hidden=true;
  const leadToggle=leadBox.querySelector('.jr-assistant-lead-toggle');
  const leadForm=leadBox.querySelector('.jr-assistant-lead-form');
  const leadType=leadForm.elements.contact_type;
  const leadValue=leadForm.elements.contact_value;
  const whatsappRow=leadBox.querySelector('.jr-assistant-whatsapp');
  const leadStatus=leadBox.querySelector('.jr-assistant-lead-status');
  leadToggle.addEventListener('click',()=>{leadForm.hidden=!leadForm.hidden;if(!leadForm.hidden)leadValue.focus();});
  leadType.addEventListener('change',()=>{
    const mobile=leadType.value==='MOBILE';
    leadValue.type=mobile?'tel':'email';leadValue.inputMode=mobile?'tel':'email';leadValue.autocomplete=mobile?'tel':'email';
    leadValue.placeholder=mobile?'+98912…':'name@example.com';whatsappRow.hidden=!mobile;
    if(!mobile) leadForm.elements.whatsapp_opt_in.checked=false;
  });
  leadForm.addEventListener('submit',async e=>{
    e.preventDefault();leadStatus.textContent='';
    const payload={contact_type:leadType.value,contact_value:String(leadValue.value||'').trim(),intent:leadForm.elements.intent.value,contact_consent:leadForm.elements.contact_consent.checked===true,whatsapp_opt_in:leadForm.elements.whatsapp_opt_in.checked===true,locale:isFa?'fa':'en',source_route:route||'/'};
    const submit=leadBox.querySelector('.jr-assistant-lead-submit');submit.disabled=true;
    try{
      const res=await fetch(leadEndpoint,{method:'POST',mode:'cors',credentials:'omit',headers:{'Content-Type':'application/json','X-JR-Visitor':visitorId()},body:JSON.stringify(payload)});
      if(!res.ok) throw new Error('lead '+res.status);
      leadStatus.textContent=labels.leadSaved;leadForm.reset();leadType.dispatchEvent(new Event('change'));
    }catch(err){leadStatus.textContent=labels.leadError;}
    finally{submit.disabled=false;}
  });
  leadType.dispatchEvent(new Event('change'));

  function addMessage(role,text,links=[]){
    const item=document.createElement('div');
    item.className='jr-assistant-message '+(role==='user'?'is-user':'is-assistant');
    const body=document.createElement('div');
    body.className='jr-assistant-bubble';
    body.textContent=String(text||'');
    item.appendChild(body);
    if(role!=='user'){
      const actions=document.createElement('div');
      actions.className='jr-assistant-message-actions';
      const copy=document.createElement('button');
      copy.type='button';copy.className='jr-assistant-copy';
      copy.textContent=labels.copy;
      copy.addEventListener('click',async()=>{
        try{
          if(!navigator.clipboard?.writeText)return;
          await navigator.clipboard.writeText(body.textContent||'');
          copy.textContent=labels.copied;
        }catch(_){copy.textContent=labels.copy;}
      });
      actions.appendChild(copy);
      item.appendChild(actions);
    }
    if(Array.isArray(links)&&links.length){
      const list=document.createElement('div');
      list.className='jr-assistant-links';
      links.slice(0,4).forEach(link=>{
        if(!link?.url||!link?.label) return;
        // Reject script/data URLs in both local and remote assistant link payloads.
        let safeUrl;
        try{
          const target=new URL(link.url,location.origin);
          if(!['http:','https:'].includes(target.protocol))return;
          if(target.origin===location.origin&&PRIVATE_PREFIXES.some(p=>target.pathname.startsWith(p)))return;
          safeUrl=target.href;
        }catch(_){return;}
        const a=document.createElement('a');
        a.href=safeUrl;
        if(new URL(safeUrl).origin!==location.origin){a.target='_blank';a.rel='noopener noreferrer';}
        a.textContent=link.label;
        list.appendChild(a);
      });
      item.appendChild(list);
    }
    thread.appendChild(item);
    thread.scrollTop=thread.scrollHeight;
  }

  function fallback(query){
    const q=String(query||'').toLowerCase();
    const links=quickLinks();
    // When no API is configured, retain accurate directory-based guidance,
    // not a fake generated answer or a fabricated booking/price.
    if(isFa){
      if(/(?:تو|شما).{0,24}(?:کی|چی|هستی|هستید)|(?:کی|چی) هستی|خودت.{0,15}معرفی|معرفی.{0,15}خودت|jrei.*(?:چی|کی)|(?:چی|کی).*jrei/.test(q))
        return {answer:'من JREI، دستیار اختصاصی سایت هستم. در حال حاضر می‌توانم شما را به راهنماها و خدمات منتشرشده هدایت کنم. گفت‌وگوی زنده با مدل هوش مصنوعی هنوز فعال یا تأیید نشده است.',links:[links[0],links[4]]};
      if(/پاسخ.{0,18}داور|کامنت.{0,18}داور|داور.{0,18}پاسخ/.test(q))
        return {answer:'برای تهیه پاسخ مستند به نظرات داوران، خدمت «پشتیبانی پاسخ به داوران» در سایت معرفی شده است. محدوده و شرایط را در صفحه خدمت بررسی کنید.',links:[{label:'پشتیبانی پاسخ به داوران',url:rootPath('fa/services/reviewer_response/')}]};
      if(/ویراستاری|ویرایش.{0,25}(?:انگلیسی|مقاله|متن)/.test(q))
        return {answer:'برای پالایش زبانی مقاله یا متن انگلیسی دانشگاهی، صفحه خدمت ویرایش انگلیسی را ببینید. کیفیت و نتیجه چاپ تضمین نمی‌شود.',links:[{label:'ویرایش انگلیسی دانشگاهی',url:rootPath('fa/services/academic_editing/')}]};
      if(/مصاحبه.{0,25}(?:هیئت|هیات|علمی|دانشگاه)/.test(q))
        return {answer:'برای آمادگی مصاحبه دانشگاهی یا هیئت علمی، خدمت اختصاصی موجود است. جزئیات و شرایط را در صفحه رسمی خدمت بخوانید.',links:[{label:'آمادگی مصاحبه علمی',url:rootPath('fa/services/academic_interview_90/')}]};
      if(/خدمت|خدمات|سفارش|رزرو|چه مشاوره|مشاوره تخصصی/.test(q))
        return {answer:'فهرست خدمات واقعی سایت شامل راهنمایی تحصیلی، خدمات پژوهشی، ویرایش مقاله و توسعه حرفه‌ای است. نوع نیازتان را مشخص کنید تا مسیر مناسب را انتخاب کنید؛ برای قیمت و شرایط به صفحه هر خدمت مراجعه کنید.',links:[{label:'فهرست خدمات تخصصی',url:rootPath('fa/services/')},links[3]]};
      if(/مجله|ژورنال|داور|داوری|jhela|journal/.test(q)) return {answer:'JHELA در مرحله تأسیس است. می‌توانید سیاست‌های عمومی و فراخوان‌های داوری را در جست‌وجوی اختصاصی مجله بررسی کنید. این پاسخ به معنای فعال‌بودن پذیرش رسمی مقاله یا نمایه‌شدن مجله نیست.',links:[links[5]]};
       if(/جست.?وجو|جستجو|پیدا کردن|سرچ/.test(q)) return {answer:'برای پیدا کردن صفحات عمومی از جست‌وجوی فارسی سایت استفاده کنید. اطلاعات حساب و پرونده‌های خصوصی در نتایج جست‌وجو نمایش داده نمی‌شوند.',links:[links[4]]};
       if(/کارنامه|تراز|درصد|رتبه|قلم.?چی|گاج|آزمون آزمایشی/.test(q)) return {answer:'برای شروع، از بررسی مقدماتی کارنامه استفاده کنید. رتبه و تراز خوداظهاری یا آزمون آزمایشی به احتمال قبولی و رتبه رسمی تبدیل نمی‌شود؛ داده رسمی و مجازبودن باید جداگانه بررسی شود.',links:[links[7],links[1]]};
       if(/مطالعه|درس.?خواندن|برنامه.?ریزی|یادگیری|باهار|bahar/.test(q)) return {answer:'برنامه رایگان BAHAR برای هدف‌گذاری، مرور و بازنگری در برنامه مطالعه در دسترس است. محتوای شخصی فقط با انتخاب جداگانه شما برای ذخیره بررسی می‌شود.',links:[links[6]]};
       if(/مقایسه|دو مسیر|دو رشته|ماتریس تصمیم/.test(q)) return {answer:'برای مقایسه توصیفی دو مسیر، استودیوی پنج‌معیاری انتخاب را باز کنید. شاخص‌ها صرفاً بازتاب اهمیت‌ها و ارزیابی‌های خود شما هستند و قبولی یا استعداد را پیش‌بینی نمی‌کنند.',links:[links[1],links[3]]};
       if(/مسیر رشد|مسیر طلایی|golden path|توسعه فردی/.test(q)) return {answer:'برای مسیر رشد از راهنمای Golden Talent شروع کنید. نتیجه معتبر شخصی و انتشار حرفه‌ای به شواهد و بررسی انسانی مستقل نیاز دارد.',links:[links[8]]};
       if(/انتخاب رشته|رشته|کنکور/.test(q)) return {answer:'برای تصمیم‌گیری درباره رشته، از صفحه «انتخاب رشته» و راهنماهای مرتبط شروع کنید. اگر مسئله شما نیازمند بررسی فردی است، درخواست مشاوره ثبت کنید.',links:[links[1],links[3]]};
      if(/استعداد|golden|گلدن|توانمندی/.test(q)) return {answer:'Golden Talent چارچوب رشدگرا و چندمنبعی سایت برای شناخت شواهد مرتبط با توانمندی و مسیر رشد است. برای آشنایی عمومی وارد صفحه Golden Talent شوید.',links:[links[2],links[3]]};
      return {answer:'من JREI هستم. این بخش فعلاً راهنمای سایت است و پاسخ آزاد هوش مصنوعی هنوز فعال نیست. می‌توانید از پیوندهای زیر استفاده کنید یا درباره یکی از خدمات سایت بپرسید.',links};
    }
    if(/who are you|what are you|introduce yourself|tell me about yourself|what is jrei/.test(q))
      return {answer:'I am JREI, this website’s own assistant. I can currently help you navigate published educational information and services. A live language-model conversation is not yet enabled or verified.',links:[links[0],links[4]]};
    if(/reviewer.{0,18}(?:response|comments)|response.{0,18}reviewer/.test(q))
      return {answer:'Reviewer-response support is listed among the published services. Check the service page for scope and conditions; this is not a submission or publication guarantee.',links:[{label:'Reviewer-response support',url:rootPath('en/services/reviewer_response/')}]};
    if(/academic.{0,18}edit|english.{0,18}edit|proofread/.test(q))
      return {answer:'For academic English editing, the published service page sets out the available scope. Publication or acceptance cannot be guaranteed.',links:[{label:'Academic English editing',url:rootPath('en/services/academic_editing/')}]};
    if(/faculty.{0,18}interview|academic.{0,18}interview/.test(q))
      return {answer:'Academic interview preparation is available as a listed service. See the official page for its scope and requirements.',links:[{label:'Academic interview preparation',url:rootPath('en/services/academic_interview_90/')}]};
    if(/services?|book(?:ing)?|professional consultation|specialist support|pricing/.test(q))
      return {answer:'The site lists academic, educational, research and teacher-development services. Browse the published service descriptions to choose what fits your needs; pricing and booking must be confirmed on the respective page.',links:[links[2],links[3]]};
    if(/jhela|journal|peer.review|reviewer|manuscript/.test(q)) return {answer:'JHELA is in its founding stage. Its separate public journal search covers published policies and calls, not private manuscript records. Formal intake and indexing must be verified independently.',links:[links[5]]};
    if(/find|search|look up|lookup/.test(q)) return {answer:'Use the public website search to find services, publications and guidance; personal account records are excluded.',links:[links[4]]};
    if(/scorecard|mock.exam|taz|exam.rank|quota|result|exam.score/.test(q)) return {answer:'Use the manual scorecard worksheet as a preliminary, self-reported review. Provider TAZ and mock ranks are not official admissions probabilities or verified national ranks.',links:[links[7],links[0]]};
    if(/study|learning|revision|weekly plan|practice|bahar/.test(q)) return {answer:'BAHAR provides a free study-planning starting point. Saving a private plan is an independent, optional consent-based step, not a prerequisite for free guidance.',links:[links[6]]};
    if(/compare|two pathways|two majors|decision matrix/.test(q)) return {answer:'Compare two pathways in the existing five-criterion Choice Studio. Its figures reflect only your own priorities and ratings; they do not predict admissions or assess aptitude.',links:[links[0],links[3]]};
    if(/golden path|growth pathway|development pathway/.test(q)) return {answer:'Start with the Golden Talent public framework for a developmental pathway. Validated individual conclusions or professional release require independently reviewed evidence.',links:[links[8]]};
    if(/major|career|student|guidance/.test(q)) return {answer:'Start with Student Guidance for educational and major-exploration questions. If you need individual review, use the consultation request route.',links:[links[0],links[3]]};
    if(/talent|golden|strength/.test(q)) return {answer:'Golden Talent is the site’s developmental, multi-source framework for exploring student strengths and pathways. The public page explains the method and its limits.',links:[links[1],links[3]]};
    return {answer:'I am JREI, the public website guide. Live AI inference is not yet available here. You can use the links below or ask about published services and educational routes.',links};
  }

  const cancelLocalJob=()=>{
    const job=pendingLocalJob;
    pendingLocalJob=null;
    if(!job)return;
    // The short-lived capability is held in memory only, never localStorage.
    void fetch('/api/assistant/v1/local/cancel',{
      method:'POST',credentials:'omit',cache:'no-store',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(job),keepalive:true
    }).catch(()=>{});
  };
  async function awaitLocalResult(data,controller,requestToken){
    if(data?.pending!==true||data?.runtime!=='JREI_LOCAL_INFERENCE_PENDING')
      return data;
    if(!/^[a-f0-9-]{36}$/.test(data.jobId||'')||
       !/^[a-f0-9]{64}$/.test(data.retrievalToken||''))
      throw Error('Invalid JREI local queue capability');
    pendingLocalJob={jobId:data.jobId,retrievalToken:data.retrievalToken};
    // Respect the Bertina queue's retry interval rather than issuing
    // fixed 1.5-second database reads. Stop timers immediately on user
    // cancellation; do not leak an abandoned polling loop into a new chat.
    const boundedDelay=value=>
      Number.isInteger(value)?Math.max(1500,Math.min(6000,value)):2500;
    let delay=boundedDelay(data.retryAfterMilliseconds);
    const deadline=Date.now()+70000;
    while(Date.now()<deadline){
      const remaining=deadline-Date.now();
      await new Promise((resolve,reject)=>{
        if(controller.signal.aborted){reject(Error('JREI request cancelled'));return;}
        const wake=()=>{clearTimeout(timer);controller.signal.removeEventListener('abort',abort);resolve();};
        const abort=()=>{clearTimeout(timer);controller.signal.removeEventListener('abort',abort);reject(Error('JREI request cancelled'));};
        const timer=setTimeout(wake,Math.min(delay,remaining));
        controller.signal.addEventListener('abort',abort,{once:true});
      });
      if(controller.signal.aborted||requestToken!==requestGeneration)
        return null;
      if(Date.now()>=deadline)break;
      const res=await fetch('/api/assistant/v1/local/result',{
        method:'POST',credentials:'omit',cache:'no-store',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify(pendingLocalJob),signal:controller.signal
      });
      if(!res.ok)throw Error('Local JREI result '+res.status);
      const next=await res.json();
      if(next?.pending===true){
        delay=boundedDelay(next.retryAfterMilliseconds);
        continue;
      }
      pendingLocalJob=null;
      if(next?.unavailable===true)throw Error(next.reviewRequired===true?
        'JREI_QUALITY_REVIEW_REQUIRED':'JREI_LOCAL_RESULT_UNAVAILABLE');
      return next;
    }
    throw Error('JREI local inference wait exceeded');
  };
  async function ask(message){
    if(busy||!message.trim()) return;
    const chatEndpoint=providerMode==='JREI_LM_LOCAL_WINDOWS'?
      approvedLiveEndpoint:(providerConsent.checked?approvedLiveEndpoint:'');
    if(!chatEndpoint){
      addMessage('user',message.trim());
      const local=fallback(message.trim());
      addMessage('assistant',local.answer,local.links);
      return;
    }
    busy=true;lastQuery=message.trim();stopButton.hidden=false;
    const requestToken=++requestGeneration;
    let controller=null,timer=null;
    input.disabled=true;
    form.querySelector('button').disabled=true;
    addMessage('user',lastQuery);
    const pending=document.createElement('div');
    pending.className='jr-assistant-message is-assistant is-pending';
    pending.innerHTML='<div class="jr-assistant-bubble">'+labels.thinking+'</div>';
    thread.appendChild(pending);
    thread.scrollTop=thread.scrollHeight;
    try{
      controller=new AbortController();
      activeRequest=controller;
      timer=setTimeout(()=>controller.abort(),providerMode==='JREI_LM_LOCAL_WINDOWS'?78000:30000);
      const res=await fetch(chatEndpoint,{
        method:'POST',
        mode:'cors',
        credentials:'omit',
        headers:{'Content-Type':'application/json','X-JR-Visitor':visitorId()},
        body:JSON.stringify({
          message:lastQuery,
          ...(providerMode==='OPTIONAL_OPENAI'?{providerConsent:true}:{}),
          history:history.slice(-8),
          page:{path:route||'/',title:document.title,lang:isFa?'fa':'en'}
        }),
        signal:controller.signal
      });
      if(!res.ok) throw new Error('assistant '+res.status);
      let data=await res.json();
      if(providerMode==='JREI_LM_LOCAL_WINDOWS')
        data=await awaitLocalResult(data,controller,requestToken);
      if(requestToken!==requestGeneration||document.hidden)return;
      if(!data?.answer) throw new Error('assistant empty');
      pending.remove();
      addMessage('assistant',data.answer,data.links||[]);
      history.push({role:'user',content:lastQuery.slice(0,800)},{role:'assistant',content:String(data.answer).slice(0,800)});
      history=history.slice(-8);
    }catch(e){
      cancelLocalJob();
      pending.remove();
      if(requestToken===requestGeneration&&!document.hidden){
        const f=fallback(lastQuery);
        addMessage('assistant',e?.message==='JREI_QUALITY_REVIEW_REQUIRED'?
          labels.reviewRequired:f.answer,
          e?.message==='JREI_QUALITY_REVIEW_REQUIRED'?quickLinks():f.links);
      }
    }finally{
      if(timer!==null)clearTimeout(timer);
      if(activeRequest===controller)activeRequest=null;
      if(requestToken===requestGeneration){
        busy=false;stopButton.hidden=true;input.disabled=false;form.querySelector('button').disabled=false;
        if(!panel.hidden&&!document.hidden)input.focus();
      }
    }
  }

  stopButton.addEventListener('click',()=>{
    if(!busy)return;
    // Invalidate the response BEFORE aborting: an older request must never
    // append output into a newer or user-cancelled conversation.
    requestGeneration++;
    activeRequest?.abort();
    activeRequest=null;
    cancelLocalJob();
    busy=false;
    stopButton.hidden=true;
    input.disabled=false;
    form.querySelector('button').disabled=false;
    addMessage('assistant',labels.stopped);
    if(!panel.hidden&&!document.hidden)input.focus();
  });

  labels.chips.forEach(text=>{
    const b=document.createElement('button');b.type='button';b.textContent=text;
    b.addEventListener('click',()=>ask(text));chips.appendChild(b);
  });
  launcher.addEventListener('click',()=>{
    const opening=panel.hidden;
    panel.hidden=!opening;launcher.setAttribute('aria-expanded',opening?'true':'false');
    if(opening){
      discoverLiveAssistant();
      if(!thread.childElementCount)
        addMessage('assistant',approvedLiveEndpoint?liveGreeting:staticGreeting);
      setTimeout(()=>input.focus(),30);
    }
  });
  close.addEventListener('click',()=>{
    // Closing the private conversation revokes the in-memory capability
    // and cancels an active GGUF lease; hiding alone wastes Windows CPU.
    clearEphemeralAssistant();
    launcher.focus();
  });
  const clearEphemeralAssistant=(keepOpen=false)=>{
    // Backgrounded mobile PWAs must not keep private text visible in a
    // resumable tab or accept late async responses after a user leaves.
    requestGeneration++;
    activeRequest?.abort();activeRequest=null;
    cancelLocalJob();
    history=[];lastQuery='';busy=false;ephemeralVisitorId=null;
    providerConsent.checked=false;
    thread.replaceChildren();input.value='';input.disabled=false;stopButton.hidden=true;
    form.querySelector('button').disabled=false;
    panel.hidden=!keepOpen;launcher.setAttribute('aria-expanded',keepOpen?'true':'false');
    if(keepOpen){addMessage('assistant',approvedLiveEndpoint?liveGreeting:staticGreeting);input.focus();}
  };
  wrap.querySelector('.jr-assistant-reset').addEventListener('click',()=>clearEphemeralAssistant(true));
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden)clearEphemeralAssistant();
  });
  window.addEventListener('pagehide',clearEphemeralAssistant);
  form.addEventListener('submit',e=>{e.preventDefault();const q=input.value.trim();if(!q)return;input.value='';ask(q);});
  input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();form.requestSubmit();}});
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&!panel.hidden){
      clearEphemeralAssistant();
      launcher.focus();
    }
  });
})();
