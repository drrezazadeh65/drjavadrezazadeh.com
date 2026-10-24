/* Public exam calendar, no account data until intentional reminder request.
 * Original account authentication and eco consent remain authoritative.
 */
(function(){
  'use strict';
  const root=document.querySelector('[data-ni-calendar]');
  const dataNode=document.querySelector('#jrei-verified-calendar-data');
  if(!root||!dataNode)return;
  let snapshot;try{snapshot=JSON.parse(dataNode.textContent||'{}');}catch{return;}
  if(snapshot.schema!=='jr.jrei.public-exam-calendar.v1'||
     !Array.isArray(snapshot.events))return;
  const locale=root.getAttribute('data-ni-locale')==='en'?'en':'fa';
  const isFa=locale==='fa',events=snapshot.events.slice(0,3000);
  const month=root.querySelector('[data-ni-calendar-month]');
  const search=root.querySelector('[data-ni-calendar-filter]');
  const results=root.querySelector('[data-ni-calendar-events]');
  const status=root.querySelector('[data-ni-calendar-status]');
  const months=[...new Set(events.map(x=>String(x.startsAt||'').slice(0,7))
    .filter(x=>/^\d{4}-\d{2}$/.test(x)))].sort();
  months.forEach(m=>{
    const item=document.createElement('option');item.value=m;item.textContent=m;
    month.append(item);
  });
  function norm(s){return String(s||'').normalize('NFKC').toLocaleLowerCase()
    .replace(/[يى]/g,'ی').replace(/ك/g,'ک');}
  function el(tag,className,text){
    const n=document.createElement(tag);
    if(className)n.className=className;
    if(text!==undefined)n.textContent=text;
    return n;
  }
  function render(){
    const query=norm(search.value.trim()),filter=month.value;
    const chosen=events.filter(x=>{
      if(typeof x.eventId!=='string'||typeof x.startsAt!=='string'||
        typeof x.title!=='string'||typeof x.sourceUrl!=='string')return false;
      return (!filter||x.startsAt.startsWith(filter))&&
        (!query||norm(x.title).includes(query));
    }).slice(0,250);
    results.replaceChildren();
    status.textContent=chosen.length?chosen.length+' '+(isFa?'رویداد':'events'):
      (isFa?'رویداد منطبق پیدا نشد.':'No matching events.');
    for(const item of chosen){
      const card=el('article','ni-calendar-event');
      const time=el('time','ni-calendar-date',item.startsAt.slice(0,10));
      time.dateTime=item.startsAt;
      const head=el('h2',null,item.title);
      const official=el('a',null,isFa?'منبع رسمی':'Official source');
      try{
        const u=new URL(item.sourceUrl);
        if(u.protocol==='https:') {
          official.href=u.href;official.rel='noopener noreferrer';
          official.target='_blank';
        }
      }catch{official.hidden=true;}
      const actions=el('div','ni-calendar-actions');
      const label=el('label',null,isFa?'چند روز پیش از موعد؟':'How many days before?');
      const daysSelect=el('select');
      for(const count of [30,15,10,7,5,3,1,0]){
        const option=el('option',null,String(count));
        option.value=String(count);
        if(count===5)option.selected=true;
        daysSelect.append(option);
      }
      label.append(daysSelect);
      const button=el('button',null,isFa?'ثبت یادآوری':'Set reminder');
      button.type='button';
      button.addEventListener('click',()=>follow(item,button,daysSelect));
      actions.append(label,button);
      card.append(time,head,official,actions);
      results.append(card);
    }
  }
  async function follow(item,button,daysSelect){
    const value=Number(daysSelect.value);
    if(![0,1,3,5,7,10,15,30].includes(value)){
      status.textContent=isFa?'عدد معتبر انتخاب کنید.':'Choose an allowed number.';
      return;
    }
    // No hidden automatic newsletter enrolment. The existing account
    // consent and CSRF/session must already be verified by the backend.
    button.disabled=true;
    try{
      const csrf=document.querySelector('meta[name="jr-csrf-token"]')?.content||'';
      if(!csrf)throw Error('ACCOUNT_CSRF_UNAVAILABLE');
      const response=await fetch('/api/news/v1/exam/follow',{
        method:'POST',credentials:'same-origin',redirect:'error',cache:'no-store',
        headers:{'Accept':'application/json','Content-Type':'application/json',
          'X-CSRF-Token':csrf},
        body:JSON.stringify({milestoneId:item.eventId,daysBefore:value,
          channel:'EMAIL'})});
      if(!response.ok)throw Error('FOLLOW_NOT_CONFIRMED');
      const data=await response.json();
      if(data.state!=='ACTIVE'||data.milestoneId!==item.eventId)
        throw Error('FOLLOW_NOT_VERIFIED');
      status.textContent=isFa?
        'یادآوری در تنظیمات شما ثبت شد؛ ارسال ایمیل هنوز انجام نشده است.':
        'Reminder preference saved; no email has been delivered yet.';
    }catch{
      status.textContent=isFa?
        'برای تنظیم یادآوری، ابتدا وارد حساب شوید و رضایت اطلاع‌رسانی را فعال کنید.':
        'Sign in and enable your examination reminder consent to save this alert.';
    }finally{button.disabled=false;}
  }
  search.addEventListener('input',render);
  month.addEventListener('change',render);
  render();
}());
