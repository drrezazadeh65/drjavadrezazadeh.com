/* JR Private BSC USDT administration · fresh MFA required server-side.
   No trade, withdraw, on-chain execution or automatic entitlement. */
(()=>{'use strict';
const workspace=document.getElementById('ops-workspace');if(!workspace)return;
const fa=document.documentElement.lang==='fa',t=(a,b)=>fa?a:b;
const create=(tag,cls,value)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(value!==undefined)x.textContent=value;return x;};
const panel=create('section','jr-usdt-admin');panel.hidden=true;panel.id='jr-usdt-admin';
panel.setAttribute('aria-labelledby','jr-usdt-admin-title');
const header=create('div','jr-usdt-admin-header');
const logo=create('img','jr-usdt-admin-logo');logo.src='/favicon.svg';logo.alt='';logo.width=54;logo.height=54;logo.loading='lazy';
const titles=create('div','');
const eyebrow=create('p','jr-usdt-admin-eyebrow','JR · SECURE PAYMENT RECONCILIATION');
const h=create('h2','',t('بررسی دستی رسیدهای USDT در BSC','Manual BSC USDT Evidence Review'));h.id='jr-usdt-admin-title';
titles.append(eyebrow,h);header.append(logo,titles);
const disclaimer=create('p','',t('تطبیق رمزینکس فقط شاهد کمکی است؛ تأیید مدیر پس از بررسی شبکه، توکن، آدرس، مبلغ و تعداد تأییدها لازم است. هیچ خدمتی خودکار فعال نمی‌شود.','Ramzinex read-only evidence is advisory. The owner must verify the chain, token, recipient, amount and confirmations. No service activates automatically.'));
const refresh=create('button','jr-usdt-admin-refresh',t('به‌روزرسانی درخواست‌ها','Refresh claims'));refresh.type='button';
const status=create('p','jr-usdt-admin-status','');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
const list=create('div','jr-usdt-admin-list');
panel.append(header,disclaimer,refresh,status,list);workspace.append(panel);
let generation=0,csrf=null;
async function json(url,opts={}){
 const res=await fetch(url,{credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json',...(opts.headers||{})},...opts});
 const body=await res.json().catch(()=>null);return {ok:res.ok,status:res.status,body};
}
function lock(){
 generation++;csrf=null;list.replaceChildren();panel.hidden=true;
 status.textContent=t('برای بررسی رسیدها ورود مدیر و تأیید دومرحله‌ای لازم است.','Fresh MFA is required.');
}
function makeCheckbox(label,key){
 const wrap=create('label','jr-usdt-admin-check');
 const check=document.createElement('input');check.type='checkbox';check.dataset.key=key;
 wrap.append(check,create('span','',label));return {wrap,check};
}
async function approveWithNote(c,decision,noteInput,checks){
 if(workspace.hidden)return;
 const note=noteInput.value.trim();
 if(note.length<12){status.textContent=t('توضیح تصمیم باید حداقل ۱۲ نویسه باشد.','Provide at least 12 characters explaining the decision.');return;}
 const payload={id:c.id,decision,note};
 if(decision==='approved'){
  for(const [key,ck] of checks)if(!ck.checked){status.textContent=t('همه موارد را پس از بررسی واقعی تأیید کنید.','Complete every evidence check before approval.');return;}
  for(const [key,ck] of checks)payload[key]=ck.checked;
 }
 try{
  const session=await json('/api/admin/operations/session');
  if(!session.ok||session.body?.mfaRequired!==false||!session.body?.csrfToken)throw Error('mfa');
  const res=await json('/api/admin/operations/crypto/usdt/review',{
   method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':session.body.csrfToken,Accept:'application/json'},
   body:JSON.stringify(payload)
  });
  if(!res.ok||res.body?.status!==decision){
   status.textContent=t('سرور تصمیم را تأیید نکرد؛ وضعیت تغییر نکرد.','Server did not approve the transition. ')+(res.body?.error||'');
   return;
  }
  status.textContent=t('تصمیم ثبت شد؛ این اقدام به‌تنهایی موجب فعال‌سازی خودکار خدمت نمی‌شود.','Decision recorded. No service was automatically activated.');
  await load();
 }catch(_){status.textContent=t('درخواست ایمن مدیر کامل نشد. دوباره وارد شوید.','The secure review could not be completed. Reauthenticate.');}
}
function claimCard(c){
 const card=create('article','jr-usdt-admin-card');
 const id=create('strong','',t('درخواست ','Claim ')+String(c.id));id.dir='ltr';
 const purpose=create('p','',t('موضوع: ','Purpose: ')+String(c.purpose||'—'));
 const state=create('p','',t('وضعیت: ','State: ')+String(c.status||'—'));
 const amount=create('p','',t('مبلغ اعلام‌شده: ','Declared amount: ')+String(c.amount_claimed??'—')+' USDT');
 const mail=create('p','',t('اعلان ایمیلی مدیر: ','Manager email notice: ')+String(c.email_notice_status||'—'));
 card.append(id,purpose,state,amount,mail);
 if(c.tx_hash){
  const tx=create('p','',t('هش ارسالی: ','Submitted tx hash: ')+String(c.tx_hash));tx.dir='ltr';card.append(tx);
  const lookup=create('button','',t('بررسی فقط‌خواندنی رمزینکس','Read-only Ramzinex lookup'));lookup.type='button';
  const result=create('p','jr-usdt-admin-evidence','');result.setAttribute('role','status');
  lookup.addEventListener('click',async()=>{
   if(workspace.hidden)return;
   lookup.disabled=true;result.textContent=t('در حال جست‌وجوی تطبیق احتمالی…','Checking for an advisory match…');
   try{
    const data=await json('/api/admin/operations/crypto/usdt/exchange-evidence?id='+encodeURIComponent(String(c.id)));
    const state=String(data.body?.evidence?.state||'unavailable');
    const labels={
     candidate_found:t('هش مشابه در سوابق اخیر مشاهده شد؛ هنوز هیچ پرداختی تأیید نشده است.','Exact-hash candidate in recent deposits; payment NOT verified.'),
     not_found_in_recent_sample:t('در نمونه اخیر یافت نشد؛ نبودن نتیجه دلیل عدم پرداخت نیست.','Not in the recent sample; absence does not prove nonpayment.'),
     unavailable:t('اتصال فقط‌خواندنی آماده نیست یا پاسخ معتبر دریافت نشد.','Read-only exchange history unavailable or unverified.')
    };
    result.textContent=labels[state]||state;
   }catch(_){result.textContent=t('دسترسی به داده‌ها ممکن نشد.','Evidence lookup unavailable.');}
   finally{lookup.disabled=false;}
  });card.append(lookup,result);
 }
 if(c.has_receipt){
  const a=create('a','jr-usdt-admin-receipt',t('دریافت خصوصی رسید','Download private evidence'));
  a.href='/api/admin/operations/crypto/usdt/receipt?id='+encodeURIComponent(String(c.id));
  a.rel='nofollow';card.append(a);
 }
 const next={
  submitted:['under_review','needs_information','rejected'],
  under_review:['needs_information','approved','rejected'],
  needs_information:['under_review','rejected'],
  approved:['fulfilled']
 }[c.status]||[];
 if(next.length){
  const note=document.createElement('textarea');note.placeholder=t('مستندات بررسی و علت تصمیم (حداقل ۱۲ نویسه)','Audit note (at least 12 characters)');
  note.minLength=12;note.maxLength=1200;note.rows=3;
  note.className='jr-usdt-admin-note';card.append(note);
  const checklist=[
   ['chain56Checked',t('شبکه BSC با شناسه ۵۶ را بررسی کردم.','BSC chain ID 56 verified.')],
   ['tokenContractChecked',t('قرارداد واقعی توکن را تطبیق دادم.','Token contract verified.')],
   ['receiverChecked',t('آدرس مقصد واریز را تطبیق دادم.','Recipient address verified.')],
   ['amountChecked',t('مبلغ و فاکتور سفارش را تطبیق دادم.','Amount and order/invoice verified.')],
   ['confirmationsChecked',t('تعداد تأییدها و وضعیت واقعی واریز را بررسی کردم.','Confirmations and credited deposit verified.')]
  ];
  const checkHost=create('div','jr-usdt-admin-checks');checkHost.hidden=c.status!=='under_review';
  const checks=new Map(checklist.map(([key,label])=>{const o=makeCheckbox(label,key);checkHost.append(o.wrap);return [key,o.check]}));
  if(c.status==='under_review')card.append(checkHost);
  const actions=create('div','jr-usdt-admin-actions');
  const labels={
    under_review:t('شروع بررسی','Start review'),
    needs_information:t('درخواست اطلاعات','Request information'),
    approved:t('تأیید دستی پرداخت','Manually approve payment'),
    rejected:t('رد درخواست','Reject claim'),
    fulfilled:t('ثبت تکمیل مستقل خدمت','Record separate fulfillment')
  };
  for(const decision of next){
   const btn=create('button','',labels[decision]);btn.type='button';
   btn.addEventListener('click',async()=>{btn.disabled=true;try{await approveWithNote(c,decision,note,checks);}finally{btn.disabled=false;}});
   actions.append(btn);
  }
  card.append(actions);
 }
 return card;
}
async function load(){
 if(workspace.hidden){lock();return;}
 const current=++generation;
 status.textContent=t('در حال بررسی صف خصوصی…','Loading owner-only claim queue…');
 try{
  const res=await json('/api/admin/operations/crypto/usdt/claims');
  if(current!==generation||workspace.hidden)return;
  if(!res.ok||res.body?.schema!=='manual-usdt-admin-v1'||!Array.isArray(res.body.claims)){panel.hidden=true;return;}
  panel.hidden=false;list.replaceChildren();
  for(const c of res.body.claims.slice(0,80))if(c&&typeof c.id==='string')list.append(claimCard(c));
  status.textContent=t('تعداد درخواست‌های قابل بررسی: ','Claims available: ')+res.body.claims.length;
 }catch(_){panel.hidden=true;}
}
refresh.addEventListener('click',load);
new MutationObserver(()=>workspace.hidden?lock():load()).observe(workspace,{attributes:true,attributeFilter:['hidden']});
if(!workspace.hidden)load();
})();