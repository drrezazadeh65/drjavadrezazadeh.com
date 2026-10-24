/**
 * NEWSLETTER PREFERENCES (existing authenticated account dashboard only).
 * No separate user registration or marketing consent. Account owner must
 * already have purpose-specific NEWSLETTER consent on eco_notification_*.
 *
 * Source-only UI module, not registered in existing account dashboard yet.
 */
export function mountJreiNewsPreferences({
  root,csrfResolver,locale='fa',apiBase='/api/news/v1'
}={}){
  if(!(root instanceof HTMLElement)||typeof csrfResolver!=='function'||
    !['fa','en'].includes(locale)||apiBase!=='/api/news/v1')
    throw Error('NEWS_PREFERENCES_MOUNT_INVALID');
  const fa=locale==='fa';
  const tr=(f,e)=>fa?f:e;
  const TOPICS=[
    ['ARTICLES','مقالات و اخبار','Articles and news'],
    ['SCHOOL','مدارس و آموزش‌وپرورش','Schools'],
    ['EXAMINATIONS','کنکور و آزمون‌ها','Entrance examinations'],
    ['RESULTS','نتایج آزمون‌ها','Examination results'],
    ['UNIVERSITIES','دانشگاه‌ها','Universities'],
    ['EMPLOYMENT','استخدام','Employment exams'],
    ['LANGUAGE','آزمون‌های زبان','Language testing'],
    ['SCHOLARSHIPS','بورسیه','Scholarships'],
    ['INTERNATIONAL','فرصت‌های بین‌المللی','International opportunities'],
    ['RESEARCH','پژوهش','Research'],
    ['EDTECH','فناوری آموزشی','Educational technology'],
    ['TALENT','استعدادپروری','Talent development'],
    ['TEACHER_EDUCATION','آموزش معلمان','Teacher education'],
    ['EVENTS','رویدادها','Events']
  ];
  const MODES=[
    ['URGENT','فوری برای خبرهای مهم','Urgent news'],
    ['DAILY','خلاصه روزانه','Daily digest'],
    ['WEEKLY','خلاصه هفتگی','Weekly digest'],
    ['EXAM_ONLY','فقط اخبار و مهلت آزمون‌ها','Examination updates only']
  ];
  function el(tag,className,text){
    const node=document.createElement(tag);
    if(className)node.className=className;
    if(text!==undefined)node.textContent=text;
    return node;
  }
  const heading=el('h2',null,tr('خبرنامه هوشمند من','My Intelligent Newsletter'));
  const info=el('p',null,tr(
    'موضوعات مورد علاقه و زمان دریافت اخبار را انتخاب کنید. انتخاب شما اختیاری است و هر زمان قابل لغو خواهد بود.',
    'Choose the topics and frequency of your news. This is optional and can be withdrawn at any time.'));
  const topicGroup=el('fieldset','ni-preferences-topics');
  topicGroup.append(el('legend',null,tr('موضوعات خبری','Topics')));
  const checks=[];
  for(const [code,persian,english] of TOPICS){
    const label=el('label','ni-preference-option');
    const checkbox=el('input');checkbox.type='checkbox';
    checkbox.value=code;checkbox.name='news_topics';
    label.append(checkbox,el('span',null,fa?persian:english));
    topicGroup.append(label);checks.push(checkbox);
  }
  const modeGroup=el('fieldset','ni-preferences-modes');
  modeGroup.append(el('legend',null,tr('فرکانس دریافت','Frequency')));
  const modes=[];
  for(const [code,persian,english] of MODES){
    const label=el('label','ni-preference-option');
    const radio=el('input');radio.type='radio';radio.name='news_digest';
    radio.value=code;if(code==='WEEKLY')radio.checked=true;
    label.append(radio,el('span',null,fa?persian:english));
    modeGroup.append(label);modes.push(radio);
  }
  const subscribe=el('button','ni-preferences-submit',
    tr('ذخیره موضوعات انتخابی','Save my selected topics'));
  subscribe.type='button';
  const withdraw=el('button','ni-preferences-withdraw',
    tr('لغو همه موضوعات خبری','Withdraw all news topics'));
  withdraw.type='button';
  const status=el('p','ni-preferences-status');
  status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  const controls=el('div','ni-preferences-buttons');
  controls.append(subscribe,withdraw);
  root.replaceChildren(heading,info,topicGroup,modeGroup,controls,status);
  async function api(route,payload){
    const token=csrfResolver();
    if(typeof token!=='string'||token.length<8)
      throw Error('ACCOUNT_NEWSLETTER_CONSENT_OR_LOGIN_REQUIRED');
    const response=await fetch(apiBase+route,{
      credentials:'same-origin',method:'POST',cache:'no-store',redirect:'error',
      headers:{'Content-Type':'application/json','Accept':'application/json',
        'X-CSRF-Token':token},
      body:JSON.stringify(payload)});
    if(!response.ok)throw Error('PREFERENCE_NOT_CONFIRMED');
    return response.json();
  }
  subscribe.addEventListener('click',async()=>{
    const selected=checks.filter(x=>x.checked).map(x=>x.value);
    const mode=modes.find(x=>x.checked)?.value||'WEEKLY';
    if(selected.length===0){
      status.textContent=tr('حداقل یک موضوع انتخاب کنید.','Choose at least one topic.');
      return;
    }
    subscribe.disabled=true;
    status.textContent=tr('در حال ذخیره تنظیمات…','Saving preferences…');
    try{
      const response=await api('/preferences/replace',{
        topics:selected,mode,locale,channel:'EMAIL'});
      if(response.schema!=='jr.jrei.news-preferences-replaced.v1' ||
         response.state!=='ACTIVE' ||
         !Array.isArray(response.selectedTopics) ||
         response.selectedTopics.length!==selected.length)
        throw Error('PREFERENCE_REPLACEMENT_ACK_MISMATCH');
      status.textContent=tr(
        'تنظیمات '+selected.length+' موضوع خبری ذخیره شد. خبرنامه فقط با رضایت معتبر حساب شما ارسال می‌شود.',
        selected.length+' news topics saved. Original account consent remains mandatory.');
    }catch{
      status.textContent=tr(
        'ثبت همه تنظیمات تأیید نشد؛ حساب و رضایت خبرنامه را بررسی کنید.',
        'Some preferences were not confirmed. Check your account and consent.');
    }finally{subscribe.disabled=false;}
  });
  withdraw.addEventListener('click',async()=>{
    withdraw.disabled=true;
    try{
      const response=await api('/preferences/withdraw',{topic:null});
      if(response.state!=='WITHDRAWN')throw Error('UNSUBSCRIBE_NOT_CONFIRMED');
      checks.forEach(x=>{x.checked=false;});
      status.textContent=tr(
        'درخواست لغو موضوعات ثبت شد. سیاست توقف ارسال در سامانه مرکزی نیز باید اعمال شود.',
        'News topics were withdrawn; central delivery suppression also applies.');
    }catch{
      status.textContent=tr('لغو عضویت تأیید نشد.','Unsubscribe could not be confirmed.');
    }finally{withdraw.disabled=false;}
  });
  return Object.freeze({destroy(){root.replaceChildren();}});
}
