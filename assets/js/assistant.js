// Dr. Javad Rezazadeh site assistant — public concierge UI.
// No private records are read. Conversation text is kept in-memory for the current page only.
(function(){
  const PRIVATE_PREFIXES=[
    '/fa/app/','/app/','/en/account/','/fa/assessments/','/assessments/',
    '/en/golden-talent/assessment/','/en/golden-talent/dashboard/','/en/golden-talent/observer/',
    '/en/golden-talent/roles/','/en/golden-talent/student/','/fa/login/','/login/','/en/login/','/fa/register/','/register/','/en/register/','/en/recover/','/fa/bazyabi-hesab/','/fa/shop/','/en/shop/','/shop/',
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
    open:'دستیار هوشمند',title:'دستیار دکتر رضازاده',subtitle:'راهنمای هوشمند سایت',
    greeting:'سلام. من دستیار هوشمند سایت دکتر رضازاده هستم. درباره خدمات، Golden Talent، انتخاب رشته، پژوهش‌ها و مسیرهای سایت می‌توانم راهنمایی‌تان کنم.',
    notice:'اطلاعات حساس، مدارک هویتی، پرونده پزشکی، رمز عبور یا اطلاعات پرداخت را در این گفتگو ارسال نکنید.',
    placeholder:'سؤال‌تان را بنویسید…',send:'ارسال',close:'بستن',thinking:'در حال بررسی…',
    error:'ارتباط زنده با دستیار هنوز برقرار نیست. می‌توانید از راهنماهای زیر استفاده کنید یا دوباره تلاش کنید.',
    retry:'تلاش دوباره',offline:'راهنمای سریع',leadOpen:'درخواست تماس',leadTitle:'اگر مایلید با شما تماس بگیریم',leadEmail:'ایمیل',leadMobile:'شماره موبایل',leadValue:'راه ارتباط',leadIntent:'موضوع اصلی',leadConsent:'با ذخیره این راه ارتباط برای پاسخ‌گویی به همین درخواست موافقم.',leadWhatsApp:'اگر واتس‌اپ بیزنس فعال شود، تماس در واتس‌اپ را هم می‌پذیرم.',leadSend:'ثبت درخواست تماس',leadSaved:'درخواست تماس ثبت شد.',leadError:'ثبت درخواست تماس انجام نشد؛ لطفاً بعداً دوباره تلاش کنید.',
    chips:['برای انتخاب رشته از کجا شروع کنم؟','Golden Talent چیست؟','چطور مشاوره بگیرم؟']
  }:{
    open:'AI Assistant',title:'Dr. Rezazadeh Assistant',subtitle:'Smart site guide',
    greeting:'Hello. I am the AI assistant for Dr. Rezazadeh’s website. I can guide you through services, Golden Talent, student guidance, research and the site.',
    notice:'Please do not share identity documents, medical records, passwords, payment details or other sensitive personal information here.',
    placeholder:'Ask a question…',send:'Send',close:'Close',thinking:'Checking…',
    error:'The live assistant is not connected yet. You can use the quick guidance below or try again.',
    retry:'Try again',offline:'Quick guidance',leadOpen:'Request contact',leadTitle:'Would you like us to contact you?',leadEmail:'Email',leadMobile:'Mobile',leadValue:'Contact detail',leadIntent:'Main topic',leadConsent:'I agree that this contact detail may be stored to respond to this request.',leadWhatsApp:'If WhatsApp Business is activated, I also consent to contact through WhatsApp.',leadSend:'Save contact request',leadSaved:'Your contact request has been saved.',leadError:'The contact request could not be saved. Please try again later.',
    chips:['Which service fits my needs?','What is Golden Talent?','How do I request consultation?']
  };

  const staticGreeting=isFa
    ?'سلام. فعلاً راهنمای محلی سایت در دسترس است. بر اساس مسیرهای عمومی منتشرشده به شما کمک می‌کنم موضوعتان را پیدا کنید؛ مدل گفت‌وگوی زنده و پاسخ مبتنی بر پرونده شخصی در این بخش فعال یا تأیید نشده است.'
    :'Hello. The public site guide is available. It can point you to published educational routes and their limitations; a live conversational model and private-record answers are not activated or verified here.';
  let history=[];
  let busy=false;
  let lastQuery='';
  let activeRequest=null;
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
      '<button class="jr-assistant-close" type="button" aria-label="'+labels.close+'">×</button></div>'+
      '<div class="jr-assistant-thread" role="log" aria-live="polite" aria-relevant="additions"></div>'+
      '<div class="jr-assistant-chips"></div>'+
      '<form class="jr-assistant-form"><label class="sr-only" for="jr-assistant-input">'+labels.placeholder+'</label>'+
      '<textarea id="jr-assistant-input" rows="2" maxlength="1600" placeholder="'+labels.placeholder+'"></textarea>'+
      '<button type="submit">'+labels.send+'</button></form>'+
      '<p class="jr-assistant-privacy">'+labels.notice+'</p>'+
    '</section>';
  document.body.appendChild(wrap);

  const launcher=wrap.querySelector('.jr-assistant-launcher');
  const panel=wrap.querySelector('.jr-assistant-panel');
  const close=wrap.querySelector('.jr-assistant-close');
  const thread=wrap.querySelector('.jr-assistant-thread');
  const chips=wrap.querySelector('.jr-assistant-chips');
  const form=wrap.querySelector('.jr-assistant-form');
  const input=wrap.querySelector('textarea');
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
    if(isFa){
      if(/مجله|ژورنال|داور|داوری|jhela|journal/.test(q)) return {answer:'JHELA در مرحله تأسیس است. می‌توانید سیاست‌های عمومی و فراخوان‌های داوری را در جست‌وجوی اختصاصی مجله بررسی کنید. این پاسخ به معنای فعال‌بودن پذیرش رسمی مقاله یا نمایه‌شدن مجله نیست.',links:[links[5]]};
       if(/جست.?وجو|جستجو|پیدا کردن|سرچ/.test(q)) return {answer:'برای پیدا کردن صفحات عمومی از جست‌وجوی فارسی سایت استفاده کنید. اطلاعات حساب و پرونده‌های خصوصی در نتایج جست‌وجو نمایش داده نمی‌شوند.',links:[links[4]]};
       if(/کارنامه|تراز|درصد|رتبه|قلم.?چی|گاج|آزمون آزمایشی/.test(q)) return {answer:'برای شروع، از بررسی مقدماتی کارنامه استفاده کنید. رتبه و تراز خوداظهاری یا آزمون آزمایشی به احتمال قبولی و رتبه رسمی تبدیل نمی‌شود؛ داده رسمی و مجازبودن باید جداگانه بررسی شود.',links:[links[7],links[1]]};
       if(/مطالعه|درس.?خواندن|برنامه.?ریزی|یادگیری|باهار|bahar/.test(q)) return {answer:'برنامه رایگان BAHAR برای هدف‌گذاری، مرور و بازنگری در برنامه مطالعه در دسترس است. محتوای شخصی فقط با انتخاب جداگانه شما برای ذخیره بررسی می‌شود.',links:[links[6]]};
       if(/مقایسه|دو مسیر|دو رشته|ماتریس تصمیم/.test(q)) return {answer:'برای مقایسه توصیفی دو مسیر، استودیوی پنج‌معیاری انتخاب را باز کنید. شاخص‌ها صرفاً بازتاب اهمیت‌ها و ارزیابی‌های خود شما هستند و قبولی یا استعداد را پیش‌بینی نمی‌کنند.',links:[links[1],links[3]]};
       if(/مسیر رشد|مسیر طلایی|golden path|توسعه فردی/.test(q)) return {answer:'برای مسیر رشد از راهنمای Golden Talent شروع کنید. نتیجه معتبر شخصی و انتشار حرفه‌ای به شواهد و بررسی انسانی مستقل نیاز دارد.',links:[links[8]]};
       if(/انتخاب رشته|رشته|کنکور/.test(q)) return {answer:'برای تصمیم‌گیری درباره رشته، از صفحه «انتخاب رشته» و راهنماهای مرتبط شروع کنید. اگر مسئله شما نیازمند بررسی فردی است، درخواست مشاوره ثبت کنید.',links:[links[1],links[3]]};
      if(/استعداد|golden|گلدن|توانمندی/.test(q)) return {answer:'Golden Talent چارچوب رشدگرا و چندمنبعی سایت برای شناخت شواهد مرتبط با توانمندی و مسیر رشد است. برای آشنایی عمومی وارد صفحه Golden Talent شوید.',links:[links[2],links[3]]};
      return {answer:labels.error,links};
    }
    if(/jhela|journal|peer.review|reviewer|manuscript/.test(q)) return {answer:'JHELA is in its founding stage. Its separate public journal search covers published policies and calls, not private manuscript records. Formal intake and indexing must be verified independently.',links:[links[5]]};
    if(/find|search|look up|lookup/.test(q)) return {answer:'Use the public website search to find services, publications and guidance; personal account records are excluded.',links:[links[4]]};
    if(/scorecard|mock.exam|taz|exam.rank|quota|result|exam.score/.test(q)) return {answer:'Use the manual scorecard worksheet as a preliminary, self-reported review. Provider TAZ and mock ranks are not official admissions probabilities or verified national ranks.',links:[links[7],links[0]]};
    if(/study|learning|revision|weekly plan|practice|bahar/.test(q)) return {answer:'BAHAR provides a free study-planning starting point. Saving a private plan is an independent, optional consent-based step, not a prerequisite for free guidance.',links:[links[6]]};
    if(/compare|two pathways|two majors|decision matrix/.test(q)) return {answer:'Compare two pathways in the existing five-criterion Choice Studio. Its figures reflect only your own priorities and ratings; they do not predict admissions or assess aptitude.',links:[links[0],links[3]]};
    if(/golden path|growth pathway|development pathway/.test(q)) return {answer:'Start with the Golden Talent public framework for a developmental pathway. Validated individual conclusions or professional release require independently reviewed evidence.',links:[links[8]]};
    if(/major|career|student|guidance/.test(q)) return {answer:'Start with Student Guidance for educational and major-exploration questions. If you need individual review, use the consultation request route.',links:[links[0],links[3]]};
    if(/talent|golden|strength/.test(q)) return {answer:'Golden Talent is the site’s developmental, multi-source framework for exploring student strengths and pathways. The public page explains the method and its limits.',links:[links[1],links[3]]};
    return {answer:labels.error,links};
  }

  async function ask(message){
    if(busy||!message.trim()) return;
    if(!endpoint){
      addMessage('user',message.trim());
      const local=fallback(message.trim());
      addMessage('assistant',local.answer,local.links);
      return;
    }
    if(!trustedEndpoint){
      addMessage('user',message.trim());
      const local=fallback(message.trim());
      addMessage('assistant',local.answer,local.links);
      return;
    }
    busy=true;lastQuery=message.trim();
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
      timer=setTimeout(()=>controller.abort(),30000);
      const res=await fetch(trustedEndpoint,{
        method:'POST',
        mode:'cors',
        credentials:'omit',
        headers:{'Content-Type':'application/json','X-JR-Visitor':visitorId()},
        body:JSON.stringify({
          message:lastQuery,
          history:history.slice(-8),
          page:{path:route||'/',title:document.title,lang:isFa?'fa':'en'}
        }),
        signal:controller.signal
      });
      if(!res.ok) throw new Error('assistant '+res.status);
      const data=await res.json();
      if(requestToken!==requestGeneration||document.hidden)return;
      if(!data?.answer) throw new Error('assistant empty');
      pending.remove();
      addMessage('assistant',data.answer,data.links||[]);
      history.push({role:'user',content:lastQuery},{role:'assistant',content:String(data.answer)});
      history=history.slice(-8);
    }catch(e){
      pending.remove();
      if(requestToken===requestGeneration&&!document.hidden){
        const f=fallback(lastQuery);
        addMessage('assistant',f.answer,f.links);
      }
    }finally{
      if(timer!==null)clearTimeout(timer);
      if(activeRequest===controller)activeRequest=null;
      if(requestToken===requestGeneration){
        busy=false;input.disabled=false;form.querySelector('button').disabled=false;
        if(!panel.hidden&&!document.hidden)input.focus();
      }
    }
  }

  labels.chips.forEach(text=>{
    const b=document.createElement('button');b.type='button';b.textContent=text;
    b.addEventListener('click',()=>ask(text));chips.appendChild(b);
  });
  launcher.addEventListener('click',()=>{
    const opening=panel.hidden;
    panel.hidden=!opening;launcher.setAttribute('aria-expanded',opening?'true':'false');
    if(opening){
      if(!thread.childElementCount)
        addMessage('assistant',trustedEndpoint?labels.greeting:staticGreeting);
      setTimeout(()=>input.focus(),30);
    }
  });
  close.addEventListener('click',()=>{panel.hidden=true;launcher.setAttribute('aria-expanded','false');launcher.focus();});
  const clearEphemeralAssistant=()=>{
    // Backgrounded mobile PWAs must not keep private text visible in a
    // resumable tab or accept late async responses after a user leaves.
    requestGeneration++;
    activeRequest?.abort();activeRequest=null;
    history=[];lastQuery='';busy=false;ephemeralVisitorId=null;
    thread.replaceChildren();input.value='';input.disabled=false;
    form.querySelector('button').disabled=false;
    panel.hidden=true;launcher.setAttribute('aria-expanded','false');
  };
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden)clearEphemeralAssistant();
  });
  window.addEventListener('pagehide',clearEphemeralAssistant);
  form.addEventListener('submit',e=>{e.preventDefault();const q=input.value.trim();if(!q)return;input.value='';ask(q);});
  input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();form.requestSubmit();}});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden){panel.hidden=true;launcher.setAttribute('aria-expanded','false');launcher.focus();}});
})();
