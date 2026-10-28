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

 function bookBackUrl(book){
  const path=String(book?.bibliography?.back_cover_image||'');
  return /^\/assets\/images\/books\/[a-z0-9][a-z0-9._-]*\.(?:avif|webp|png|jpe?g)$/i.test(path)?root(path):null;
 }
 const API='/api';
 // Catalogue prices never authorise payment. The server must explicitly permit books and reconcile stock.
 let bookPaymentReady=false;
 let deliveryCaptureReady=false;
 let bookStockPending=false;
 async function verifyBookPaymentCapability(){
  try{
   const response=await fetch(API+'/commerce/health',{cache:'no-store',credentials:'omit'});
   if(!response.ok)return {payment:false,capture:false};
   const health=await response.json();
   const healthy=health?.ok===true&&health.service==='commerce';
   return {
    payment:healthy&&health.checkout===true&&health.capabilities?.books===true,
    capture:healthy&&health.orderCapture===true,
    stockPending:healthy&&health.checkout===true&&health.requirements?.inventoryReconciled===false
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
   const max=row.book_id==='websters-third-1981'?1:20;
   const qty=Math.min(max,row.quantity);
   const prev=items.find(x=>x.book_id===row.book_id);
   if(prev){prev.quantity=Math.min(max,prev.quantity+qty);continue}
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
  const original=await res.json();
  // The generated 3-title poetry catalogue is immutable. A separately
  // versioned collectible catalogue extends the UI without changing it.
  let extras=[];
  try{
    const r=await fetch(root('assets/data/collectible-catalog.json'),{cache:'no-store'});
    if(r.ok){
      const d=await r.json();
      if(Array.isArray(d.books)) extras=d.books.filter(b=>b?.commerce?.single_copy===true);
    }
  }catch(_){/* The original shop must remain functional if optional data fail. */}
  const legacy=Array.isArray(original.books)?original.books:[];
  const known=new Set(legacy.map(b=>b.id));
  return {...original,books:[...legacy,...extras.filter(b=>!known.has(b.id))]};
 }
 function ready(book){
  return book?.commerce?.sellable===true&&Number.isInteger(book.commerce.price)&&Boolean(book.commerce.currency);
 }
 function add(book){
  if(!ready(book)) return;
  const cart=readCart();
  const found=cart.find(x=>x.book_id===book.id);
  if(found) found.quantity=Math.min(book.commerce?.single_copy===true?1:20,(found.quantity||1)+1);
  else cart.push({book_id:book.id,quantity:1});
  writeCart(cart);
  const selector='[data-add-book="'+book.id+'"],[data-detail-add="'+book.id+'"]';
  document.querySelectorAll(selector).forEach(btn=>{btn.textContent=isFa?'✓ به سبد افزوده شد':'✓ Added to cart';btn.setAttribute('aria-live','polite');});
 }
 function cardBibliography(book){
  const bib=book?.bibliography||{};
  const unknown=isFa?'در انتظار تأیید':'Not yet verified';
  const year=value=>Number.isInteger(value)&&value>=1200&&value<=1600
    ?new Intl.NumberFormat(isFa?'fa-IR':'en-US',{useGrouping:false}).format(value)
    :unknown;
  const publisher=typeof bib.publisher==='string'&&bib.publisher.trim()
    ?(isFa?bib.publisher:(bib.publisher==='نشر دارما'?'Darma Publishing':bib.publisher))
    :unknown;
  const isbn=typeof bib.isbn==='string'&&/^[0-9]{13}$/.test(bib.isbn)?bib.isbn:unknown;
  const row=(label,value,dir='auto')=>'<div><dt>'+label+'</dt><dd dir="'+dir+'">'+escapeHtml(value)+'</dd></div>';
  return '<dl class="book-catalog-imprint" aria-label="'+(isFa?'مشخصات نشر تأییدشده':'Verified publication details')+'">'+
    row(isFa?'ناشر':'Publisher',publisher)+
    row(isFa?'سال انتشار':'Publication year',year(bib.publication_year),'ltr')+
    row(isFa?'نخستین چاپ':'First printing',year(bib.printing_year),'ltr')+
    row('ISBN',isbn,'ltr')+'</dl>';
 }

 function card(book){
  if(book.commerce?.single_copy===true){
    const art=document.createElement('article');
    art.className='book-product-card jr-one-copy';
    art.innerHTML='<figure class="book-cover" style="width:200px;max-width:100%"><img src="'+root('assets/images/books/websters-third-1981-collectible-illustration.svg')+'" loading="lazy" width="600" height="450" alt="'+(isFa?'تصویر تبلیغاتی؛ عکس واقعی کتاب نیست':'Promotional illustration; not a photo of this copy')+'"><figcaption>'+(isFa?'تصویر تبلیغاتی':'Promotional illustration')+'</figcaption></figure>'+
      '<div class="book-product-copy"><span class="status-chip">'+(isFa?'کلکسیونی · تنها یک مجموعه دو جلدی':'Collectible · one two-volume set only')+'</span>'+
      '<h2>'+escapeHtml(isFa?book.title_fa:book.english_reference_title)+'</h2>'+
      '<p>'+escapeHtml(isFa?book.description_fa:book.description_en)+'</p>'+
      '<div class="book-price">'+escapeHtml(money(book.commerce.price,book.commerce.currency))+'</div>'+
      '<div class="actions"><a class="button primary" href="'+root((isFa?'fa':'en')+'/shop/collectibles/websters-third-1981/')+'">'+(isFa?'مشاهده وضعیت نسخه و خرید':'View condition and secure purchase')+'</a></div></div>';
    return art;
  }
  const el=document.createElement('article');
  el.className='book-product-card';
  const coverSrc=bookCoverUrl(book);
  const frontAlt=isFa?'جلد کتاب «'+book.title_fa+'» اثر جواد رضازاده یزدلی':'Cover of '+book.english_reference_title+' by Javad Rezazadeh Yazdeli';
  const backSrc=bookBackUrl(book);
  const cover=coverSrc?'<figure class="book-cover"><img data-book-gallery-image src="'+escapeHtml(coverSrc)+'" width="600" height="900" loading="lazy" decoding="async" alt="'+escapeHtml(frontAlt)+'"></figure>':'<div class="book-cover-placeholder"><strong lang="fa" dir="rtl">'+escapeHtml(book.title_fa)+'</strong></div>';
  // Owner-approved cover files only. The interaction affects neither cart nor stock.
  const gallery=(coverSrc&&backSrc)?'<div class="jr-book-card-gallery" data-book-gallery="'+escapeHtml(book.id)+'">'+
   cover+
   '<div class="jr-book-gallery-footer"><span class="jr-book-gallery-caption" role="status" aria-live="polite">'+(isFa?'تصویر روی جلد اصلی':'Original front cover')+'</span>'+
   '<div class="jr-book-gallery-actions" role="group" aria-label="'+escapeHtml(isFa?'تصاویر کتاب «'+book.title_fa+'»':'Cover images of '+book.english_reference_title)+'">'+
   '<button type="button" data-book-gallery-view="front" data-book-gallery-id="'+escapeHtml(book.id)+'" aria-pressed="true">'+(isFa?'روی جلد':'Front')+'</button>'+
   '<button type="button" data-book-gallery-view="back" data-book-gallery-id="'+escapeHtml(book.id)+'" aria-pressed="false">'+(isFa?'پشت جلد':'Back')+'</button>'+
   '</div></div></div>':cover;
  el.innerHTML=gallery+
   '<div class="book-product-copy"><span class="status-chip">'+(isFa?'منتشرشده':'Published')+'</span>'+
   '<h2 dir="rtl" lang="fa">'+escapeHtml(book.title_fa)+'</h2><p>'+escapeHtml(isFa?book.description_fa:book.description_en)+'</p>'+cardBibliography(book)+
   '<div class="book-price">'+escapeHtml(money(book.commerce?.price,book.commerce?.currency))+'</div>'+
   '<div class="actions"><a class="button" href="'+root((isFa?'fa':'en')+'/shop/book/?id='+encodeURIComponent(book.id))+'">'+(isFa?'جزئیات کتاب':'Book details')+'</a>'+
   (ready(book)?'<button class="button primary" type="button" data-add-book="'+escapeHtml(book.id)+'">'+(isFa?'افزودن به سبد':'Add to cart')+'</button>':'<span class="book-pending">'+(isFa?'قیمت ثبت شده است؛ خرید پس از تأیید موجودی، شرایط ارسال و درگاه معتبر فعال می‌شود.':'The price is recorded; purchase activates after stock, fulfilment terms and the verified payment path are ready.')+'</span>')+
   '</div></div>';
  return el;
 }

 // Mirkarimi is a separately fulfilled, two-PDF digital product. It must never be
 // inserted into the physical-book cart or priced client-side for bank payment.
 function digitalProductCard(){
  const article=document.createElement('article');
  article.className='book-product-card jr-digital-product-card';
  article.setAttribute('data-jr-digital-product','mirkarimi');
  const href=root((isFa?'fa':'en')+'/shop/authors/mehrab-mirkarimi/#purchase');
  article.innerHTML=
   '<figure class="jr-digital-cover"><img src="'+root('assets/images/bookstore-talent-cinematic-approved-20261011.webp')+'" loading="lazy" decoding="async" width="600" height="360" alt="'+(isFa?'تصویر نمادین مطالعه و کتاب؛ این تصویر جلد رسمی محصول نیست':'Illustrative study artwork, not an official book cover')+'"><figcaption>'+(isFa?'تصویر نمادین؛ نه جلد رسمی':'Illustration, not the official cover')+'</figcaption></figure>'+
   '<div class="book-product-copy"><span class="status-chip jr-digital-chip">'+(isFa?'نسخه دیجیتال · دو فایل PDF':'Digital collection · 2 PDFs')+'</span>'+
   '<div class="jr-digital-rank" role="note"><strong>'+(isFa?'رتبه ۱ کنکور کارشناسی ارشد آموزش زبان انگلیسی ۱۴۰۵':'First place in the 2026 ELT MA entrance exam')+'</strong><small>'+(isFa?'سید محراب میرکریمی · مطابق رزومه مؤلف':'Seyyed Mehrab Mirkarimi · reported in the author\'s CV')+'</small></div>'+
   '<h2>'+(isFa?'مجموعه سؤالات و پاسخنامه تشریحی ارشد آموزش زبان انگلیسی (۱۳۷۰–۱۴۰۵)':'TEFL MA Entrance Exam Questions & Explained Answers (1370–1405)')+'</h2>'+
   '<p>'+(isFa?'اثر سید محراب میرکریمی؛ ۳۶ سال پرسش و پاسخ تخصصی در ۹۹۷ صفحه. دریافت امن هر دو فایل پس از پرداخت تأییدشده.':'By Seyyed Mehrab Mirkarimi: 36 years of examinations, 997 pages, two securely delivered PDF files after verified payment.')+'</p>'+
   '<p class="jr-digital-impact">'+(isFa?'۳۰٪ مبلغ هر فروش برای حمایت از استعدادهای کم‌بضاعت اختصاص می‌یابد.':'30% of each purchase is earmarked for talented learners facing financial hardship.')+'</p>'+
   '<div class="book-price">'+(isFa?'۱٬۰۰۰٬۰۰۰ تومان':'1,000,000 toman')+'</div>'+
   '<p class="jr-digital-readiness" aria-live="polite">'+(isFa?'در حال بررسی امکان خرید دیجیتال…':'Checking digital checkout status…')+'</p>'+
   '<div class="actions"><a class="button primary" href="'+href+'">'+(isFa?'جزئیات و خرید دیجیتال':'Details & digital checkout')+'</a></div></div>';
  verifyDigitalOfferForCard(article);
  return article;
 }
 async function verifyDigitalOfferForCard(article){
  const state=article.querySelector('.jr-digital-readiness');
  try{
   const response=await fetch('/api/publishing/offer',{method:'GET',credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}});
   if(!response.ok)throw Error('unavailable');
   const offer=await response.json();
   const available=offer.ok===true&&offer.checkoutEnabled===true&&offer.available===true&&
     offer.sku==='digital:tefl-ma-exams-1370-1405'&&offer.priceToman===1000000;
   state.textContent=available
     ?(isFa?'خرید فعال؛ پرداخت و دریافت از صفحه اختصاصی':'Available: secure checkout on the product page')
     :(isFa?'برای اطلاع از وضعیت خرید، صفحه محصول را ببینید':'Visit the product page for current availability');
   article.classList.toggle('jr-digital-ready',available);
  }catch(_){
   state.textContent=isFa?'وضعیت لحظه‌ای در دسترس نیست؛ از صفحه محصول بررسی کنید':'Live status unavailable; please verify on the product page';
  }
 }

 function applyCatalogFilter(kind){
  if(!['all','print','digital'].includes(kind))return;
  const host=document.querySelector('[data-book-catalog]');if(!host)return;
  for(const product of host.children){
   if(!product.matches('.book-product-card'))continue;
   const digital=product.hasAttribute('data-jr-digital-product');
   product.hidden=(kind==='print'&&digital)||(kind==='digital'&&!digital);
  }
  document.querySelectorAll('[data-shop-filter]').forEach(button=>{
   button.setAttribute('aria-pressed',String(button.dataset.shopFilter===kind));
  });
 }
 function renderCatalog(data){
  const host=document.querySelector('[data-book-catalog]'); if(!host) return;
  host.innerHTML=''; data.books.forEach(b=>host.appendChild(card(b))); host.appendChild(digitalProductCard()); applyCatalogFilter(document.querySelector('[data-shop-filter][aria-pressed="true"]')?.dataset.shopFilter||'all');
  host.addEventListener('click',e=>{
   const toggle=e.target.closest('[data-book-gallery-view]');
   if(toggle&&host.contains(toggle)){
    const id=toggle.getAttribute('data-book-gallery-id');
    const book=data.books.find(x=>x.id===id);
    const view=toggle.getAttribute('data-book-gallery-view');
    const frame=toggle.closest('[data-book-gallery]');
    const image=frame?.querySelector('[data-book-gallery-image]');
    if(!book||!frame||!image||!['front','back'].includes(view))return;
    const src=view==='back'?bookBackUrl(book):bookCoverUrl(book);
    if(!src)return;
    image.src=src;
    image.alt=view==='back'
     ?(isFa?'پشت جلد اصلی کتاب «'+book.title_fa+'»':'Authentic back cover of '+book.english_reference_title)
     :(isFa?'جلد کتاب «'+book.title_fa+'» اثر جواد رضازاده یزدلی':'Cover of '+book.english_reference_title+' by Javad Rezazadeh Yazdeli');
    const caption=frame.querySelector('.jr-book-gallery-caption');
    if(caption)caption.textContent=view==='back'?(isFa?'تصویر پشت جلد اصلی':'Original back cover'):(isFa?'تصویر روی جلد اصلی':'Original front cover');
    frame.querySelectorAll('[data-book-gallery-view]').forEach(button=>{
     button.setAttribute('aria-pressed',String(button===toggle));
    });
    return;
   }
   const btn=e.target.closest('[data-add-book]');
   if(!btn||!host.contains(btn))return;
   const b=data.books.find(x=>x.id===btn.dataset.addBook);
   if(b)add(b);
  });
 }
 function renderDetail(data){
  const host=document.querySelector('[data-book-detail]'); if(!host) return;
  const id=new URLSearchParams(location.search).get('id');
  const b=data.books.find(x=>x.id===id);
  if(b?.commerce?.single_copy===true){location.replace(root((isFa?'fa':'en')+'/shop/collectibles/websters-third-1981/'));return;}
  if(!b){host.innerHTML='<h1>'+(isFa?'کتاب پیدا نشد':'Book not found')+'</h1>';return;}
  document.title=(isFa?b.title_fa:b.english_reference_title)+' | '+(isFa?'فروشگاه کتاب':'Bookstore');
  const detailCoverSrc=bookCoverUrl(b);
  const detailCover=detailCoverSrc?'<figure class="book-cover"><img src="'+escapeHtml(detailCoverSrc)+'" width="600" height="900" decoding="async" alt="'+escapeHtml(isFa?'جلد کتاب «'+b.title_fa+'» اثر جواد رضازاده یزدلی':'Cover of '+b.english_reference_title+' by Javad Rezazadeh Yazdeli')+'"></figure>':'<div class="book-cover-placeholder"><strong>'+escapeHtml(b.title_fa)+'</strong></div>';
  const backSrc=bookBackUrl(b);
  const backCover=backSrc?'<figure class="book-cover book-back-cover"><img src="'+escapeHtml(backSrc)+'" width="900" height="600" loading="lazy" decoding="async" alt="'+escapeHtml(isFa?'پشت جلد کتاب «'+b.title_fa+'»':'Back cover of '+b.english_reference_title)+'"></figure>':'';
  // The front/back covers belong to one media gallery, not two independent
  // grid columns: the companion column must always contain the book's story.
  const frontCaption=isFa?'روی جلد کتاب':'Front cover';
  const backCaption=isFa?'پشت جلد کتاب':'Back cover';
  const gallery='<div class="book-detail-gallery" role="group" aria-label="'+
    (isFa?'تصاویر جلد کتاب':'Book cover images')+'">'+
    '<div class="book-detail-front">'+detailCover+'<span class="book-detail-media-caption">'+frontCaption+'</span></div>'+
    (backCover?'<div class="book-detail-back">'+backCover+'<span class="book-detail-media-caption">'+backCaption+'</span></div>':'')+
    '</div>';
  const purchaseGuide='<section class="book-detail-journey" aria-label="'+
    (isFa?'مراحل تهیه کتاب':'How book ordering works')+'">'+
    '<h2>'+(isFa?'از انتخاب کتاب تا ثبت سفارش':'From selection to order')+'</h2>'+
    '<ol><li>'+(isFa?'کتاب را به سبد خرید اضافه کنید.':'Add this book to your cart.')+'</li>'+
    '<li>'+(isFa?'مبلغ و اطلاعات ارسال را در سبد و فرم سفارش بررسی کنید.':'Review the listed price and shipping details at checkout.')+'</li>'+
    '<li>'+(isFa?'پرداخت آنلاین تنها پس از فعال‌بودن و تأیید معتبر درگاه قابل انجام است.':'Online payment is available only when the verified gateway is active.')+'</li></ol>'+
    '</section>';
  host.innerHTML='<nav class="book-detail-breadcrumb" aria-label="'+
    (isFa?'موقعیت صفحه':'Breadcrumb')+'"><a href="../">'+
    (isFa?'فروشگاه کتاب':'Bookstore')+'</a><span aria-hidden="true"> / </span><span lang="fa" dir="rtl">'+
    escapeHtml(b.title_fa)+'</span></nav>'+
    '<div class="book-detail-layout">'+gallery+
    '<div class="book-detail-copy"><p class="kicker">'+(isFa?'کتاب منتشرشده':'Published book')+'</p><h1 lang="fa" dir="rtl">'+escapeHtml(b.title_fa)+'</h1>'+
   '<p class="lead">'+escapeHtml(isFa?b.description_fa:b.description_en)+'</p>'+
   '<dl class="book-meta"><div><dt>'+(isFa?'نویسنده':'Author')+'</dt><dd>Javad Rezazadeh Yazdeli</dd></div>'+
   '<div><dt>ISBN</dt><dd><bdi dir="ltr">'+escapeHtml(b.bibliography.isbn||(isFa?'هنوز تأیید نشده':'Not yet verified'))+'</bdi></dd></div>'+
   '<div><dt>'+(isFa?'ناشر':'Publisher')+'</dt><dd>'+escapeHtml(b.bibliography.publisher==='نشر دارما'&&!isFa?'Darma Publishing (نشر دارما)':b.bibliography.publisher||(isFa?'هنوز تأیید نشده':'Not yet verified'))+'</dd></div>'+
   '<div><dt>'+(isFa?'سال انتشار':'Publication year')+'</dt><dd>'+escapeHtml(Number.isInteger(b.bibliography.publication_year)&&b.bibliography.publication_calendar==='Solar Hijri'
     ?new Intl.NumberFormat(isFa?'fa-IR':'en-US',{useGrouping:false}).format(b.bibliography.publication_year)+(isFa?' خورشیدی':' (Solar Hijri)')
     :(isFa?'هنوز تأیید نشده':'Not yet verified'))+'</dd></div>'+
   '<div><dt>'+(isFa?'نوبت چاپ':'Printing')+'</dt><dd>'+escapeHtml(b.bibliography.edition==='چاپ اول'&&!isFa?'First printing':b.bibliography.edition||(isFa?'هنوز تأیید نشده':'Not yet verified'))+'</dd></div>'+
   '<div><dt>'+(isFa?'سال چاپ اول':'Year of first printing')+'</dt><dd>'+escapeHtml(Number.isInteger(b.bibliography.printing_year)&&b.bibliography.publication_calendar==='Solar Hijri'
     ?new Intl.NumberFormat(isFa?'fa-IR':'en-US',{useGrouping:false}).format(b.bibliography.printing_year)+(isFa?' خورشیدی':' (Solar Hijri)')
     :(isFa?'هنوز تأیید نشده':'Not yet verified'))+'</dd></div>'+
   '<div><dt>'+(isFa?'شمارگان چاپ اول':'First printing quantity')+'</dt><dd>'+escapeHtml(Number.isInteger(b.bibliography.print_run)
     ?new Intl.NumberFormat(isFa?'fa-IR':'en-US').format(b.bibliography.print_run)+(isFa?' نسخه (نه موجودی فعلی)':' copies (not current inventory)')
     :(isFa?'هنوز تأیید نشده':'Not yet verified'))+'</dd></div>'+
   '<div><dt>'+(isFa?'قالب':'Format')+'</dt><dd>'+(b.commerce?.formats_confirmed?.includes('PRINT')?(isFa?'چاپی':'Print'):(isFa?'نیازمند تأیید':'Not yet verified'))+'</dd></div>'+
   '<div><dt>'+(isFa?'قیمت ثبت‌شده':'Listed price')+'</dt><dd>'+escapeHtml(money(b.commerce?.price,b.commerce?.currency))+'</dd></div></dl>'+
   purchaseGuide+
   '<p class="store-notice">'+(isFa?'مشخصات ناشر، شابک، سال نشر و نوبت چاپ از شناسنامه نسخه‌های چاپی استخراج شده‌اند؛ شمارگان چاپ اول بیانگر موجودی فعلی نیست. پرداخت آنلاین فقط پس از تأیید مسیر امن درگاه فعال می‌شود.':'Publisher, ISBN, publication year and first-print data come from the photographed original book imprints. First printing quantity is not current inventory. Online payment remains gated until the verified payment route is ready.')+'</p>'+
   '<div class="actions">'+
   (ready(b)?'<button class="button primary" type="button" data-detail-add="'+escapeHtml(b.id)+'">'+(isFa?'افزودن به سبد خرید':'Add to cart')+'</button>':'')+
   '<a class="button" data-book-info-request href="mailto:info@drjavadrezazadeh.com?subject='+encodeURIComponent((isFa?'درخواست اطلاعات کتاب: ':'Book information enquiry: ')+b.title_fa)+
   '&body='+encodeURIComponent((isFa?'لطفاً اطلاعات تأییدشده کتاب، جزئیات نشر، نحوه تهیه و شرایط ارسال را اعلام کنید: ':'Please share verified publication metadata, availability, and delivery terms for: ')+b.title_fa)+'">'+
   (isFa?'درخواست اطلاعات تکمیلی':'Request verified book details')+'</a>'+
   '<a class="button book-detail-cart-link" href="../cart/">'+
   (isFa?'مشاهده سبد خرید':'View cart')+'</a></div></div></div>';
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
      '<div class="cart-quantity-controls" aria-label="تغییر تعداد کتاب"><button type="button" data-decrease-book="'+escapeHtml(b.id)+'" aria-label="کاهش تعداد '+escapeHtml(b.title_fa)+'">−</button><span aria-live="polite">'+item.quantity+'</span><button type="button" data-increase-book="'+escapeHtml(b.id)+'" '+(b.commerce?.single_copy===true?'disabled title="تنها یک مجموعه موجود است"':'')+' aria-label="افزایش تعداد '+escapeHtml(b.title_fa)+'">+</button></div><button type="button" data-remove-book="'+escapeHtml(b.id)+'">'+(isFa?'حذف':'Remove')+'</button>';
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
    'این سبد پیش از ثبت نهایی فقط فهرست انتخاب‌هاست. با ادامه می‌توانید سفارش را روی سرور ثبت و شناسه پیگیری دریافت کنید؛ تا فعال‌شدن درگاه هیچ وجهی برداشت نمی‌شود. ارسال کتاب رایگان است و هزینه آن بر عهده فروشگاه است.':
    'This cart is a selection until you submit the order. You can continue to submit the order and receive an order ID; no payment is taken until the gateway is activated. Book shipping is free and paid by the store.';
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
    :(deliveryCaptureReady?(isFa?'اطلاعات تحویل را وارد کنید؛ سفارش بدون برداشت وجه ثبت می‌شود':'Enter delivery details; the order will be recorded without charging you'):(isFa?'ثبت سفارش سمت سرور در دسترس نیست':'Order submission is unavailable'));
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
     if(row){row.quantity=Math.max(0,Math.min(id==='websters-third-1981'?1:20,row.quantity+(increase?1:-1)));writeCart(next.filter(x=>x.quantity>0));renderCart(data)}
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
  const legend=fieldset?.querySelector('legend');
  if(legend)legend.textContent=isFa?'اطلاعات تحویل':'Delivery details';
  if(note)note.textContent=canCapture
   ?(isFa?'اطلاعات تحویل فقط برای اجرای همین سفارش ثبت می‌شود و برای احراز هویت تلفنی استفاده نمی‌شود.':'Delivery details are stored only to fulfil this order and are not used for phone verification.')
   :(isFa?'ثبت امن سفارش موقتاً در دسترس نیست؛ هیچ اطلاعات تحویلی ارسال نمی‌شود.':'Secure order capture is temporarily unavailable; no delivery data will be submitted.');
  if(!books.length){
   host.innerHTML='<div class="checkout-empty-state" role="status"><p class="kicker">'+(isFa?'تسویه':'Checkout')+'</p><h2>'+(isFa?'سبد شما خالی است':'Your cart is empty')+'</h2><p>'+(isFa?'برای ادامه، ابتدا کتاب موردنظر را از فروشگاه به سبد اضافه کنید.':'Add a book from the bookstore before continuing to checkout.')+'</p><div class="actions"><a class="button primary" href="'+root((isFa?'fa':'en')+'/shop/')+'">'+(isFa?'مرور کتاب‌ها':'Browse books')+'</a><a class="button" href="'+root((isFa?'fa':'en')+'/shop/cart/')+'">'+(isFa?'بازگشت به سبد':'Back to cart')+'</a></div></div>';
   return;
  }
  host.innerHTML='<p class="kicker">'+(isFa?'ثبت سفارش':'Order')+'</p><h1>'+(isFa?'سفارش کتاب':'Book order')+'</h1>'+
   '<p class="store-notice" role="note">'+(isFa?'پس از پرداخت، شناسه سفارش را برای پیگیری نگه دارید. اگر ارسال کتاب امکان‌پذیر نبود، از طریق ایمیل info@drjavadrezazadeh.com با ذکر شناسه سفارش درخواست پیگیری یا استرداد وجه ثبت کنید.':'Keep your order ID after payment. If delivery cannot be completed, email info@drjavadrezazadeh.com with the order ID to request support or a refund.')+'</p>'+ 
   '<p class="lead">'+(bookPaymentReady
     ?(isFa?'اطلاعات سفارش و مبلغ نهایی پیش از انتقال به درگاه دوباره در سرور بررسی می‌شود.':'Order details and the final amount are checked again on the server before payment.')
     :(bookStockPending
       ?(isFa?'موجودی فیزیکی کتاب‌ها هنوز در سامانه تأیید نشده است؛ سفارش فعلاً بدون برداشت وجه ثبت می‌شود و شناسه پیگیری دریافت می‌کنید.':'Physical book inventory has not yet been reconciled; your request is recorded without charging you and a tracking ID is provided.')
       :(isFa?'ثبت سفارش سمت سرور فعال است. در وضعیت فعلی سفارش بدون برداشت وجه ثبت می‌شود و شناسه پیگیری دریافت می‌کنید.':'Order submission is active. For now, the order is recorded without charging you and you receive a tracking ID.')) )+'</p>'+ 
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
      const response=await fetch(endpoint,{method:'POST',mode:'cors',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({items:books.map(({item,book})=>({sku:'book:'+book.id,quantity:item.quantity})),customer})});
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
      const code=String(e?.message||'').slice(0,80);
      const messages={
       gateway_rejected:[ 'درگاه بیت‌پی درخواست پرداخت را نپذیرفت. سفارش را دوباره پرداخت نکنید؛ با پشتیبانی تماس بگیرید.','BitPay rejected payment initialization. Do not retry payment; contact support.'],
       database_unconfigured:['سامانه ثبت سفارش موقتاً در دسترس نیست.','Order database is temporarily unavailable.'],
       checkout_disabled:['پرداخت آنلاین در حال حاضر غیرفعال است.','Online payment is currently unavailable.'],
       collectible_sold_or_unavailable:['این مجموعه تک‌نسخه‌ای دیگر برای خرید آزاد نیست؛ اگر پرداخت کرده‌اید با پشتیبانی تماس بگیرید.','The one-of-one set is no longer available to buy; contact support if you already paid.'],
       collectible_requires_paid_checkout:['برای این نسخه کلکسیونی، فقط مسیر پرداخت امن پس از تأیید موجودی فعال است.','This collectible requires verified stock and secure payment.'],
       stock_unavailable:['موجودی این مجموعه قبلاً رزرو یا فروخته شده است.','The set was reserved or sold.'],
       book_shipping_not_configured:['تنظیمات ارسال کتاب هنوز تأیید نشده است.','Book shipping settings are not confirmed.'],
       service_booking_not_configured:['رزرو خدمت هنوز آماده نیست.','Service booking is not ready.'],
       vip_booking_not_configured:['رزرو ویژه هنوز آماده نیست.','VIP booking is not ready.'],
       unsafe_url:['نشانی بازگشت درگاه معتبر نبود؛ انتقال متوقف شد.','Unsafe payment redirect was blocked.'],
       invalid_customer_name:['نام و نام خانوادگی گیرنده را اصلاح کنید.','Please correct the recipient name.'],
       invalid_customer_email:['نشانی ایمیل را اصلاح کنید.','Please correct the email address.'],
       invalid_delivery_address:['نشانی تحویل باید دست‌کم ده نویسه داشته باشد.','Delivery address must be at least ten characters.'],
       invalid_postal_code:['کد پستی را اصلاح کنید.','Please correct the postal code.'],
       invalid_delivery_phone:['شماره تماس اختیاری را اصلاح یا خالی کنید.','Please correct or clear the optional delivery phone.']
      };
      const msg=messages[code];
      feedback.textContent=msg?msg[isFa?0:1]:(isFa?'شروع پرداخت تأیید نشد. برای جلوگیری از سفارش تکراری، پیش از تلاش دوباره وضعیت سفارش را از پشتیبانی پیگیری کنید.':'Payment initiation was not confirmed. Check your order status with support before retrying.');
      // An ambiguous response can arrive after the order was accepted. Never enable a second paid attempt automatically.
      // Only clearly rejected input may be corrected and resubmitted in this page session.
      const correctable=new Set(['invalid_customer_name','invalid_customer_email','invalid_delivery_address','invalid_postal_code','invalid_delivery_phone']);
      btn.disabled=!correctable.has(code);
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
  bookStockPending=capability.stockPending===true;
  // Re-render after a fresh explicit readiness check; controls remain disabled on uncertainty.
  renderCart(data);renderCheckout(data);
 }).catch(()=>{const host=document.querySelector('[data-book-catalog]');if(host){host.replaceChildren(digitalProductCard());}document.querySelectorAll('[data-store-error]').forEach(x=>{
   x.hidden=false;
   x.setAttribute('role','alert');
   x.innerHTML=(isFa?'اطلاعات فروشگاه موقتاً در دسترس نیست. اتصال اینترنت را بررسی کنید و دوباره تلاش کنید.':'Store information is temporarily unavailable. Check your connection and try again.')+' <button type="button" class="button" data-store-retry>'+(isFa?'تلاش دوباره':'Try again')+'</button>';
  });});
 document.addEventListener('click',e=>{const filter=e.target.closest('[data-shop-filter]');if(filter){applyCatalogFilter(filter.dataset.shopFilter);return;}if(e.target.closest('[data-store-retry]'))location.reload()});
 updateCartBadge();
})();
