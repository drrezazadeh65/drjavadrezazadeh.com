// Bookstore UI. Browser cart is convenience state only; server pricing/order/payment remains authoritative.
(function(){
 const raw=location.pathname.replace(/index\.html$/,'');
 const gh='/drjavadrezazadeh.com/';
 const base=raw.includes(gh)?gh:'/';
 const root=p=>(base==='/'?'/':base)+String(p||'').replace(/^\/+/, '');
 const isFa=document.documentElement.lang==='fa';
 const CART_KEY='jr-book-cart-v1';

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
  const cover=book.bibliography?.cover_image?'<figure class="book-cover"><img src="'+root(book.bibliography.cover_image)+'" width="600" height="900" loading="lazy" decoding="async" alt="'+(isFa?'جلد کتاب «'+book.title_fa+'» اثر جواد رضازاده یزدلی':'Cover of '+book.english_reference_title+' by Javad Rezazadeh Yazdeli')+'"></figure>':'<div class="book-cover-placeholder"><strong lang="fa" dir="rtl">'+book.title_fa+'</strong></div>';
  el.innerHTML=cover+
   '<div class="book-product-copy"><span class="status-chip">'+(isFa?'منتشرشده':'Published')+'</span>'+
   '<h2 dir="rtl" lang="fa">'+book.title_fa+'</h2><p>'+(isFa?book.description_fa:book.description_en)+'</p>'+
   '<div class="book-price">'+money(book.commerce?.price,book.commerce?.currency)+'</div>'+
   '<div class="actions"><a class="button" href="'+root((isFa?'fa':'en')+'/shop/book/?id='+encodeURIComponent(book.id))+'">'+(isFa?'جزئیات کتاب':'Book details')+'</a>'+
   (ready(book)?'<button class="button primary" type="button" data-add-book="'+book.id+'">'+(isFa?'افزودن به سبد':'Add to cart')+'</button>':'<span class="book-pending">'+(isFa?'قیمت ثبت شده است؛ خرید پس از تأیید موجودی، شرایط ارسال و درگاه معتبر فعال می‌شود.':'The price is recorded; purchase activates after stock, fulfilment terms and the verified payment path are ready.')+'</span>')+
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
  const detailCover=b.bibliography?.cover_image?'<figure class="book-cover"><img src="'+root(b.bibliography.cover_image)+'" width="600" height="900" decoding="async" alt="'+(isFa?'جلد کتاب «'+b.title_fa+'» اثر جواد رضازاده یزدلی':'Cover of '+b.english_reference_title+' by Javad Rezazadeh Yazdeli')+'"></figure>':'<div class="book-cover-placeholder"><strong>'+b.title_fa+'</strong></div>';
  host.innerHTML='<div class="book-detail-layout">'+detailCover+'<div class="book-detail-copy"><p class="kicker">'+(isFa?'کتاب منتشرشده':'Published book')+'</p><h1 lang="fa" dir="rtl">'+b.title_fa+'</h1>'+
   '<p class="lead">'+(isFa?b.description_fa:b.description_en)+'</p>'+
   '<dl class="book-meta"><div><dt>'+(isFa?'نویسنده':'Author')+'</dt><dd>Javad Rezazadeh Yazdeli</dd></div>'+
   '<div><dt>ISBN</dt><dd>'+(b.bibliography.isbn||(isFa?'هنوز تأیید نشده':'Not yet verified'))+'</dd></div>'+
   '<div><dt>'+(isFa?'ناشر':'Publisher')+'</dt><dd>'+(b.bibliography.publisher||(isFa?'هنوز تأیید نشده':'Not yet verified'))+'</dd></div>'+
   '<div><dt>'+(isFa?'سال انتشار':'Publication year')+'</dt><dd>'+(b.bibliography.publication_year||(isFa?'هنوز تأیید نشده':'Not yet verified'))+'</dd></div>'+
   '<div><dt>'+(isFa?'نوبت چاپ':'Edition')+'</dt><dd>'+(b.bibliography.edition||(isFa?'هنوز تأیید نشده':'Not yet verified'))+'</dd></div>'+
   '<div><dt>'+(isFa?'قالب':'Format')+'</dt><dd>'+(b.commerce?.formats_confirmed?.includes('PRINT')?(isFa?'چاپی':'Print'):(isFa?'نیازمند تأیید':'Not yet verified'))+'</dd></div>'+
   '<div><dt>'+(isFa?'قیمت ثبت‌شده':'Listed price')+'</dt><dd>'+money(b.commerce?.price,b.commerce?.currency)+'</dd></div></dl>'+
   '<p class="store-notice">'+(isFa?'جزئیات کتاب‌شناختیِ نامشخص تا زمان تأیید رسمی خالی می‌مانند. سفارش و پرداخت اینترنتی هنوز فعال نیست.':'Unverified bibliographic fields are deliberately marked as such. Online orders and payment are not yet active.')+'</p>'+
   '<div class="actions">'+
   (ready(b)?'<button class="button primary" type="button" data-detail-add="'+b.id+'">'+(isFa?'افزودن به فهرست انتخاب‌ها':'Add to selection')+'</button>':'')+
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
    row.innerHTML='<div><strong lang="fa" dir="rtl">'+b.title_fa+'</strong><small>'+
      (isFa?'تعداد':'Qty')+': '+item.quantity+'</small></div>'+
      '<div>'+money(ready(b)?b.commerce.price*item.quantity:null,b.commerce?.currency)+'</div>'+
      '<button type="button" data-remove-book="'+b.id+'">'+(isFa?'حذف':'Remove')+'</button>';
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
    'این فهرست فقط برای استعلام است. هیچ سفارش یا پرداختی انجام نشده است. قیمت و موجودی هنگام پاسخ بررسی می‌شوند؛ هزینه و شرایط ارسال هنوز نهایی نشده‌اند.':
    'This is an availability enquiry only. No order or payment has been placed. Prices and availability require confirmation; shipping costs and terms are not final.';
  const mailBody=(isFa?
    ['درخواست استعلام موجودی و شرایط خرید کتاب','',...formattedLines,'',
     'جمع نمایشی: '+amount,'','لطفاً موجودی واقعی، هزینه و شرایط ارسال، شیوه بازگشت و امکان سفارش را پیش از هر پرداخت اعلام کنید.',
     '','این پیام ثبت سفارش یا تأیید پرداخت نیست.']:
    ['Book availability and fulfilment enquiry','',...formattedLines,'',
     'Illustrative subtotal: '+amount,'','Please confirm actual stock, delivery cost and terms, return policy, and whether ordering is available before any payment.',
     '','This enquiry is not an order or payment confirmation.']).join('\n');
  summary.innerHTML='<strong>'+(isFa?'جمع نمایشی انتخاب‌ها':'Illustrative selection subtotal')+
    ': '+amount+'</strong><p>'+disclosure+'</p>';
  const actions=document.createElement('div');
  actions.className='actions';
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
   const remove=e.target.closest('[data-remove-book]');
   if(remove){
     writeCart(readCart().filter(x=>x.book_id!==remove.dataset.removeBook));
     renderCart(data);
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
  host.innerHTML='<p class="kicker">'+(isFa?'تسویه امن':'Secure checkout')+'</p><h1>'+(isFa?'سفارش کتاب':'Book order')+'</h1>'+
   '<p class="lead">'+(isFa?'اطلاعات سفارش و مبلغ نهایی پیش از انتقال به درگاه دوباره بررسی می‌شود و سفارش فقط پس از تأیید موفق پرداخت نهایی خواهد شد.':'Order details and the final amount are checked again before payment, and the order is completed only after successful payment confirmation.')+'</p>'+
   '<div class="store-notice">'+(valid?(isFa?'کاتالوگ و قیمت‌ها آماده‌اند؛ تکمیل سفارش و پرداخت پس از نهایی‌شدن شرایط ارسال/بازگشت و فعال‌شدن درگاه معتبر در دسترس قرار می‌گیرد.':'The catalogue and prices are ready; order completion and payment become available after fulfilment/return terms are confirmed and the verified payment gateway is activated.'):(isFa?'در حال حاضر محصول قیمت‌گذاری‌شده و قابل‌فروش در کاتالوگ فعال نیست.':'There is currently no verified priced and sellable book in the active catalogue.'))+'</div>'+
   '<div class="actions"><a class="button" href="'+root((isFa?'fa':'en')+'/shop/cart/')+'">'+(isFa?'بازگشت به سبد':'Back to cart')+'</a></div>';
 }
 load().then(data=>{renderCatalog(data);renderDetail(data);renderCart(data);renderCheckout(data);updateCartBadge();}).catch(()=>document.querySelectorAll('[data-store-error]').forEach(x=>x.hidden=false));
 updateCartBadge();
})();
