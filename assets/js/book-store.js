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

 const API='/api';
 // Catalogue prices never authorise payment. The live Worker must explicitly permit books.
 let bookPaymentReady=false;
 let deliveryCaptureReady=false;
 async function verifyBookPaymentCapability(){
  try{
   const response=await fetch(API+'/commerce/health',{cache:'no-store',credentials:'omit'});
   if(!response.ok)return {payment:false,capture:false};
   const health=await response.json();
   return {
    payment:health?.ok===true&&health.service==='commerce'&&health.checkout===true&&health.capabilities?.books===true,
    capture:health?.ok===true&&health.service==='commerce'&&health.orderCapture===true
   };
  }catch(_){return {payment:false,capture:false}}
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
 function writeCart(items){
  try{localStorage.setItem(CART_KEY,JSON.stringify(cleanCart(items)))}catch(e){}
  updateCartBadge();
  try{window.dispatchEvent(new CustomEvent('jr:cart-change',{detail:{count:readCart().reduce((s,x)=>s+(x.quantity||1),0)}}))}catch(e){}
}
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
   '<a class="button" data-book-info-request href="mailto:info@drjavadrezazadeh.com?subject='+encodeURIComponent((isFa?'درخواست اطلاعات کتاب: ':'Book information enquiry: ')+b.title_fa)+
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
   host.innerHTML='<div class="cart-empty-state" role="status"><strong>'+(isFa?'سبد شما هنوز خالی است':'Your cart is empty')+'</strong><p>'+(isFa?'کتاب‌ها را در فروشگاه مرور کنید و انتخابتان را به همین سبد اضافه کنید.':'Browse the bookstore and add your selection to this cart.')+'</p><a class="button primary" href="'+root((isFa?'fa':'en')+'/shop/')+'">'+(isFa?'رفتن به فروشگاه':'Browse books')+'</a></div>';
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
  checkout.textContent=isFa?'ادامه به تسویه':'Continue to checkout';
  checkout.disabled=!deliveryCaptureReady;
  checkout.textContent=(bookPaymentReady&&deliveryCaptureReady)
    ?(isFa?'ادامه به تسویه امن':'Continue to secure checkout')
    :(deliveryCaptureReady?(isFa?'ادامه و ثبت سفارش':'Continue and place order'):(isFa?'ثبت سفارش موقتاً در دسترس نیست':'Order capture temporarily unavailable'));
  checkout.title=(bookPaymentReady&&deliveryCaptureReady)
    ?(isFa?'ورود اطلاعات تحویل و سپس انتقال به درگاه امن':'Enter delivery details, then proceed to secure payment')
    :(deliveryCaptureReady?(isFa?'اطلاعات تحویل را وارد کنید؛ سفارش بدون برداشت وجه ثبت می‌شود':'Enter delivery details; the order will be recorded without charging you'):(isFa?'ثبت سفارش سمت سرور در دسترس نیست':'Server-side order capture is unavailable'));
  actions.appendChild(checkout);

  const inquiry=document.createElement('a');
  inquiry.className='button primary';
  inquiry.dataset.bookInquiry='';
  inquiry.href='mailto:info@drjavadrezazadeh.com?subject='+
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
     if(!deliveryCaptureReady){status.textContent=isFa?'ثبت سفارش موقتاً در دسترس نیست؛ لطفاً دوباره تلاش کنید.':'Order capture is temporarily unavailable; please try again.';return}
     location.assign(root((isFa?'fa':'en')+'/shop/checkout/'));
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
  const form=document.getElementById('shipping-details');
  const fieldset=form?.querySelector('fieldset');
  const note=document.getElementById('shipping-disabled-note');
  const canCapture=deliveryCaptureReady;
  if(fieldset)fieldset.disabled=!canCapture;
  if(note)note.textContent=canCapture
   ?(isFa?'اطلاعات تحویل فقط برای اجرای همین سفارش ثبت می‌شود و برای احراز هویت تلفنی استفاده نمی‌شود.':'Delivery details are stored only to fulfil this order and are not used for phone verification.')
   :(isFa?'ثبت امن سفارش موقتاً در دسترس نیست؛ هیچ اطلاعات تحویلی ارسال نمی‌شود.':'Secure order capture is temporarily unavailable; no delivery data will be submitted.');
  if(!books.length){
   host.innerHTML='<div class="checkout-empty-state" role="status"><p class="kicker">'+(isFa?'تسویه':'Checkout')+'</p><h2>'+(isFa?'سبد شما خالی است':'Your cart is empty')+'</h2><p>'+(isFa?'برای ادامه، ابتدا کتاب موردنظر را از فروشگاه به سبد اضافه کنید.':'Add a book from the bookstore before continuing to checkout.')+'</p><div class="actions"><a class="button primary" href="'+root((isFa?'fa':'en')+'/shop/')+'">'+(isFa?'مرور کتاب‌ها':'Browse books')+'</a><a class="button" href="'+root((isFa?'fa':'en')+'/shop/cart/')+'">'+(isFa?'بازگشت به سبد':'Back to cart')+'</a></div></div>';
   return;
  }
  host.innerHTML='<p class="kicker">'+(isFa?'ثبت سفارش':'Order')+'</p><h1>'+(isFa?'سفارش کتاب':'Book order')+'</h1>'+
   '<p class="lead">'+(bookPaymentReady
     ?(isFa?'اطلاعات سفارش و مبلغ نهایی پیش از انتقال به درگاه دوباره در سرور بررسی می‌شود.':'Order details and the final amount are checked again on the server before payment.')
     :(isFa?'ثبت سفارش سمت سرور فعال است. در وضعیت فعلی سفارش بدون برداشت وجه ثبت می‌شود و شناسه پیگیری دریافت می‌کنید.':'Server-side order capture is active. For now, the order is recorded without charging you and you receive a tracking ID.'))+'</p>'+
   '<div class="store-notice">'+(valid
     ?(bookPaymentReady
       ?(isFa?'ارسال کتاب رایگان است. مبلغ نهایی در سرور محاسبه می‌شود و فقط پرداخت تأییدشده سفارش را قطعی می‌کند.':'Book shipping is free. The final total is calculated on the server and only a verified payment completes the order.')
       :(isFa?'ارسال کتاب رایگان است. با ثبت این فرم، درخواست سفارش در سرور ذخیره می‌شود؛ هیچ وجهی برداشت نمی‌شود.':'Book shipping is free. Submitting this form records the order request on the server; no payment is taken.'))
     :(isFa?'در حال حاضر محصول قیمت‌گذاری‌شده و قابل‌فروش در کاتالوگ فعال نیست.':'There is currently no verified priced and sellable book in the active catalogue.'))+'</div>'+
   '<div class="actions"><a class="button" href="'+root((isFa?'fa':'en')+'/shop/cart/')+'">'+(isFa?'بازگشت به سبد':'Back to cart')+'</a></div>';
  if(valid){
   const btn=document.createElement('button');btn.type='button';btn.className='button primary';btn.disabled=!canCapture;
   btn.textContent=canCapture
     ?(bookPaymentReady?(isFa?'پرداخت امن سفارش':'Secure checkout'):(isFa?'ثبت سفارش بدون پرداخت':'Place order without payment'))
     :(isFa?'ثبت سفارش موقتاً در دسترس نیست':'Order capture temporarily unavailable');
   const feedback=document.createElement('p');feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');
   btn.onclick=async()=>{
    if(!canCapture){feedback.textContent=isFa?'ثبت سفارش موقتاً در دسترس نیست.':'Order capture is temporarily unavailable.';return}
    if(!form||!form.reportValidity()){feedback.textContent=isFa?'اطلاعات تحویل را کامل و صحیح وارد کنید.':'Please complete the delivery details correctly.';return}
    const fd=new FormData(form);
    const customer={name:String(fd.get('name')||'').trim(),email:String(fd.get('email')||'').trim(),address:String(fd.get('address')||'').trim(),postal:String(fd.get('postal')||'').trim(),phone:String(fd.get('tel')||'').trim()};
    btn.disabled=true;
    feedback.textContent=bookPaymentReady?(isFa?'در حال ایجاد سفارش امن...':'Creating secure order...'):(isFa?'در حال ثبت سفارش...':'Recording your order...');
    try{
      const endpoint=bookPaymentReady?'/api/commerce/create':'/api/commerce/prepare';
      const response=await fetch(endpoint,{method:'POST',mode:'cors',credentials:'omit',headers:{'Content-Type':'application/json'},body:JSON.stringify({items:books.map(({item,book})=>({sku:'book:'+book.id,quantity:item.quantity})),customer})});
      const result=await response.json();
      if(!response.ok||!result.ok)throw Error(result.error||'order_failed');
      if(bookPaymentReady){
        const url=new URL(result.paymentUrl);
        if(url.origin!==location.origin||url.pathname!=='/fa/shop/payment-start/'||url.searchParams.size!==1||!url.searchParams.has('gateway'))throw Error('unsafe_url');
        location.assign(url.href);
        return;
      }
      writeCart([]);
      const orderId=escapeHtml(String(result.orderId||''));
      host.innerHTML='<div class="store-notice" role="status"><strong>'+(isFa?'سفارش با موفقیت ثبت شد':'Order recorded successfully')+'</strong><p>'+(isFa?'هیچ وجهی از شما دریافت نشده است. شناسه پیگیری سفارش: ':'No payment has been taken. Order tracking ID: ')+'<code>'+orderId+'</code></p><p>'+(result.emailSent?(isFa?'یک ایمیل تأیید نیز برای شما ارسال شد.':'A confirmation email was also sent.'):(isFa?'شناسه سفارش را نگه دارید؛ وضعیت پرداخت هنوز بسته است.':'Keep the order ID; payment is still gated.'))+'</p><div class="actions"><a class="button primary" href="'+root((isFa?'fa':'en')+'/shop/')+'">'+(isFa?'بازگشت به فروشگاه':'Back to bookstore')+'</a></div></div>';
      form?.reset();
      if(fieldset)fieldset.disabled=true;
    }catch(e){
      feedback.textContent=isFa?'ثبت سفارش انجام نشد؛ هیچ پرداختی انجام نشده است. لطفاً دوباره تلاش کنید.':'The order was not recorded; no payment was taken. Please try again.';
      btn.disabled=false;
    }
   };
   host.querySelector('.actions').appendChild(btn);host.appendChild(feedback);
  }
 }
 document.querySelectorAll('[data-book-cart],[data-book-checkout],[data-book-catalog],[data-book-detail]').forEach(host=>{
  if(host.children.length)return;
  host.innerHTML='<div class="store-loading" role="status" aria-live="polite"><span class="store-loading-dot" aria-hidden="true"></span><span>'+(isFa?'در حال آماده‌سازی فروشگاه…':'Preparing the store…')+'</span></div>';
 });
 load().then(async data=>{
  renderCatalog(data);renderDetail(data);renderCart(data);renderCheckout(data);updateCartBadge();
  const capability=await verifyBookPaymentCapability();
  bookPaymentReady=capability.payment;
  deliveryCaptureReady=capability.capture;
  // Re-render after a fresh explicit readiness check; controls remain disabled on uncertainty.
  renderCart(data);renderCheckout(data);
 }).catch(()=>document.querySelectorAll('[data-store-error]').forEach(x=>{
   x.hidden=false;
   x.setAttribute('role','alert');
   x.innerHTML=(isFa?'اطلاعات فروشگاه موقتاً در دسترس نیست. اتصال اینترنت را بررسی کنید و دوباره تلاش کنید.':'Store information is temporarily unavailable. Check your connection and try again.')+' <button type="button" class="button" data-store-retry>'+(isFa?'تلاش دوباره':'Try again')+'</button>';
  }));
 document.addEventListener('click',e=>{if(e.target.closest('[data-store-retry]'))location.reload()});
 updateCartBadge();
})();
