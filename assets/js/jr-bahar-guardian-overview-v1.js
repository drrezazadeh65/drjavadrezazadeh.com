/* JR BAHAR guardian overview: explicit read on demand.
 * Server endpoint enforces verified relationships, current assessment consent
 * AND current guardian visibility consent, then audits reads transactionally.
 * Do not automatically poll, persist, infer progress scores, or prefetch.
 */
(() => {
  'use strict';
  const panel=document.querySelector('[data-jr-guardian-bahar]');
  if(!panel)return;
  const en=document.documentElement.lang==='en';
  const T=(fa,english)=>en?english:fa;
  const trigger=panel.querySelector('summary');
  const status=panel.querySelector('[data-jr-guardian-state]');
  const summary=panel.querySelector('[data-jr-guardian-summary]');
  const rows=panel.querySelector('[data-jr-guardian-rows]');
  const refresh=panel.querySelector('[data-jr-guardian-refresh]');
  if(!trigger||!status||!summary||!rows||!refresh)return;
  const number=new Intl.NumberFormat(en?'en-US':'fa-IR');
  let controller=null,epoch=0,loaded=false,busy=false;
  const elem=(tag,textValue,className)=>{
    const el=document.createElement(tag);
    if(className)el.className=className;
    if(textValue!==undefined)el.textContent=String(textValue);
    return el;
  };
  function erase(message=''){
    epoch++;
    if(controller)controller.abort();
    controller=null;busy=false;loaded=false;refresh.disabled=false;
    rows.replaceChildren();summary.textContent='';
    status.textContent=message||T('وضعیت خصوصی هنوز درخواست نشده است.',
      'Private status has not been requested.');
  }
  async function read(){
    if(!panel.open||busy)return;
    const request=++epoch;
    controller?.abort();controller=new AbortController();busy=true;
    refresh.disabled=true;
    status.textContent=T('در حال بررسی مجوز و رضایت‌های ثبت‌شده…',
      'Verifying permissions and recorded consents…');
    try {
      const reply=await fetch('/api/golden-talent/my-bahar-overview',{
        credentials:'same-origin',cache:'no-store',method:'GET',
        headers:{'Accept':'application/json'},
        signal:controller.signal
      });
      if(!reply.ok)throw new Error(reply.status===401?'UNAUTHENTICATED':'UNAVAILABLE');
      const data=await reply.json();
      if(request!==epoch||!panel.open)return;
      if(!data||data.ok!==true||data.schema!=='bahar-guardian-overview-v1'||
        data.scope!=='verified_guardian_assessment_and_parent_visibility'||
        data.rawEvidenceExposed!==false||
        data.interpretationsExposed!==false||
        data.longitudinalTrendValidated!==false||
        !Array.isArray(data.learners)||data.learners.length>25||
        data.learners.some(person=>!person||
          typeof person.learnerAlias!=='string'||person.learnerAlias.length>120||
          !['portfolioCount','weeklyCycleCount','humanReviewedCycleCount']
            .every(key=>Number.isSafeInteger(person[key])&&
              person[key]>=0&&person[key]<=10000000)))
        throw Error('UNTRUSTED_OVERVIEW');
      rows.replaceChildren();
      if(data.learners.length===0){
        rows.append(elem('p',T(
          'هیچ زبان‌آموزی با رابطه سرپرستی تأییدشده و رضایت‌های معتبر برای نمایش شناسایی نشد.',
          'No learner has a currently verified guardian relationship with all required consents.'
        )));
      } else {
        for(const person of data.learners){
          const card=elem('article',undefined,'jr-guardian-overview__card');
          const heading=elem('h3',person.learnerAlias||
            T('شناسه نمایشی خصوصی','Private learner alias'));
          card.append(heading);
          const descriptions=[
            [T('کارپوشه‌های ثبت‌شده','Existing portfolios'),person.portfolioCount],
            [T('چرخه‌های هفتگی','Weekly cycles'),person.weeklyCycleCount],
            [T('چرخه‌های دارای ثبت بازبینی انسانی','Cycles marked reviewed by a person'),
              person.humanReviewedCycleCount]
          ];
          const dl=elem('dl');
          for(const [label,count] of descriptions){
            dl.append(elem('dt',label),elem('dd',number.format(count)));
          }
          card.append(dl);rows.append(card);
        }
      }
      summary.textContent=T('تعداد فراگیران مجاز: ','Authorized learners: ')+
        number.format(data.learners.length);
      status.textContent=T(
        'فقط تعداد رویدادهای ثبت‌شده نمایش داده می‌شود؛ نتیجه آزمون، نمره استعداد یا شواهد خام ارائه نمی‌شود.',
        'Only recorded event counts are shown, not aptitude scores, test outcomes or raw evidence.'
      );
      loaded=true;
    }catch(error){
      if(request!==epoch||error?.name==='AbortError')return;
      loaded=false;rows.replaceChildren();summary.textContent='';
      status.textContent=error?.message==='UNAUTHENTICATED'
        ?T('برای مشاهده اطلاعات محرمانه ابتدا به حساب تأییدشده خود وارد شوید.',
          'Sign in to your verified account before requesting private information.')
        :T('مجوز معتبر یا گزارش قابل نمایش تأیید نشد. هیچ داده‌ای ارائه نمی‌شود.',
          'Permission or report availability could not be confirmed. No data is shown.');
    }finally{
      if(request===epoch){controller=null;busy=false;refresh.disabled=false;}
    }
  }
  panel.addEventListener('toggle',()=>{
    if(panel.open && !loaded)read();
    if(!panel.open)erase();
  });
  refresh.addEventListener('click',read);
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden)erase(T('نمای خصوصی پس از خروج از این تب پاک شد.',
      'Private view cleared after leaving this tab.'));
  });
  window.addEventListener('pagehide',erase,{once:true});
  // Event may be emitted by the existing dashboard auth controller;
  // security never depends on this event because the API checks every read.
  window.addEventListener('jr:account-logout',erase);
})();
