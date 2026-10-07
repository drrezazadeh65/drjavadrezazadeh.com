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
 function readCart(){try{return JSON.parse(localStorage.getItem(CART_KEY)||'[]')}catch(e){return[]}}
 function writeCart(items){try{localStorage.setItem(CART_KEY,JSON.stringify(items.slice(0,20)))}catch(e){} updateCartBadge();}
 function updateCartBadge(){const n=readCart().reduce((s,x)=>s+(x.quantity||1),0);document.querySelectorAll('[data-cart-count]').forEach(x=>x.textContent=String(n));}
 async function load(){
  const res=await fetch(root('platform/book-catalog.json'),{cache:'no-store'});
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
   '<div><dt>ISBN</dt><dd>'+(b.bibliography.isbn||(isFa?'در انتظار اطلاعات تأییدشده':'Awaiting verified metadata'))+'</dd></div>'+
   '<div><dt>'+(isFa?'قیمت':'Price')+'</dt><dd>'+money(b.commerce?.price,b.commerce?.currency)+'</dd></div></dl>'+
   (ready(b)?'<button class="button primary" type="button" data-detail-add="'+b.id+'">'+(isFa?'افزودن به سبد':'Add to cart')+'</button>':'<div class="store-notice">'+(isFa?'کتاب منتشر شده و قیمت ثبت شده است؛ اما موجودی، شرایط ارسال/بازگشت و مسیر پرداخت تولیدی هنوز کامل نشده‌اند، بنابراین خرید عمداً غیرفعال است.':'The book is published and its price is recorded, but stock, fulfilment/return terms and the production payment path are not yet complete; purchase is intentionally disabled.')+'</div>')+'</div></div>';
  host.addEventListener('click',e=>{if(e.target.closest('[data-detail-add]'))add(b);});
 }
 function renderCart(data){
  const host=document.querySelector('[data-book-cart]'); if(!host) return;
  const cart=readCart(); host.innerHTML='';
  if(!cart.length){host.innerHTML='<p class="lead">'+(isFa?'سبد خرید خالی است.':'Your cart is empty.')+'</p>';return;}
  let total=0,currency=null,valid=true;
  cart.forEach(item=>{
    const b=data.books.find(x=>x.id===item.book_id); if(!b)return;
    if(!ready(b)) valid=false; else {currency=currency||b.commerce.currency;if(currency!==b.commerce.currency)valid=false;total+=b.commerce.price*(item.quantity||1);}
    const row=document.createElement('div'); row.className='cart-row';
    row.innerHTML='<div><strong lang="fa" dir="rtl">'+b.title_fa+'</strong><small>'+(isFa?'تعداد':'Qty')+': '+(item.quantity||1)+'</small></div>'+
      '<div>'+money(ready(b)?b.commerce.price*(item.quantity||1):null,b.commerce?.currency)+'</div>'+
      '<button type="button" data-remove-book="'+b.id+'">'+(isFa?'حذف':'Remove')+'</button>';
    host.appendChild(row);
  });
  const sum=document.createElement('div');sum.className='cart-summary';
  sum.innerHTML='<strong>'+(isFa?'جمع نمایشی':'Display total')+': '+money(valid?total:null,currency)+'</strong>'+
    '<p>'+(isFa?'مبلغ نهایی هنگام ثبت سفارش بر اساس قیمت فعال فروشگاه دوباره بررسی می‌شود.':'The final amount is checked again against the active store price when the order is submitted.')+'</p>'+
    (valid?'<a class="button primary" href="'+root((isFa?'fa':'en')+'/shop/checkout/')+'">'+(isFa?'ادامه به تسویه':'Continue to checkout')+'</a>':'<span class="book-pending">'+(isFa?'تسویه تا فعال‌شدن اطلاعات واقعی فروش بسته است.':'Checkout remains closed until real commerce data is activated.')+'</span>');
  host.appendChild(sum);
  host.addEventListener('click',e=>{const btn=e.target.closest('[data-remove-book]');if(!btn)return;writeCart(readCart().filter(x=>x.book_id!==btn.dataset.removeBook));renderCart(data);});
 }
 function renderCheckout(data){
  const host=document.querySelector('[data-book-checkout]'); if(!host) return;
  const cart=readCart();
  const books=cart.map(x=>({item:x,book:data.books.find(b=>b.id===x.book_id)})).filter(x=>x.book);
  const valid=books.length>0&&books.every(x=>ready(x.book));
  host.innerHTML='<p class="kicker">'+(isFa?'تسویه امن':'Secure checkout')+'</p><h1>'+(isFa?'سفارش کتاب':'Book order')+'</h1>'+
   '<p class="lead">'+(isFa?'اطلاعات سفارش و مبلغ نهایی پیش از انتقال به درگاه دوباره بررسی می‌شود و سفارش فقط پس از تأیید موفق پرداخت نهایی خواهد شد.':'Order details and the final amount are checked again before payment, and the order is completed only after successful payment confirmation.')+'</p>'+
   '<div class="store-notice">'+(valid?(isFa?'کاتالوگ و قیمت‌ها آماده‌اند؛ پرداخت بانکی پس از فعال‌سازی و تأیید درگاه معتبر در دسترس قرار می‌گیرد.':'The catalogue and prices are ready; bank payment becomes available after the verified payment gateway is activated.'):(isFa?'در حال حاضر محصول قیمت‌گذاری‌شده و قابل‌فروش در کاتالوگ فعال نیست.':'There is currently no verified priced and sellable book in the active catalogue.'))+'</div>'+
   '<div class="actions"><a class="button" href="'+root((isFa?'fa':'en')+'/shop/cart/')+'">'+(isFa?'بازگشت به سبد':'Back to cart')+'</a></div>';
 }
 load().then(data=>{renderCatalog(data);renderDetail(data);renderCart(data);renderCheckout(data);updateCartBadge();}).catch(()=>document.querySelectorAll('[data-store-error]').forEach(x=>x.hidden=false));
 updateCartBadge();
})();
