// Bookstore UI. Browser cart is convenience state only; server pricing/order/payment remains authoritative.
(function(){
 const raw=location.pathname.replace(/index\.html$/,'');
 const gh='/drjavadrezazadeh.com/';
 const base=raw.includes(gh)?gh:'/';
 const root=p=>(base==='/'?'/':base)+String(p||'').replace(/^\/+/, '');
 const isFa=document.documentElement.lang==='fa';
 const CART_KEY='jr-book-cart-v1';
 const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
 function bookCoverUrl(book){
  const path=String(book?.bibliography?.cover_image||'');
  return /^\/assets\/images\/books\/[a-z0-9][a-z0-9._-]*\.(?:avif|webp|png|jpe?g)$/i.test(path)?root(path):null;
 }

 const API='https://drjavadrezazadeh-payment.dr-rezazadeh65.workers.dev';
 // Catalogue prices never authorise payment. The live Worker must explicitly permit books.
 let bookPaymentReady=false;
 async function verifyBookPaymentCapability(){
  try{
   const response=await fetch(API+'/commerce/health',{cache:'no-store',credentials:'omit'});
   if(!response.ok)return false;
   const health=await response.json();
   return health?.ok===true&&health.service==='commerce'&&
    health.checkout===true&&health.capabilities?.books===true;
  }catch(_){return false}
 }

 function money(amount,currency){
  if(!Number.isInteger(amount)||!currency) return isFa?'قیمت هنوز اعلام نشده':'Price not yet published';
  if(currency==='IRT') return new Intl.NumberFormat(isFa?'fa-IR':'en-US').format(amount)+(isFa?' تومان':' toman');
  try{return new Intl.NumberFormat(isFa?'fa-IR':'en-US',{style:'currency',currency}).format(amount/100);}
  catch(e){return String(amount)+' '+currency;}
 }
 function cleanCart(input){
  if(!Array.isArray(input))return [];
  const items=[];
  for(const row of input.slice(0,60)){
   if(!row||typeof row.book_id!=='string'||!/^[a-z0-9-]{1,40}$/.test(row.book_id))continue;
   if(!Number.isInteger(row.quantity)||row.quantity<1)continue;
   const qty=Math.min(20,row.quantity);
   const prev=items.find(x=>x.book_id===row.book_id);
   if(prev){prev.quantity=Math.min(20,prev.quantity+qty);continue}
   if(items.length>=20)break;
   items.push({book_id:row.book_id,quantity:qty});
  }
  return items;
 }
 function readCart(){
  try{return cleanCart(JSON.parse(localStorage.getItem(CART_KEY)||'[]'))}
  catch(e){return[]}
 }
 function writeCart(items){try{localStorage.setItem(CART_KEY,JSON.stringify(cleanCart(items)))}catch(e){} updateCartBadge();}
 function updateCartBadge(){const n=readCart().reduce((s,x)=>s+(x.quantity||1),0);document.querySelectorAll('[data-cart-count]').forEach(x=>x.textContent=String(n));}
 async function load(){
  const res=await fetch(root('assets/data/book-catalog.json'),{cache:'no-store'});
  if(!res.ok) throw new Error('catalog');
  return res.json();
 }
 function ready(book){
  return book?.commerce?.sellable===true&&Number.isInteger(book.commerce.price)&&Boolean(book.commerce.currency);
 }
 function add(book){
  if(!ready(book)) return;
  const cart=readCart();
  const found=cart.find(x=>x.book_id===book.id);
  if(found) found.quantity=Math.min(20,(found.quantity||1)+1);
  else cart.push({book_id:book.id,quantity:1});
  writeCart(cart);
 }
 function card(book){
  const el=document.createElement('article');
  el.className='book-product-card';
  const coverSrc=bookCoverUrl(book);
  const cover=coverSrc?'<figure class="book-cover"><img src="'+escapeHtml(coverSrc)+'" width="600" height="900" loading="lazy" decoding="async" alt="'+escapeHtml(isFa?'جلد کتاب «'+book.title_fa+'» اثر جواد رضازاده یزدلی':'Cover of '+book.english_reference_title+' by Javad Rezazadeh Yazdeli')+'"></figure>':'<div class="book-cover-placeholder"><strong lang="fa" dir="rtl">'+escapeHtml(book.title_fa)+'</strong></div>';
  el.innerHTML=cover+
   '<div class="book-product-copy"><span class="status-chip">'+(isFa?'منتشرشده':'Published')+'</span>'+
   '<h2 dir="rtl" lang="fa">'+escapeHtml(book.title_fa)+'</h2><p>'+escapeHtml(isFa?book.description_fa:book.description_en)+'</p>'+
   '<div class="book-price">'+escapeHtml(money(book.commerce?.price,book.commerce?.currency))+'</div>'+
   '<div class="actions"><a class="button" href="'+root((isFa?'fa':'en')+'/shop/book/?id='+encodeURIComponent(book.id))+'">'+(isFa?'جزئیات کتاب':'Book details')+'</a>'+
   (ready(book)?'<button class="button primary" type="button" data-add-book="'+escapeHtml(book.id)+'">'+(isFa?'افزودن به سبد':'Add to cart')+'</button>':'<span class="book-pending">'+(isFa?'قیمت ثبت شده است؛ خرید پس از تأیید موجودی، شرایط ارسال و درگاه معتبر فعال می‌شود.':'The price is recorded; purchase activates after stock, fulfilment terms and the verified payment path are ready.')+'</span>')+
   '</div></div>';
  return el;
 }
 function renderCatalog(data){
  const host=document.querySelector('[data-book-catalog]'); if(!host) return;
  host.innerHTML=''; data.books.forEach(b=>host.appendChild(card(b)));
  host.addEventListener('click',e=>{const btn=e.target.closest('[data-add-book]');if(!btn)return;const b=data.books.find(x=>x.id===btn.dataset.addBook);if(b)add(b);});
 }
 function renderDetail(data){
  const host=document.querySelector('[data-book-detail]'); if(!host) return;
  const id=new URLSearchParams(location.search).get('id');
  const b=data.books.find(x=>x.id===id);
  if(!b){host.innerHTML='<h1>'+(isFa?'کتاب پیدا نشد':'Book not found')+'</h1>';return;}
  document.title=(isFa?b.title_fa:b.english_reference_title)+' | '+(isFa?'فروشگاه کتاب':'Bookstore');
  const detailCoverSrc=bookCoverUrl(b);
  const detailCover=detailCoverSrc?'<figure class="book-cover"><img src="'+escapeHtml(detailCoverSrc)+'" width="600" height="900" decoding="async" alt="'+escapeHtml(isFa?'جلد کتاب «'+b.title_fa+'» اثر جواد رضازاده یزدلی':'Cover of '+b.english_reference_title+' by Javad Rezazadeh Yazdeli')+'"></figure>':'<div class="book-cover-placeholder"><strong>'+escapeHtml(b.title_fa)+'</strong></div>';
  host.innerHTML='<div class="book-detail-layout">'+detailCover+'<div class="book-detail-copy"><p class="kicker">'+(isFa?'کتاب منتشرشده':'Published book')+'</p><h1 lang="fa" dir="rtl">'+escapeHtml(b.title_fa)+'</h1>'+
   '<p class="lead">'+escapeHtml(isFa?b.description_fa:b.description_en)+'</p>'+
   '<dl class="book-meta"><div><dt>'+(isFa?'نویسنده':'Author')+'</dt><dd>Javad Rezazadeh Yazdeli</dd></div>'+
   '<div><dt>ISBN</dt><dd>'+escapeHtml(b.bibliography.isbn||(isFa?'هنوز تأیید نشده':'Not yet verified'))+'</dd></div>'+
   '<div><dt>'+(isFa?'ناشر':'Publisher')+'</dt><dd>'+escapeHtml(b.bibliography.publisher||(isFa?'هنوز تأیید نشده':'Not yet verified'))+'</dd></div>'+
   '<div><dt>'+(isFa?'سال انتشار':'Publication year')+'</dt><dd>'+escapeHtml(b.bibliography.publication_year||(isFa?'هنوز تأیید نشده':'Not yet verified'))+'</dd></div>'+
   '<div><dt>'+(isFa?'نوبت چاپ':'Edition')+'</dt><dd>'+escapeHtml(b.bibliography.edition||(isFa?'هنوز تأیید نشده':'Not yet verified'))+'</dd></div>'+
   '<div><dt>'+(isFa?'قالب':'Format')+'</dt><dd>'+(b.commerce?.formats_confirmed?.includes('PRINT')?(isFa?'چاپی':'Print'):(isFa?'نیازمند تأیید':'Not yet verified'))+'</dd></div>'+
   '<div><dt>'+(isFa?'قیمت ثبت‌شده':'Listed price')+'</dt><dd>'+escapeHtml(money(b.commerce?.price,b.commerce?.currency))+'</dd></div></dl>'+
   '<p class="store-notice">'+(isFa?'جزئیات کتاب‌شناختیِ نامشخص تا زمان تأیید رسمی خالی می‌مانند. سفارش و پرداخت اینترنتی هنوز فعال نیست.':'Unverified bibliographic fields are deliberately marked as such. Online orders and payment are not yet active.')+'</p>'+
   '<div class="actions">'+
   (ready(b)?'<button class="button primary" type="button" data-detail-add="'+escapeHtml(b.id)+'">'+(isFa?'افزودن به فهرست انتخاب‌ها':'Add to selection')+'</button>':'')+
   '<a class="button" data-book-info-request href="mailto:dr.rezazadeh65@gmail.com?subject='+encodeURIComponent((isFa?'درخواست اطلاعات کتاب: ':'Book information enquiry: ')+b.title_fa)+
   '&body='+encodeURIComponent((isFa?'لطفاً اطلاعات تأییدشده کتاب، جزئیات نشر، نحوه تهیه و شرایط ارسال را اعلام کنید: ':'Please share verified publication metadata, availability, and delivery terms for: ')+b.title_fa)+'">'+
   (isFa?'درخواست اطلاعات تکمیلی':'Request verified book details')+'</a></div></div></div>';
  host.addEventListener('click',e=>{if(e.target.closest('[data-detail-add]'))add(b);});
 }
 function renderCart(data){
  const host=document.querySelector('[data-book-cart]'); if(!host)return;
  const cart=readCart();
  const books=cart.map(item=>({item,book:data.books.find(b=>b.id===item.book_id)})).filter(row=>row.book);
  host.replaceChildren();
  if(!books.length){
   host.innerHTML='<p class="lead">'+(isFa?'سبد انتخاب کتاب خالی است.':'Your book selection is empty.')+'</p>';
   host.onclick=null;
   return;
  }
  let total=0,currency=null,valid=true;
  for(const {item,book:b} of books){
    if(!ready(b)){valid=false}
    else {
      currency=currency||b.commerce.currency;
      if(currency!==b.commerce.currency)valid=false;
      total+=b.commerce.price*item.quantity;
    }
    const row=document.createElement('div');
    row.className='cart-row';
    row.innerHTML='<div><strong lang="fa" dir="rtl">'+escapeHtml(b.title_fa)+'</strong><small>'+
      (isFa?'تعداد':'Qty')+': '+item.quantity+'</small></div>'+
      '<div>'+escapeHtml(money(ready(b)?b.commerce.price*item.quantity:null,b.commerce?.currency))+'</div>'+
      '<div class="cart-quantity-controls" aria-label="تغییر تعداد کتاب"><button type="button" data-decrease-book="'+escapeHtml(b.id)+'" aria-label="کاهش تعداد '+escapeHtml(b.title_fa)+'">−</button><span aria-live="polite">'+item.quantity+'</span><button type="button" data-increase-book="'+escapeHtml(b.id)+'" aria-label="افزایش تعداد '+escapeHtml(b.title_fa)+'">+</button></div><button type="button" data-remove-book="'+escapeHtml(b.id)+'">'+(isFa?'حذف':'Remove')+'</button>';
    host.appendChild(row);
  }
  const summary=document.createElement('div');
  summary.className='cart-summary';
  const amount=valid?money(total,currency):(isFa?'نیازمند بررسی':'Requires confirmation');
  const formattedLines=books.map(({item,book:b})=>
    '- '+b.title_fa+' ('+b.english_reference_title+') × '+item.quantity+
    ' | '+money(ready(b)?b.commerce.price*item.quantity:null,b.commerce?.currency)
  );
  const disclosure=isFa?
    'این فهرست فقط برای استعلام است. هیچ سفارش یا پرداختی انجام نشده است. قیمت و موجودی هنگام پاسخ بررسی می‌شوند؛ ارسال کتاب رایگان است و هزینه آن بر عهده فروشگاه است.':
    'This is an availability enquiry only. No order or payment has been placed. Prices and availability require confirmation; book shipping is free and paid by the store.';
  const mailBody=(isFa?
    ['درخواست استعلام موجودی و شرایط خرید کتاب','',...formattedLines,'',
     'جمع نمایشی: '+amount,'','لطفاً موجودی واقعی، ارسال رایگان، شیوه بازگشت و امکان سفارش را پیش از هر پرداخت اعلام کنید.',
     '','این پیام ثبت سفارش یا تأیید پرداخت نیست.']:
    ['Book availability and fulfilment enquiry','',...formattedLines,'',
     'Illustrative subtotal: '+amount,'','Please confirm actual stock, free shipping, return policy, and whether ordering is available before any payment.',
     '','This enquiry is not an order or payment confirmation.']).join('\n');
  summary.innerHTML='<p class="store-notice">'+(isFa?'هزینه ارسال: رایگان (بر عهده فروشگاه)':'Shipping: free (paid by the store)')+'</p><strong>'+(isFa?'جمع نمایشی انتخاب‌ها':'Illustrative selection subtotal')+
    ': '+escapeHtml(amount)+'</strong><p>'+disclosure+'</p>';
  const actions=document.createElement('div');
  actions.className='actions';
  const checkout=document.createElement('button');
  checkout.type='button';
  checkout.className='button primary';
  checkout.dataset.bookPayment='';
  checkout.textContent=isFa?'پرداخت آنلاین کتاب‌ها':'Pay for books online';
  checkout.disabled=!bookPaymentReady;
  checkout.textContent=bookPaymentReady?(isFa?'پرداخت آنلاین کتاب‌ها':'Pay for books online'):(isFa?'پرداخت آنلاین کتاب هنوز فعال نیست':'Book checkout not yet available');
  checkout.title=bookPaymentReady?(isFa?'ثبت سفارش و انتقال به درگاه امن':'Create order and proceed to secure payment'):(isFa?'تا تأیید آمادگی سرور، وجهی دریافت نمی‌شود':'Payment remains disabled until server readiness is verified');
  actions.appendChild(checkout);

  const inquiry=document.createElement('a');
  inquiry.className='button primary';
  inquiry.dataset.bookInquiry='';
  inquiry.href='mailto:dr.rezazadeh65@gmail.com?subject='+
    encodeURIComponent(isFa?'استعلام موجودی و شرایط خرید کتاب':'Book availability and delivery enquiry')+
    '&body='+encodeURIComponent(mailBody);
  inquiry.textContent=isFa?'استعلام موجودی و شرایط با ایمیل':'Enquire about stock and shipping';
  inquiry.setAttribute('aria-label',isFa?'باز کردن برنامه ایمیل برای استعلام، بدون ثبت سفارش':'Open email client to enquire; no order is placed');
  actions.appendChild(inquiry);
  const copy=document.createElement('button');
  copy.type='button';
  copy.className='button';
  copy.dataset.bookCopy='';
  copy.textContent=isFa?'کپی خلاصه انتخاب‌ها':'Copy selection summary';
  actions.appendChild(copy);
  const status=document.createElement('p');
  status.dataset.bookCopyStatus='';
  status.setAttribute('role','status');
  status.setAttribute('aria-live','polite');
  status.className='book-pending';
  summary.appendChild(actions);
  summary.appendChild(status);
  host.appendChild(summary);
  host.onclick=async e=>{
   const increase=e.target.closest('[data-increase-book]');
   const decrease=e.target.closest('[data-decrease-book]');
   if(increase||decrease){
     const id=(increase||decrease).dataset[increase?'increaseBook':'decreaseBook'];
     const next=readCart();const row=next.find(x=>x.book_id===id);
     if(row){row.quantity=Math.max(0,Math.min(20,row.quantity+(increase?1:-1)));writeCart(next.filter(x=>x.quantity>0));renderCart(data)}
     return;
   }
   const remove=e.target.closest('[data-remove-book]');
   if(remove){
     writeCart(readCart().filter(x=>x.book_id!==remove.dataset.removeBook));
     renderCart(data);
     return;
   }
   if(e.target.closest('[data-book-payment]')){
     if(!bookPaymentReady){status.textContent=isFa?'پرداخت کتاب هنوز فعال نیست؛ از گزینه استعلام ایمیلی استفاده کنید.':'Book checkout is not active; use the email enquiry.';return}
     const button=e.target.closest('[data-book-payment]');
     button.disabled=true;
     status.textContent=isFa?'در حال بررسی ایمن سفارش...':'Checking order securely...';
     try{
       const response=await fetch('https://drjavadrezazadeh-payment.dr-rezazadeh65.workers.dev/commerce/create',{
         method:'POST',mode:'cors',credentials:'omit',headers:{'Content-Type':'application/json'},
         body:JSON.stringify({items:books.map(({item,book})=>({sku:'book:'+book.id,quantity:item.quantity}))})
       });
       const result=await response.json();
       if(response.ok&&result.ok&&typeof result.paymentUrl==='string'){
         const link=new URL(result.paymentUrl,location.origin);
         if(link.origin!==location.origin||link.pathname!=='/fa/shop/payment-start/'||link.hash||link.username||link.password||link.searchParams.size!==1||!link.searchParams.get('gateway'))throw Error('unsafe_payment_url');
         location.assign(link.href);return;
       }
       if(result.error==='checkout_disabled'){
         status.textContent=isFa?'پرداخت آنلاین هنوز فعال نیست؛ پیش از تلاش مجدد وضعیت سفارش را از طریق ایمیل رسمی پیگیری کنید.':'Checkout is not active; verify the order status through the official email before retrying.';
       }else status.textContent=isFa?'ثبت سفارش تأیید نشد؛ پیش از تلاش مجدد وضعیت را از طریق ایمیل رسمی پیگیری کنید.':'Order creation was not confirmed; verify its status through the official email before retrying.';
     }catch(_){status.textContent=isFa?'وضعیت درخواست پرداخت نامشخص است؛ از پرداخت مجدد خودداری کنید و از طریق ایمیل رسمی پیگیری نمایید.':'Payment-request status is unknown; do not retry payment until you verify the order through the official email.'}
     finally{button.disabled=true;button.textContent=isFa?'برای بررسی مجدد درگاه صفحه را تازه‌سازی کنید':'Refresh to recheck payment readiness';}
     return;
   }
   if(!e.target.closest('[data-book-copy]'))return;
   try{
     if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(mailBody);
     else{
       const field=document.createElement('textarea');
       field.value=mailBody;
       field.setAttribute('readonly','');
       field.style.cssText='position:fixed;top:-100px;opacity:0';
       document.body.appendChild(field);
       field.select();
       const copied=document.execCommand('copy');
       field.remove();
       if(!copied)throw Error('copy denied');
     }
     status.textContent=isFa?'خلاصه انتخاب‌ها کپی شد؛ هنوز سفارشی ثبت نشده است.':'Selection copied. No order has been placed.';
   }catch(_){
     status.textContent=isFa?'کپی خودکار ممکن نشد؛ از گزینه ایمیل استفاده کنید.':'Automatic copy unavailable; use the email enquiry option.';
   }
  };
 }
 function renderCheckout(data){
  const host=document.querySelector('[data-book-checkout]'); if(!host) return;
  const cart=readCart();
  const books=cart.map(x=>({item:x,book:data.books.find(b=>b.id===x.book_id)})).filter(x=>x.book);
  const valid=books.length>0&&books.every(x=>ready(x.book));
  const deliveryCaptureReady=false; // No secure order-linked shipping persistence is deployed.
  host.innerHTML='<p class="kicker">'+(isFa?'تسویه امن':'Secure checkout')+'</p><h1>'+(isFa?'سفارش کتاب':'Book order')+'</h1>'+
   '<p class="lead">'+(isFa?'اطلاعات سفارش و مبلغ نهایی پیش از انتقال به درگاه دوباره بررسی می‌شود و سفارش فقط پس از تأیید موفق پرداخت نهایی خواهد شد.':'Order details and the final amount are checked again before payment, and the order is completed only after successful payment confirmation.')+'</p>'+
   '<div class="store-notice">'+(valid?(isFa?'ارسال کتاب رایگان است. مبلغ نهایی در سرور محاسبه می‌شود و پس از تأیید بانکی رسید صادر خواهد شد.':'The catalogue and prices are ready; order completion and payment become available after fulfilment/return terms are confirmed and the verified payment gateway is activated.'):(isFa?'در حال حاضر محصول قیمت‌گذاری‌شده و قابل‌فروش در کاتالوگ فعال نیست.':'There is currently no verified priced and sellable book in the active catalogue.'))+'</div>'+
   '<div class="actions"><a class="button" href="'+root((isFa?'fa':'en')+'/shop/cart/')+'">'+(isFa?'بازگشت به سبد':'Back to cart')+'</a></div>';
  if(valid){
   const btn=document.createElement('button');btn.type='button';btn.className='button primary';
   btn.disabled=!(bookPaymentReady&&deliveryCaptureReady);
   btn.textContent=(bookPaymentReady&&deliveryCaptureReady)?(isFa?'پرداخت امن سفارش':'Secure checkout'):(isFa?'پرداخت کتاب هنوز فعال نیست':'Book checkout not yet available');
   const feedback=document.createElement('p');feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');
   btn.onclick=async()=>{if(!bookPaymentReady||!deliveryCaptureReady){feedback.textContent=isFa?'پرداخت آنلاین کتاب هنوز فعال نیست.':'Book checkout is not active.';return}btn.disabled=true;feedback.textContent=isFa?'در حال ایجاد سفارش...':'Creating order...';try{
    const response=await fetch('https://drjavadrezazadeh-payment.dr-rezazadeh65.workers.dev/commerce/create',{method:'POST',mode:'cors',credentials:'omit',headers:{'Content-Type':'application/json'},body:JSON.stringify({items:books.map(({item,book})=>({sku:'book:'+book.id,quantity:item.quantity}))})});
    const result=await response.json();
    if(!response.ok||!result.ok)throw Error(result.error||'order_failed');
    const url=new URL(result.paymentUrl);
    if(url.origin!==location.origin||url.pathname!=='/fa/shop/payment-start/'||url.searchParams.size!==1||!url.searchParams.has('gateway'))throw Error('unsafe_url');
    location.assign(url.href);
   }catch(e){feedback.textContent=isFa?'ثبت سفارش ممکن نشد؛ در صورت برداشت وجه مجدداً پرداخت نکنید.':'Order could not be created; do not pay again if charged.';btn.disabled=true;btn.textContent=isFa?'برای بررسی مجدد صفحه را تازه‌سازی کنید':'Refresh to recheck payment readiness'}};
   host.querySelector('.actions').appendChild(btn);host.appendChild(feedback);
  }
 }
 load().then(async data=>{
  renderCatalog(data);renderDetail(data);renderCart(data);renderCheckout(data);updateCartBadge();
  bookPaymentReady=await verifyBookPaymentCapability();
  // Re-render after a fresh explicit readiness check; controls remain disabled on uncertainty.
  renderCart(data);renderCheckout(data);
 }).catch(()=>document.querySelectorAll('[data-store-error]').forEach(x=>x.hidden=false));
 updateCartBadge();
})();
