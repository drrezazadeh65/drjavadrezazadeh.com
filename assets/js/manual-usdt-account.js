/* JR verified-account USDT claim history · never inferred from local cache. */
(()=>{'use strict';
const page=document.querySelector('main[data-resource="orders"]');
if(!page)return;
const fa=document.documentElement.lang==='fa',t=(a,b)=>fa?a:b;
const section=document.createElement('section');section.className='jr-usdt-account';section.hidden=true;
section.setAttribute('aria-label',t('پیگیری خصوصی پرداخت USDT','Private USDT payment review'));
const h=document.createElement('h2');h.textContent=t('رسیدها و درخواست‌های بررسی USDT','USDT evidence and payment reviews');
const info=document.createElement('p');info.className='jr-usdt-account-info';info.textContent=t('صرف ثبت هش یا رسید، به معنی پرداخت تأییدشده یا فعال‌شدن خدمت نیست.','Submission does not verify payment or activate services.');
const link=document.createElement('a');link.className='jr-usdt-account-cta';link.href=fa?'/fa/payments/usdt/':'/en/payments/usdt/';
link.textContent=t('ثبت رسید USDT','Submit USDT evidence');
const list=document.createElement('div');list.className='jr-usdt-account-list';
const message=document.createElement('p');message.setAttribute('role','status');message.setAttribute('aria-live','polite');
section.append(h,info,link,list,message);page.append(section);
const state={
 submitted:t('ثبت‌شده؛ بررسی نشده','Submitted · awaiting review'),
 under_review:t('در حال بررسی مدیر','Administrator review in progress'),
 needs_information:t('نیاز به اطلاعات بیشتر','Additional evidence requested'),
 approved:t('تأیید دستی پرداخت؛ فعال‌سازی جداگانه','Manually approved · fulfillment separate'),
 rejected:t('ردشده','Rejected'),
 fulfilled:t('تکمیل خدمت پس از بررسی','Fulfillment recorded'),
};
async function request(path){
 const r=await fetch(path,{credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}});
 const d=await r.json().catch(()=>null);return {ok:r.ok,status:r.status,d};
}
async function load(){
 try{
  const options=await request('/api/crypto/usdt/options');
  if(!options.ok||options.d?.enabled!==true){section.remove();return;}
  section.hidden=false;message.textContent=t('در حال دریافت سوابق واقعی از حساب…','Loading verified account history…');
  const result=await request('/api/crypto/usdt/claims');
  if(result.status===401){message.textContent=t('برای دیدن رسیدها به حساب ایمیل‌تأییدشده وارد شوید.','Sign in to your verified email account to view claims.');return;}
  if(!result.ok||result.d?.schema!=='manual-usdt-claims-v1'||!Array.isArray(result.d.claims)){message.textContent=t('سوابق بررسی در حال حاضر در دسترس نیست.','Payment-review history is unavailable.');return;}
  list.replaceChildren();
  if(!result.d.claims.length){message.textContent=t('هنوز رسید USDT برای این حساب ثبت نشده است.','No USDT claims recorded for this account.');return;}
  for(const c of result.d.claims.slice(0,30)){
   if(!c||typeof c.id!=='string')continue;
   const item=document.createElement('article');item.className='jr-usdt-account-card';
   const title=document.createElement('strong');title.textContent=t('درخواست ','Claim ')+c.id;
   const type=document.createElement('p');type.textContent=t('موضوع: ','Purpose: ')+String(c.purpose||'—');
   const status=document.createElement('p');status.textContent=t('وضعیت: ','Status: ')+(state[c.status]||t('نامشخص','Unconfirmed'));
   const notify=document.createElement('p');notify.textContent=t('اعلان به مدیر: ','Manager notification: ')+(c.email_notice_status==='accepted'?t('پذیرفته‌شده توسط سرویس ایمیل','Accepted by email service'):t('نیازمند پیگیری در صف مدیریت','Available in private review queue'));
   item.append(title,type,status,notify);list.append(item);
  }
  message.textContent=t('تمام وضعیت‌ها از سرور خوانده می‌شوند؛ پرداخت‌ها به‌صورت خودکار تأیید نمی‌شوند.','Statuses are server-recorded; no payment is automatically approved.');
 }catch(_){section.hidden=true;}
}
load();
})();