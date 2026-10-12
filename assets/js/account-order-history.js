/* Private purchase history. No localStorage, client cache or payment inference. */
(()=>{'use strict';
const host=document.querySelector('[data-resource="orders"]');
if(!host)return;
const section=host.querySelector('.case-section .appointment-card.empty');
if(!section)return;
const isEn=document.documentElement.lang==='en';
const tr=(fa,en)=>isEn?en:fa;
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=String(text);if(cls)n.className=cls;return n;};
const format=n=>new Intl.NumberFormat(isEn?'en-US':'fa-IR').format(n);
function showInfo(message,login){
  section.replaceChildren();
  const wrapper=el('div');wrapper.append(el('strong',message));
  if(login){const a=el('a',tr('ورود به حساب تأییدشده','Sign in to your verified account'),'button primary');
    a.href=isEn?'/en/login/':'/fa/login/';wrapper.append(a);}
  section.append(wrapper);
}
function render(orders){
  section.replaceChildren();
  if(!orders.length){showInfo(tr('هنوز سفارشی برای ایمیل تأییدشدهٔ این حساب ثبت نشده است. سفارش مهمان تنها پس از تأیید مالکیت ایمیل با حساب ارتباط می‌یابد.','No orders were found for this account’s verified email. Guest orders appear only after email ownership is verified.'),false);return;}
  const wrap=el('div');wrap.style.cssText='display:grid;gap:1rem;width:100%;min-width:0';
  for(const order of orders){
    const item=el('article','','appointment-card');item.style.cssText='display:block;min-width:0;padding:1rem;overflow-wrap:anywhere';
    const heading=el('strong',tr('سفارش ','Order ')+order.id);
    const state=order.paymentVerified===true
      ?tr('پرداخت در سرور تأیید شده','Server-verified payment')
      :({'created':tr('ثبت اولیه، پرداخت‌نشده','Created, unpaid'),
          'pending':tr('در انتظار تأیید درگاه','Awaiting gateway verification'),
          'failed':tr('پرداخت تأیید نشد','Payment not verified'),
          'cancelled':tr('سفارش لغو شده','Cancelled'),
          'paid':tr('بررسی شواهد پرداخت لازم است','Payment evidence requires review')}[order.state]||tr('در حال بررسی','Under review'));
    item.append(heading,el('p',state),el('p',tr('مبلغ سفارش: ','Order amount: ')+format(order.amountToman)+' '+tr('تومان','toman')));
    if(order.createdAt)item.append(el('small',tr('ثبت: ','Created: ')+order.createdAt));
    const list=el('ul');list.style.cssText='padding-inline-start:1.25rem;line-height:1.9';
    for(const line of order.items||[])list.append(el('li',(line.title||line.sku)+' × '+format(line.quantity)+' — '+format(line.subtotalToman)+' '+tr('تومان','toman')));
    item.append(list);
    item.append(el('small',tr('ارسال، تحویل، استرداد و دسترسی خدمت صرفاً پس از تأیید جداگانه نمایش داده می‌شوند.','Shipping, delivery, refunds and service access require separate verification.')));
    if(order.paymentVerified===true){
      const track=el('button',tr('پیگیری تحویل و نوبت','Track delivery or booking'),'button');
      track.type='button';
      const detail=el('div');detail.setAttribute('aria-live','polite');
      let loaded=false;
      track.addEventListener('click',async()=>{
        if(loaded){detail.hidden=!detail.hidden;return;}
        track.disabled=true;
        detail.replaceChildren(el('p',tr('در حال بررسی آخرین وضعیت واقعی…','Checking recorded fulfilment status…')));
        try{
          const res=await fetch('/api/commerce/fulfilment?order='+encodeURIComponent(order.id),
            {credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}});
          if(!res.ok)throw new Error('fulfilment_unavailable');
          const data=await res.json();if(data?.ok!==true)throw new Error('invalid_response');
          detail.replaceChildren();
          if(data.paymentRecord!=='provider_verified_not_bank_settlement'){
            detail.append(el('p',tr('پروندهٔ پرداخت برای ارائهٔ وضعیت تحویل هنوز به تطبیق نیاز دارد.','Payment evidence requires reconciliation before displaying fulfilment.')));
          }else{
            if(Array.isArray(data.serviceCases)&&data.serviceCases.length){
              const list=el('ul');
              const statuses={
                awaiting_contact:tr('در انتظار هماهنگی','Awaiting contact'),
                scheduling:tr('در حال تعیین نوبت','Scheduling'),
                booked:tr('نوبت ثبت شده','Booked'),
                in_progress:tr('در حال ارائه','In progress'),
                delivered:tr('تحویل ثبت شده','Delivery recorded'),
                cancelled:tr('لغو ثبت شده','Cancelled')
              };
              for(const c of data.serviceCases){
                const line=el('li',c.sku+' — '+(statuses[c.status]||tr('نیازمند بررسی','Review needed')));
                if(c.bookingStart)line.append(el('small',' · '+tr('زمان ثبت‌شده: ','Recorded slot: ')+c.bookingStart));
                list.append(line);
              }
              detail.append(el('strong',tr('وضعیت خدمات','Service cases')),list);
            }
            if(data.parcel){
              const p=data.parcel;
              const states={preparing:tr('آماده‌سازی','Preparing'),dispatched:tr('ارسال‌شده','Dispatched'),
                in_transit:tr('در مسیر','In transit'),delivered:tr('تحویل‌شده','Delivered'),returned:tr('مرجوع‌شده','Returned')};
              detail.append(el('p',tr('وضعیت مرسوله: ','Parcel: ')+(states[p.state]||tr('ثبت نشده','Not reported'))));
              if(p.carrier)detail.append(el('p',tr('شرکت حمل: ','Carrier: ')+p.carrier));
              if(p.trackingCode)detail.append(el('p',tr('کد رهگیری: ','Tracking code: ')+p.trackingCode));
            }
            if((!data.serviceCases||!data.serviceCases.length)&&!data.parcel)
              detail.append(el('p',tr('هنوز وضعیت تحویل تأییدشده‌ای برای این سفارش ثبت نشده است.','No verified fulfilment event has been recorded for this order.')));
          }
          loaded=true;
        }catch(_){detail.replaceChildren(el('p',tr('وضعیت تحویل در حال حاضر قابل تأیید نیست؛ اطلاعات فرضی نمایش داده نمی‌شود.','Delivery cannot currently be verified; no synthetic tracking data is shown.')));}
        finally{track.disabled=false;}
      });
      item.append(track,detail);
      const refund=el('details');
      refund.append(el('summary',tr('درخواست بررسی استرداد وجه','Request a refund review')));
      const form=el('form');form.style.cssText='display:grid;gap:.75rem;margin-top:.75rem;max-width:32rem';
      const label=el('label',tr('دلیل درخواست','Reason for request'));
      const select=el('select');select.required=true;
      const reasons=[
        ['service_not_provided',tr('خدمت ارائه نشده','Service not delivered')],
        ['cancel_request',tr('درخواست لغو سفارش','Cancellation request')],
        ['book_not_received',tr('کتاب دریافت نشده','Book not received')],
        ['incorrect_item',tr('کالا یا خدمت نادرست','Incorrect item or service')],
        ['duplicate_payment',tr('پرداخت تکراری','Duplicate payment')],
        ['other',tr('سایر موارد','Other')]
      ];
      for(const [value,title] of reasons){
        const option=el('option',title);option.value=value;select.append(option);
      }
      label.append(select);
      const request=el('button',tr('ثبت درخواست برای بررسی','Submit for review'),'button');
      request.type='submit';
      const outcome=el('p');outcome.setAttribute('role','status');
      form.append(label,request,el('small',tr('ثبت درخواست به معنی بازپرداخت یا لغو خودکار نیست.','Requesting a review does not automatically issue a refund or cancel an order.')),outcome);
      form.addEventListener('submit',async event=>{
        event.preventDefault();
        if(!window.confirm(tr('درخواست بررسی این سفارش ثبت شود؟ وجه بدون بررسی و تأیید بازپرداخت نمی‌شود.','Submit this request for review? No bank refund is issued automatically.')))return;
        request.disabled=true;
        outcome.textContent=tr('در حال ثبت درخواست…','Submitting request…');
        try{
          const response=await fetch('/api/commerce/refund-request',{
            method:'POST',credentials:'same-origin',cache:'no-store',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({orderId:order.id,reasonCode:select.value})
          });
          const data=await response.json();
          if(!response.ok||data?.ok!==true)throw Error('request_failed');
          outcome.textContent=tr('درخواست با شناسه ','Request ')+data.requestId+tr(' ثبت شد؛ بررسی و بازپرداخت احتمالی جداگانه انجام می‌شود.',' was recorded. Review and any bank refund are separate steps.');
          form.querySelector('select').disabled=true;
        }catch(_){
          outcome.textContent=tr('ثبت درخواست اکنون تأیید نشد. از بخش پشتیبانی پیگیری کنید.','Submission could not be verified. Please contact support.');
          request.disabled=false;
        }
      });
      refund.append(form);item.append(refund);

    }
    wrap.append(item);
  }
  section.append(wrap);
}
async function load(){
  section.setAttribute('aria-busy','true');
  showInfo(tr('در حال بررسی امن سفارش‌های حساب…','Securely checking account orders…'),false);
  try{
    const res=await fetch('/api/commerce/history',{method:'GET',credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}});
    if(res.status===401){showInfo(tr('برای مشاهده سفارش‌های خود ابتدا وارد حساب دارای ایمیل تأییدشده شوید.','Sign in with a verified email to view your orders.'),true);return;}
    if(!res.ok)throw new Error('history_unavailable');
    const data=await res.json();if(data?.ok!==true||!Array.isArray(data.orders))throw new Error('history_invalid');
    render(data.orders);
  }catch(_){showInfo(tr('تاریخچه واقعی سفارش‌ها در حال حاضر در دسترس نیست؛ اطلاعات فرضی نمایش داده نمی‌شود.','Order history is currently unavailable; no simulated purchases are shown.'),false);}
  finally{section.setAttribute('aria-busy','false');}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
})();