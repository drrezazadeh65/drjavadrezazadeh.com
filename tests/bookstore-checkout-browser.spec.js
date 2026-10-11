const {test,expect}=require('@playwright/test');
test.use({serviceWorkers:'block'});
const base='http://127.0.0.1:4173';
for(const [lang,route] of [['fa','/fa/shop/checkout/'],['en','/en/shop/checkout/']]){
 for(const width of [320,390,430,768,1440]){
  test(lang+' bookstore checkout responsive '+width+'px',async({page})=>{
   await page.setViewportSize({width,height:900});
   const errors=[];page.on('pageerror',e=>errors.push(String(e)));
   await page.addInitScript(()=>localStorage.setItem('jr-book-cart-v1',JSON.stringify([{book_id:'roshanaei',quantity:1}])));
   await page.route('**/api/commerce/health',route=>route.fulfill({json:{ok:true,service:'commerce',checkout:true,orderCapture:true,capabilities:{books:true}}}));
   await page.route('**/api/commerce/create',route=>route.abort());
   await page.route('**/api/commerce/prepare',route=>route.abort());
   await page.goto(base+route,{waitUntil:'domcontentloaded'});
   const fieldset=page.locator('#shipping-details fieldset');
   await expect(fieldset).not.toHaveAttribute('disabled','');
   await expect(page.locator('#buyer-name')).toBeVisible();
   await expect(page.locator('#buyer-address')).toBeVisible();
   await expect(page.locator('[data-book-checkout] button.primary')).toBeEnabled();
   for(const selector of ['#buyer-name','#buyer-email','#buyer-address','#buyer-postal','#buyer-phone']){
    const box=await page.locator(selector).boundingBox();
    expect(box,selector+' missing').not.toBeNull();
    expect(box.width,selector+' too narrow').toBeGreaterThan(Math.min(width-48,220));
    expect(box.x,selector+' left overflow').toBeGreaterThanOrEqual(-1);
    expect(box.x+box.width,selector+' right overflow').toBeLessThanOrEqual(width+1);
   }
   const address=await page.locator('#buyer-address').boundingBox();
   expect(address.height).toBeGreaterThanOrEqual(100);
   const overflow=await page.evaluate(()=>Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)-innerWidth);
   expect(overflow).toBeLessThanOrEqual(1);
   expect(errors).toEqual([]);
  });
 }
 test(lang+' checkout fail-closed when commerce is unavailable',async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('jr-book-cart-v1',JSON.stringify([{book_id:'roshanaei',quantity:1}])));
  await page.route('**/api/commerce/health',route=>route.fulfill({status:503,json:{ok:false}}));
  await page.goto(base+route,{waitUntil:'domcontentloaded'});
  await expect(page.locator('#shipping-details fieldset')).toHaveAttribute('disabled','');
  await expect(page.locator('[data-book-checkout] button.primary')).toBeDisabled();
 });
}

test('Persian payment-start automatically continues only to a validated BitPay URL',async({page})=>{
  await page.route('https://bitpay.ir/payment/gateway-123456-get',route=>route.fulfill({status:200,contentType:'text/html',body:'<html><title>Mock BitPay</title><body>Mock payment destination</body></html>'}));
  await page.goto(base+'/fa/shop/payment-start/?gateway='+encodeURIComponent('https://bitpay.ir/payment/gateway-123456-get'),{waitUntil:'domcontentloaded'});
  await expect(page).toHaveURL('https://bitpay.ir/payment/gateway-123456-get');
  await expect(page.getByText('Mock payment destination')).toBeVisible();
});
test('Persian payment-start rejects a non-BitPay redirect',async({page})=>{
  await page.goto(base+'/fa/shop/payment-start/?gateway='+encodeURIComponent('https://bitpay.ir.evil.example/payment/gateway-123456-get'),{waitUntil:'domcontentloaded'});
  await expect(page).toHaveURL(url=>url.pathname==='/fa/shop/payment-start/');
  await expect(page.locator('#pay')).toBeHidden();
  await expect(page.locator('#status')).toContainText('نامعتبر');
});

test('Persian checkout creates a mocked order then navigates to validated BitPay gateway',async({page})=>{
  const gateway='https://bitpay.ir/payment/gateway-123456-get';
  const requests=[];
  await page.addInitScript(()=>localStorage.setItem('jr-book-cart-v1',JSON.stringify([{book_id:'roshanaei',quantity:1}])));
  await page.route('**/api/commerce/health',route=>route.fulfill({json:{ok:true,service:'commerce',checkout:true,orderCapture:true,capabilities:{books:true}}}));
  await page.route('**/api/commerce/create',async route=>{
    requests.push(route.request().postDataJSON());
    await route.fulfill({status:200,json:{ok:true,orderId:'11111111-1111-4111-8111-111111111111',totalToman:2000000,currency:'IRT',paymentUrl:base+'/fa/shop/payment-start/?gateway='+encodeURIComponent(gateway)}});
  });
  await page.route(gateway,route=>route.fulfill({status:200,contentType:'text/html',body:'<html><body><h1>Mock BitPay destination</h1></body></html>'}));
  await page.goto(base+'/fa/shop/checkout/',{waitUntil:'domcontentloaded'});
  await expect(page.locator('[data-book-checkout] button.primary')).toBeEnabled();
  await page.locator('#buyer-name').fill('Test Customer');
  await page.locator('#buyer-email').fill('checkout-example@example.org');
  await page.locator('#buyer-address').fill('123 Test Street, Test City');
  await page.locator('#buyer-postal').fill('1234567890');
  await page.locator('[data-book-checkout] button.primary').click();
  await expect(page).toHaveURL(gateway);
  await expect(page.getByText('Mock BitPay destination')).toBeVisible();
  expect(requests).toHaveLength(1);
  expect(requests[0].items).toEqual([{sku:'book:roshanaei',quantity:1}]);
  expect(requests[0].customer.email).toBe('checkout-example@example.org');
});

test('Persian checkout blocks a forged payment destination in mocked response',async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('jr-book-cart-v1',JSON.stringify([{book_id:'roshanaei',quantity:1}])));
  await page.route('**/api/commerce/health',route=>route.fulfill({json:{ok:true,service:'commerce',checkout:true,orderCapture:true,capabilities:{books:true}}}));
  await page.route('**/api/commerce/create',route=>route.fulfill({status:200,json:{ok:true,paymentUrl:'https://bitpay.ir.evil.example/payment/gateway-123-get'}}));
  await page.goto(base+'/fa/shop/checkout/',{waitUntil:'domcontentloaded'});
  await expect(page.locator('[data-book-checkout] button.primary')).toBeEnabled();
  await page.locator('#buyer-name').fill('Test Customer');
  await page.locator('#buyer-email').fill('checkout-example@example.org');
  await page.locator('#buyer-address').fill('123 Test Street, Test City');
  await page.locator('#buyer-postal').fill('1234567890');
  await page.locator('[data-book-checkout] button.primary').click();
  await expect(page).toHaveURL(base+'/fa/shop/checkout/');
  await expect(page.locator('[data-book-checkout] [role="status"]')).toContainText('نشانی بازگشت درگاه معتبر نبود');
});

test('Cancelled BitPay return displays an unverified server status and never a receipt',async({page})=>{
  const orderId='11111111-1111-4111-8111-111111111111';
  await page.route('**/api/commerce/status?order=*',route=>route.fulfill({status:200,json:{ok:true,state:'pending'}}));
  await page.goto(base+'/fa/shop/payment-result/?from=gateway&order='+orderId,{waitUntil:'domcontentloaded'});
  await expect(page.locator('#title')).toContainText('پرداخت تأیید نشده است');
  await expect(page.locator('#status')).toContainText('هیچ پرداخت موفقی');
  await expect(page.locator('#receipt')).toBeHidden();
  await expect(page.locator('#print')).toBeHidden();
});

test('Bank return allows read-only recheck of the same pending order, with no new payment',async({page})=>{
  const orderId='11111111-1111-4111-8111-111111111111';
  let statusCalls=0;
  let createCalls=0;
  await page.route('**/api/commerce/status?order=*',route=>{
    statusCalls+=1;
    return route.fulfill({status:200,json:{ok:true,state:'pending'}});
  });
  await page.route('**/api/commerce/create',route=>{
    createCalls+=1;
    return route.abort();
  });
  await page.goto(base+'/fa/shop/payment-result/?from=gateway&order='+orderId,{waitUntil:'domcontentloaded'});
  const refresh=page.locator('#recheck-payment-status');
  await expect(refresh).toBeVisible();
  await expect(page.locator('#title')).toContainText('پرداخت تأیید نشده است');
  await expect.poll(()=>statusCalls).toBe(1);
  await refresh.click();
  await expect.poll(()=>statusCalls).toBe(2);
  await expect(page.locator('#receipt')).toBeHidden();
  await expect(page.locator('#print')).toBeHidden();
  expect(createCalls).toBe(0);
});

for(const {label,error,shouldRetry} of [
  {label:'ambiguous network failure',error:null,shouldRetry:false},
  {label:'input-validation rejection',error:'invalid_customer_email',shouldRetry:true},
  {label:'gateway rejection',error:'gateway_rejected',shouldRetry:false}
]){
  test('Paid checkout handles '+label+' without duplicate attempts',async({page})=>{
    let creates=0;
    await page.addInitScript(()=>localStorage.setItem('jr-book-cart-v1',JSON.stringify([{book_id:'roshanaei',quantity:1}])));
    await page.route('**/api/commerce/health',route=>route.fulfill({json:{ok:true,service:'commerce',checkout:true,orderCapture:true,capabilities:{books:true}}}));
    await page.route('**/api/commerce/create',route=>{
      creates+=1;
      return error?route.fulfill({status:error==='gateway_rejected'?502:400,json:{ok:false,error}}):route.abort('failed');
    });
    await page.goto(base+'/fa/shop/checkout/',{waitUntil:'domcontentloaded'});
    const button=page.locator('[data-book-checkout] button.primary');
    await expect(button).toBeEnabled();
    await page.locator('#buyer-name').fill('Test Customer');
    await page.locator('#buyer-email').fill('checkout-example@example.org');
    await page.locator('#buyer-address').fill('123 Test Street, Test City');
    await page.locator('#buyer-postal').fill('1234567890');
    await button.click();
    await expect(page.locator('[data-book-checkout] [role="status"]')).not.toContainText('در حال ایجاد سفارش امن');
    if(shouldRetry)await expect(button).toBeEnabled();
    else await expect(button).toBeDisabled();
    expect(creates).toBe(1);
  });
}

test('Forged paid status with mismatched receipt cannot show a payment receipt',async({page})=>{
  const orderId='11111111-1111-4111-8111-111111111111';
  await page.route('**/api/commerce/status?order=*',route=>route.fulfill({status:200,json:{
    ok:true,state:'paid',receipt:{
      orderId,currency:'IRT',amountToman:2000000,paidAt:'2026-10-11 10:00:00',
      items:[{title:'Test book',quantity:1,unitToman:1000000,subtotalToman:1000000}]
    }
  }}));
  await page.goto(base+'/fa/shop/payment-result/?state=paid&order='+orderId,{waitUntil:'domcontentloaded'});
  await expect(page.locator('#title')).toContainText('بررسی رسید کامل نشد');
  await expect(page.locator('#receipt')).toBeHidden();
  await expect(page.locator('#print')).toBeHidden();
});

test('Server-verified paid order renders exact receipt totals and print action',async({page})=>{
  const orderId='11111111-1111-4111-8111-111111111111';
  const title='Test Book <script>alert(1)</script>';
  let statusCalls=0;
  let paymentCreates=0;
  await page.route('**/api/commerce/create',route=>{
    paymentCreates+=1;
    return route.abort();
  });
  await page.route('**/api/commerce/status?order=*',route=>{
    statusCalls+=1;
    return route.fulfill({status:200,json:{ok:true,state:'paid',receipt:{
      orderId,currency:'IRT',amountToman:2000000,paidAt:'2026-10-11 10:00:00',
      items:[{title,quantity:1,unitToman:2000000,subtotalToman:2000000}]
    }}});
  });
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(base+'/fa/shop/payment-result/?from=gateway&order='+orderId,{waitUntil:'domcontentloaded'});
  await expect(page.locator('#receipt')).toBeVisible();
  await expect(page.locator('#receipt-id')).toHaveText(orderId);
  await expect(page.locator('#receipt-total')).toContainText('۲٬۰۰۰٬۰۰۰');
  await expect(page.locator('#receipt-lines tr')).toHaveCount(1);
  await expect(page.locator('#receipt-lines td').first()).toHaveText(title);
  await expect(page.locator('#receipt-lines script')).toHaveCount(0);
  await expect(page.locator('#print')).toBeVisible();
  await expect(page.locator('#recheck-payment-status')).toBeHidden();
  expect(statusCalls).toBe(1);
  expect(paymentCreates).toBe(0);
  expect(errors).toEqual([]);
});

test('Declined bank result cannot render a paid receipt even when URL claims paid',async({page})=>{
  const orderId='11111111-1111-4111-8111-111111111111';
  await page.route('**/api/commerce/status?order=*',route=>route.fulfill({status:200,json:{ok:true,state:'failed'}}));
  await page.goto(base+'/fa/shop/payment-result/?state=paid&order='+orderId,{waitUntil:'domcontentloaded'});
  await expect(page.locator('#title')).toContainText('پرداخت تأیید نشده است');
  await expect(page.locator('#receipt')).toBeHidden();
  await expect(page.locator('#print')).toBeHidden();
  await expect(page.locator('#recheck-payment-status')).toBeVisible();
});

for(const [lang,route] of [['fa','/fa/shop/'],['en','/en/shop/']]){
  test(lang+' voluntary support shows six configurable payment presets on mobile',async({page})=>{
    await page.setViewportSize({width:390,height:850});
    const errors=[];page.on('pageerror',e=>errors.push(String(e)));
    await page.route('**/api/donations/health',route=>route.fulfill({status:200,json:{
      ok:true,service:'donations',checkout:true,minToman:1000,maxToman:10000000,defaultToman:500000,currency:'IRT'
    }}));
    await page.goto(base+route,{waitUntil:'domcontentloaded'});
    await expect(page.locator('[data-support-form]')).toBeVisible();
    const amount=page.locator('[data-support-form] [name="amountToman"]');
    await expect(amount).toHaveValue('500000');
    await expect(page.locator('[data-support-form] [type="submit"]')).toBeEnabled();
    await expect(page.locator('[data-support-amount]')).toHaveCount(6);
    await page.locator('[data-support-amount="200000"]').click();
    await expect(amount).toHaveValue('200000');
    const form=await page.locator('[data-support-form]').boundingBox();
    expect(form.x).toBeGreaterThanOrEqual(-1);
    expect(form.x+form.width).toBeLessThanOrEqual(391);
    expect(errors).toEqual([]);
  });
}
test('Voluntary support creates mocked low-value payment and reaches BitPay without purchasing a book',async({page})=>{
  const gateway='https://bitpay.ir/payment/gateway-789123-get';
  const requests=[];
  await page.route('**/api/donations/health',route=>route.fulfill({status:200,json:{
    ok:true,service:'donations',checkout:true,minToman:1000,maxToman:10000000,defaultToman:500000,currency:'IRT'
  }}));
  await page.route('**/api/donations/create',route=>{
    requests.push(route.request().postDataJSON());
    return route.fulfill({status:200,json:{ok:true,orderId:'11111111-1111-4111-8111-111111111118',
      amountToman:10000,currency:'IRT',paymentUrl:base+'/fa/shop/payment-start/?gateway='+encodeURIComponent(gateway)}});
  });
  await page.route(gateway,route=>route.fulfill({status:200,contentType:'text/html',body:'<html><body><h1>Mock low-value gateway</h1></body></html>'}));
  await page.goto(base+'/fa/shop/',{waitUntil:'domcontentloaded'});
  await expect(page.locator('[data-support-form] [type="submit"]')).toBeEnabled();
  await page.locator('[data-support-form] [name="amountToman"]').fill('10000');
  await page.locator('[data-support-form] [name="email"]').fill('support@example.test');
  await page.locator('[data-support-form] [type="submit"]').click();
  await expect(page).toHaveURL(gateway);
  await expect(page.getByText('Mock low-value gateway')).toBeVisible();
  expect(requests).toEqual([{amountToman:10000,email:'support@example.test',focus:'general'}]);
});
test('Donation UI refuses charges while the live gateway is disabled',async({page})=>{
  let creates=0;
  await page.route('**/api/donations/health',route=>route.fulfill({status:200,json:{
    ok:true,service:'donations',checkout:false,minToman:1000,maxToman:10000000,defaultToman:500000,currency:'IRT'
  }}));
  await page.route('**/api/donations/create',route=>{creates++;return route.abort()});
  await page.goto(base+'/fa/shop/',{waitUntil:'domcontentloaded'});
  await expect(page.locator('[data-support-form] [type="submit"]')).toBeDisabled();
  await expect(page.locator('[data-support-status]')).toContainText('در دسترس نیست');
  expect(creates).toBe(0);
});
test('Support payment cannot retry after an ambiguous gateway initiation',async({page})=>{
  let creates=0;
  await page.route('**/api/donations/health',route=>route.fulfill({status:200,json:{
    ok:true,service:'donations',checkout:true,minToman:1000,maxToman:10000000,defaultToman:500000,currency:'IRT'
  }}));
  await page.route('**/api/donations/create',route=>{creates++;return route.abort('failed')});
  await page.goto(base+'/fa/shop/',{waitUntil:'domcontentloaded'});
  const submit=page.locator('[data-support-form] [type="submit"]');
  await expect(submit).toBeEnabled();
  await submit.click();
  await expect(page.locator('[data-support-status]')).toContainText('دوباره ثبت نکنید');
  await expect(submit).toBeDisabled();
  expect(creates).toBe(1);
});
test('Support payment refuses forged BitPay URL before redirect',async({page})=>{
  await page.route('**/api/donations/health',route=>route.fulfill({status:200,json:{
    ok:true,service:'donations',checkout:true,minToman:1000,maxToman:10000000,defaultToman:500000,currency:'IRT'
  }}));
  await page.route('**/api/donations/create',route=>route.fulfill({status:200,json:{
    ok:true,orderId:'11111111-1111-4111-8111-111111111118',amountToman:10000,currency:'IRT',
    paymentUrl:base+'/fa/shop/payment-start/?gateway='+encodeURIComponent('https://bitpay.ir.evil.example/payment/gateway-123-get')
  }}));
  await page.goto(base+'/fa/shop/',{waitUntil:'domcontentloaded'});
  await page.locator('[data-support-form] [name="amountToman"]').fill('10000');
  await page.locator('[data-support-form] [type="submit"]').click();
  await expect(page).toHaveURL(base+'/fa/shop/');
  await expect(page.locator('[data-support-form] [type="submit"]')).toBeDisabled();
  await expect(page.locator('[data-support-status]')).toContainText('دوباره ثبت نکنید');
});

test('Verified small voluntary support displays a distinct noncharitable donation receipt',async({page})=>{
  const orderId='11111111-1111-4111-8111-111111111118';
  await page.route('**/api/commerce/status?order=*',route=>route.fulfill({status:200,json:{
    ok:true,state:'paid',receipt:{orderId,currency:'IRT',amountToman:10000,paidAt:'2026-10-11 10:30:00',
      items:[{sku:'support:voluntary',title:'حمایت مالی داوطلبانه از محتوای آموزشی',quantity:1,unitToman:10000,subtotalToman:10000}]}
  }}));
  await page.goto(base+'/fa/shop/payment-result/?from=gateway&order='+orderId,{waitUntil:'domcontentloaded'});
  await expect(page.locator('#receipt')).toBeVisible();
  await expect(page.locator('#title')).toContainText('حمایت مالی داوطلبانه');
  await expect(page.locator('#receipt .receipt-head strong')).toContainText('رسید حمایت مالی');
  await expect(page.locator('#receipt-total')).toContainText('۱۰٬۰۰۰');
  await expect(page.locator('#receipt .note')).toContainText('بدون ثبت تخصیص جدید');
  await expect(page.locator('#print')).toBeVisible();
});

test('Verified new talented-student contribution displays student support receipt without personal data',async({page})=>{
 const orderId='11111111-1111-4111-8111-111111111119';
 await page.route('**/api/commerce/status?order=*',route=>route.fulfill({status:200,json:{
   ok:true,state:'paid',receipt:{orderId,currency:'IRT',amountToman:1000,paidAt:'2026-10-11 11:00:00',
    items:[{sku:'support:students',title:'حمایت از دانش‌آموزان مستعد کم‌بضاعت — کتاب و لوازم آموزشی',quantity:1,unitToman:1000,subtotalToman:1000}]}
 }}));
 await page.goto(base+'/fa/shop/payment-result/?from=gateway&order='+orderId,{waitUntil:'domcontentloaded'});
 await expect(page.locator('#receipt')).toBeVisible();
 await expect(page.locator('#title')).toContainText('دانش‌آموزان');
 await expect(page.locator('#receipt-total')).toContainText('۱٬۰۰۰');
 await expect(page.locator('#receipt .note')).toContainText('مستندسازی هزینه');
 await expect(page.locator('#receipt .note')).toContainText('هیچ هویت دانش‌آموزی افشا نمی‌شود');
});
test('Student fund contributions are guest-accessible and reject invalid beneficiary targeting',async({page})=>{
 let creates=0,received=null;
 await page.route('**/api/donations/health',route=>route.fulfill({status:200,json:{ok:true,service:'donations',
  checkout:true,minToman:1000,maxToman:10000000,defaultToman:500000,currency:'IRT'}}));
 await page.route('**/api/donations/create',route=>{
  creates+=1;received=route.request().postDataJSON();
  return route.fulfill({status:400,json:{ok:false,error:'invalid_support_focus'}});
 });
 await page.goto(base+'/fa/shop/',{waitUntil:'domcontentloaded'});
 await expect(page.locator('[data-support-form] [type="submit"]')).toBeEnabled();
 await page.locator('[data-support-form] [name="amountToman"]').fill('10000');
 await page.locator('[name="focus"]').selectOption('scholarship');
 await page.locator('[data-support-form] [type="submit"]').click();
 await expect.poll(()=>creates).toBe(1);
 expect(received).toEqual({amountToman:10000,email:'',focus:'scholarship'});
 await expect(page.locator('[data-support-status]')).toContainText('اصلاح');
});

for(const [lang,path] of [['fa','/fa/support-talented-students/'],['en','/en/support-talented-students/']]){
  test('Safeguarded public student support landing is bilingual guest-first '+lang,async({page})=>{
    await page.setViewportSize({width:390,height:820});
    await page.route('**/api/donations/health',route=>route.fulfill({status:200,json:{ok:true,service:'donations',
      checkout:true,minToman:1000,maxToman:10000000,defaultToman:500000,currency:'IRT'}}));
    await page.goto(base+path,{waitUntil:'domcontentloaded'});
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('[data-support-form]')).toBeVisible();
    await expect(page.locator('[data-support-form] [type="submit"]')).toBeEnabled();
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href','https://drjavadrezazadeh.com'+path);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content',/noindex/);
    await expect(page.locator('link[rel="alternate"][hreflang="fa"]')).toHaveCount(0);
    await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveCount(0);
    await expect(page.locator('[name="focus"]')).toBeVisible();
    const overflow=await page.evaluate(()=>Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)-innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await expect(page.getByText(/no direct|بدون تماس مستقیم/i).first()).toBeVisible();
  });
}
test('Sponsor workspace declares consent and does not fabricate student profiles without an authenticated backend',async({page})=>{
 await page.route('**/api/student-support/health',route=>route.fulfill({status:200,json:{
  ok:true,service:'student-support',guestGiving:true,caseSchemaReady:false,privatePortal:false,
  studentIdentityPublic:false,directSponsorStudentContact:false}}));
 await page.goto(base+'/fa/customer-dashboard/#student-support',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#student-support')).toBeVisible();
 await expect(page.locator('[data-support-portal-status]')).toContainText('پایگاه دادهٔ حمایت');
 await expect(page.locator('[data-support-cases]')).toBeHidden();
 await expect(page.locator('[data-support-need-form]')).toBeHidden();
});

test('Donor dashboard shows only verified contributions while student case schema remains offline',async({page})=>{
 await page.route('**/api/student-support/health',route=>route.fulfill({status:200,json:{
  ok:true,service:'student-support',guestGiving:true,caseSchemaReady:false,privatePortal:false,
  studentIdentityPublic:false,directSponsorStudentContact:false
 }}));
 await page.route('**/api/student-support/my-contributions',route=>route.fulfill({status:200,json:{
  ok:true,service:'student-support',authenticated:true,noStudentIdentity:true,count:2,
  items:[{orderId:'88888888-8888-4888-8888-888888888880',amountToman:1000,paidAt:'2026-10-11 10:00:00',
   programme:'talented-students-v1',focus:'books',allocationState:'pending_verified_need'},
   {orderId:'88888888-8888-4888-8888-888888888881',amountToman:5000,paidAt:'2026-10-11 09:00:00',
   programme:'legacy-voluntary',focus:null,allocationState:null}]
 }}));
 await page.goto(base+'/fa/customer-dashboard/#student-support',{waitUntil:'domcontentloaded'});
 await expect(page.locator('[data-contributions-list]')).toBeVisible();
 await expect(page.locator('.cd-donor-ledger-item')).toHaveCount(2);
 await expect(page.locator('[data-contributions-status]')).toContainText('۶٬۰۰۰');
 await expect(page.locator('[data-contributions-list]')).toContainText('بدون انتساب خودکار به دانش‌آموز');
 await expect(page.locator('[data-support-cases]')).toBeHidden();
 await expect(page.locator('[data-support-need-form]')).toBeHidden();
});
test('Donor history is not visible to guest without verified login',async({page})=>{
 await page.route('**/api/student-support/health',route=>route.fulfill({status:200,json:{
  ok:true,service:'student-support',guestGiving:true,caseSchemaReady:false,privatePortal:false,
  studentIdentityPublic:false,directSponsorStudentContact:false
 }}));
 await page.route('**/api/student-support/my-contributions',route=>route.fulfill({status:401,json:{ok:false,error:'unauthorized'}}));
 await page.goto(base+'/fa/customer-dashboard/#student-support',{waitUntil:'domcontentloaded'});
 await expect(page.locator('[data-contributions-status]')).toContainText('ایمیل تأییدشده');
 await expect(page.locator('[data-contributions-list]')).toBeHidden();
 await expect(page.locator('[data-support-cases]')).toBeHidden();
});
