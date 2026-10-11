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
  await expect(page).toHaveURL(/\\/fa\\/shop\\/payment-start\\//);
  await expect(page.locator('#pay')).toBeHidden();
  await expect(page.locator('#status')).toContainText('نامعتبر');
});
