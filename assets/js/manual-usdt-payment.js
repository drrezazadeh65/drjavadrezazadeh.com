/* JR Manual BSC USDT · owner-approved wallet shown ONLY when server is enabled.
   No client-side payment confirmation, no simulated entitlement, no secrets. */
(()=>{'use strict';
const root=document.querySelector('[data-jr-usdt-payment]');if(!root)return;
const fa=(document.documentElement.lang||'').toLowerCase()==='fa';
const t=(faText,enText)=>fa?faText:enText;
const $=s=>root.querySelector(s);
const availability=$('[data-usdt-availability]'),details=$('[data-usdt-details]'),form=$('[data-usdt-form]');
const login=$('[data-usdt-signin]'),formStatus=$('[data-usdt-form-status]'),button=$('[data-usdt-submit]');
const wallet=$('[data-usdt-wallet]'),contract=$('[data-usdt-contract]');
let csrf=null;
const message=(s)=>{if(availability)availability.textContent=s;};
async function get(path){
 const r=await fetch(path,{credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}});
 let data=null;try{data=await r.json();}catch(_){}
 return {ok:r.ok,status:r.status,data};
}
async function initialize(){
 details.hidden=true;form.hidden=true;login.hidden=true;
 message(t('در حال بررسی فعال‌بودن روش پرداخت…','Checking payment availability…'));
 try{
  const publicOptions=await get('/api/crypto/usdt/options');
  if(!publicOptions.ok||publicOptions.data?.enabled!==true){
   message(t('این روش پرداخت هنوز برای دریافت وجه فعال نشده است. لطفاً فعلاً USDT ارسال نکنید.','This payment method is not yet enabled. Do not send USDT at this time.'));
   return;
  }
  const d=publicOptions.data;
  if(d.chainId!==56||!/^0x[a-fA-F0-9]{40}$/.test(d.receiveAddress||'')||!/^0x[a-fA-F0-9]{40}$/.test(d.tokenContract||'')){
   message(t('مشخصات شبکه دریافت هنوز تأیید نشده است. از ارسال وجه خودداری کنید.','Payment network details could not be verified. Do not transfer funds.'));
   return;
  }
  // The server has independently enabled claims, migration and actual backend.
  wallet.textContent=d.receiveAddress;contract.textContent=d.tokenContract;
  details.hidden=false;
  message(t('روش ثبت درخواست فعال است؛ بررسی پرداخت و فعال‌سازی خدمات فقط پس از تأیید مدیر انجام می‌شود.','Manual submission is available. Payment and service activation remain subject to administrator confirmation.'));
  const auth=await get('/api/crypto/usdt/csrf');
  if(!auth.ok||!auth.data||!/^[a-f0-9]{64}$/i.test(auth.data.csrfToken||'')){
   login.hidden=false;return;
  }
  csrf=auth.data.csrfToken;
  form.hidden=false;
 }catch(_){message(t('ارتباط با سرور بررسی پرداخت برقرار نشد. لطفاً هیچ وجهی ارسال نکنید.','The payment service could not be reached. Please do not send funds.'));}
}
$('[data-usdt-copy]')?.addEventListener('click',()=>{
 const value=wallet?.textContent||'';
 if(!/^0x[a-fA-F0-9]{40}$/.test(value))return;
 if(!navigator.clipboard?.writeText){message(t('برای کپی، آدرس را انتخاب کنید.','Select the address to copy.'));return;}
 navigator.clipboard.writeText(value).then(()=>message(t('آدرس دریافت کپی شد. شبکه BSC و قرارداد توکن را دوباره بررسی کنید.','Receiving address copied. Recheck BSC and the token contract.')))
 .catch(()=>message(t('کپی خودکار ممکن نشد. آدرس را انتخاب کنید.','Automatic copying was unavailable.')));
});
form?.addEventListener('submit',async e=>{
 e.preventDefault();
 if(!csrf || !form.reportValidity())return;
 const hash=String(form.elements.transactionHash.value||'').trim();
 const receipt=form.elements.receipt.files?.[0]||null;
 if(!hash&&!receipt){formStatus.textContent=t('هش تراکنش یا رسید لازم است.','Provide a transaction hash or a receipt.');return;}
 if(hash&&!/^0x[0-9a-fA-F]{64}$/.test(hash)){formStatus.textContent=t('هش تراکنش معتبر نیست.','The transaction hash is invalid.');return;}
 if(receipt&&(receipt.size>2097152||!['image/png','image/jpeg','application/pdf'].includes(receipt.type))){formStatus.textContent=t('رسید باید تصویر PNG/JPEG یا PDF با حجم کمتر از ۲ مگابایت باشد.','Receipt must be a PNG/JPEG image or PDF under 2 MB.');return;}
 const purpose=form.elements.purpose.value;
 const ref=String(form.elements.invoiceReference.value||'').trim();
 const order=String(form.elements.orderId.value||'').trim();
 if(purpose!=='donation' && !ref && !order){formStatus.textContent=t('برای خدمات و سفارش‌ها، شماره سفارش یا فاکتور رسمی لازم است.','Services and purchases require an official order or invoice reference.');return;}
 const amount=String(form.elements.amountUSDT.value||'').trim();
 const data=new FormData();for(const field of ['purpose','transactionHash','invoiceReference','orderId','amountUSDT'])data.append(field,form.elements[field].value);
 if(receipt)data.append('receipt',receipt,receipt.name);
 button.disabled=true;formStatus.textContent=t('در حال ثبت امن رسید و ارسال اعلان به مدیر…','Submitting evidence to the protected review queue…');
 try{
  const response=await fetch('/api/crypto/usdt/claim',{method:'POST',credentials:'same-origin',cache:'no-store',
   headers:{'X-JR-USDT-CSRF':csrf},body:data});
  const result=await response.json().catch(()=>({}));
  if(response.status===202 && result.ok===true && result.status==='submitted'){
   formStatus.textContent=t('رسید ثبت شد؛ شناسه پیگیری: ','Evidence submitted; claim ID: ')+result.claimId+' · '+t('هنوز پرداخت تأیید نشده و خدمت فعال نیست.','Payment is not verified and service is not yet activated.');
   button.disabled=true;form.reset();
  }else{
   formStatus.textContent=t('ثبت انجام نشد؛ وضعیت وجه تأیید نشده است. ','Evidence was not accepted; no payment is verified. ')+(result.error||'');
   button.disabled=false;
  }
 }catch(_){formStatus.textContent=t('اتصال برقرار نشد. برای جلوگیری از ثبت تکراری، وضعیت حساب خود را بررسی کنید.','Connection failed. Check your account status before retrying to avoid duplicate claims.');button.disabled=false;}
});
initialize();
})();