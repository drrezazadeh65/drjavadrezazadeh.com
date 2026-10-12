/* Stage 13 - 16-network owner console, no secrets, no unattended publication. */
(()=>{'use strict';
 const workspace=document.getElementById('ops-workspace');
 const panel=document.getElementById('ops-social-settings');
 const selector=document.getElementById('social-settings-provider');
 const content=document.getElementById('social-settings-content');
 const status=document.getElementById('social-settings-status');
 const refresh=document.getElementById('social-settings-refresh');
 if(!workspace||!panel||!selector||!content||!status||!refresh)return;
 const fa=document.documentElement.lang==='fa';
 const t=(a,b)=>fa?a:b;
 const elem=(tag,caption,cls)=>{
  const e=document.createElement(tag);
  if(caption!==undefined)e.textContent=String(caption);
  if(cls)e.className=cls;
  return e;
 };
 const choose=(items,selected)=>{
  const select=elem('select');for(const [value,label] of items){
   const opt=elem('option',label);opt.value=value;select.append(opt);
  }select.value=selected;return select;
 };
 const labeled=(name,input)=>{
  const label=elem('label',name);label.append(input);return label;
 };
 let model=null,epoch=0,busy=false;
 const clear=()=>{epoch++;model=null;selector.replaceChildren();content.replaceChildren();status.textContent='';};
 new MutationObserver(()=>{if(workspace.hidden)clear();})
   .observe(workspace,{attributes:true,attributeFilter:['hidden']});
 async function api(path,opts={}){
   const res=await fetch('/api/admin/operations/'+path,{
     method:'GET',credentials:'same-origin',cache:'no-store',
     headers:{Accept:'application/json'},...opts
   });
   const data=await res.json().catch(()=>null);
   if(!res.ok||!data?.ok)throw Error(data?.error||'HTTP '+res.status);
   return data;
 }
 async function mutate(path,payload){
   const session=await api('session');
   if(session.mfaRequired||!session.csrfToken)throw Error('admin_mfa_required');
   return api(path,{method:'POST',headers:{
     'Accept':'application/json','Content-Type':'application/json',
     'X-CSRF-Token':session.csrfToken
   },body:JSON.stringify(payload)});
 }
 async function action(fn){
   if(busy||workspace.hidden)return;
   busy=true;refresh.disabled=true;
   try{await fn();}catch(e){status.textContent=t('عملیات انجام نشد: ','Action failed: ')+String(e.message||'unknown');}
   finally{busy=false;refresh.disabled=false;}
 }
 const field=(name,control)=>{control.classList.add('social-settings-input');return labeled(name,control);};
 const opts=(values,current)=>choose(values.map(([v,faName,enName])=>[v,t(faName,enName)]),current);
 function render(){
  if(!model||workspace.hidden||!panel.open)return;
  const network=selector.value;
  const info=model.catalogue?.[network];if(!info)return;
  content.replaceChildren();
  const old=model.settings?.[network]||{};
  const active=model.settings!==null;
  const connected=Array.isArray(model.storedAccounts)?
   model.storedAccounts.filter(a=>a.provider===network):null;
  const intents=Array.isArray(model.connectionIntents)?
   model.connectionIntents.filter(a=>a.provider===network):null;
  const title=elem('h3',fa?info.fa:info.en);
  const intro=elem('p',String(info.note||''),'ops-muted');
  const auth=elem('p',t('روش مجوزدهی: ','Official authorization: ')+String(info.method),'ops-muted');
  const help=elem('a',t('راهنمای رسمی پلتفرم ↗','Official platform documentation ↗'));
  help.href=info.official;help.target='_blank';help.rel='noopener noreferrer';
  const note=elem('p',t('تأیید واقعی حساب و API هنوز برقرار نشده است. تنظیمات این بخش تنها رفتار پیش‌نویس را تعیین می‌کنند.',
   'Live provider API authorization has not been established. These preferences only govern drafting.'),'ops-muted');
  content.append(title,intro,auth,help,note);
  if(!active)content.append(elem('p',t(
   'جداول تنظیمات روی سرور آماده نیستند؛ ویرایش تا اجرای migration مجاز نخواهد بود.',
   'Settings tables are not provisioned on the server; editing is unavailable until migration.'),'ops-muted'));
  const form=elem('form',undefined,'social-settings-form');form.noValidate=false;
  const drafting=elem('input');drafting.type='checkbox';drafting.checked=old.draftEnabled??true;
  const draftingRow=field(t('اجازهٔ تولید پیش‌نویس','Allow draft generation'),drafting);
  const locale=opts([['both','فارسی و انگلیسی','Persian and English'],
    ['fa','فارسی','Persian'],['en','انگلیسی','English']],old.draftLocale||'both');
  const mode=opts([['review_required','نیازمند تأیید مدیر','Owner review required'],
   ['manual','فقط انتشار دستی','Manual only']],old.approvalMode||'review_required');
  const limit=elem('input');limit.type='number';limit.min='1';limit.max='6';
  limit.value=String(old.dailyDraftLimit??1);
  const hour=elem('input');hour.type='time';hour.value=old.preferredLocalTime||'21:00';
  const utm=elem('input');utm.type='text';utm.maxLength=64;utm.pattern='[a-z0-9][a-z0-9_-]{0,63}';
  utm.value=old.utmCampaign||'editorial';
  const rows=elem('div',undefined,'social-settings-fields');
  rows.append(draftingRow,field(t('زبان پیش‌نویس','Draft language'),locale),
    field(t('شیوهٔ بازبینی','Review requirement'),mode),
    field(t('حداکثر پیش‌نویس روزانه','Daily draft limit'),limit),
    field(t('زمان محلی تهران','Tehran preferred time'),hour),
    field(t('شناسه کمپین UTM','UTM campaign identifier'),utm));
  const save=elem('button',t('ذخیرهٔ تنظیمات شبکه','Save channel settings'));
  save.type='submit';save.disabled=!active;
  form.append(rows,save);
  form.addEventListener('submit',event=>{
    event.preventDefault();
    if(!active)return;
    const daily=Number(limit.value);
    if(!Number.isSafeInteger(daily)||daily<1||daily>6){status.textContent=t('حد روزانه نامعتبر است.','Daily limit is invalid.');return;}
    action(async()=>{
     const result=await mutate('social/settings',{
       provider:network,draftEnabled:drafting.checked,draftLocale:locale.value,
       approvalMode:mode.value,dailyDraftLimit:daily,
       preferredLocalTime:hour.value,utmCampaign:utm.value
     });
     if(result.automatedPublishingActivated!==false)throw Error('unexpected_response');
     status.textContent=t('تنظیمات ذخیره شد؛ هیچ حسابی متصل و هیچ پستی ارسال نشده است.',
      'Preferences saved. No account connected and no post published.');
     await load(network);
    });
  });content.append(form);
  const accounts=elem('section',undefined,'social-settings-accounts');
  accounts.append(elem('h4',t('حساب‌ها و مجوزها','Accounts and permissions')));
  if(connected===null)accounts.append(elem('p',t('وضعیت حساب‌ها قابل‌خواندن نیست.',
    'Account inventory is unavailable.'),'ops-muted'));
  else if(!connected.length)accounts.append(elem('p',t('هیچ رکورد حسابی ثبت نشده است.',
    'No account records are stored.'),'ops-muted'));
  else for(const a of connected){
    const item=elem('p','@'+a.handle+' · '+a.storedStatus+
     ' · '+t('اتصال زنده تأییدنشده','Live connection unverified'),'ops-muted');
    accounts.append(item);
  }
  const accountForm=elem('form',undefined,'social-intent-form');
  const handle=elem('input');handle.type='text';handle.required=true;handle.minLength=2;
  handle.maxLength=100;handle.placeholder=t('شناسه عمومی یا نام کانال','Public account or channel handle');
  handle.setAttribute('autocomplete','off');
  const add=elem('button',t('ثبت درخواست اتصال حساب','Register account connection request'));
  add.type='submit';add.disabled=!active;
  accountForm.append(field(t('شناسه عمومی، بدون رمز عبور','Public handle; never a password'),handle),add);
  accountForm.addEventListener('submit',event=>{
    event.preventDefault();if(!active)return;
    action(async()=>{
      const data=await mutate('social/account-intents',{provider:network,publicHandle:handle.value.trim()});
      if(data.connected!==false)throw Error('unexpected_connection_state');
      status.textContent=t('درخواست ثبت شد. اتصال پس از مجوزدهی رسمی انجام خواهد شد.',
       'Request recorded. Official provider authorization is still required.');
      await load(network);
    });
  });
  accounts.append(accountForm);
  accounts.append(elem('h4',t('درخواست‌های ثبت‌شده','Registered connection requests')));
  if(intents===null)accounts.append(elem('p',t('جداول درخواست اتصال آماده نیستند.',
    'Connection request table unavailable.'),'ops-muted'));
  else if(!intents.length)accounts.append(elem('p',t('درخواستی ثبت نشده است.','No requests yet.'),'ops-muted'));
  else for(const entry of intents){
    const row=elem('div',undefined,'social-settings-intent');
    row.append(elem('span',entry.publicHandle+' · '+entry.status,'ops-muted'));
    if(entry.status==='awaiting_authorization'&&active){
      const cancel=elem('button',t('لغو درخواست','Cancel request'));
      cancel.type='button';cancel.addEventListener('click',()=>action(async()=>{
        await mutate('social/account-intents/cancel',{id:entry.id});await load(network);
        status.textContent=t('درخواست لغو شد.','Request cancelled.');
      }));
      row.append(cancel);
    }
    accounts.append(row);
  }
  content.append(accounts);
 }
 async function load(selected){
  if(workspace.hidden||!panel.open)return;
  const current=++epoch;refresh.disabled=true;
  status.textContent=t('در حال دریافت تنظیمات از سرور…','Loading authenticated settings…');
  try{
    const data=await api('social/settings');
    if(workspace.hidden||current!==epoch)return;
    if(data.schema!=='social-channel-settings-v1'||!data.catalogue)throw Error('invalid_catalogue');
    model=data;selector.replaceChildren();
    for(const [id,info] of Object.entries(data.catalogue)){
      const opt=elem('option',fa?info.fa:info.en);
      opt.value=id;selector.append(opt);
    }
    selector.value=data.catalogue[selected]?selected:'instagram';
    render();
    status.textContent=data.settings===null?t(
       'فهرست شبکه‌ها آماده است؛ برای ذخیره تنظیمات باید ابتدا جداول MySQL نصب شوند.',
       'Network catalogue is available. MySQL settings tables need provisioning.')
       :t('تنظیمات شبکه‌ها بارگیری شد؛ انتشار خودکار تأیید نشده است.',
        'Channel settings loaded. Automated publication is not verified.');
  }catch(e){
    if(current===epoch)status.textContent=t('خطا در دریافت تنظیمات: ','Settings retrieval failed: ')+e.message;
  }finally{refresh.disabled=false;}
 }
 selector.addEventListener('change',render);
 refresh.addEventListener('click',()=>load(selector.value));
 panel.addEventListener('toggle',()=>{if(panel.open)load(selector.value);else clear();});
})();
