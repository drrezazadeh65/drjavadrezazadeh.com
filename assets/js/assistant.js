// Dr. Javad Rezazadeh site assistant — public concierge UI.
// No private records are read. Conversation text is kept in-memory for the current page only.
(function(){
  const PRIVATE_PREFIXES=[
    '/fa/app/','/app/','/en/account/','/fa/assessments/','/assessments/',
    '/en/golden-talent/assessment/','/en/golden-talent/dashboard/','/en/golden-talent/observer/',
    '/en/golden-talent/roles/','/en/golden-talent/student/','/fa/shop/','/shop/',
    '/en/golden-talent/checkout/','/en/golden-talent/plans/'
  ];
  const rawPath=location.pathname.replace(/index\.html$/,'');
  const gh='/drjavadrezazadeh.com/';
  const base=rawPath.includes(gh)?gh:'/';
  const route=base==='/'?rawPath:'/'+rawPath.slice(base.length);
  if(PRIVATE_PREFIXES.some(p=>route.startsWith(p))) return;

  const isFa=document.documentElement.lang==='fa';
  const endpoint=document.querySelector('meta[name="jr-assistant-endpoint"]')?.content?.trim()||'https://assistant.drjavadrezazadeh.com/v1/chat';
  const labels=isFa?{
    open:'دستیار هوشمند',title:'دستیار دکتر رضازاده',subtitle:'راهنمای هوشمند سایت',
    greeting:'سلام. من دستیار هوشمند سایت دکتر رضازاده هستم. درباره خدمات، Golden Talent، انتخاب رشته، پژوهش‌ها و مسیرهای سایت می‌توانم راهنمایی‌تان کنم.',
    notice:'اطلاعات حساس، مدارک هویتی، پرونده پزشکی، رمز عبور یا اطلاعات پرداخت را در این گفتگو ارسال نکنید.',
    placeholder:'سؤال‌تان را بنویسید…',send:'ارسال',close:'بستن',thinking:'در حال بررسی…',
    error:'ارتباط زنده با دستیار هنوز برقرار نیست. می‌توانید از راهنماهای زیر استفاده کنید یا دوباره تلاش کنید.',
    retry:'تلاش دوباره',offline:'راهنمای سریع',
    chips:['برای انتخاب رشته از کجا شروع کنم؟','Golden Talent چیست؟','چطور مشاوره بگیرم؟']
  }:{
    open:'AI Assistant',title:'Dr. Rezazadeh Assistant',subtitle:'Smart site guide',
    greeting:'Hello. I am the AI assistant for Dr. Rezazadeh’s website. I can guide you through services, Golden Talent, student guidance, research and the site.',
    notice:'Please do not share identity documents, medical records, passwords, payment details or other sensitive personal information here.',
    placeholder:'Ask a question…',send:'Send',close:'Close',thinking:'Checking…',
    error:'The live assistant is not connected yet. You can use the quick guidance below or try again.',
    retry:'Try again',offline:'Quick guidance',
    chips:['Which service fits my needs?','What is Golden Talent?','How do I request consultation?']
  };

  let history=[];
  let busy=false;
  let lastQuery='';
  const visitorKey='jr-assistant-visitor-v1';
  function visitorId(){
    try{
      let id=localStorage.getItem(visitorKey);
      if(!id){
        id=(crypto?.randomUUID?.()||('v-'+Date.now()+'-'+Math.random().toString(36).slice(2))).slice(0,80);
        localStorage.setItem(visitorKey,id);
      }
      return id;
    }catch(e){return 'session-'+Date.now();}
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
      {label:'درخواست مشاوره',url:rootPath('fa/darkhast-moshavere/')}
    ];
    return [
      {label:'Student Guidance',url:rootPath('en/student-guidance/')},
      {label:'Golden Talent',url:rootPath('en/golden-talent/')},
      {label:'Services',url:rootPath('en/services/')},
      {label:'Request Consultation',url:rootPath('en/request-consultation/')}
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
        const a=document.createElement('a');
        a.href=link.url;
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
      if(/انتخاب رشته|رشته|کنکور/.test(q)) return {answer:'برای تصمیم‌گیری درباره رشته، از صفحه «انتخاب رشته» و راهنماهای مرتبط شروع کنید. اگر مسئله شما نیازمند بررسی فردی است، درخواست مشاوره ثبت کنید.',links:[links[1],links[3]]};
      if(/استعداد|golden|گلدن|توانمندی/.test(q)) return {answer:'Golden Talent چارچوب رشدگرا و چندمنبعی سایت برای شناخت شواهد مرتبط با توانمندی و مسیر رشد است. برای آشنایی عمومی وارد صفحه Golden Talent شوید.',links:[links[2],links[3]]};
      return {answer:labels.error,links};
    }
    if(/major|career|student|guidance/.test(q)) return {answer:'Start with Student Guidance for educational and major-exploration questions. If you need individual review, use the consultation request route.',links:[links[0],links[3]]};
    if(/talent|golden|strength/.test(q)) return {answer:'Golden Talent is the site’s developmental, multi-source framework for exploring student strengths and pathways. The public page explains the method and its limits.',links:[links[1],links[3]]};
    return {answer:labels.error,links};
  }

  async function ask(message){
    if(busy||!message.trim()) return;
    busy=true;lastQuery=message.trim();
    input.disabled=true;
    form.querySelector('button').disabled=true;
    addMessage('user',lastQuery);
    const pending=document.createElement('div');
    pending.className='jr-assistant-message is-assistant is-pending';
    pending.innerHTML='<div class="jr-assistant-bubble">'+labels.thinking+'</div>';
    thread.appendChild(pending);
    thread.scrollTop=thread.scrollHeight;
    try{
      const controller=new AbortController();
      const timer=setTimeout(()=>controller.abort(),30000);
      const res=await fetch(endpoint,{
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
      clearTimeout(timer);
      if(!res.ok) throw new Error('assistant '+res.status);
      const data=await res.json();
      if(!data?.answer) throw new Error('assistant empty');
      pending.remove();
      addMessage('assistant',data.answer,data.links||[]);
      history.push({role:'user',content:lastQuery},{role:'assistant',content:String(data.answer)});
      history=history.slice(-8);
    }catch(e){
      pending.remove();
      const f=fallback(lastQuery);
      addMessage('assistant',f.answer,f.links);
    }finally{
      busy=false;input.disabled=false;form.querySelector('button').disabled=false;input.focus();
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
      if(!thread.childElementCount) addMessage('assistant',labels.greeting);
      setTimeout(()=>input.focus(),30);
    }
  });
  close.addEventListener('click',()=>{panel.hidden=true;launcher.setAttribute('aria-expanded','false');launcher.focus();});
  form.addEventListener('submit',e=>{e.preventDefault();const q=input.value.trim();if(!q)return;input.value='';ask(q);});
  input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();form.requestSubmit();}});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden){panel.hidden=true;launcher.setAttribute('aria-expanded','false');launcher.focus();}});
})();
