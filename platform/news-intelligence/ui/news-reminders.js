/**
 * Private account dashboard's existing JREI exam reminders.
 * No independent login, notification provider, localStorage or email sender.
 * Only previously consented reminders can be shown or withdrawn.
 * Source-only; not mounted on production account pages.
 */
export function mountJreiNewsExamReminders({
  root,csrfResolver,locale='fa',apiBase='/api/news/v1'
}={}){
  if(!(root instanceof HTMLElement)||typeof csrfResolver!=='function'||
     !['fa','en'].includes(locale)||apiBase!=='/api/news/v1')
    throw Error('NEWS_REMINDER_ACCOUNT_MOUNT_INVALID');
  const isFa=locale==='fa';
  const tr=(fa,en)=>isFa?fa:en;
  const el=(tag,cls,text)=>{
    const n=document.createElement(tag);
    if(cls)n.className=cls;
    if(text!==undefined)n.textContent=text;
    return n;
  };
  const header=el('h2',null,tr('یادآوری‌های آزمون من','My Exam Reminders'));
  const intro=el('p',null,tr(
    'یادآوری‌های تأییدشده و آینده را ببینید یا هر کدام را لغو کنید.',
    'Review verified upcoming exam reminders and cancel them individually.'));
  const refresh=el('button','ni-preferences-submit',tr('به‌روزرسانی فهرست','Refresh'));
  refresh.type='button';
  const status=el('p','ni-preferences-status');
  status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  const list=el('div','ni-reminders-list');
  root.replaceChildren(header,intro,refresh,status,list);
  function csrf(){
    const token=csrfResolver();
    if(typeof token!=='string'||token.length<8)
      throw Error('EXISTING_ACCOUNT_LOGIN_REQUIRED');
    return token;
  }
  async function request(path,body=null){
    const write=body!==null;
    const response=await fetch(apiBase+path,{
      method:write?'POST':'GET',
      credentials:'same-origin',cache:'no-store',redirect:'error',
      headers:{'Accept':'application/json','X-CSRF-Token':csrf(),
        ...(write?{'Content-Type':'application/json'}:{})},
      ...(write?{body:JSON.stringify(body)}:{})
    });
    if(!response.ok)throw Error('ACCOUNT_NEWS_REMINDER_UNAVAILABLE');
    return response.json();
  }
  async function withdraw(item,button){
    button.disabled=true;
    status.textContent=tr('در حال لغو یادآوری…','Withdrawing reminder…');
    try{
      const result=await request('/exam/withdraw',{followId:item.followId});
      if(result.schema!=='jr.jrei.news-exam-reminder-withdrawal.v1'||
         result.state!=='WITHDRAWN'||result.followId!==item.followId)
        throw Error('WITHDRAWAL_RECEIPT_INVALID');
      status.textContent=tr('یادآوری لغو شد.','Reminder withdrawn.');
      await load();
    }catch{
      status.textContent=tr(
        'لغو یادآوری تأیید نشد؛ دوباره تلاش کنید.',
        'Cancellation was not confirmed; please try again.');
    }finally{button.disabled=false;}
  }
  async function load(){
    refresh.disabled=true;list.replaceChildren();
    status.textContent=tr('در حال بارگذاری…','Loading…');
    try{
      const result=await request('/exam/follows');
      if(result.schema!=='jr.jrei.news-account-exam-reminders.v1'||
         !Array.isArray(result.items))
        throw Error('REMINDER_RESPONSE_INVALID');
      const items=result.items.slice(0,100);
      for(const item of items){
        if(!/^[a-f0-9-]{36}$/i.test(String(item.followId||'')) ||
          !Number.isSafeInteger(item.eventUtc) || item.eventUtc<=0 ||
          ![0,1,3,5,7,10,15,30].includes(item.daysBefore))continue;
        const article=el('article','ni-reminder-card');
        const title=el('h3',null,String(isFa?item.titleFa:item.titleEn));
        const date=el('time','ni-calendar-date',
          new Intl.DateTimeFormat(isFa?'fa-IR':'en-US',{
            timeZone:'Asia/Tehran',year:'numeric',month:'long',
            day:'numeric',hour:'2-digit',minute:'2-digit'
          }).format(new Date(item.eventUtc*1000)));
        date.dateTime=new Date(item.eventUtc*1000).toISOString();
        const before=el('p',null,
          String(item.daysBefore)+' '+tr('روز قبل از موعد','days before the date'));
        const remove=el('button','ni-preferences-withdraw',
          tr('لغو این یادآوری','Cancel this reminder'));
        remove.type='button';
        remove.addEventListener('click',()=>withdraw(item,remove));
        article.append(title,date,before,remove);list.append(article);
      }
      status.textContent=items.length?
        tr(String(items.length)+' یادآوری فعال ثبت شده است.',
          String(items.length)+' upcoming reminders are saved.'):
        tr('یادآوری فعالی وجود ندارد.','No active future reminders.');
    }catch{
      status.textContent=tr('فهرست یادآوری‌ها در دسترس نیست.',
        'Your reminder list is temporarily unavailable.');
    }finally{refresh.disabled=false;}
  }
  refresh.addEventListener('click',load);
  load();
  return Object.freeze({refresh:load,destroy(){root.replaceChildren();}});
}
