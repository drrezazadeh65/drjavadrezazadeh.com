(()=>{'use strict';
const root=document.querySelector('[data-jr-usdt-checkout]');if(!root)return;
const lang=document.documentElement.lang, pick=(fa,en,ar)=>lang==='fa'?fa:lang==='ar'?ar:en;
const text={
 unavailable:pick('پرداخت مستقیم هنوز در سرور تأیید نشده است. وجهی ارسال نکنید.','Direct checkout is not yet verified on the server. Do not send funds.','لم يتم تأكيد الدفع المباشر على الخادم بعد. لا ترسل أموالاً.'),
 login:pick('برای صدور فاکتور، وارد حساب تأییدشده شوید.','Sign in with a verified account to issue an invoice.','سجّل الدخول بحساب موثق لإصدار فاتورة.'),
 ready:pick('قیمت از سرور محاسبه می‌شود. فقط فاکتور معتبر قابل پرداخت است.','The server calculates the price. Only a valid invoice can be paid.','يحسب الخادم السعر. لا تدفع إلا فاتورة صالحة.'),
 failed:pick('درخواست تأیید نشد؛ قبل از تلاش مجدد وضعیت فاکتورها را بررسی کنید.','Request not confirmed; check your invoices before retrying.','لم يتم تأكيد الطلب؛ تحقق من فواتيرك قبل إعادة المحاولة.'),
 order:pick('شناسه سفارش','Order ID','رقم الطلب'),amount:pick('مبلغ قطعی USDT','Exact USDT amount','مبلغ USDT المحدد'),
 deadline:pick('مهلت انتقال','Transfer deadline','مهلة التحويل'),network:pick('شبکه BSC / BEP20 فقط','BSC / BEP20 only','شبكة BSC / BEP20 فقط'),
 receiver:pick('آدرس دریافت','Receiving address','عنوان الاستلام'),contract:pick('قرارداد توکن','Token contract','عقد الرمز'),
 verified:pick('پرداخت تأیید شده','Payment verified','تم تأكيد الدفع'),
 pending:pick('پرداخت هنوز تأیید نشده است','Payment not yet verified','لم يتم تأكيد الدفع بعد'),
 expired:pick('فاکتور قابل پرداخت نیست؛ اگر وجه فرستاده‌اید هش آن را ثبت کنید.','Do not send funds. If already transferred, submit its hash.','لا ترسل أموالاً. إذا تم التحويل فأرسل معرّف المعاملة.'),
 hash:pick('هش تراکنش (TXID)','Transaction hash (TXID)','معرّف المعاملة'),
 claim:pick('ثبت برای بررسی','Submit for review','إرسال للمراجعة'),
 copy:pick('کپی','Copy','نسخ'),
 no:pick('فاکتوری ثبت نشده است.','No invoices yet.','لا توجد فواتير بعد.'),
 contact:pick('انتقال‌های دیرهنگام یا مبلغ متفاوت نیازمند بررسی مدیر است.','Late or mismatched transfers require owner review.','تتطلب التحويلات المتأخرة أو غير المطابقة مراجعة المدير.')
};
const $=q=>root.querySelector(q),form=$('[data-usdt-form]'),status=$('[data-usdt-status]'),list=$('[data-usdt-invoices]');
const E=(tag,value)=>{const e=document.createElement(tag);if(value!==undefined)e.textContent=value;return e;};
let csrf='',ready=false,items=[],offers=[],busy=false,request=null,requestBody=null;
const say=v=>{status.textContent=v;};
async function call(p,body){const opt={credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}};if(body!==undefined){opt.method='POST';opt.headers['Content-Type']='application/json';opt.headers['X-JR-USDT-CSRF']=csrf;opt.body=JSON.stringify(body);}const r=await fetch('/api/crypto/usdt/'+p,opt);const j=await r.json();return {ok:r.ok&&j.ok===true,status:r.status,data:j};}
function mode(){
 const donation=form.elements.purpose.value==='donation',authorized=form.elements.purpose.value==='authorized',selected=items.find(x=>x.sku===form.elements.sku.value),book=!authorized&&selected?.kind==='book';
 $('[data-usdt-purchase]').hidden=donation;$('[data-usdt-donation]').hidden=!donation;$('[data-usdt-authorized]').hidden=!authorized;form.elements.offerId.disabled=!authorized;form.elements.offerId.required=authorized;$('[data-usdt-product-field]').hidden=authorized;$('[data-usdt-shipping]').hidden=!book;
 form.elements.quantity.disabled=!book; if(!book)form.elements.quantity.value='1';
 for(const k of ['name','phone'])form.elements[k].disabled=donation;form.elements.sku.disabled=donation||authorized;
 form.elements.name.required=!donation;
 for(const k of ['address','postal']){form.elements[k].disabled=donation||!book;form.elements[k].required=!donation&&book;}
 for(const k of ['amountToman','focus'])form.elements[k].disabled=!donation;
}
function display(row){
 const card=E('article');card.append(E('h3',text.order+': '+row.orderId),E('p',text.amount+': '+row.amountUsdt),E('p',row.amountToman+' IRT'),E('p',text.deadline+': '+new Date(row.expiresAt*1000).toLocaleString()),E('p',row.paymentVerified?text.verified:text.pending));
 if(row.mayTransfer&&row.chainId===56&&/^0x[a-fA-F0-9]{40}$/.test(row.receiveAddress||'')&&/^0x[a-fA-F0-9]{40}$/.test(row.tokenContract||'')){
   const instructions=E('section');instructions.append(E('p',text.network));card.append(instructions);
   for(const [label,value] of [[text.receiver,row.receiveAddress],[text.contract,row.tokenContract],[text.amount,row.amountUsdt]]){
     const p=E('p',label+': '),code=E('code',value),copy=E('button',text.copy);copy.type='button';copy.addEventListener('click',()=>navigator.clipboard?.writeText(value).catch(()=>{}));p.append(code,' ',copy);instructions.append(p);
   }
   setTimeout(()=>{if(!card.isConnected)return;instructions.replaceChildren(E('p',text.expired));},Math.max(0,Math.min(900000,row.expiresAt*1000-Date.now())));
 }else if(row.status==='issued'){card.append(E('p',text.expired));}
 if(row.status==='issued'){
   const claim=E('form'),label=E('label',text.hash),input=E('input'),button=E('button',text.claim);
   input.required=true;input.pattern='0x[0-9a-fA-F]{64}';input.maxLength=66;label.append(input);claim.append(label,button);
   claim.addEventListener('submit',async e=>{e.preventDefault();if(button.disabled)return;button.disabled=true;
     try{const res=await call('claim',{orderId:row.orderId,transactionHash:input.value.trim()});if(!res.ok)throw Error('claim');await refresh();}
     catch(_){say(text.failed);button.disabled=false;}
   });card.append(claim);
 }
 if(row.transactionHash)card.append(E('p',text.hash+': '+row.transactionHash));
 card.append(E('p',text.contact));return card;
}
async function refresh(){
 try{const result=await call('invoices');if(!result.ok){form.hidden=true;$('[data-usdt-login]').hidden=result.status!==401;say(result.status===401?text.login:text.unavailable);return;}
   csrf=result.data.csrfToken;ready=result.data.enabled===true;const rows=result.data.invoices||[];
   list.replaceChildren(...(rows.length?rows.map(display):[E('p',text.no)]));
   const open=rows.some(x=>['issued','submitted'].includes(x.status));form.hidden=!ready||open;
   say(ready?text.ready:text.unavailable);
 }catch(_){form.hidden=true;say(text.unavailable);}
}
async function init(){
 await refresh();if(!ready||!csrf)return;
 try{const result=await call('catalog');if(!result.ok)throw Error('catalog');items=result.data.items||[];offers=result.data.approvedOffers||[];
   form.elements.offerId.replaceChildren(...offers.map(x=>{const e=E('option',x.title+' — '+x.invoice_reference+' — '+x.amount_toman+' IRT');e.value=x.id;return e;}));
   form.elements.purpose.querySelector('option[value=authorized]').disabled=offers.length===0;
   form.elements.sku.replaceChildren(...items.map(x=>{const e=E('option',x.title+' — '+x.sku+' — '+x.priceToman+' IRT');e.value=x.sku;return e;}));
   const query=new URLSearchParams(location.search);if(query.get('purpose')==='donation')form.elements.purpose.value='donation';
   const sku=query.get('sku');if(items.some(x=>x.sku===sku))form.elements.sku.value=sku;
   mode();
 }catch(_){form.hidden=true;say(text.unavailable);}
}
form.elements.purpose.addEventListener('change',mode);form.elements.sku.addEventListener('change',mode);
$('[data-usdt-refresh]').addEventListener('click',refresh);
form.addEventListener('submit',async e=>{
 e.preventDefault();if(!ready||!csrf||busy)return;
 const f=form.elements,donation=f.purpose.value==='donation';
 const customer={name:f.name.value,phone:f.phone.value,address:f.address.value,postal:f.postal.value};
 const b=donation?{purpose:'donation',amountToman:Number(f.amountToman.value),focus:f.focus.value}:f.purpose.value==='authorized'?{purpose:'authorized',offerId:f.offerId.value,customer}:{purpose:'purchase',items:[{sku:f.sku.value,quantity:Number(f.quantity.value)}],customer};
 const body=JSON.stringify(b);
 if(requestBody!==null&&requestBody!==body){say(text.failed);await refresh();return;}
 if(!request){request=crypto.randomUUID();requestBody=body;}
 busy=true;const button=form.querySelector('button[type=submit]');button.disabled=true;
 try{const r=await call('quote',{...b,requestId:request});if(!r.ok){say(text.failed);await refresh();return;}
   request=null;requestBody=null;await refresh();
 }catch(_){say(text.failed);}finally{busy=false;button.disabled=false;}
});
init();
})();
