(()=>{'use strict';
const root=document.querySelector('[data-usdt-admin]');if(!root)return;
const fa=document.documentElement.lang==='fa',t=(f,e)=>fa?f:e;
const status=root.querySelector('[data-usdt-admin-status]'),list=root.querySelector('[data-usdt-admin-list]');
const E=(tag,value)=>{const e=document.createElement(tag);if(value!==undefined)e.textContent=value;return e;};
const say=x=>{status.textContent=x;};
async function json(path,opt={}){const r=await fetch(path,{credentials:'same-origin',cache:'no-store',...opt});const j=await r.json();if(!r.ok||j.ok!==true)throw Error('request');return j;}
async function session(){const j=await json('/api/admin/operations/session');if(j.mfaRequired!==false||typeof j.csrfToken!=='string')throw Error('mfa');return j.csrfToken;}
function amount(n){let s=String(n).padStart(7,'0');return s.slice(0,-6)+'.'+s.slice(-6);}
function render(row){
 const box=E('article');box.append(E('h3',row.order_id),E('p',row.status+' | '+amount(row.amount_micros)+' USDT | '+row.customer_email),E('p',String(row.claimed_hash||'')),E('p','Receiver: '+row.receiver),E('p','Token: '+row.token_contract),E('p','UTC: '+new Date(row.issued_at*1000).toISOString()+' — '+new Date(row.expires_at*1000).toISOString()));
 const form=E('form'),select=E('select'),o1=E('option',t('تأیید دریافت واقعی','Settle verified credit')),o2=E('option',t('لغو پس از تأیید عدم دریافت','Cancel after confirming no transfer'));o1.value='settle';o2.value='cancel';select.append(o1,o2);if(row.status!=='submitted'){o1.disabled=true;select.value='cancel';}
 const inputs={};function field(key,label,type='text'){const l=E('label',label),e=E('input');e.type=type;l.append(e);form.append(l);inputs[key]=e;return e;}
 form.append(select);const credit=field('creditReference',t('شناسه یکتای واریز در صرافی','Unique exchange deposit credit reference'));
 const val=field('creditedAmountUsdt',t('مبلغ دقیق واریزشده (شش رقم اعشار)','Exact credited USDT, six decimals'));val.value=amount(row.amount_micros);
 const at=field('transferredAt',t('زمان ثبت انتقال روی زنجیره (Unix seconds)','On-chain transfer timestamp (Unix seconds)'),'number');
 const checks={exchangeCreditConfirmed:t('دریافت واقعی در حساب صرافی','Actual credited deposit'),senderOwnershipConfirmed:t('مالکیت فرستنده مستقل تأیید شد','Payer ownership independently checked'),chain56Confirmed:'BSC chain 56',tokenContractConfirmed:t('قرارداد دقیق توکن','Exact token contract'),receiverConfirmed:t('آدرس گیرنده','Exact receiver'),finalityConfirmed:t('نهایی‌شدن تراکنش','Transaction finality'),noCreditOrPendingTransferConfirmed:t('هیچ وجه یا انتقال در انتظار دریافت وجود ندارد','No credit or pending transfer')};
 for(const [key,label] of Object.entries(checks))field(key,label,'checkbox');
 const note=field('note',t('یادداشت مستند بررسی (حداقل ۱۲ حرف)','Review evidence note (minimum 12 characters)'));note.required=true;note.minLength=12;note.maxLength=1000;
 const button=E('button',t('ثبت تصمیم مالی','Record financial decision'));form.append(button);box.append(form);
 form.addEventListener('submit',async e=>{e.preventDefault();if(button.disabled)return;const action=select.value;
   if(!confirm(t('آیا مدارک واقعی را مستقلاً بررسی کرده‌اید؟','Have you independently checked the actual evidence?')))return;
   const body={orderId:row.order_id,action,transactionHash:row.claimed_hash,note:note.value,creditReference:credit.value,creditedAmountUsdt:val.value,transferredAt:Number(at.value)};
   for(const key of Object.keys(checks))body[key]=inputs[key].checked;
   button.disabled=true;try{const csrf=await session();await json('/api/admin/operations/usdt/review',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify(body)});await load();}
   catch(_){say(t('تصمیم ثبت نشد. شواهد و وضعیت را دوباره بررسی کنید.','Decision not confirmed. Recheck evidence and state.'));button.disabled=false;}
 });return box;
}
async function load(){try{await session();const j=await json('/api/admin/operations/usdt/invoices');list.replaceChildren(...j.invoices.map(render));say(t('فاکتورهای در انتظار: ','Pending invoices: ')+j.invoices.length);}catch(_){list.replaceChildren();say(t('دسترسی مدیر، MFA یا پایگاه داده تأیید نشد.','Admin access, MFA or schema could not be verified.'));}}
root.querySelector('[data-usdt-admin-load]').addEventListener('click',load);
})();
