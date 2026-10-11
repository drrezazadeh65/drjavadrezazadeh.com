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
